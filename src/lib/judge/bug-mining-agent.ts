/**
 * src/lib/judge/bug-mining-agent.ts
 *
 * Scalable wrong-implementation retrieval pipeline:
 *
 *   Algorithm Pattern
 *         ↓
 *   Retrieve Bug Templates  (seed catalog ~20/pattern — parameterized, not concrete tests)
 *         ↓
 *   LLM filters            (fast model, ranks top-7 relevant to THIS fingerprint)
 *         ↓
 *   DB retrieval            (check JudgeTest memory for similar past bugs)
 *         ↓
 *   Final Bug List
 *
 * This scales forever: 8 patterns × 20 templates = 160 entries.
 * The LLM does ranking, not invention.
 */

import { groqClient } from '@/lib/api/groq-client';
import { prisma } from '@/lib/db/prisma';
import type { JudgePersona } from '@/types';

// ─── Bug Template Structure ────────────────────────────────────────────────────

export interface BugTemplate {
  bugId: string;
  pattern: string;
  description: string;
  typicalCode: string;
  mechanism: string;       // 'overflow' | 'off-by-one' | 'wrong-condition' | etc.
  likelihood: number;      // 0–1 historical frequency
  conceptCategory: string;
}

// ─── Seed Catalog ─────────────────────────────────────────────────────────────
// Parameterized templates, not concrete tests.
// Add new entries here as new bugs are discovered — no code changes elsewhere.

