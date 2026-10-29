/**
 * scripts/seed-external-knowledge.ts
 *
 * Seeds external knowledge sources, CSV datasets with company interview tags,
 * and solution guides into PostgreSQL with pgvector embeddings.
 */

import { prisma } from '../src/lib/db/prisma';
import { defaultKnowledgeIngestion } from '../src/lib/knowledge/ingestion-service';
import { CURATED_DSA_REPOSITORIES } from '../src/lib/knowledge/github-discovery';

const SAMPLE_LEETCODE_CSV = `Problem,Difficulty,Topics,Companies,Description,URL
Two Sum,Easy,Array;Hash Table,Amazon;Google;Meta;Apple,"Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Use a hash map for O(n) one-pass lookup.",https://leetcode.com/problems/two-sum/
Longest Substring Without Repeating Characters,Medium,Hash Table;String;Sliding Window,Amazon;Meta;Bloomberg,"Find the length of the longest substring without duplicate characters using a sliding window and frequency map. Maintain invariant: window [left, right] contains distinct characters.",https://leetcode.com/problems/longest-substring-without-repeating-characters/
Binary Tree Level Order Traversal,Medium,Tree;Breadth-First Search;Binary Tree,Amazon;Microsoft;Google,"Given the root of a binary tree, return the level order traversal of its nodes' values using a queue. Pop nodes level by level by taking queue.length at the start of each iteration.",https://leetcode.com/problems/binary-tree-level-order-traversal/
Course Schedule,Medium,Graph;Breadth-First Search;Depth-First Search;Topological Sort,Amazon;Google;Meta,"Detect cycles in a directed graph using Kahn's algorithm with indegree array or 3-color DFS traversal. If processed nodes != numCourses, a cycle exists.",https://leetcode.com/problems/course-schedule/
Word Ladder,Hard,Breadth-First Search;Hash Table;String,Amazon;Google;Meta,"Given two words beginWord and endWord, find the shortest transformation sequence length. Use bidirectional BFS or standard BFS with a visited set to explore adjacent word patterns.",https://leetcode.com/problems/word-ladder/
Trapping Rain Water,Hard,Array;Two Pointers;Dynamic Programming;Stack,Amazon;Google;Meta;Goldman Sachs,"Compute how much water it can trap after raining. Use two pointers left and right with leftMax and rightMax to compute trapped water in O(n) time and O(1) space.",https://leetcode.com/problems/trapping-rain-water/
Search in Rotated Sorted Array,Medium,Array;Binary Search,Amazon;Meta;Microsoft,"Given rotated sorted array nums, search for target in O(log n) time. Determine which half (left or right) is normally sorted, then narrow binary search boundaries.",https://leetcode.com/problems/search-in-rotated-sorted-array/
Merge Intervals,Medium,Array;Sorting,Amazon;Google;Microsoft;Meta,"Given an array of intervals, merge all overlapping intervals. Sort by start time first, then iterate comparing current interval start with last merged interval end.",https://leetcode.com/problems/merge-intervals/
Kth Largest Element in an Array,Medium,Array;Divide and Conquer;Sorting;Heap (Priority Queue);Quickselect,Amazon;Meta;Google,"Find the kth largest element. Can be solved in O(n) average time using Quickselect with randomized pivot, or O(n log k) using a Min-Heap of size k.",https://leetcode.com/problems/kth-largest-element-in-an-array/
Coin Change,Medium,Array;Dynamic Programming;Breadth-First Search,Amazon;Google;Microsoft,"Compute the fewest number of coins needed to make up that amount. Bottom-up DP: dp[i] = min(dp[i], dp[i - coin] + 1). Space O(amount), Time O(amount * len(coins)).",https://leetcode.com/problems/coin-change/
Number of Islands,Medium,Array;Depth-First Search;Breadth-First Search;Union Find,Amazon;Google;Meta;Bloomberg,"Count the number of islands. Traverse the 2D grid; when encountering '1', trigger BFS/DFS to sink the entire connected component to '0'.",https://leetcode.com/problems/number-of-islands/
Minimum Window Substring,Hard,Hash Table;String;Sliding Window,Amazon;Meta;LinkedIn,"Find the minimum window substring containing all characters of t. Expand right pointer until window is valid, then contract left pointer while keeping window valid.",https://leetcode.com/problems/minimum-window-substring/
`;

