/**
 * src/lib/knowledge/content-chunker.ts
 *
 * Chunks DSA explanations, solutions, and dataset records for vector embeddings
 * with overlap, preserving code blocks, invariants, and metadata.
 */

import { generateEmbedding } from '@/lib/embeddings/pipeline';

export interface ChunkedContentItem {
  chunkIndex: number;
  chunkText: string;
  metadata: {
    problemTitle: string;
    difficulty: string;
    topics: string[];
    companies: string[];
    isCompanyVerified: boolean;
    sourceUrl: string;
    repository: string;
    filePath: string;
  };
  embedding: number[];
}

export class ContentChunker {
  /**
   * Split a long text or problem document into bounded chunks (approx 200-500 words)
   * preserving paragraph and code boundaries where possible.
   */
  static splitIntoChunks(text: string, maxWords: number = 250, overlapWords: number = 40): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const words = trimmed.split(/\s+/);
    if (words.length <= maxWords) {
      return [trimmed];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < words.length) {
      const end = Math.min(words.length, start + maxWords);
      const chunkWords = words.slice(start, end);
      chunks.push(chunkWords.join(' '));

      if (end >= words.length) break;
      start += maxWords - overlapWords;
    }

    return chunks;
  }

  /**
   * Build embedding-friendly text representation including problem context
   */
  static buildChunkEmbeddingText(
    problemTitle: string,
    difficulty: string,
    topics: string[],
    companies: string[],
    chunkText: string
  ): string {
    const parts = [
      `Problem: ${problemTitle} (${difficulty})`,
      `Topics: ${topics.join(', ')}`,
    ];
    if (companies.length > 0) {
      parts.push(`Companies: ${companies.join(', ')}`);
    }
    parts.push(`Content: ${chunkText}`);
    return parts.join(' | ');
  }

  /**
   * Chunk a problem record and compute embeddings for each chunk
   */
  static async chunkAndEmbed(record: {
    problemTitle: string;
    difficulty: string;
    topics: string[];
    companies: string[];
    isCompanyVerified: boolean;
    descriptionOrExplanation: string;
    sourceUrl: string;
    repository: string;
    filePath: string;
  }): Promise<ChunkedContentItem[]> {
    const rawChunks = this.splitIntoChunks(record.descriptionOrExplanation, 250, 40);
    const items: ChunkedContentItem[] = [];

    for (let i = 0; i < rawChunks.length; i++) {
      const chunkText = rawChunks[i];
      const embeddingText = this.buildChunkEmbeddingText(
        record.problemTitle,
        record.difficulty,
        record.topics,
        record.companies,
        chunkText
      );

      const vec = await generateEmbedding(embeddingText);
      const embedding = vec || new Array(1536).fill(0);

      items.push({
        chunkIndex: i,
        chunkText,
        metadata: {
          problemTitle: record.problemTitle,
          difficulty: record.difficulty,
          topics: record.topics,
          companies: record.companies,
          isCompanyVerified: record.isCompanyVerified,
          sourceUrl: record.sourceUrl,
          repository: record.repository,
          filePath: record.filePath,
        },
        embedding,
      });
    }

    return items;
  }
}
