import assert from 'assert';
import { routeUserMessage } from '../src/lib/diagnosis/intent-router';
import { classifyPreliminaryRootCause } from '../src/lib/diagnosis/preliminary-classifier';
import { planToMermaid } from '../src/lib/diagnosis/plan-mermaid';
import { resolveTestCases, verifyCodeLocation, sanitizeAntiCode } from '../src/lib/diagnosis/test-case-runner';
import {
  codeReviewSchema,
  submissionReviewSchema,
  planSchema,
  explainSchema,
  historySchema,
  type PlanDiagnosis,
} from '../src/types/diagnosis-v2';

async function runE2ETests() {
  console.log('🚀 Running Query-Aware Diagnosis v2 End-to-End Simulation...\n');

  // Scenario 1: User pastes code with boundary condition error
  console.log('--- Scenario 1: CODE_REVIEW (Code Detected) ---');
  const codeInput = `def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`;

  const route1 = await routeUserMessage(codeInput);
  console.log(`Route resolved: ${route1.mode} (confidence: ${route1.confidence})`);
  assert.strictEqual(route1.mode, 'CODE_REVIEW', 'Code must route to CODE_REVIEW');

  const preliminary1 = classifyPreliminaryRootCause(codeInput);
  console.log(`Preliminary root cause: ${preliminary1.name} (${preliminary1.confidence}%)`);
  assert.strictEqual(preliminary1.id, 'boundary-condition-error');

  const lineVerify1 = verifyCodeLocation(codeInput, 3, 'while left < right:');
  assert.strictEqual(lineVerify1.line, 3);
  console.log(`Verified line ${lineVerify1.line}: ${lineVerify1.code.trim()}`);

  const mockReviewResult = {
    kind: 'code_review' as const,
    hasHistory: true,
    verdict: 'Loop condition terminates before checking the last remaining element',
    rootCause: {
      id: preliminary1.id,
      name: preliminary1.name,
      confidence: preliminary1.confidence,
    },
    location: {
      line: lineVerify1.line,
      code: lineVerify1.code.trim(),
      issue: 'Skips the last element in search range',
    },
    tests: resolveTestCases({
      capturedFailedTestCase: 'nums=[5], target=5',
      submissionStatus: 'Wrong Answer',
    }),
    concept: {
      name: 'Loop Invariant',
      points: [
        'Decide inclusive vs exclusive boundaries',
        'Match loop condition to choice',
        'Test with single element input',
      ],
    },
    historyIds: ['sub-prev-101', 'sub-prev-102'],
    headerText: '3rd boundary error · 2 on binary search',
  };

  const parsedReview = codeReviewSchema.parse(mockReviewResult);
  console.log('✅ CODE_REVIEW contract validated successfully');
  console.log(`Chat Bubble representation:\n  Bug found · line ${parsedReview.location.line}\n  ${parsedReview.rootCause.name} · ${parsedReview.rootCause.confidence}%\n  3rd boundary error · 2 similar failures →\n`);

  // Scenario 2: User asks for a study plan
  console.log('--- Scenario 2: PLAN (What should I study) ---');
  const route2 = await routeUserMessage('What should I study this week?');
  console.log(`Route resolved: ${route2.mode}`);
  assert.strictEqual(route2.mode, 'PLAN');

  const mockPlan: PlanDiagnosis = {
    kind: 'plan' as const,
    focus: {
      skillId: 'edge-case-reasoning',
      name: 'Edge Case Reasoning',
      priority: 'high',
      why: 'Behind 6 of your last 14 failures',
    },
    topics: [
      { skillId: 'edge-case-reasoning', name: 'Edge Case Reasoning' },
      { skillId: 'two-pointers', name: 'Two Pointers' },
    ],
    steps: [
      { id: 's1', day: 'Mon', topic: 'Edge Case Reasoning', title: 'Wrap-around by hand', minutes: 20, rung: 'concept_check' as const, completed: true, resourceIds: [] },
      { id: 's2', day: 'Tue', topic: 'Edge Case Reasoning', title: 'Trace k > n cases', minutes: 20, rung: 'trace' as const, completed: false, resourceIds: [] },
      { id: 's3', day: 'Wed', topic: 'Two Pointers', title: 'Write index mapper', minutes: 30, rung: 'tiny_build' as const, completed: false, resourceIds: [] },
      { id: 's4', day: 'Thu', topic: 'Two Pointers', title: 'Rotate string', minutes: 30, rung: 'easy_variant' as const, completed: false, resourceIds: [] },
      { id: 's5', day: 'Fri', topic: 'Two Pointers', title: 'Rotate left, negative k', minutes: 30, rung: 'modified_variant' as const, completed: false, resourceIds: [] },
      { id: 's6', day: 'Sat', topic: 'Edge Case Reasoning', title: 'Rotate Array again', minutes: 45, rung: 'original' as const, completed: false, resourceIds: [] },
      { id: 's7', day: 'Sun', topic: 'Edge Case Reasoning', title: 'Transfer: circular buffer', minutes: 45, rung: 'transfer' as const, completed: false, resourceIds: [] },
    ],
  };

  const parsedPlan = planSchema.parse(mockPlan);
  const mermaidDiagram = planToMermaid(parsedPlan);
  console.log('✅ PLAN contract validated successfully (Zero PageRank verified)');
  console.log('Mermaid string length:', mermaidDiagram.length, 'lines:', mermaidDiagram.split('\n').length);
  assert(mermaidDiagram.includes('flowchart TB'));
  assert(mermaidDiagram.includes('Understood?'));
  assert(!mermaidDiagram.includes('PageRank'));

  // Scenario 3: User asks to explain errors
  console.log('\n--- Scenario 3: EXPLAIN (Explain my boundary errors) ---');
  const route3 = await routeUserMessage('Explain my boundary condition errors');
  console.log(`Route resolved: ${route3.mode}`);
  assert.strictEqual(route3.mode, 'EXPLAIN');

  const mockExplain = {
    kind: 'explain' as const,
    topic: 'Boundary Condition Error',
    bullets: [
      { label: 'Loop Invariant Mismatch', text: 'Loop termination condition assumes exclusive bounds while pointer increments assume inclusive boundaries.', evidenceIds: ['ev-1'] },
      { label: 'Off-by-one Termination', text: 'When left equals right, one uninspected element remains unprocessed.', evidenceIds: ['ev-2'] },
    ],
    historySummary: '4 past failures on boundary conditions',
    pastFailures: [],
  };
  explainSchema.parse(mockExplain);
  console.log('✅ EXPLAIN contract validated successfully');

  // Scenario 4: User asks for failure history
  console.log('\n--- Scenario 4: HISTORY (Show my past failures) ---');
  const route4 = await routeUserMessage('Show my past failures');
  console.log(`Route resolved: ${route4.mode}`);
  assert.strictEqual(route4.mode, 'HISTORY');

  const mockHistory = {
    kind: 'history' as const,
    summary: 'Found 4 past failures related to boundary condition errors.',
    count: 4,
    historyIds: ['f-1', 'f-2', 'f-3', 'f-4'],
    timeline: [],
  };
  historySchema.parse(mockHistory);
  console.log('✅ HISTORY contract validated successfully');

  // Scenario 5: User asks about last wrong submission
  console.log('\n--- Scenario 5: SUBMISSION_REVIEW (Last wrong submission query) ---');
  const route5 = await routeUserMessage('Correct answer for the last wrong submission + teach me + hidden test cases');
  console.log(`Route resolved: ${route5.mode}`);
  assert.strictEqual(route5.mode, 'SUBMISSION_REVIEW');

  const mockSubmissionReview = {
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

  submissionReviewSchema.parse(mockSubmissionReview);
  console.log('✅ SUBMISSION_REVIEW contract validated successfully');

  console.log('\n🎉 ALL 5 MODES VERIFIED END-TO-END!');
}

runE2ETests().catch((err) => {
  console.error('❌ E2E Simulation failed:', err);
  process.exit(1);
});

