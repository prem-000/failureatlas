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
