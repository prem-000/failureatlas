/**
 * src/lib/intelligence/generation/deterministic/target-generators.ts
 * Generates target position cases for search and two-pointer problems:
 * target at first index, target at last index, target absent, target in middle, target out of bounds.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { TestObjective } from '../../objectives/test-objective-builder';

export function generateTargetCandidates(
  contract: ProblemContract,
  objective: TestObjective
): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];

  if (contract.slug === 'binary-search') {
    // 1. Target at last position
    candidates.push({ nums: [1, 3, 5, 7], target: 7 });
    // 2. Target at first position
    candidates.push({ nums: [1, 3, 5, 7], target: 1 });
    // 3. Target in middle
    candidates.push({ nums: [1, 3, 5, 7, 9], target: 5 });
    // 4. Target absent (smaller than min)
    candidates.push({ nums: [1, 3, 5, 7], target: 0 });
    // 5. Target absent (larger than max - exposes length vs length-1 bugs)
    candidates.push({ nums: [1, 3, 5, 7], target: 10 });
    candidates.push({ nums: [1, 3, 5], target: 6 });
    // 6. Target absent (between elements)
    candidates.push({ nums: [1, 3, 5, 7], target: 4 });
  } else if (contract.slug === 'two-sum') {
    candidates.push({ nums: [2, 7, 11, 15], target: 9 });
    candidates.push({ nums: [3, 2, 4], target: 6 });
    candidates.push({ nums: [3, 3], target: 6 });
    candidates.push({ nums: [2, 5, 5, 11], target: 10 });
    candidates.push({ nums: [-3, 4, 3, 90], target: 0 });
  }

  return candidates;
}
