/**
 * tests/intelligence/corpus/corpus-definitions.ts
 * Evaluation Corpus containing 51 test cases across 10 problem families (Phase 3).
 * Includes correct implementations, genuine buggy implementations, and brute-force complexity cases.
 */

export interface CorpusCase {
  id: string;
  family: string;
  problemSlug: string;
  problemTitle: string;
  description: string;
  code: string;
  isCorrect: boolean;
  expectedApproach?: string;
  expectedDetector?: string;
  expectedStatus: 'CONFIRMED' | 'REJECTED' | 'POTENTIAL' | 'INCONCLUSIVE';
  expectedPerformance?: 'WITHIN_EXPECTATION' | 'AT_RISK' | 'LIMIT_EXCEEDED';
}

export const EVALUATION_CORPUS: CorpusCase[] = [
  // ─── 1. BINARY SEARCH (6 cases) ──────────────────────────────────────────
  {
    id: 'BS-CORRECT-1',
    family: 'binary-search',
    problemSlug: 'binary-search',
    problemTitle: 'Binary Search',
    description: 'Standard correct binary search implementation',
    code: `function search(nums, target) {
      let left = 0, right = nums.length - 1;
      while (left <= right) {
        let mid = left + Math.floor((right - left) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
      }
      return -1;
    }`,
    isCorrect: true,
    expectedApproach: 'Binary Search',
    expectedStatus: 'REJECTED',
  },
  {
    id: 'BS-BUGGY-1',
    family: 'binary-search',
    problemSlug: 'binary-search',
    problemTitle: 'Binary Search',
    description: 'Strict inequality while(left < right) skips right boundary target',
    code: `function search(nums, target) {
      let left = 0, right = nums.length - 1;
      while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
      }
      return -1;
    }`,
    isCorrect: false,
    expectedApproach: 'Binary Search',
    expectedDetector: 'BINARY_SEARCH_TERMINATION_RULE',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'BS-BUGGY-2',
    family: 'binary-search',
    problemSlug: 'binary-search',
    problemTitle: 'Binary Search',
    description: 'Left pointer update missing + 1 causing potential infinite loop',
    code: `function search(nums, target) {
      let left = 0, right = nums.length - 1;
      while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid;
        else right = mid - 1;
      }
      return -1;
    }`,
    isCorrect: false,
    expectedApproach: 'Binary Search',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'BS-BUGGY-3',
    family: 'binary-search',
    problemSlug: 'binary-search',
    problemTitle: 'Binary Search',
    description: 'Right pointer update missing - 1',
    code: `function search(nums, target) {
      let left = 0, right = nums.length - 1;
      while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid;
      }
      return -1;
    }`,
    isCorrect: false,
    expectedApproach: 'Binary Search',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'BS-BUGGY-4',
    family: 'binary-search',
    problemSlug: 'binary-search',
    problemTitle: 'Binary Search',
    description: 'Off-by-one initial left pointer starts at 1 skipping first element',
    code: `function search(nums, target) {
      let left = 1, right = nums.length - 1;
      while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
      }
      return -1;
    }`,
    isCorrect: false,
    expectedApproach: 'Binary Search',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'BS-BUGGY-5',
    family: 'binary-search',
    problemSlug: 'binary-search',
    problemTitle: 'Binary Search',
    description: 'Inverted branch condition (less than branch moves right pointer)',
    code: `function search(nums, target) {
      let left = 0, right = nums.length - 1;
      while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) right = mid - 1;
        else left = mid + 1;
      }
      return -1;
    }`,
    isCorrect: false,
    expectedApproach: 'Binary Search',
    expectedStatus: 'CONFIRMED',
  },

  // ─── 2. MOVE ZEROES (5 cases) ─────────────────────────────────────────────
  {
    id: 'MZ-CORRECT-1',
    family: 'move-zeroes',
    problemSlug: 'move-zeroes',
    problemTitle: 'Move Zeroes',
    description: 'Two-pointer two-pass overwrite approach',
    code: `function moveZeroes(nums) {
      let pos = 0;
      for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== 0) nums[pos++] = nums[i];
      }
      while (pos < nums.length) nums[pos++] = 0;
    }`,
    isCorrect: true,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'REJECTED',
  },
  {
    id: 'MZ-BUGGY-1',
    family: 'move-zeroes',
    problemSlug: 'move-zeroes',
    problemTitle: 'Move Zeroes',
    description: 'In-place splice without i decrement skipping adjacent zeroes',
    code: `function moveZeroes(nums) {
      for (let i = 0; i < nums.length; i++) {
        if (nums[i] === 0) {
          nums.splice(i, 1);
          nums.push(0);
        }
      }
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedDetector: 'IN_PLACE_MUTATION_INDEX_RULE',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'MZ-BUGGY-2',
    family: 'move-zeroes',
    problemSlug: 'move-zeroes',
    problemTitle: 'Move Zeroes',
    description: 'Swapping zeroes without preserving non-zero order',
    code: `function moveZeroes(nums) {
      let left = 0, right = nums.length - 1;
      while (left < right) {
        if (nums[left] === 0 && nums[right] !== 0) {
          nums[left] = nums[right];
          nums[right] = 0;
          left++;
          right--;
        } else if (nums[left] !== 0) {
          left++;
        } else {
          right--;
        }
      }
    }`,
    isCorrect: false,
    expectedApproach: 'Two Pointers',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'MZ-BUGGY-3',
    family: 'move-zeroes',
    problemSlug: 'move-zeroes',
    problemTitle: 'Move Zeroes',
    description: 'Single-zero edge case failure on all zero arrays',
    code: `function moveZeroes(nums) {
      if (nums.length <= 1) return;
      let nonZeroIndex = 0;
      for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== 0) {
          let temp = nums[nonZeroIndex];
          nums[nonZeroIndex] = nums[i];
          nums[i] = temp;
          nonZeroIndex++;
        }
      }
      nums[nums.length - 1] = 0;
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'MZ-BUGGY-4',
    family: 'move-zeroes',
    problemSlug: 'move-zeroes',
    problemTitle: 'Move Zeroes',
    description: 'Loop terminates at length - 1 omitting last element check',
    code: `function moveZeroes(nums) {
      let pos = 0;
      for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i] !== 0) nums[pos++] = nums[i];
      }
      while (pos < nums.length) nums[pos++] = 0;
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },

  // ─── 3. TWO SUM (5 cases) ────────────────────────────────────────────────
  {
    id: 'TS-CORRECT-1',
    family: 'two-sum',
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    description: 'Single-pass Hash Map lookup',
    code: `function twoSum(nums, target) {
      const map = new Map();
      for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) return [map.get(complement), i];
        map.set(nums[i], i);
      }
      return [];
    }`,
    isCorrect: true,
    expectedApproach: 'Hash Map',
    expectedStatus: 'REJECTED',
    expectedPerformance: 'WITHIN_EXPECTATION',
  },
  {
    id: 'TS-BRUTE-FORCE-1',
    family: 'two-sum',
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    description: 'Correct brute force nested loop (O(N^2) complexity risk)',
    code: `function twoSum(nums, target) {
      for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
          if (nums[i] + nums[j] === target) return [i, j];
        }
      }
      return [];
    }`,
    isCorrect: true,
    expectedApproach: 'Brute Force',
    expectedStatus: 'REJECTED',
    expectedPerformance: 'AT_RISK',
  },
  {
    id: 'TS-BUGGY-1',
    family: 'two-sum',
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    description: 'Pre-populating map inserts all elements allowing self-pairing on 2*x = target',
    code: `function twoSum(nums, target) {
      const map = new Map();
      for (let i = 0; i < nums.length; i++) map.set(nums[i], i);
      for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) return [i, map.get(complement)];
      }
      return [];
    }`,
    isCorrect: false,
    expectedApproach: 'Hash Map',
    expectedDetector: 'MAP_KEY_COLLISION_RULE',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'TS-BUGGY-2',
    family: 'two-sum',
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    description: 'Inner loop starts at j = 0 instead of j = i + 1 allowing duplicate index reuse',
    code: `function twoSum(nums, target) {
      for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
          if (nums[i] + nums[j] === target) return [i, j];
        }
      }
      return [];
    }`,
    isCorrect: false,
    expectedApproach: 'Brute Force',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'TS-BUGGY-3',
    family: 'two-sum',
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    description: 'Two pointers on unsorted array',
    code: `function twoSum(nums, target) {
      let left = 0, right = nums.length - 1;
      while (left < right) {
        let sum = nums[left] + nums[right];
        if (sum === target) return [left, right];
        if (sum < target) left++;
        else right--;
      }
      return [];
    }`,
    isCorrect: false,
    expectedApproach: 'Two Pointers',
    expectedStatus: 'CONFIRMED',
  },

  // ─── 4. SORT COLORS (5 cases) ────────────────────────────────────────────
  {
    id: 'SC-CORRECT-1',
    family: 'sort-colors',
    problemSlug: 'sort-colors',
    problemTitle: 'Sort Colors',
    description: 'Correct 3-way Dutch National Flag partition',
    code: `function sortColors(nums) {
      let low = 0, mid = 0, high = nums.length - 1;
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
    }`,
    isCorrect: true,
    expectedApproach: 'Two Pointers',
    expectedStatus: 'REJECTED',
  },
  {
    id: 'SC-BUGGY-1',
    family: 'sort-colors',
    problemSlug: 'sort-colors',
    problemTitle: 'Sort Colors',
    description: 'Strict inequality while(mid < high) skips evaluating element when mid == high',
    code: `function sortColors(nums) {
      let low = 0, mid = 0, high = nums.length - 1;
      while (mid < high) {
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
    }`,
    isCorrect: false,
    expectedApproach: 'Two Pointers',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'SC-BUGGY-2',
    family: 'sort-colors',
    problemSlug: 'sort-colors',
    problemTitle: 'Sort Colors',
    description: 'Increments mid after swapping with high leaving unexamined high element',
    code: `function sortColors(nums) {
      let low = 0, mid = 0, high = nums.length - 1;
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
          mid++;
        }
      }
    }`,
    isCorrect: false,
    expectedApproach: 'Two Pointers',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'SC-BUGGY-3',
    family: 'sort-colors',
    problemSlug: 'sort-colors',
    problemTitle: 'Sort Colors',
    description: 'Counting sort resets array with wrong length indices',
    code: `function sortColors(nums) {
      let c0 = 0, c1 = 0, c2 = 0;
      for (const n of nums) {
        if (n === 0) c0++;
        else if (n === 1) c1++;
        else c2++;
      }
      for (let i = 0; i < c0; i++) nums[i] = 0;
      for (let i = c0; i < c0 + c1; i++) nums[i] = 1;
      for (let i = c0 + c1; i < nums.length - 1; i++) nums[i] = 2;
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'SC-BUGGY-4',
    family: 'sort-colors',
    problemSlug: 'sort-colors',
    problemTitle: 'Sort Colors',
    description: 'Inverts low and high swap values',
    code: `function sortColors(nums) {
      let low = 0, mid = 0, high = nums.length - 1;
      while (mid <= high) {
        if (nums[mid] === 2) {
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
    }`,
    isCorrect: false,
    expectedApproach: 'Two Pointers',
    expectedStatus: 'CONFIRMED',
  },

  // ─── 5. MAXIMUM SUBARRAY (5 cases) ───────────────────────────────────────
  {
    id: 'MS-CORRECT-1',
    family: 'maximum-subarray',
    problemSlug: 'maximum-subarray',
    problemTitle: 'Maximum Subarray',
    description: 'Kadane algorithm initialized with nums[0]',
    code: `function maxSubArray(nums) {
      if (nums.length === 0) return 0;
      let max = nums[0], cur = nums[0];
      for (let i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        max = Math.max(max, cur);
      }
      return max;
    }`,
    isCorrect: true,
    expectedApproach: 'Dynamic Programming',
    expectedStatus: 'REJECTED',
  },
  {
    id: 'MS-BUGGY-1',
    family: 'maximum-subarray',
    problemSlug: 'maximum-subarray',
    problemTitle: 'Maximum Subarray',
    description: 'Initial max initialized to 0 failing on all negative arrays',
    code: `function maxSubArray(nums) {
      let max = 0, cur = 0;
      for (let i = 0; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        max = Math.max(max, cur);
      }
      return max;
    }`,
    isCorrect: false,
    expectedApproach: 'Dynamic Programming',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'MS-BUGGY-2',
    family: 'maximum-subarray',
    problemSlug: 'maximum-subarray',
    problemTitle: 'Maximum Subarray',
    description: 'Reset cur = 0 before comparing with max returning 0 on negative arrays',
    code: `function maxSubArray(nums) {
      let max = -Infinity, cur = 0;
      for (let i = 0; i < nums.length; i++) {
        cur += nums[i];
        if (cur < 0) cur = 0; // Bug: reset before comparing with max
        if (cur > max) max = cur;
      }
      return max;
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'MS-BUGGY-3',
    family: 'maximum-subarray',
    problemSlug: 'maximum-subarray',
    problemTitle: 'Maximum Subarray',
    description: 'Loop terminates at length - 1',
    code: `function maxSubArray(nums) {
      let max = nums[0], cur = nums[0];
      for (let i = 1; i < nums.length - 1; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        max = Math.max(max, cur);
      }
      return max;
    }`,
    isCorrect: false,
    expectedApproach: 'Dynamic Programming',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'MS-BUGGY-4',
    family: 'maximum-subarray',
    problemSlug: 'maximum-subarray',
    problemTitle: 'Maximum Subarray',
    description: 'Greedy min instead of max',
    code: `function maxSubArray(nums) {
      let max = nums[0], cur = nums[0];
      for (let i = 1; i < nums.length; i++) {
        cur = Math.min(nums[i], cur + nums[i]);
        max = Math.max(max, cur);
      }
      return max;
    }`,
    isCorrect: false,
    expectedApproach: 'Dynamic Programming',
    expectedStatus: 'CONFIRMED',
  },

  // ─── 6. VALID PALINDROME (5 cases) ───────────────────────────────────────
  {
    id: 'VP-CORRECT-1',
    family: 'valid-palindrome',
    problemSlug: 'valid-palindrome',
    problemTitle: 'Valid Palindrome',
    description: 'Two-pointer alphanumeric palindrome check',
    code: `function isPalindrome(s) {
      const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean === clean.split('').reverse().join('');
    }`,
    isCorrect: true,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'REJECTED',
  },
  {
    id: 'VP-BUGGY-1',
    family: 'valid-palindrome',
    problemSlug: 'valid-palindrome',
    problemTitle: 'Valid Palindrome',
    description: 'Fails to strip punctuation and whitespace',
    code: `function isPalindrome(s) {
      const clean = s.toLowerCase();
      return clean === clean.split('').reverse().join('');
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'VP-BUGGY-2',
    family: 'valid-palindrome',
    problemSlug: 'valid-palindrome',
    problemTitle: 'Valid Palindrome',
    description: 'Case-sensitive without toLowerCase',
    code: `function isPalindrome(s) {
      const clean = s.replace(/[^a-zA-Z0-9]/g, '');
      return clean === clean.split('').reverse().join('');
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'VP-BUGGY-3',
    family: 'valid-palindrome',
    problemSlug: 'valid-palindrome',
    problemTitle: 'Valid Palindrome',
    description: 'Two pointer fails on single char strings',
    code: `function isPalindrome(s) {
      const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.length <= 1) return false;
      let l = 0, r = clean.length - 1;
      while (l < r) {
        if (clean[l] !== clean[r]) return false;
        l++; r--;
      }
      return true;
    }`,
    isCorrect: false,
    expectedApproach: 'Two Pointers',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'VP-BUGGY-4',
    family: 'valid-palindrome',
    problemSlug: 'valid-palindrome',
    problemTitle: 'Valid Palindrome',
    description: 'Replaces numbers stripping valid alphanumeric digits',
    code: `function isPalindrome(s) {
      const clean = s.toLowerCase().replace(/[^a-z]/g, '');
      return clean === clean.split('').reverse().join('');
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },

  // ─── 7. CONTAINS DUPLICATE (5 cases) ─────────────────────────────────────
  {
    id: 'CD-CORRECT-1',
    family: 'contains-duplicate',
    problemSlug: 'contains-duplicate',
    problemTitle: 'Contains Duplicate',
    description: 'Set size equality check',
    code: `function containsDuplicate(nums) {
      return new Set(nums).size !== nums.length;
    }`,
    isCorrect: true,
    expectedApproach: 'Hash Map',
    expectedStatus: 'REJECTED',
  },
  {
    id: 'CD-BUGGY-1',
    family: 'contains-duplicate',
    problemSlug: 'contains-duplicate',
    problemTitle: 'Contains Duplicate',
    description: 'Default lexicographical sort fails on numbers like [1, 2, 10, 1]',
    code: `function containsDuplicate(nums) {
      nums.sort();
      for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i] === nums[i + 1]) return true;
      }
      return false;
    }`,
    isCorrect: false,
    expectedApproach: 'Sorting',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'CD-BUGGY-2',
    family: 'contains-duplicate',
    problemSlug: 'contains-duplicate',
    problemTitle: 'Contains Duplicate',
    description: 'Adjacent check on unsorted array',
    code: `function containsDuplicate(nums) {
      for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i] === nums[i + 1]) return true;
      }
      return false;
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'CD-BUGGY-3',
    family: 'contains-duplicate',
    problemSlug: 'contains-duplicate',
    problemTitle: 'Contains Duplicate',
    description: 'Always returns false for length < 3',
    code: `function containsDuplicate(nums) {
      if (nums.length < 3) return false;
      return new Set(nums).size !== nums.length;
    }`,
    isCorrect: false,
    expectedApproach: 'Hash Map',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'CD-BUGGY-4',
    family: 'contains-duplicate',
    problemSlug: 'contains-duplicate',
    problemTitle: 'Contains Duplicate',
    description: 'Inverted return value',
    code: `function containsDuplicate(nums) {
      return new Set(nums).size === nums.length;
    }`,
    isCorrect: false,
    expectedApproach: 'Hash Map',
    expectedStatus: 'CONFIRMED',
  },

  // ─── 8. BEST TIME TO BUY AND SELL STOCK (5 cases) ────────────────────────
  {
    id: 'BS-STOCK-CORRECT-1',
    family: 'best-time-to-buy-and-sell-stock',
    problemSlug: 'best-time-to-buy-and-sell-stock',
    problemTitle: 'Best Time to Buy and Sell Stock',
    description: 'Single pass minPrice tracking',
    code: `function maxProfit(prices) {
      let minPrice = Infinity, maxP = 0;
      for (const p of prices) {
        minPrice = Math.min(minPrice, p);
        maxP = Math.max(maxP, p - minPrice);
      }
      return maxP;
    }`,
    isCorrect: true,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'REJECTED',
  },
  {
    id: 'BS-STOCK-BUGGY-1',
    family: 'best-time-to-buy-and-sell-stock',
    problemSlug: 'best-time-to-buy-and-sell-stock',
    problemTitle: 'Best Time to Buy and Sell Stock',
    description: 'Selling before buying (takes max - min regardless of order)',
    code: `function maxProfit(prices) {
      if (prices.length === 0) return 0;
      let min = Math.min(...prices);
      let max = Math.max(...prices);
      return max - min;
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'BS-STOCK-BUGGY-2',
    family: 'best-time-to-buy-and-sell-stock',
    problemSlug: 'best-time-to-buy-and-sell-stock',
    problemTitle: 'Best Time to Buy and Sell Stock',
    description: 'MinPrice initialized to 0',
    code: `function maxProfit(prices) {
      let minPrice = 0, maxP = 0;
      for (const p of prices) {
        minPrice = Math.min(minPrice, p);
        maxP = Math.max(maxP, p - minPrice);
      }
      return maxP;
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'BS-STOCK-BUGGY-3',
    family: 'best-time-to-buy-and-sell-stock',
    problemSlug: 'best-time-to-buy-and-sell-stock',
    problemTitle: 'Best Time to Buy and Sell Stock',
    description: 'Initial profit -Infinity fails on single-element prices',
    code: `function maxProfit(prices) {
      let minPrice = prices[0], maxP = -Infinity;
      for (let i = 1; i < prices.length; i++) {
        minPrice = Math.min(minPrice, prices[i]);
        maxP = Math.max(maxP, prices[i] - minPrice);
      }
      return maxP;
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'BS-STOCK-BUGGY-4',
    family: 'best-time-to-buy-and-sell-stock',
    problemSlug: 'best-time-to-buy-and-sell-stock',
    problemTitle: 'Best Time to Buy and Sell Stock',
    description: 'Nested loop starts at j = i allowing sell on same day',
    code: `function maxProfit(prices) {
      let maxP = -1;
      for (let i = 0; i < prices.length; i++) {
        for (let j = i; j < prices.length; j++) {
          if (prices[j] - prices[i] > maxP) maxP = prices[j] - prices[i];
        }
      }
      return maxP;
    }`,
    isCorrect: false,
    expectedApproach: 'Brute Force',
    expectedStatus: 'CONFIRMED',
  },

  // ─── 9. SLIDING WINDOW SUBARRAYS (5 cases) ───────────────────────────────
  {
    id: 'SW-CORRECT-1',
    family: 'sliding-window',
    problemSlug: 'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold',
    problemTitle: 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold',
    description: 'Rolling window sum check',
    code: `function numOfSubarrays(arr, k, threshold) {
      const targetSum = k * threshold;
      let sum = 0, count = 0;
      for (let i = 0; i < k; i++) sum += arr[i];
      if (sum >= targetSum) count++;
      for (let i = k; i < arr.length; i++) {
        sum += arr[i] - arr[i - k];
        if (sum >= targetSum) count++;
      }
      return count;
    }`,
    isCorrect: true,
    expectedApproach: 'Sliding Window',
    expectedStatus: 'REJECTED',
  },
  {
    id: 'SW-BUGGY-1',
    family: 'sliding-window',
    problemSlug: 'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold',
    problemTitle: 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold',
    description: 'Strict inequality sum > targetSum instead of >=',
    code: `function numOfSubarrays(arr, k, threshold) {
      const targetSum = k * threshold;
      let sum = 0, count = 0;
      for (let i = 0; i < k; i++) sum += arr[i];
      if (sum > targetSum) count++;
      for (let i = k; i < arr.length; i++) {
        sum += arr[i] - arr[i - k];
        if (sum > targetSum) count++;
      }
      return count;
    }`,
    isCorrect: false,
    expectedApproach: 'Sliding Window',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'SW-BUGGY-2',
    family: 'sliding-window',
    problemSlug: 'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold',
    problemTitle: 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold',
    description: 'Window subtraction adds instead of subtracts',
    code: `function numOfSubarrays(arr, k, threshold) {
      const targetSum = k * threshold;
      let sum = 0, count = 0;
      for (let i = 0; i < k; i++) sum += arr[i];
      if (sum >= targetSum) count++;
      for (let i = k; i < arr.length; i++) {
        sum += arr[i] + arr[i - k];
        if (sum >= targetSum) count++;
      }
      return count;
    }`,
    isCorrect: false,
    expectedApproach: 'Sliding Window',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'SW-BUGGY-3',
    family: 'sliding-window',
    problemSlug: 'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold',
    problemTitle: 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold',
    description: 'Slice recomputation with off-by-one window end',
    code: `function numOfSubarrays(arr, k, threshold) {
      const targetSum = k * threshold;
      let count = 0;
      for (let i = 0; i <= arr.length - k; i++) {
        let sum = 0;
        for (let j = i; j < i + k - 1; j++) sum += arr[j];
        if (sum >= targetSum) count++;
      }
      return count;
    }`,
    isCorrect: false,
    expectedApproach: 'Brute Force',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'SW-BUGGY-4',
    family: 'sliding-window',
    problemSlug: 'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold',
    problemTitle: 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold',
    description: 'Initial window sum omitted from count',
    code: `function numOfSubarrays(arr, k, threshold) {
      const targetSum = k * threshold;
      let sum = 0, count = 0;
      for (let i = 0; i < k; i++) sum += arr[i];
      for (let i = k; i < arr.length; i++) {
        sum += arr[i] - arr[i - k];
        if (sum >= targetSum) count++;
      }
      return count;
    }`,
    isCorrect: false,
    expectedApproach: 'Sliding Window',
    expectedStatus: 'CONFIRMED',
  },

  // ─── 10. VALID PARENTHESES (5 cases) ─────────────────────────────────────
  {
    id: 'PAREN-CORRECT-1',
    family: 'valid-parentheses',
    problemSlug: 'valid-parentheses',
    problemTitle: 'Valid Parentheses',
    description: 'LIFO Stack matching closing brackets',
    code: `function isValid(s) {
      const stack = [];
      const map = { ')': '(', '}': '{', ']': '[' };
      for (const char of s) {
        if (char === '(' || char === '{' || char === '[') {
          stack.push(char);
        } else if (map[char]) {
          if (stack.pop() !== map[char]) return false;
        }
      }
      return stack.length === 0;
    }`,
    isCorrect: true,
    expectedApproach: 'Stack',
    expectedStatus: 'REJECTED',
  },
  {
    id: 'PAREN-BUGGY-1',
    family: 'valid-parentheses',
    problemSlug: 'valid-parentheses',
    problemTitle: 'Valid Parentheses',
    description: 'Counter-based approach failing on mismatched bracket orders',
    code: `function isValid(s) {
      let p = 0, b = 0, c = 0;
      for (const ch of s) {
        if (ch === '(') p++; else if (ch === ')') p--;
        if (ch === '[') b++; else if (ch === ']') b--;
        if (ch === '{') c++; else if (ch === '}') c--;
        if (p < 0 || b < 0 || c < 0) return false;
      }
      return p === 0 && b === 0 && c === 0;
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'PAREN-BUGGY-2',
    family: 'valid-parentheses',
    problemSlug: 'valid-parentheses',
    problemTitle: 'Valid Parentheses',
    description: 'Stack does not check if stack is empty at end',
    code: `function isValid(s) {
      const stack = [];
      const map = { ')': '(', '}': '{', ']': '[' };
      for (const char of s) {
        if (char === '(' || char === '{' || char === '[') stack.push(char);
        else if (map[char]) {
          if (stack.pop() !== map[char]) return false;
        }
      }
      return true;
    }`,
    isCorrect: false,
    expectedApproach: 'Stack',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'PAREN-BUGGY-3',
    family: 'valid-parentheses',
    problemSlug: 'valid-parentheses',
    problemTitle: 'Valid Parentheses',
    description: 'Closing curly matches square bracket',
    code: `function isValid(s) {
      const stack = [];
      const map = { ')': '(', '}': '[', ']': '[' };
      for (const char of s) {
        if (char === '(' || char === '{' || char === '[') stack.push(char);
        else if (map[char]) {
          if (stack.pop() !== map[char]) return false;
        }
      }
      return stack.length === 0;
    }`,
    isCorrect: false,
    expectedApproach: 'Stack',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'PAREN-BUGGY-4',
    family: 'valid-parentheses',
    problemSlug: 'valid-parentheses',
    problemTitle: 'Valid Parentheses',
    description: 'Odd length early exit omitted and pops from empty stack',
    code: `function isValid(s) {
      const stack = [];
      for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') stack.push(')');
        else if (s[i] === '[') stack.push(']');
        else if (s[i] === '{') stack.push('}');
        else if (stack.length === 0) return false;
        else stack.shift();
      }
      return stack.length === 0;
    }`,
    isCorrect: false,
    expectedApproach: 'Stack',
    expectedStatus: 'CONFIRMED',
  },

  // ─── 11. PHASE 4 TRUSTWORTHINESS & EDGE CASES (7 cases) ───────────────────
  {
    id: 'EDGE-TIMEOUT-1',
    family: 'binary-search',
    problemSlug: 'binary-search',
    problemTitle: 'Binary Search',
    description: 'Infinite loop when target not found (pointers never move)',
    code: `function search(nums, target) {
      let left = 0, right = nums.length - 1;
      while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        // Bug: left and right never updated on mismatch
      }
      return -1;
    }`,
    isCorrect: false,
    expectedApproach: 'Binary Search',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'EDGE-RUNTIME-ERROR-1',
    family: 'move-zeroes',
    problemSlug: 'move-zeroes',
    problemTitle: 'Move Zeroes',
    description: 'Throws TypeError calling undefined method on elements',
    code: `function moveZeroes(nums) {
      for (let i = 0; i < nums.length; i++) {
        nums[i].toUpperCase(); // Throws TypeError on numbers
      }
    }`,
    isCorrect: false,
    expectedApproach: 'Array Traversal',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'EDGE-UNSUPPORTED-ORACLE-1',
    family: 'unknown-custom-problem',
    problemSlug: 'unknown-mystery-game',
    problemTitle: 'Unknown Mystery Game',
    description: 'Custom problem with no canonical contract or oracle',
    code: `function mysteryGame(a, b) {
      return a * b + 42;
    }`,
    isCorrect: true,
    expectedStatus: 'INCONCLUSIVE',
  },
  {
    id: 'EDGE-MULTIPLE-BUGS-1',
    family: 'two-sum',
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    description: 'Both pre-populates map AND inverts subtraction polarity',
    code: `function twoSum(nums, target) {
      const map = new Map();
      for (let i = 0; i < nums.length; i++) map.set(nums[i], i);
      for (let i = 0; i < nums.length; i++) {
        const comp = target + nums[i]; // Bug 1: + instead of -
        if (map.has(comp)) return [i, map.get(comp)]; // Bug 2: self-pair
      }
      return [];
    }`,
    isCorrect: false,
    expectedApproach: 'Hash Map',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'EDGE-IN-PLACE-RETURN-MISMATCH-1',
    family: 'sort-colors',
    problemSlug: 'sort-colors',
    problemTitle: 'Sort Colors',
    description: 'Returns newly allocated copy instead of mutating in-place',
    code: `function sortColors(nums) {
      return [...nums].sort((a, b) => a - b); // Fails in-place contract
    }`,
    isCorrect: false,
    expectedApproach: 'Sorting',
    expectedStatus: 'CONFIRMED',
  },
  {
    id: 'EDGE-EXTREME-CONSTRAINTS-1',
    family: 'maximum-subarray',
    problemSlug: 'maximum-subarray',
    problemTitle: 'Maximum Subarray',
    description: 'Handles 10^5 constraints with linear O(N) Kadane',
    code: `function maxSubArray(nums) {
      let max = nums[0], cur = nums[0];
      for (let i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        max = Math.max(max, cur);
      }
      return max;
    }`,
    isCorrect: true,
    expectedApproach: 'Dynamic Programming',
    expectedStatus: 'REJECTED',
    expectedPerformance: 'WITHIN_EXPECTATION',
  },
  {
    id: 'EDGE-UNUSUAL-CORRECT-1',
    family: 'contains-duplicate',
    problemSlug: 'contains-duplicate',
    problemTitle: 'Contains Duplicate',
    description: 'Correct recursive partition duplicate finder',
    code: `function containsDuplicate(nums) {
      const seen = Object.create(null);
      for (let i = 0; i < nums.length; i++) {
        if (seen[nums[i]]) return true;
        seen[nums[i]] = true;
      }
      return false;
    }`,
    isCorrect: true,
    expectedApproach: 'Hash Map',
    expectedStatus: 'REJECTED',
    expectedPerformance: 'WITHIN_EXPECTATION',
  },
];
