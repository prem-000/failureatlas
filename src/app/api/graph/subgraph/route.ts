/**
 * app/api/graph/subgraph/route.ts
 * API endpoint for getting user's failure graph subgraph
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserFailureSubgraph, getGraphHealth } from '@/lib/graph/operations';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '300');

    logger.info('📊 Fetching graph subgraph for user', {
      userId: session.id,
      limit
    });

    // Get graph health first
    const health = await getGraphHealth();
    
    if (!health.isConnected) {
      logger.warn('⚠️ Database not connected. Returning empty graph.');
      return NextResponse.json({
        success: true,
        data: {
          nodes: [],
          edges: [],
          stats: {
            nodeCount: 0,
            edgeCount: 0,
            isConnected: false
          }
        },
        health
      });
    }

    // Fetch user's failure subgraph
    const graphData = await getUserFailureSubgraph(session.id, limit);

    logger.info('✅ Graph subgraph fetched successfully', {
      nodeCount: graphData.stats.nodeCount,
      edgeCount: graphData.stats.edgeCount
    });

    return NextResponse.json({
      success: true,
      data: graphData,
      health
    });
  } catch (error) {
    logger.error('❌ Error fetching graph subgraph:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch graph'
      },
      { status: 500 }
    );
  }
}