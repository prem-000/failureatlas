/**
 * src/lib/intelligence/generation/counterexample-minimizer.ts
 * Minimal Counterexample Search & Input Shrinker.
 * Reduces failing inputs to their minimal reproducible counterexample while preserving the failure verdict.
 */

import type { ProblemContract } from '../contracts/problem-contract';
import type { MinimalProof } from '../types';
import { executeUserCode } from '../execution/user-executor';
import { executeReferenceOracle } from '../execution/oracle-executor';
import { compareExecutionResults } from '../execution/result-comparator';

export async function minimizeCounterexample(opts: {
  failingInput: Record<string, unknown>;
  contract: ProblemContract;
  userCode: string;
}): Promise<MinimalProof> {
  const { failingInput, contract, userCode } = opts;

  let currentInput = JSON.parse(JSON.stringify(failingInput));
  let steps = 0;
  let hasReduced = false;

  // Test if an input variation preserves the failure
  const preservesFailure = (candidateInput: Record<string, unknown>): boolean => {
    try {
      const userRes = executeUserCode(userCode, candidateInput, contract);
      const oracleRes = executeReferenceOracle(candidateInput, contract);
      const comp = compareExecutionResults({
        userOutput: userRes.output,
        expectedOutput: oracleRes.expectedOutput,
        userStatus: userRes.status,
        oracleStatus: oracleRes.status,
      });
      return comp.result === 'EXPOSED_ISSUE' || comp.verdict === 'WRONG_ANSWER' || comp.verdict === 'RUNTIME_ERROR';
    } catch {
      return false;
    }
  };

  // 1. Array Element Minimization
  for (const param of contract.parameters) {
    if (param.type === 'number[]' || param.type.endsWith('[]')) {
      const arr = currentInput[param.name];
      if (!Array.isArray(arr) || arr.length <= 1) continue;

      // A. Try removing elements one-by-one from left/right/middle
      let i = 0;
      while (i < arr.length && arr.length > 1) {
        const testArr = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const candidateInput = { ...currentInput, [param.name]: testArr };

        if (preservesFailure(candidateInput)) {
          arr.splice(i, 1);
          currentInput[param.name] = arr;
          steps++;
          hasReduced = true;
        } else {
          i++;
        }
      }

      // B. Try shrinking numerical values toward 0, 1, -1
      for (let j = 0; j < arr.length; j++) {
        if (typeof arr[j] === 'number') {
          const originalVal = arr[j];
          for (const targetVal of [0, 1, -1]) {
            if (originalVal !== targetVal) {
              const testArr = [...arr];
              testArr[j] = targetVal;
              const candidateInput = { ...currentInput, [param.name]: testArr };
              if (preservesFailure(candidateInput)) {
                arr[j] = targetVal;
                currentInput[param.name] = arr;
                steps++;
                hasReduced = true;
                break;
              }
            }
          }
        }
      }
    }

    // 2. String Minimization
    if (param.type === 'string') {
      let str = currentInput[param.name];
      if (typeof str === 'string' && str.length > 2) {
        let i = 0;
        while (i < str.length && str.length > 1) {
          const testStr = str.slice(0, i) + str.slice(i + 1);
          const candidateInput = { ...currentInput, [param.name]: testStr };
          if (preservesFailure(candidateInput)) {
            str = testStr;
            currentInput[param.name] = str;
            steps++;
            hasReduced = true;
          } else {
            i++;
          }
        }
      }
    }
  }

  return {
    originalInput: failingInput,
    minimalInput: currentInput,
    reductionSteps: steps,
    isMinimized: hasReduced,
  };
}
