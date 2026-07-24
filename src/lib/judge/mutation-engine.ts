/**
 * src/lib/judge/mutation-engine.ts
 *
 * Deterministic mutation operators that strengthen weak test cases.
 * NO LLM — pure data transformation.
 *
 * Applied conditionally: only when coverageGain for that concept is < 5%.
 * High-coverage categories skip mutation to avoid redundancy.
 */

import type { PraxisJudgeCase } from '@/types';

// ─── Mutation Operator Set ─────────────────────────────────────────────────────

export type MutationOperator =
  | 'Reverse'
  | 'Duplicate Values'
  | 'Overflow Mutation'
  | 'Adversarial Ordering'
  | 'Alternating Pattern'
  | 'Maximum Constraints'
  | 'Sparse Distribution'
  | 'Dense Distribution';

// ─── Coverage threshold — below this, mutation is applied ─────────────────────

const MUTATION_THRESHOLD = 0.05; // 5%

// ─── Helper parsers ───────────────────────────────────────────────────────────

function tryParseArray(input: string): number[] | null {
  const match = input.match(/\[([^\]]*)\]/);
  if (!match) return null;
  const parts = match[1].split(',').map(s => s.trim()).filter(Boolean);
  const nums = parts.map(Number).filter(n => !isNaN(n));
  return nums.length === parts.length ? nums : null;
}

function replaceFirstArray(input: string, newArr: number[]): string {
  return input.replace(/\[([^\]]*)\]/, `[${newArr.join(', ')}]`);
}

// ─── Individual Mutation Operators ────────────────────────────────────────────

function mutateReverse(test: PraxisJudgeCase): PraxisJudgeCase {
  const arr = tryParseArray(test.input);
  if (!arr || arr.length < 2) return test;
  const reversed = [...arr].reverse();
  return {
    ...test,
    input: replaceFirstArray(test.input, reversed),
    mutation: 'Reverse',
    reason: `${test.reason} [MUTATED: reversed array to break assumptions about input ordering]`,
  };
}

function mutateDuplicateValues(test: PraxisJudgeCase): PraxisJudgeCase {
  const arr = tryParseArray(test.input);
  if (!arr || arr.length < 2) return test;
  // Replace every other element with the most common value
  const mid = arr[Math.floor(arr.length / 2)];
  const duped = arr.map((v, i) => (i % 2 === 0 ? mid : v));
  return {
    ...test,
    input: replaceFirstArray(test.input, duped),
    mutation: 'Duplicate Values',
    reason: `${test.reason} [MUTATED: injected duplicate values to stress deduplication logic]`,
  };
}

function mutateOverflow(test: PraxisJudgeCase): PraxisJudgeCase {
  const arr = tryParseArray(test.input);
  if (!arr || arr.length === 0) return test;
  const INT_MAX = 2147483647;
  const INT_MIN = -2147483648;
  const overflowed = arr.map((_, i) => (i % 2 === 0 ? INT_MAX : INT_MIN));
  return {
    ...test,
    input: replaceFirstArray(test.input, overflowed),
    mutation: 'Overflow Mutation',
    constraintCategory: 'Overflow',
    reason: `${test.reason} [MUTATED: applied overflow values INT_MAX/INT_MIN to stress 32-bit arithmetic]`,
  };
}

function mutateAdversarialOrdering(test: PraxisJudgeCase): PraxisJudgeCase {
  const arr = tryParseArray(test.input);
  if (!arr || arr.length < 3) return test;
  const sorted = [...arr].sort((a, b) => b - a); // descending = adversarial for most greedy
  return {
    ...test,
    input: replaceFirstArray(test.input, sorted),
    mutation: 'Adversarial Ordering',
    reason: `${test.reason} [MUTATED: descending order to break greedy assumptions]`,
  };
}

function mutateAlternatingPattern(test: PraxisJudgeCase): PraxisJudgeCase {
  const arr = tryParseArray(test.input);
  if (!arr || arr.length < 2) return test;
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const alternating = arr.map((_, i) => (i % 2 === 0 ? max : min));
  return {
    ...test,
    input: replaceFirstArray(test.input, alternating),
    mutation: 'Alternating Pattern',
    reason: `${test.reason} [MUTATED: alternating max/min pattern to stress window/pointer logic]`,
  };
}

