/**
 * src/lib/dsa-roadmap/topic-data.ts
 *
 * Comprehensive DSA Curriculum & Pattern Taxonomy for Topic Explorer.
 *
 * Structure:
 * Level 0: Root ("dsa-roadmap")
 * Level 1: 12 Main Topics (All visible by default)
 * Level 2: Subtopics / Patterns (Accordion expansion under parent)
 * Level 3: Practice Problems (5 per node, ordered Easy -> Hard, rendered in sidebar)
 */

export interface PracticeProblem {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  url?: string;
  slug?: string;
  sharedWith?: string[]; // IDs of other subtopics this problem also appears under
}

export interface TopicNode {
  id: string;
  name: string;
  level: 0 | 1 | 2;
  parentId?: string;
  tier?: 'basic' | 'intermediate' | 'advanced';
  icon?: string;
  summary?: string;
  problems: PracticeProblem[]; // exactly 5, ordered Easy -> Hard
}

export const ROOT_NODE: TopicNode = {
  id: 'dsa-roadmap',
  name: 'DSA Roadmap',
  level: 0,
  summary: 'Curated curriculum spanning foundational to advanced algorithm patterns.',
  problems: [
    { title: 'Two Sum', difficulty: 'Easy', slug: 'two-sum', url: 'https://leetcode.com/problems/two-sum' },
    { title: 'Valid Parentheses', difficulty: 'Easy', slug: 'valid-parentheses', url: 'https://leetcode.com/problems/valid-parentheses' },
    { title: 'Binary Search', difficulty: 'Easy', slug: 'binary-search', url: 'https://leetcode.com/problems/binary-search' },
    { title: 'Number of Islands', difficulty: 'Medium', slug: 'number-of-islands', url: 'https://leetcode.com/problems/number-of-islands' },
    { title: 'Trapping Rain Water', difficulty: 'Hard', slug: 'trapping-rain-water', url: 'https://leetcode.com/problems/trapping-rain-water' },
  ],
};

// ─── 12 Predefined Main Topics (Level 1) ─────────────────────────────────────

