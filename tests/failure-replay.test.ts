import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeAnalysis } from '../src/lib/replay/groq-analyzer';
import { validateTestCaseConstraints, executeTestCaseOnCode } from '../src/lib/replay/test-validator';
import type { StructuredGroqAnalysis } from '../src/lib/replay/groq-analyzer';
import type { TargetedTestCase, ReplayProblemInfo } from '../src/lib/replay/types';

describe('Failure Replay - Anti-Leak Guardrail', () => {
  it('should strip markdown code blocks and function definitions from hints', () => {
    const rawAnalysis: StructuredGroqAnalysis = {
      failureEvidence: {
        input: '[1, 2, 3]',
        expected: '[3, 1, 2]',
        actual: 'Runtime Error',
      },
      targetedTests: [],
      conditionFlow: [
        {
          id: 'c1',
          order: 1,
          conditionText: 'Test condition',
          branches: {
            yes: { label: 'YES', action: 'Do something' },
            no: { label: 'NO', action: 'Do other' },
          },
          checkpointQuestion: {
            id: 'q1',
            prompt: 'Here is the answer: ```def solve(nums): return nums[::-1]``` What should you do?',
            format: 'explain',
            expectedConcept: 'Reversal',
          },
          status: 'unlocked',
        },
      ],
      hints: [
        {
          level: 1,
          tierName: 'Observation',
          title: 'Observation',
          text: 'Notice the boundary condition.',
          unlocked: true,
        },
        {
          level: 5,
          tierName: 'Strong Guidance',
          title: 'Strong Guidance',
          text: 'Here is the fix: ```def rotate(nums, k): return nums[k:] + nums[:k]```',
          unlocked: false,
        },
      ],
    };

    const sanitized = sanitizeAnalysis(rawAnalysis, 'def rotate(): pass');

    // Hint 5 should NOT contain code block
    assert.ok(!sanitized.hints[1].text.includes('```'));
    assert.ok(sanitized.hints[1].text.includes('(inspect this segment in your editor)'));

    // Question prompt should NOT contain code block
    assert.ok(!sanitized.conditionFlow[0].checkpointQuestion?.prompt.includes('```'));
  });
});

describe('Failure Replay - Testcase Validator', () => {
  const problem: ReplayProblemInfo = {
    id: 'prob-1',
    slug: 'rotate-array',
    title: 'Rotate Array',
    difficulty: 'Medium',
    topics: ['Array'],
    statement: 'Rotate array to the right by k steps.',
    constraints: ['1 <= nums.length <= 10^5', '-2^31 <= nums[i] <= 2^31 - 1'],
    inputFormat: 'Array and integer',
    outputFormat: 'Modified array',
  };

  it('validates proper test cases and rejects empty/invalid formats', () => {
    const validTest: TargetedTestCase = {
      id: 't1',
      level: 1,
      category: 'Normal',
      input: '[1, 2, 3]',
      expected: '[3, 1, 2]',
      whyThisCaseExists: 'Control test',
      status: 'untested',
      verified: true,
    };

    const emptyTest: TargetedTestCase = {
      id: 't2',
      level: 2,
      category: 'Boundary',
      input: '',
      expected: '',
      whyThisCaseExists: 'Broken test',
      status: 'untested',
      verified: true,
    };

    assert.strictEqual(validateTestCaseConstraints(validTest, problem), true);
    assert.strictEqual(validateTestCaseConstraints(emptyTest, problem), false);
  });

  it('runs JS code in sandbox safely and detects mismatches', () => {
    const test: TargetedTestCase = {
      id: 't1',
      level: 1,
      category: 'Normal',
      input: '[1, 2, 3]',
      expected: '6',
      whyThisCaseExists: 'Sum check',
      status: 'untested',
      verified: true,
    };

    const workingCode = `
      function sum(nums) {
        return nums.reduce((a, b) => a + b, 0);
      }
    `;

    const failingCode = `
      function sum(nums) {
        return 0; // Wrong Answer
      }
    `;

    const resPass = executeTestCaseOnCode(test, workingCode, 'javascript');
    assert.strictEqual(resPass.passed, true);
    assert.strictEqual(String(resPass.userOutput), '6');

    const resFail = executeTestCaseOnCode(test, failingCode, 'javascript');
    assert.strictEqual(resFail.passed, false);
    assert.strictEqual(String(resFail.userOutput), '0');
  });
});

describe('Failure Replay - Database Storage & Zero-Groq Retrieval', () => {
  it('loads existing session from DB without calling Groq when forceRegenerate is false', async () => {
    // Verify the cache hit logic:
    let groqCalled = false;
    const fakeGroqCall = () => {
      groqCalled = true;
      return { failureEvidence: {}, targetedTests: [], conditionFlow: [], hints: [] };
    };

    const mockDbSession = {
      id: 'session-123',
      submissionId: 'sub-abc123',
      userId: 'user-1',
      failureEvidence: { input: '[1, 2]', expected: '[2, 1]', actual: 'Error' },
      targetedTests: [{ id: 't1', level: 1, category: 'Normal', input: '[1, 2]', expected: '[2, 1]' }],
      conditionFlow: [],
      hints: [],
    };

    // Simulated check: if DB has existingSession and !forceRegenerate -> return DB session
    const getReplaySessionSimulated = (
      existingInDb: typeof mockDbSession | null,
      forceRegenerate: boolean
    ) => {
      if (existingInDb && !forceRegenerate) {
        return { data: existingInDb, source: 'database' };
      }
      fakeGroqCall();
      return { data: mockDbSession, source: 'groq' };
    };

    // Initial click / load / refresh:
    const res1 = getReplaySessionSimulated(mockDbSession, false);
    assert.strictEqual(res1.source, 'database');
    assert.strictEqual(groqCalled, false);

    // Explicit user regeneration:
    const res2 = getReplaySessionSimulated(mockDbSession, true);
    assert.strictEqual(res2.source, 'groq');
    assert.strictEqual(groqCalled, true);
  });
});

