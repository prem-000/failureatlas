/**
 * input-generator.ts
 * Generates randomized candidate inputs from problem constraints.
 * Every call with a different seed produces different candidates.
 * Never relies on fixed, hardcoded edge cases.
 */

export type ProblemType =
  | 'array'
  | 'string'
  | 'two-array'
  | 'matrix'
  | 'number'
  | 'two-number'
  | 'array-target';

export interface GeneratorConfig {
  problemType: ProblemType;
  maxN: number;           // max array/string length from constraints
  minVal: number;         // minimum value
  maxVal: number;         // maximum value
  seed: number;
  candidateCount?: number; // default 3000
}

export interface CandidateInput {
  raw: unknown;           // the actual JS value
  label: string;          // e.g. "nums" or "s"
  serialized: string;     // JSON-like string for display
}

// ─── Seeded LCG PRNG ─────────────────────────────────────────────────────────
// A simple seeded Linear Congruential Generator so that runs are reproducible
// per seed but different across seeds.
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  /** Integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [0, 1) */
  float(): number {
    return this.next();
  }
}

// ─── Infer problem type from topics & slug ────────────────────────────────────
export function inferProblemType(
  topics: string[],
  slug: string
): ProblemType {
  const t = topics.map(x => x.toLowerCase()).join(' ');
  const s = slug.toLowerCase();

  if (t.includes('string') || s.includes('string') || s.includes('palindrome') || s.includes('anagram')) {
    return 'string';
  }
  if (t.includes('matrix') || t.includes('grid') || s.includes('matrix') || s.includes('grid')) {
    return 'matrix';
  }
  if (s.includes('two-sum') || s.includes('target') || t.includes('hash')) {
    return 'array-target';
  }
  if (t.includes('two pointer') || t.includes('merge') || s.includes('merge')) {
    return 'two-array';
  }
  return 'array';
}

// ─── Array generators ─────────────────────────────────────────────────────────
function genRandomArray(rng: SeededRandom, n: number, min: number, max: number): number[] {
  return Array.from({ length: n }, () => rng.int(min, max));
}

function genSortedArray(rng: SeededRandom, n: number, min: number, max: number): number[] {
  return genRandomArray(rng, n, min, max).sort((a, b) => a - b);
}

function genReverseSorted(rng: SeededRandom, n: number, min: number, max: number): number[] {
  return genRandomArray(rng, n, min, max).sort((a, b) => b - a);
}

function genAllSame(rng: SeededRandom, n: number, min: number, max: number): number[] {
  const val = rng.int(min, max);
  return Array(n).fill(val);
}

function genWithDuplicates(rng: SeededRandom, n: number, min: number, max: number): number[] {
  // Use a small value range to force duplicates
  const range = Math.max(2, Math.floor(n / 3));
  return Array.from({ length: n }, () => rng.int(min, min + range));
}

// ─── String generators ────────────────────────────────────────────────────────
const CHARS = 'abcdefghijklmnopqrstuvwxyz';

function genRandomString(rng: SeededRandom, len: number): string {
  return Array.from({ length: len }, () => CHARS[rng.int(0, 25)]).join('');
}

function genPalindrome(rng: SeededRandom, len: number): string {
  const half = Array.from({ length: Math.ceil(len / 2) }, () => CHARS[rng.int(0, 25)]).join('');
  const s = half + half.split('').reverse().join('');
  return s.slice(0, len);
}

function genAllSameChar(rng: SeededRandom, len: number): string {
  const ch = CHARS[rng.int(0, 25)];
  return ch.repeat(len);
}