export const MAIN_TOPICS: TopicNode[] = [
  {
    id: 'arrays',
    name: 'Arrays',
    level: 1,
    tier: 'basic',
    icon: 'Layers',
    summary: 'Contiguous memory structures, two pointers, sliding windows, and prefix accumulators.',
    problems: [
      { title: 'Two Sum', difficulty: 'Easy', slug: 'two-sum', url: 'https://leetcode.com/problems/two-sum' },
      { title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', slug: 'best-time-to-buy-and-sell-stock', url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock', sharedWith: ['sliding-window', 'kadanes-algorithm'] },
      { title: 'Maximum Subarray', difficulty: 'Medium', slug: 'maximum-subarray', url: 'https://leetcode.com/problems/maximum-subarray', sharedWith: ['kadanes-algorithm'] },
      { title: 'Product of Array Except Self', difficulty: 'Medium', slug: 'product-of-array-except-self', url: 'https://leetcode.com/problems/product-of-array-except-self', sharedWith: ['prefix-sum'] },
      { title: 'First Missing Positive', difficulty: 'Hard', slug: 'first-missing-positive', url: 'https://leetcode.com/problems/first-missing-positive' },
    ],
  },
  {
    id: 'binary-search',
    name: 'Binary Search',
    level: 1,
    tier: 'basic',
    icon: 'Search',
    summary: 'Logarithmic search dividing the search space by half on sorted inputs or monotonic conditions.',
    problems: [
      { title: 'Binary Search', difficulty: 'Easy', slug: 'binary-search', url: 'https://leetcode.com/problems/binary-search' },
      { title: 'Search Insert Position', difficulty: 'Easy', slug: 'search-insert-position', url: 'https://leetcode.com/problems/search-insert-position' },
      { title: 'Search in Rotated Sorted Array', difficulty: 'Medium', slug: 'search-in-rotated-sorted-array', url: 'https://leetcode.com/problems/search-in-rotated-sorted-array' },
      { title: 'Find First and Last Position of Element', difficulty: 'Medium', slug: 'find-first-and-last-position-of-element-in-sorted-array', url: 'https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array' },
      { title: 'Median of Two Sorted Arrays', difficulty: 'Hard', slug: 'median-of-two-sorted-arrays', url: 'https://leetcode.com/problems/median-of-two-sorted-arrays' },
    ],
  },
  {
    id: 'strings',
    name: 'Strings',
    level: 1,
    tier: 'basic',
    icon: 'Type',
    summary: 'Character arrays, palindrome verification, sliding window substrings, and pattern matching.',
    problems: [
      { title: 'Valid Palindrome', difficulty: 'Easy', slug: 'valid-palindrome', url: 'https://leetcode.com/problems/valid-palindrome' },
      { title: 'Valid Anagram', difficulty: 'Easy', slug: 'valid-anagram', url: 'https://leetcode.com/problems/valid-anagram' },
      { title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', slug: 'longest-substring-without-repeating-characters', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters', sharedWith: ['sliding-window'] },
      { title: 'Group Anagrams', difficulty: 'Medium', slug: 'group-anagrams', url: 'https://leetcode.com/problems/group-anagrams' },
      { title: 'Minimum Window Substring', difficulty: 'Hard', slug: 'minimum-window-substring', url: 'https://leetcode.com/problems/minimum-window-substring', sharedWith: ['sliding-window'] },
    ],
  },
  {
    id: 'linked-list',
    name: 'Linked List',
    level: 1,
    tier: 'basic',
    icon: 'GitCommit',
    summary: 'Node-pointer structures, pointer reversals, cycle detection with fast/slow pointers, and dummy heads.',
    problems: [
      { title: 'Reverse Linked List', difficulty: 'Easy', slug: 'reverse-linked-list', url: 'https://leetcode.com/problems/reverse-linked-list' },
      { title: 'Linked List Cycle', difficulty: 'Easy', slug: 'linked-list-cycle', url: 'https://leetcode.com/problems/linked-list-cycle' },
      { title: 'Merge Two Sorted Lists', difficulty: 'Easy', slug: 'merge-two-sorted-lists', url: 'https://leetcode.com/problems/merge-two-sorted-lists' },
      { title: 'Remove Nth Node From End of List', difficulty: 'Medium', slug: 'remove-nth-node-from-end-of-list', url: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list' },
      { title: 'Merge k Sorted Lists', difficulty: 'Hard', slug: 'merge-k-sorted-lists', url: 'https://leetcode.com/problems/merge-k-sorted-lists', sharedWith: ['heap-priority-queue'] },
    ],
  },
  {
    id: 'stack-queue',
    name: 'Stack & Queue',
    level: 1,
    tier: 'basic',
    icon: 'Layers2',
    summary: 'LIFO and FIFO data buffers, monotonic stacks, bracket validation, and level-order traversal queues.',
    problems: [
      { title: 'Valid Parentheses', difficulty: 'Easy', slug: 'valid-parentheses', url: 'https://leetcode.com/problems/valid-parentheses' },
      { title: 'Implement Queue using Stacks', difficulty: 'Easy', slug: 'implement-queue-using-stacks', url: 'https://leetcode.com/problems/implement-queue-using-stacks' },
      { title: 'Min Stack', difficulty: 'Medium', slug: 'min-stack', url: 'https://leetcode.com/problems/min-stack' },
      { title: 'Daily Temperatures', difficulty: 'Medium', slug: 'daily-temperatures', url: 'https://leetcode.com/problems/daily-temperatures', sharedWith: ['monotonic-stack'] },
      { title: 'Largest Rectangle in Histogram', difficulty: 'Hard', slug: 'largest-rectangle-in-histogram', url: 'https://leetcode.com/problems/largest-rectangle-in-histogram', sharedWith: ['monotonic-stack'] },
    ],
  },
  {
    id: 'trees',
    name: 'Trees',
    level: 1,
    tier: 'intermediate',
    icon: 'BinaryTree',
    summary: 'Hierarchical node trees, depth-first and breadth-first traversals, BST invariance, and tree DP.',
    problems: [
      { title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', slug: 'maximum-depth-of-binary-tree', url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree' },
      { title: 'Invert Binary Tree', difficulty: 'Easy', slug: 'invert-binary-tree', url: 'https://leetcode.com/problems/invert-binary-tree' },
      { title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', slug: 'binary-tree-level-order-traversal', url: 'https://leetcode.com/problems/binary-tree-level-order-traversal' },
      { title: 'Validate Binary Search Tree', difficulty: 'Medium', slug: 'validate-binary-search-tree', url: 'https://leetcode.com/problems/validate-binary-search-tree' },
      { title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', slug: 'binary-tree-maximum-path-sum', url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum' },
    ],
  },
  {
    id: 'heap-priority-queue',
    name: 'Heap',
    level: 1,
    tier: 'intermediate',
    icon: 'BarChart2',
    summary: 'Min/Max binary heaps providing O(1) top access and O(log n) insertions for streaming K problems.',
    problems: [
      { title: 'Last Stone Weight', difficulty: 'Easy', slug: 'last-stone-weight', url: 'https://leetcode.com/problems/last-stone-weight' },
      { title: 'Kth Largest Element in an Array', difficulty: 'Medium', slug: 'kth-largest-element-in-an-array', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array' },
      { title: 'Top K Frequent Elements', difficulty: 'Medium', slug: 'top-k-frequent-elements', url: 'https://leetcode.com/problems/top-k-frequent-elements' },
      { title: 'Find Median from Data Stream', difficulty: 'Hard', slug: 'find-median-from-data-stream', url: 'https://leetcode.com/problems/find-median-from-data-stream' },
      { title: 'Merge k Sorted Lists', difficulty: 'Hard', slug: 'merge-k-sorted-lists', url: 'https://leetcode.com/problems/merge-k-sorted-lists', sharedWith: ['linked-list'] },
    ],
  },
  {
    id: 'greedy',
    name: 'Greedy',
    level: 1,
    tier: 'intermediate',
    icon: 'Zap',
    summary: 'Making locally optimal choices at each step that prove globally optimal without backtracking.',
    problems: [
      { title: 'Assign Cookies', difficulty: 'Easy', slug: 'assign-cookies', url: 'https://leetcode.com/problems/assign-cookies' },
      { title: 'Best Time to Buy and Sell Stock II', difficulty: 'Medium', slug: 'best-time-to-buy-and-sell-stock-ii', url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii' },
      { title: 'Jump Game', difficulty: 'Medium', slug: 'jump-game', url: 'https://leetcode.com/problems/jump-game' },
      { title: 'Gas Station', difficulty: 'Medium', slug: 'gas-station', url: 'https://leetcode.com/problems/gas-station' },
      { title: 'Candy', difficulty: 'Hard', slug: 'candy', url: 'https://leetcode.com/problems/candy' },
    ],
  },
  {
    id: 'backtracking',
    name: 'Backtracking',
    level: 1,
    tier: 'intermediate',
    icon: 'Undo2',
    summary: 'State-space exploration with recursive choices, constraint verification, and systematic pruning.',
    problems: [
      { title: 'Binary Watch', difficulty: 'Easy', slug: 'binary-watch', url: 'https://leetcode.com/problems/binary-watch' },
      { title: 'Subsets', difficulty: 'Medium', slug: 'subsets', url: 'https://leetcode.com/problems/subsets' },
      { title: 'Permutations', difficulty: 'Medium', slug: 'permutations', url: 'https://leetcode.com/problems/permutations' },
      { title: 'Combination Sum', difficulty: 'Medium', slug: 'combination-sum', url: 'https://leetcode.com/problems/combination-sum' },
      { title: 'N-Queens', difficulty: 'Hard', slug: 'n-queens', url: 'https://leetcode.com/problems/n-queens' },
    ],
  },
  {
    id: 'graphs',
    name: 'Graphs',
    level: 1,
    tier: 'advanced',
    icon: 'Network',
    summary: 'Vertex and edge networks, BFS shortest paths, DFS flood-fill, topological ordering, and disjoint sets.',
    problems: [
      { title: 'Find if Path Exists in Graph', difficulty: 'Easy', slug: 'find-if-path-exists-in-graph', url: 'https://leetcode.com/problems/find-if-path-exists-in-graph' },
      { title: 'Number of Islands', difficulty: 'Medium', slug: 'number-of-islands', url: 'https://leetcode.com/problems/number-of-islands' },
      { title: 'Clone Graph', difficulty: 'Medium', slug: 'clone-graph', url: 'https://leetcode.com/problems/clone-graph' },
      { title: 'Course Schedule', difficulty: 'Medium', slug: 'course-schedule', url: 'https://leetcode.com/problems/course-schedule' },
      { title: 'Word Ladder', difficulty: 'Hard', slug: 'word-ladder', url: 'https://leetcode.com/problems/word-ladder' },
    ],
  },
  {
    id: 'dynamic-programming',
    name: 'Dynamic Programming',
    level: 1,
    tier: 'advanced',
    icon: 'Cpu',
    summary: 'Decomposing complex problems into overlapping subproblems with memoization and bottom-up tables.',
    problems: [
      { title: 'Climbing Stairs', difficulty: 'Easy', slug: 'climbing-stairs', url: 'https://leetcode.com/problems/climbing-stairs' },
      { title: 'House Robber', difficulty: 'Medium', slug: 'house-robber', url: 'https://leetcode.com/problems/house-robber' },
      { title: 'Coin Change', difficulty: 'Medium', slug: 'coin-change', url: 'https://leetcode.com/problems/coin-change' },
      { title: 'Longest Increasing Subsequence', difficulty: 'Medium', slug: 'longest-increasing-subsequence', url: 'https://leetcode.com/problems/longest-increasing-subsequence' },
      { title: 'Edit Distance', difficulty: 'Hard', slug: 'edit-distance', url: 'https://leetcode.com/problems/edit-distance' },
    ],
  },
  {
    id: 'bit-manipulation',
    name: 'Bit Manipulation',
    level: 1,
    tier: 'advanced',
    icon: 'Binary',
    summary: 'Low-level bitwise operations (AND, OR, XOR, shifts) for constant-space arithmetic and subset masks.',
    problems: [
      { title: 'Single Number', difficulty: 'Easy', slug: 'single-number', url: 'https://leetcode.com/problems/single-number' },
      { title: 'Number of 1 Bits', difficulty: 'Easy', slug: 'number-of-1-bits', url: 'https://leetcode.com/problems/number-of-1-bits' },
      { title: 'Counting Bits', difficulty: 'Easy', slug: 'counting-bits', url: 'https://leetcode.com/problems/counting-bits' },
      { title: 'Bitwise AND of Numbers Range', difficulty: 'Medium', slug: 'bitwise-and-of-numbers-range', url: 'https://leetcode.com/problems/bitwise-and-of-numbers-range' },
      { title: 'Single Number II', difficulty: 'Medium', slug: 'single-number-ii', url: 'https://leetcode.com/problems/single-number-ii' },
    ],
  },
];

// ─── Subtopics & Patterns (Level 2) ──────────────────────────────────────────

export const SUBTOPICS: TopicNode[] = [
  // ── Arrays Subtopics ──
  {
    id: 'two-pointers',
    name: 'Two Pointers',
    level: 2,
    parentId: 'arrays',
    summary: 'Converging or parallel indices navigating array bounds in linear time.',
    problems: [
      { title: 'Two Sum II - Input Array Is Sorted', difficulty: 'Medium', slug: 'two-sum-ii-input-array-is-sorted', url: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted' },
      { title: '3Sum', difficulty: 'Medium', slug: '3sum', url: 'https://leetcode.com/problems/3sum' },
      { title: 'Container With Most Water', difficulty: 'Medium', slug: 'container-with-most-water', url: 'https://leetcode.com/problems/container-with-most-water' },
      { title: 'Remove Duplicates from Sorted Array', difficulty: 'Easy', slug: 'remove-duplicates-from-sorted-array', url: 'https://leetcode.com/problems/remove-duplicates-from-sorted-array' },
      { title: 'Trapping Rain Water', difficulty: 'Hard', slug: 'trapping-rain-water', url: 'https://leetcode.com/problems/trapping-rain-water', sharedWith: ['monotonic-stack'] },
    ],
  },
  {
    id: 'sliding-window',
    name: 'Sliding Window',
    level: 2,
    parentId: 'arrays',
    summary: 'Dynamic contiguous subarray bounds expanding and shrinking to satisfy frequency constraints.',
    problems: [
      { title: 'Maximum Average Subarray I', difficulty: 'Easy', slug: 'maximum-average-subarray-i', url: 'https://leetcode.com/problems/maximum-average-subarray-i' },
      { title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', slug: 'longest-substring-without-repeating-characters', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters', sharedWith: ['strings'] },
      { title: 'Minimum Size Subarray Sum', difficulty: 'Medium', slug: 'minimum-size-subarray-sum', url: 'https://leetcode.com/problems/minimum-size-subarray-sum' },
      { title: 'Permutation in String', difficulty: 'Medium', slug: 'permutation-in-string', url: 'https://leetcode.com/problems/permutation-in-string' },
      { title: 'Sliding Window Maximum', difficulty: 'Hard', slug: 'sliding-window-maximum', url: 'https://leetcode.com/problems/sliding-window-maximum', sharedWith: ['monotonic-deque'] },
    ],
  },
  {
    id: 'prefix-sum',
    name: 'Prefix Sum',
    level: 2,
    parentId: 'arrays',
    summary: 'Precomputed cumulative sums providing O(1) range sum queries and subarray modulo matching.',
    problems: [
      { title: 'Range Sum Query - Immutable', difficulty: 'Easy', slug: 'range-sum-query-immutable', url: 'https://leetcode.com/problems/range-sum-query-immutable' },
      { title: 'Find Pivot Index', difficulty: 'Easy', slug: 'find-pivot-index', url: 'https://leetcode.com/problems/find-pivot-index' },
      { title: 'Subarray Sum Equals K', difficulty: 'Medium', slug: 'subarray-sum-equals-k', url: 'https://leetcode.com/problems/subarray-sum-equals-k' },
      { title: 'Continuous Subarray Sum', difficulty: 'Medium', slug: 'continuous-subarray-sum', url: 'https://leetcode.com/problems/continuous-subarray-sum' },
      { title: 'Subarray Sums Divisible by K', difficulty: 'Medium', slug: 'subarray-sums-divisible-by-k', url: 'https://leetcode.com/problems/subarray-sums-divisible-by-k' },
    ],
  },
  {
    id: 'kadanes-algorithm',
    name: "Kadane's Algorithm",
    level: 2,
    parentId: 'arrays',
    summary: 'Tracking optimal contiguous subarray sum by resetting running accumulator upon negative contributions.',
    problems: [
      { title: 'Maximum Subarray', difficulty: 'Medium', slug: 'maximum-subarray', url: 'https://leetcode.com/problems/maximum-subarray', sharedWith: ['arrays'] },
      { title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', slug: 'best-time-to-buy-and-sell-stock', url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock', sharedWith: ['arrays'] },
      { title: 'Maximum Sum Circular Subarray', difficulty: 'Medium', slug: 'maximum-sum-circular-subarray', url: 'https://leetcode.com/problems/maximum-sum-circular-subarray' },
      { title: 'Maximum Product Subarray', difficulty: 'Medium', slug: 'maximum-product-subarray', url: 'https://leetcode.com/problems/maximum-product-subarray' },
      { title: 'Maximum Absolute Sum of Any Subarray', difficulty: 'Medium', slug: 'maximum-absolute-sum-of-any-subarray', url: 'https://leetcode.com/problems/maximum-absolute-sum-of-any-subarray' },
    ],
  },
  {
    id: 'in-place-array-matrix',
    name: 'In-Place Manipulation',
    level: 2,
    parentId: 'arrays',
    summary: 'Modifying array elements or rotating matrices using O(1) auxiliary space.',
    problems: [
      { title: 'Move Zeroes', difficulty: 'Easy', slug: 'move-zeroes', url: 'https://leetcode.com/problems/move-zeroes' },
      { title: 'Rotate Array', difficulty: 'Medium', slug: 'rotate-array', url: 'https://leetcode.com/problems/rotate-array' },
      { title: 'Rotate Image', difficulty: 'Medium', slug: 'rotate-image', url: 'https://leetcode.com/problems/rotate-image' },
      { title: 'Set Matrix Zeroes', difficulty: 'Medium', slug: 'set-matrix-zeroes', url: 'https://leetcode.com/problems/set-matrix-zeroes' },
      { title: 'Game of Life', difficulty: 'Medium', slug: 'game-of-life', url: 'https://leetcode.com/problems/game-of-life' },
    ],
  },

  // ── Binary Search Subtopics ──
  {
    id: 'bs-standard',
    name: 'Standard Search',
    level: 2,
    parentId: 'binary-search',
    summary: 'Exact target matching in strictly ascending sequences with (lo + hi) // 2 interval convergence.',
    problems: [
      { title: 'Binary Search', difficulty: 'Easy', slug: 'binary-search', url: 'https://leetcode.com/problems/binary-search' },
      { title: 'Guess Number Higher or Lower', difficulty: 'Easy', slug: 'guess-number-higher-or-lower', url: 'https://leetcode.com/problems/guess-number-higher-or-lower' },
      { title: 'Search Insert Position', difficulty: 'Easy', slug: 'search-insert-position', url: 'https://leetcode.com/problems/search-insert-position' },
      { title: 'Arranging Coins', difficulty: 'Easy', slug: 'arranging-coins', url: 'https://leetcode.com/problems/arranging-coins' },
      { title: 'Find Peak Element', difficulty: 'Medium', slug: 'find-peak-element', url: 'https://leetcode.com/problems/find-peak-element' },
    ],
  },
  {
    id: 'bs-boundaries',
    name: 'First & Last Occurrence',
    level: 2,
    parentId: 'binary-search',
    summary: 'Biasing binary search to continue left or right upon equality to identify interval boundaries.',
    problems: [
      { title: 'First Bad Version', difficulty: 'Easy', slug: 'first-bad-version', url: 'https://leetcode.com/problems/first-bad-version' },
      { title: 'Find First and Last Position of Element', difficulty: 'Medium', slug: 'find-first-and-last-position-of-element-in-sorted-array', url: 'https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array' },
      { title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', slug: 'find-minimum-in-rotated-sorted-array', url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array' },
      { title: 'Single Element in a Sorted Array', difficulty: 'Medium', slug: 'single-element-in-a-sorted-array', url: 'https://leetcode.com/problems/single-element-in-a-sorted-array' },
      { title: 'Find Minimum in Rotated Sorted Array II', difficulty: 'Hard', slug: 'find-minimum-in-rotated-sorted-array-ii', url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array-ii' },
    ],
  },
  {
    id: 'bs-rotated',
    name: 'Rotated Sorted Array',
    level: 2,
    parentId: 'binary-search',
    summary: 'Detecting sorted halves in circular shifts to discard non-viable search spaces.',
    problems: [
      { title: 'Search in Rotated Sorted Array', difficulty: 'Medium', slug: 'search-in-rotated-sorted-array', url: 'https://leetcode.com/problems/search-in-rotated-sorted-array' },
      { title: 'Search in Rotated Sorted Array II', difficulty: 'Medium', slug: 'search-in-rotated-sorted-array-ii', url: 'https://leetcode.com/problems/search-in-rotated-sorted-array-ii' },
      { title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', slug: 'find-minimum-in-rotated-sorted-array', url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array' },
      { title: 'Check if Array Is Sorted and Rotated', difficulty: 'Easy', slug: 'check-if-array-is-sorted-and-rotated', url: 'https://leetcode.com/problems/check-if-array-is-sorted-and-rotated' },
      { title: 'Find Peak Element', difficulty: 'Medium', slug: 'find-peak-element', url: 'https://leetcode.com/problems/find-peak-element' },
    ],
  },
  {
    id: 'bs-answer',
    name: 'Binary Search on Answer',
    level: 2,
    parentId: 'binary-search',
    summary: 'Applying binary search on the solution space when feasibility condition is monotonic.',
    problems: [
      { title: 'Sqrt(x)', difficulty: 'Easy', slug: 'sqrtx', url: 'https://leetcode.com/problems/sqrtx' },
      { title: 'Koko Eating Bananas', difficulty: 'Medium', slug: 'koko-eating-bananas', url: 'https://leetcode.com/problems/koko-eating-bananas' },
      { title: 'Capacity To Ship Packages Within D Days', difficulty: 'Medium', slug: 'capacity-to-ship-packages-within-d-days', url: 'https://leetcode.com/problems/capacity-to-ship-packages-within-d-days' },
      { title: 'Split Array Largest Sum', difficulty: 'Hard', slug: 'split-array-largest-sum', url: 'https://leetcode.com/problems/split-array-largest-sum' },
      { title: 'Median of Two Sorted Arrays', difficulty: 'Hard', slug: 'median-of-two-sorted-arrays', url: 'https://leetcode.com/problems/median-of-two-sorted-arrays' },
    ],
  },
  {
    id: 'bs-matrix',
    name: '2D Matrix Search',
    level: 2,
    parentId: 'binary-search',
    summary: 'Navigating 2D row/column sorted grids via index mapping or top-right/bottom-left pointer elimination.',
    problems: [
      { title: 'Search a 2D Matrix', difficulty: 'Medium', slug: 'search-a-2d-matrix', url: 'https://leetcode.com/problems/search-a-2d-matrix' },
      { title: 'Search a 2D Matrix II', difficulty: 'Medium', slug: 'search-a-2d-matrix-ii', url: 'https://leetcode.com/problems/search-a-2d-matrix-ii' },
      { title: 'Kth Smallest Element in a Sorted Matrix', difficulty: 'Medium', slug: 'kth-smallest-element-in-a-sorted-matrix', url: 'https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix', sharedWith: ['heap-priority-queue'] },
      { title: 'Find a Peak Element II', difficulty: 'Medium', slug: 'find-a-peak-element-ii', url: 'https://leetcode.com/problems/find-a-peak-element-ii' },
      { title: 'Count Negative Numbers in a Sorted Matrix', difficulty: 'Easy', slug: 'count-negative-numbers-in-a-sorted-matrix', url: 'https://leetcode.com/problems/count-negative-numbers-in-a-sorted-matrix' },
    ],
  },

  // ── Strings Subtopics ──
  {
    id: 'str-palindrome',
    name: 'Palindrome & Two Pointers',
    level: 2,
    parentId: 'strings',
    summary: 'Checking symmetric string matching from boundaries inward or expanding from centers.',
    problems: [
      { title: 'Valid Palindrome', difficulty: 'Easy', slug: 'valid-palindrome', url: 'https://leetcode.com/problems/valid-palindrome' },
      { title: 'Valid Palindrome II', difficulty: 'Easy', slug: 'valid-palindrome-ii', url: 'https://leetcode.com/problems/valid-palindrome-ii' },
      { title: 'Longest Palindromic Substring', difficulty: 'Medium', slug: 'longest-palindromic-substring', url: 'https://leetcode.com/problems/longest-palindromic-substring' },
      { title: 'Palindromic Substrings', difficulty: 'Medium', slug: 'palindromic-substrings', url: 'https://leetcode.com/problems/palindromic-substrings' },
      { title: 'Shortest Palindrome', difficulty: 'Hard', slug: 'shortest-palindrome', url: 'https://leetcode.com/problems/shortest-palindrome' },
    ],
  },
  {
    id: 'str-anagrams',
    name: 'Anagrams & Frequency Maps',
    level: 2,
    parentId: 'strings',
    summary: 'Character count hashing and canonical sorting to group anagrams and match frequencies.',
    problems: [
      { title: 'Valid Anagram', difficulty: 'Easy', slug: 'valid-anagram', url: 'https://leetcode.com/problems/valid-anagram' },
      { title: 'Ransom Note', difficulty: 'Easy', slug: 'ransom-note', url: 'https://leetcode.com/problems/ransom-note' },
      { title: 'Group Anagrams', difficulty: 'Medium', slug: 'group-anagrams', url: 'https://leetcode.com/problems/group-anagrams' },
      { title: 'Find All Anagrams in a String', difficulty: 'Medium', slug: 'find-all-anagrams-in-a-string', url: 'https://leetcode.com/problems/find-all-anagrams-in-a-string', sharedWith: ['sliding-window'] },
      { title: 'Sort Characters By Frequency', difficulty: 'Medium', slug: 'sort-characters-by-frequency', url: 'https://leetcode.com/problems/sort-characters-by-frequency' },
    ],
  },
  {
    id: 'str-matching',
    name: 'String Matching & KMP',
    level: 2,
    parentId: 'strings',
    summary: 'Substring search using prefix function tables (LPS), rolling hashes (Rabin-Karp), or tries.',
    problems: [
      { title: 'Find the Index of the First Occurrence in a String', difficulty: 'Easy', slug: 'find-the-index-of-the-first-occurrence-in-a-string', url: 'https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string' },
      { title: 'Repeated Substring Pattern', difficulty: 'Easy', slug: 'repeated-substring-pattern', url: 'https://leetcode.com/problems/repeated-substring-pattern' },
      { title: 'Longest Happy Prefix', difficulty: 'Hard', slug: 'longest-happy-prefix', url: 'https://leetcode.com/problems/longest-happy-prefix' },
      { title: 'Shortest Palindrome', difficulty: 'Hard', slug: 'shortest-palindrome', url: 'https://leetcode.com/problems/shortest-palindrome' },
      { title: 'Distinct Echo Substrings', difficulty: 'Hard', slug: 'distinct-echo-substrings', url: 'https://leetcode.com/problems/distinct-echo-substrings' },
    ],
  },
  {
    id: 'str-simulation',
    name: 'Parsing & String Simulation',
    level: 2,
    parentId: 'strings',
    summary: 'Step-by-step string transformations, Roman numeral conversions, and expression evaluation.',
    problems: [
      { title: 'Roman to Integer', difficulty: 'Easy', slug: 'roman-to-integer', url: 'https://leetcode.com/problems/roman-to-integer' },
      { title: 'String to Integer (atoi)', difficulty: 'Medium', slug: 'string-to-integer-atoi', url: 'https://leetcode.com/problems/string-to-integer-atoi' },
      { title: 'Multiply Strings', difficulty: 'Medium', slug: 'multiply-strings', url: 'https://leetcode.com/problems/multiply-strings' },
      { title: 'Basic Calculator II', difficulty: 'Medium', slug: 'basic-calculator-ii', url: 'https://leetcode.com/problems/basic-calculator-ii', sharedWith: ['stack-queue'] },
      { title: 'Text Justification', difficulty: 'Hard', slug: 'text-justification', url: 'https://leetcode.com/problems/text-justification' },
    ],
  },

  // ── Linked List Subtopics ──
  {
    id: 'll-fast-slow',
    name: 'Fast & Slow Pointers',
    level: 2,
    parentId: 'linked-list',
    summary: 'Floyds cycle-finding algorithm to detect loops and locate list midpoints.',
    problems: [
      { title: 'Middle of the Linked List', difficulty: 'Easy', slug: 'middle-of-the-linked-list', url: 'https://leetcode.com/problems/middle-of-the-linked-list' },
      { title: 'Linked List Cycle', difficulty: 'Easy', slug: 'linked-list-cycle', url: 'https://leetcode.com/problems/linked-list-cycle' },
      { title: 'Linked List Cycle II', difficulty: 'Medium', slug: 'linked-list-cycle-ii', url: 'https://leetcode.com/problems/linked-list-cycle-ii' },
      { title: 'Palindrome Linked List', difficulty: 'Easy', slug: 'palindrome-linked-list', url: 'https://leetcode.com/problems/palindrome-linked-list' },
      { title: 'Reorder List', difficulty: 'Medium', slug: 'reorder-list', url: 'https://leetcode.com/problems/reorder-list' },
    ],
  },
  {
    id: 'll-reversal',
    name: 'Reversal Techniques',
    level: 2,
    parentId: 'linked-list',
    summary: 'Iterative 3-pointer reversals and sub-segment reversals in single-pass.',
    problems: [
      { title: 'Reverse Linked List', difficulty: 'Easy', slug: 'reverse-linked-list', url: 'https://leetcode.com/problems/reverse-linked-list' },
      { title: 'Reverse Linked List II', difficulty: 'Medium', slug: 'reverse-linked-list-ii', url: 'https://leetcode.com/problems/reverse-linked-list-ii' },
      { title: 'Swap Nodes in Pairs', difficulty: 'Medium', slug: 'swap-nodes-in-pairs', url: 'https://leetcode.com/problems/swap-nodes-in-pairs' },
      { title: 'Reverse Nodes in k-Group', difficulty: 'Hard', slug: 'reverse-nodes-in-k-group', url: 'https://leetcode.com/problems/reverse-nodes-in-k-group' },
      { title: 'Odd Even Linked List', difficulty: 'Medium', slug: 'odd-even-linked-list', url: 'https://leetcode.com/problems/odd-even-linked-list' },
    ],
  },
  {
    id: 'll-merge-sort',
    name: 'Merge & Sort Lists',
    level: 2,
    parentId: 'linked-list',
    summary: 'Divide-and-conquer merge sort on linked lists with O(log n) stack space.',
    problems: [
      { title: 'Merge Two Sorted Lists', difficulty: 'Easy', slug: 'merge-two-sorted-lists', url: 'https://leetcode.com/problems/merge-two-sorted-lists' },
      { title: 'Sort List', difficulty: 'Medium', slug: 'sort-list', url: 'https://leetcode.com/problems/sort-list' },
      { title: 'Insertion Sort List', difficulty: 'Medium', slug: 'insertion-sort-list', url: 'https://leetcode.com/problems/insertion-sort-list' },
      { title: 'Partition List', difficulty: 'Medium', slug: 'partition-list', url: 'https://leetcode.com/problems/partition-list' },
      { title: 'Merge k Sorted Lists', difficulty: 'Hard', slug: 'merge-k-sorted-lists', url: 'https://leetcode.com/problems/merge-k-sorted-lists', sharedWith: ['heap-priority-queue'] },
    ],
  },
  {
    id: 'll-complex',
    name: 'Complex Pointer Data Structures',
    level: 2,
    parentId: 'linked-list',
    summary: 'Doubly linked lists combined with hash maps for constant-time lookups and evictions.',
    problems: [
      { title: 'LRU Cache', difficulty: 'Medium', slug: 'lru-cache', url: 'https://leetcode.com/problems/lru-cache' },
      { title: 'Copy List with Random Pointer', difficulty: 'Medium', slug: 'copy-list-with-random-pointer', url: 'https://leetcode.com/problems/copy-list-with-random-pointer' },
      { title: 'LFU Cache', difficulty: 'Hard', slug: 'lfu-cache', url: 'https://leetcode.com/problems/lfu-cache' },
      { title: 'Flatten a Multilevel Doubly Linked List', difficulty: 'Medium', slug: 'flatten-a-multilevel-doubly-linked-list', url: 'https://leetcode.com/problems/flatten-a-multilevel-doubly-linked-list' },
      { title: 'Design Linked List', difficulty: 'Medium', slug: 'design-linked-list', url: 'https://leetcode.com/problems/design-linked-list' },
    ],
  },

  // ── Stack & Queue Subtopics ──
  {
    id: 'stack-parentheses',
    name: 'Parentheses & Syntax Validation',
    level: 2,
    parentId: 'stack-queue',
    summary: 'Pushing openings and popping matching closures to validate grammar or collapse duplicates.',
    problems: [
      { title: 'Valid Parentheses', difficulty: 'Easy', slug: 'valid-parentheses', url: 'https://leetcode.com/problems/valid-parentheses' },
      { title: 'Remove All Adjacent Duplicates In String', difficulty: 'Easy', slug: 'remove-all-adjacent-duplicates-in-string', url: 'https://leetcode.com/problems/remove-all-adjacent-duplicates-in-string', sharedWith: ['strings'] },
      { title: 'Generate Parentheses', difficulty: 'Medium', slug: 'generate-parentheses', url: 'https://leetcode.com/problems/generate-parentheses', sharedWith: ['backtracking'] },
      { title: 'Minimum Remove to Make Valid Parentheses', difficulty: 'Medium', slug: 'minimum-remove-to-make-valid-parentheses', url: 'https://leetcode.com/problems/minimum-remove-to-make-valid-parentheses' },
      { title: 'Longest Valid Parentheses', difficulty: 'Hard', slug: 'longest-valid-parentheses', url: 'https://leetcode.com/problems/longest-valid-parentheses' },
    ],
  },
  {
    id: 'monotonic-stack',
    name: 'Monotonic Stack',
    level: 2,
    parentId: 'stack-queue',
    summary: 'Maintaining strictly increasing or decreasing elements to find next greater/smaller values in O(n).',
    problems: [
      { title: 'Next Greater Element I', difficulty: 'Easy', slug: 'next-greater-element-i', url: 'https://leetcode.com/problems/next-greater-element-i' },
      { title: 'Daily Temperatures', difficulty: 'Medium', slug: 'daily-temperatures', url: 'https://leetcode.com/problems/daily-temperatures' },
      { title: 'Next Greater Element II', difficulty: 'Medium', slug: 'next-greater-element-ii', url: 'https://leetcode.com/problems/next-greater-element-ii' },
      { title: 'Online Stock Span', difficulty: 'Medium', slug: 'online-stock-span', url: 'https://leetcode.com/problems/online-stock-span' },
      { title: 'Largest Rectangle in Histogram', difficulty: 'Hard', slug: 'largest-rectangle-in-histogram', url: 'https://leetcode.com/problems/largest-rectangle-in-histogram' },
    ],
  },
  {
    id: 'monotonic-deque',
    name: 'Monotonic Deque',
    level: 2,
    parentId: 'stack-queue',
    summary: 'Double-ended queue preserving monotonic order to maintain window extrema in amortized O(1).',
    problems: [
      { title: 'Sliding Window Maximum', difficulty: 'Hard', slug: 'sliding-window-maximum', url: 'https://leetcode.com/problems/sliding-window-maximum', sharedWith: ['sliding-window'] },
      { title: 'Shortest Subarray with Sum at Least K', difficulty: 'Hard', slug: 'shortest-subarray-with-sum-at-least-k', url: 'https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k' },
      { title: 'Constrained Subsequence Sum', difficulty: 'Hard', slug: 'constrained-subsequence-sum', url: 'https://leetcode.com/problems/constrained-subsequence-sum' },
      { title: 'Max Value of Equation', difficulty: 'Hard', slug: 'max-value-of-equation', url: 'https://leetcode.com/problems/max-value-of-equation' },
      { title: 'Design Circular Deque', difficulty: 'Medium', slug: 'design-circular-deque', url: 'https://leetcode.com/problems/design-circular-deque' },
    ],
  },
  {
    id: 'stack-calc',
    name: 'Calculator & Expression Evaluation',
    level: 2,
    parentId: 'stack-queue',
    summary: 'Precedence-driven parsing using operator stacks and operand accumulators.',
    problems: [
      { title: 'Evaluate Reverse Polish Notation', difficulty: 'Medium', slug: 'evaluate-reverse-polish-notation', url: 'https://leetcode.com/problems/evaluate-reverse-polish-notation' },
      { title: 'Basic Calculator', difficulty: 'Hard', slug: 'basic-calculator', url: 'https://leetcode.com/problems/basic-calculator' },
      { title: 'Basic Calculator II', difficulty: 'Medium', slug: 'basic-calculator-ii', url: 'https://leetcode.com/problems/basic-calculator-ii' },
      { title: 'Decode String', difficulty: 'Medium', slug: 'decode-string', url: 'https://leetcode.com/problems/decode-string' },
      { title: 'Simplify Path', difficulty: 'Medium', slug: 'simplify-path', url: 'https://leetcode.com/problems/simplify-path' },
    ],
  },

  // ── Trees Subtopics ──
  {
    id: 'tree-dfs',
    name: 'DFS Traversals',
    level: 2,
    parentId: 'trees',
    summary: 'Pre-order, in-order, and post-order depth explorations computing subtree metrics.',
    problems: [
      { title: 'Binary Tree Preorder Traversal', difficulty: 'Easy', slug: 'binary-tree-preorder-traversal', url: 'https://leetcode.com/problems/binary-tree-preorder-traversal' },
      { title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', slug: 'maximum-depth-of-binary-tree', url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree' },
      { title: 'Diameter of Binary Tree', difficulty: 'Easy', slug: 'diameter-of-binary-tree', url: 'https://leetcode.com/problems/diameter-of-binary-tree' },
      { title: 'Balanced Binary Tree', difficulty: 'Easy', slug: 'balanced-binary-tree', url: 'https://leetcode.com/problems/balanced-binary-tree' },
      { title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', slug: 'binary-tree-maximum-path-sum', url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum' },
    ],
  },
  {
    id: 'tree-bfs',
    name: 'BFS Level Order Traversal',
    level: 2,
    parentId: 'trees',
    summary: 'Queue-based layer-by-layer traversal computing level widths, right-side views, and zig-zags.',
    problems: [
      { title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', slug: 'binary-tree-level-order-traversal', url: 'https://leetcode.com/problems/binary-tree-level-order-traversal' },
      { title: 'Binary Tree Right Side View', difficulty: 'Medium', slug: 'binary-tree-right-side-view', url: 'https://leetcode.com/problems/binary-tree-right-side-view' },
      { title: 'Binary Tree Zigzag Level Order Traversal', difficulty: 'Medium', slug: 'binary-tree-zigzag-level-order-traversal', url: 'https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal' },
      { title: 'Populating Next Right Pointers in Each Node', difficulty: 'Medium', slug: 'populating-next-right-pointers-in-each-node', url: 'https://leetcode.com/problems/populating-next-right-pointers-in-each-node' },
      { title: 'Word Ladder', difficulty: 'Hard', slug: 'word-ladder', url: 'https://leetcode.com/problems/word-ladder', sharedWith: ['graphs'] },
    ],
  },
  {
    id: 'tree-bst',
    name: 'Binary Search Tree (BST)',
    level: 2,
    parentId: 'trees',
    summary: 'Maintaining left < root < right ordering for logarithmic search and in-order sorted extraction.',
    problems: [
      { title: 'Search in a Binary Search Tree', difficulty: 'Easy', slug: 'search-in-a-binary-search-tree', url: 'https://leetcode.com/problems/search-in-a-binary-search-tree' },
      { title: 'Validate Binary Search Tree', difficulty: 'Medium', slug: 'validate-binary-search-tree', url: 'https://leetcode.com/problems/validate-binary-search-tree' },
      { title: 'Kth Smallest Element in a BST', difficulty: 'Medium', slug: 'kth-smallest-element-in-a-bst', url: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst' },
      { title: 'Delete Node in a BST', difficulty: 'Medium', slug: 'delete-node-in-a-bst', url: 'https://leetcode.com/problems/delete-node-in-a-bst' },
      { title: 'Lowest Common Ancestor of a BST', difficulty: 'Medium', slug: 'lowest-common-ancestor-of-a-binary-search-tree', url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree' },
    ],
  },
  {
    id: 'tree-lca',
    name: 'Lowest Common Ancestor',
    level: 2,
    parentId: 'trees',
    summary: 'Identifying shared structural ancestor nodes in general binary trees and DAGs.',
    problems: [
      { title: 'Lowest Common Ancestor of a Binary Tree', difficulty: 'Medium', slug: 'lowest-common-ancestor-of-a-binary-tree', url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree' },
      { title: 'Lowest Common Ancestor of Deepest Leaves', difficulty: 'Medium', slug: 'lowest-common-ancestor-of-deepest-leaves', url: 'https://leetcode.com/problems/lowest-common-ancestor-of-deepest-leaves' },
      { title: 'Step-By-Step Directions From a Binary Tree Node to Another', difficulty: 'Medium', slug: 'step-by-step-directions-from-a-binary-tree-node-to-another', url: 'https://leetcode.com/problems/step-by-step-directions-from-a-binary-tree-node-to-another' },
      { title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', slug: 'serialize-and-deserialize-binary-tree', url: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree' },
      { title: 'All Nodes Distance K in Binary Tree', difficulty: 'Medium', slug: 'all-nodes-distance-k-in-binary-tree', url: 'https://leetcode.com/problems/all-nodes-distance-k-in-binary-tree', sharedWith: ['graphs'] },
    ],
  },

  // ── Heap Subtopics ──
  {
    id: 'heap-top-k',
    name: 'Top K Elements',
    level: 2,
    parentId: 'heap-priority-queue',
    summary: 'Min-heap of size K retaining largest elements in O(n log k) streaming time.',
    problems: [
      { title: 'Kth Largest Element in a Stream', difficulty: 'Easy', slug: 'kth-largest-element-in-a-stream', url: 'https://leetcode.com/problems/kth-largest-element-in-a-stream' },
      { title: 'Kth Largest Element in an Array', difficulty: 'Medium', slug: 'kth-largest-element-in-an-array', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array' },
      { title: 'Top K Frequent Elements', difficulty: 'Medium', slug: 'top-k-frequent-elements', url: 'https://leetcode.com/problems/top-k-frequent-elements' },
      { title: 'K Closest Points to Origin', difficulty: 'Medium', slug: 'k-closest-points-to-origin', url: 'https://leetcode.com/problems/k-closest-points-to-origin' },
      { title: 'Top K Frequent Words', difficulty: 'Medium', slug: 'top-k-frequent-words', url: 'https://leetcode.com/problems/top-k-frequent-words' },
    ],
  },
  {
    id: 'heap-two-heaps',
    name: 'Two Heaps (Median Tracking)',
    level: 2,
    parentId: 'heap-priority-queue',
    summary: 'Balancing a max-heap of lower half and a min-heap of upper half for real-time median lookups.',
    problems: [
      { title: 'Find Median from Data Stream', difficulty: 'Hard', slug: 'find-median-from-data-stream', url: 'https://leetcode.com/problems/find-median-from-data-stream' },
      { title: 'Sliding Window Median', difficulty: 'Hard', slug: 'sliding-window-median', url: 'https://leetcode.com/problems/sliding-window-median' },
      { title: 'IPO', difficulty: 'Hard', slug: 'ipo', url: 'https://leetcode.com/problems/ipo' },
      { title: 'Find Right Interval', difficulty: 'Medium', slug: 'find-right-interval', url: 'https://leetcode.com/problems/find-right-interval' },
      { title: 'Seat Reservation Manager', difficulty: 'Medium', slug: 'seat-reservation-manager', url: 'https://leetcode.com/problems/seat-reservation-manager' },
    ],
  },
  {
    id: 'heap-merge-k',
    name: 'Merge K Sorted Streams',
    level: 2,
    parentId: 'heap-priority-queue',
    summary: 'Maintaining current front elements of K streams in a min-heap for sorted unified output.',
    problems: [
      { title: 'Merge k Sorted Lists', difficulty: 'Hard', slug: 'merge-k-sorted-lists', url: 'https://leetcode.com/problems/merge-k-sorted-lists', sharedWith: ['linked-list'] },
      { title: 'Find K Pairs with Smallest Sums', difficulty: 'Medium', slug: 'find-k-pairs-with-smallest-sums', url: 'https://leetcode.com/problems/find-k-pairs-with-smallest-sums' },
      { title: 'Smallest Range Covering Elements from K Lists', difficulty: 'Hard', slug: 'smallest-range-covering-elements-from-k-lists', url: 'https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists' },
      { title: 'Kth Smallest Element in a Sorted Matrix', difficulty: 'Medium', slug: 'kth-smallest-element-in-a-sorted-matrix', url: 'https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix', sharedWith: ['bs-matrix'] },
      { title: 'Sort an Array', difficulty: 'Medium', slug: 'sort-an-array', url: 'https://leetcode.com/problems/sort-an-array' },
    ],
  },
  {
    id: 'heap-scheduling',
    name: 'Task Scheduling & Priority Greedy',
    level: 2,
    parentId: 'heap-priority-queue',
    summary: 'Cooling intervals and execution deadlines scheduled via dynamic frequency heaps.',
    problems: [
      { title: 'Task Scheduler', difficulty: 'Medium', slug: 'task-scheduler', url: 'https://leetcode.com/problems/task-scheduler', sharedWith: ['greedy'] },
      { title: 'Reorganize String', difficulty: 'Medium', slug: 'reorganize-string', url: 'https://leetcode.com/problems/reorganize-string' },
      { title: 'Maximum Subsequence Score', difficulty: 'Medium', slug: 'maximum-subsequence-score', url: 'https://leetcode.com/problems/maximum-subsequence-score' },
      { title: 'Minimum Cost to Hire K Workers', difficulty: 'Hard', slug: 'minimum-cost-to-hire-k-workers', url: 'https://leetcode.com/problems/minimum-cost-to-hire-k-workers' },
      { title: 'Course Schedule III', difficulty: 'Hard', slug: 'course-schedule-iii', url: 'https://leetcode.com/problems/course-schedule-iii' },
    ],
  },

  // ── Greedy Subtopics ──
  {
    id: 'greedy-intervals',
    name: 'Interval Scheduling',
    level: 2,
    parentId: 'greedy',
    summary: 'Sorting by start or end times to maximize non-overlapping intervals or count concurrent rooms.',
    problems: [
      { title: 'Meeting Rooms', difficulty: 'Easy', slug: 'meeting-rooms', url: 'https://leetcode.com/problems/meeting-rooms' },
      { title: 'Merge Intervals', difficulty: 'Medium', slug: 'merge-intervals', url: 'https://leetcode.com/problems/merge-intervals' },
      { title: 'Non-overlapping Intervals', difficulty: 'Medium', slug: 'non-overlapping-intervals', url: 'https://leetcode.com/problems/non-overlapping-intervals' },
      { title: 'Minimum Number of Arrows to Burst Balloons', difficulty: 'Medium', slug: 'minimum-number-of-arrows-to-burst-balloons', url: 'https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons' },
      { title: 'Meeting Rooms II', difficulty: 'Medium', slug: 'meeting-rooms-ii', url: 'https://leetcode.com/problems/meeting-rooms-ii' },
    ],
  },
  {
    id: 'greedy-reachability',
    name: 'Jump Game & Reachability',
    level: 2,
    parentId: 'greedy',
    summary: 'Maintaining maximum reachable index to minimize jump transitions across an array.',
    problems: [
      { title: 'Jump Game', difficulty: 'Medium', slug: 'jump-game', url: 'https://leetcode.com/problems/jump-game' },
      { title: 'Jump Game II', difficulty: 'Medium', slug: 'jump-game-ii', url: 'https://leetcode.com/problems/jump-game-ii' },
      { title: 'Gas Station', difficulty: 'Medium', slug: 'gas-station', url: 'https://leetcode.com/problems/gas-station' },
      { title: 'Video Stitching', difficulty: 'Medium', slug: 'video-stitching', url: 'https://leetcode.com/problems/video-stitching' },
      { title: 'Minimum Jumps to Reach Home', difficulty: 'Medium', slug: 'minimum-jumps-to-reach-home', url: 'https://leetcode.com/problems/minimum-jumps-to-reach-home' },
    ],
  },
  {
    id: 'greedy-partitions',
    name: 'Partition Labels & String Greedy',
    level: 2,
    parentId: 'greedy',
    summary: 'Finding last occurrence indices to partition sequences into maximum disjoint segments.',
    problems: [
      { title: 'Partition Labels', difficulty: 'Medium', slug: 'partition-labels', url: 'https://leetcode.com/problems/partition-labels' },
      { title: 'Valid Parenthesis String', difficulty: 'Medium', slug: 'valid-parenthesis-string', url: 'https://leetcode.com/problems/valid-parenthesis-string' },
      { title: 'Queue Reconstruction by Height', difficulty: 'Medium', slug: 'queue-reconstruction-by-height', url: 'https://leetcode.com/problems/queue-reconstruction-by-height' },
      { title: 'Candy', difficulty: 'Hard', slug: 'candy', url: 'https://leetcode.com/problems/candy' },
      { title: 'Remove Duplicate Letters', difficulty: 'Medium', slug: 'remove-duplicate-letters', url: 'https://leetcode.com/problems/remove-duplicate-letters', sharedWith: ['monotonic-stack'] },
    ],
  },

  // ── Backtracking Subtopics ──
  {
    id: 'backtrack-subsets',
    name: 'Subsets & Power Set',
    level: 2,
    parentId: 'backtracking',
    summary: 'Include/exclude decisions generating all 2^n configurations with duplicate avoidance.',
    problems: [
      { title: 'Subsets', difficulty: 'Medium', slug: 'subsets', url: 'https://leetcode.com/problems/subsets' },
      { title: 'Subsets II', difficulty: 'Medium', slug: 'subsets-ii', url: 'https://leetcode.com/problems/subsets-ii' },
      { title: 'Letter Combinations of a Phone Number', difficulty: 'Medium', slug: 'letter-combinations-of-a-phone-number', url: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number' },
      { title: 'Generate Parentheses', difficulty: 'Medium', slug: 'generate-parentheses', url: 'https://leetcode.com/problems/generate-parentheses', sharedWith: ['stack-parentheses'] },
      { title: 'Word Search', difficulty: 'Medium', slug: 'word-search', url: 'https://leetcode.com/problems/word-search' },
    ],
  },
  {
    id: 'backtrack-permutations',
    name: 'Permutations & Combinations',
    level: 2,
    parentId: 'backtracking',
    summary: 'Order-sensitive recursive selection with visited boolean masks or frequency tallies.',
    problems: [
      { title: 'Permutations', difficulty: 'Medium', slug: 'permutations', url: 'https://leetcode.com/problems/permutations' },
      { title: 'Permutations II', difficulty: 'Medium', slug: 'permutations-ii', url: 'https://leetcode.com/problems/permutations-ii' },
      { title: 'Combinations', difficulty: 'Medium', slug: 'combinations', url: 'https://leetcode.com/problems/combinations' },
      { title: 'Combination Sum', difficulty: 'Medium', slug: 'combination-sum', url: 'https://leetcode.com/problems/combination-sum' },
      { title: 'Combination Sum II', difficulty: 'Medium', slug: 'combination-sum-ii', url: 'https://leetcode.com/problems/combination-sum-ii' },
    ],
  },
  {
    id: 'backtrack-constraints',
    name: 'Constraint Satisfaction',
    level: 2,
    parentId: 'backtracking',
    summary: 'Exhaustive search on grid constraints with pruning (N-Queens, Sudoku, Cryptarithmetic).',
    problems: [
      { title: 'N-Queens', difficulty: 'Hard', slug: 'n-queens', url: 'https://leetcode.com/problems/n-queens' },
      { title: 'N-Queens II', difficulty: 'Hard', slug: 'n-queens-ii', url: 'https://leetcode.com/problems/n-queens-ii' },
      { title: 'Sudoku Solver', difficulty: 'Hard', slug: 'sudoku-solver', url: 'https://leetcode.com/problems/sudoku-solver' },
      { title: 'Palindrome Partitioning', difficulty: 'Medium', slug: 'palindrome-partitioning', url: 'https://leetcode.com/problems/palindrome-partitioning' },
      { title: 'Restore IP Addresses', difficulty: 'Medium', slug: 'restore-ip-addresses', url: 'https://leetcode.com/problems/restore-ip-addresses' },
    ],
  },

  // ── Graphs Subtopics ──
  {
    id: 'graph-bfs-dfs',
    name: 'BFS & DFS Exploration',
    level: 2,
    parentId: 'graphs',
    summary: 'Breadth and depth tree/grid traversals computing connected components and shortest unweighted paths.',
    problems: [
      { title: 'Flood Fill', difficulty: 'Easy', slug: 'flood-fill', url: 'https://leetcode.com/problems/flood-fill' },
      { title: 'Number of Islands', difficulty: 'Medium', slug: 'number-of-islands', url: 'https://leetcode.com/problems/number-of-islands' },
      { title: 'Max Area of Island', difficulty: 'Medium', slug: 'max-area-of-island', url: 'https://leetcode.com/problems/max-area-of-island' },
      { title: '01 Matrix', difficulty: 'Medium', slug: '01-matrix', url: 'https://leetcode.com/problems/01-matrix' },
      { title: 'Rotting Oranges', difficulty: 'Medium', slug: 'rotting-oranges', url: 'https://leetcode.com/problems/rotting-oranges' },
    ],
  },
  {
    id: 'graph-topo-sort',
    name: 'Cycle Detection & Topological Sort',
    level: 2,
    parentId: 'graphs',
    summary: 'Kahns in-degree algorithm and DFS 3-color state tracking on Directed Acyclic Graphs.',
    problems: [
      { title: 'Course Schedule', difficulty: 'Medium', slug: 'course-schedule', url: 'https://leetcode.com/problems/course-schedule' },
      { title: 'Course Schedule II', difficulty: 'Medium', slug: 'course-schedule-ii', url: 'https://leetcode.com/problems/course-schedule-ii' },
      { title: 'Alien Dictionary', difficulty: 'Hard', slug: 'alien-dictionary', url: 'https://leetcode.com/problems/alien-dictionary' },
      { title: 'Find Eventual Safe States', difficulty: 'Medium', slug: 'find-eventual-safe-states', url: 'https://leetcode.com/problems/find-eventual-safe-states' },
      { title: 'Longest Increasing Path in a Matrix', difficulty: 'Hard', slug: 'longest-increasing-path-in-a-matrix', url: 'https://leetcode.com/problems/longest-increasing-path-in-a-matrix', sharedWith: ['dynamic-programming'] },
    ],
  },
  {
    id: 'graph-union-find',
    name: 'Disjoint Set Union (Union Find)',
    level: 2,
    parentId: 'graphs',
    summary: 'Near constant-time union by rank and path compression to track dynamic connectivity.',
    problems: [
      { title: 'Redundant Connection', difficulty: 'Medium', slug: 'redundant-connection', url: 'https://leetcode.com/problems/redundant-connection' },
      { title: 'Number of Provinces', difficulty: 'Medium', slug: 'number-of-provinces', url: 'https://leetcode.com/problems/number-of-provinces' },
      { title: 'Accounts Merge', difficulty: 'Medium', slug: 'accounts-merge', url: 'https://leetcode.com/problems/accounts-merge' },
      { title: 'Graph Valid Tree', difficulty: 'Medium', slug: 'graph-valid-tree', url: 'https://leetcode.com/problems/graph-valid-tree' },
      { title: 'Surrounded Regions', difficulty: 'Medium', slug: 'surrounded-regions', url: 'https://leetcode.com/problems/surrounded-regions' },
    ],
  },
  {
    id: 'graph-shortest-path',
    name: 'Weighted Shortest Paths & Dijkstra',
    level: 2,
    parentId: 'graphs',
    summary: 'Priority queue relaxation on non-negative weighted graphs and Bellman-Ford/Floyd-Warshall.',
    problems: [
      { title: 'Network Delay Time', difficulty: 'Medium', slug: 'network-delay-time', url: 'https://leetcode.com/problems/network-delay-time' },
      { title: 'Cheapest Flights Within K Stops', difficulty: 'Medium', slug: 'cheapest-flights-within-k-stops', url: 'https://leetcode.com/problems/cheapest-flights-within-k-stops' },
      { title: 'Path with Maximum Probability', difficulty: 'Medium', slug: 'path-with-maximum-probability', url: 'https://leetcode.com/problems/path-with-maximum-probability' },
      { title: 'Path With Minimum Effort', difficulty: 'Medium', slug: 'path-with-minimum-effort', url: 'https://leetcode.com/problems/path-with-minimum-effort' },
      { title: 'Reconstruct Itinerary', difficulty: 'Hard', slug: 'reconstruct-itinerary', url: 'https://leetcode.com/problems/reconstruct-itinerary' },
    ],
  },

  // ── Dynamic Programming Subtopics ──
  {
    id: 'dp-1d',
    name: '1D Dynamic Programming',
    level: 2,
    parentId: 'dynamic-programming',
    summary: 'Linear state recurrence memoizing subproblem solutions in O(n) space or O(1) rolling variables.',
    problems: [
      { title: 'Climbing Stairs', difficulty: 'Easy', slug: 'climbing-stairs', url: 'https://leetcode.com/problems/climbing-stairs' },
      { title: 'House Robber', difficulty: 'Medium', slug: 'house-robber', url: 'https://leetcode.com/problems/house-robber' },
      { title: 'House Robber II', difficulty: 'Medium', slug: 'house-robber-ii', url: 'https://leetcode.com/problems/house-robber-ii' },
      { title: 'Decode Ways', difficulty: 'Medium', slug: 'decode-ways', url: 'https://leetcode.com/problems/decode-ways' },
      { title: 'Coin Change', difficulty: 'Medium', slug: 'coin-change', url: 'https://leetcode.com/problems/coin-change' },
    ],
  },
  {
    id: 'dp-2d-grid',
    name: '2D Grid Dynamic Programming',
    level: 2,
    parentId: 'dynamic-programming',
    summary: 'Top-to-bottom and left-to-right table transitions computing optimal grid paths.',
    problems: [
      { title: 'Unique Paths', difficulty: 'Medium', slug: 'unique-paths', url: 'https://leetcode.com/problems/unique-paths' },
      { title: 'Unique Paths II', difficulty: 'Medium', slug: 'unique-paths-ii', url: 'https://leetcode.com/problems/unique-paths-ii' },
      { title: 'Minimum Path Sum', difficulty: 'Medium', slug: 'minimum-path-sum', url: 'https://leetcode.com/problems/minimum-path-sum' },
      { title: 'Maximal Square', difficulty: 'Medium', slug: 'maximal-square', url: 'https://leetcode.com/problems/maximal-square' },
      { title: 'Dungeon Game', difficulty: 'Hard', slug: 'dungeon-game', url: 'https://leetcode.com/problems/dungeon-game' },
    ],
  },
  {
    id: 'dp-knapsack',
    name: 'Knapsack & Subset DP',
    level: 2,
    parentId: 'dynamic-programming',
    summary: '0/1 knapsack, unbounded knapsack, and partition equal subset sums.',
    problems: [
      { title: 'Partition Equal Subset Sum', difficulty: 'Medium', slug: 'partition-equal-subset-sum', url: 'https://leetcode.com/problems/partition-equal-subset-sum' },
      { title: 'Target Sum', difficulty: 'Medium', slug: 'target-sum', url: 'https://leetcode.com/problems/target-sum' },
      { title: 'Coin Change II', difficulty: 'Medium', slug: 'coin-change-ii', url: 'https://leetcode.com/problems/coin-change-ii' },
      { title: 'Ones and Zeroes', difficulty: 'Medium', slug: 'ones-and-zeroes', url: 'https://leetcode.com/problems/ones-and-zeroes' },
      { title: 'Last Stone Weight II', difficulty: 'Medium', slug: 'last-stone-weight-ii', url: 'https://leetcode.com/problems/last-stone-weight-ii' },
    ],
  },
  {
    id: 'dp-strings',
    name: 'LCS & String DP',
    level: 2,
    parentId: 'dynamic-programming',
    summary: 'Dual string indices tracking common subsequences, edit distances, and regex matching.',
    problems: [
      { title: 'Longest Common Subsequence', difficulty: 'Medium', slug: 'longest-common-subsequence', url: 'https://leetcode.com/problems/longest-common-subsequence' },
      { title: 'Edit Distance', difficulty: 'Hard', slug: 'edit-distance', url: 'https://leetcode.com/problems/edit-distance' },
      { title: 'Distinct Subsequences', difficulty: 'Hard', slug: 'distinct-subsequences', url: 'https://leetcode.com/problems/distinct-subsequences' },
      { title: 'Regular Expression Matching', difficulty: 'Hard', slug: 'regular-expression-matching', url: 'https://leetcode.com/problems/regular-expression-matching' },
      { title: 'Wildcard Matching', difficulty: 'Hard', slug: 'wildcard-matching', url: 'https://leetcode.com/problems/wildcard-matching' },
    ],
  },

  // ── Bit Manipulation Subtopics ──
  {
    id: 'bit-xor',
    name: 'Single Number & XOR Tricks',
    level: 2,
    parentId: 'bit-manipulation',
    summary: 'Leveraging x ^ x = 0 and x ^ 0 = x to cancel pairs and identify singletons.',
    problems: [
      { title: 'Single Number', difficulty: 'Easy', slug: 'single-number', url: 'https://leetcode.com/problems/single-number' },
      { title: 'Missing Number', difficulty: 'Easy', slug: 'missing-number', url: 'https://leetcode.com/problems/missing-number' },
      { title: 'Single Number III', difficulty: 'Medium', slug: 'single-number-iii', url: 'https://leetcode.com/problems/single-number-iii' },
      { title: 'Find the Duplicate Number', difficulty: 'Medium', slug: 'find-the-duplicate-number', url: 'https://leetcode.com/problems/find-the-duplicate-number' },
      { title: 'Maximum XOR of Two Numbers in an Array', difficulty: 'Medium', slug: 'maximum-xor-of-two-numbers-in-an-array', url: 'https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array' },
    ],
  },
  {
    id: 'bit-counting',
    name: 'Power of Two & Bit Counting',
    level: 2,
    parentId: 'bit-manipulation',
    summary: 'Bit clearing with n & (n - 1) and lookup tables to count set bits in logarithmic time.',
    problems: [
      { title: 'Number of 1 Bits', difficulty: 'Easy', slug: 'number-of-1-bits', url: 'https://leetcode.com/problems/number-of-1-bits' },
      { title: 'Power of Two', difficulty: 'Easy', slug: 'power-of-two', url: 'https://leetcode.com/problems/power-of-two' },
      { title: 'Counting Bits', difficulty: 'Easy', slug: 'counting-bits', url: 'https://leetcode.com/problems/counting-bits' },
      { title: 'Reverse Bits', difficulty: 'Easy', slug: 'reverse-bits', url: 'https://leetcode.com/problems/reverse-bits' },
      { title: 'Divide Two Integers', difficulty: 'Medium', slug: 'divide-two-integers', url: 'https://leetcode.com/problems/divide-two-integers' },
    ],
  },
  {
    id: 'bit-masks',
    name: 'Bitmasking & Subsets',
    level: 2,
    parentId: 'bit-manipulation',
    summary: 'Representing sets of up to 32 elements as integers for bitmask DP and state compression.',
    problems: [
      { title: 'Subsets', difficulty: 'Medium', slug: 'subsets', url: 'https://leetcode.com/problems/subsets', sharedWith: ['backtrack-subsets'] },
      { title: 'Bitwise AND of Numbers Range', difficulty: 'Medium', slug: 'bitwise-and-of-numbers-range', url: 'https://leetcode.com/problems/bitwise-and-of-numbers-range' },
      { title: 'Smallest Sufficient Team', difficulty: 'Hard', slug: 'smallest-sufficient-team', url: 'https://leetcode.com/problems/smallest-sufficient-team' },
      { title: 'Maximum Product of Word Lengths', difficulty: 'Medium', slug: 'maximum-product-of-word-lengths', url: 'https://leetcode.com/problems/maximum-product-of-word-lengths' },
      { title: 'Shortest Path Visiting All Nodes', difficulty: 'Hard', slug: 'shortest-path-visiting-all-nodes', url: 'https://leetcode.com/problems/shortest-path-visiting-all-nodes', sharedWith: ['graphs'] },
    ],
  },
];

// ─── Query & Lookup Helpers ──────────────────────────────────────────────────

export const ALL_TOPIC_NODES: TopicNode[] = [
  ROOT_NODE,
  ...MAIN_TOPICS,
  ...SUBTOPICS,
];

const NODE_MAP = new Map<string, TopicNode>(ALL_TOPIC_NODES.map(n => [n.id, n]));

export function getTopicById(id: string): TopicNode | undefined {
  return NODE_MAP.get(id);
}

export function getSubtopicsForTopic(parentId: string): TopicNode[] {
  return SUBTOPICS.filter(s => s.parentId === parentId);
}

export function filterMainTopics(query: string, tier: 'all' | 'basic' | 'intermediate' | 'advanced' = 'all'): TopicNode[] {
  const q = query.toLowerCase().trim();
  return MAIN_TOPICS.filter(topic => {
    const matchesTier = tier === 'all' || topic.tier === tier;
    const matchesQuery = !q || topic.name.toLowerCase().includes(q);
    return matchesTier && matchesQuery;
  });
}
