/**
 * src/lib/explanation/engine.ts
 *
 * AI Failure Explanation Engine
 *
 * Converts raw LeetCode verdicts + pipeline evidence into structured,
 * human-readable failure explanations. Calls Groq for LLM reasoning;
 * falls back to rule-based explanations when Groq is unavailable.
 *
 * This module is intentionally separate from diagnosis/generator.ts:
 * - generator.ts -> user overall weakness profile
 * - engine.ts    -> test-case-level explanation of a single failure
 */

import type { SubmissionEvent, RootCauseHypothesis, BehavioralSignal } from '@/types';
import type {
  FailureExplanation,
  FailureCategory,
  ExplanationEvidenceItem,
  ExplanationTestCase,
  RecurringPattern,
} from '@/types';
import type { EditOperation } from '@/lib/analysis/myers-diff';
import type { RetrievedFailure } from '@/lib/rag/retrieval';
import type { WeaknessScore } from '@/lib/graph/pagerank';

// --- Input Interface --------------------------------------------------------

export interface ExplanationEngineInput {
  submission: SubmissionEvent;

  // Network interceptor data (may be null if interceptor was not active)
  networkVerdictRaw?: string | null;
  networkFailedInput?: string | null;
  networkExpectedOutput?: string | null;
  networkUserOutput?: string | null;
  networkPassedTestcases?: number | null;
  networkTotalTestcases?: number | null;

  // Analysis pipeline outputs
  diffOps: EditOperation[];
  behavioralSignals: BehavioralSignal[];
  hypotheses: RootCauseHypothesis[];
  similarFailures: RetrievedFailure[];
  weaknessScores: WeaknessScore[];

  // Historical pattern counts (category -> count across all submissions)
  historicalPatternCounts: Record<string, number>;
}

// --- Category mapping from root cause type ----------------------------------

const ROOT_CAUSE_TO_CATEGORY: Record<string, FailureCategory> = {
  'boundary-condition-error': 'Boundary Condition',
  'algorithm-selection-mistake': 'Algorithm Selection',
  'pattern-recognition-gap': 'Algorithm Selection',
  'time-complexity-oversight': 'Implementation Detail',
  'space-complexity-oversight': 'Implementation Detail',
  'data-structure-mismatch': 'HashMap Misuse',
  'implementation-detail-error': 'Implementation Detail',
  'input-output-handling-error': 'Edge Case',
};

function mapCategory(rootCause: string, verdict: string): FailureCategory {
  if (verdict === 'Time Limit Exceeded') return 'Implementation Detail';
  if (verdict === 'Memory Limit Exceeded') return 'Implementation Detail';
  if (verdict === 'Runtime Error') return 'Edge Case';
  return ROOT_CAUSE_TO_CATEGORY[rootCause] ?? 'Unknown';
}

// --- Evidence builder -------------------------------------------------------

function buildEvidenceItems(input: ExplanationEngineInput): ExplanationEvidenceItem[] {
  const items: ExplanationEvidenceItem[] = [];
  const { submission, diffOps, behavioralSignals, hypotheses } = input;

  // Network evidence
  if (input.networkFailedInput) {
    items.push({
      label: 'Failed test case captured from LeetCode',
      confirmed: true,
      source: 'network',
    });
  }
  if (input.networkExpectedOutput && input.networkUserOutput) {
    items.push({
      label: `Output mismatch: got "${input.networkUserOutput}", expected "${input.networkExpectedOutput}"`,
      confirmed: true,
      source: 'network',
    });
  }

  // Diff evidence
  const boundaryOps = diffOps.filter(
    op => op.type !== 'EQUAL' && /[<>=!+\-]/.test(op.content)
  );
  if (boundaryOps.length > 0) {
    items.push({
      label: `Myers Diff confirms ${boundaryOps.length} boundary-related line change(s)`,
      confirmed: true,
      source: 'diff',
    });
  }

  const insertOps = diffOps.filter(op => op.type === 'INSERT');
  const deleteOps = diffOps.filter(op => op.type === 'DELETE');
  if (insertOps.length > 0 || deleteOps.length > 0) {
    items.push({
      label: `Code changed: +${insertOps.length} insertions, -${deleteOps.length} deletions from last attempt`,
      confirmed: true,
      source: 'diff',
    });
  }

  // Behavioral evidence
  const rapid = behavioralSignals.find(s => s.type === 'rapid_resubmission');
  if (rapid) {
    items.push({
      label: 'Rapid resubmission detected (< 2 min between attempts)',
      confirmed: true,
      source: 'behavioral',
    });
  }
  const manyMinor = behavioralSignals.find(s => s.type === 'many_minor_changes');
  if (manyMinor) {
    items.push({
      label: 'Trial-and-error pattern detected (many small edits)',
      confirmed: true,
      source: 'behavioral',
    });
  }
  const longGap = behavioralSignals.find(s => s.type === 'long_gap');
  if (longGap) {
    items.push({
      label: 'Long hesitation before resubmission (> 30 min)',
      confirmed: true,
      source: 'behavioral',
    });
  }

  // Bayesian hypothesis evidence
  const topHyp = hypotheses[0];
  if (topHyp) {
    items.push({
      label: `Bayesian root cause: ${topHyp.name} (${Math.round(topHyp.confidence * 100)}% posterior)`,
      confirmed: true,
      source: 'history',
    });
  }

  // Test count evidence
  if (
    submission.testCasesPassed != null &&
    submission.totalTestCases != null &&
    submission.testCasesPassed < submission.totalTestCases
  ) {
    items.push({
      label: `Passed ${submission.testCasesPassed}/${submission.totalTestCases} test cases`,
      confirmed: true,
      source: 'network',
    });
  }

  return items;
}

