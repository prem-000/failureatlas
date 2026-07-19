/**
 * Feedback API Route
 *
 * POST /api/feedback — Submit diagnosis feedback
 * GET  /api/feedback — Get feedback stats for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';
import { storeFeedback, getFeedbackStats, hasFeedback } from '@/lib/feedback/store';
import type { FeedbackVerdict } from '@/types';

// ─── POST: Submit feedback ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { diagnosisId, submissionId, rootCauseShown, userVerdict, userCorrection } = body;

    // Validate required fields
    if (!diagnosisId || !submissionId || !rootCauseShown || !userVerdict) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: diagnosisId, submissionId, rootCauseShown, userVerdict',
          },
        },
        { status: 400 }
      );
    }

    // Validate verdict
    const validVerdicts: FeedbackVerdict[] = ['confirmed', 'corrected', 'rejected'];
    if (!validVerdicts.includes(userVerdict)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid userVerdict. Must be one of: ${validVerdicts.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Check for duplicate feedback
    const existing = await hasFeedback(prisma, diagnosisId);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE',
            message: 'Feedback already submitted for this diagnosis',
          },
        },
        { status: 409 }
      );
    }

    const entry = await storeFeedback(prisma, {
      userId: user.id,
      diagnosisId,
      submissionId,
      rootCauseShown,
      userVerdict,
      userCorrection,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        userVerdict: entry.userVerdict,
        createdAt: entry.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Feedback API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to store feedback' } },
      { status: 500 }
    );
  }
}

// ─── GET: Get feedback stats ──────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const stats = await getFeedbackStats(prisma, user.id);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Feedback stats API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get feedback stats' } },
      { status: 500 }
    );
  }
}
