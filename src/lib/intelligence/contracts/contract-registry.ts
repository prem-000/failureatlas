/**
 * src/lib/intelligence/contracts/contract-registry.ts
 * Canonical Problem Contract Registry for standard LeetCode problems.
 */

import type { ProblemContract } from './problem-contract';

export const CANONICAL_CONTRACTS: Record<string, ProblemContract> = {
  'move-zeroes': {
    slug: 'move-zeroes',
    title: 'Move Zeroes',
    difficulty: 'Easy',
    functionName: 'moveZeroes',
    parameters: [{ name: 'nums', type: 'number[]' }],
    returnType: 'void',
    executionMode: 'in_place',
    inPlaceTargetParam: 'nums',
    constraints: [
      { expression: '1 <= nums.length <= 10^4', variable: 'nums.length', min: 1, max: 10000 },
      { expression: '-2^31 <= nums[i] <= 2^31 - 1', variable: 'nums[i]', min: -2147483648, max: 2147483647 },
    ],
    invariants: [
      'All zeroes appear at the end of the array',
      'Relative order of non-zero elements is preserved',
      'Array length remains unchanged',
      'In-place modification without allocating full array copy',
    ],
    oracleType: 'reference_solution',
  },

  'two-sum': {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    functionName: 'twoSum',
    parameters: [
      { name: 'nums', type: 'number[]' },
      { name: 'target', type: 'number' },
    ],
    returnType: 'number[]',
    executionMode: 'return_value',
    constraints: [
      { expression: '2 <= nums.length <= 10^4', variable: 'nums.length', min: 2, max: 10000 },
      { expression: '-10^9 <= nums[i] <= 10^9', variable: 'nums[i]', min: -1000000000, max: 1000000000 },
      { expression: '-10^9 <= target <= 10^9', variable: 'target', min: -1000000000, max: 1000000000 },
    ],
    invariants: [
      'Exactly one valid answer exists',
      'Cannot use the same element twice (distinct indices)',
      'Returns indices [i, j]',
    ],
    oracleType: 'reference_solution',
  },

  'binary-search': {
    slug: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    functionName: 'search',
    parameters: [
      { name: 'nums', type: 'number[]' },
      { name: 'target', type: 'number' },
    ],
    returnType: 'number',
    executionMode: 'return_value',
    constraints: [
      { expression: '1 <= nums.length <= 10^4', variable: 'nums.length', min: 1, max: 10000 },
      { expression: '-10^4 < nums[i], target < 10^4', variable: 'nums[i]', min: -10000, max: 10000 },
      { expression: 'All elements in nums are unique', variable: 'unique' },
      { expression: 'nums is sorted in ascending order', variable: 'sorted' },
    ],
    invariants: [
      'Array is strictly sorted ascending',
      'Returns index if target exists, else -1',
      'O(log n) time complexity required',
    ],
    oracleType: 'reference_solution',
  },

  'sort-colors': {
    slug: 'sort-colors',
    title: 'Sort Colors',
    difficulty: 'Medium',
    functionName: 'sortColors',
    parameters: [{ name: 'nums', type: 'number[]' }],
    returnType: 'void',
    executionMode: 'in_place',
    inPlaceTargetParam: 'nums',
    constraints: [
      { expression: '1 <= nums.length <= 300', variable: 'nums.length', min: 1, max: 300 },
      { expression: 'nums[i] is either 0, 1, or 2', variable: 'nums[i]', min: 0, max: 2 },
    ],
    invariants: [
      'Array sorted in-place so objects of same color are adjacent',
      'Colors order: 0 (red), 1 (white), 2 (blue)',
      'One-pass O(N) constant extra space optimal',
    ],
    oracleType: 'reference_solution',
  },

  'maximum-subarray': {
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    functionName: 'maxSubArray',
    parameters: [{ name: 'nums', type: 'number[]' }],
    returnType: 'number',
    executionMode: 'return_value',
    constraints: [
      { expression: '1 <= nums.length <= 10^5', variable: 'nums.length', min: 1, max: 100000 },
      { expression: '-10^4 <= nums[i] <= 10^4', variable: 'nums[i]', min: -10000, max: 10000 },
    ],
    invariants: [
      'Finds contiguous subarray containing at least one number with largest sum',
      'Handles all negative elements correctly',
    ],
    oracleType: 'reference_solution',
  },

  'contains-duplicate': {
    slug: 'contains-duplicate',
    title: 'Contains Duplicate',
    difficulty: 'Easy',
    functionName: 'containsDuplicate',
    parameters: [{ name: 'nums', type: 'number[]' }],
    returnType: 'boolean',
    executionMode: 'return_value',
    constraints: [
      { expression: '1 <= nums.length <= 10^5', variable: 'nums.length', min: 1, max: 100000 },
      { expression: '-10^9 <= nums[i] <= 10^9', variable: 'nums[i]', min: -1000000000, max: 1000000000 },
    ],
    invariants: ['Returns true if any value appears at least twice, false if all distinct'],
    oracleType: 'reference_solution',
  },

  'best-time-to-buy-and-sell-stock': {
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    functionName: 'maxProfit',
    parameters: [{ name: 'prices', type: 'number[]' }],
    returnType: 'number',
    executionMode: 'return_value',
    constraints: [
      { expression: '1 <= prices.length <= 10^5', variable: 'prices.length', min: 1, max: 100000 },
      { expression: '0 <= prices[i] <= 10^4', variable: 'prices[i]', min: 0, max: 10000 },
    ],
    invariants: ['Cannot sell before buying', 'Returns 0 if no profit can be achieved'],
    oracleType: 'reference_solution',
  },

  'valid-palindrome': {
    slug: 'valid-palindrome',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    functionName: 'isPalindrome',
    parameters: [{ name: 's', type: 'string' }],
    returnType: 'boolean',
    executionMode: 'return_value',
    constraints: [
      { expression: '1 <= s.length <= 2 * 10^5', variable: 's.length', min: 1, max: 200000 },
      { expression: 's consists only of printable ASCII characters', variable: 's' },
    ],
    invariants: ['Case-insensitive', 'Ignores non-alphanumeric characters'],
    oracleType: 'reference_solution',
  },

  'longest-substring-without-repeating-characters': {
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    functionName: 'lengthOfLongestSubstring',
    parameters: [{ name: 's', type: 'string' }],
    returnType: 'number',
    executionMode: 'return_value',
    constraints: [
      { expression: '0 <= s.length <= 5 * 10^4', variable: 's.length', min: 0, max: 50000 },
      { expression: 's consists of English letters, digits, symbols and spaces', variable: 's' },
    ],
    invariants: ['Returns length of longest contiguous substring without duplicate characters'],
    oracleType: 'reference_solution',
  },

  'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold': {
    slug: 'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold',
    title: 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold',
    difficulty: 'Medium',
    functionName: 'numOfSubarrays',
    parameters: [
      { name: 'arr', type: 'number[]' },
      { name: 'k', type: 'number' },
      { name: 'threshold', type: 'number' },
    ],
    returnType: 'number',
    executionMode: 'return_value',
    constraints: [
      { expression: '1 <= arr.length <= 10^5', variable: 'arr.length', min: 1, max: 100000 },
      { expression: '1 <= arr[i] <= 10^4', variable: 'arr[i]', min: 1, max: 10000 },
      { expression: '1 <= k <= arr.length', variable: 'k', min: 1, max: 100000 },
      { expression: '0 <= threshold <= 10^4', variable: 'threshold', min: 0, max: 10000 },
    ],
    invariants: ['Sliding window of fixed size k', 'Sum condition: sum >= k * threshold'],
    oracleType: 'reference_solution',
  },

  'valid-parentheses': {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    functionName: 'isValid',
    parameters: [{ name: 's', type: 'string' }],
    returnType: 'boolean',
    executionMode: 'return_value',
    constraints: [
      { expression: '1 <= s.length <= 10^4', variable: 's.length', min: 1, max: 10000 },
      { expression: "s consists of parentheses only '()[]{}'", variable: 's' },
    ],
    invariants: [
      'Open brackets must be closed by the same type of brackets',
      'Open brackets must be closed in the correct order',
      'Every close bracket has a corresponding open bracket',
    ],
    oracleType: 'reference_solution',
  },
};

export function getCanonicalContract(slug: string): ProblemContract | null {
  const normalized = slug.toLowerCase().replace(/_/g, '-');
  return CANONICAL_CONTRACTS[normalized] || null;
}