// --- Recurring patterns builder ---------------------------------------------

function buildRecurringPatterns(
  historicalPatternCounts: Record<string, number>,
  topics: string[]
): RecurringPattern[] {
  const patterns: RecurringPattern[] = [];
  for (const [cat, count] of Object.entries(historicalPatternCounts)) {
    if (count >= 2) {
      patterns.push({
        category: cat as FailureCategory,
        count,
        problemType: topics[0] ?? 'General',
      });
    }
  }
  return patterns.sort((a, b) => b.count - a.count).slice(0, 5);
}

// --- Rule-based fallback explanation ----------------------------------------

function buildFallbackExplanation(
  input: ExplanationEngineInput,
  topHyp: RootCauseHypothesis | undefined
): Omit<FailureExplanation, 'submissionId' | 'generatedAt'> {
  const { submission } = input;
  const verdict = submission.submissionStatus;
  const category = mapCategory(topHyp?.rootCause ?? '', verdict);

  type FallbackEntry = {
    reason: string;
    logicBreakdown: string;
    learningConcept: string;
    recommendation: string;
    estimatedLearningTimeMinutes: number;
  };

  const FALLBACK_MAP: Record<string, FallbackEntry> = {
    'Wrong Answer': {
      reason:
        'Your solution produces an incorrect output for at least one test case. ' +
        'The logic appears correct for most inputs but fails on a specific edge or boundary condition. ' +
        'Check your loop bounds, null handling, and base cases.',
      logicBreakdown:
        'The code processes most inputs correctly but contains a subtle condition error ' +
        'that is exposed only by the failing test input.',
      learningConcept: 'Loop Boundaries and Edge Case Handling',
      recommendation: 'Practice boundary condition problems: empty arrays, single elements, max/min values.',
      estimatedLearningTimeMinutes: 15,
    },
    'Time Limit Exceeded': {
      reason:
        'Your solution exceeds the time limit because its algorithmic complexity is too high ' +
        'for the given constraints. The hidden test uses a large input that makes the approach infeasible.',
      logicBreakdown:
        'An inner loop or recursive call creates O(N^2) or worse behavior. ' +
        'The failing test uses a worst-case input specifically designed to reveal this.',
      learningConcept: 'Time Complexity Optimization',
      recommendation: 'Review O(N log N) sorting and O(N) hash map approaches for this problem type.',
      estimatedLearningTimeMinutes: 30,
    },
    'Memory Limit Exceeded': {
      reason:
        'Your solution allocates more memory than allowed. ' +
        'This is typically caused by storing all combinations, recursive call stack overflow, ' +
        'or unnecessarily large data structures.',
      logicBreakdown:
        'The data structure chosen for storage grows proportionally to N^2 in the worst case, ' +
        'hitting the memory ceiling on large inputs.',
      learningConcept: 'Space Complexity and In-Place Algorithms',
      recommendation: 'Study in-place modification techniques and rolling array DP optimizations.',
      estimatedLearningTimeMinutes: 25,
    },
    'Runtime Error': {
      reason:
        'Your solution crashes during execution, typically due to an index out of bounds, ' +
        'null pointer dereference, or stack overflow from infinite recursion.',
      logicBreakdown:
        'The failing test likely uses an empty input or extreme edge case ' +
        'that your code does not guard against before accessing array indices or object properties.',
      learningConcept: 'Defensive Programming and Null Checking',
      recommendation: 'Always guard against empty inputs and add bounds checks before array access.',
      estimatedLearningTimeMinutes: 10,
    },
  };

  const defaults: FallbackEntry = FALLBACK_MAP[verdict] ?? FALLBACK_MAP['Wrong Answer'];

  // Build representative test case from available data
  let testCase: ExplanationTestCase | null = null;
  if (input.networkFailedInput) {
    testCase = {
      input: input.networkFailedInput,
      expectedOutput: input.networkExpectedOutput ?? '?',
      userOutput: input.networkUserOutput ?? undefined,
      explanation: 'This is the actual failing test case captured from LeetCode network response.',
      failureMode: 'Output mismatch on captured test case',
      isActualFailedCase: true,
    };
  } else if (submission.failedTestCase) {
    testCase = {
      input: submission.failedTestCase,
      expectedOutput: '(not captured)',
      explanation: 'This test case was detected from the LeetCode UI. Trace through your code manually.',
      failureMode: 'Extension-detected failing input',
      isActualFailedCase: true,
    };
  }

  return {
    verdict,
    testCasesPassed: submission.testCasesPassed ?? null,
    totalTestCases: submission.totalTestCases ?? null,
    rootCause: topHyp?.name ?? 'Logical Error',
    rootCauseCategory: category,
    confidence: topHyp ? Math.round(topHyp.confidence * 100) : 65,
    ...defaults,
    evidenceItems: buildEvidenceItems(input),
    representativeTestCase: testCase,
    recurringPatterns: buildRecurringPatterns(
      input.historicalPatternCounts,
      submission.problemTopics
    ),
  };
}

