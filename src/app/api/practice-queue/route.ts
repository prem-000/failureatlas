import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { updateSM2 } from '@/lib/practice-queue/sm2';
import { runPracticeQueueMigration } from '@/lib/practice-queue/scheduler';
import { calculatePriorityScore } from '@/lib/practice-queue/priority';

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

// GET — Retrieve practice queue states, transparent migration, active sessions, and stats
export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Run transparent one-time migration if applicable
    await runPracticeQueueMigration(session.id);

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const strategyParam = searchParams.get('strategy'); // PRIORITY | WEAKEST_TOPIC | MIXED
    const topicParam = searchParams.get('topic'); // DP, Arrays, etc.

    // 2. Check for an active session to support Resume Session
    let activeSession = await prisma.practiceSession.findFirst({
      where: {
        userId: session.id,
        completedAt: null,
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            review: true,
          },
        },
      },
    });

    if (activeSession) {
      const slugs = activeSession.items.map((it) => it.review.problemId);
      const activeProblems = await prisma.problem.findMany({
        where: { slug: { in: slugs } },
        select: { slug: true, topics: true },
      });
      activeSession = {
        ...activeSession,
        items: activeSession.items.map((it) => {
          const prob = activeProblems.find((p) => p.slug === it.review.problemId);
          return {
            ...it,
            review: {
              ...it.review,
              topics: prob?.topics || [],
            } as any,
          };
        }),
      };
    }

    // 3. If limit and strategy are provided, generate a new practice session
    if (limitParam) {
      const limit = parseInt(limitParam, 10) || 5;

      // Load all review states
      const states = await prisma.practiceReviewState.findMany({
        where: { userId: session.id },
      });

      if (states.length === 0) {
        return NextResponse.json({
          success: true,
          data: { session: null, message: 'Queue is empty' },
        });
      }

      // Load all user submissions for these problems to calculate priority score metadata
      const submissions = await prisma.submissionEvent.findMany({
        where: { userId: session.id },
        include: {
          problem: true,
        },
      });

      // Load problems to get tags/topics
      const problems = await prisma.problem.findMany({
        where: {
          slug: { in: states.map((s) => s.problemId) },
        },
      });

      // Calculate priority scores and pair them
      const scoredStates = states.map((state) => {
        const problem = problems.find((p) => p.slug === state.problemId);
        const problemSubmissions = submissions.filter(
          (s) => s.problemId === problem?.id
        );

        const score = calculatePriorityScore(
          state,
          problem || { difficulty: 'Medium' },
          problemSubmissions
        );

        return { state, score, topics: problem?.topics || [] };
      });

      // Apply strategy filtering
      let filtered = scoredStates;
      const strategy = strategyParam || 'PRIORITY';

      if (strategy === 'WEAKEST_TOPIC' && topicParam) {
        filtered = scoredStates.filter((item) =>
          item.topics.some((t) => t.toLowerCase() === topicParam.toLowerCase())
        );
      }

      // Sort by Priority Score descending
      filtered.sort((a, b) => b.score - a.score);

      // Take top N
      const selectedItems = filtered.slice(0, limit).map((item) => item.state);

      if (selectedItems.length === 0) {
        return NextResponse.json({
          success: true,
          data: { session: null, message: 'No matching review problems found' },
        });
      }

      // Create new practice session in database
      const mappedStrategy =
        strategy === 'WEAKEST_TOPIC'
          ? 'WEAKEST_TOPIC'
          : strategy === 'MIXED'
          ? 'MIXED'
          : 'PRIORITY';

      let dbSession = await prisma.$transaction(async (tx) => {
        // If there was an active session, mark it as abandoned/completed so we don't leak it
        if (activeSession) {
          await tx.practiceSession.update({
            where: { id: activeSession.id },
            data: { completedAt: new Date() },
          });
        }

        const sess = await tx.practiceSession.create({
          data: {
            userId: session.id,
            strategy: mappedStrategy,
            filterTopic: topicParam || null,
          },
        });

        // Insert items
        const itemsData = selectedItems.map((state, idx) => ({
          sessionId: sess.id,
          practiceReviewStateId: state.id,
          order: idx,
          completed: false,
        }));

        await tx.practiceSessionItem.createMany({
          data: itemsData,
        });

        return tx.practiceSession.findUnique({
          where: { id: sess.id },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: {
                review: true,
              },
            },
          },
        });
      });

      if (dbSession) {
        const slugs = dbSession.items.map((it) => it.review.problemId);
        const activeProblems = await prisma.problem.findMany({
          where: { slug: { in: slugs } },
          select: { slug: true, topics: true },
        });
        dbSession = {
          ...dbSession,
          items: dbSession.items.map((it) => {
            const prob = activeProblems.find((p) => p.slug === it.review.problemId);
            return {
              ...it,
              review: {
                ...it.review,
                topics: prob?.topics || [],
              } as any,
            };
          }),
        };
      }

      return NextResponse.json({
        success: true,
        data: { session: dbSession },
      });
    }

    // 4. Return general dashboard data
    const states = await prisma.practiceReviewState.findMany({
      where: { userId: session.id },
    });

    const allHistory = await prisma.practiceReviewHistory.findMany({
      where: {
        reviewState: { userId: session.id },
      },
      orderBy: { reviewedAt: 'desc' },
    });

    const completedSessions = await prisma.practiceSession.findMany({
      where: {
        userId: session.id,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    const reviewsCompleted = allHistory.length;
    let averageRecall = 0;
    let retentionRate = 0;
    let currentStreak = 0;

    if (reviewsCompleted > 0) {
      const sumRecall = allHistory.reduce((sum, h) => sum + h.quality, 0);
      averageRecall = parseFloat((sumRecall / reviewsCompleted).toFixed(1));

      const successfulReviews = allHistory.filter((h) => h.quality >= 3).length;
      retentionRate = parseFloat(((successfulReviews / reviewsCompleted) * 100).toFixed(1));

      currentStreak = calculateStreak(allHistory.map((h) => h.reviewedAt));
    }

    // Get unique list of topics across user's solved problems
    const problems = await prisma.problem.findMany({
      where: {
        slug: { in: states.map((s) => s.problemId) },
      },
      select: { topics: true },
    });
    const uniqueTopics = Array.from(new Set(problems.flatMap((p) => p.topics)));

    // Unique count of problems reviewed
    const reviewedProblemIds = Array.from(new Set(allHistory.map((h) => h.reviewStateId)));
    const totalProblemsReviewed = reviewedProblemIds.length;

    return NextResponse.json({
      success: true,
      data: {
        activeSession,
        statistics: {
          reviewsCompleted,
          currentStreak,
          averageRecall,
          retentionRate,
          totalProblemsReviewed,
        },
        recentSessions: completedSessions,
        topics: uniqueTopics,
        totalCount: states.length,
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

// PUT — Submit review result for active session item
export async function PUT(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, sessionId, quality, personalNotes, reviewAgain } = body;

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
      const history = await tx.practiceReviewHistory.create({
        data: {
          reviewStateId: reviewState.id,
          sessionId: sessionId || null,
          quality,
          easeFactorBefore: reviewState.easeFactor,
          easeFactorAfter: nextSM2.easeFactor,
          intervalBefore: reviewState.interval,
          intervalAfter: nextSM2.interval,
          repetitions: reviewState.repetitions,
        },
      });

      // 2. Reset reviewAgain flag if quality >= 3 (confident solve)
      const shouldResetReviewAgain = quality >= 3;
      const updatedReviewAgain = shouldResetReviewAgain ? false : (reviewAgain !== undefined ? reviewAgain : reviewState.reviewAgain);

      const stateUpdate = await tx.practiceReviewState.update({
        where: { id: reviewState.id },
        data: {
          lastReview: new Date(),
          nextReview: nextSM2.nextReview,
          repetitions: nextSM2.repetitions,
          easeFactor: nextSM2.easeFactor,
          interval: nextSM2.interval,
          personalNotes: personalNotes !== undefined ? personalNotes : reviewState.personalNotes,
          reviewAgain: updatedReviewAgain,
        },
      });

      // 3. Update session item status if within a session
      if (sessionId) {
        // Mark session item completed
        await tx.practiceSessionItem.updateMany({
          where: {
            sessionId,
            practiceReviewStateId: reviewState.id,
          },
          data: { completed: true },
        });

        // Check if all items in session are completed
        const totalItems = await tx.practiceSessionItem.count({ where: { sessionId } });
        const completedItems = await tx.practiceSessionItem.count({
          where: { sessionId, completed: true },
        });

        const activeSess = await tx.practiceSession.findUnique({
          where: { id: sessionId },
          include: { items: true },
        });

        if (activeSess) {
          // Increment session index to point to next uncompleted item
          const nextIndex = completedItems; // because index is 0-based
          await tx.practiceSession.update({
            where: { id: sessionId },
            data: { currentIndex: nextIndex },
          });

          // Check if session completed
          if (completedItems >= totalItems) {
            const sessionHistory = await tx.practiceReviewHistory.findMany({
              where: { sessionId },
            });
            const sumRecall = sessionHistory.reduce((sum, h) => sum + h.quality, 0);
            const avgRecall = sessionHistory.length > 0 ? parseFloat((sumRecall / sessionHistory.length).toFixed(2)) : 0;
            const successHistory = sessionHistory.filter((h) => h.quality >= 3).length;
            const retRate = sessionHistory.length > 0 ? parseFloat(((successHistory / sessionHistory.length) * 100).toFixed(2)) : 0;

            await tx.practiceSession.update({
              where: { id: sessionId },
              data: {
                completedAt: new Date(),
                averageRecall: avgRecall,
                retentionRate: retRate,
              },
            });
          }
        }
      }

      return stateUpdate;
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

  const dateStrings = dates.map((d) => {
    const localDate = new Date(d);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const uniqueDates = Array.from(new Set(dateStrings)).sort((a, b) => b.localeCompare(a));
  if (uniqueDates.length === 0) return 0;

  const todayStr = getLocalDateString(new Date());
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));

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
      break;
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
