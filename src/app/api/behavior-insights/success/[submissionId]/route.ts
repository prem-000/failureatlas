import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { generateSuccessInsight } from '@/lib/behavior/success-insight-engine';

// GET /api/behavior-insights/success/[submissionId]
// Returns a SuccessInsight for an accepted submission.
// Facts derived from AST analysis; Groq used only for explanation text.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || undefined);
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Missing Authorization token' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHORIZATION_FAILED', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }
    const userId = payload.userId;
    const { submissionId } = await params;

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'submissionId is required' } },
        { status: 400 }
      );
    }

    const insight = await generateSuccessInsight(userId, submissionId);

    return NextResponse.json({ success: true, data: insight });
  } catch (error: any) {
    // Specific error for non-accepted submissions
    if (error?.message?.includes('not Accepted')) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_ACCEPTED', message: 'Success insights are only available for accepted submissions' } },
        { status: 422 }
      );
    }
    console.error('❌ GET /api/behavior-insights/success/[submissionId] error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate success insight' } },
      { status: 500 }
    );
  }
}
