/**
 * src/lib/rag/external-retrieval.ts
 *
 * Hybrid External Knowledge Retrieval using pgvector cosine distance (<=>),
 * metadata filters (company, topic, difficulty), keyword matching, and reranking.
 */

import { prisma } from '@/lib/db/prisma';
import { generateEmbedding } from '@/lib/embeddings/pipeline';

export interface ExternalEvidenceItem {
  id: string;
  documentId: string;
  problemTitle: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Unknown';
  topics: string[];
  companies: string[];
  isCompanyVerified: boolean;
  contentSnippet: string;
  fullContent: string;
  sourceUrl: string;
  repository: string;
  filePath: string;
  similarityScore: number; // 0.0 - 1.0
  relevanceScore: number;  // 0 - 100
  retrievalPath: 'pgvector_semantic' | 'exact_metadata' | 'hybrid';
  provenance: {
    sourceType: 'github' | 'csv';
    repository: string;
    filePath: string;
    sourceUrl: string;
    isCommunityReported: boolean;
  };
}

export interface ExternalRetrievalFilters {
  topics?: string[];
  difficulty?: string;
  company?: string;
  limit?: number;
  minSimilarity?: number;
}

export class ExternalKnowledgeRetriever {
  /**
   * Hybrid retrieval combining pgvector semantic search and PostgreSQL metadata/keyword filters
   */
  async retrieve(
    query: string,
    filters: ExternalRetrievalFilters = {}
  ): Promise<ExternalEvidenceItem[]> {
    const limit = filters.limit ?? 5;
    const minSim = filters.minSimilarity ?? 0.35;

    // 1. Generate query embedding vector
    const queryVector = await generateEmbedding(query);
    const vectorStr = queryVector ? `[${queryVector.join(',')}]` : null;

    let vectorCandidates: any[] = [];

    // 2. Perform native pgvector similarity query if vector is available
    if (vectorStr) {
      try {
        vectorCandidates = await prisma.$queryRawUnsafe(
          `
          SELECT 
            c.id as chunk_id,
            c."chunkText",
            c."chunkIndex",
            c.metadata,
            d.id as doc_id,
            d."problemTitle",
            d.slug,
            d.difficulty,
            d.topics,
            d."companyTags",
            d."isCompanyVerified",
            d."sourceUrl",
            d.repository,
            d."filePath",
            d."normalizedContent",
            d."sourceType",
            1 - (c.vector_embedding <=> $1::vector) as similarity
          FROM external_chunks c
          JOIN external_documents d ON c."documentId" = d.id
          WHERE c.vector_embedding IS NOT NULL
          ORDER BY c.vector_embedding <=> $1::vector ASC
          LIMIT 15;
          `,
          vectorStr
        );
      } catch (sqlErr) {
        console.warn('[ExternalRetrieval] pgvector query fallback to relational search:', (sqlErr as any).message);
      }
    }

    // 3. Relational & Metadata Search (Keyword + Topics + Company Filter)
    const queryTokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const relationalDocs = await prisma.externalDocument.findMany({
      where: {
        OR: [
          ...(filters.company
            ? [{ companyTags: { has: filters.company } }]
            : []),
          ...(filters.topics && filters.topics.length > 0
            ? [{ topics: { hasSome: filters.topics } }]
            : []),
          ...queryTokens.map((token) => ({
            problemTitle: { contains: token, mode: 'insensitive' as const },
          })),
          ...queryTokens.map((token) => ({
            normalizedContent: { contains: token, mode: 'insensitive' as const },
          })),
        ],
      },
      include: {
        chunks: { take: 1 },
      },
      take: 15,
    });

    // 4. Merge and Score candidates
    const scoreMap = new Map<string, ExternalEvidenceItem>();

    // Process pgvector candidates
    for (const row of vectorCandidates) {
      const similarity = typeof row.similarity === 'number' ? row.similarity : 0.5;
      const companies = Array.isArray(row.companyTags) ? row.companyTags : [];
      const topics = Array.isArray(row.topics) ? row.topics : [];

      scoreMap.set(row.doc_id, {
        id: `ext_${row.doc_id}`,
        documentId: row.doc_id,
        problemTitle: row.problemTitle,
        slug: row.slug || '',
        difficulty: row.difficulty || 'Medium',
        topics,
        companies,
        isCompanyVerified: Boolean(row.isCompanyVerified),
        contentSnippet: row.chunkText ? row.chunkText.slice(0, 300) : row.normalizedContent.slice(0, 300),
        fullContent: row.normalizedContent,
        sourceUrl: row.sourceUrl,
        repository: row.repository,
        filePath: row.filePath,
        similarityScore: similarity,
        relevanceScore: Math.round(similarity * 100),
        retrievalPath: 'pgvector_semantic',
        provenance: {
          sourceType: row.sourceType === 'csv' ? 'csv' : 'github',
          repository: row.repository,
          filePath: row.filePath,
          sourceUrl: row.sourceUrl,
          isCommunityReported: !row.isCompanyVerified,
        },
      });
    }

    // Process relational / metadata candidates
    for (const doc of relationalDocs) {
      const existing = scoreMap.get(doc.id);
      let keywordBoost = 0;
      const docText = `${doc.problemTitle} ${doc.topics.join(' ')} ${doc.companyTags.join(' ')}`.toLowerCase();

      for (const token of queryTokens) {
        if (docText.includes(token)) keywordBoost += 0.15;
      }

      if (filters.company && doc.companyTags.some((c) => c.toLowerCase() === filters.company?.toLowerCase())) {
        keywordBoost += 0.3;
      }
      if (filters.topics && filters.topics.some((t) => doc.topics.map((x) => x.toLowerCase()).includes(t.toLowerCase()))) {
        keywordBoost += 0.2;
      }

      if (existing) {
        existing.similarityScore = Math.min(1.0, existing.similarityScore + keywordBoost);
        existing.relevanceScore = Math.round(existing.similarityScore * 100);
        existing.retrievalPath = 'hybrid';
      } else {
        const sim = Math.min(0.95, 0.45 + keywordBoost);
        const chunk = doc.chunks[0];
        scoreMap.set(doc.id, {
          id: `ext_${doc.id}`,
          documentId: doc.id,
          problemTitle: doc.problemTitle,
          slug: doc.slug || '',
          difficulty: doc.difficulty as any,
          topics: doc.topics,
          companies: doc.companyTags,
          isCompanyVerified: doc.isCompanyVerified,
          contentSnippet: chunk ? chunk.chunkText.slice(0, 300) : doc.normalizedContent.slice(0, 300),
          fullContent: doc.normalizedContent,
          sourceUrl: doc.sourceUrl,
          repository: doc.repository,
          filePath: doc.filePath,
          similarityScore: sim,
          relevanceScore: Math.round(sim * 100),
          retrievalPath: 'exact_metadata',
          provenance: {
            sourceType: doc.sourceType === 'csv' ? 'csv' : 'github',
            repository: doc.repository,
            filePath: doc.filePath,
            sourceUrl: doc.sourceUrl,
            isCommunityReported: !doc.isCompanyVerified,
          },
        });
      }
    }

    // 5. Filter and Rerank
    const results = Array.from(scoreMap.values())
      .filter((item) => item.similarityScore >= minSim)
      .sort((a, b) => b.similarityScore - a.similarityScore);

    return results.slice(0, limit);
  }
}

export const defaultExternalRetriever = new ExternalKnowledgeRetriever();
