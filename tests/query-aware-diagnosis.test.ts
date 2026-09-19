import assert from 'assert';
import {
  codeReviewSchema,
  submissionReviewSchema,
  planSchema,
  explainSchema,
  historySchema,
  countWords,
  type PlanDiagnosis,
} from '../src/types/diagnosis-v2';
import { detectCode } from '../src/lib/diagnosis/code-detector';
import { planToMermaid } from '../src/lib/diagnosis/plan-mermaid';
import { classifyPreliminaryRootCause } from '../src/lib/diagnosis/preliminary-classifier';
import { sanitizeAntiCode, verifyCodeLocation, resolveTestCases } from '../src/lib/diagnosis/test-case-runner';
import { routeUserMessage } from '../src/lib/diagnosis/intent-router';

console.log('🧪 [Test] Running Query-Aware Diagnosis v2 test suite...\n');

// ─── 1. Zod Contract Limit Tests ──────────────────────────────────────────────

console.log('1. Testing Zod Contracts & Word Limits...');

// 1a. Code review with valid first occurrence (no concept, issue <= 15 words)
const validFirstOccurrence = {
  kind: 'code_review' as const,
  hasHistory: false,
  verdict: 'Loop condition terminates before verifying all elements',
  rootCause: { id: 'boundary-condition-error', name: 'Boundary Condition Error', confidence: 88 },
  location: {
    line: 6,
    code: 'while left < right:',
    issue: 'Skips the last remaining element in search space',
  },
  tests: [{ input: 'nums=[5], target=5', expected: '0', got: '-1', verified: false }],
  historyIds: [],
};

const parsed1 = codeReviewSchema.safeParse(validFirstOccurrence);
assert.strictEqual(parsed1.success, true, 'Valid first occurrence must pass zod schema');

// 1b. Concept must be absent when hasHistory is false
const invalidConceptOnFirstOccurrence = {
  ...validFirstOccurrence,
  hasHistory: false,
  concept: {
    name: 'Loop invariant',
    points: ['Verify inclusive bounds'],
  },
};
const parsed2 = codeReviewSchema.safeParse(invalidConceptOnFirstOccurrence);
assert.strictEqual(parsed2.success, false, 'Concept must fail validation when hasHistory is false');

// 1c. Issue exceeding 15 words must fail
const invalidLongIssue = {
  ...validFirstOccurrence,
  location: {
    line: 6,
    code: 'while left < right:',
    issue: 'This is an extremely long issue description that goes on and on far exceeding the allowed fifteen word limit for issues',
  },
};
assert(countWords(invalidLongIssue.location.issue) > 15);
const parsed3 = codeReviewSchema.safeParse(invalidLongIssue);
assert.strictEqual(parsed3.success, false, 'Issue > 15 words must fail validation');

// 1d. Concept points exceeding 12 words must fail
const invalidLongPoint = {
  ...validFirstOccurrence,
  hasHistory: true,
  concept: {
    name: 'Loop invariant',
    points: ['This is a bullet point that definitely contains way more than twelve words in a single bullet point item'],
  },
};
const parsed4 = codeReviewSchema.safeParse(invalidLongPoint);
assert.strictEqual(parsed4.success, false, 'Concept point > 12 words must fail validation');

// 1e. More than 3 concept points must fail
const invalidTooManyPoints = {
  ...validFirstOccurrence,
  hasHistory: true,
  concept: {
    name: 'Loop invariant',
    points: ['Point 1', 'Point 2', 'Point 3', 'Point 4'],
  },
};
const parsed5 = codeReviewSchema.safeParse(invalidTooManyPoints);
assert.strictEqual(parsed5.success, false, 'More than 3 concept points must fail validation');

// 1f. More than 2 tests must fail
const invalidTooManyTests = {
  ...validFirstOccurrence,
  tests: [
    { input: '1', expected: '1', got: '0', verified: true },
    { input: '2', expected: '2', got: '0', verified: true },
    { input: '3', expected: '3', got: '0', verified: true },
  ],
};
const parsed6 = codeReviewSchema.safeParse(invalidTooManyTests);
assert.strictEqual(parsed6.success, false, 'More than 2 tests must fail validation');