// --- LLM Explanation via Groq ------------------------------------------------

interface GroqExplanationResponse {
  rootCause: string;
  rootCauseCategory: FailureCategory;
  confidence: number;
  reason: string;
  logicBreakdown: string;
  learningConcept: string;
  recommendation: string;
  estimatedLearningTimeMinutes: number;
  representativeTestCase: {
    input: string;
    expectedOutput: string;
    explanation: string;
    failureMode: string;
  } | null;
}

async function callGroqExplanation(
  input: ExplanationEngineInput,
  groqApiKey: string
): Promise<GroqExplanationResponse | null> {
  const { submission } = input;
  const topHyp = input.hypotheses[0];
  const hasDiff = input.diffOps.some(op => op.type !== 'EQUAL');
  const diffSummary = hasDiff
    ? input.diffOps
        .filter(op => op.type !== 'EQUAL')
        .slice(0, 10)
        .map(op => `${op.type === 'INSERT' ? '+' : '-'} ${op.content.trim()}`)
        .join('\n')
    : 'No previous submission to diff against.';

  const networkSection = input.networkFailedInput
    ? `## Network Evidence (LeetCode Response)
- Failed Input: ${input.networkFailedInput}
- Expected Output: ${input.networkExpectedOutput ?? 'unknown'}
- User Output: ${input.networkUserOutput ?? 'unknown'}
- Passed Testcases: ${input.networkPassedTestcases ?? 'unknown'} / ${input.networkTotalTestcases ?? 'unknown'}`
    : submission.failedTestCase
    ? `## Partial Test Case (from extension DOM scrape)
- Failed Input: ${submission.failedTestCase}
- Expected/User Output: not available`
    : '## Test Case: Not captured (hidden by LeetCode)';

  const similarSection =
    input.similarFailures.length > 0
      ? input.similarFailures
          .map(
            sf =>
              `- ${sf.problemTitle} (${sf.submissionStatus}), similarity: ${sf.similarityScore.toFixed(2)}`
          )
          .join('\n')
      : '- No similar past failures found.';

  const VALID_CATEGORIES = [
    'Boundary Condition', 'Edge Case', 'Off-by-One', 'Overflow',
    'Bit Manipulation', 'Greedy Failure', 'HashMap Misuse', 'Graph Traversal',
    'Dynamic Programming State Error', 'Binary Search Condition',
    'Prefix Sum Error', 'Algorithm Selection', 'Implementation Detail', 'Unknown',
  ].join('", "');

  const prompt = `You are an AI Failure Explanation Engine for a competitive programming learning platform.

Your task: explain WHY this LeetCode submission failed in a way that helps the user learn.

## Submission Context
- Problem: ${submission.problemTitle} (${submission.problemDifficulty})
- Topics: ${submission.problemTopics.join(', ')}
- Verdict: ${submission.submissionStatus}
- Attempt #: ${submission.attemptNumber}
- Passed: ${submission.testCasesPassed ?? '?'} / ${submission.totalTestCases ?? '?'} test cases
- Rapid Resubmission: ${submission.rapidSubmission ? 'yes' : 'no'}

## Code
\`\`\`
${submission.submissionCode.slice(0, 2000)}
\`\`\`

## Myers Diff vs Previous Attempt
\`\`\`diff
${diffSummary}
\`\`\`

${networkSection}

## Bayesian Root Cause (top)
- ${topHyp ? `${topHyp.name} (confidence: ${(topHyp.confidence * 100).toFixed(1)}%)` : 'Unknown'}

## Similar Historical Failures (RAG)
${similarSection}

## Instructions
Analyze all evidence and produce a structured JSON explanation.
- If test case data IS available: explain why that specific input breaks the code.
- If test case data is NOT available: generate a plausible representative adversarial test case that exposes the logical weakness. Do NOT fabricate actual hidden LeetCode data.
- rootCauseCategory MUST be one of: "${VALID_CATEGORIES}"

Output ONLY valid JSON (no markdown):
{
  "rootCause": "concise name, e.g. Loop Boundary Off-by-One",
  "rootCauseCategory": "one of the listed categories",
  "confidence": 0-100,
  "reason": "2-3 sentences explaining why the submission failed",
  "logicBreakdown": "exactly where and how the code logic breaks",
  "learningConcept": "e.g. Loop Boundaries",
  "recommendation": "concrete practice advice",
  "estimatedLearningTimeMinutes": number,
  "representativeTestCase": {
    "input": "string",
    "expectedOutput": "string",
    "explanation": "why this input triggers the bug",
    "failureMode": "short label"
  }
}`;

  try {
    const response = await fetch(
      'https://api.groq.com/' + 'open' + 'ai' + '/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.15,
          response_format: { type: 'json_object' },
        }),
      }
    );

    if (!response.ok) {
      console.warn(`[ExplanationEngine] Groq returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content.trim()) as GroqExplanationResponse;
    return parsed;
  } catch (err) {
    console.warn('[ExplanationEngine] Groq call failed:', err);
    return null;
  }
}

// --- Main entry point --------------------------------------------------------

export async function generateFailureExplanation(
  input: ExplanationEngineInput
): Promise<FailureExplanation> {
  const { submission } = input;
  const topHyp = input.hypotheses[0];
  const evidenceItems = buildEvidenceItems(input);
  const recurringPatterns = buildRecurringPatterns(
    input.historicalPatternCounts,
    submission.problemTopics
  );

  const groqApiKey = process.env.GROQ_API_KEY;
  const isFailure = submission.submissionStatus !== 'Accepted';

  // Only call Groq for failures
  let groqResult: GroqExplanationResponse | null = null;
  if (isFailure && groqApiKey && groqApiKey !== 'your_groq_key_here') {
    console.log('[ExplanationEngine] Calling Groq for failure explanation...');
    groqResult = await callGroqExplanation(input, groqApiKey);
  }

  if (groqResult) {
    // Build test case: prefer real network/extension data, annotate with Groq explanation
    let testCase: ExplanationTestCase | null = null;

    if (input.networkFailedInput) {
      testCase = {
        input: input.networkFailedInput,
        expectedOutput: input.networkExpectedOutput ?? '?',
        userOutput: input.networkUserOutput ?? undefined,
        explanation:
          groqResult.representativeTestCase?.explanation ??
          'Your code returned a different value than expected for this input.',
        failureMode: groqResult.representativeTestCase?.failureMode ?? 'Output mismatch',
        isActualFailedCase: true,
      };
    } else if (submission.failedTestCase) {
      testCase = {
        input: submission.failedTestCase,
        expectedOutput: groqResult.representativeTestCase?.expectedOutput ?? '(not captured)',
        explanation:
          groqResult.representativeTestCase?.explanation ??
          'Trace through your code with this input to identify the error.',
        failureMode: groqResult.representativeTestCase?.failureMode ?? 'Extension-detected input',
        isActualFailedCase: true,
      };
    } else if (groqResult.representativeTestCase) {
      // AI-generated representative case
      testCase = {
        input: groqResult.representativeTestCase.input,
        expectedOutput: groqResult.representativeTestCase.expectedOutput,
        explanation: groqResult.representativeTestCase.explanation,
        failureMode: groqResult.representativeTestCase.failureMode,
        isActualFailedCase: false,
      };
    }

    return {
      submissionId: submission.eventId,
      verdict: submission.submissionStatus,
      testCasesPassed: submission.testCasesPassed ?? null,
      totalTestCases: submission.totalTestCases ?? null,
      rootCause: groqResult.rootCause,
      rootCauseCategory: groqResult.rootCauseCategory,
      confidence: groqResult.confidence,
      reason: groqResult.reason,
      logicBreakdown: groqResult.logicBreakdown,
      learningConcept: groqResult.learningConcept,
      recommendation: groqResult.recommendation,
      estimatedLearningTimeMinutes: groqResult.estimatedLearningTimeMinutes,
      evidenceItems,
      representativeTestCase: testCase,
      recurringPatterns,
      generatedAt: new Date().toISOString(),
    };
  }

  // Groq unavailable or accepted submission -- use rule-based fallback
  console.log('[ExplanationEngine] Using rule-based fallback explanation.');
  const fallback = buildFallbackExplanation(input, topHyp);

  return {
    submissionId: submission.eventId,
    ...fallback,
    generatedAt: new Date().toISOString(),
  };
}
