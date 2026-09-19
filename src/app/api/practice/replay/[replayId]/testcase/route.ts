import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';
import { runTestcaseOnSession } from '@/lib/replay/replay-engine';

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

  const { testCaseId, code } = body;
  if (!testCaseId) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'testCaseId is required.' } },
      { status: 400 }
    );
  }

  try {
    const result = await runTestcaseOnSession({
      sessionId: replayId,
      userId,
      testCaseId,
      code,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ POST /api/practice/replay/[replayId]/testcase error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to run test case.' } },
      { status: 500 }
    );
  }
}
