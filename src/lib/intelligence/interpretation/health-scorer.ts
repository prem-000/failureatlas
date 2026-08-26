/**
 * src/lib/intelligence/interpretation/health-scorer.ts
 * Two Independent Scores Model (Phase 2):
 * 1. Code Health Score (0-100): Measures observed correctness & implementation safety.
 * 2. Analysis Coverage Score (0-100%): Measures proportion of relevant behavioral domain & detectors analyzed.
 */

import type { AnalysisEvidence, AnalysisCategory } from '../analysis/evidence-engine';
import type { DimensionHealthScore } from '../types';

export const CATEGORY_LABELS: Record<AnalysisCategory, string> = {
  boundary: 'Boundary Reasoning',
  algorithm: 'Algorithm Correctness',
  complexity: 'Complexity Safety',
  data_structure: 'Data Structure Usage',
  implementation: 'Implementation Precision',
};

export const CATEGORY_WEIGHTS: Record<AnalysisCategory, number> = {
  boundary: 0.25,
  algorithm: 0.25,
  complexity: 0.15,
  data_structure: 0.15,
  implementation: 0.20,
};

export function calculateCodeHealthAndCoverage(opts: {
  evidenceList: AnalysisEvidence[];
  activeDetectorsCount?: number;
  totalRegisteredDetectorsCount?: number;
  testsCreatedCount?: number;
}): {
  dimensionScores: DimensionHealthScore[];
  overallHealthScore: number;
  analysisCoverage: number;
} {
  const {
    evidenceList,
    activeDetectorsCount = 4,
    totalRegisteredDetectorsCount = 7,
    testsCreatedCount = 4,
  } = opts;

  const categories: AnalysisCategory[] = [
    'boundary',
    'algorithm',
    'complexity',
    'data_structure',
    'implementation',
  ];

  const dimensionScores: DimensionHealthScore[] = categories.map(cat => {
    const catEvidence = evidenceList.filter(e => e.category === cat);

    const confirmedList = catEvidence.filter(e => e.status === 'CONFIRMED');
    const potentialList = catEvidence.filter(e => e.status === 'POTENTIAL' || e.status === 'TESTED');

    // Layer 1: Verified Defect Impact (Heavy penalty up to 80 points)
    const verifiedImpact = Math.min(
      80,
      confirmedList.reduce((acc, e) => acc + e.severity * 35, 0)
    );

    // Layer 2: Residual Unverified Risk (Minor penalty up to 20 points)
    const residualRisk = Math.min(
      20,
      potentialList.reduce((acc, e) => acc + e.severity * e.confidence * 8, 0)
    );

    const totalRisk = verifiedImpact + residualRisk;
    const score = Math.max(0, Math.round(100 - totalRisk));

    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      score,
      potentialRiskCount: potentialList.length,
      confirmedDefectCount: confirmedList.length,
      testedCount: catEvidence.length,
    };
  });

  // 1. Calculate weighted Code Health Score
  let weightedSum = 0;
  for (const dim of dimensionScores) {
    weightedSum += dim.score * CATEGORY_WEIGHTS[dim.category];
  }
  const overallHealthScore = Math.round(weightedSum);

  // 2. Calculate Analysis Coverage (% of relevant domain & detectors evaluated)
  const detectorRatio = Math.min(1.0, activeDetectorsCount / Math.max(1, totalRegisteredDetectorsCount));
  const testIntensity = Math.min(1.0, testsCreatedCount / 6);
  const evidenceDepth = Math.min(1.0, (evidenceList.length + 1) / 3);

  const rawCoverage = (detectorRatio * 0.4 + testIntensity * 0.35 + evidenceDepth * 0.25) * 100;
  const analysisCoverage = Math.min(100, Math.max(25, Math.round(rawCoverage)));

  return {
    dimensionScores,
    overallHealthScore,
    analysisCoverage,
  };
}

// Backwards compatibility export
export const calculateCodeHealth = (evidenceList: AnalysisEvidence[]) =>
  calculateCodeHealthAndCoverage({ evidenceList });
