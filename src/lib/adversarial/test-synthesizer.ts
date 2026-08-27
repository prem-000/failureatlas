/**
 * src/lib/adversarial/test-synthesizer.ts
 *
 * Problem-Specific Hidden Test Synthesis
 *
 * Primary path: LLM generates 8–12 problem-specific test candidates freely
 *               (no forced category labels), then selects best 5.
 * Fallback path: Parameter-driven deterministic generator using the
 *               ProblemSemanticModel to construct constraint-boundary inputs.
 *
 * Both paths verify outputs via the problem oracle and validate via test-validator.
 */

import type {
  EvidenceBasedHiddenTest,
  EvidencePack,
} from './types';
import type { ProblemSemanticModel } from './problem-semantic-model';
import { groqClient } from '@/lib/api/groq-client';
import { evaluateProblemOracle } from './problem-oracle';
import { validateAndDeduplicateTests } from './test-validator';

export async function synthesizeHiddenTests(
  pack: EvidencePack,
  semantic?: ProblemSemanticModel
): Promise<EvidenceBasedHiddenTest[]> {
  const { problem, submission, stressTargets } = pack;

  const validationContext = {
    problemTitle: problem.title,
    problemSlug: problem.slug || problem.title,
    constraints: problem.constraints,
    sourceCode: submission.sourceCode,
    detectedApproach: submission.detectedApproach.algorithm,
    parameters: submission.normalizedFacts.functions[0]?.params || [],
  };

  // ── Primary Path: LLM Free-Form Test Generation ──────────────────────────
  try {
    const llmTests = await generateViaLLM(pack, semantic);
    if (llmTests.length >= 5) {
      const validated = validateAndDeduplicateTests(llmTests, validationContext);
      if (validated.length >= 5) {
        return validated.slice(0, 5);
      }
    }
  } catch (err) {
    console.warn('[TestSynthesizer] LLM generation failed, using deterministic fallback:', err);
  }

  // ── Fallback Path: Semantic-Model-Driven Deterministic Generation ────────
  const fallbackTests = generateDeterministicTests(pack, semantic);
  return validateAndDeduplicateTests(fallbackTests, validationContext).slice(0, 5);
}

// ─── LLM Generation ─────────────────────────────────────────────────────────

