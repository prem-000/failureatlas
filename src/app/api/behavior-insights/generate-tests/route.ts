import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { analyzeSubmission } from '@/lib/intelligence/intelligence-pipeline';

// POST /api/behavior-insights/generate-tests
// Praxis Failure Intelligence Engine — Unified Pipeline Entry Point
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
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

    const body = await request.json().catch(() => ({}));
    const { problemSlug, submissionId } = body;

    if (!problemSlug) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'problemSlug is required' } },
        { status: 400 }
      );
    }

    // 2. Fetch submission context
    const submission = await prisma.submissionEvent.findFirst({
      where: {
        userId,
        OR: [
          { id: submissionId },
          { eventId: submissionId },
          { problem: { slug: problemSlug } },
        ],
      },
      include: { problem: true },
      orderBy: { timestamp: 'desc' },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No matching submission found.' } },
        { status: 404 }
      );
    }

    // 3. Run Single Unified Failure Intelligence Pipeline
    const report = await analyzeSubmission({
      code: submission.code,
      language: submission.language,
      problemSlug: submission.problem.slug,
      problemTitle: submission.problem.title,
      problemDifficulty: submission.problem.difficulty,
      status: submission.status,
      topics: (submission.problem.topics as string[]) || [],
    });

    // 4. Return standard Praxis Report
    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('❌ POST /api/behavior-insights/generate-tests error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to analyze submission' } },
      { status: 500 }
    );
  }
}