// 1g. Submission review schema validation & word limits
const validSubmissionReview = {
  kind: 'submission_review' as const,
  problem: { slug: 'search-in-rotated-sorted-array', title: 'Search in Rotated Sorted Array' },
  verdict: 'Binary search boundary prematurely excludes pivoted half',
  rootCause: { id: 'boundary-condition-error', name: 'Boundary Condition Error', confidence: 92 },
  location: {
    line: 7,
    code: 'if nums[mid] > nums[right]:',
    issue: 'Fails to compare against inclusive target boundary',
  },
  tests: [
    {
      input: 'nums=[4,5,6,7,0,1,2], target=0',
      expected: '4',
      got: '-1',
      whyItBreaks: 'Pivoted range check assumes standard monotonic order without checking wrap point',
      verified: true,
    },
  ],
  walkthrough: [
    { label: 'Left Check', text: 'Left half is checked without verifying if target sits strictly inside' },
    { label: 'Pivot Jump', text: 'Midpointer jumps past rotated minimum without evaluating right bound' },
  ],
  invariant: {
    name: 'Sorted Half',
    statement: 'At least one subarray half is strictly sorted in every iteration step',
  },
  checklist: [
    'Check if left <= mid is sorted',
    'Verify target is inside sorted range',
    'Update pointers strictly by mid +/- 1',
  ],
  fixAvailable: true,
};

const parsedSub1 = submissionReviewSchema.safeParse(validSubmissionReview);
assert.strictEqual(parsedSub1.success, true, 'Valid submission review must pass zod schema');

// 1h. Submission review whyItBreaks > 18 words must fail
const invalidWhyItBreaks = {
  ...validSubmissionReview,
  tests: [
    {
      ...validSubmissionReview.tests[0],
      whyItBreaks: 'This detailed explanation of why the test breaks is deliberately crafted to contain way more than the maximum permitted eighteen words limit here',
    },
  ],
};
assert(countWords(invalidWhyItBreaks.tests[0].whyItBreaks) > 18);
const parsedSub2 = submissionReviewSchema.safeParse(invalidWhyItBreaks);
assert.strictEqual(parsedSub2.success, false, 'whyItBreaks > 18 words must fail validation');

// 1i. Invariant statement > 20 words must fail
const invalidInvariant = {
  ...validSubmissionReview,
  invariant: {
    name: 'Range',
    statement: 'This loop invariant statement contains so many additional explanatory words that it easily exceeds the twenty words limit imposed by our zod contract schema',
  },
};
assert(countWords(invalidInvariant.invariant.statement) > 20);
const parsedSub3 = submissionReviewSchema.safeParse(invalidInvariant);
assert.strictEqual(parsedSub3.success, false, 'invariant.statement > 20 words must fail validation');

console.log('✅ Zod contracts & word limits verified.\n');

// ─── 2. Multi-Signal Code Detector Tests ────────────────────────────────────────

console.log('2. Testing Multi-Signal Code Detector...');

// 2a. Conversational prose containing keywords like 'if', 'return', 'for'
const proseSample = 'Hi, what if you can help me prepare for interviews and return advice?';
const codeDet1 = detectCode(proseSample);
assert.strictEqual(codeDet1.hasCode, false, 'Conversational prose must NOT be classified as code');

// 2b. Python code snippet
const pythonSnippet = `def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
    return -1`;
const codeDet2 = detectCode(pythonSnippet);
assert.strictEqual(codeDet2.hasCode, true, 'Python snippet must be detected as code');
assert.strictEqual(codeDet2.language, 'python', 'Language must be inferred as python');

// 2c. JavaScript snippet with arrow function
const jsSnippet = `const twoSum = (nums, target) => {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (map.has(target - nums[i])) return [map.get(target - nums[i]), i];
    map.set(nums[i], i);
  }
  return [];
};`;
const codeDet3 = detectCode(jsSnippet);
assert.strictEqual(codeDet3.hasCode, true, 'JS snippet must be detected as code');
assert.strictEqual(codeDet3.language, 'javascript', 'Language must be inferred as javascript');

// 2d. Markdown code block
const fencedSnippet = "Check my solution:\n```python\nwhile left < right:\n    mid = (left + right) // 2\n```";
const codeDet4 = detectCode(fencedSnippet);
assert.strictEqual(codeDet4.hasCode, true, 'Fenced snippet must be detected as code');
assert.strictEqual(codeDet4.language, 'python');

