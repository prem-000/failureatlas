/**
 * src/lib/intelligence/generation/deterministic/ordering-generators.ts
 * Generates ordering cases: sorted, reversed, partitioned, mixed.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { TestObjective } from '../../objectives/test-objective-builder';

export function generateOrderingCandidates(
  contract: ProblemContract,
  objective: TestObjective
): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];
  const primaryParam = contract.parameters[0];
  if (!primaryParam) return candidates;

  const slug = contract.slug;

  if (primaryParam.type === 'number[]') {
    if (slug === 'best-time-to-buy-and-sell-stock') {
      candidates.push({ prices: [7, 6, 4, 3, 1] });
      candidates.push({ prices: [1, 2, 3, 4, 5] });
      candidates.push({ prices: [3, 2, 1] });
      candidates.push({ prices: [2, 1, 2, 0, 1] });
    } else if (slug === 'contains-duplicate') {
      candidates.push({ nums: [1, 2, 3, 4] });
      candidates.push({ nums: [1, 2, 3, 1] });
      candidates.push({ nums: [3, 1, 2, 3] });
      candidates.push({ nums: [1, 2, 3] });
    } else if (slug === 'maximum-subarray') {
      candidates.push({ nums: [-3, -2, -1] });
      candidates.push({ nums: [1, 2, 3, 4] });
      candidates.push({ nums: [-1] });
    } else if (slug === 'sort-colors') {
      candidates.push({ nums: [2, 1, 0] });
      candidates.push({ nums: [1, 2, 0] });
      candidates.push({ nums: [0, 1, 2] });
    } else if (contract.parameters.length === 1) {
      candidates.push({ [primaryParam.name]: [1, 2, 3, 4, 5] });
      candidates.push({ [primaryParam.name]: [5, 4, 3, 2, 1] });
      candidates.push({ [primaryParam.name]: [-5, -4, -3, -2, -1] });
      candidates.push({ [primaryParam.name]: [1, 3, 5, 2, 4, 6] });
    }
  }

  return candidates;
}
