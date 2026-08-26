/**
 * src/lib/intelligence/interpretation/result-interpreter.ts
 * Interprets verified findings and synthesizes the Primary Observation.
 * Adheres to strict scientific honesty: distinguishes between Confirmed Defect,
 * Unproven Hypothesis (No counterexample found), and Inconclusive infrastructure results.
 */

import type { AnalysisEvidence } from '../analysis/evidence-engine';
import type { VerifiedTestCase, DimensionHealthScore } from '../types';

export function generatePrimaryObservation(opts: {
  evidence: AnalysisEvidence[];
  tests: VerifiedTestCase[];
  dimensionScores: DimensionHealthScore[];
  detectedApproach: string;
  overallHealthScore: number;
}): string {
  const { evidence, tests, dimensionScores, detectedApproach, overallHealthScore } = opts;

  const confirmedEv = evidence.filter(e => e.status === 'CONFIRMED');
  const rejectedEv = evidence.filter(e => e.status === 'REJECTED');
  const inconclusiveEv = evidence.filter(e => e.status === 'INCONCLUSIVE');
  const exposedTests = tests.filter(t => t.result === 'EXPOSED_ISSUE');

  if (confirmedEv.length > 0) {
    const primaryBug = confirmedEv[0];
    const failingTest = exposedTests.find(t => t.evidenceId === primaryBug.id) || exposedTests[0];
    const testInputSnippet = failingTest ? ` (e.g. input: \`${failingTest.normalizedInput}\`)` : '';

    return `Your overall ${detectedApproach} approach is structurally sound, but a verified defect was confirmed at line ${primaryBug.source.lineStart}: ${primaryBug.finding} Target test cases confirmed this hypothesis${testInputSnippet}.`;
  }

  if (exposedTests.length > 0) {
    return `Testing exposed a logic mismatch against the canonical reference oracle. The implementation produced unexpected results on ${exposedTests.length} targeted test cases.`;
  }

  if (rejectedEv.length > 0 && overallHealthScore >= 90) {
    return `Static analysis initially flagged ${rejectedEv.length} potential boundary/pointer transitions, but no counterexample was found for these hypotheses across ${tests.length} targeted boundary, duplicate, and stress test cases.`;
  }

  if (inconclusiveEv.length > 0) {
    return `Analysis completed across ${tests.length} targeted test cases, with ${inconclusiveEv.length} evaluation(s) inconclusive due to environment or execution constraints.`;
  }

  if (overallHealthScore >= 85) {
    return `Your ${detectedApproach} implementation demonstrated high stability across all ${tests.length} targeted boundary, duplicate, and stress test scenarios with no confirmed defects.`;
  }

  return `Analysis completed across ${tests.length} targeted test cases. Review the detailed evidence findings and test outputs below to inspect potential corner-case risks.`;
}
