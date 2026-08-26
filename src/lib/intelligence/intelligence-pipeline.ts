/**
 * src/lib/intelligence/intelligence-pipeline.ts
 * Single Unified Orchestrator for Praxis Failure Intelligence (Phase 4).
 * Trustworthiness, rigorous verdict semantics, 3x reproducibility validation, and oracle reliability checking.
 */

import { resolveProblemContract } from './contracts/contract-extractor';
import { analyzeSourceCode } from './analysis/core-analyzer';
import { buildTestObjectives } from './objectives/test-objective-builder';
import { generateCandidatePools } from './generation/candidate-generator';
import { executeUserCode } from './execution/user-executor';
import { executeReferenceOracle } from './execution/oracle-executor';
import { compareExecutionResults } from './execution/result-comparator';
import { normalizeInputToString } from './execution/execution-normalizer';
import { minimizeCounterexample } from './generation/counterexample-minimizer';
import { evaluateEmpiricalScaling } from './execution/scaling-evaluator';
import { computeFailureMechanismCoverage } from './analysis/failure-mechanisms';
import { determineOracleSupport } from './oracles/oracle-support';
import { validateDefectReproducibility } from './execution/reproducibility-validator';
import { resolveEvidenceLifecycles } from './interpretation/evidence-lifecycle';
import { calculateCodeHealthAndCoverage } from './interpretation/health-scorer';
import { generatePrimaryObservation } from './interpretation/result-interpreter';
import type {
  PraxisReport,
  VerifiedTestCase,
  SubmissionAssessment,
  CorrectnessVerdict,
  ConfirmedDefectProof,
} from './types';

