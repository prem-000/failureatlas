/**
 * executor.ts
 * Runs user code and reference code against a candidate input
 * inside a Node.js vm sandbox with a hard timeout.
 *
 * Only JavaScript/TypeScript solutions are supported at this layer.
 * Python is handled via a text-based simulation fallback.
 */

import vm from 'vm';

export interface ExecutionResult {
  output: string;    // JSON-serialized return value
  error?: string;    // runtime error message if thrown
  timedOut?: boolean;
}

const TIMEOUT_MS = 1500;

/**
 * Wraps user code in a self-calling function that passes the input,
 * runs it in a vm sandbox, and returns the serialized result.
 *
 * Expects the user code to define a function matching the LeetCode
 * signature (e.g. `function twoSum(nums, target) {...}`).
 *
 * We extract the function name heuristically and call it with the input.
 */
export function executeJS(code: string, input: unknown): ExecutionResult {
  try {
    // Extract function name from common patterns:
    // "function twoSum(...)" / "var twoSum = function(...)" / "const twoSum = (...)"
    const fnMatch =
      code.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/) ||
      code.match(/(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:function|\()/);

    const fnName = fnMatch?.[1] ?? 'solution';

    // Build the invocation expression from input shape
    let callExpr: string;
    if (Array.isArray(input)) {
      callExpr = `${fnName}(${input.map(x => JSON.stringify(x)).join(', ')})`;
    } else if (input !== null && typeof input === 'object') {
      // e.g. { nums: [1,2], target: 3 } → fn(nums, target)
      const entries = Object.entries(input as Record<string, unknown>);
      callExpr = `${fnName}(${entries.map(([, v]) => JSON.stringify(v)).join(', ')})`;
    } else {
      callExpr = `${fnName}(${JSON.stringify(input)})`;
    }

    const script = new vm.Script(`
      (function() {
        ${code}
        return JSON.stringify(${callExpr});
      })()
    `);

    const ctx = vm.createContext({
      // Provide safe stdlib subset
      Math,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Map,
      Set,
      parseInt,
      parseFloat,
      isNaN,
      Infinity,
      undefined,
    });

    const raw = script.runInContext(ctx, { timeout: TIMEOUT_MS });
    return { output: typeof raw === 'string' ? raw : JSON.stringify(raw) };
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message?.includes('Script execution timed out')) {
        return { output: '', timedOut: true, error: 'Execution timed out' };
      }
      return { output: '', error: err.message };
    }
    return { output: '', error: String(err) };
  }
}

/**
 * High-level: run both reference and user code, return comparison.
 */
export interface DiffResult {
  input: unknown;
  expected: string;
  actual: string;
  match: boolean;
  error?: string;
  timedOut?: boolean;
}

export function differentialTest(
  userCode: string,
  referenceCode: string,
  input: unknown
): DiffResult {
  const refResult = executeJS(referenceCode, input);
  const userResult = executeJS(userCode, input);

  const expected = refResult.output;
  const actual = userResult.output;

  // Normalize JSON before comparing (handles [1,2] vs [1, 2] etc.)
  let match = false;
  try {
    match = JSON.stringify(JSON.parse(expected)) === JSON.stringify(JSON.parse(actual));
  } catch {
    match = expected === actual;
  }

  return {
    input,
    expected,
    actual,
    match,
    error: userResult.error || refResult.error,
    timedOut: userResult.timedOut,
  };
}
