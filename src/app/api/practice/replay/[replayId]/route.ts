import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';
import { getOrCreateReplaySession } from '@/lib/replay/replay-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ replayId: string }> }
) {
  const auth = await resolveUserId(request);
  if (!auth.userId) return unauthorizedResponse(auth.error || 'Authentication required.');
  const userId = auth.userId;

  const { replayId } = await params;

  try {
    // Look up either by replay session ID or by submission ID
    const existing = await prisma.replaySession.findFirst({
      where: {
        OR: [{ id: replayId }, { submissionId: replayId }],
        userId,
      },
    });

    if (existing) {
      const data = await getOrCreateReplaySession({
        userId,
        submissionId: existing.submissionId,
      });
      return NextResponse.json({ success: true, data });
    }

    // Check if it's a raw submission ID
    const submission = await prisma.submissionEvent.findFirst({
      where: {
        OR: [{ id: replayId }, { eventId: replayId }],
        userId,
      },
    });

    if (submission) {
      const data = await getOrCreateReplaySession({
        userId,
        submissionId: submission.id,
      });
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Replay session not found.' } },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('❌ GET /api/practice/replay/[replayId] error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to retrieve replay.' } },
      { status: 500 }
    );
  }
}
