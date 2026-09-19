import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';
import { getOrCreateReplaySession } from '@/lib/replay/replay-engine';

export async function POST(request: NextRequest) {
  const auth = await resolveUserId(request);
  if (!auth.userId) return unauthorizedResponse(auth.error || 'Authentication required.');
  const userId = auth.userId;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // missing body
  }

  const submissionId = body?.submissionId;
  if (!submissionId) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'submissionId is required.' } },
      { status: 400 }
    );
  }

  try {
    const replaySession = await getOrCreateReplaySession({
      userId,
      submissionId,
      forceRegenerate: Boolean(body?.forceRegenerate),
    });

    return NextResponse.json({ success: true, data: replaySession });
  } catch (error: any) {
    console.error('❌ POST /api/practice/replay/start error:', error);
    if (error.message?.includes('not found') || error.message?.includes('unauthorized')) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Failed submission not found for user.' } },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to start replay session.' } },
      { status: 500 }
    );
  }
}