console.log('✅ Multi-signal code detector verified.\n');

// ─── 3. Intent Router Tests (Deterministic Rules & Precedence) ─────────────────

console.log('3. Testing Intent Router Precedence & Pattern Matching...');

async function testIntentRouter() {
  // 3a. Code input takes top priority
  const res1 = await routeUserMessage(pythonSnippet);
  assert.strictEqual(res1.mode, 'CODE_REVIEW', 'Code must route to CODE_REVIEW');

  // 3b. Exact test.each queries from FIX 5 specification
  const testCases: [string, string][] = [
    ['what is last submission', 'SUBMISSION_REVIEW'],
    ['what is last submission and explain it', 'SUBMISSION_REVIEW'],
    ['what is the correct answer for the last wrong submission', 'SUBMISSION_REVIEW'],
    ['what should I study this week?', 'PLAN'],
    ['explain my boundary errors', 'EXPLAIN'],
  ];

  for (const [query, expectedMode] of testCases) {
    const res = await routeUserMessage(query);
    assert.strictEqual(
      res.mode,
      expectedMode,
      `Query "${query}" should route to ${expectedMode}, but got ${res.mode}`
    );
  }

  // 3c. Precedence: hasCode takes precedence over any text rule
  const codeWithKeywords = `def solution():\n    # last wrong submission attempt\n    return False`;
  const resCode = await routeUserMessage(codeWithKeywords);
  assert.strictEqual(resCode.mode, 'CODE_REVIEW', 'Code must take precedence over last submission keywords');

  // 3d. History query
  const resHistory = await routeUserMessage('show me my past failures and timeline');
  assert.strictEqual(resHistory.mode, 'HISTORY', 'Past failures query must route to HISTORY');
}

// ─── 4. Preliminary Classifier Tests ──────────────────────────────────────────

console.log('4. Testing Preliminary Root Cause Classifier...');

const resClass1 = classifyPreliminaryRootCause('while left < right:\n    pass', '', 'Wrong Answer');
assert.strictEqual(resClass1.id, 'boundary-condition-error', 'Binary search pointer bounds should classify as boundary error');

const resClass2 = classifyPreliminaryRootCause('', 'My code got TLE', 'Time Limit Exceeded');
assert.strictEqual(resClass2.id, 'time-complexity-oversight', 'TLE should classify as time complexity oversight');

const resClass3 = classifyPreliminaryRootCause('for i in range(n):\n    for j in range(n):\n        pass');
assert.strictEqual(resClass3.id, 'time-complexity-oversight', 'Nested un-narrowed loops should classify as time complexity');

console.log('✅ Preliminary root cause classifier verified.\n');

// ─── 5. Plan Mermaid Generator & Zero-PageRank Tests ──────────────────────────

console.log('5. Testing Plan Mermaid Generator & Zero PageRank Guarantee...');

const samplePlan: PlanDiagnosis = {
  kind: 'plan' as const,
  focus: {
    skillId: 'binary-search',
    name: 'Edge Case "Reasoning" <Advanced>',
    priority: 'high',
    why: 'Behind 6 of your last 14 failures',
  },
  topics: [
    { skillId: 'binary-search', name: 'Binary Search' },
    { skillId: 'two-pointers', name: 'Two Pointers' },
  ],
  steps: [
    {
      id: 'step-1',
      day: 'Mon',
      topic: 'Binary Search',
      title: 'Wrap-around (by hand)',
      minutes: 20,
      rung: 'concept_check' as const,
      completed: true,
      resourceIds: ['res-1'],
    },
    {
      id: 'step-2',
      day: 'Tue',
      topic: 'Binary Search',
      title: 'Trace k > n cases',
      minutes: 20,
      rung: 'trace' as const,
      completed: false,
      resourceIds: ['res-2'],
    },
    {
      id: 'step-3',
      day: 'Wed',
      topic: 'Two Pointers',
      title: 'Write index mapper',
      minutes: 30,
      rung: 'tiny_build' as const,
      completed: false,
      resourceIds: [],
    },
  ],
};

// 5a. Validate against planSchema (must require topics, forbid pagerank score)
const parsedPlan = planSchema.safeParse(samplePlan);
assert.strictEqual(parsedPlan.success, true, 'Valid plan must pass planSchema');

