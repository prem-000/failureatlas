/**
 * src/lib/diagnosis/feedback-loop.ts
 *
 * Feedback-Driven Improvement Loop.
 * Records user validation and corrections, updates user-isolated retrieval preferences,
 * and dynamically weights historical evidence for future queries.
 */

import { prisma } from '@/lib/db/prisma';
import type { RetrievalFeedbackWeight } from './historical-retrieval';

export interface DiagnosisFeedbackPayload {
  diagnosisId: string;
  userId: string;
  query: string;
  helpful: boolean;
  corrected?: boolean;
  userCorrection?: string;
  usefulEvidence?: string[];
  incorrectEvidence?: string[];
}

// In-memory user-isolated retrieval weight cache (persisted to AuditLog in DB)
const userFeedbackWeightCache = new Map<string, { useful: Set<string>; incorrect: Set<string> }>();

export async function recordDiagnosisFeedback(payload: DiagnosisFeedbackPayload): Promise<{ success: boolean; id: string }> {
  const { diagnosisId, userId, query, helpful, corrected, userCorrection, usefulEvidence, incorrectEvidence } = payload;

  if (!userId) {
    throw new Error('User ID is required to record feedback');
  }

  // 1. Persist feedback securely in AuditLog with user isolation
  const auditEntry = await prisma.auditLog.create({
    data: {
      action: 'DIAGNOSIS_VALIDATION_FEEDBACK',
      userId,
      details: {
        diagnosisId,
        query,
        helpful,
        corrected: Boolean(corrected),
        userCorrection: userCorrection || '',
        usefulEvidence: usefulEvidence || [],
        incorrectEvidence: incorrectEvidence || [],
        timestamp: new Date().toISOString(),
      },
    },
  });

  // 2. Update user-isolated in-memory cache for fast retrieval adjustment
  let userWeights = userFeedbackWeightCache.get(userId);
  if (!userWeights) {
    userWeights = { useful: new Set<string>(), incorrect: new Set<string>() };
    userFeedbackWeightCache.set(userId, userWeights);
  }

  if (Array.isArray(usefulEvidence)) {
    for (const id of usefulEvidence) {
      userWeights.useful.add(id);
      userWeights.incorrect.delete(id);
    }
  }

  if (Array.isArray(incorrectEvidence)) {
    for (const id of incorrectEvidence) {
      userWeights.incorrect.add(id);
      userWeights.useful.delete(id);
    }
  }

  return { success: true, id: auditEntry.id };
}

export async function getUserFeedbackWeights(userId: string): Promise<RetrievalFeedbackWeight> {
  let weights = userFeedbackWeightCache.get(userId);
  if (weights) {
    return {
      usefulSubmissionIds: weights.useful,
      incorrectSubmissionIds: weights.incorrect,
    };
  }

  // Load from AuditLog for this specific authenticated user
  const usefulSet = new Set<string>();
  const incorrectSet = new Set<string>();

  try {
    const pastFeedback = await prisma.auditLog.findMany({
      where: {
        userId,
        action: 'DIAGNOSIS_VALIDATION_FEEDBACK',
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    for (const entry of pastFeedback) {
      const details = entry.details as any;
      if (details) {
        if (Array.isArray(details.usefulEvidence)) {
          details.usefulEvidence.forEach((id: string) => usefulSet.add(id));
        }
        if (Array.isArray(details.incorrectEvidence)) {
          details.incorrectEvidence.forEach((id: string) => incorrectSet.add(id));
        }
      }
    }
  } catch (err) {
    console.warn('[FeedbackLoop] Could not query past feedback logs from DB:', err);
  }

  userFeedbackWeightCache.set(userId, { useful: usefulSet, incorrect: incorrectSet });
  return {
    usefulSubmissionIds: usefulSet,
    incorrectSubmissionIds: incorrectSet,
  };
}
