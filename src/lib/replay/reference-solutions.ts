/**
 * reference-solutions.ts
 * Curated correct reference solutions for common LeetCode problems.
 * Used as ground-truth for differential testing.
 *
 * Groq fallback: if slug not found, ask Groq to generate a correct
 * brute-force solution. Brute force is intentional — correctness over speed.
 */

// ─── Seeded reference solutions (JavaScript) ─────────────────────────────────

const REFERENCE_SOLUTIONS: Record<string, string> = {
  'two-sum': `
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}`,

  'best-time-to-buy-and-sell-stock': `
function maxProfit(prices) {
  let minPrice = Infinity, maxP = 0;
  for (const p of prices) {
    minPrice = Math.min(minPrice, p);
    maxP = Math.max(maxP, p - minPrice);
  }
  return maxP;
}`,

  'contains-duplicate': `
function containsDuplicate(nums) {
  return new Set(nums).size !== nums.length;
}`,

  'maximum-subarray': `
function maxSubArray(nums) {
  let max = nums[0], cur = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    max = Math.max(max, cur);
  }
  return max;
}`,

  'product-of-array-except-self': `
function productExceptSelf(nums) {
  const n = nums.length, res = Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) { res[i] = prefix; prefix *= nums[i]; }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) { res[i] *= suffix; suffix *= nums[i]; }
  return res;
}`,

  'binary-search': `
function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,

  'search-insert-position': `
function searchInsert(nums, target) {
  let lo = 0, hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}`,

  'valid-palindrome': `
function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}`,

  'reverse-linked-list': `
function reverseList(head) {
  let prev = null, cur = head;
  while (cur) { const next = cur.next; cur.next = prev; prev = cur; cur = next; }
  return prev;
}`,

  'climbing-stairs': `
function climbStairs(n) {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) { const c = a + b; a = b; b = c; }
  return b;
}`,

  'longest-common-prefix': `
function longestCommonPrefix(strs) {
  if (!strs.length) return '';
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (!strs[i].startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) return '';
  }
  return prefix;
}`,

  'valid-anagram': `
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const c of s) count[c] = (count[c] || 0) + 1;
  for (const c of t) { if (!count[c]) return false; count[c]--; }
  return true;
}`,

  'merge-sorted-array': `
function merge(nums1, m, nums2, n) {
  let i = m - 1, j = n - 1, k = m + n - 1;
  while (i >= 0 && j >= 0) {
    nums1[k--] = nums1[i] > nums2[j] ? nums1[i--] : nums2[j--];
  }
  while (j >= 0) nums1[k--] = nums2[j--];
}`,

  'move-zeroes': `
function moveZeroes(nums) {
  let pos = 0;
  for (const n of nums) if (n !== 0) nums[pos++] = n;
  while (pos < nums.length) nums[pos++] = 0;
  return nums;
}`,

  'single-number': `
function singleNumber(nums) {
  return nums.reduce((a, b) => a ^ b, 0);
}`,

  'majority-element': `
function majorityElement(nums) {
  let count = 0, cand = 0;
  for (const n of nums) {
    if (count === 0) cand = n;
    count += (n === cand) ? 1 : -1;
  }
  return cand;
}`,

  'find-minimum-in-rotated-sorted-array': `
function findMin(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] > nums[hi]) lo = mid + 1;
    else hi = mid;
  }
  return nums[lo];
}`,

  'missing-number': `
function missingNumber(nums) {
  const n = nums.length;
  return n * (n + 1) / 2 - nums.reduce((a, b) => a + b, 0);
}`,

  'reverse-string': `
function reverseString(s) {
  let l = 0, r = s.length - 1;
  while (l < r) { [s[l], s[r]] = [s[r], s[l]]; l++; r--; }
  return s;
}`,
};

// ─── Groq fallback ────────────────────────────────────────────────────────────

async function groqGenerateReference(
  problemTitle: string,
  problemTopics: string[],
  difficulty: string
): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 600,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You are a competitive programming expert. Write correct, simple JavaScript solutions. Return ONLY the function code, no explanation, no markdown.',
          },
          {
            role: 'user',
            content: `Write a correct JavaScript brute-force solution for the LeetCode problem: "${problemTitle}" (${difficulty}). Topics: ${problemTopics.join(', ')}. Return only the function code.`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Strip markdown fences if present
    return content.replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '');
  } catch {
    return null;
  }
}

// ─── Generic brute-force fallbacks by topic ───────────────────────────────────

function getTopicFallback(topics: string[], slug: string): string | null {
  const t = topics.join(' ').toLowerCase();
  const s = slug.toLowerCase();

  if (t.includes('sort') || s.includes('sort')) {
    return `function solution(nums) { return [...nums].sort((a,b)=>a-b); }`;
  }
  if (s.includes('sum') || t.includes('prefix')) {
    return `function solution(nums, target) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i+1; j < nums.length; j++)
      if (nums[i] + nums[j] === target) return [i,j];
  return [];
}`;
  }
  if (t.includes('string') || s.includes('palindrome')) {
    return `function solution(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g,'');
  return clean === clean.split('').reverse().join('');
}`;
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getReferenceSolution(
  slug: string,
  problemTitle: string,
  problemTopics: string[],
  difficulty: string
): Promise<string | null> {
  // 1. Seeded exact match
  const seeded = REFERENCE_SOLUTIONS[slug];
  if (seeded) return seeded.trim();

  // 2. Groq-generated
  const groqSolution = await groqGenerateReference(problemTitle, problemTopics, difficulty);
  if (groqSolution) return groqSolution;

  // 3. Topic-based brute-force fallback
  return getTopicFallback(problemTopics, slug);
}
