/**
 * src/lib/intelligence/generation/deterministic/boundary-generators.ts
 * Generates boundary cases: empty inputs, single element, minimum constraint, extreme bounds.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { TestObjective } from '../../objectives/test-objective-builder';

export function generateBoundaryCandidates(
  contract: ProblemContract,
  objective: TestObjective
): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];
  const primaryParam = contract.parameters[0];
  if (!primaryParam) return candidates;

  const slug = contract.slug;

  if (primaryParam.type === 'number[]') {
    if (slug === 'move-zeroes') {
      candidates.push({ nums: [0] });
      candidates.push({ nums: [1] });
      candidates.push({ nums: [1, 2, 3] });
      candidates.push({ nums: [0, 1] });
      candidates.push({ nums: [1, 0] });
    } else if (slug === 'sort-colors') {
      candidates.push({ nums: [0] });
      candidates.push({ nums: [1] });
      candidates.push({ nums: [2] });
      candidates.push({ nums: [1, 2, 0] });
      candidates.push({ nums: [2, 1, 0] });
      candidates.push({ nums: [2, 0, 1] });
    } else if (slug === 'two-sum') {
      candidates.push({ nums: [3, 3], target: 6 });
      candidates.push({ nums: [2, 7, 11, 15], target: 9 });
      candidates.push({ nums: [3, 2, 4], target: 6 });
      candidates.push({ nums: [-3, 4, 3, 90], target: 0 });
    } else if (slug === 'binary-search') {
      candidates.push({ nums: [5], target: 5 });
      candidates.push({ nums: [5], target: -5 });
      candidates.push({ nums: [1, 3], target: 1 });
      candidates.push({ nums: [1, 3], target: 3 });
      candidates.push({ nums: [1, 3, 5], target: 6 });
      candidates.push({ nums: [2, 5], target: 6 });
      candidates.push({ nums: [1, 3, 5, 7], target: 7 });
      candidates.push({ nums: [1, 3, 5, 7], target: 0 });
    } else if (slug === 'maximum-subarray') {
      candidates.push({ nums: [-1] });
      candidates.push({ nums: [-3, -2, -1] });
      candidates.push({ nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] });
      candidates.push({ nums: [5, 4, -1, 7, 8] });
      candidates.push({ nums: [-1, -2] });
    } else if (slug === 'best-time-to-buy-and-sell-stock') {
      candidates.push({ prices: [7, 6, 4, 3, 1] }); // Decreasing
      candidates.push({ prices: [7, 1, 5, 3, 6, 4] });
      candidates.push({ prices: [1, 2] });
      candidates.push({ prices: [2, 4, 1] });
      candidates.push({ prices: [3, 2, 1] });
      candidates.push({ prices: [2, 1, 2, 0, 1] });
    } else if (slug === 'contains-duplicate') {
      candidates.push({ nums: [1] });
      candidates.push({ nums: [1, 1] });
      candidates.push({ nums: [1, 2, 3] });
      candidates.push({ nums: [1, 2, 3, 1] });
      candidates.push({ nums: [1, 2, 3, 4] });
      candidates.push({ nums: [1, 1, 1, 3, 3, 4, 3, 2, 4, 2] });
    } else if (slug.includes('number-of-sub-arrays')) {
      candidates.push({ arr: [2, 2, 2, 2, 5, 5, 5, 8], k: 3, threshold: 4 });
      candidates.push({ arr: [11, 13, 17, 23, 29, 31, 7, 5, 2, 3], k: 3, threshold: 5 });
      candidates.push({ arr: [7, 7, 7, 7, 7, 7, 7], k: 7, threshold: 7 });
    } else {
      candidates.push({ [primaryParam.name]: [0] });
      candidates.push({ [primaryParam.name]: [1] });
      candidates.push({ [primaryParam.name]: [-1] });
      candidates.push({ [primaryParam.name]: [0, 1] });
    }
  } else if (primaryParam.type === 'string') {
    if (slug === 'valid-palindrome') {
      candidates.push({ s: 'A man, a plan, a canal: Panama' });
      candidates.push({ s: 'race a car' });
      candidates.push({ s: ' ' });
      candidates.push({ s: '0P' });
      candidates.push({ s: 'a.' });
      candidates.push({ s: 'ab_a' });
      candidates.push({ s: 'Aa' });
    } else if (slug === 'valid-parentheses') {
      candidates.push({ s: '()' });
      candidates.push({ s: '()[]{}' });
      candidates.push({ s: '(]' });
      candidates.push({ s: '([)]' });
      candidates.push({ s: '{[]}' });
      candidates.push({ s: '{]' });
      candidates.push({ s: '{}' });
      candidates.push({ s: '(' });
      candidates.push({ s: ']' });
      candidates.push({ s: '(((' });
    } else if (slug === 'longest-substring-without-repeating-characters') {
      candidates.push({ s: 'abcabcbb' });
      candidates.push({ s: 'bbbbb' });
      candidates.push({ s: 'pwwkew' });
      candidates.push({ s: ' ' });
      candidates.push({ s: 'au' });
      candidates.push({ s: 'abba' });
    } else {
      candidates.push({ [primaryParam.name]: '' });
      candidates.push({ [primaryParam.name]: 'a' });
      candidates.push({ [primaryParam.name]: 'ab' });
    }
  }

  return candidates;
}