export async function analyzeSubmission(opts: {
  code: string;
  language?: string;
  problemSlug: string;
  problemTitle: string;
  problemDifficulty?: string;
  status?: string;
  topics?: string[];
}): Promise<PraxisReport> {
  const {
    code,
    language = 'javascript',
    problemSlug,
    problemTitle,
    problemDifficulty = 'Medium',
    status = 'Wrong Answer',
    topics = [],
  } = opts;

  // 1. Resolve Canonical Problem Contract
  const contract = resolveProblemContract({
    slug: problemSlug,
    title: problemTitle,
    difficulty: problemDifficulty,
    code,
    topics,
  });

  // 2. Classify Ground Truth Oracle Support
  const oracleSupport = determineOracleSupport(contract);

  // 3. Algorithm-Aware Classification & Dynamic Detector Registry Analysis
  const staticSummary = analyzeSourceCode(code, contract, language);
  let evidenceList = staticSummary.evidence;

  // 4. Failure-Driven Test Objectives
  const objectives = buildTestObjectives(evidenceList, contract);

  // 5. Candidate Generation (Deterministic + Groq with Diversity Selection)
  const candidatePools = await generateCandidatePools({
    contract,
    evidenceList,
    objectives,
    userCode: code,
  });

  // 6. Dual VM Execution: User Code vs Independent Reference Oracle
  const verifiedTests: VerifiedTestCase[] = [];
  let testCaseCounter = 1;
  let confirmedProof: ConfirmedDefectProof | undefined;

  for (const pool of candidatePools) {
    const { objective, evidence, validCandidates } = pool;

    for (let i = 0; i < validCandidates.length; i++) {
      const input = validCandidates[i];

      // Execute Reference Oracle (Ground Truth Expected Output)
      const oracleOutcome = executeReferenceOracle(input, contract);

      // Execute User Code (Actual Output with in-place mutation cloning)
      const userOutcome = executeUserCode(code, input, contract);

      // Compare Results & Classify Distinct Verdict
      const comparison = compareExecutionResults({
        userOutput: userOutcome.output,
        expectedOutput: oracleOutcome.expectedOutput,
        userStatus: userOutcome.status,
        oracleStatus: oracleOutcome.status,
        errorMessage: userOutcome.error,
      });

      const isFailing =
        comparison.verdict === 'WRONG_ANSWER' ||
        comparison.verdict === 'TIME_LIMIT_EXCEEDED' ||
        comparison.verdict === 'RUNTIME_ERROR';

      // 7. Minimal Counterexample Reduction & 3x Reproducibility Validation
      let minimalProof;
      let reproductionCount = 1;

      if (isFailing) {
        // Run 3x reproducibility validation to ensure deterministic non-flaky defect
        const reproResult = validateDefectReproducibility({
          userCode: code,
          failingInput: input,
          contract,
          runs: 3,
        });

        reproductionCount = reproResult.reproductionCount;

        if (reproResult.isReproducible) {
          minimalProof = await minimizeCounterexample({
            failingInput: input,
            contract,
            userCode: code,
          });

          if (!confirmedProof) {
            confirmedProof = {
              evidenceId: evidence.id,
              detectorId: evidence.detector,
              failingInput: input,
              expectedOutput: oracleOutcome.expectedOutput,
              actualOutput: userOutcome.output,
              minimizedInput: minimalProof?.isMinimized ? minimalProof.minimalInput : undefined,
              reproductionCount: 3,
              isReproducible: true,
            };
          }
        }
      }

      const normalizedInput = normalizeInputToString(
        minimalProof?.isMinimized ? minimalProof.minimalInput : input
      );

      // Separate Visible vs Internal Tests
      const isVisible = isFailing || i < 3;

      verifiedTests.push({
        id: `TC_${testCaseCounter++}`,
        evidenceId: evidence.id,
        objectiveId: objective.id,
        category: objective.category,
        purposeGroup: formatPurposeGroup(objective.detector),
        priority: objective.priority,
        objective: objective.objective,
        input: minimalProof?.isMinimized ? minimalProof.minimalInput : input,
        normalizedInput,
        expectedOutput: oracleOutcome.expectedOutput,
        userOutput: userOutcome.output,
        executionStatus: userOutcome.status,
        executionTimeMs: userOutcome.executionTimeMs,
        verdict: comparison.verdict,
        result: comparison.result,
        visibility: isVisible ? 'VISIBLE_TO_USER' : 'INTERNAL',
        reproductionCount,
        minimalProof,
        evidenceConnection: {
          detector: evidence.detector,
          lineStart: evidence.source.lineStart,
          snippet: evidence.source.snippet,
          whyItMatters: evidence.hypothesis,
        },
      });
    }
  }

  // 8. Sort Tests: Failing counterexamples first, then runtime/TLE, then passing
  verifiedTests.sort((a, b) => {
    const score = (t: VerifiedTestCase) =>
      t.verdict === 'WRONG_ANSWER'
        ? 4
        : t.verdict === 'TIME_LIMIT_EXCEEDED'
          ? 3
          : t.verdict === 'RUNTIME_ERROR'
            ? 2
            : 1;
    return score(b) - score(a);
  });

  // 9. Empirical Scaling & Complexity Benchmark
  const scalingBenchmark = evaluateEmpiricalScaling(code, contract);

  // 10. Failure Mechanism Coverage Calculation
  const failureMechanismCoverage = computeFailureMechanismCoverage({
    contract,
    verifiedTests,
  });

  // 11. Evidence Lifecycle Resolution with Calibrated Confidence
  evidenceList = resolveEvidenceLifecycles(evidenceList, verifiedTests);

  // 12. Two-Part Scoring: Code Health + Analysis Coverage
  const { dimensionScores, overallHealthScore } = calculateCodeHealthAndCoverage({
    evidenceList,
    activeDetectorsCount: staticSummary.activeDetectorsCount,
    totalRegisteredDetectorsCount: staticSummary.totalRegisteredDetectorsCount,
    testsCreatedCount: verifiedTests.length,
  });

  const defectsCount = verifiedTests.filter(t => t.result === 'EXPOSED_ISSUE').length;

  // 13. Rigorous Correctness Verdict Determination
  let correctnessVerdict: CorrectnessVerdict = 'NO_DEFECT_FOUND';
  if (oracleSupport === 'NO_RELIABLE_ORACLE') {
    correctnessVerdict = 'INCONCLUSIVE';
  } else if (defectsCount > 0 && confirmedProof?.isReproducible) {
    correctnessVerdict = 'DEFECT_CONFIRMED';
  } else if (defectsCount > 0 && !confirmedProof?.isReproducible) {
    correctnessVerdict = 'INCONCLUSIVE';
  }

  const assessment: SubmissionAssessment = {
    correctness: correctnessVerdict,
    performance: scalingBenchmark.performanceAssessment,
    coverage: failureMechanismCoverage.coveragePercent,
    oracleSupport,
    untestedMechanisms: failureMechanismCoverage.untestedMechanisms,
    defectProof: confirmedProof,
  };

  // 14. Primary Observation Narrative (Honest, Truthful Wording)
  let primaryObservation = generatePrimaryObservation({
    evidence: evidenceList,
    tests: verifiedTests,
    dimensionScores,
    detectedApproach: staticSummary.detectedApproach.name,
    overallHealthScore,
  });

  if (assessment.correctness === 'NO_DEFECT_FOUND') {
    if (assessment.performance === 'AT_RISK' || assessment.performance === 'LIKELY_LIMIT_EXCEEDED') {
      primaryObservation = `No correctness defect was found in the analyzed test space. However, observed runtime growth is consistent with ${scalingBenchmark.inferredComplexity}, which presents performance risk under maximum constraint scale (N <= 10^5).`;
    } else {
      primaryObservation = `No correctness defect was found in the analyzed test space across ${verifiedTests.length} targeted boundary, duplicate, and stress test scenarios (${failureMechanismCoverage.coveragePercent}% mechanisms explored).`;
    }
  } else if (assessment.correctness === 'INCONCLUSIVE') {
    primaryObservation = `Analysis is inconclusive: reliable ground truth oracle or execution environment guarantees are unavailable for this problem configuration.`;
  }

  const smallestCounterexample = verifiedTests.find(
    t => t.verdict === 'WRONG_ANSWER' || t.result === 'EXPOSED_ISSUE'
  );

  return {
    problem: {
      slug: contract.slug,
      title: contract.title,
      difficulty: contract.difficulty,
    },
    contract,
    detectedApproach: staticSummary.detectedApproach.name,
    approachDetails: staticSummary.detectedApproach,
    estimatedComplexity: scalingBenchmark.inferredComplexity || staticSummary.estimatedComplexity,
    analysisConfidence: evidenceList.length > 0 ? 'High' : 'Medium',
    overallHealthScore,
    analysisCoverage: failureMechanismCoverage.coveragePercent,
    oracleSupport,
    assessment,
    failureMechanismCoverage,
    scalingBenchmark,
    primaryObservation,
    smallestCounterexample,
    evidence: evidenceList,
    objectives,
    testCases: verifiedTests,
    dimensionScores,
    metrics: {
      evidenceCount: evidenceList.length,
      testsCreatedCount: verifiedTests.length,
      defectsExposedCount: defectsCount,
      coveragePercent: failureMechanismCoverage.coveragePercent,
    },
  };
}

function formatPurposeGroup(detector: string): string {
  switch (detector) {
    case 'BINARY_SEARCH_TERMINATION_RULE':
    case 'EMPTY_INPUT_GUARD_RULE':
    case 'SINGLE_ELEMENT_INDEX_RULE':
    case 'BOUNDARY_DETECTOR':
      return 'Boundary Validation';
    case 'IN_PLACE_MUTATION_INDEX_RULE':
    case 'MAP_KEY_COLLISION_RULE':
      return 'Duplicate & Mutation Handling';
    case 'QUADRATIC_OVER_LARGE_N_RULE':
    case 'SLIDING_WINDOW_RECOMPUTE_RULE':
    case 'INTEGER_OVERFLOW_RULE':
      return 'Constraint & Scalability Stress';
    default:
      return 'Targeted Verification';
  }
}
