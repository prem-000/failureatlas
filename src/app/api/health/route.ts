/**
 * app/api/graph/health/route.ts
 * Graph database health check endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGraphHealth } from '@/lib/graph/operations';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('🏥 Checking graph health...');
    
    const health = await getGraphHealth();

    const statusCode = health.isConnected ? 200 : 503;
    const status = health.isConnected ? 'healthy' : 'unavailable';

    logger.info(`📊 Graph health: ${status}`, {
      nodeCount: health.nodeCount,
      edgeCount: health.edgeCount,
      lastUpdated: health.lastUpdated
    });

    return NextResponse.json(
      {
        status,
        isConnected: health.isConnected,
        stats: {
          nodeCount: health.nodeCount,
          edgeCount: health.edgeCount,
          lastUpdated: health.lastUpdated
        }
      },
      { status: statusCode }
    );
  } catch (error) {
    logger.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        isConnected: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 500 }
    );
  }
}