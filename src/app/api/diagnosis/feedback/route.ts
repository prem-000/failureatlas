/**
 * src/app/api/diagnosis/feedback/route.ts
 *
 * Endpoint to receive and persist diagnosis feedback with user authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { recordDiagnosisFeedback } from '@/lib/diagnosis/feedback-loop';

export async function POST(request: NextRequest) {
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
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHORIZATION_FAILED', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }
    const userId = payload.userId;

    const body = await request.json();
    const { diagnosisId, query, helpful, corrected, userCorrection, usefulEvidence, incorrectEvidence } = body;

    if (!diagnosisId) {
      return NextResponse.json(
        { success: false, error: { message: 'diagnosisId is required' } },
        { status: 400 }
      );
    }

    const result = await recordDiagnosisFeedback({
      diagnosisId,
      userId,
      query: typeof query === 'string' ? query : '',
      helpful: Boolean(helpful),
      corrected: Boolean(corrected),
      userCorrection: typeof userCorrection === 'string' ? userCorrection : undefined,
      usefulEvidence: Array.isArray(usefulEvidence) ? usefulEvidence : [],
      incorrectEvidence: Array.isArray(incorrectEvidence) ? incorrectEvidence : [],
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Feedback recorded successfully to improve future retrieval ranking.',
    });
  } catch (err: any) {
    console.error('Feedback recording failed:', err);
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Failed to record feedback' } },
      { status: 500 }
    );
  }
}
