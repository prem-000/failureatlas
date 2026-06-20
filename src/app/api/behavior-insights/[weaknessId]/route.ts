import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { generateBehaviorInsight } from '@/lib/behavior/insight-engine';

// GET /api/behavior-insights/[weaknessId]
// Returns a BehaviorInsight for the authenticated user and the given weakness.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ weaknessId: string }> }
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
    const { weaknessId } = await params;

    if (!weaknessId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'weaknessId is required' } },
        { status: 400 }
      );
    }

    const insight = await generateBehaviorInsight(userId, weaknessId);

    return NextResponse.json({ success: true, data: insight });
  } catch (error) {
    console.error('❌ GET /api/behavior-insights/[weaknessId] error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate behavior insight' } },
      { status: 500 }
    );
  }
}