async function generateViaLLM(
  pack: EvidencePack,
  semantic?: ProblemSemanticModel
): Promise<EvidenceBasedHiddenTest[]> {
  const { problem, submission, stressTargets } = pack;
  const params = submission.normalizedFacts.functions[0]?.params || [];
  const paramSignature = params.length > 0 ? params.join(', ') : 'input';

  // Build hypothesis summary from stress targets for context
  const hypothesisSummary = stressTargets.map((st, i) =>
    `${i + 1}. ${st.title}: ${st.hypothesis}`
  ).join('\n');

  const prompt = `You are an expert competitive programming test case designer.

## PROBLEM
Title: ${problem.title}
${semantic ? `Correctness: ${semantic.correctnessCondition}` : ''}
Constraints: ${problem.constraints.join('; ') || 'Standard bounds'}
Function signature parameters: (${paramSignature})
${semantic ? `Input shape: ${semantic.inputShape}` : ''}

## SUBMITTED SOURCE CODE
\`\`\`${submission.language}
${submission.sourceCode}
\`\`\`

Detected approach: ${submission.detectedApproach.algorithm} (${submission.complexity.detectedTime} time)

## FAILURE HYPOTHESES DISCOVERED
${hypothesisSummary}

## TASK
Generate 10 hidden test cases for the problem "${problem.title}" that test this specific submitted implementation.

RULES:
1. Each test must use the EXACT parameter format of this problem: (${paramSignature})
2. Each test title must describe the actual problem behavior being tested — NOT generic terms like "Invariant Stress" or "Mutation Sensitivity"
3. Expected output must be the correct answer for this exact problem and input
4. Tests must be meaningfully different from each other
5. If the code is correct, test legitimate edge cases and boundary behaviors — do NOT invent fake bugs
6. Do NOT reuse generic test templates — every test must be specific to "${problem.title}"

## OUTPUT FORMAT
Return valid JSON:
{
  "tests": [
    {
      "title": "Specific behavior being tested",
      "classification": "boundary|state|semantic|scale|confirmed_failure",
      "input": "Exact valid input matching parameter format",
      "expectedOutput": "Correct answer",
      "whyExists": "Why this test matters for this problem and this code",
      "whatItAttacks": "What specific code behavior or problem condition it tests",
      "evidenceFromCode": "The code line or variable relevant to this test"
    }
  ]
}`;

  const res = await groqClient.getChatCompletion({
    messages: [
      { role: 'system', content: 'You are a precise competitive programming test designer. Return valid JSON only. Each test must be specific to the given problem.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.15,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(res.content);
  const rawTests: any[] = Array.isArray(parsed.tests) ? parsed.tests : [];

  return rawTests.map((t, idx) => {
    const oracleResult = evaluateProblemOracle(problem.slug || problem.title, t.input, t.expectedOutput);
    const classification = mapClassification(t.classification);

    return {
      id: `HT-0${idx + 1}`,
      targetId: stressTargets[idx]?.id,
      kind: classification,
      riskTitle: t.title || `Test ${idx + 1}`,
      confidence: 'High' as const,
      confidenceScore: 90,
      verificationStatus: oracleResult.verificationStatus,
      verificationBadgeText: oracleResult.verificationBadgeText,
      evidence: [{
        source: 'source_code' as const,
        description: t.evidenceFromCode || 'Derived from submitted source code analysis',
        confidence: 0.88,
      }],
      input: t.input || '',
      expectedOutput: oracleResult.expectedOutput || t.expectedOutput || '',
      whyExists: t.whyExists || '',
      whatItAttacks: t.whatItAttacks || '',
      constraintRelevance: `Tests problem-specific behavior for ${problem.title}`,
    };
  });
}

function mapClassification(raw: string): EvidenceBasedHiddenTest['kind'] {
  if (!raw) return 'boundary';
  const c = raw.toLowerCase();
  if (c.includes('confirmed') || c.includes('failure')) return 'confirmed_failure';
  if (c.includes('root') || c.includes('attack')) return 'root_cause_attack';
  if (c.includes('state') || c.includes('invariant')) return 'invariant';
  if (c.includes('scale') || c.includes('complexity') || c.includes('performance')) return 'complexity';
  if (c.includes('semantic') || c.includes('regression') || c.includes('correctness')) return 'semantic_regression';
  return 'boundary';
}

// ─── Deterministic Fallback ──────────────────────────────────────────────────

function generateDeterministicTests(
  pack: EvidencePack,
  semantic?: ProblemSemanticModel
): EvidenceBasedHiddenTest[] {
  const { problem, submission, stressTargets } = pack;
  const slug = (problem.slug || problem.title).toLowerCase().replace(/[^a-z0-9]/g, '-');

  // 1. Try known-problem test suites (canonical problems with verified inputs/outputs)
  const knownTests = getKnownProblemTests(slug);
  if (knownTests.length >= 5) {
    return knownTests.slice(0, 5).map((t, idx) => {
      const oracleResult = evaluateProblemOracle(slug, t.input, t.expected);
      const matchingTarget = stressTargets[idx];
      return {
        id: `HT-0${idx + 1}`,
        targetId: matchingTarget?.id,
        kind: (matchingTarget?.kind || 'boundary') as EvidenceBasedHiddenTest['kind'],
        riskTitle: t.title,
        confidence: 'High' as const,
        confidenceScore: matchingTarget?.confidence || 92,
        verificationStatus: oracleResult.verificationStatus,
        verificationBadgeText: oracleResult.verificationBadgeText,
        evidence: matchingTarget?.sourceEvidence || [],
        input: t.input,
        expectedOutput: oracleResult.expectedOutput,
        whyExists: t.whyExists,
        whatItAttacks: t.whatItAttacks,
        constraintRelevance: t.constraintRelevance || `Problem-specific boundary for ${problem.title}`,
      };
    });
  }

  // 2. Semantic-model-driven generation (parameter-aware)
  if (semantic) {
    return generateFromSemanticModel(pack, semantic);
  }

  // 3. Last resort: stress-target-driven generation
  return generateFromStressTargets(pack);
}

// ─── Known Problem Test Suites ───────────────────────────────────────────────
// Each entry has problem-specific titles and verified inputs. NOT generic templates.

interface KnownTest {
  title: string;
  input: string;
  expected: string;
  whyExists: string;
  whatItAttacks: string;
  constraintRelevance?: string;
}

function getKnownProblemTests(slug: string): KnownTest[] {
  // Two Sum
  if (slug.includes('two-sum') && !slug.includes('ii') && !slug.includes('iii')) {
    return [
      { title: 'Basic complement pair at start', input: 'nums = [2, 7, 11, 15], target = 9', expected: '[0, 1]', whyExists: 'Validates basic complement lookup where the pair appears at the beginning', whatItAttacks: 'Hash map insertion order and complement calculation' },
      { title: 'Complement pair not adjacent', input: 'nums = [3, 2, 4], target = 6', expected: '[1, 2]', whyExists: 'The complement is not adjacent to the current element — tests map persistence across iterations', whatItAttacks: 'Whether previously stored values are correctly retrieved' },
      { title: 'Duplicate values as valid pair', input: 'nums = [3, 3], target = 6', expected: '[0, 1]', whyExists: 'Two identical values that sum to target — tests whether the code handles duplicate entries without returning the same index twice', whatItAttacks: 'Duplicate key handling: same value stored at different indices' },
      { title: 'Negative number complement', input: 'nums = [-1, -2, -3, -4, -5], target = -8', expected: '[2, 4]', whyExists: 'All-negative array — tests correct signed arithmetic in complement calculation', whatItAttacks: 'Whether target - nums[i] correctly computes a negative complement' },
      { title: 'Zero-sum complement pair', input: 'nums = [0, 4, 3, 0], target = 0', expected: '[0, 3]', whyExists: 'Target is 0 and both elements are 0 — tests edge case where complement equals the current value', whatItAttacks: 'Zero as target and zero as array element simultaneously' },
    ];
  }

  // Longest Substring Without Repeating Characters
  if (slug.includes('longest-substring-without-repeating-characters')) {
    return [
      { title: 'Multiple repeating windows', input: 's = "abcabcbb"', expected: '3', whyExists: 'Classic case with overlapping repeating segments — longest unique window is "abc" (length 3)', whatItAttacks: 'Window contraction when a duplicate enters the window' },
      { title: 'All identical characters', input: 's = "bbbbb"', expected: '1', whyExists: 'Every character is the same — the longest substring without repeats is a single character', whatItAttacks: 'Whether the window correctly contracts to size 1 for each duplicate' },
      { title: 'Repeat after non-repeat', input: 's = "pwwkew"', expected: '3', whyExists: 'The repeat "ww" occurs mid-string — tests correct left pointer jump past the first w', whatItAttacks: 'Left pointer update: must jump to max(left, lastSeen[char] + 1)' },
      { title: 'Empty string input', input: 's = ""', expected: '0', whyExists: 'Empty input — the loop body never executes, result must be 0', whatItAttacks: 'Whether the code returns 0 without entering the loop' },
      { title: 'All unique characters', input: 's = "abcdefghijklmnopqrstuvwxyz"', expected: '26', whyExists: 'No repeats at all — the entire string is the answer', whatItAttacks: 'Whether the window expands to cover the full string when no contractions are needed' },
    ];
  }

  // Binary Search
  if (slug.includes('binary-search') && !slug.includes('tree') && !slug.includes('rotated')) {
    return [
      { title: 'Target in middle of array', input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', expected: '4', whyExists: 'Standard case — target exists in the array', whatItAttacks: 'Basic midpoint calculation and comparison logic' },
      { title: 'Target not present', input: 'nums = [-1, 0, 3, 5, 9, 12], target = 2', expected: '-1', whyExists: 'Target is absent — the search must exhaust the interval and return -1', whatItAttacks: 'Whether the loop terminates correctly when target is between two elements' },
      { title: 'Single element found', input: 'nums = [5], target = 5', expected: '0', whyExists: 'Array has exactly one element matching target', whatItAttacks: 'Whether left == right is correctly handled as a valid search state' },
      { title: 'Target at left boundary', input: 'nums = [2, 5], target = 2', expected: '0', whyExists: 'Target is the first element — tests whether the search finds it before narrowing right', whatItAttacks: 'Midpoint calculation for even-length arrays with target at index 0' },
      { title: 'Target at right boundary', input: 'nums = [2, 5], target = 5', expected: '1', whyExists: 'Target is the last element — tests whether the search narrows left correctly', whatItAttacks: 'Whether left = mid + 1 eventually reaches the rightmost element' },
    ];
  }

  // Valid Parentheses
  if (slug.includes('valid-parentheses')) {
    return [
      { title: 'Simple valid pairing', input: 's = "()"', expected: 'true', whyExists: 'Minimal valid input — single matching pair', whatItAttacks: 'Basic push-pop stack operation' },
      { title: 'Mixed bracket types', input: 's = "()[]{}"', expected: 'true', whyExists: 'All three bracket types in valid order', whatItAttacks: 'Whether the matching map handles all bracket types correctly' },
      { title: 'Incorrect nesting order', input: 's = "(]"', expected: 'false', whyExists: 'Open paren with wrong closing bracket — must detect type mismatch', whatItAttacks: 'Stack top comparison: "(" does not match "]"' },
      { title: 'Nested valid structure', input: 's = "([{}])"', expected: 'true', whyExists: 'Deeply nested brackets — tests correct LIFO ordering', whatItAttacks: 'Whether the stack correctly unwinds nested structures' },
      { title: 'Unmatched opening bracket', input: 's = "((("', expected: 'false', whyExists: 'Only opening brackets — stack is non-empty at end', whatItAttacks: 'Whether the final stack-empty check catches unmatched openers' },
    ];
  }

  // Climbing Stairs
  if (slug.includes('climbing-stairs')) {
    return [
      { title: 'Single stair', input: 'n = 1', expected: '1', whyExists: 'Minimum input — only one way to climb', whatItAttacks: 'Base case handling for n = 1' },
      { title: 'Two stairs', input: 'n = 2', expected: '2', whyExists: 'Two options: (1+1) or (2) — tests second base case', whatItAttacks: 'Whether the DP initializes both base cases correctly' },
      { title: 'Fibonacci sequence value', input: 'n = 5', expected: '8', whyExists: 'Verifies the Fibonacci recurrence produces the correct value at n=5', whatItAttacks: 'State transition: dp[i] = dp[i-1] + dp[i-2]' },
      { title: 'Mid-range computation', input: 'n = 10', expected: '89', whyExists: 'Tests cumulative accuracy — any off-by-one in the recurrence compounds over iterations', whatItAttacks: 'Accumulator correctness across multiple iterations' },
      { title: 'Maximum constraint boundary', input: 'n = 45', expected: '1836311903', whyExists: 'Maximum allowed n — tests whether the result fits in a 32-bit integer and the loop runs fully', whatItAttacks: 'Integer overflow risk and loop upper bound' },
    ];
  }

  // Palindrome Number
  if (slug.includes('palindrome-number') || slug === 'palindrome') {
    return [
      { title: 'Negative number (not palindrome)', input: 'x = -121', expected: 'false', whyExists: 'Negative numbers have a minus sign — cannot read the same backward', whatItAttacks: 'Whether the code correctly rejects all negative inputs' },
      { title: 'Zero (single digit palindrome)', input: 'x = 0', expected: 'true', whyExists: 'Zero is a valid palindrome — single digit reads the same in both directions', whatItAttacks: 'Base case handling for x = 0' },
      { title: 'Trailing zero (not palindrome)', input: 'x = 10', expected: 'false', whyExists: '10 reversed is 01 which is 1 — not equal to 10', whatItAttacks: 'Whether numbers ending in 0 (but not 0 itself) are correctly rejected' },
      { title: 'Multi-digit palindrome', input: 'x = 121', expected: 'true', whyExists: 'Standard odd-length palindrome', whatItAttacks: 'Core reverse/compare logic for positive palindromes' },
      { title: 'Large palindrome', input: 'x = 1234321', expected: 'true', whyExists: 'Longer palindrome — tests that the reversal logic works beyond small inputs', whatItAttacks: 'Whether full reversal or half-reversal comparison handles 7-digit numbers' },
    ];
  }

  // Valid Palindrome
  if (slug.includes('valid-palindrome') && !slug.includes('ii')) {
    return [
      { title: 'Sentence with punctuation (valid)', input: 's = "A man, a plan, a canal: Panama"', expected: 'true', whyExists: 'Classic palindrome with spaces, commas, and colons that must be ignored', whatItAttacks: 'Non-alphanumeric character filtering and case-insensitive comparison' },
      { title: 'Non-palindrome sentence', input: 's = "race a car"', expected: 'false', whyExists: '"raceacar" is not a palindrome — tests the full comparison', whatItAttacks: 'Whether the two-pointer comparison detects the mismatch' },
      { title: 'Single space (valid)', input: 's = " "', expected: 'true', whyExists: 'After filtering, the string is empty — empty strings are palindromes', whatItAttacks: 'Edge case where all characters are non-alphanumeric' },
      { title: 'Mixed case non-palindrome', input: 's = "0P"', expected: 'false', whyExists: '"0" and "p" are different after lowercasing — tests alphanumeric boundary', whatItAttacks: 'Whether digit "0" and letter "P" are correctly compared' },
      { title: 'Underscore-separated palindrome', input: 's = "ab_a"', expected: 'true', whyExists: 'After removing "_", the string is "aba" which is a palindrome', whatItAttacks: 'Whether underscores are correctly filtered as non-alphanumeric' },
    ];
  }

  // Length of Last Word
  if (slug.includes('length-of-last-word')) {
    return [
      { title: 'Two words', input: 's = "Hello World"', expected: '5', whyExists: 'Simple two-word string — last word is "World" (length 5)', whatItAttacks: 'Basic word boundary detection' },
      { title: 'Trailing spaces', input: 's = "   fly me   to   the moon  "', expected: '4', whyExists: 'Trailing and multiple spaces — must find "moon" (length 4) ignoring trailing whitespace', whatItAttacks: 'Whether trailing spaces are correctly skipped before finding the last word' },
      { title: 'No trailing spaces', input: 's = "luffy is still joyboy"', expected: '6', whyExists: 'Last word "joyboy" has no trailing space — direct boundary', whatItAttacks: 'Whether the scan correctly identifies the last word at end-of-string' },
      { title: 'Single character word', input: 's = "a"', expected: '1', whyExists: 'Minimum valid input — single character is the entire last word', whatItAttacks: 'Edge case with no spaces at all' },
      { title: 'Surrounded by spaces', input: 's = "    day    "', expected: '3', whyExists: 'Word "day" surrounded by leading and trailing spaces', whatItAttacks: 'Both leading and trailing space handling' },
    ];
  }

  // Find the Index of the First Occurrence in a String
  if (slug.includes('find-the-index-of-the-first-occurrence')) {
    return [
      { title: 'Needle at start', input: 'haystack = "sadbutsad", needle = "sad"', expected: '0', whyExists: 'Needle appears at index 0 — should return 0, not a later occurrence', whatItAttacks: 'Whether the search returns the first match, not just any match' },
      { title: 'Needle not present', input: 'haystack = "leetcode", needle = "leeto"', expected: '-1', whyExists: 'Needle is not a substring — must return -1', whatItAttacks: 'Whether the search correctly exhausts all positions and returns -1' },
      { title: 'Single character match', input: 'haystack = "a", needle = "a"', expected: '0', whyExists: 'Both strings are single characters and equal', whatItAttacks: 'Minimum length boundary for both haystack and needle' },
      { title: 'Partial match then full match', input: 'haystack = "mississippi", needle = "issip"', expected: '4', whyExists: 'Partial matches at positions 1 and 4 — must find the correct complete match', whatItAttacks: 'Whether partial matches are correctly rejected before the full match is found' },
      { title: 'Needle longer than haystack', input: 'haystack = "aaa", needle = "aaaa"', expected: '-1', whyExists: 'Needle cannot fit in haystack — should return -1 immediately', whatItAttacks: 'Whether the code handles needle.length > haystack.length' },
    ];
  }

  // Sub-arrays of Size K with Threshold
  if (slug.includes('sub-arrays-of-size-k') || slug.includes('average-greater-than-or-equal-to-threshold')) {
    return [
      { title: 'Multiple qualifying windows', input: 'arr = [2, 2, 2, 2, 5, 5, 5, 8], k = 3, threshold = 4', expected: '3', whyExists: 'Multiple contiguous windows of size 3 have average >= 4', whatItAttacks: 'Correct window sliding and counting across multiple qualifying windows' },
      { title: 'No qualifying windows', input: 'arr = [1, 1, 1, 1, 1], k = 2, threshold = 5', expected: '0', whyExists: 'All elements are 1 — no window of size 2 can have average >= 5', whatItAttacks: 'Whether the code correctly returns 0 when no window qualifies' },
      { title: 'Window equals entire array', input: 'arr = [4, 5, 6], k = 3, threshold = 5', expected: '1', whyExists: 'k equals array length — exactly one window exists and it qualifies (average = 5)', whatItAttacks: 'Whether the single full-array window is correctly evaluated' },
      { title: 'Threshold exactly at boundary', input: 'arr = [3, 3, 3], k = 2, threshold = 3', expected: '2', whyExists: 'Average exactly equals threshold — tests >= vs > comparison', whatItAttacks: 'Whether the comparison uses >= (not >) for the threshold check' },
      { title: 'Single element window', input: 'arr = [10, 1, 10, 1, 10], k = 1, threshold = 5', expected: '3', whyExists: 'k=1 means each element is its own window — 3 elements are >= 5', whatItAttacks: 'Whether the sliding window degenerates correctly to single-element evaluation' },
    ];
  }

  // Maximum Subarray
  if (slug.includes('maximum-subarray')) {
    return [
      { title: 'Mixed positive and negative', input: 'nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]', expected: '6', whyExists: 'The maximum subarray is [4, -1, 2, 1] with sum 6', whatItAttacks: 'Whether the algorithm correctly resets vs extends the running sum' },
      { title: 'All negative values', input: 'nums = [-3, -2, -1, -4]', expected: '-1', whyExists: 'All values are negative — must return the least negative, not 0', whatItAttacks: 'Whether the accumulator initialization handles all-negative arrays' },
      { title: 'Single element', input: 'nums = [1]', expected: '1', whyExists: 'Minimum array length — the single element is the answer', whatItAttacks: 'Base case handling for single-element arrays' },
      { title: 'All positive values', input: 'nums = [1, 2, 3, 4]', expected: '10', whyExists: 'Entire array is the maximum subarray (sum = 10)', whatItAttacks: 'Whether the running sum correctly accumulates without unnecessary resets' },
      { title: 'Large negative then large positive', input: 'nums = [-100, 50, 50, 50]', expected: '150', whyExists: 'The algorithm must discard the -100 and take [50, 50, 50]', whatItAttacks: 'Whether the reset condition (curr + nums[i] vs nums[i]) works for large magnitude differences' },
    ];
  }

  // Best Time to Buy and Sell Stock
  if (slug.includes('best-time-to-buy-and-sell-stock') && !slug.includes('ii')) {
    return [
      { title: 'Profit exists in middle', input: 'prices = [7, 1, 5, 3, 6, 4]', expected: '5', whyExists: 'Buy at 1, sell at 6 — profit of 5', whatItAttacks: 'Whether the minimum price tracker correctly updates across the array' },
      { title: 'Decreasing prices (no profit)', input: 'prices = [7, 6, 4, 3, 1]', expected: '0', whyExists: 'Prices only decrease — no profitable transaction exists', whatItAttacks: 'Whether the code returns 0 when no buy-sell pair yields profit' },
      { title: 'Profit at the end', input: 'prices = [2, 4, 1, 7]', expected: '6', whyExists: 'Best profit is buy at 1, sell at 7 — the minimum appears mid-array', whatItAttacks: 'Whether the minimum price updates after the initial minimum is found' },
      { title: 'Single day', input: 'prices = [5]', expected: '0', whyExists: 'Cannot buy and sell on the same day — must return 0', whatItAttacks: 'Edge case with array length 1' },
      { title: 'All same price', input: 'prices = [3, 3, 3, 3]', expected: '0', whyExists: 'No price difference — no profit possible', whatItAttacks: 'Whether equal prices are handled without false positive profit' },
    ];
  }

  // Roman to Integer
  if (slug.includes('roman-to-integer')) {
    return [
      { title: 'Simple additive case', input: 's = "III"', expected: '3', whyExists: 'Three identical characters — pure addition', whatItAttacks: 'Basic character-to-value mapping and accumulation' },
      { title: 'Subtractive notation', input: 's = "IV"', expected: '4', whyExists: 'I before V means subtraction — tests the subtractive rule', whatItAttacks: 'Whether curr < next triggers subtraction instead of addition' },
      { title: 'Mixed additive and subtractive', input: 's = "MCMXCIV"', expected: '1994', whyExists: 'M=1000, CM=900, XC=90, IV=4 — tests multiple subtractive pairs', whatItAttacks: 'Whether multiple subtractive pairs are handled in sequence' },
      { title: 'Large additive value', input: 's = "MMMCCCXXXIII"', expected: '3333', whyExists: 'All additive — no subtractive notation', whatItAttacks: 'Whether the accumulation works for long all-additive sequences' },
      { title: 'Single character', input: 's = "D"', expected: '500', whyExists: 'Single Roman numeral — minimum case', whatItAttacks: 'Whether single-character input is handled without next-character comparison error' },
    ];
  }

  // Contains Duplicate
  if (slug.includes('contains-duplicate')) {
    return [
      { title: 'Has duplicates', input: 'nums = [1, 2, 3, 1]', expected: 'true', whyExists: 'Value 1 appears twice — should return true', whatItAttacks: 'Whether the duplicate detection mechanism correctly identifies repeated values' },
      { title: 'All unique', input: 'nums = [1, 2, 3, 4]', expected: 'false', whyExists: 'No duplicates — should return false', whatItAttacks: 'Whether the function returns false when all elements are distinct' },
      { title: 'Adjacent duplicates', input: 'nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]', expected: 'true', whyExists: 'Multiple duplicates including adjacent ones', whatItAttacks: 'Whether the algorithm handles multiple duplicate groups' },
      { title: 'Single element', input: 'nums = [7]', expected: 'false', whyExists: 'Cannot have duplicates with one element', whatItAttacks: 'Minimum array size edge case' },
      { title: 'Two identical elements', input: 'nums = [5, 5]', expected: 'true', whyExists: 'Minimum case for a duplicate pair', whatItAttacks: 'Whether the code handles the smallest possible duplicate scenario' },
    ];
  }

  // Valid Anagram
  if (slug.includes('valid-anagram')) {
    return [
      { title: 'Valid anagram', input: 's = "anagram", t = "nagaram"', expected: 'true', whyExists: 'Same characters rearranged — valid anagram', whatItAttacks: 'Character frequency counting and comparison' },
      { title: 'Different lengths', input: 's = "rat", t = "car"', expected: 'false', whyExists: 'Same length but different characters — not an anagram', whatItAttacks: 'Whether character counts correctly differ' },
      { title: 'Empty strings', input: 's = "", t = ""', expected: 'true', whyExists: 'Two empty strings are anagrams of each other', whatItAttacks: 'Empty input edge case' },
      { title: 'Single character match', input: 's = "a", t = "a"', expected: 'true', whyExists: 'Minimal valid anagram', whatItAttacks: 'Single character comparison' },
      { title: 'Extra character', input: 's = "ab", t = "a"', expected: 'false', whyExists: 'Different lengths — cannot be anagrams', whatItAttacks: 'Whether length check or frequency mismatch catches this' },
    ];
  }

  return []; // Unknown problem — will fall through to semantic-model-driven generation
}

// ─── Semantic Model Driven Generation ────────────────────────────────────────

function generateFromSemanticModel(
  pack: EvidencePack,
  semantic: ProblemSemanticModel
): EvidenceBasedHiddenTest[] {
  const { problem, submission, stressTargets } = pack;
  const params = semantic.parameters;
  const tests: EvidenceBasedHiddenTest[] = [];

  // Generate tests from constraint boundaries and testable edges
  const candidates: Array<{ title: string; input: string; expected: string; whyExists: string; whatItAttacks: string }> = [];

  // Generate boundary-value inputs from parameters
  for (const p of params) {
    if (p.inferredType === 'integer' && p.constraints.min) {
      candidates.push({
        title: `${p.name} at minimum (${p.constraints.min})`,
        input: `${p.name} = ${parseConstraintValue(p.constraints.min)}`,
        expected: 'Valid output',
        whyExists: `Tests behavior when ${p.name} is at its minimum allowed value`,
        whatItAttacks: `Minimum boundary handling for parameter ${p.name}`,
      });
    }
    if (p.inferredType === 'integer' && p.constraints.max) {
      candidates.push({
        title: `${p.name} at maximum (${p.constraints.max})`,
        input: `${p.name} = ${parseConstraintValue(p.constraints.max)}`,
        expected: 'Valid output',
        whyExists: `Tests behavior when ${p.name} is at its maximum allowed value`,
        whatItAttacks: `Maximum constraint boundary for parameter ${p.name}`,
      });
    }
    if (p.inferredType === 'integer_array') {
      candidates.push({
        title: `Single element ${p.name}`,
        input: `${p.name} = [1]`,
        expected: 'Valid output',
        whyExists: `Tests behavior with minimum-length array for ${p.name}`,
        whatItAttacks: `Whether the code handles single-element arrays correctly`,
      });
      candidates.push({
        title: `All identical values in ${p.name}`,
        input: `${p.name} = [3, 3, 3, 3, 3]`,
        expected: 'Valid output',
        whyExists: `All elements are the same — tests duplicate handling`,
        whatItAttacks: `Whether identical values cause unexpected behavior in comparisons or lookups`,
      });
    }
    if (p.inferredType === 'string') {
      candidates.push({
        title: `Empty string for ${p.name}`,
        input: `${p.name} = ""`,
        expected: 'Valid output',
        whyExists: `Tests behavior with empty string input`,
        whatItAttacks: `Whether the code handles empty input without errors`,
      });
      candidates.push({
        title: `Single character for ${p.name}`,
        input: `${p.name} = "a"`,
        expected: 'Valid output',
        whyExists: `Tests minimum non-empty string input`,
        whatItAttacks: `Whether single character is correctly processed`,
      });
    }
  }

  // Add testable edge behaviors from semantic model
  for (const edge of semantic.testableEdgeBehaviors.slice(0, 3)) {
    candidates.push({
      title: edge,
      input: 'Constraint boundary input',
      expected: 'Valid output',
      whyExists: edge,
      whatItAttacks: `Semantic edge behavior: ${edge}`,
    });
  }

  // Convert candidates to hidden tests with oracle verification
  for (let i = 0; i < Math.min(candidates.length, 5); i++) {
    const c = candidates[i];
    const oracleResult = evaluateProblemOracle(problem.slug || problem.title, c.input, c.expected);
    const matchingTarget = stressTargets[i];

    tests.push({
      id: `HT-0${i + 1}`,
      targetId: matchingTarget?.id,
      kind: (matchingTarget?.kind || 'boundary') as EvidenceBasedHiddenTest['kind'],
      riskTitle: c.title,
      confidence: 'High',
      confidenceScore: matchingTarget?.confidence || 85,
      verificationStatus: oracleResult.verificationStatus,
      verificationBadgeText: oracleResult.verificationBadgeText,
      evidence: matchingTarget?.sourceEvidence || [],
      input: c.input,
      expectedOutput: oracleResult.expectedOutput || c.expected,
      whyExists: c.whyExists,
      whatItAttacks: c.whatItAttacks,
      constraintRelevance: `Problem-specific boundary for ${problem.title}`,
    });
  }

  return tests;
}

// ─── Stress-Target-Driven Fallback ───────────────────────────────────────────

function generateFromStressTargets(pack: EvidencePack): EvidenceBasedHiddenTest[] {
  const { problem, stressTargets } = pack;
  const params = pack.submission.normalizedFacts.functions[0]?.params || [];

  return stressTargets.map((st, idx) => {
    // Construct a minimal valid input from parameter names
    const inputParts = params.map(p => {
      const pLower = p.toLowerCase();
      if (['nums', 'arr', 'prices', 'height', 'heights', 'candidates', 'numbers'].includes(pLower)) return `${p} = [1, 2, 3]`;
      if (['s', 'str', 'string', 'word', 'haystack'].includes(pLower)) return `${p} = "abc"`;
      if (['needle', 'pattern'].includes(pLower)) return `${p} = "a"`;
      if (['n', 'x', 'num', 'k', 'target', 'threshold', 'val', 'amount'].includes(pLower)) return `${p} = 1`;
      if (['t'].includes(pLower)) return `${p} = "abc"`;
      if (['grid', 'matrix', 'board'].includes(pLower)) return `${p} = [[1]]`;
      return `${p} = 1`;
    });
    const input = inputParts.join(', ') || 'input = 1';

    const oracleResult = evaluateProblemOracle(problem.slug || problem.title, input, 'Valid output');

    return {
      id: `HT-0${idx + 1}`,
      targetId: st.id,
      kind: st.kind,
      riskTitle: st.title,
      confidence: 'High' as const,
      confidenceScore: st.confidence,
      verificationStatus: oracleResult.verificationStatus,
      verificationBadgeText: oracleResult.verificationBadgeText,
      evidence: st.sourceEvidence.concat(st.constraintEvidence),
      input,
      expectedOutput: oracleResult.expectedOutput,
      whyExists: st.hypothesis,
      whatItAttacks: st.whatItAttacks,
      constraintRelevance: `Tests hypothesis: ${st.title}`,
    };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseConstraintValue(val: string): string {
  // Convert "10^4" → "10000", "5 * 10^4" → "50000"
  const cleaned = val.replace(/\s/g, '');
  const powerMatch = cleaned.match(/^(\d+)\*?10\^(\d+)$/);
  if (powerMatch) return String(parseInt(powerMatch[1]) * Math.pow(10, parseInt(powerMatch[2])));
  const simplePower = cleaned.match(/^10\^(\d+)$/);
  if (simplePower) return String(Math.pow(10, parseInt(simplePower[1])));
  return val;
}
