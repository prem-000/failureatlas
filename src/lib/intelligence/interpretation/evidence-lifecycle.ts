/**
 * src/lib/intelligence/interpretation/evidence-lifecycle.ts
 * Manages Evidence Lifecycle Transitions & Calibrated Confidence (Phase 2).
 */

import type { AnalysisEvidence, EvidenceStatus } from '../analysis/evidence-engine';
import type { VerifiedTestCase } from '../types';

export function resolveEvidenceLifecycles(
  evidenceList: AnalysisEvidence[],
  verifiedTests: VerifiedTestCase[]
): AnalysisEvidence[] {
  return evidenceList.map(ev => {
    // Find all tests targeting this specific evidence
    const relatedTests = verifiedTests.filter(t => t.evidenceId === ev.id);
    const staticConf = ev.staticConfidence ?? ev.confidence ?? 0.8;

    if (relatedTests.length === 0) {
      return {
        ...ev,
        status: 'POTENTIAL' as EvidenceStatus,
        staticConfidence: staticConf,
        empiricalConfidence: 0.1,
        combinedConfidence: staticConf * 0.8,
        confidence: staticConf * 0.8,
      };
    }

    const failingTest = relatedTests.find(
      t => t.verdict === 'WRONG_ANSWER' || t.verdict === 'TIME_LIMIT_EXCEEDED' || t.verdict === 'RUNTIME_ERROR' || t.result === 'EXPOSED_ISSUE'
    );

    if (failingTest) {
      const empiricalConf = 1.0;
      const combined = Math.min(0.99, (staticConf + empiricalConf) / 2);
      return {
        ...ev,
        status: 'CONFIRMED' as EvidenceStatus,
        staticConfidence: staticConf,
        empiricalConfidence: empiricalConf,
        combinedConfidence: combined,
        confidence: combined,
        counterexample: failingTest.input,
      };
    }

    const hasInconclusive = relatedTests.some(
      t => t.verdict === 'INCONCLUSIVE' || t.result === 'INCONCLUSIVE'
    );
    const allPassed = relatedTests.every(
      t => t.verdict === 'PASSED' || t.result === 'PASSED'
    );

    if (allPassed && relatedTests.length > 0) {
      const empiricalConf = 0.15; // Low empirical bug likelihood
      const combined = Math.max(0.12, staticConf * 0.25);
      return {
        ...ev,
        status: 'REJECTED' as EvidenceStatus,
        staticConfidence: staticConf,
        empiricalConfidence: empiricalConf,
        combinedConfidence: combined,
        confidence: combined,
      };
    }

    if (hasInconclusive) {
      return {
        ...ev,
        status: 'INCONCLUSIVE' as EvidenceStatus,
        staticConfidence: staticConf,
        empiricalConfidence: 0.5,
        combinedConfidence: staticConf * 0.5,
        confidence: staticConf * 0.5,
      };
    }

    return {
      ...ev,
      status: 'TESTED' as EvidenceStatus,
      staticConfidence: staticConf,
      empiricalConfidence: 0.5,
      combinedConfidence: staticConf * 0.6,
      confidence: staticConf * 0.6,
    };
  });
}
