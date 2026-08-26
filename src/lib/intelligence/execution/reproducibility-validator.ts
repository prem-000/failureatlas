/**
 * src/lib/intelligence/execution/reproducibility-validator.ts
 * 3x Reproducibility Validation Engine (Phase 4).
 * Ensures every confirmed defect is deterministically reproducible before UI presentation.
 */

import type { ProblemContract } from '../contracts/problem-contract';
import { executeUserCode } from './user-executor';
import { executeReferenceOracle } from './oracle-executor';
import { compareExecutionResults } from './result-comparator';

export interface ReproducibilityResult {
  isReproducible: boolean;
  reproductionCount: number; // 0, 1, 2, or 3
  totalRuns: number;
  verdict: 'CONFIRMED' | 'FLAKY' | 'REJECTED';
}

export function validateDefectReproducibility(opts: {
  userCode: string;
  failingInput: Record<string, unknown>;
  contract: ProblemContract;
  runs?: number;
}): ReproducibilityResult {
  const { userCode, failingInput, contract, runs = 3 } = opts;

  let successfulReproductions = 0;

  for (let i = 0; i < runs; i++) {
    const oracleOutcome = executeReferenceOracle(failingInput, contract);
    const userOutcome = executeUserCode(userCode, failingInput, contract);

    const comparison = compareExecutionResults({
      userOutput: userOutcome.output,
      expectedOutput: oracleOutcome.expectedOutput,
      userStatus: userOutcome.status,
      oracleStatus: oracleOutcome.status,
      errorMessage: userOutcome.error,
    });

    if (
      comparison.verdict === 'WRONG_ANSWER' ||
      comparison.verdict === 'TIME_LIMIT_EXCEEDED' ||
      comparison.verdict === 'RUNTIME_ERROR'
    ) {
      successfulReproductions++;
    }
  }

  const isReproducible = successfulReproductions === runs;
  const verdict =
    successfulReproductions === runs
      ? 'CONFIRMED'
      : successfulReproductions > 0
        ? 'FLAKY'
        : 'REJECTED';

  return {
    isReproducible,
    reproductionCount: successfulReproductions,
    totalRuns: runs,
    verdict,
  };
}