const BUG_SEED_CATALOG: BugTemplate[] = [
  // ── Two Pointer ──────────────────────────────────────────────────────────────
  { bugId: 'TP-01', pattern: 'two_pointer', description: 'Uses left < right instead of left <= right, skipping the equal-pointers case', typicalCode: 'while (left < right)', mechanism: 'off-by-one', likelihood: 0.72, conceptCategory: 'Boundary' },
  { bugId: 'TP-02', pattern: 'two_pointer', description: 'Moves both pointers simultaneously instead of conditionally', typicalCode: 'left++; right--;', mechanism: 'wrong-condition', likelihood: 0.55, conceptCategory: 'Implementation' },
  { bugId: 'TP-03', pattern: 'two_pointer', description: 'Does not handle duplicate values, skips deduplication step', typicalCode: 'while(nums[left] == nums[left-1]) left++', mechanism: 'duplicate-skip', likelihood: 0.68, conceptCategory: 'Duplicate' },
  { bugId: 'TP-04', pattern: 'two_pointer', description: 'Initializes right pointer to nums.length instead of nums.length-1', typicalCode: 'let right = nums.length', mechanism: 'off-by-one', likelihood: 0.61, conceptCategory: 'Boundary' },
  { bugId: 'TP-05', pattern: 'two_pointer', description: 'Checks sum against target without early return on exact match', typicalCode: 'if (sum == target) { /* no return */ }', mechanism: 'missing-return', likelihood: 0.44, conceptCategory: 'Implementation' },
  { bugId: 'TP-06', pattern: 'two_pointer', description: 'Forgets to sort input array before applying two-pointer convergence', typicalCode: '// missing: nums.sort()', mechanism: 'precondition', likelihood: 0.58, conceptCategory: 'Sorting' },
  { bugId: 'TP-07', pattern: 'two_pointer', description: 'Uses index 1 as left start, misses first element', typicalCode: 'let left = 1', mechanism: 'off-by-one', likelihood: 0.39, conceptCategory: 'Boundary' },

  // ── Binary Search ─────────────────────────────────────────────────────────────
  { bugId: 'BS-01', pattern: 'binary_search', description: 'Uses (left + right) / 2 causing integer overflow for large indices', typicalCode: 'mid = (left + right) / 2', mechanism: 'overflow', likelihood: 0.68, conceptCategory: 'Overflow' },
  { bugId: 'BS-02', pattern: 'binary_search', description: 'Uses left < right (exclusive) for a problem requiring the exact match at boundary', typicalCode: 'while (left < right)', mechanism: 'off-by-one', likelihood: 0.75, conceptCategory: 'Boundary' },
  { bugId: 'BS-03', pattern: 'binary_search', description: 'Updates mid pointer incorrectly: left = mid instead of left = mid + 1', typicalCode: 'left = mid', mechanism: 'infinite-loop', likelihood: 0.62, conceptCategory: 'Implementation' },
  { bugId: 'BS-04', pattern: 'binary_search', description: 'Returns wrong value: returns mid-1 or mid+1 instead of mid on exact match', typicalCode: 'return mid + 1', mechanism: 'wrong-return', likelihood: 0.53, conceptCategory: 'Boundary' },
  { bugId: 'BS-05', pattern: 'binary_search', description: 'Does not handle the case where target does not exist, no -1 return', typicalCode: '// missing: return -1', mechanism: 'missing-case', likelihood: 0.58, conceptCategory: 'Constraint' },
  { bugId: 'BS-06', pattern: 'binary_search', description: 'Applies binary search to an unsorted array', typicalCode: '// missing: sort check', mechanism: 'precondition', likelihood: 0.41, conceptCategory: 'Sorting' },
  { bugId: 'BS-07', pattern: 'binary_search', description: 'Confuses lower-bound and upper-bound: updates right = mid - 1 instead of right = mid', typicalCode: 'right = mid - 1', mechanism: 'wrong-condition', likelihood: 0.66, conceptCategory: 'Binary Search' },

  // ── Sliding Window ────────────────────────────────────────────────────────────
  { bugId: 'SW-01', pattern: 'sliding_window', description: 'Window does not shrink when constraint is violated', typicalCode: '// missing while loop to shrink', mechanism: 'missing-shrink', likelihood: 0.70, conceptCategory: 'Sliding Window' },
  { bugId: 'SW-02', pattern: 'sliding_window', description: 'Updates maxLen before shrinking, counting invalid state', typicalCode: 'maxLen = Math.max(maxLen, right - left + 1)', mechanism: 'wrong-order', likelihood: 0.65, conceptCategory: 'Implementation' },
  { bugId: 'SW-03', pattern: 'sliding_window', description: 'Does not remove left element from window map when shrinking', typicalCode: 'left++; // missing map.delete()', mechanism: 'state-corruption', likelihood: 0.72, conceptCategory: 'Hashing' },
  { bugId: 'SW-04', pattern: 'sliding_window', description: 'Off-by-one in window size calculation: right - left instead of right - left + 1', typicalCode: 'size = right - left', mechanism: 'off-by-one', likelihood: 0.60, conceptCategory: 'Boundary' },
  { bugId: 'SW-05', pattern: 'sliding_window', description: 'Initializes window size to 1 but problem requires minimum size of k', typicalCode: 'let maxLen = 1', mechanism: 'wrong-init', likelihood: 0.48, conceptCategory: 'Constraint' },
  { bugId: 'SW-06', pattern: 'sliding_window', description: 'Breaks inner while loop with a flag but forgets to reset state variable', typicalCode: 'break; // state not reset', mechanism: 'state-corruption', likelihood: 0.52, conceptCategory: 'Implementation' },

  // ── Hash Map ──────────────────────────────────────────────────────────────────
  { bugId: 'HM-01', pattern: 'hash_map', description: 'Does not check if key exists before accessing, returns undefined', typicalCode: 'map[key] += 1', mechanism: 'null-deref', likelihood: 0.66, conceptCategory: 'Hashing' },
  { bugId: 'HM-02', pattern: 'hash_map', description: 'Uses index in map instead of value (for complement lookup problems)', typicalCode: 'map.set(i, nums[i])', mechanism: 'wrong-key', likelihood: 0.58, conceptCategory: 'Hashing' },
  { bugId: 'HM-03', pattern: 'hash_map', description: 'Adds current element to map before checking for complement', typicalCode: 'map.set(nums[i], i); if (map.has(target - nums[i]))', mechanism: 'order', likelihood: 0.70, conceptCategory: 'Implementation' },
  { bugId: 'HM-04', pattern: 'hash_map', description: 'Reuses same index for both elements of a pair', typicalCode: 'return [map.get(complement), map.get(complement)]', mechanism: 'same-index', likelihood: 0.44, conceptCategory: 'Implementation' },
  { bugId: 'HM-05', pattern: 'hash_map', description: 'Clears map at wrong point inside loop, losing historical entries', typicalCode: 'map.clear(); // inside loop', mechanism: 'state-corruption', likelihood: 0.42, conceptCategory: 'Hashing' },

  // ── Prefix Sum ────────────────────────────────────────────────────────────────
  { bugId: 'PS-01', pattern: 'prefix_sum', description: 'Initializes prefix[0] = 0 but misaligns index by 1 for range queries', typicalCode: 'prefix[i] = prefix[i-1] + nums[i-1]', mechanism: 'off-by-one', likelihood: 0.65, conceptCategory: 'Boundary' },
  { bugId: 'PS-02', pattern: 'prefix_sum', description: 'Forgets to include prefix[0] = 0 sentinel, wrong range sum for index 0', typicalCode: 'prefix = new Array(n)', mechanism: 'missing-init', likelihood: 0.59, conceptCategory: 'Implementation' },
  { bugId: 'PS-03', pattern: 'prefix_sum', description: 'Range query uses prefix[r] - prefix[l] instead of prefix[r+1] - prefix[l]', typicalCode: 'sum = prefix[r] - prefix[l]', mechanism: 'off-by-one', likelihood: 0.68, conceptCategory: 'Boundary' },
  { bugId: 'PS-04', pattern: 'prefix_sum', description: 'Integer overflow in prefix sum for large input values', typicalCode: 'prefix[i] = prefix[i-1] + nums[i]', mechanism: 'overflow', likelihood: 0.55, conceptCategory: 'Overflow' },

  // ── Dynamic Programming ───────────────────────────────────────────────────────
  { bugId: 'DP-01', pattern: 'dynamic_programming', description: 'Incorrect base case: dp[0] = 0 when dp[0] should be 1', typicalCode: 'dp[0] = 0', mechanism: 'wrong-base', likelihood: 0.71, conceptCategory: 'DP' },
  { bugId: 'DP-02', pattern: 'dynamic_programming', description: 'Transition uses dp[i-1] but i starts from 0, causing index out of bounds', typicalCode: 'for (let i = 0; ...) dp[i] = dp[i-1]', mechanism: 'off-by-one', likelihood: 0.62, conceptCategory: 'Boundary' },
  { bugId: 'DP-03', pattern: 'dynamic_programming', description: 'Uses top-down recursion without memoization, exponential time complexity', typicalCode: 'function dp(i) { return dp(i-1) + dp(i-2); }', mechanism: 'no-memo', likelihood: 0.60, conceptCategory: 'DP' },
  { bugId: 'DP-04', pattern: 'dynamic_programming', description: 'Wrong loop order for 2D DP (processes column before row or vice versa)', typicalCode: 'for j ... for i ... dp[i][j]', mechanism: 'wrong-order', likelihood: 0.56, conceptCategory: 'DP' },
  { bugId: 'DP-05', pattern: 'dynamic_programming', description: 'Forgets to take max/min over all subproblems, only checks last', typicalCode: 'return dp[n]', mechanism: 'missing-max', likelihood: 0.58, conceptCategory: 'DP' },

  // ── Graph ──────────────────────────────────────────────────────────────────────
  { bugId: 'GR-01', pattern: 'graph', description: 'Does not mark nodes as visited before enqueuing, causing infinite loops', typicalCode: 'queue.push(neighbor); // visited[neighbor] set too late', mechanism: 'infinite-loop', likelihood: 0.74, conceptCategory: 'Graph' },
  { bugId: 'GR-02', pattern: 'graph', description: 'Uses adjacency matrix but forgets diagonal (self-loops)', typicalCode: 'for j in range(n): if matrix[i][j]', mechanism: 'self-loop', likelihood: 0.41, conceptCategory: 'Graph' },
  { bugId: 'GR-03', pattern: 'graph', description: 'BFS returns wrong distance: returns parent distance instead of child', typicalCode: 'dist[neighbor] = dist[node]', mechanism: 'wrong-update', likelihood: 0.63, conceptCategory: 'Graph' },
  { bugId: 'GR-04', pattern: 'graph', description: 'DFS does not handle disconnected components, misses nodes not reachable from start', typicalCode: 'dfs(0, ...)', mechanism: 'missing-case', likelihood: 0.69, conceptCategory: 'Graph' },

  // ── Tree ───────────────────────────────────────────────────────────────────────
  { bugId: 'TR-01', pattern: 'tree', description: 'Does not handle null root case, causes null pointer exception', typicalCode: 'if (!root) // missing', mechanism: 'null-deref', likelihood: 0.78, conceptCategory: 'Tree' },
  { bugId: 'TR-02', pattern: 'tree', description: 'Confuses in-order with pre-order traversal for BST operations', typicalCode: 'visit(node); traverse(left); traverse(right)', mechanism: 'wrong-order', likelihood: 0.60, conceptCategory: 'Tree' },
  { bugId: 'TR-03', pattern: 'tree', description: 'Height computation off by 1: returns max(l, r) instead of max(l, r) + 1', typicalCode: 'return Math.max(leftH, rightH)', mechanism: 'off-by-one', likelihood: 0.65, conceptCategory: 'Tree' },
  { bugId: 'TR-04', pattern: 'tree', description: 'BFS level tracking wrong: adds all nodes in queue as same level when level changes mid-iteration', typicalCode: 'while (queue.length) { const node = queue.shift(); level++ }', mechanism: 'wrong-level', likelihood: 0.55, conceptCategory: 'Tree' },
];

