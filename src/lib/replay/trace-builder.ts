/**
 * trace-builder.ts
 * Builds a human-readable execution trace for a failing input.
 *
 * Uses static regex-based code analysis to identify:
 * - Loop constructs and their bounds when applied to the failing input
 * - Conditional branches
 * - Return statements
 * - Variable assignments
 *
 * Produces ExecutionStep[] that the UI renders as a step-by-step replay.
 */

import type { ExecutionStep } from '@/types';

// ─── Code analysis helpers ────────────────────────────────────────────────────

interface CodePattern {
  type: 'loop' | 'conditional' | 'return' | 'assignment' | 'function-call';
  line: string;
  lineNumber: number;
}

function extractPatterns(code: string): CodePattern[] {
  const lines = code.split('\n');
  const patterns: CodePattern[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('*')) continue;

    if (/\bfor\b|\bwhile\b/.test(line)) {
      patterns.push({ type: 'loop', line, lineNumber: i + 1 });
    } else if (/\bif\b|\belse\b/.test(line)) {
      patterns.push({ type: 'conditional', line, lineNumber: i + 1 });
    } else if (/\breturn\b/.test(line)) {
      patterns.push({ type: 'return', line, lineNumber: i + 1 });
    } else if (/(?:const|let|var)\s+\w+\s*=/.test(line) || /\w+\s*[+-]?=\s*/.test(line)) {
      patterns.push({ type: 'assignment', line, lineNumber: i + 1 });
    }
  }

  return patterns;
}

// ─── Loop bound analyzer ──────────────────────────────────────────────────────

/**
 * Given a loop line like `for (let i = 0; i < nums.length; i++)`,
 * return a description of what happens with the actual input.
 */
