import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { getDashboardCache, setDashboardCache } from '@/lib/cache/dashboard';

// Derive exact Prisma return type for recentSubmissions so map callbacks are fully typed
type RecentSubmission = Prisma.SubmissionEventGetPayload<{
  include: { problem: { select: { title: true; difficulty: true; slug: true } } };
}>;

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

    // Check Redis Cache
    const cached = await getDashboardCache(userId);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached
      });
    }

    // Fetch all counts in parallel; recentSubmissions typed explicitly to preserve inference
    const recentSubmissionQuery = prisma.submissionEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: { problem: { select: { title: true, difficulty: true, slug: true } } },
    });

    // 1. Fetch user's accepted problem IDs
    const acceptedSubmissionsList = await prisma.submissionEvent.findMany({
      where: { userId, status: 'Accepted' },
      select: { problemId: true },
    });
    const acceptedProblemIds = Array.from(new Set(acceptedSubmissionsList.map(s => s.problemId)));

    // 2. Fetch all open failing submissions for problems that have never been accepted
    const openFailures = await prisma.submissionEvent.findMany({
      where: {
        userId,
        status: { not: 'Accepted' },
        problemId: { notIn: acceptedProblemIds },
      },
      select: {
        diagnosis: { select: { primaryWeaknessId: true } },
        failureExplanation: { select: { rootCause: true } },
        evidence: { select: { rootCauseHypotheses: { select: { rootCauseType: true } } } },
      },
    });

    // 3. Count unique weaknesses with currently open failures
    const activeWeaknessIds = new Set<string>();
    for (const sub of openFailures) {
      const rc =
        sub.failureExplanation?.rootCause ||
        sub.evidence?.flatMap((e) => e.rootCauseHypotheses)[0]?.rootCauseType ||
        sub.diagnosis?.primaryWeaknessId;
      if (rc) {
        const norm = rc.toLowerCase();
        if (norm.includes('boundary') || norm.includes('edge') || norm.includes('lookahead')) {
          activeWeaknessIds.add('edge-case-reasoning');
        } else if (norm.includes('pattern') || norm.includes('algorithm')) {
          activeWeaknessIds.add('algorithmic-pattern-recognition');
        } else if (norm.includes('complexity') || norm.includes('time') || norm.includes('space') || norm.includes('tle')) {
          activeWeaknessIds.add('performance-analysis');
        } else {
          activeWeaknessIds.add('implementation-precision');
        }
      }
    }

    const [totalSubmissions, acceptedSubmissions, recentSubmissions] = await Promise.all([
      prisma.submissionEvent.count({ where: { userId } }),
      prisma.submissionEvent.count({ where: { userId, status: 'Accepted' } }),
      recentSubmissionQuery,
    ] as const);

    const weaknesses = activeWeaknessIds.size;
    const acceptanceRate =
      totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    const responsePayload = {
      stats: {
        totalSubmissions,
        acceptedSubmissions,
        weaknesses,
        acceptanceRate,
      },
      recentSubmissions: recentSubmissions.map((s: RecentSubmission) => ({
        id: s.id,
        problemTitle: s.problem?.title ?? 'Unknown Problem',
        problemSlug: s.problem?.slug ?? '',
        difficulty: s.problem?.difficulty ?? 'Unknown',
        status: s.status,
        language: s.language,
        timestamp: s.timestamp.toISOString(),
        attemptNumber: s.attemptNumber,
      })),
    };

    // Save to Cache
    await setDashboardCache(userId, responsePayload);

    return NextResponse.json({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' } },
      { status: 500 }
    );
  }
}
