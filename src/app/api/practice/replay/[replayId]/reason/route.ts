import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';
import { evaluateCheckpoint } from '@/lib/replay/replay-engine';

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

  const { nodeId, answer } = body;
  if (!nodeId || typeof answer !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'nodeId and answer are required.' } },
      { status: 400 }
    );
  }

  try {
    const evaluation = await evaluateCheckpoint({
      sessionId: replayId,
      userId,
      nodeId,
      answer,
    });

    return NextResponse.json({
      success: true,
      data: evaluation,
    });
  } catch (error: any) {
    console.error('❌ POST /api/practice/replay/[replayId]/reason error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to evaluate reasoning.' } },
      { status: 500 }
    );
  }
}