function analyzeLoop(
  loopLine: string,
  input: unknown
): { iterations: number; description: string } | null {
  const inputArr = Array.isArray(input)
    ? input
    : input !== null && typeof input === 'object' && 'nums' in (input as object)
    ? (input as { nums: unknown[] }).nums
    : null;

  if (!inputArr) return null;
  const n = inputArr.length;

  // for (let i = 0; i < n - 1; i++) → n-1 iterations
  if (/i\s*<\s*(?:nums|arr|n|s)\.length\s*-\s*1/.test(loopLine)) {
    const iters = Math.max(0, n - 1);
    return {
      iterations: iters,
      description: `Loop bound: \`length - 1 = ${n} - 1 = ${n - 1}\`. Executes **${iters}** time${iters === 1 ? '' : 's'}.`,
    };
  }
  // for (let i = 0; i < n; i++) → n iterations
  if (/i\s*<\s*(?:nums|arr|n|s)\.length/.test(loopLine)) {
    return {
      iterations: n,
      description: `Loop bound: \`length = ${n}\`. Executes **${n}** time${n === 1 ? '' : 's'}.`,
    };
  }
  // while (left < right)
  if (/while\s*\(.*</.test(loopLine)) {
    return {
      iterations: Math.max(0, n - 1),
      description: `While loop with two pointers. With ${n} element${n === 1 ? '' : 's'}, may execute **${Math.max(0, n - 1)}** iteration${n === 2 ? '' : 's'}.`,
    };
  }

  return null;
}

// ─── Root cause inference ─────────────────────────────────────────────────────

interface InferredRootCause {
  type: string;
  label: string;
  confidence: number;
  evidenceSummary: string;
}

export function inferRootCause(
  code: string,
  input: unknown,
  expected: string,
  actual: string
): InferredRootCause {
  const inputArr = Array.isArray(input)
    ? input
    : input !== null && typeof input === 'object' && 'nums' in (input as object)
    ? (input as { nums: unknown[] }).nums
    : null;

  const n = inputArr?.length ?? 0;

  // Off-by-one: loop uses length-1 and n=1 → 0 iterations
  if (
    n === 1 &&
    /i\s*<\s*(?:nums|arr|n|s)\.length\s*-\s*1/.test(code) &&
    actual !== expected
  ) {
    return {
      type: 'boundary-condition-error',
      label: 'Off-by-one Loop Bound',
      confidence: 92,
      evidenceSummary: `Loop uses \`length - 1 = 0\` → executes 0 times for a single-element input, so the initial value is returned unchanged.`,
    };
  }

  // Empty array handling
  if (n === 0 && actual !== expected) {
    return {
      type: 'boundary-condition-error',
      label: 'Missing Empty Input Guard',
      confidence: 88,
      evidenceSummary: `No guard for empty input; the algorithm assumes at least one element exists.`,
    };
  }

  // Overflow / large values
  if (
    inputArr &&
    inputArr.some(x => typeof x === 'number' && Math.abs(x) > 1e9) &&
    actual !== expected
  ) {
    return {
      type: 'implementation-detail-error',
      label: 'Integer Overflow / Large Value',
      confidence: 75,
      evidenceSummary: `Input contains extreme values (>10⁹). Integer arithmetic may overflow in intermediate calculations.`,
    };
  }

  // Duplicate values
  if (
    inputArr &&
    new Set(inputArr).size < inputArr.length &&
    actual !== expected
  ) {
    return {
      type: 'boundary-condition-error',
      label: 'Duplicate Value Handling',
      confidence: 70,
      evidenceSummary: `Input contains duplicate values. The algorithm may not handle repeated elements correctly.`,
    };
  }

  // Generic fallback
  return {
    type: 'implementation-detail-error',
    label: 'Logic Error',
    confidence: 60,
    evidenceSummary: `The algorithm produces \`${actual}\` instead of \`${expected}\` for this input. Review the core logic flow.`,
  };
}

// ─── Main trace builder ───────────────────────────────────────────────────────

export function buildExecutionTrace(
  code: string,
  input: unknown,
  expected: string,
  actual: string
): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const patterns = extractPatterns(code);
  let stepNum = 1;

  const inputStr = JSON.stringify(input);
  const inputArr = Array.isArray(input)
    ? input
    : input !== null && typeof input === 'object' && 'nums' in (input as object)
    ? (input as { nums: unknown[] }).nums
    : null;

  // Step 1: Input setup
  steps.push({
    step: stepNum++,
    description: `**Input received**: \`${inputStr}\``,
    variableState: {
      input: inputStr,
      ...(inputArr ? { 'length': String(inputArr.length) } : {}),
    },
    significance: 'normal',
  });

  // Step 2: Analyze each extracted code pattern
  for (const pattern of patterns.slice(0, 6)) { // cap at 6 patterns for readability
    if (pattern.type === 'loop') {
      const loopInfo = analyzeLoop(pattern.line, input);
      if (loopInfo) {
        steps.push({
          step: stepNum++,
          description: loopInfo.description,
          codeSnippet: pattern.line,
          variableState: { iterations: String(loopInfo.iterations) },
          significance: loopInfo.iterations === 0 ? 'critical' : 'normal',
        });

        if (loopInfo.iterations === 0) {
          steps.push({
            step: stepNum++,
            description: `⚠️ **Loop never executes.** With 0 iterations, variables that should be updated by the loop retain their initial values.`,
            significance: 'bug',
          });
        }
      } else {
        steps.push({
          step: stepNum++,
          description: `Entering loop: \`${pattern.line}\``,
          codeSnippet: pattern.line,
          significance: 'normal',
        });
      }
    } else if (pattern.type === 'conditional') {
      steps.push({
        step: stepNum++,
        description: `Evaluating condition: \`${pattern.line}\``,
        codeSnippet: pattern.line,
        significance: 'normal',
      });
    } else if (pattern.type === 'return') {
      steps.push({
        step: stepNum++,
        description: `Return statement reached: \`${pattern.line}\``,
        codeSnippet: pattern.line,
        significance: 'normal',
      });
    }
  }

  // Final step: output comparison
  const matches = expected === actual;
  steps.push({
    step: stepNum++,
    description: matches
      ? `Output matches expected: \`${actual}\``
      : `**Output mismatch detected.**\n\nExpected \`${expected}\` but got \`${actual}\`.`,
    variableState: {
      expected,
      actual,
      verdict: matches ? 'PASS' : 'FAIL',
    },
    significance: matches ? 'normal' : 'bug',
  });

  return steps;
}
