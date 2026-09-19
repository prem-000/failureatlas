import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';
import { unlockHintLevel } from '@/lib/replay/replay-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ replayId: string }> }
) {
  const auth = await resolveUserId(request);
  if (!auth.userId) return unauthorizedResponse(auth.error || 'Authentication required.');
  const userId = auth.userId;

  const { replayId } = await params;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // empty body
  }

  const level = parseInt(body?.level, 10);
  if (isNaN(level) || level < 1 || level > 5) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid hint level (1-5) is required.' } },
      { status: 400 }
    );
  }

  try {
    const updatedHints = await unlockHintLevel({
      sessionId: replayId,
      userId,
      level,
    });

    return NextResponse.json({
      success: true,
      data: {
        hints: updatedHints,
        hintLevel: level,
      },
    });
  } catch (error: any) {
    console.error('❌ POST /api/practice/replay/[replayId]/hint error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to unlock hint.' } },
      { status: 500 }
    );
  }
}
