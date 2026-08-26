/**
 * src/lib/intelligence/execution/result-comparator.ts
 * Deep equality comparator and distinct verdict generator (Phase 2).
 * Separates correctness failures (WRONG_ANSWER), performance failures (TIME_LIMIT_EXCEEDED),
 * runtime failures (RUNTIME_ERROR), and INCONCLUSIVE infrastructure results.
 */

import type { ExecutionVerdict } from '../types';

export interface ComparisonVerdict {
  match: boolean;
  verdict: ExecutionVerdict;
  result: 'PASSED' | 'EXPOSED_ISSUE' | 'INCONCLUSIVE'; // Backwards compatibility
  details: string;
}

export function compareExecutionResults(opts: {
  userOutput: unknown;
  expectedOutput: unknown;
  userStatus: 'success' | 'runtime_error' | 'timeout';
  oracleStatus: 'success' | 'unavailable' | 'error';
  errorMessage?: string;
}): ComparisonVerdict {
  const { userOutput, expectedOutput, userStatus, oracleStatus, errorMessage } = opts;

  if (oracleStatus !== 'success') {
    return {
      match: false,
      verdict: 'INCONCLUSIVE',
      result: 'INCONCLUSIVE',
      details: 'Reference oracle evaluation was unavailable or encountered an error.',
    };
  }

  if (userStatus === 'timeout') {
    return {
      match: false,
      verdict: 'TIME_LIMIT_EXCEEDED',
      result: 'EXPOSED_ISSUE',
      details: 'Execution exceeded the permitted time limit (>1500ms).',
    };
  }

  if (userStatus === 'runtime_error') {
    return {
      match: false,
      verdict: 'RUNTIME_ERROR',
      result: 'EXPOSED_ISSUE',
      details: `User code threw a runtime exception: ${errorMessage || 'Unknown exception'}`,
    };
  }

  const match = isDeepEqual(userOutput, expectedOutput);

  return {
    match,
    verdict: match ? 'PASSED' : 'WRONG_ANSWER',
    result: match ? 'PASSED' : 'EXPOSED_ISSUE',
    details: match
      ? 'User output matches the reference oracle ground truth.'
      : `Output mismatch. Expected: ${JSON.stringify(expectedOutput)}, Actual: ${JSON.stringify(userOutput)}`,
  };
}

export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  // Numbers (with floating point tolerance)
  if (typeof a === 'number' && typeof b === 'number') {
    if (isNaN(a) && isNaN(b)) return true;
    return Math.abs(a - b) < 1e-6;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Handle plain objects
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!isDeepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }
    return true;
  }

  // String / JSON fallback comparison
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return String(a) === String(b);
  }
}
