/**
 * replay-engine.ts
 * Orchestrates the full Failure Replay pipeline:
 *
 * 1. Get reference solution (seeded or Groq)
 * 2. Generate candidate inputs
 * 3. Differential testing (reference vs user)
 * 4. Minimize the first failing input
 * 5. Build execution trace
 * 6. Infer root cause
 * 7. Generate AI explanation (Groq)
 * 8. Return FailureReplay
 */

import type { FailureReplay, CounterExample } from '@/types';
import { generateCandidates, inferProblemType, parseConstraints } from './input-generator';
import { differentialTest } from './executor';
import { minimizeInput } from './minimizer';
import { buildExecutionTrace, inferRootCause } from './trace-builder';
import { getReferenceSolution } from './reference-solutions';

const MAX_CANDIDATES = 3000;
const CACHE = new Map<string, { data: FailureReplay; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─── Groq AI Explanation ──────────────────────────────────────────────────────

async function generateAIExplanation(
  problemTitle: string,
  userCode: string,
  minimalInput: string,
  expected: string,
  actual: string,
  rootCauseLabel: string,
  traceDescription: string
): Promise<{ whyItFails: string; fixSuggestion: string; keyInsight: string }> {
  const groqKey = process.env.GROQ_API_KEY;

  const fallback = {
    whyItFails: `For input \`${minimalInput}\`, the algorithm returns \`${actual}\` instead of \`${expected}\`. Root cause: ${rootCauseLabel}.`,
    fixSuggestion: `Review the boundary condition handling and verify the algorithm works for minimal inputs.`,
    keyInsight: `${rootCauseLabel} detected on minimal input ${minimalInput}.`,
  };

  if (!groqKey) return fallback;

  try {
    const prompt = `You are a precise debugging assistant. A student's solution to "${problemTitle}" fails.

MINIMAL FAILING INPUT: ${minimalInput}
EXPECTED OUTPUT: ${expected}
ACTUAL OUTPUT: ${actual}
ROOT CAUSE TYPE: ${rootCauseLabel}

EXECUTION TRACE:
${traceDescription}

USER'S CODE:
${userCode.slice(0, 800)}

Provide a JSON response with exactly these three fields:
{
  "whyItFails": "1-2 sentences explaining exactly why this specific input breaks the algorithm",
  "fixSuggestion": "1-2 sentences with a concrete fix",
  "keyInsight": "One short sentence summarizing the core insight"
}

Return only valid JSON.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 300,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return fallback;
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';

    // Strip markdown fences
    const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    const parsed = JSON.parse(cleaned);

    return {
      whyItFails: parsed.whyItFails ?? fallback.whyItFails,
      fixSuggestion: parsed.fixSuggestion ?? fallback.fixSuggestion,
      keyInsight: parsed.keyInsight ?? fallback.keyInsight,
    };
  } catch {
    return fallback;
  }
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export interface ReplayEngineInput {
  submissionId: string;
  problemSlug: string;
  problemTitle: string;
  problemTopics: string[];
  problemDifficulty: string;
  problemConstraints?: string[];
  userCode: string;
  language: string;
  verdict: string;
  seed?: number;
}

export async function runFailureReplay(opts: ReplayEngineInput): Promise<FailureReplay> {
  const {
    submissionId,
    problemSlug,
    problemTitle,
    problemTopics,
    problemDifficulty,
    problemConstraints = [],
    userCode,
    language,
    verdict,
  } = opts;

  const seed = opts.seed ?? Math.floor(Math.random() * 0xFFFFFF);
  const cacheKey = `${submissionId}:${seed}`;

  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const base: Omit<FailureReplay, 'counterExample' | 'noFailureFound'> = {
    submissionId,
    problemTitle,
    problemSlug,
    verdict,
    language,
    seed,
    generatedAt: new Date().toISOString(),
  };

  // ── Only JavaScript execution is supported ─────────────────────────────────
  const isJS = ['javascript', 'typescript', 'js', 'ts'].includes(language.toLowerCase());

  if (!isJS) {
    const result: FailureReplay = {
      ...base,
      counterExample: null,
      noFailureFound: false,
    };
    return result;
  }

  // ── Step 1: Reference solution ─────────────────────────────────────────────
  const refSolution = await getReferenceSolution(
    problemSlug,
    problemTitle,
    problemTopics,
    problemDifficulty
  );

  if (!refSolution) {
    const result: FailureReplay = { ...base, counterExample: null, noFailureFound: false };
    return result;
  }

  // ── Step 2: Parse constraints & generate candidates ────────────────────────
  const { maxN, minVal, maxVal } = parseConstraints(problemConstraints);
  const problemType = inferProblemType(problemTopics, problemSlug);

  const candidates = generateCandidates({
    problemType,
    maxN: Math.min(maxN, 500), // cap for fast server execution
    minVal: Math.max(minVal, -1000),
    maxVal: Math.min(maxVal, 1000),
    seed,
    candidateCount: MAX_CANDIDATES,
  });

  // ── Step 3: Differential testing ───────────────────────────────────────────
  let failingCandidate: { input: unknown; expected: string; actual: string } | null = null;
  let candidatesTested = 0;

  for (const candidate of candidates) {
    candidatesTested++;
    const result = differentialTest(userCode, refSolution, candidate.raw);
    if (!result.match) {
      failingCandidate = {
        input: candidate.raw,
        expected: result.expected,
        actual: result.actual,
      };
      break;
    }
  }

  if (!failingCandidate) {
    const result: FailureReplay = { ...base, counterExample: null, noFailureFound: true };
    CACHE.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }

  // ── Step 4: Minimize ───────────────────────────────────────────────────────
  const minimal = minimizeInput(failingCandidate.input, (input) =>
    differentialTest(userCode, refSolution, input)
  );

  // Re-run on minimal to get final expected/actual
  const minResult = differentialTest(userCode, refSolution, minimal);
  const minExpected = minResult.expected;
  const minActual = minResult.actual;

  // ── Step 5: Trace + Root Cause ─────────────────────────────────────────────
  const trace = buildExecutionTrace(userCode, minimal, minExpected, minActual);
  const rootCause = inferRootCause(userCode, minimal, minExpected, minActual);
  const traceText = trace.map(s => s.description).join('\n');

  // ── Step 6: AI Explanation ─────────────────────────────────────────────────
  const aiExplanation = await generateAIExplanation(
    problemTitle,
    userCode,
    JSON.stringify(minimal),
    minExpected,
    minActual,
    rootCause.label,
    traceText
  );

  // ── Determine input label ──────────────────────────────────────────────────
  let inputLabel = 'nums';
  if (problemType === 'string') inputLabel = 's';
  else if (problemType === 'number') inputLabel = 'n';
  else if (problemType === 'two-number') inputLabel = 'a, b';

  const counterExample: CounterExample = {
    input: JSON.stringify(minimal),
    inputLabel,
    expected: minExpected,
    actual: minActual,
    errorType: minResult.error ? 'runtime_error' : 'wrong_answer',
    candidatesTestedCount: candidatesTested,
    executionTrace: trace,
    rootCause: {
      type: rootCause.type,
      label: rootCause.label,
      confidence: rootCause.confidence,
      evidenceSummary: rootCause.evidenceSummary,
    },
    aiExplanation,
  };

  const result: FailureReplay = {
    ...base,
    counterExample,
    noFailureFound: false,
  };

  CACHE.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

// ─── NEW FAULT REPLAY ARCHITECTURE ────────────────────────────────────────────

import { prisma } from '@/lib/db/prisma';
import { getConstraintIntelligence } from '@/lib/analysis/constraint-engine';
import { generateReplayIntelligence, evaluateUserReasoning } from './groq-analyzer';
import { validateTargetedTestSuite, executeTestCaseOnCode } from './test-validator';
import type {
  ReplaySessionData,
  ReplayProblemInfo,
  ReplaySubmissionSnapshot,
  TargetedTestCase,
  ConditionNode,
  ProgressiveHint,
  FailureEvidence,
  ReasoningEvaluationResult,
} from './types';

export async function getOrCreateReplaySession(params: {
  userId: string;
  submissionId: string;
  forceRegenerate?: boolean;
}): Promise<ReplaySessionData> {
  const { userId, submissionId, forceRegenerate = false } = params;

  // 1. Fetch submission with user scoping
  const submission = await prisma.submissionEvent.findFirst({
    where: {
      OR: [{ id: submissionId }, { eventId: submissionId }],
      userId,
    },
    include: {
      problem: true,
      failureExplanation: true,
      evidence: {
        include: { rootCauseHypotheses: true },
      },
    },
  });

  if (!submission) {
    throw new Error('Submission not found or unauthorized');
  }

  // 2. Check if subsequent accepted submission exists
  const subsequentAccepted = await prisma.submissionEvent.findFirst({
    where: {
      userId,
      problemId: submission.problemId,
      status: 'Accepted',
    },
    orderBy: { timestamp: 'desc' },
  });

  const isResolved = Boolean(subsequentAccepted || submission.status === 'Accepted');

  // 3. Problem constraints & metadata
  let constraints: string[] = [];
  try {
    const ci = await getConstraintIntelligence(
      submission.problem.title,
      submission.problem.slug,
      submission.problem.difficulty,
      'O(n)',
      submission.problem.topics,
      submission.code
    );
    constraints = ci.problemConstraints || [];
  } catch {
    constraints = [
      '1 <= n <= 10^5',
      '-10^9 <= nums[i] <= 10^9',
      'Handle boundary cases safely.',
    ];
  }

  const problemInfo: ReplayProblemInfo = {
    id: submission.problem.id,
    slug: submission.problem.slug,
    title: submission.problem.title,
    difficulty: submission.problem.difficulty,
    topics: submission.problem.topics,
    statement: `Given the constraints and specifications for ${submission.problem.title}, produce an algorithm that meets the required runtime and memory bounds.`,
    constraints,
    inputFormat: 'Standard format based on problem definition.',
    outputFormat: 'Expected return value matching specification.',
  };

  const submissionSnapshot: ReplaySubmissionSnapshot = {
    id: submission.id,
    status: submission.status,
    language: submission.language,
    code: submission.code,
    passedTests: submission.testCasesPassed ?? 0,
    totalTests: submission.totalTestCases ?? 0,
    timestamp: submission.timestamp.toISOString(),
    attemptNumber: submission.attemptNumber,
    runtime: submission.runtime,
    memory: submission.memory,
    isResolved,
    resolvedAt: subsequentAccepted?.timestamp?.toISOString(),
  };

  // 4. Check existing ReplaySession in DB (one-time Groq generation with persistent database storage)
  const existingSession = await prisma.replaySession.findUnique({
    where: { submissionId: submission.id },
  });

  if (existingSession && !forceRegenerate) {
    console.log(`[ReplayEngine] Cache HIT: Loaded existing replay session from PostgreSQL for submissionId: ${submission.id} (ZERO Groq calls made).`);
    return {
      id: existingSession.id,
      userId: existingSession.userId,
      submissionId: existingSession.submissionId,
      problemId: existingSession.problemId,
      status: isResolved ? 'resolved' : (existingSession.status as any),
      currentLevel: existingSession.currentLevel,
      hintLevel: existingSession.hintLevel,
      analysisVersion: existingSession.analysisVersion,
      problem: problemInfo,
      submission: submissionSnapshot,
      failureEvidence: existingSession.failureEvidence as unknown as FailureEvidence,
      targetedTests: existingSession.targetedTests as unknown as TargetedTestCase[],
      conditionFlow: existingSession.conditionFlow as unknown as ConditionNode[],
      hints: existingSession.hints as unknown as ProgressiveHint[],
      traceData: existingSession.traceData,
      reasoningState: (existingSession.reasoningState as any) || {},
      createdAt: existingSession.createdAt.toISOString(),
      updatedAt: existingSession.updatedAt.toISOString(),
    };
  }

  console.log(`[ReplayEngine] Cache MISS: Calling Groq to generate structured replay intelligence for submissionId: ${submission.id}...`);

  // 5. Generate intelligence with Groq
  const rawIntelligence = await generateReplayIntelligence({
    problem: problemInfo,
    userCode: submission.code,
    language: submission.language,
    verdict: submission.status,
    failedTestCase: submission.failedTestCase,
    passedTests: submission.testCasesPassed,
    totalTests: submission.totalTestCases,
  });

  // 6. Validate generated tests
  const validatedTests = validateTargetedTestSuite(
    rawIntelligence.targetedTests,
    problemInfo,
    submission.code,
    submission.language
  );

  // 7. Store ReplaySession in PostgreSQL
  const savedSession = await prisma.replaySession.upsert({
    where: { submissionId: submission.id },
    create: {
      userId,
      submissionId: submission.id,
      problemId: submission.problem.id,
      status: isResolved ? 'resolved' : 'active',
      currentLevel: 1,
      hintLevel: 1,
      analysisVersion: 'v1',
      failureEvidence: rawIntelligence.failureEvidence as any,
      targetedTests: validatedTests as any,
      conditionFlow: rawIntelligence.conditionFlow as any,
      hints: rawIntelligence.hints as any,
      reasoningState: {},
    },
    update: {
      status: isResolved ? 'resolved' : 'active',
      failureEvidence: rawIntelligence.failureEvidence as any,
      targetedTests: validatedTests as any,
      conditionFlow: rawIntelligence.conditionFlow as any,
      hints: rawIntelligence.hints as any,
      updatedAt: new Date(),
    },
  });

  return {
    id: savedSession.id,
    userId: savedSession.userId,
    submissionId: savedSession.submissionId,
    problemId: savedSession.problemId,
    status: savedSession.status as any,
    currentLevel: savedSession.currentLevel,
    hintLevel: savedSession.hintLevel,
    analysisVersion: savedSession.analysisVersion,
    problem: problemInfo,
    submission: submissionSnapshot,
    failureEvidence: savedSession.failureEvidence as unknown as FailureEvidence,
    targetedTests: savedSession.targetedTests as unknown as TargetedTestCase[],
    conditionFlow: savedSession.conditionFlow as unknown as ConditionNode[],
    hints: savedSession.hints as unknown as ProgressiveHint[],
    traceData: savedSession.traceData,
    reasoningState: (savedSession.reasoningState as any) || {},
    createdAt: savedSession.createdAt.toISOString(),
    updatedAt: savedSession.updatedAt.toISOString(),
  };
}

export async function unlockHintLevel(params: {
  sessionId: string;
  userId: string;
  level: number;
}): Promise<ProgressiveHint[]> {
  const { sessionId, userId, level } = params;

  const session = await prisma.replaySession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) throw new Error('Replay session not found');

  const hints = (session.hints as unknown as ProgressiveHint[]).map(h => ({
    ...h,
    unlocked: h.unlocked || h.level <= level,
  }));

  await prisma.replaySession.update({
    where: { id: sessionId },
    data: {
      hintLevel: Math.max(session.hintLevel, level),
      hints: hints as any,
    },
  });

  return hints;
}

export async function evaluateCheckpoint(params: {
  sessionId: string;
  userId: string;
  nodeId: string;
  answer: string;
}): Promise<ReasoningEvaluationResult & { updatedFlow: ConditionNode[] }> {
  const { sessionId, userId, nodeId, answer } = params;

  const session = await prisma.replaySession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) throw new Error('Replay session not found');

  const flow = session.conditionFlow as unknown as ConditionNode[];
  const targetNode = flow.find(n => n.id === nodeId);

  if (!targetNode || !targetNode.checkpointQuestion) {
    throw new Error('Node or checkpoint question not found');
  }

  const evaluation = await evaluateUserReasoning({
    nodeId,
    question: targetNode.checkpointQuestion.prompt,
    expectedConcept: targetNode.checkpointQuestion.expectedConcept,
    userAnswer: answer,
    options: targetNode.checkpointQuestion.options,
    correctOptionIndex: targetNode.checkpointQuestion.correctOptionIndex,
  });

  // Update node state in flow
  const updatedFlow = flow.map((node, index) => {
    if (node.id === nodeId) {
      return {
        ...node,
        userAnswer: answer,
        evaluationResult: evaluation.result,
        feedback: evaluation.feedback,
        status: evaluation.result === 'pass' ? ('completed' as const) : ('unlocked' as const),
      };
    }
    // Unlock next node if pass
    if (evaluation.result === 'pass' && index === flow.findIndex(n => n.id === nodeId) + 1) {
      return {
        ...node,
        status: 'unlocked' as const,
      };
    }
    return node;
  });

  const existingReasoning = (session.reasoningState as any) || {};
  existingReasoning[nodeId] = {
    answer,
    result: evaluation.result,
    feedback: evaluation.feedback,
  };

  await prisma.replaySession.update({
    where: { id: sessionId },
    data: {
      conditionFlow: updatedFlow as any,
      reasoningState: existingReasoning,
    },
  });

  return {
    ...evaluation,
    updatedFlow,
  };
}

export async function runTestcaseOnSession(params: {
  sessionId: string;
  userId: string;
  testCaseId: string;
  code?: string;
}): Promise<{ test: TargetedTestCase; passed: boolean; output: string }> {
  const { sessionId, userId, testCaseId, code } = params;

  const session = await prisma.replaySession.findFirst({
    where: { id: sessionId, userId },
    include: { submission: true },
  });

  if (!session) throw new Error('Replay session not found');

  const tests = session.targetedTests as unknown as TargetedTestCase[];
  const targetTest = tests.find(t => t.id === testCaseId);

  if (!targetTest) throw new Error('Test case not found');

  const codeToRun = code || session.submission.code;
  const execResult = executeTestCaseOnCode(targetTest, codeToRun, session.submission.language);

  const cleanUser = String(execResult.userOutput).trim().toLowerCase();
  const cleanExpected = String(targetTest.expected).trim().toLowerCase();
  const passed = cleanUser === cleanExpected;

  const updatedTests = tests.map(t => {
    if (t.id === testCaseId) {
      return {
        ...t,
        userOutput: execResult.userOutput,
        status: passed ? ('passed' as const) : ('failed' as const),
      };
    }
    return t;
  });

  await prisma.replaySession.update({
    where: { id: sessionId },
    data: {
      targetedTests: updatedTests as any,
    },
  });

  return {
    test: {
      ...targetTest,
      userOutput: execResult.userOutput,
      status: passed ? 'passed' : 'failed',
    },
    passed,
    output: execResult.userOutput,
  };
}