// ─── Candidate builder ────────────────────────────────────────────────────────
export function generateCandidates(config: GeneratorConfig): CandidateInput[] {
  const {
    problemType,
    maxN,
    minVal,
    maxVal,
    seed,
    candidateCount = 3000,
  } = config;

  const rng = new SeededRandom(seed);
  const candidates: CandidateInput[] = [];

  // Always include boundary sizes: 1, 2, maxN
  const sizes = [1, 2, 3, Math.max(4, Math.floor(maxN / 4)), Math.max(5, Math.floor(maxN / 2)), maxN];

  function push(raw: unknown, label: string) {
    candidates.push({ raw, label, serialized: JSON.stringify(raw) });
  }

  if (problemType === 'array' || problemType === 'two-array') {
    const label = 'nums';
    // Boundary sizes first
    for (const n of sizes) {
      push(genRandomArray(rng, n, minVal, maxVal), label);
      push(genSortedArray(rng, n, minVal, maxVal), label);
      push(genReverseSorted(rng, n, minVal, maxVal), label);
      push(genAllSame(rng, n, minVal, maxVal), label);
      push(genWithDuplicates(rng, n, minVal, maxVal), label);
    }
    // Random bulk
    while (candidates.length < candidateCount) {
      const n = rng.int(1, maxN);
      push(genRandomArray(rng, n, minVal, maxVal), label);
    }
  } else if (problemType === 'array-target') {
    const label = 'nums';
    for (const n of sizes) {
      const arr = genRandomArray(rng, n, minVal, maxVal);
      const target = arr[rng.int(0, arr.length - 1)] + arr[rng.int(0, arr.length - 1)];
      push({ nums: arr, target }, label);

      const arr2 = genSortedArray(rng, n, minVal, maxVal);
      push({ nums: arr2, target: rng.int(minVal * 2, maxVal * 2) }, label);
    }
    while (candidates.length < candidateCount) {
      const n = rng.int(1, maxN);
      const arr = genRandomArray(rng, n, minVal, maxVal);
      const target = rng.int(minVal * 2, maxVal * 2);
      push({ nums: arr, target }, label);
    }
  } else if (problemType === 'string') {
    const label = 's';
    for (const n of sizes) {
      push(genRandomString(rng, n), label);
      push(genPalindrome(rng, n), label);
      push(genAllSameChar(rng, n), label);
    }
    while (candidates.length < candidateCount) {
      push(genRandomString(rng, rng.int(1, maxN)), label);
    }
  } else if (problemType === 'number') {
    const label = 'n';
    // Boundary numbers
    push(0, label); push(1, label); push(-1, label);
    push(minVal, label); push(maxVal, label);
    while (candidates.length < candidateCount) {
      push(rng.int(minVal, maxVal), label);
    }
  } else if (problemType === 'matrix') {
    const label = 'matrix';
    for (const n of [1, 2, 3, Math.min(10, maxN)]) {
      const m = Math.min(n, 5);
      const grid = Array.from({ length: n }, () =>
        Array.from({ length: m }, () => rng.int(minVal, maxVal))
      );
      push(grid, label);
    }
    while (candidates.length < candidateCount) {
      const rows = rng.int(1, Math.min(maxN, 20));
      const cols = rng.int(1, Math.min(maxN, 20));
      push(
        Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => rng.int(minVal, maxVal))
        ),
        label
      );
    }
  } else {
    // two-number
    const label = 'a';
    push([0, 0], label); push([1, 1], label);
    while (candidates.length < candidateCount) {
      push([rng.int(minVal, maxVal), rng.int(minVal, maxVal)], label);
    }
  }

  return candidates;
}

// ─── Parse constraints from constraint strings ─────────────────────────────────
export function parseConstraints(constraintStrings: string[]): {
  maxN: number;
  minVal: number;
  maxVal: number;
} {
  let maxN = 1000;
  let minVal = -1_000_000_000;
  let maxVal = 1_000_000_000;

  for (const c of constraintStrings) {
    // Pattern: 1 <= n <= 10^5 or n <= 10^4
    const nMatch = c.match(/(?:nums|n|arr|s|k)\.?(?:length)?\s*<=\s*(\d+)(?:\^(\d+))?/i)
      || c.match(/(\d+)(?:\^(\d+))?\s*<=\s*(?:nums|n|arr|s|k)\.?(?:length)?/i);
    if (nMatch) {
      const base = parseInt(nMatch[1], 10);
      const exp = nMatch[2] ? parseInt(nMatch[2], 10) : 0;
      const val = exp > 0 ? Math.pow(base, exp) : base;
      maxN = Math.min(val, 100_000); // cap at 100k for performance
    }

    // Pattern: -10^9 <= nums[i] <= 10^9
    const valMatch = c.match(/(-?\d+)(?:\^(\d+))?\s*<=\s*(?:nums|arr|s|a|b)\[?i?\]?\s*<=\s*(\d+)(?:\^(\d+))?/i);
    if (valMatch) {
      const lo = parseInt(valMatch[1], 10);
      const loExp = valMatch[2] ? parseInt(valMatch[2], 10) : 0;
      const hi = parseInt(valMatch[3], 10);
      const hiExp = valMatch[4] ? parseInt(valMatch[4], 10) : 0;
      minVal = loExp > 0 ? -Math.pow(Math.abs(lo), loExp) : lo;
      maxVal = hiExp > 0 ? Math.pow(hi, hiExp) : hi;
      // Clamp for safety
      minVal = Math.max(minVal, -2_000_000_000);
      maxVal = Math.min(maxVal, 2_000_000_000);
    }
  }

  return { maxN, minVal, maxVal };
}
