import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('Authorization') || undefined);
    if (!token) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 });
    }

    const userId = payload.userId;

    // Fetch all counts in parallel
    const [totalSubmissions, acceptedSubmissions, weaknesses, recentSubmissions] = await Promise.all([
      prisma.submissionEvent.count({ where: { userId } }),
      prisma.submissionEvent.count({ where: { userId, status: 'Accepted' } }),
      prisma.systemicWeakness.count({ where: { severity: { in: ['high', 'critical'] } } }),
      prisma.submissionEvent.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: { problem: { select: { title: true, difficulty: true, slug: true } } },
      }),
    ]);

    const acceptanceRate =
      totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalSubmissions,
          acceptedSubmissions,
          weaknesses,
          acceptanceRate,
        },
        recentSubmissions: recentSubmissions.map((s) => ({
          id: s.id,
          problemTitle: s.problem?.title ?? 'Unknown Problem',
          problemSlug: s.problem?.slug ?? '',
          difficulty: s.problem?.difficulty ?? 'Unknown',
          status: s.status,
          language: s.language,
          timestamp: s.timestamp,
          attemptNumber: s.attemptNumber,
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' } },
      { status: 500 }
    );
  }
}
