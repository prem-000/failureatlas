/**
 * minimizer.ts
 * Delta-debugging minimizer.
 * Given a failing input, iteratively reduces it to the smallest form
 * that still reproduces the bug.
 *
 * Algorithm: ddmin (Andreas Zeller, 1999)
 * - Split input into halves
 * - Check if either half still fails
 * - If yes, recurse on that half
 * - If neither half fails alone, try removing individual elements
 * - Stop when no further reduction is possible
 */

import type { DiffResult } from './executor';

type TestFn = (input: unknown) => DiffResult;

/**
 * Attempt to minimize an array input.
 * Returns the smallest failing sub-array.
 */
function minimizeArray(arr: unknown[], testFn: TestFn, maxRounds = 8): unknown[] {
  let current = [...arr];

  for (let round = 0; round < maxRounds; round++) {
    if (current.length <= 1) break;

    let reduced = false;

    // Try halving
    const half = Math.ceil(current.length / 2);
    const firstHalf = current.slice(0, half);
    const secondHalf = current.slice(half);

    if (firstHalf.length > 0) {
      const r = testFn(firstHalf);
      if (!r.match && !r.timedOut) {
        current = firstHalf;
        reduced = true;
        continue;
      }
    }
    if (secondHalf.length > 0) {
      const r = testFn(secondHalf);
      if (!r.match && !r.timedOut) {
        current = secondHalf;
        reduced = true;
        continue;
      }
    }

    // Try removing each element one at a time
    for (let i = 0; i < current.length; i++) {
      const candidate = [...current.slice(0, i), ...current.slice(i + 1)];
      if (candidate.length === 0) continue;
      const r = testFn(candidate);
      if (!r.match && !r.timedOut) {
        current = candidate;
        reduced = true;
        break;
      }
    }

    if (!reduced) break;
  }

  return current;
}

/**
 * Attempt to minimize a string input.
 */
function minimizeString(s: string, testFn: TestFn, maxRounds = 8): string {
  let current = s;

  for (let round = 0; round < maxRounds; round++) {
    if (current.length <= 1) break;
    let reduced = false;

    const half = Math.ceil(current.length / 2);
    const candidates = [current.slice(0, half), current.slice(half)];
    for (const c of candidates) {
      if (c.length === 0) continue;
      const r = testFn(c);
      if (!r.match && !r.timedOut) {
        current = c;
        reduced = true;
        break;
      }
    }

    if (!reduced) {
      for (let i = 0; i < current.length; i++) {
        const c = current.slice(0, i) + current.slice(i + 1);
        if (c.length === 0) continue;
        const r = testFn(c);
        if (!r.match && !r.timedOut) {
          current = c;
          reduced = true;
          break;
        }
      }
    }

    if (!reduced) break;
  }

  return current;
}

/**
 * Main minimizer entry point.
 * Detects the input type and calls the appropriate minimizer.
 */
export function minimizeInput(
  failingInput: unknown,
  testFn: TestFn
): unknown {
  if (typeof failingInput === 'string') {
    return minimizeString(failingInput, testFn);
  }

  if (Array.isArray(failingInput)) {
    return minimizeArray(failingInput, testFn);
  }

  // Object like { nums: [...], target: 3 }
  if (failingInput !== null && typeof failingInput === 'object') {
    const obj = failingInput as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      if (Array.isArray(val)) {
        // Minimize the array value, keeping other keys fixed
        const minimized = minimizeArray(val, (candidate) =>
          testFn({ ...obj, [key]: candidate })
        );
        result[key] = minimized;
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  // Primitive — can't minimize further
  return failingInput;
}
