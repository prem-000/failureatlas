/**
 * src/lib/intelligence/execution/user-executor.ts
 * Executes user solution inside a safe Node.js VM sandbox.
 * Supports both return_value and in_place mutation evaluation.
 */

import vm from 'vm';
import type { ProblemContract } from '../contracts/problem-contract';

export interface UserExecutionOutcome {
  output: unknown;
  status: 'success' | 'runtime_error' | 'timeout';
  error?: string;
  executionTimeMs: number;
}

const TIMEOUT_MS = 1500;

export function executeUserCode(
  userCode: string,
  input: Record<string, unknown>,
  contract: ProblemContract,
  customTimeoutMs: number = TIMEOUT_MS
): UserExecutionOutcome {
  const startTime = Date.now();

  try {
    const fnName = contract.functionName || 'solution';
    const isInPlace = contract.executionMode === 'in_place';
    const targetParamName = contract.inPlaceTargetParam || contract.parameters[0]?.name || 'nums';

    // Prepare argument list from contract parameters
    const orderedArgs = contract.parameters.map(p => input[p.name]);

    // Construct VM script with deep cloned arguments
    const runnerScript = `
      (function() {
        ${userCode}

        // Deep clone arguments to protect isolation
        const args = JSON.parse(${JSON.stringify(JSON.stringify(orderedArgs))});
        
        let targetParamIndex = 0;
        ${contract.parameters.map((p, idx) => `if ("${p.name}" === "${targetParamName}") targetParamIndex = ${idx};`).join('\n')}

        // Resolve function reference
        let fn = null;
        if (typeof ${fnName} === 'function') {
          fn = ${fnName};
        } else if (typeof solution === 'function') {
          fn = solution;
        } else {
          // Fallback search for any defined function
          const candidates = Object.keys(this).filter(k => typeof this[k] === 'function');
          if (candidates.length > 0) fn = this[candidates[0]];
        }

        if (!fn) {
          throw new Error("Function '" + "${fnName}" + "' not found in submitted code.");
        }

        const res = fn.apply(null, args);

        ${
          isInPlace
            ? `// In-place mode: capture mutated target parameter
               return JSON.stringify(args[targetParamIndex]);`
            : `// Return value mode: return JSON serialized result
               return JSON.stringify(res);`
        }
      })()
    `;

    const script = new vm.Script(runnerScript);
    const ctx = vm.createContext({
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

    const rawResult = script.runInContext(ctx, { timeout: customTimeoutMs });
    const executionTimeMs = Date.now() - startTime;

    let parsedOutput: unknown;
    try {
      parsedOutput = JSON.parse(rawResult);
    } catch {
      parsedOutput = rawResult;
    }

    return {
      output: parsedOutput,
      status: 'success',
      executionTimeMs,
    };
  } catch (err: unknown) {
    const executionTimeMs = Date.now() - startTime;
    if (err instanceof Error) {
      if (err.message?.includes('Script execution timed out')) {
        return {
          output: null,
          status: 'timeout',
          error: `Execution timed out (> ${TIMEOUT_MS}ms)`,
          executionTimeMs,
        };
      }
      return {
        output: null,
        status: 'runtime_error',
        error: err.message,
        executionTimeMs,
      };
    }
    return {
      output: null,
      status: 'runtime_error',
      error: String(err),
      executionTimeMs,
    };
  }
}
