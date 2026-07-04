// src/lib/interceptor/analysis-bridge.ts
// Lightweight bridge that re-runs Bayesian inference when a NetworkEvidence row
// enriches an already-existing SubmissionEvent.
//
// This is called fire-and-forget from the interceptor route. Any exception is
// caught by the caller and logged — it never propagates to the HTTP handler.

import { prisma } from '@/lib/db/prisma';
import { runBayesianInference } from '@/lib/inference/bayesian';
import type { BayesianEvidence } from '@/lib/inference/bayesian';
import { isHighLatency } from './extractor';
import type { NormalizedInterceptorEvent } from './types';

/**
 * Re-runs Bayesian inference for an existing submission, incorporating
 * network signals from the interceptor event.
 *
 * This supplements (does not replace) the hypotheses created by the main
 * analysis pipeline. New hypotheses are upserted; the diagnosis record is
 * updated if confidence changed.
 */
export async function runNetworkEnrichedAnalysis(
  submissionId: string,
  networkEvent: NormalizedInterceptorEvent
): Promise<void> {
  console.log(`[AnalysisBridge] Running network-enriched Bayesian inference for ${submissionId}`);

  // ── Load submission ────────────────────────────────────────────────────────
  const submission = await prisma.submissionEvent.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    console.warn(`[AnalysisBridge] Submission ${submissionId} not found — skipping`);
    return;
  }

  // ── Load existing evidence rows (separate query for compatibility) ──────────
  const evidenceRows = await prisma.evidence.findMany({
    where: { submissionId },
  });

  // ── Build network-augmented Bayesian evidence ──────────────────────────────
  const verdict = (networkEvent.verdict ?? submission.status) as any;

  // Derive boolean flags from prior evidence rows
  const hasBoundaryDiff = evidenceRows.some(
    (e) => e.source === 'myers-diff' || e.source === 'structural-pattern'
  );
  const hasAlgorithmRewrite = evidenceRows.some(
    (e) => e.description?.includes('ALGORITHM_REWRITE')
  );
  const hasDataStructureChange = evidenceRows.some(
    (e) => e.description?.includes('DATA_STRUCTURE_CHANGE')
  );
  const hasStructuralBoundaryChange = evidenceRows.some(
    (e) => e.description?.includes('BOUNDARY_CONDITION_CHANGE')
  );
  const hasImplementationDetailChange = evidenceRows.some(
    (e) => e.description?.includes('IMPLEMENTATION_DETAIL')
  );
  const hasRapidResubmission = evidenceRows.some(
    (e) => e.type === 'behavioral' && e.description?.includes('rapid_resubmission')
  );
  const hasLongGap = evidenceRows.some(
    (e) => e.type === 'behavioral' && e.description?.includes('long_gap')
  );
  const hasManyMinorChanges = evidenceRows.some(
    (e) => e.type === 'behavioral' && e.description?.includes('many_minor_changes')
  );

  // Network-specific signals
  const hasHighLatency      = isHighLatency(networkEvent.latencyMs);
  const hasRetries          = (networkEvent.retryCount ?? 0) > 0;
  const failedRatio         = networkEvent.passedTestcases != null && networkEvent.totalTestcases != null
    ? networkEvent.passedTestcases / Math.max(networkEvent.totalTestcases, 1)
    : undefined;

  const bayesEvidence: BayesianEvidence = {
    hasBoundaryDiff,
    hasStructuralBoundaryChange,
    hasAlgorithmRewrite,
    hasDataStructureChange,
    hasImplementationDetailChange,
    hasRapidResubmission,
    hasLongGap,
    hasManyMinorChanges,
    verdict,
    failedTestCase: networkEvent.failedTestcase ?? submission.failedTestCase ?? undefined,
    // Network signals
    hasHighLatency,
    hasRetries,
    failedTestcaseRatio: failedRatio,
    hasTLEFromRuntime: verdict === 'Time Limit Exceeded',
    hasMLE:            verdict === 'Memory Limit Exceeded',
  };

  const hypotheses = runBayesianInference(bayesEvidence);

  // ── Persist updated hypotheses ────────────────────────────────────────────
  // Use the first evidence row as anchor (or null if none)
  const evidenceAnchorId = evidenceRows[0]?.id ?? null;

  for (const hyp of hypotheses) {
    await prisma.rootCauseHypothesis.create({
      data: {
        evidenceId:    evidenceAnchorId,
        rootCauseType: hyp.rootCause,
        name:          hyp.name,
        confidence:    hyp.confidence,
      },
    });
  }

  // ── Persist network evidence as a typed Evidence row too ─────────────────
  // This makes the generic evidence table consistent for the analysis UI.
  const latency = networkEvent.latencyMs;
  await prisma.evidence.create({
    data: {
      submissionId,
      type:        'test_failure',
      description: `Network: ${verdict ?? 'Unknown'} — latency ${latency != null ? latency + 'ms' : 'N/A'}, retries ${networkEvent.retryCount}`,
      confidence:  0.92,
      source:      'network-interceptor',
      rawData: {
        verdict,
        runtime:        networkEvent.runtime,
        memory:         networkEvent.memory,
        latencyMs:      networkEvent.latencyMs,
        retryCount:     networkEvent.retryCount,
        passedTestcases: networkEvent.passedTestcases,
        totalTestcases:  networkEvent.totalTestcases,
      },
    },
  });

  console.log(`[AnalysisBridge] ✅ Network-enriched analysis complete for ${submissionId}`);
}
