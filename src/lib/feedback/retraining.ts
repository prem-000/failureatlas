/**
 * Offline Retraining Pipeline — Stub
 *
 * Scheduled batch job that consumes the Feedback Store and
 * updates scoring rules/model weights.
 *
 * This is deliberately NOT online learning — feedback is batched
 * into scheduled offline retraining to keep weight/model updates
 * reviewable and reversible.
 *
 * Full implementation is Phase 3 / Future Work.
 */

import type { PrismaClient } from '@prisma/client';
import { getFeedbackForRetraining } from './store';
import fs from 'fs';
import path from 'path';
import type { RootCauseType } from '@/types';

const LEARNING_RATE = 0.02;

export interface RetrainingReport {
  feedbackProcessed: number;
  accuracyBefore: number;
  accuracyAfter: number;
  rulesUpdated: string[];
  timestamp: string;
}

/**
 * Run the offline retraining pipeline.
 *
 * Processes historical feedback from database logs, applies gradient updates to 
 * classifier priors and likelihood values, and saves the modified weights to 
 * bayesian-weights.json for version control and review.
 *
 * @param prisma  Prisma client
 * @param since   Process feedback since this date (default: last 30 days)
 */
export async function runOfflineRetraining(
  prisma: PrismaClient,
  since?: Date
): Promise<RetrainingReport> {
  const cutoff = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const feedback = await getFeedbackForRetraining(prisma, cutoff);

  if (feedback.length === 0) {
    return {
      feedbackProcessed: 0,
      accuracyBefore: 0,
      accuracyAfter: 0,
      rulesUpdated: [],
      timestamp: new Date().toISOString(),
    };
  }

  // Load current weights from file
  const weightsPath = path.join(process.cwd(), 'src/lib/inference/bayesian-weights.json');
  let data: any = { priors: {}, likelihoods: {} };
  let currentVersion = 1;
  let trainedOnCount = 0;
  try {
    if (fs.existsSync(weightsPath)) {
      const fileData = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
      if (fileData.weights) {
        data = fileData.weights;
        currentVersion = fileData.version ?? 1;
        trainedOnCount = fileData.trainedOn ?? 0;
      } else {
        data = fileData; // legacy flat format
      }
    }
  } catch (err) {
    console.error('[Retraining] Failed to load current weights', err);
  }

  const confirmedCount = feedback.filter(f => f.userVerdict === 'confirmed').length;
  const accuracyBefore = confirmedCount / feedback.length;

  const priors = { ...data.priors };
  const likelihoods = JSON.parse(JSON.stringify(data.likelihoods));
  const rulesUpdated: string[] = [];

  for (const entry of feedback) {
    const shown = entry.rootCauseShown as RootCauseType;
    const verdict = entry.userVerdict;
    const correction = entry.userCorrection as RootCauseType | null;

    const submission = await prisma.submissionEvent.findUnique({
      where: { id: entry.submissionId },
      include: { evidence: true },
    });

    if (!submission) continue;

    // Identify active telemetry signals
    const activeFlags: string[] = [];
    if (submission.evidence.some(e => e.type === 'BoundaryError')) activeFlags.push('hasBoundaryDiff');
    if (submission.evidence.some(e => e.type === 'OffByOne')) activeFlags.push('hasStructuralBoundaryChange');
    if (submission.evidence.some(e => e.type === 'ComplexityError')) activeFlags.push('hasAlgorithmRewrite');
    if (submission.evidence.some(e => e.type === 'MemoryError')) activeFlags.push('hasDataStructureChange');
    
    if (submission.status === 'Time Limit Exceeded') activeFlags.push('verdictTLE');
    else if (submission.status === 'Memory Limit Exceeded') activeFlags.push('verdictMLE');
    else if (submission.status === 'Wrong Answer') activeFlags.push('verdictWA');
    else if (submission.status === 'Runtime Error') activeFlags.push('verdictRE');

    if (verdict === 'confirmed') {
      // Prior update: strengthen shown cause
      if (priors[shown] !== undefined) {
        priors[shown] += LEARNING_RATE * (1.0 - priors[shown]);
        if (!rulesUpdated.includes(`prior:${shown}`)) rulesUpdated.push(`prior:${shown}`);
      }

      // Likelihood update: increase probabilities of active flags for this cause
      for (const flag of activeFlags) {
        if (likelihoods[flag]?.[shown] !== undefined) {
          likelihoods[flag][shown] += LEARNING_RATE * (1.0 - likelihoods[flag][shown]);
          if (!rulesUpdated.includes(`likelihood:${flag}:${shown}`)) {
            rulesUpdated.push(`likelihood:${flag}:${shown}`);
          }
        }
      }
    } else if (verdict === 'corrected' && correction && priors[correction] !== undefined) {
      // Prior update: weaken shown cause, strengthen corrected cause
      if (priors[shown] !== undefined) {
        priors[shown] -= LEARNING_RATE * priors[shown];
        if (!rulesUpdated.includes(`prior:${shown}`)) rulesUpdated.push(`prior:${shown}`);
      }
      priors[correction] += LEARNING_RATE * (1.0 - priors[correction]);
      if (!rulesUpdated.includes(`prior:${correction}`)) rulesUpdated.push(`prior:${correction}`);

      // Likelihood update: adjust probabilities for active flags
      for (const flag of activeFlags) {
        if (likelihoods[flag]?.[shown] !== undefined) {
          likelihoods[flag][shown] -= LEARNING_RATE * likelihoods[flag][shown];
          if (!rulesUpdated.includes(`likelihood:${flag}:${shown}`)) {
            rulesUpdated.push(`likelihood:${flag}:${shown}`);
          }
        }
        if (likelihoods[flag]?.[correction] !== undefined) {
          likelihoods[flag][correction] += LEARNING_RATE * (1.0 - likelihoods[flag][correction]);
          if (!rulesUpdated.includes(`likelihood:${flag}:${correction}`)) {
            rulesUpdated.push(`likelihood:${flag}:${correction}`);
          }
        }
      }
    } else if (verdict === 'rejected') {
      // Prior update: weaken shown cause
      if (priors[shown] !== undefined) {
        priors[shown] -= LEARNING_RATE * priors[shown];
        if (!rulesUpdated.includes(`prior:${shown}`)) rulesUpdated.push(`prior:${shown}`);
      }

      // Likelihood update: decrease active flag correlation
      for (const flag of activeFlags) {
        if (likelihoods[flag]?.[shown] !== undefined) {
          likelihoods[flag][shown] -= LEARNING_RATE * likelihoods[flag][shown];
          if (!rulesUpdated.includes(`likelihood:${flag}:${shown}`)) {
            rulesUpdated.push(`likelihood:${flag}:${shown}`);
          }
        }
      }
    }
  }

  // Normalize priors to sum to 1.0
  const priorSum = Object.values(priors).reduce((sum: number, v: any) => sum + v, 0);
  if (priorSum > 0) {
    for (const key of Object.keys(priors)) {
      priors[key] /= priorSum;
    }
  }

  // Bound checks to prevent probability lockouts
  for (const key of Object.keys(priors)) {
    priors[key] = Math.max(0.01, Math.min(0.99, priors[key]));
  }
  for (const flag of Object.keys(likelihoods)) {
    for (const rc of Object.keys(likelihoods[flag])) {
      likelihoods[flag][rc] = Math.max(0.01, Math.min(0.99, likelihoods[flag][rc]));
    }
  }

  // Save weights
  const updatedData = {
    version: currentVersion + 1,
    createdAt: new Date().toISOString(),
    trainedOn: trainedOnCount + feedback.length,
    weights: { priors, likelihoods }
  };
  try {
    fs.writeFileSync(weightsPath, JSON.stringify(updatedData, null, 2), 'utf8');
    console.log(`[Retraining] Retrained weights successfully written to ${weightsPath}`);
  } catch (err) {
    console.error('[Retraining] Failed to write updated weights', err);
  }

  console.log(
    `[Retraining] Retraining completed. Processed ${feedback.length} entries. ` +
    `Accuracy before: ${(accuracyBefore * 100).toFixed(1)}%. Rules updated: ${rulesUpdated.length}`
  );

  return {
    feedbackProcessed: feedback.length,
    accuracyBefore,
    accuracyAfter: accuracyBefore,
    rulesUpdated,
    timestamp: new Date().toISOString(),
  };
}
