/**
 * src/app/api/knowledge/discover/route.ts
 *
 * Periodic and on-demand discovery endpoint for public DSA and company question repositories.
 */

import { NextRequest, NextResponse } from 'next/server';
import { defaultGitHubDiscovery } from '@/lib/knowledge/github-discovery';
import { defaultKnowledgeIngestion } from '@/lib/knowledge/ingestion-service';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || 'leetcode company csv dsa questions';
    const autoIngest = searchParams.get('ingest') === 'true';

    // 1. Discover Candidate Repositories
    const discovered = await defaultGitHubDiscovery.discoverRepositories(query, {
      maxRepos: 8,
      minStars: 20,
    });

    const registeredIds: string[] = [];

    // 2. Register into KnowledgeSource
    for (const repo of discovered) {
      const sourceId = await defaultKnowledgeIngestion.registerKnowledgeSource(repo);
      registeredIds.push(sourceId);

      if (autoIngest) {
        // Enqueue background scan non-blocking
        defaultKnowledgeIngestion.ingestRepository(sourceId).catch((err) => {
          console.warn(`[AutoIngest] Background ingestion failed for ${repo.owner}/${repo.repo}:`, err);
        });
      }
    }

    const totalSources = await prisma.knowledgeSource.count();
    const totalDocs = await prisma.externalDocument.count();

    return NextResponse.json({
      success: true,
      query,
      discoveredCount: discovered.length,
      repositories: discovered,
      registeredSourceIds: registeredIds,
      systemTotals: {
        sourcesTracked: totalSources,
        documentsIndexed: totalDocs,
      },
    });
  } catch (err: any) {
    console.error('❌ Knowledge discovery error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Discovery failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