const mermaidOutput = planToMermaid(samplePlan);

// 5b. Verify vertical layout
assert(mermaidOutput.includes('flowchart TB'), 'Mermaid must use flowchart TB');

// 5c. Verify special character escaping
assert(!mermaidOutput.includes('"Reasoning"'), 'Quotes must be escaped');
assert(mermaidOutput.includes("'Reasoning'"), 'Quotes should be normalized');
assert(mermaidOutput.includes('&lt;Advanced&gt;'), '<> should be escaped');
assert(mermaidOutput.includes('&#40;by hand&#41;'), 'Parentheses should be escaped in titles');

// 5d. Verify human-readable why context and topics rendered
assert(mermaidOutput.includes('Behind 6 of your last 14 failures'), 'Must render human why context in root node');
assert(mermaidOutput.includes('Binary Search · 20 min'), 'Must render step topic alongside minutes');

// 5e. Verify adaptive gates with dashed Review link to avoid overlap
assert(mermaidOutput.includes('C0{"Understood?"}:::gate'), 'Adaptive gate must be generated');
assert(mermaidOutput.includes('C0 -.->|Need Review| S0'), 'Gate must loop back on Need Review with dashed link');
assert(mermaidOutput.includes('C0 -->|Yes| S1'), 'Gate must proceed on Yes');

// 5f. Verify completed step class (:done)
assert(mermaidOutput.includes('S0["Mon · Wrap-around &#40;by hand&#41;<br/>Binary Search · 20 min"]:::done'), 'Completed step must have :::done class');

// 5g. STRICT REGRESSION TEST: Zero PageRank or raw floating scores anywhere in Mermaid or Plan
assert(!/pagerank/i.test(mermaidOutput), 'Mermaid output must NEVER contain the word "PageRank"');
assert(!/\b0\.\d{2,}\b/.test(mermaidOutput), 'Mermaid output must NEVER contain raw decimal PageRank scores');
assert(!/pagerank/i.test(JSON.stringify(samplePlan)), 'Plan schema object must NEVER contain the word "PageRank"');

console.log('✅ Plan Mermaid generator & Zero-PageRank guarantee verified.\n');

// ─── 6. Code Integrity & Anti-Code Sanitizer Tests ─────────────────────────────

console.log('6. Testing Code Integrity & Anti-Code Sanitizer...');

// 6a. Stripping code fences
const textWithCode = 'Here is the fix: ```python\nwhile left <= right:\n    return mid\n``` and check bounds';
const sanitized = sanitizeAntiCode(textWithCode);
assert.strictEqual(sanitized.containsCode, true);
assert(!sanitized.clean.includes('while left <= right:'), 'Code fence must be stripped');

// 6b. Line number verification
const submittedCode = `def search(nums, target):
    left = 0
    right = len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
    return -1`;

const verifiedLoc1 = verifyCodeLocation(submittedCode, 4, 'while left < right:');
assert.strictEqual(verifiedLoc1.line, 4, 'Exact line 4 must be matched');
assert(verifiedLoc1.code.includes('while left < right:'));

// LLM reports line 5 for line 4 code
const verifiedLoc2 = verifyCodeLocation(submittedCode, 5, 'while left < right:');
assert.strictEqual(verifiedLoc2.line, 4, 'Fuzzy matching should correct line 5 to line 4');

// 6c. Test-case runner resolution
const tier1Test = resolveTestCases({
  capturedFailedTestCase: 'nums=[5], target=5',
  submissionStatus: 'Wrong Answer',
});
assert.strictEqual(tier1Test[0].verified, true, 'Captured test must be verified: true');

const tier3Test = resolveTestCases({
  llmSuggestededTests: [{ input: 'nums=[1]', expected: '0', got: '-1' }],
});
assert.strictEqual(tier3Test[0].verified, false, 'LLM suggested test must be verified: false');

console.log('✅ Code integrity & anti-code sanitizer verified.\n');

// Execute async tests
testIntentRouter()
  .then(() => {
    console.log('✅ Intent router deterministic precedence verified.\n');
    console.log('🎉 ALL TEST SUITES PASSED SUCCESSFULLY!');
  })
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });

