/**
 * Feedback Store
 *
 * Collects user feedback on diagnoses. Feedback does NOT update
 * scoring weights live — it's stored for offline retraining.
 *
 * The user's reaction becomes data:
 * - "confirmed" = diagnosis was correct
 * - "corrected" = diagnosis was wrong, user provided correction
 * - "rejected" = diagnosis was completely off
 */

import type { PrismaClient } from '@prisma/client';
import type { FeedbackVerdict } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedbackInput {
  userId: string;
  diagnosisId: string;
  submissionId: string;
  rootCauseShown: string;
  userVerdict: FeedbackVerdict;
  userCorrection?: string;
}

export interface FeedbackStats {
  total: number;
  confirmed: number;
  corrected: number;
  rejected: number;
  accuracyRate: number; // confirmed / total
}

// ─── Store Operations ─────────────────────────────────────────────────────────

/**
 * Store a user's feedback on a diagnosis.
 *
 * @param prisma  Prisma client
 * @param input   Feedback data
 * @returns The created feedback entry
 */
export async function storeFeedback(
  prisma: PrismaClient,
  input: FeedbackInput
) {
  return prisma.feedbackEntry.create({
    data: {
      userId: input.userId,
      diagnosisId: input.diagnosisId,
      submissionId: input.submissionId,
      rootCauseShown: input.rootCauseShown,
      userVerdict: input.userVerdict,
      userCorrection: input.userCorrection ?? null,
    },
  });
}

/**
 * Get feedback statistics for a user.
 * Used for the retraining pipeline and user-facing accuracy metrics.
 */
export async function getFeedbackStats(
  prisma: PrismaClient,
  userId: string
): Promise<FeedbackStats> {
  const entries = await prisma.feedbackEntry.findMany({
    where: { userId },
    select: { userVerdict: true },
  });

  const total = entries.length;
  const confirmed = entries.filter(e => e.userVerdict === 'confirmed').length;
  const corrected = entries.filter(e => e.userVerdict === 'corrected').length;
  const rejected = entries.filter(e => e.userVerdict === 'rejected').length;

  return {
    total,
    confirmed,
    corrected,
    rejected,
    accuracyRate: total > 0 ? confirmed / total : 0,
  };
}

/**
 * Get all feedback entries for offline retraining.
 * Returns labeled data: (submission, root cause shown, user verdict)
 *
 * @param prisma  Prisma client
 * @param since   Optional cutoff date — only return feedback after this date
 * @returns Array of feedback entries with related data
 */
export async function getFeedbackForRetraining(
  prisma: PrismaClient,
  since?: Date
) {
  return prisma.feedbackEntry.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Check if a diagnosis already has user feedback.
 */
export async function hasFeedback(
  prisma: PrismaClient,
  diagnosisId: string
): Promise<boolean> {
  const count = await prisma.feedbackEntry.count({
    where: { diagnosisId },
  });
  return count > 0;
}
