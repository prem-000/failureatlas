import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveUserId(request);
    if (!auth.userId) {
      return unauthorizedResponse(auth.error || 'Authentication required.');
    }
    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
    const checkSlug = searchParams.get('problemSlug');
    const checkId = searchParams.get('submissionId');

    // 1. Fetch all problems where the user has at least one Accepted submission
    const acceptedSubmissions = await prisma.submissionEvent.findMany({
      where: {
        userId,
        status: 'Accepted',
      },
      select: {
        id: true,
        timestamp: true,
        problemId: true,
        problem: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const acceptedProblemIds = new Set(acceptedSubmissions.map((s) => s.problemId));
    const acceptedSlugs = new Set(
      acceptedSubmissions.map((s) => s.problem?.slug).filter(Boolean) as string[]
    );

    // Map problemSlug -> latest accepted submission
    const acceptedBySlug = new Map<string, { id: string; timestamp: Date; title: string }>();
    for (const sub of acceptedSubmissions) {
      if (sub.problem?.slug && !acceptedBySlug.has(sub.problem.slug)) {
        acceptedBySlug.set(sub.problem.slug, {
          id: sub.id,
          timestamp: sub.timestamp,
          title: sub.problem.title,
        });
      }
    }

    // Direct check for a specific problem if queried
    if (checkSlug && acceptedSlugs.has(checkSlug)) {
      const acc = acceptedBySlug.get(checkSlug);
      return NextResponse.json({
        success: true,
        isResolved: true,
        acceptedSubmission: acc,
        openFailures: [],
      });
    }

    // 2. Fetch all non-accepted submissions for problems that have NEVER been accepted
    const failingSubmissions = await prisma.submissionEvent.findMany({
      where: {
        userId,
        status: { not: 'Accepted' },
        problemId: { notIn: Array.from(acceptedProblemIds) },
      },
      include: {
        problem: true,
        failureExplanation: true,
        diagnosis: true,
        evidence: {
          include: {
            rootCauseHypotheses: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // 3. Keep only the latest failure per problem
    const seenProblemIds = new Set<string>();
    const openFailures = [];

    for (const sub of failingSubmissions) {
      if (!sub.problem || seenProblemIds.has(sub.problemId)) continue;
      seenProblemIds.add(sub.problemId);

      const hypothesis = sub.evidence?.flatMap((e) => e.rootCauseHypotheses || [])[0];
      const rootCause =
        sub.failureExplanation?.rootCause ||
        hypothesis?.name ||
        sub.diagnosis?.primaryWeaknessId ||
        'boundary-condition-error';

      openFailures.push({
        id: sub.id,
        submissionId: sub.id,
        problemTitle: sub.problem.title,
        problemSlug: sub.problem.slug,
        category: sub.problem.topics?.[0] || 'algorithm',
        status: sub.status,
        language: sub.language,
        timestamp: sub.timestamp.toISOString(),
        passedTests: sub.testCasesPassed ?? 0,
        totalTests: sub.totalTestCases ?? 0,
        code: sub.code,
        rootCause,
        confidence: hypothesis?.confidence ? Math.round(hypothesis.confidence * 100) : 92,
        evidenceItems: sub.evidence?.map((e) => e.description) || [
          `Failed test case on submission with status ${sub.status}`,
        ],
      });
    }

    // If specific submission was checked and found in open failures or solved
    let isTargetResolved = false;
    let targetAcceptedSub = null;

    if (checkId) {
      const targetSub = await prisma.submissionEvent.findUnique({
        where: { id: checkId },
        include: { problem: true },
      });
      if (targetSub?.problem?.slug && acceptedSlugs.has(targetSub.problem.slug)) {
        isTargetResolved = true;
        targetAcceptedSub = acceptedBySlug.get(targetSub.problem.slug);
      }
    }

    return NextResponse.json({
      success: true,
      isResolved: isTargetResolved,
      acceptedSubmission: targetAcceptedSub,
      openFailures,
      acceptedSlugs: Array.from(acceptedSlugs),
    });
  } catch (error) {
    console.error('❌ GET /api/submissions/failing error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to query open failures.' } },
      { status: 500 }
    );
  }
}