// ─── LLM Filtering ────────────────────────────────────────────────────────────

async function filterBugsWithLLM(
  bugs: BugTemplate[],
  patternSlug: string,
  fingerprintJson: string,
  topN: number = 7
): Promise<BugTemplate[]> {
  if (bugs.length <= topN) return bugs;

  const catalogText = bugs.map(b =>
    `[${b.bugId}] ${b.description} (mechanism: ${b.mechanism}, likelihood: ${b.likelihood})`
  ).join('\n');

  const prompt = `You are a competitive programming judge expert.

Given this implementation fingerprint for a "${patternSlug}" solution:
${fingerprintJson}

And these known bug templates for this algorithm:
${catalogText}

Task: Return the IDs of the ${topN} bugs MOST LIKELY to manifest in this specific implementation, based on the fingerprint.
Consider: loop structure, pointer strategy, comparison style, termination condition, duplicate handling.

Return ONLY a valid JSON array of bug IDs, e.g.: ["BS-02", "BS-07", "BS-01", ...]
No explanation needed.`;

  try {
    const response = await groqClient.getChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      model: 'llama-3.1-8b-instant', // fast model — this is just ranking
    });

    const parsed = JSON.parse(response.content.trim());
    const ids: string[] = Array.isArray(parsed) ? parsed : (parsed.ids || parsed.bugIds || []);
    const filtered = bugs.filter(b => ids.includes(b.bugId));
    return filtered.length > 0 ? filtered.slice(0, topN) : bugs.slice(0, topN);
  } catch {
    // Fallback: sort by likelihood and return top N
    return bugs.sort((a, b) => b.likelihood - a.likelihood).slice(0, topN);
  }
}