function mutateMaxConstraints(test: PraxisJudgeCase): PraxisJudgeCase {
  const arr = tryParseArray(test.input);
  if (!arr || arr.length === 0) return test;
  // Scale to 10^5 elements with adversarial values
  const targetLen = 100000;
  const base = arr[0] || 1;
  const maxInput = Array.from({ length: Math.min(targetLen, 20) }, (_, i) =>
    i % 2 === 0 ? base : -base
  );
  return {
    ...test,
    input: `N = ${targetLen}, sample: [${maxInput.slice(0, 8).join(', ')}, ... ×${targetLen}]`,
    mutation: 'Maximum Constraints',
    constraintCategory: 'Maximum',
    reason: `${test.reason} [MUTATED: scaled to maximum constraint size to stress complexity]`,
  };
}

function mutateSparse(test: PraxisJudgeCase): PraxisJudgeCase {
  const arr = tryParseArray(test.input);
  if (!arr || arr.length < 4) return test;
  // Keep only every 3rd element non-zero
  const sparse = arr.map((v, i) => (i % 3 === 0 ? v : 0));
  return {
    ...test,
    input: replaceFirstArray(test.input, sparse),
    mutation: 'Sparse Distribution',
    reason: `${test.reason} [MUTATED: sparse non-zero values to stress empty/zero handling]`,
  };
}

function mutateDense(test: PraxisJudgeCase): PraxisJudgeCase {
  const arr = tryParseArray(test.input);
  if (!arr || arr.length < 2) return test;
  const mode = arr[0];
  const dense = arr.map(() => mode); // all same value
  return {
    ...test,
    input: replaceFirstArray(test.input, dense),
    mutation: 'Dense Distribution',
    reason: `${test.reason} [MUTATED: all-same-value array to stress duplicate handling]`,
  };
}

// ─── Mutation Dispatcher ──────────────────────────────────────────────────────

const MUTATION_FN: Record<MutationOperator, (t: PraxisJudgeCase) => PraxisJudgeCase> = {
  'Reverse': mutateReverse,
  'Duplicate Values': mutateDuplicateValues,
  'Overflow Mutation': mutateOverflow,
  'Adversarial Ordering': mutateAdversarialOrdering,
  'Alternating Pattern': mutateAlternatingPattern,
  'Maximum Constraints': mutateMaxConstraints,
  'Sparse Distribution': mutateSparse,
  'Dense Distribution': mutateDense,
};

// ─── Coverage analysis ─────────────────────────────────────────────────────────

function computeCategoryFrequency(tests: PraxisJudgeCase[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const t of tests) {
    const cat = t.category || t.constraintCategory || 'Boundary';
    freq[cat] = (freq[cat] || 0) + 1;
  }
  return freq;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Applies mutations to strengthen underrepresented categories.
 * Only mutates tests in categories with low coverage.
 */
export function applyMutations(
  tests: PraxisJudgeCase[],
  preferredMutations: MutationOperator[],
  maxMutations: number = 5
): PraxisJudgeCase[] {
  if (tests.length === 0) return tests;

  const freq = computeCategoryFrequency(tests);
  const total = tests.length;
  const result = [...tests];
  let mutationsApplied = 0;

  for (let i = 0; i < tests.length && mutationsApplied < maxMutations; i++) {
    const test = tests[i];
    const cat = test.category || test.constraintCategory || 'Boundary';
    const coverage = (freq[cat] || 0) / total;

    // Only mutate if this category is under-represented
    if (coverage > MUTATION_THRESHOLD) continue;
    // Skip if already mutated
    if (test.mutation && test.mutation !== 'None') continue;

    // Apply first preferred mutation that works
    for (const op of preferredMutations) {
      const fn = MUTATION_FN[op];
      if (!fn) continue;
      const mutated = fn(test);
      if (mutated !== test) {
        result[i] = { ...mutated, judgeId: `${test.judgeId}-M` };
        freq[cat] = (freq[cat] || 0) + 1;
        mutationsApplied++;
        break;
      }
    }
  }

  return result;
}
