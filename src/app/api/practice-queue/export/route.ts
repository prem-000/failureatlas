import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { calculatePriorityScore } from '@/lib/practice-queue/priority';

// POST — Create export payload (caching config details to database)
export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, limit, order, difficulty, topics, include } = body;

    const includeNotes = include?.includes('notes') ?? true;
    const includeCheatsheet = include?.includes('cheatsheets') ?? true;
    const includeSolution = include?.includes('solutions') ?? true;
    const includeEditorial = include?.includes('editorial') ?? true;
    const includeBlankSpace = include?.includes('blank') ?? true;

    let reviewStates: any[] = [];

    // 1. If sessionId is provided, fetch states from that session
    if (sessionId) {
      const dbSession = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: {
              review: true,
            },
          },
        },
      });

      if (dbSession) {
        reviewStates = dbSession.items.map((item) => item.review);
      }
    } else {
      // 2. Otherwise, fetch user review states and filter
      const allStates = await prisma.practiceReviewState.findMany({
        where: { userId: session.id },
      });

      // Fetch related problems to filter by topic / difficulty
      const problems = await prisma.problem.findMany({
        where: { slug: { in: allStates.map((s) => s.problemId) } },
      });

      let filtered = allStates.map((state) => {
        const problem = problems.find((p) => p.slug === state.problemId);
        return { state, problem };
      });

      // Filter by difficulty (comma separated or array)
      if (difficulty && difficulty.length > 0) {
        const diffs = Array.isArray(difficulty)
          ? difficulty
          : (difficulty as string).split(',').map((d) => d.trim().toLowerCase());
        filtered = filtered.filter((item) =>
          item.problem && diffs.includes(item.problem.difficulty.toLowerCase())
        );
      }

      // Filter by topics
      if (topics && topics.length > 0) {
        const targetTopics = Array.isArray(topics)
          ? topics
          : (topics as string).split(',').map((t) => t.trim().toLowerCase());
        filtered = filtered.filter((item) =>
          item.problem?.topics.some((t) => targetTopics.includes(t.toLowerCase()))
        );
      }

      // Order problems
      if (order === 'RANDOM') {
        filtered.sort(() => Math.random() - 0.5);
      } else if (order === 'WEAKEST') {
        // Sort by recall rating in history (lowest recall first)
        const histories = await prisma.practiceReviewHistory.findMany({
          where: { reviewState: { userId: session.id } },
          orderBy: { reviewedAt: 'desc' },
        });

        filtered.sort((a, b) => {
          const aHistory = histories.find((h) => h.reviewStateId === a.state.id);
          const bHistory = histories.find((h) => h.reviewStateId === b.state.id);
          const aRecall = aHistory ? aHistory.quality : 5;
          const bRecall = bHistory ? bHistory.quality : 5;
          return aRecall - bRecall;
        });
      } else {
        // PRIORITY (default)
        const userSubmissions = await prisma.submissionEvent.findMany({
          where: { userId: session.id },
        });

        const scored = filtered.map((item) => {
          const problemSubmissions = userSubmissions.filter(
            (s) => s.problemId === item.problem?.id
          );
          const score = calculatePriorityScore(
            item.state,
            item.problem || { difficulty: 'Medium' },
            problemSubmissions
          );
          return { ...item, score };
        });

        scored.sort((a, b) => b.score - a.score);
        filtered = scored;
      }

      // Slice to limit
      const limitVal = parseInt(limit, 10) || 5;
      reviewStates = filtered.slice(0, limitVal).map((item) => item.state);
    }

    // 3. Compile the export payload data with optional components
    const compiledPayload = [];

    for (const state of reviewStates) {
      const problem = await prisma.problem.findUnique({
        where: { slug: state.problemId },
      });

      if (!problem) continue;

      // URL platform link
      let platformUrl = problem.url || '';
      if (!platformUrl) {
        if (state.platform === 'LeetCode') {
          platformUrl = `https://leetcode.com/problems/${state.problemId}/`;
        } else if (state.platform === 'Codeforces') {
          const contestId = state.problemId.replace(/[^0-9]/g, '');
          const index = state.problemId.replace(/[0-9]/g, '');
          platformUrl = contestId && index ? `https://codeforces.com/problemset/problem/${contestId}/${index}` : 'https://codeforces.com/';
        } else if (state.platform === 'CodeChef') {
          platformUrl = `https://www.codechef.com/problems/${state.problemId}`;
        } else if (state.platform === 'AtCoder') {
          platformUrl = `https://atcoder.jp/contests/archive/tasks/${state.problemId}`;
        }
      }

      let cheatsheetJson: any = null;
      if (includeCheatsheet && problem.topics.length > 0) {
        // Query the cheatsheet (LearningSheet) for the first topic
        const sheet = await prisma.learningSheet.findFirst({
          where: {
            topic: {
              equals: problem.topics[0],
              mode: 'insensitive',
            },
          },
        });
        if (sheet) {
          cheatsheetJson = sheet.json;
        }
      }

      let previousSolution = '';
      if (includeSolution) {
        const sub = await prisma.submissionEvent.findFirst({
          where: {
            userId: session.id,
            problemId: problem.id,
            status: { in: ['Accepted', 'AC'] },
          },
          orderBy: { timestamp: 'desc' },
        });
        if (sub) {
          previousSolution = sub.code;
        }
      }

      let editorial = '';
      if (includeEditorial) {
        const failureExpl = await prisma.failureExplanation.findFirst({
          where: {
            submission: {
              userId: session.id,
              problemId: problem.id,
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (failureExpl) {
          editorial = `**Root Cause**: ${failureExpl.rootCause}\n\n**Logic Breakdown**: ${failureExpl.logicBreakdown}\n\n**Learning Concept**: ${failureExpl.learningConcept}\n\n**Recommendation**: ${failureExpl.recommendation}`;
        }
      }

      compiledPayload.push({
        id: state.id,
        title: state.title,
        difficulty: state.difficulty,
        platform: state.platform,
        problemUrl: platformUrl,
        tags: problem.topics,
        personalNotes: includeNotes ? state.personalNotes : '',
        cheatsheet: cheatsheetJson,
        previousSolution,
        editorial,
        includeBlankSpace,
      });
    }

    // 4. Save into PracticeExport table
    const exportRecord = await prisma.practiceExport.create({
      data: {
        userId: session.id,
        payload: compiledPayload,
      },
    });

    return NextResponse.json({
      success: true,
      exportId: exportRecord.id,
    });
  } catch (error: any) {
    logger.error('Error creating practice export payload:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET — Load print payload
export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exportId = searchParams.get('id');

    if (!exportId) {
      return NextResponse.json({ success: false, error: 'Export ID is required' }, { status: 400 });
    }

    const exportRecord = await prisma.practiceExport.findUnique({
      where: { id: exportId },
    });

    if (!exportRecord) {
      return NextResponse.json({ success: false, error: 'Export record not found' }, { status: 404 });
    }

    if (exportRecord.userId !== session.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      payload: exportRecord.payload,
    });
  } catch (error: any) {
    logger.error('Error loading export payload:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
