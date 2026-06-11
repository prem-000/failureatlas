import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth, ApiError, errorResponse, successResponse } from '@/lib/auth/middleware';

export const runtime = 'nodejs';

interface SaveLearningRequest {
  helpful: boolean;
  feedback?: string;
}

/**
 * POST /api/submissions/[id]/save-learning
 *
 * Save user feedback on analysis results.
 * Requires JWT authentication.
 *
 * Updates:
 * - AuditLog with user feedback
 * - Database graph relationship weights for useful root causes
 */
export async function POST(
  request: NextRequest,
  context: any,
) {
  try {
    // Verify authentication
    const userId = await requireAuth(request);

    const body = (await request.json()) as SaveLearningRequest;
    const { helpful, feedback } = body;
    const submissionId = context?.params?.id;

    if (typeof helpful !== 'boolean') {
      throw new ApiError('Missing required field: helpful (boolean)', 400);
    }

    // Verify submission exists and belongs to user
    const submission = await prisma.submissionEvent.findUnique({
      where: { id: submissionId },
      include: { diagnosis: true },
    });

    if (!submission) {
      throw new ApiError('Submission not found', 404);
    }

    // For now, allow if user is admin or anonymous submissions
    // TODO: verify ownership if submission has userId
    if (submission.userId !== 'anonymous' && submission.userId !== userId) {
      throw new ApiError('Unauthorized: submission does not belong to this user', 403);
    }

    if (!submission.diagnosis) {
      throw new ApiError('No diagnosis found for this submission', 404);
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'DIAGNOSIS_FEEDBACK',
        userId,
        details: {
          helpful,
          feedback: feedback || '',
          submissionId,
          diagnosisId: submission.diagnosis.id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // TODO: Update database graph relationship weights if helpful is true
    // This would increase the confidence weight of the diagnosed root cause
    // for future Bayesian calculations

    return successResponse(
      {
        success: true,
        message: helpful
          ? 'Thank you for the feedback! This helps us improve recommendations.'
          : 'Feedback recorded. We will improve our analysis.',
        submissionId,
      },
      200,
    );
  } catch (error) {
    console.error('Error in save-learning route:', error);
    return errorResponse(error);
  }
}
