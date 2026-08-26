/**
 * src/lib/intelligence/oracles/reference-oracles.ts
 * Independent, verified ground truth reference algorithms.
 * Supports both return_value and in_place execution models.
 */

import type { ProblemContract } from '../contracts/problem-contract';

export type ReferenceOracleFn = (input: any) => any;

export const SEEDED_ORACLES: Record<string, ReferenceOracleFn> = {
  'move-zeroes': (input: { nums: number[] }) => {
    // In-place oracle: returns the mutated nums array
    const nums = [...(input.nums || [])];
    let pos = 0;
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] !== 0) {
        nums[pos++] = nums[i];
      }
    }
    while (pos < nums.length) {
      nums[pos++] = 0;
    }
    return nums;
  },

  'two-sum': (input: { nums: number[]; target: number }) => {
    const nums = input.nums || [];
    const target = input.target;
    const map = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
      const complement = target - nums[i];
      if (map.has(complement)) {
        return [map.get(complement)!, i];
      }
      map.set(nums[i], i);
    }
    return [];
  },

  'binary-search': (input: { nums: number[]; target: number }) => {
    const nums = input.nums || [];
    const target = input.target;
    let lo = 0;
    let hi = nums.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (nums[mid] === target) return mid;
      if (nums[mid] < target) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  },

  'sort-colors': (input: { nums: number[] }) => {
    // In-place three-way partition
    const nums = [...(input.nums || [])];
    let low = 0;
    let mid = 0;
    let high = nums.length - 1;
    while (mid <= high) {
      if (nums[mid] === 0) {
        [nums[low], nums[mid]] = [nums[mid], nums[low]];
        low++;
        mid++;
      } else if (nums[mid] === 1) {
        mid++;
      } else {
        [nums[mid], nums[high]] = [nums[high], nums[mid]];
        high--;
      }
    }
    return nums;
  },

  'maximum-subarray': (input: { nums: number[] }) => {
    const nums = input.nums || [];
    if (nums.length === 0) return 0;
    let max = nums[0];
    let cur = nums[0];
    for (let i = 1; i < nums.length; i++) {
      cur = Math.max(nums[i], cur + nums[i]);
      max = Math.max(max, cur);
    }
    return max;
  },

  'contains-duplicate': (input: { nums: number[] }) => {
    const nums = input.nums || [];
    return new Set(nums).size !== nums.length;
  },

  'best-time-to-buy-and-sell-stock': (input: { prices: number[] }) => {
    const prices = input.prices || [];
    let minPrice = Infinity;
    let maxP = 0;
    for (const p of prices) {
      minPrice = Math.min(minPrice, p);
      maxP = Math.max(maxP, p - minPrice);
    }
    return maxP;
  },

  'valid-palindrome': (input: { s: string }) => {
    const s = input.s || '';
    const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean === clean.split('').reverse().join('');
  },

  'longest-substring-without-repeating-characters': (input: { s: string }) => {
    const s = input.s || '';
    const map = new Map<string, number>();
    let maxLen = 0;
    let left = 0;
    for (let right = 0; right < s.length; right++) {
      if (map.has(s[right]) && map.get(s[right])! >= left) {
        left = map.get(s[right])! + 1;
      }
      map.set(s[right], right);
      maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
  },

  'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold': (input: {
    arr: number[];
    k: number;
    threshold: number;
  }) => {
    const { arr = [], k = 1, threshold = 0 } = input;
    const targetSum = k * threshold;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < k; i++) sum += arr[i];
    if (sum >= targetSum) count++;
    for (let i = k; i < arr.length; i++) {
      sum += arr[i] - arr[i - k];
      if (sum >= targetSum) count++;
    }
    return count;
  },

  'valid-parentheses': (input: { s: string }) => {
    const s = input.s || '';
    const stack: string[] = [];
    const map: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
    for (const char of s) {
      if (char === '(' || char === '{' || char === '[') {
        stack.push(char);
      } else if (map[char]) {
        if (stack.pop() !== map[char]) return false;
      }
    }
    return stack.length === 0;
  },
};

export function getReferenceOracle(contract: ProblemContract): ReferenceOracleFn | null {
  const normalized = contract.slug.toLowerCase().replace(/_/g, '-');
  return SEEDED_ORACLES[normalized] || null;
}
