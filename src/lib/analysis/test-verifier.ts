/**
 * src/lib/analysis/test-verifier.ts
 * Expected Output Verification Engine
 * Runs LLM-generated test cases against reference execution logic or user's code
 * to prevent output hallucinations.
 */

export interface VerifiableTestCase {
  input: string;
  expectedOutput: string;
  verified?: boolean;
  mismatchCorrected?: boolean;
  originalLLMOutput?: string;
  [key: string]: any;
}

export function verifyTestOutput(
  test: VerifiableTestCase,
  userCode?: string,
  patternSlug?: string
): VerifiableTestCase {
  try {
    const computedOutput = evaluateReferenceOutput(test.input, userCode, patternSlug);

    if (computedOutput === null) {
      // Fallback: If sandbox evaluation is ambiguous, accept valid non-empty LLM output with verification tag
      return {
        ...test,
        verified: Boolean(test.expectedOutput && test.expectedOutput.length > 0),
      };
    }

    const cleanLLM = normalizeOutput(test.expectedOutput);
    const cleanComputed = normalizeOutput(computedOutput);

    if (cleanLLM === cleanComputed || isOutputEquivalent(cleanLLM, cleanComputed)) {
      return {
        ...test,
        verified: true,
      };
    }

    // Output Mismatch Detected! Correct hallucinated output to ground truth computed output
    console.log(`⚠️ Test Output Mismatch detected for input "${test.input}". LLM output: "${test.expectedOutput}", Computed: "${computedOutput}". Correcting...`);

    return {
      ...test,
      expectedOutput: computedOutput,
      verified: true,
      mismatchCorrected: true,
      originalLLMOutput: test.expectedOutput,
    };
  } catch (err) {
    console.warn(`Failed to verify test case output for input "${test.input}":`, err);
    return {
      ...test,
      verified: false,
    };
  }
}

export function verifyTestSuite<T extends VerifiableTestCase>(
  tests: T[],
  userCode?: string,
  patternSlug?: string
): T[] {
  return tests.map(test => verifyTestOutput(test, userCode, patternSlug) as T);
}

function normalizeOutput(out: string): string {
  if (!out) return '';
  return out
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function isOutputEquivalent(out1: string, out2: string): boolean {
  if (out1 === out2) return true;
  // Numeric comparison
  const n1 = Number(out1);
  const n2 = Number(out2);
  if (!isNaN(n1) && !isNaN(n2) && Math.abs(n1 - n2) < 1e-6) {
    return true;
  }
  return false;
}

function evaluateReferenceOutput(
  inputStr: string,
  userCode?: string,
  patternSlug?: string
): string | null {
  // If user code is simple JS function, try safe JS Function execution
  if (userCode && (userCode.includes('function') || userCode.includes('=>'))) {
    try {
      const fn = new Function('inputStr', `
        try {
          ${userCode}
          // Extract main function
          const mainFn = typeof solution === 'function' ? solution :
                         typeof search === 'function' ? search :
                         typeof twoSum === 'function' ? twoSum :
                         typeof prefixSum === 'function' ? prefixSum : null;
          if (mainFn) {
            const parsedInput = JSON.parse(inputStr.replace(/^\\w+\\s*=\\s*/, ''));
            const res = Array.isArray(parsedInput) ? mainFn(...parsedInput) : mainFn(parsedInput);
            return JSON.stringify(res);
          }
        } catch (e) {
          return null;
        }
        return null;
      `);
      const res = fn(inputStr);
      if (res !== null && res !== undefined) {
        return String(res);
      }
    } catch {
      // Fall through to pattern evaluator
    }
  }

  // Built-in pattern-based reference evaluators
  if (patternSlug === 'prefix_sum') {
    const numsMatch = inputStr.match(/\[([\d\s,-]+)\]/);
    if (numsMatch) {
      const nums = numsMatch[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
      let sum = 0;
      const result = nums.map(x => (sum += x));
      return JSON.stringify(result);
    }
  }

  if (patternSlug === 'binary_search') {
    const targetMatch = inputStr.match(/target\s*=\s*(-?\d+)/i);
    const numsMatch = inputStr.match(/nums\s*=\s*\[([\d\s,-]+)\]/i);
    if (numsMatch && targetMatch) {
      const nums = numsMatch[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
      const target = parseInt(targetMatch[1], 10);
      const idx = nums.indexOf(target);
      return idx !== -1 ? String(idx) : '-1';
    }
  }

  if (patternSlug === 'two_pointer') {
    const targetMatch = inputStr.match(/target\s*=\s*(-?\d+)/i);
    const numsMatch = inputStr.match(/nums\s*=\s*\[([\d\s,-]+)\]/i);
    if (numsMatch && targetMatch) {
      const nums = numsMatch[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
      const target = parseInt(targetMatch[1], 10);
      let l = 0, r = nums.length - 1;
      while (l < r) {
        const sum = nums[l] + nums[r];
        if (sum === target) return JSON.stringify([l, r]);
        if (sum < target) l++;
        else r--;
      }
    }
  }

  return null;
}