// ─── Judge Memory Query ────────────────────────────────────────────────────────

export async function retrieveJudgeMemory(
  problemSlug: string,
  patternSlug: string,
  judgePersona: JudgePersona,
  limit: number = 15
): Promise<any[]> {
  try {
    const cached = await prisma.judgeTest.findMany({
      where: { problemSlug, patternSlug, judgePersona, verified: true },
      orderBy: [{ permanentTest: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    return cached.map(t => t.fullJson);
  } catch {
    return [];
  }
}

// ─── Main Entry Point ──────────────────────────────────────────────────────────

export async function mineBugs(
  patternSlug: string,
  fingerprintJson: string,
  topN: number = 7
): Promise<BugTemplate[]> {
  // 1. Retrieve pattern-specific bugs from seed catalog
  const patternBugs = BUG_SEED_CATALOG.filter(b => b.pattern === patternSlug);

  // If no specific pattern bugs, return top generic bugs by likelihood
  if (patternBugs.length === 0) {
    return BUG_SEED_CATALOG
      .sort((a, b) => b.likelihood - a.likelihood)
      .slice(0, topN);
  }

  // 2. Use LLM to filter to most relevant for this specific fingerprint
  return filterBugsWithLLM(patternBugs, patternSlug, fingerprintJson, topN);
}

/**
 * Formats bug list for injection into the PRAXIS prompt.
 */
export function formatBugsForPrompt(bugs: BugTemplate[]): string {
  return bugs.map((b, i) => `
Bug ${i + 1} [${b.bugId}]:
  Description: ${b.description}
  Typical Code Pattern: \`${b.typicalCode}\`
  Failure Mechanism: ${b.mechanism}
  Historical Likelihood: ${Math.round(b.likelihood * 100)}%
  Concept Category: ${b.conceptCategory}`).join('\n');
}
