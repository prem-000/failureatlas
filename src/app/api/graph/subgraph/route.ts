/**
 * GET /api/graph/subgraph?limit=300
 *
 * Returns the user's full failure subgraph (6-layer structured graph):
 *   Problem → FailureEvent → Evidence → RootCause → Weakness → LearningStrategy
 *
 * Response: { success, data: { nodes, edges, stats } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserFailureSubgraph, getGraphHealth } from '@/lib/graph/operations';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '300', 10), 1000);

    logger.info('📊 Fetching graph subgraph', { userId: session.id, limit });

    // Health check
    const health = await getGraphHealth();
    if (!health.isConnected) {
      logger.warn('⚠️ Database not connected — returning empty graph');
      return NextResponse.json({
        nodes: [],
        edges: [],
        stats: { problems: 0, failures: 0, weaknesses: 0, strategies: 0 },
      });
    }

    // Fetch subgraph
    const graphData = await getUserFailureSubgraph(session.id, limit);

    logger.info('✅ Graph subgraph fetched', {
      nodeCount: graphData.stats.nodeCount,
      edgeCount: graphData.stats.edgeCount,
    });

    return NextResponse.json({
      nodes: graphData.nodes,
      edges: graphData.edges,
      stats: {
        problems: graphData.stats.problems,
        failures: graphData.stats.failures,
        weaknesses: graphData.stats.weaknesses,
        strategies: graphData.stats.strategies,
      },
    });
  } catch (error) {
    logger.error('❌ Error fetching graph subgraph:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch graph subgraph',
      },
      { status: 500 }
    );
  }
}