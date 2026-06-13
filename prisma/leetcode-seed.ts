/**
 * prisma/leetcode-seed.ts
 * Seeds the LeetcodeProblem table with curated problems by pattern.
 * Run: npx tsx prisma/leetcode-seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const problems = [
  // ─── Binary Search ─────────────────────────────────────────────────────────
  { leetcodeId: 704,  slug: 'binary-search',                       title: 'Binary Search',                        difficulty: 'Easy',   topics: ['Array','Binary Search'],    patterns: ['binary-search'],            prerequisites: [] },
  { leetcodeId: 278,  slug: 'first-bad-version',                   title: 'First Bad Version',                    difficulty: 'Easy',   topics: ['Binary Search'],             patterns: ['binary-search'],            prerequisites: ['binary-search'] },
  { leetcodeId: 35,   slug: 'search-insert-position',              title: 'Search Insert Position',               difficulty: 'Easy',   topics: ['Array','Binary Search'],    patterns: ['binary-search'],            prerequisites: ['binary-search'] },
  { leetcodeId: 74,   slug: 'search-a-2d-matrix',                  title: 'Search a 2D Matrix',                   difficulty: 'Medium', topics: ['Array','Binary Search'],    patterns: ['binary-search'],            prerequisites: ['binary-search'] },
  { leetcodeId: 153,  slug: 'find-minimum-in-rotated-sorted-array',title: 'Find Minimum in Rotated Sorted Array',  difficulty: 'Medium', topics: ['Array','Binary Search'],    patterns: ['binary-search'],            prerequisites: ['binary-search'] },
  { leetcodeId: 162,  slug: 'find-peak-element',                   title: 'Find Peak Element',                    difficulty: 'Medium', topics: ['Array','Binary Search'],    patterns: ['binary-search'],            prerequisites: ['binary-search'] },
  { leetcodeId: 540,  slug: 'single-element-in-a-sorted-array',    title: 'Single Element in a Sorted Array',     difficulty: 'Medium', topics: ['Array','Binary Search'],    patterns: ['binary-search'],            prerequisites: ['binary-search'] },
  { leetcodeId: 34,   slug: 'find-first-and-last-position-of-element-in-sorted-array', title: 'Find First and Last Position', difficulty: 'Medium', topics: ['Array','Binary Search'], patterns: ['binary-search'], prerequisites: ['binary-search'] },
  { leetcodeId: 852,  slug: 'peak-index-in-a-mountain-array',      title: 'Peak Index in a Mountain Array',        difficulty: 'Medium', topics: ['Array','Binary Search'],    patterns: ['binary-search'],            prerequisites: ['find-peak-element'] },
  { leetcodeId: 744,  slug: 'find-smallest-letter-greater-than-target', title: 'Find Smallest Letter Greater Than Target', difficulty: 'Easy', topics: ['Array','Binary Search'], patterns: ['binary-search'], prerequisites: ['binary-search'] },
  { leetcodeId: 33,   slug: 'search-in-rotated-sorted-array',      title: 'Search in Rotated Sorted Array',       difficulty: 'Medium', topics: ['Array','Binary Search'],    patterns: ['binary-search'],            prerequisites: ['find-minimum-in-rotated-sorted-array'] },
  { leetcodeId: 81,   slug: 'search-in-rotated-sorted-array-ii',   title: 'Search in Rotated Sorted Array II',    difficulty: 'Medium', topics: ['Array','Binary Search'],    patterns: ['binary-search'],            prerequisites: ['search-in-rotated-sorted-array'] },
  { leetcodeId: 875,  slug: 'koko-eating-bananas',                  title: 'Koko Eating Bananas',                  difficulty: 'Medium', topics: ['Array','Binary Search'],    patterns: ['binary-search-on-answer'], prerequisites: ['binary-search'] },
  { leetcodeId: 1011, slug: 'capacity-to-ship-packages-within-d-days', title: 'Capacity to Ship Packages Within D Days', difficulty: 'Medium', topics: ['Array','Binary Search'], patterns: ['binary-search-on-answer'], prerequisites: ['koko-eating-bananas'] },
  { leetcodeId: 410,  slug: 'split-array-largest-sum',             title: 'Split Array Largest Sum',              difficulty: 'Hard',   topics: ['Array','Binary Search'],    patterns: ['binary-search-on-answer'], prerequisites: ['capacity-to-ship-packages-within-d-days'] },

  // ─── Sliding Window ─────────────────────────────────────────────────────────
  { leetcodeId: 643,  slug: 'maximum-average-subarray-i',           title: 'Maximum Average Subarray I',           difficulty: 'Easy',   topics: ['Array','Sliding Window'],   patterns: ['sliding-window'],           prerequisites: [] },
  { leetcodeId: 3,    slug: 'longest-substring-without-repeating-characters', title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', topics: ['Hash Table','String','Sliding Window'], patterns: ['sliding-window'], prerequisites: ['maximum-average-subarray-i'] },
  { leetcodeId: 209,  slug: 'minimum-size-subarray-sum',            title: 'Minimum Size Subarray Sum',            difficulty: 'Medium', topics: ['Array','Sliding Window'],   patterns: ['sliding-window'],           prerequisites: ['maximum-average-subarray-i'] },
  { leetcodeId: 76,   slug: 'minimum-window-substring',             title: 'Minimum Window Substring',             difficulty: 'Hard',   topics: ['Hash Table','String','Sliding Window'], patterns: ['sliding-window'], prerequisites: ['longest-substring-without-repeating-characters'] },
  { leetcodeId: 239,  slug: 'sliding-window-maximum',               title: 'Sliding Window Maximum',               difficulty: 'Hard',   topics: ['Array','Deque','Sliding Window'], patterns: ['sliding-window','monotonic-deque'], prerequisites: ['minimum-window-substring'] },
  { leetcodeId: 567,  slug: 'permutation-in-string',                title: 'Permutation in String',                difficulty: 'Medium', topics: ['Hash Table','String','Sliding Window'], patterns: ['sliding-window'], prerequisites: ['longest-substring-without-repeating-characters'] },
  { leetcodeId: 424,  slug: 'longest-repeating-character-replacement', title: 'Longest Repeating Character Replacement', difficulty: 'Medium', topics: ['Hash Table','String','Sliding Window'], patterns: ['sliding-window'], prerequisites: ['longest-substring-without-repeating-characters'] },

  // ─── Two Pointers ───────────────────────────────────────────────────────────
  { leetcodeId: 167,  slug: 'two-sum-ii-input-array-is-sorted',     title: 'Two Sum II',                           difficulty: 'Medium', topics: ['Array','Two Pointers'],     patterns: ['two-pointers'],             prerequisites: [] },
  { leetcodeId: 15,   slug: '3sum',                                  title: '3Sum',                                 difficulty: 'Medium', topics: ['Array','Two Pointers','Sorting'], patterns: ['two-pointers'],        prerequisites: ['two-sum-ii-input-array-is-sorted'] },
  { leetcodeId: 11,   slug: 'container-with-most-water',             title: 'Container With Most Water',            difficulty: 'Medium', topics: ['Array','Two Pointers'],     patterns: ['two-pointers'],             prerequisites: ['two-sum-ii-input-array-is-sorted'] },
  { leetcodeId: 42,   slug: 'trapping-rain-water',                   title: 'Trapping Rain Water',                  difficulty: 'Hard',   topics: ['Array','Two Pointers','Stack'], patterns: ['two-pointers'],        prerequisites: ['container-with-most-water'] },
  { leetcodeId: 125,  slug: 'valid-palindrome',                      title: 'Valid Palindrome',                     difficulty: 'Easy',   topics: ['Two Pointers','String'],    patterns: ['two-pointers'],             prerequisites: [] },

  // ─── Hash Map ───────────────────────────────────────────────────────────────
  { leetcodeId: 1,    slug: 'two-sum',                               title: 'Two Sum',                              difficulty: 'Easy',   topics: ['Array','Hash Table'],       patterns: ['hash-map'],                 prerequisites: [] },
  { leetcodeId: 49,   slug: 'group-anagrams',                        title: 'Group Anagrams',                       difficulty: 'Medium', topics: ['Array','Hash Table','String','Sorting'], patterns: ['hash-map'], prerequisites: ['two-sum'] },
  { leetcodeId: 128,  slug: 'longest-consecutive-sequence',          title: 'Longest Consecutive Sequence',         difficulty: 'Medium', topics: ['Array','Hash Table'],       patterns: ['hash-map'],                 prerequisites: ['group-anagrams'] },
  { leetcodeId: 560,  slug: 'subarray-sum-equals-k',                 title: 'Subarray Sum Equals K',                difficulty: 'Medium', topics: ['Array','Hash Table'],       patterns: ['hash-map','prefix-sum'],   prerequisites: ['two-sum'] },

  // ─── Prefix Sum ─────────────────────────────────────────────────────────────
  { leetcodeId: 303,  slug: 'range-sum-query-immutable',             title: 'Range Sum Query - Immutable',          difficulty: 'Easy',   topics: ['Array','Design','Prefix Sum'], patterns: ['prefix-sum'],           prerequisites: [] },
  { leetcodeId: 238,  slug: 'product-of-array-except-self',          title: 'Product of Array Except Self',         difficulty: 'Medium', topics: ['Array','Prefix Sum'],       patterns: ['prefix-sum'],               prerequisites: ['range-sum-query-immutable'] },
  { leetcodeId: 523,  slug: 'continuous-subarray-sum',               title: 'Continuous Subarray Sum',              difficulty: 'Medium', topics: ['Array','Hash Table','Prefix Sum'], patterns: ['prefix-sum','hash-map'], prerequisites: ['subarray-sum-equals-k'] },

  // ─── Trees ──────────────────────────────────────────────────────────────────
  { leetcodeId: 104,  slug: 'maximum-depth-of-binary-tree',          title: 'Maximum Depth of Binary Tree',         difficulty: 'Easy',   topics: ['Tree','DFS'],               patterns: ['dfs','tree'],               prerequisites: [] },
  { leetcodeId: 226,  slug: 'invert-binary-tree',                    title: 'Invert Binary Tree',                   difficulty: 'Easy',   topics: ['Tree','DFS'],               patterns: ['dfs','tree'],               prerequisites: ['maximum-depth-of-binary-tree'] },
  { leetcodeId: 100,  slug: 'same-tree',                             title: 'Same Tree',                            difficulty: 'Easy',   topics: ['Tree','DFS'],               patterns: ['dfs','tree'],               prerequisites: ['maximum-depth-of-binary-tree'] },
  { leetcodeId: 572,  slug: 'subtree-of-another-tree',               title: 'Subtree of Another Tree',              difficulty: 'Easy',   topics: ['Tree','DFS'],               patterns: ['dfs','tree'],               prerequisites: ['same-tree'] },
  { leetcodeId: 102,  slug: 'binary-tree-level-order-traversal',     title: 'Binary Tree Level Order Traversal',    difficulty: 'Medium', topics: ['Tree','BFS'],               patterns: ['bfs','tree'],               prerequisites: ['maximum-depth-of-binary-tree'] },
  { leetcodeId: 98,   slug: 'validate-binary-search-tree',           title: 'Validate Binary Search Tree',          difficulty: 'Medium', topics: ['Tree','DFS','BST'],         patterns: ['dfs','tree','bst'],         prerequisites: ['invert-binary-tree'] },
  { leetcodeId: 235,  slug: 'lowest-common-ancestor-of-a-binary-search-tree', title: 'Lowest Common Ancestor of a BST', difficulty: 'Medium', topics: ['Tree','DFS','BST'], patterns: ['dfs','tree','bst'], prerequisites: ['validate-binary-search-tree'] },
  { leetcodeId: 543,  slug: 'diameter-of-binary-tree',               title: 'Diameter of Binary Tree',              difficulty: 'Easy',   topics: ['Tree','DFS'],               patterns: ['dfs','tree'],               prerequisites: ['maximum-depth-of-binary-tree'] },
  { leetcodeId: 124,  slug: 'binary-tree-maximum-path-sum',          title: 'Binary Tree Maximum Path Sum',         difficulty: 'Hard',   topics: ['Tree','DFS'],               patterns: ['dfs','tree'],               prerequisites: ['diameter-of-binary-tree'] },

  // ─── Graphs ─────────────────────────────────────────────────────────────────
  { leetcodeId: 200,  slug: 'number-of-islands',                     title: 'Number of Islands',                    difficulty: 'Medium', topics: ['Array','DFS','BFS','Graph'], patterns: ['dfs','bfs','graph'],       prerequisites: [] },
  { leetcodeId: 133,  slug: 'clone-graph',                           title: 'Clone Graph',                          difficulty: 'Medium', topics: ['Graph','DFS','BFS'],         patterns: ['graph','dfs','bfs'],        prerequisites: ['number-of-islands'] },
  { leetcodeId: 207,  slug: 'course-schedule',                       title: 'Course Schedule',                      difficulty: 'Medium', topics: ['Graph','Topological Sort'],  patterns: ['topological-sort'],         prerequisites: ['number-of-islands'] },
  { leetcodeId: 210,  slug: 'course-schedule-ii',                    title: 'Course Schedule II',                   difficulty: 'Medium', topics: ['Graph','Topological Sort'],  patterns: ['topological-sort'],         prerequisites: ['course-schedule'] },
  { leetcodeId: 417,  slug: 'pacific-atlantic-water-flow',           title: 'Pacific Atlantic Water Flow',          difficulty: 'Medium', topics: ['Graph','DFS','BFS'],         patterns: ['dfs','bfs','graph'],        prerequisites: ['number-of-islands'] },
  { leetcodeId: 684,  slug: 'redundant-connection',                  title: 'Redundant Connection',                 difficulty: 'Medium', topics: ['Graph','Union Find'],        patterns: ['union-find'],               prerequisites: [] },
  { leetcodeId: 743,  slug: 'network-delay-time',                    title: 'Network Delay Time',                   difficulty: 'Medium', topics: ['Graph','Shortest Path'],     patterns: ['dijkstra'],                 prerequisites: ['clone-graph'] },

  // ─── Dynamic Programming ────────────────────────────────────────────────────
  { leetcodeId: 70,   slug: 'climbing-stairs',                       title: 'Climbing Stairs',                      difficulty: 'Easy',   topics: ['Dynamic Programming'],      patterns: ['dp-1d'],                    prerequisites: [] },
  { leetcodeId: 198,  slug: 'house-robber',                          title: 'House Robber',                         difficulty: 'Medium', topics: ['Dynamic Programming'],      patterns: ['dp-1d'],                    prerequisites: ['climbing-stairs'] },
  { leetcodeId: 213,  slug: 'house-robber-ii',                       title: 'House Robber II',                      difficulty: 'Medium', topics: ['Dynamic Programming'],      patterns: ['dp-1d'],                    prerequisites: ['house-robber'] },
  { leetcodeId: 322,  slug: 'coin-change',                           title: 'Coin Change',                          difficulty: 'Medium', topics: ['Dynamic Programming'],      patterns: ['dp-unbounded-knapsack'],    prerequisites: ['climbing-stairs'] },
  { leetcodeId: 518,  slug: 'coin-change-ii',                        title: 'Coin Change II',                       difficulty: 'Medium', topics: ['Dynamic Programming'],      patterns: ['dp-unbounded-knapsack'],    prerequisites: ['coin-change'] },
  { leetcodeId: 5,    slug: 'longest-palindromic-substring',         title: 'Longest Palindromic Substring',        difficulty: 'Medium', topics: ['Dynamic Programming'],      patterns: ['dp-2d'],                    prerequisites: ['climbing-stairs'] },
  { leetcodeId: 300,  slug: 'longest-increasing-subsequence',        title: 'Longest Increasing Subsequence',       difficulty: 'Medium', topics: ['Array','Dynamic Programming'], patterns: ['dp-1d'],                prerequisites: ['climbing-stairs'] },
  { leetcodeId: 1143, slug: 'longest-common-subsequence',            title: 'Longest Common Subsequence',           difficulty: 'Medium', topics: ['Dynamic Programming'],      patterns: ['dp-2d'],                    prerequisites: ['longest-increasing-subsequence'] },
  { leetcodeId: 416,  slug: 'partition-equal-subset-sum',            title: 'Partition Equal Subset Sum',           difficulty: 'Medium', topics: ['Dynamic Programming'],      patterns: ['dp-0-1-knapsack'],          prerequisites: ['coin-change'] },
  { leetcodeId: 91,   slug: 'decode-ways',                           title: 'Decode Ways',                          difficulty: 'Medium', topics: ['String','Dynamic Programming'], patterns: ['dp-1d'],              prerequisites: ['climbing-stairs'] },

  // ─── Stack ──────────────────────────────────────────────────────────────────
  { leetcodeId: 20,   slug: 'valid-parentheses',                     title: 'Valid Parentheses',                    difficulty: 'Easy',   topics: ['Stack','String'],           patterns: ['stack'],                    prerequisites: [] },
  { leetcodeId: 155,  slug: 'min-stack',                             title: 'Min Stack',                            difficulty: 'Medium', topics: ['Stack','Design'],           patterns: ['stack'],                    prerequisites: ['valid-parentheses'] },
  { leetcodeId: 739,  slug: 'daily-temperatures',                    title: 'Daily Temperatures',                   difficulty: 'Medium', topics: ['Array','Stack','Monotonic Stack'], patterns: ['monotonic-stack'],   prerequisites: ['valid-parentheses'] },
  { leetcodeId: 84,   slug: 'largest-rectangle-in-histogram',        title: 'Largest Rectangle in Histogram',       difficulty: 'Hard',   topics: ['Array','Stack','Monotonic Stack'], patterns: ['monotonic-stack'],   prerequisites: ['daily-temperatures'] },

  // ─── Backtracking ───────────────────────────────────────────────────────────
  { leetcodeId: 46,   slug: 'permutations',                          title: 'Permutations',                         difficulty: 'Medium', topics: ['Array','Backtracking'],     patterns: ['backtracking'],             prerequisites: [] },
  { leetcodeId: 78,   slug: 'subsets',                               title: 'Subsets',                              difficulty: 'Medium', topics: ['Array','Backtracking'],     patterns: ['backtracking'],             prerequisites: ['permutations'] },
  { leetcodeId: 39,   slug: 'combination-sum',                       title: 'Combination Sum',                      difficulty: 'Medium', topics: ['Array','Backtracking'],     patterns: ['backtracking'],             prerequisites: ['subsets'] },
  { leetcodeId: 51,   slug: 'n-queens',                              title: 'N-Queens',                             difficulty: 'Hard',   topics: ['Array','Backtracking'],     patterns: ['backtracking'],             prerequisites: ['combination-sum'] },
  { leetcodeId: 79,   slug: 'word-search',                           title: 'Word Search',                          difficulty: 'Medium', topics: ['Array','Backtracking','DFS'], patterns: ['backtracking','dfs'],     prerequisites: ['subsets'] },

  // ─── Greedy ─────────────────────────────────────────────────────────────────
  { leetcodeId: 455,  slug: 'assign-cookies',                        title: 'Assign Cookies',                       difficulty: 'Easy',   topics: ['Array','Greedy','Sorting'], patterns: ['greedy'],                  prerequisites: [] },
  { leetcodeId: 55,   slug: 'jump-game',                             title: 'Jump Game',                            difficulty: 'Medium', topics: ['Array','Greedy'],           patterns: ['greedy'],                  prerequisites: ['assign-cookies'] },
  { leetcodeId: 45,   slug: 'jump-game-ii',                          title: 'Jump Game II',                         difficulty: 'Medium', topics: ['Array','Greedy'],           patterns: ['greedy'],                  prerequisites: ['jump-game'] },
  { leetcodeId: 134,  slug: 'gas-station',                           title: 'Gas Station',                          difficulty: 'Medium', topics: ['Array','Greedy'],           patterns: ['greedy'],                  prerequisites: ['jump-game'] },

  // ─── Heap / Priority Queue ──────────────────────────────────────────────────
  { leetcodeId: 215,  slug: 'kth-largest-element-in-an-array',       title: 'Kth Largest Element in an Array',      difficulty: 'Medium', topics: ['Array','Sorting','Heap'],   patterns: ['heap'],                    prerequisites: [] },
  { leetcodeId: 347,  slug: 'top-k-frequent-elements',               title: 'Top K Frequent Elements',              difficulty: 'Medium', topics: ['Array','Hash Table','Heap'], patterns: ['heap'],                   prerequisites: ['kth-largest-element-in-an-array'] },
  { leetcodeId: 295,  slug: 'find-median-from-data-stream',          title: 'Find Median from Data Stream',         difficulty: 'Hard',   topics: ['Heap','Design'],            patterns: ['heap'],                    prerequisites: ['top-k-frequent-elements'] },
];

async function main() {
  console.log('🌱 Seeding LeetCode problem library...');
  let created = 0;
  let skipped = 0;

  for (const p of problems) {
    try {
      await prisma.leetcodeProblem.upsert({
        where: { leetcodeId: p.leetcodeId },
        update: {
          title: p.title,
          difficulty: p.difficulty,
          topics: p.topics,
          patterns: p.patterns,
          prerequisites: p.prerequisites,
        },
        create: p,
      });
      created++;
    } catch (e) {
      console.error(`  ✗ Failed to upsert ${p.slug}:`, e);
      skipped++;
    }
  }

  console.log(`✅ Done. Created/updated: ${created}, skipped: ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