const SAMPLE_BFS_GUIDE_MD = `# Breadth-First Search (BFS) Algorithmic Guide

## Core Concepts and Invariants
Breadth-First Search traverses a graph or tree level-by-level using a FIFO Queue. It guarantees the shortest path in unweighted graphs.

### State Transitions
1. **Unvisited**: Node has not yet been discovered.
2. **Active**: Node is currently being processed or expanded.
3. **Visited / Enqueued**: Node is in queue to prevent cycles.
4. **Completed**: All neighbors explored.

### Execution Flowchart
\`\`\`mermaid
graph TD
  Start([Start BFS]) --> InitQueue[Initialize Queue with Source Node & Mark Visited]
  InitQueue --> CheckEmpty{Is Queue Empty?}
  CheckEmpty -- Yes --> Terminate([End / Return Shortest Path or Result])
  CheckEmpty -- No --> Dequeue[Dequeue Current Node u]
  Dequeue --> InspectNode[Process Node u & Inspect Neighbors]
  InspectNode --> ForEachNeighbor{For each unvisited neighbor v}
  ForEachNeighbor -- Has Unvisited --> MarkVisited[Mark v Visited & Push to Queue]
  MarkVisited --> ForEachNeighbor
  ForEachNeighbor -- All Processed --> CheckEmpty
\`\`\`

### Time & Space Complexity
- **Time Complexity**: O(V + E) where V is vertices and E is edges.
- **Space Complexity**: O(V) for the queue and visited set.
`;

const SAMPLE_SLIDING_WINDOW_MD = `# Sliding Window Pattern Guide

## Pattern Breakdown
The Sliding Window pattern is used to perform required operations on a specific window size of a given array or string, such as finding the longest subarray containing all 1s or minimum window substring.

### Two Pointers Technique
- **Right Pointer**: Expands the window by consuming elements until a constraint is satisfied or violated.
- **Left Pointer**: Contracts the window to restore invariants or optimize window length.

### Common Company Problems
- Amazon: Longest Substring Without Repeating Characters
- Meta: Minimum Window Substring
- Google: Subarray Product Less Than K
`;

async function main() {
  console.log('🌱 Starting External Knowledge Seeding...');

  try {
    // 1. Register Curated Repositories
    const repo1 = CURATED_DSA_REPOSITORIES[0]; // LeetCode-CSV
    const sourceId1 = await defaultKnowledgeIngestion.registerKnowledgeSource(repo1);
    console.log(`Registered source: ${repo1.owner}/${repo1.repo} (${sourceId1})`);

    const repo2 = CURATED_DSA_REPOSITORIES[1]; // LeetCode-Solutions
    const sourceId2 = await defaultKnowledgeIngestion.registerKnowledgeSource(repo2);
    console.log(`Registered source: ${repo2.owner}/${repo2.repo} (${sourceId2})`);

    // 2. Ingest CSV dataset
    console.log('Ingesting LeetCode Company CSV dataset...');
    const csvResult = await defaultKnowledgeIngestion.ingestCSVContent(
      sourceId1,
      `${repo1.owner}/${repo1.repo}`,
      'leetcode_company_problems.csv',
      SAMPLE_LEETCODE_CSV
    );
    console.log(`✅ CSV Ingested: ${csvResult.processed} processed, ${csvResult.created} created`);

    // 3. Ingest Guides
    console.log('Ingesting BFS & Sliding Window Guides...');
    await defaultKnowledgeIngestion.ingestMarkdownProblem(
      sourceId2,
      `${repo2.owner}/${repo2.repo}`,
      'guides/bfs-graph-traversal.md',
      SAMPLE_BFS_GUIDE_MD
    );
    await defaultKnowledgeIngestion.ingestMarkdownProblem(
      sourceId2,
      `${repo2.owner}/${repo2.repo}`,
      'guides/sliding-window-patterns.md',
      SAMPLE_SLIDING_WINDOW_MD
    );

    // Verify count in DB
    const docCount = await prisma.externalDocument.count();
    const chunkCount = await prisma.externalChunk.count();
    console.log(`🎉 Total External Documents in DB: ${docCount}`);
    console.log(`🎉 Total External Chunks with pgvector in DB: ${chunkCount}`);
  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
