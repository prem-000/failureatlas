/**
 * src/lib/intelligence/execution/oracle-executor.ts
 * Executes independent reference oracles to produce ground truth expected output.
 */

import type { ProblemContract } from '../contracts/problem-contract';
import { getReferenceOracle } from '../oracles/reference-oracles';

export interface OracleExecutionOutcome {
  expectedOutput: unknown;
  status: 'success' | 'unavailable' | 'error';
  error?: string;
}

export function executeReferenceOracle(
  input: Record<string, unknown>,
  contract: ProblemContract
): OracleExecutionOutcome {
  const oracleFn = getReferenceOracle(contract);

  if (!oracleFn) {
    return {
      expectedOutput: null,
      status: 'unavailable',
      error: `No deterministic reference oracle available for problem: ${contract.slug}`,
    };
  }

  try {
    // Deep clone input parameters before passing to oracle
    const clonedInput = JSON.parse(JSON.stringify(input));
    const result = oracleFn(clonedInput);

    return {
      expectedOutput: result,
      status: 'success',
    };
  } catch (err: unknown) {
    return {
      expectedOutput: null,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
