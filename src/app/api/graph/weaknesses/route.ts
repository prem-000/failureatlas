/**
 * GET /api/graph/weaknesses?limit=10
 *
 * Returns top systemic weaknesses ranked by PageRank score.
 *
 * Response: { success, data: [{ id, name, pageRankScore, frequency, description }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    logger.info('🎯 Fetching top weaknesses', { userId: session.id, limit });

    // Query SystemicWeakness, ordered by pageRankScore DESC
    const weaknesses = await prisma.systemicWeakness.findMany({
      take: limit,
      orderBy: { pageRankScore: 'desc' },
    });

    const data = weaknesses.map((w) => ({
      id: w.id,
      name: w.name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      pageRankScore: w.pageRankScore,
      frequency: w.frequency,
      description: `Systemic weakness in ${w.name.replace(/-/g, ' ')} — severity: ${w.severity}, confidence: ${Math.round(w.confidence * 100)}%.`,
    }));

    logger.info('✅ Weaknesses fetched', { count: data.length });

    return NextResponse.json(data);
  } catch (error) {
    logger.error('❌ Error fetching weaknesses:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve weaknesses',
      },
      { status: 500 }
    );
  }
}
