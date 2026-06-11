import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';

const WEAKNESS_TO_ROOT_CAUSES: Record<string, string[]> = {
  'edge-case-reasoning': ['boundary-condition-error', 'input-output-handling-error'],
  'algorithmic-pattern-recognition': ['pattern-recognition-gap', 'algorithm-selection-mistake'],
  'performance-analysis': ['time-complexity-oversight', 'space-complexity-oversight', 'data-structure-mismatch'],
  'implementation-precision': ['implementation-detail-error']
};

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || undefined);
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Missing Authorization token' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHORIZATION_FAILED', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }
    const userId = payload.userId;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // 2. Fetch weaknesses from PostgreSQL (Prisma)
    const weaknesses = await prisma.systemicWeakness.findMany({
      take: limit,
      orderBy: {
        pageRankScore: 'desc'
      },
      include: {
        strategies: true
      }
    });

    // 3. Map weaknesses
    const mappedWeaknesses = [];
    let totalScore = 0;

    for (const w of weaknesses) {
      totalScore += w.pageRankScore;
      const relatedRcs = WEAKNESS_TO_ROOT_CAUSES[w.name] || [];

      mappedWeaknesses.push({
        weaknessId: w.name,
        name: w.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        description: `Systemic challenge with ${w.name.replace(/-/g, ' ')}.`,
        pageRankScore: w.pageRankScore,
        frequency: w.frequency,
        lastOccurrence: w.lastOccurrence.toISOString(),
        relatedRootCauses: relatedRcs,
        suggestedStrategies: w.strategies.map(s => s.id)
      });
    }

    return NextResponse.json({
      success: true,
      weaknesses: mappedWeaknesses,
      totalScore
    });

  } catch (error) {
    console.error('❌ GET weaknesses error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve weaknesses' } },
      { status: 500 }
    );
  }
}
