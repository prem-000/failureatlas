/**
 * src/lib/intelligence/generation/deterministic/duplicate-generators.ts
 * Generates duplicate-heavy cases: all identical, adjacent duplicates, alternating duplicates.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { TestObjective } from '../../objectives/test-objective-builder';

export function generateDuplicateCandidates(
  contract: ProblemContract,
  objective: TestObjective
): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];
  const primaryParam = contract.parameters[0];
  if (!primaryParam) return candidates;

  if (primaryParam.type === 'number[]') {
    if (contract.slug === 'move-zeroes') {
      // Targeted consecutive zero cases to expose mutation skipping
      candidates.push({ nums: [0, 0, 1] });
      candidates.push({ nums: [0, 0, 0] });
      candidates.push({ nums: [0, 1, 0, 3, 12] });
      candidates.push({ nums: [1, 0, 0, 2] });
      candidates.push({ nums: [0, 0, 0, 0, 1] });
    } else if (contract.slug === 'sort-colors') {
      candidates.push({ nums: [2, 0, 2, 1, 1, 0] });
      candidates.push({ nums: [2, 0, 1] });
      candidates.push({ nums: [0, 0, 0] });
      candidates.push({ nums: [2, 2, 2] });
      candidates.push({ nums: [1, 1, 1] });
    } else if (contract.slug === 'two-sum') {
      candidates.push({ nums: [3, 2, 4], target: 6 });
      candidates.push({ nums: [1, 1, 1, 1], target: 2 });
    } else if (contract.parameters.length === 1) {
      candidates.push({ [primaryParam.name]: [2, 2, 2, 2] });
      candidates.push({ [primaryParam.name]: [1, 2, 1, 2, 1] });
      candidates.push({ [primaryParam.name]: [1, 1, 2, 2, 3, 3] });
    }
  } else if (primaryParam.type === 'string') {
    candidates.push({ [primaryParam.name]: 'aaaaaa' });
    candidates.push({ [primaryParam.name]: 'abcabcbb' });
    candidates.push({ [primaryParam.name]: 'pwwkew' });
  }

  return candidates;
}
