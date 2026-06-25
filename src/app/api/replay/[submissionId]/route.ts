import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';
import { runFailureReplay } from '@/lib/replay/replay-engine';
import { getConstraintIntelligence } from '@/lib/analysis/constraint-engine';

// POST /api/replay/[submissionId]
// Runs the failure replay pipeline: generates candidates, finds counter-example,
// minimizes it, builds trace, calls Groq for explanation.
// Accepts optional { seed: number } body for "Generate Another" functionality.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const auth = await resolveUserId(request);
  if (!auth.userId) return unauthorizedResponse(auth.error || 'Authentication required.');
  const userId = auth.userId;

  const { submissionId } = await params;

  let seed: number | undefined;
  try {
    const body = await request.json();
    seed = typeof body?.seed === 'number' ? body.seed : undefined;
  } catch {
    // no body is fine
  }

  try {
    // ── Load submission ────────────────────────────────────────────────────────
    const submission = await prisma.submissionEvent.findFirst({
      where: {
        OR: [{ id: submissionId }, { eventId: submissionId }],
        userId,
      },
      include: { problem: true },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Submission not found.' } },
        { status: 404 }
      );
    }

    // ── Only makes sense for failed submissions ────────────────────────────────
    const isFailedVerdict = ['Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Memory Limit Exceeded'].includes(submission.status);
    if (!isFailedVerdict) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_APPLICABLE', message: 'Failure Replay is only available for failed submissions.' } },
        { status: 422 }
      );
    }

    // ── Get problem constraints from constraint-engine ─────────────────────────
    let problemConstraints: string[] = [];
    try {
      const ci = await getConstraintIntelligence(
        submission.problem.title,
        submission.problem.slug,
        submission.problem.difficulty,
        'O(n)',
        submission.problem.topics,
        submission.code
      );
      problemConstraints = ci.problemConstraints;
    } catch {
      // Proceed without constraints — generator uses safe defaults
    }

    // ── Run replay engine ──────────────────────────────────────────────────────
    const replay = await runFailureReplay({
      submissionId: submission.id,
      problemSlug: submission.problem.slug,
      problemTitle: submission.problem.title,
      problemTopics: submission.problem.topics,
      problemDifficulty: submission.problem.difficulty,
      problemConstraints,
      userCode: submission.code,
      language: submission.language,
      verdict: submission.status,
      seed,
    });

    return NextResponse.json({ success: true, data: replay });
  } catch (error) {
    console.error('❌ POST /api/replay/[submissionId] error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to run failure replay.' } },
      { status: 500 }
    );
  }
}

// GET — returns last cached result if available (fast re-render)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const auth = await resolveUserId(request);
  if (!auth.userId) return unauthorizedResponse(auth.error || 'Authentication required.');
  const userId = auth.userId;
  const { submissionId } = await params;

  const submission = await prisma.submissionEvent.findFirst({
    where: { OR: [{ id: submissionId }, { eventId: submissionId }], userId },
    include: { problem: true },
  }).catch(() => null);

  if (!submission) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Submission not found.' } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      submissionId: submission.id,
      problemTitle: submission.problem.title,
      problemSlug: submission.problem.slug,
      verdict: submission.status,
      language: submission.language,
      ready: false, // client should POST to start replay
    },
  });
}
