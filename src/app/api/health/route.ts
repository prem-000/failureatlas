import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';


export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    logger.info('🏥 Checking production health...');
    
    // Check PostgreSQL connection
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (dbErr) {
      logger.error('Database health check failed:', dbErr);
    }

    // Check Redis config status (redis is optional)
    const redisStatus = process.env.REDIS_URL ? 'connected' : 'not_configured';

    const isHealthy = dbStatus === 'connected';
    const statusCode = isHealthy ? 200 : 503;

    return NextResponse.json(
      {
        status: isHealthy ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          redis: redisStatus
        }
      },
      { status: statusCode }
    );
  } catch (error) {
    logger.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
          redis: 'disconnected'
        },
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 500 }
    );
  }
}