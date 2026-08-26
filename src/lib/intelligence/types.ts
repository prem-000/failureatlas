/**
 * src/lib/intelligence/types.ts
 * Core types for the Praxis Failure Intelligence Engine (Phase 4).
 * Trustworthiness, rigorous verdict semantics, and production hardening.
 */

import type { ProblemContract } from './contracts/problem-contract';
import type { AnalysisEvidence, AnalysisCategory } from './analysis/evidence-engine';
import type { TestObjective } from './objectives/test-objective-builder';
import type { DetectedApproach } from './analysis/approach-classifier';
import type { ScalingBenchmarkResult } from './execution/scaling-evaluator';

export type CorrectnessVerdict =
  | 'DEFECT_CONFIRMED'
  | 'NO_DEFECT_FOUND'
  | 'INCONCLUSIVE';

export type PerformanceVerdict =
  | 'WITHIN_EXPECTATION'
  | 'AT_RISK'
  | 'LIKELY_LIMIT_EXCEEDED'
  | 'LIMIT_EXCEEDED'
  | 'NOT_ANALYZED';

export type OracleSupportLevel =
  | 'FULL_ORACLE_SUPPORT'
  | 'PARTIAL_ORACLE_SUPPORT'
  | 'PROPERTY_BASED_SUPPORT'
  | 'NO_RELIABLE_ORACLE';

export type TestVisibility = 'VISIBLE_TO_USER' | 'INTERNAL';

export type ExecutionVerdict =
  | 'PASSED'
  | 'WRONG_ANSWER'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'INCONCLUSIVE';

export interface EvidenceConfidence {
  static: number;
  empirical: number;
  combined: number;
}

export interface MinimalProof {
  originalInput: Record<string, unknown>;
  minimalInput: Record<string, unknown>;
  reductionSteps: number;
  isMinimized: boolean;
}

export interface ConfirmedDefectProof {
  evidenceId: string;
  detectorId?: string;
  failingInput: Record<string, unknown>;
  expectedOutput: unknown;
  actualOutput: unknown;
  minimizedInput?: Record<string, unknown>;
  reproductionCount: number; // Number of successful 3x reruns
  isReproducible: boolean;
}

export interface VerifiedTestCase {
  id: string;
  evidenceId: string;
  objectiveId: string;
  category: AnalysisCategory;
  purposeGroup: string;
  priority: 'high' | 'medium' | 'low';
  objective: string;
  input: Record<string, unknown>;
  normalizedInput: string;
  expectedOutput: unknown;
  userOutput: unknown;
  executionStatus: 'success' | 'runtime_error' | 'timeout';
  executionTimeMs: number;
  verdict: ExecutionVerdict;
  result: 'PASSED' | 'EXPOSED_ISSUE' | 'INCONCLUSIVE';
  visibility: TestVisibility;
  reproductionCount?: number;
  minimalProof?: MinimalProof;
  evidenceConnection: {
    detector: string;
    lineStart: number;
    snippet: string;
    whyItMatters: string;
  };
}

export interface DimensionHealthScore {
  category: AnalysisCategory;
  label: string;
  score: number; // 0 to 100
  potentialRiskCount: number;
  confirmedDefectCount: number;
  testedCount: number;
}

export interface FailureMechanismCoverage {
  totalRelevantMechanisms: number;
  mechanismsTested: number;
  mechanismsExposed: number;
  coveragePercent: number;
  untestedMechanisms: string[];
  mechanismList: Array<{
    name: string;
    tested: boolean;
    exposed: boolean;
  }>;
}

export interface SubmissionAssessment {
  correctness: CorrectnessVerdict;
  performance: PerformanceVerdict;
  coverage: number;
  oracleSupport: OracleSupportLevel;
  untestedMechanisms: string[];
  defectProof?: ConfirmedDefectProof;
}

export interface PraxisReport {
  problem: {
    slug: string;
    title: string;
    difficulty: string;
  };
  contract: ProblemContract;
  detectedApproach: string;
  approachDetails: DetectedApproach;
  estimatedComplexity: string;
  analysisConfidence: 'High' | 'Medium' | 'Low';
  overallHealthScore: number;
  analysisCoverage: number;
  oracleSupport: OracleSupportLevel;
  assessment: SubmissionAssessment;
  failureMechanismCoverage: FailureMechanismCoverage;
  scalingBenchmark?: ScalingBenchmarkResult;
  primaryObservation: string;
  smallestCounterexample?: VerifiedTestCase;
  evidence: AnalysisEvidence[];
  objectives: TestObjective[];
  testCases: VerifiedTestCase[];
  dimensionScores: DimensionHealthScore[];
  metrics: {
    evidenceCount: number;
    testsCreatedCount: number;
    defectsExposedCount: number;
    coveragePercent: number;
  };
}
