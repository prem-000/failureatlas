import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { getUserCache, setUserCache, delUserCache } from '@/lib/cache/user';


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

    // Check Redis Cache
    const cached = await getUserCache(userId);
    if (cached) {
      // Query PostgreSQL ONLY for sensitive/credentials fields
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, provider: true },
      });
      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: cached.user.id,
            email: user.email,
            name: cached.user.name,
            image: cached.user.image,
            provider: user.provider,
            createdAt: cached.user.createdAt,
            apiKey: cached.user.apiKey,
          },
          stats: cached.stats,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        apiKey: true,
        provider: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // --- Stats ---

    const totalSubmissions = await prisma.submissionEvent.count({ where: { userId } });

    const acceptedSubmissions = await prisma.submissionEvent.count({
      where: { userId, status: 'Accepted' },
    });

    const acceptanceRate =
      totalSubmissions > 0 ? (acceptedSubmissions / totalSubmissions) * 100 : 0;

    const languageGroups = await prisma.submissionEvent.groupBy({
      by: ['language'],
      where: { userId },
      _count: { language: true },
      orderBy: { _count: { language: 'desc' } },
    });

    const languageDistribution = languageGroups.map((g) => ({
      language: g.language,
      count: g._count.language,
    }));

    const problemsWithDifficulty = await prisma.submissionEvent.findMany({
      where: { userId },
      select: { problem: { select: { difficulty: true } } },
    });

    const difficultyMap: Record<string, number> = {};
    for (const s of problemsWithDifficulty) {
      const d = s.problem?.difficulty ?? 'Unknown';
      difficultyMap[d] = (difficultyMap[d] || 0) + 1;
    }
    const difficultyDistribution = Object.entries(difficultyMap).map(
      ([difficulty, count]) => ({ difficulty, count })
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubmissions = await prisma.submissionEvent.findMany({
      where: { userId, timestamp: { gte: thirtyDaysAgo } },
      select: { timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    const lastSubmission = await prisma.submissionEvent.findFirst({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });
    const lastSubmissionAt = lastSubmission?.timestamp.toISOString() || null;

    const activityMap: Record<string, number> = {};
    for (const sub of recentSubmissions) {
      const dateKey = sub.timestamp.toISOString().split('T')[0];
      activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
    }
    const activityTimeline = Object.entries(activityMap).map(([date, count]) => ({
      date,
      count,
    }));

    const uniqueProblems = await prisma.submissionEvent.groupBy({
      by: ['problemId'],
      where: { userId },
    });

    const topWeaknesses = await prisma.systemicWeakness.findMany({
      where: {
        diagnoses: { some: { userId } },
      },
      orderBy: { pageRankScore: 'desc' },
      take: 5,
      select: {
        name: true,
        severity: true,
        frequency: true,
        pageRankScore: true,
        lastOccurrence: true,
      },
    });

    // Ensure apiKey exists
    let apiKey = user.apiKey;
    if (!apiKey) {
      apiKey = `fa_${user.id.replace(/-/g, '').slice(0, 24)}`;
      await prisma.user.update({ where: { id: userId }, data: { apiKey } });
    }

    const responsePayload = {
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt.toISOString(),
        apiKey,
      },
      stats: {
        lastSubmissionAt,
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate: parseFloat(acceptanceRate.toFixed(1)),
        uniqueProblems: uniqueProblems.length,
        languageDistribution,
        difficultyDistribution,
        activityTimeline,
        topWeaknesses: topWeaknesses.map((w) => ({
          name: w.name,
          severity: w.severity,
          frequency: w.frequency,
          pageRankScore: w.pageRankScore,
          lastOccurrence: w.lastOccurrence.toISOString(),
        })),
      },
    };

    // Save to user cache
    await setUserCache(userId, responsePayload);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          provider: user.provider,
          createdAt: user.createdAt.toISOString(),
          apiKey,
        },
        stats: responsePayload.stats,
      },
    });
  } catch (error) {
    console.error('❌ GET /api/user/profile error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve user profile' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
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
    const body = await request.json();
    const { name } = body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
      },
      select: { id: true, email: true, name: true },
    });

    // Invalidate Cache
    await delUserCache(userId);

    return NextResponse.json({ success: true, data: { user: updated } });
  } catch (error) {
    console.error('❌ PATCH /api/user/profile error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' } },
      { status: 500 }
    );
  }
}