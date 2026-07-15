import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { updateSM2 } from '@/lib/practice-queue/sm2';
import { runPracticeQueueMigration } from '@/lib/practice-queue/scheduler';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// GET — Retrieve practice queue states, transparent migration, and stats
export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Run transparent one-time migration if applicable
    await runPracticeQueueMigration(session.id);

    const now = new Date();

    // 2. Fetch all review states for the user, with their history
    const states = await prisma.practiceReviewState.findMany({
      where: {
        userId: session.id,
      },
      include: {
        history: {
          orderBy: { reviewedAt: 'desc' },
        },
      },
    });

    // 3. Separate states into queue (due/overdue) and upcoming (future)
    const queueStates = states.filter(s => s.nextReview <= now);
    const upcomingStates = states.filter(s => s.nextReview > now);

    // 4. Sort queue (due/overdue) using existing prioritization rules
    queueStates.sort((a, b) => {
      // 1. Overdue reviews (Next Review date is further in the past)
      const nextA = a.nextReview.getTime();
      const nextB = b.nextReview.getTime();
      if (nextA !== nextB) {
        return nextA - nextB;
      }

      // 2. Lower Ease Factor
      if (a.easeFactor !== b.easeFactor) {
        return a.easeFactor - b.easeFactor;
      }

      // 3. Higher Difficulty (Hard > Medium > Easy)
      const diffWeight = (d: string) => {
        if (d === 'Hard') return 3;
        if (d === 'Medium') return 2;
        return 1;
      };
      const diffA = diffWeight(a.difficulty);
      const diffB = diffWeight(b.difficulty);
      if (diffA !== diffB) {
        return diffB - diffA;
      }

      // 4. Older Last Review
      const lastA = a.lastReview ? a.lastReview.getTime() : 0;
      const lastB = b.lastReview ? b.lastReview.getTime() : 0;
      if (lastA !== lastB) {
        return lastA - lastB;
      }

      // 5. Failed Previous Review (most recent history entry has quality < 3)
      const failedA = a.history?.[0]?.quality < 3 ? 1 : 0;
      const failedB = b.history?.[0]?.quality < 3 ? 1 : 0;
      if (failedA !== failedB) {
        return failedB - failedA;
      }

      return 0;
    });

    // 5. Sort upcoming states by nextReview ascending
    upcomingStates.sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime());

    // 6. Compute statistics and reviewedToday in memory
    const allHistory = states.flatMap(s => s.history);
    const reviewsCompleted = allHistory.length;

    let averageRecall = 0;
    let retentionRate = 0;
    let currentStreak = 0;

    if (reviewsCompleted > 0) {
      const sumRecall = allHistory.reduce((sum, h) => sum + h.quality, 0);
      averageRecall = parseFloat((sumRecall / reviewsCompleted).toFixed(1));

      const successfulReviews = allHistory.filter(h => h.quality >= 3).length;
      retentionRate = parseFloat(((successfulReviews / reviewsCompleted) * 100).toFixed(1));

      // Calculate streak
      currentStreak = calculateStreak(allHistory.map(h => h.reviewedAt));
    }

    // Compute reviewedToday (completed since midnight today local time)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const reviewedToday = allHistory.filter(h => h.reviewedAt >= startOfToday).length;

    const totalCount = states.length;

    return NextResponse.json({
      success: true,
      data: {
        queue: queueStates,
        upcoming: upcomingStates,
        statistics: {
          reviewsCompleted,
          currentStreak,
          averageRecall,
          retentionRate,
        },
        reviewedToday,
        totalCount,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching practice queue:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — Deprecated manual import endpoint, return 400
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Manual imports are no longer supported. Accepted submissions are automatically scheduled.',
    },
    { status: 400 }
  );
}

// PUT — Submit a review result
export async function PUT(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, quality } = body;

    if (!id || quality === undefined) {
      return NextResponse.json({ success: false, error: 'Id and quality score are required' }, { status: 400 });
    }

    const reviewState = await prisma.practiceReviewState.findUnique({
      where: { id },
    });

    if (!reviewState) {
      return NextResponse.json({ success: false, error: 'Practice review state not found' }, { status: 404 });
    }

    if (reviewState.userId !== session.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Call SM-2 calculation engine
    const nextSM2 = updateSM2(
      {
        repetitions: reviewState.repetitions,
        easeFactor: reviewState.easeFactor,
        interval: reviewState.interval,
      },
      quality
    );

    const updatedState = await prisma.$transaction(async (tx) => {
      // 1. Create history log entry
      await tx.practiceReviewHistory.create({
        data: {
          reviewStateId: reviewState.id,
          quality,
          easeFactorBefore: reviewState.easeFactor,
          easeFactorAfter: nextSM2.easeFactor,
          intervalBefore: reviewState.interval,
          intervalAfter: nextSM2.interval,
          repetitions: reviewState.repetitions,
        },
      });

      // 2. Update current state
      return await tx.practiceReviewState.update({
        where: { id: reviewState.id },
        data: {
          lastReview: new Date(),
          nextReview: nextSM2.nextReview,
          repetitions: nextSM2.repetitions,
          easeFactor: nextSM2.easeFactor,
          interval: nextSM2.interval,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: updatedState,
    });
  } catch (error: any) {
    logger.error('Error submitting practice review:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper: Calculate streak from review dates
function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  // Convert dates to YYYY-MM-DD local strings to make calculations timezone-safe
  const dateStrings = dates.map(d => {
    const localDate = new Date(d);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Get unique sorted date strings descending
  const uniqueDates = Array.from(new Set(dateStrings)).sort((a, b) => b.localeCompare(a));
  if (uniqueDates.length === 0) return 0;

  const todayStr = getLocalDateString(new Date());
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));

  // If the most recent review wasn't today or yesterday, streak is 0
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  let current = new Date(uniqueDates[0]);

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i]);
    const diffTime = current.getTime() - prev.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
      current = prev;
    } else if (diffDays > 1) {
      break; // Gap detected, streak ends
    }
  }

  return streak;
}

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
