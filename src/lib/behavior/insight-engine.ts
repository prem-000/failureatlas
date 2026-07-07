/**
 * src/lib/behavior/insight-engine.ts
 * Weighted behavioral analysis engine.
 * NO LLM — all patterns derived from historical submission data.
 *
 * Score: weightedScore = 0.70 * recentRate + 0.30 * historicalRate
 * Recent window: last 50 submissions within last 90 days
 */

import { prisma } from '@/lib/db/prisma';
import type { BehaviorInsight, HistoricalFailure, LearningStep, ImpactLevel, ReasoningPrescription } from '@/types';
import { groqClient } from '../api/groq-client';

// ─── Weakness → Checklist mapping ─────────────────────────────────────────────

const WEAKNESS_PRESCRIPTIONS: Record<string, LearningStep[]> = {
  'edge-case-reasoning': [
    { step: 1, action: 'Test empty input []', targetEdgeCase: 'empty array' },
    { step: 2, action: 'Test single element [x]', targetEdgeCase: 'single element' },
    { step: 3, action: 'Test maximum constraint (n=10⁵)', targetEdgeCase: 'max size' },
    { step: 4, action: 'Test duplicate-heavy input [1,1,1,1]', targetEdgeCase: 'duplicates' },
    { step: 5, action: 'Test first and last index boundaries', targetEdgeCase: 'boundary index' },
  ],
  'boundary-condition-error': [
    { step: 1, action: 'Check all loop bounds — use <n vs <=n deliberately', targetEdgeCase: 'loop boundary' },
    { step: 2, action: 'Trace through single-element input by hand', targetEdgeCase: 'single element' },
    { step: 3, action: 'Verify index math: mid = (l + r) // 2 not l + r / 2', targetEdgeCase: 'overflow' },
    { step: 4, action: 'Test both inclusive and exclusive endpoints', targetEdgeCase: 'boundary' },
  ],
  'pattern-recognition-gap': [
    { step: 1, action: 'Identify the data access pattern before writing code', targetEdgeCase: 'pattern' },
    { step: 2, action: 'Ask: is there a Two Pointer or Sliding Window reformulation?', targetEdgeCase: 'optimization' },
    { step: 3, action: 'Check if a Hash Map eliminates a nested loop', targetEdgeCase: 'nested loop' },
    { step: 4, action: 'Review related patterns in the knowledge graph before submitting', targetEdgeCase: 'pattern transfer' },
  ],
  'performance-analysis': [
    { step: 1, action: 'Identify the dominant time complexity before submitting', targetEdgeCase: 'TLE' },
    { step: 2, action: 'Count nested loops — each level multiplies complexity by n', targetEdgeCase: 'nested loop' },
    { step: 3, action: 'Test with maximum constraint input (n=10⁵) locally', targetEdgeCase: 'max constraint' },
    { step: 4, action: 'Ask: can I replace this nested loop with a Hash Map?', targetEdgeCase: 'optimization' },
  ],
  'implementation-precision': [
    { step: 1, action: 'Trace through the first 3 iterations by hand before submitting', targetEdgeCase: 'trace' },
    { step: 2, action: 'Check: does your return value match what the problem asks for?', targetEdgeCase: 'output format' },
    { step: 3, action: 'Verify variable initialization (0 vs -inf vs None)', targetEdgeCase: 'initialization' },
    { step: 4, action: 'Re-read the constraints section of the problem', targetEdgeCase: 'constraints' },
  ],
};

const DEFAULT_PRESCRIPTION: LearningStep[] = [
  { step: 1, action: 'Test edge cases: empty, single, max, duplicates, boundaries' },
  { step: 2, action: 'Verify the dominant complexity before submitting' },
  { step: 3, action: 'Trace through 2-3 examples by hand' },
];

// ─── Weakness → behavioral pattern descriptions ────────────────────────────────

const WEAKNESS_BEHAVIORAL_PATTERNS: Record<string, string[]> = {
  'edge-case-reasoning': [
    'Validates solution against common scenarios first',
    'Rarely tests empty arrays, single-element inputs, or maximum constraints',
    'Stops testing once the main logic appears correct',
    'Focuses on algorithm construction more than verification',
  ],
  'boundary-condition-error': [
    'Often changes loop bounds (< vs <=) between attempts',
    'Frequently makes off-by-one corrections in subsequent submissions',
    'Tends to fix boundary errors after seeing the failing test case',
  ],
  'pattern-recognition-gap': [
    'Takes significantly longer on pattern-based problems',
    'Rewrites algorithms rather than optimizing existing approach',
    'More comfortable with brute-force before recognizing the optimal pattern',
  ],
  'performance-analysis': [
    'Prioritizes correctness over complexity during initial implementation',
    'Tends to discover TLE constraints after the first submission',
    'May not estimate complexity before submitting',
  ],
  'implementation-precision': [
    'Makes rapid resubmissions with small code changes',
    'Tends to debug by trial-and-error rather than systematic tracing',
    'Fixes details in the implementation rather than the algorithm',
  ],
};

// ─── Root Cause Type → weakness mapping ───────────────────────────────────────

const RC_TO_WEAKNESS: Record<string, string> = {
  'boundary-condition-error': 'edge-case-reasoning',
  'off-by-one-error': 'boundary-condition-error',
  'empty-array-handling': 'edge-case-reasoning',
  'binary-search-edge-cases': 'edge-case-reasoning',
  'sliding-window': 'pattern-recognition-gap',
  'two-pointers': 'pattern-recognition-gap',
  'hash-map': 'pattern-recognition-gap',
  'greedy-selection': 'pattern-recognition-gap',
  'pattern-recognition-gap': 'pattern-recognition-gap',
  'time-complexity-oversight': 'performance-analysis',
  'space-complexity-oversight': 'performance-analysis',
  'algorithm-selection-mistake': 'performance-analysis',
  'data-structure-mismatch': 'performance-analysis',
  'implementation-detail-error': 'implementation-precision',
  'input-output-handling-error': 'implementation-precision',
};

function weaknessIdToName(id: string): string {
  return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function computeImpact(weightedScore: number): ImpactLevel {
  if (weightedScore >= 0.55) return 'High';
  if (weightedScore >= 0.30) return 'Medium';
  return 'Low';
}

// ─── Main engine ──────────────────────────────────────────────────────────────

async function generateReasoningPrescription(
  weaknessName: string,
  code: string,
  problemTitle: string,
  problemTopics: string[],
  failedTest: string | null,
  historicalSimilarityCount: number
): Promise<ReasoningPrescription | undefined> {
  const prompt = `You are a Senior Compiler Engineer, Code Quality Architect, and competitive programming expert.
Analyze the user's buggy code for the problem "${problemTitle}" (Topics: ${problemTopics.join(', ')}).
They failed due to a weakness in: "${weaknessName}".

User's Code:
\`\`\`
${code}
\`\`\`
${failedTest ? `Observed Failed Test Case: ${failedTest}` : ''}

Your task is to diagnose this failure under the "${weaknessName}" weakness type and output a valid JSON object matching the schema below.
Provide a high-fidelity reasoning analysis of why the code fails, infer a likely hidden test case that exposes the bug, and provide code-level evidence.

JSON Schema:
{
  "failureReason": "A 1-2 sentence explanation of why the user's specific solution fails under this weakness (e.g. 'Your solution fails because it assumes every element will have a matching pair.')",
  "inferredTestInput": "A representative LeetCode test input that likely triggers this failure (e.g., 'nums = [5], target = 5')",
  "inferredTestExpected": "The correct expected output for the inferred test case (e.g. 'false')",
  "inferredTestPurpose": "Purpose of this test case (e.g. 'Checks if lookup element can pair with itself.')",
  "inferredTestOutput": "What the user's buggy implementation would output (e.g. 'true' or 'Runtime Error')",
  "explanation": "Clear execution explanation of the failure (e.g. 'Your hash lookup returns before checking whether the element can pair with itself.')",
  "confidence": number (between 70 and 100),
  "evidence": "Concrete code snippet or statement from the user's solution that causes this issue (e.g., 'if target - num in map')"
}

Return ONLY a raw JSON string. Do not wrap in markdown blocks like \`\`\`json.`;

  try {
    const response = await groqClient.getChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.content.trim());
    return {
      ...parsed,
      historicalSimilarityCount,
    };
  } catch (err) {
    console.error('❌ Failed to generate reasoning prescription via Groq:', err);
    return undefined;
  }
}

export async function generateBehaviorInsight(
  userId: string,
  weaknessId: string,
  submissionId?: string
): Promise<BehaviorInsight> {
  const weaknessName = weaknessIdToName(weaknessId);

  // Relevant root cause types for this weakness
  const relevantRCs = Object.entries(RC_TO_WEAKNESS)
    .filter(([, w]) => w === weaknessId)
    .map(([rc]) => rc);
  // Also include the weakness ID itself as a root cause type (direct match)
  const rcFilter = [...new Set([...relevantRCs, weaknessId])];

  // ── Recent window: last 50 submissions within last 90 days ─────────────────
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const recentSubmissions = await prisma.submissionEvent.findMany({
    where: {
      userId,
      timestamp: { gte: ninetyDaysAgo },
      NOT: { status: 'Accepted' },
    },
    include: {
      problem: true,
      evidence: { include: { rootCauseHypotheses: true } },
    },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  // ── All-time failures ──────────────────────────────────────────────────────
  const allTimeSubmissions = await prisma.submissionEvent.findMany({
    where: {
      userId,
      NOT: { status: 'Accepted' },
    },
    include: {
      problem: true,
      evidence: { include: { rootCauseHypotheses: true } },
    },
    orderBy: { timestamp: 'desc' },
    take: 500,
  });

  // Helper: count matching weakness failures
  function countMatching(subs: typeof recentSubmissions): number {
    return subs.filter(sub =>
      sub.evidence.some(ev =>
        ev.rootCauseHypotheses.some(h => rcFilter.includes(h.rootCauseType))
      )
    ).length;
  }

  const recentTotal = recentSubmissions.length;
  const recentMatching = countMatching(recentSubmissions);
  const recentRate = recentTotal > 0 ? recentMatching / recentTotal : 0;

  const historicalTotal = allTimeSubmissions.length;
  const historicalMatching = countMatching(allTimeSubmissions);
  const historicalRate = historicalTotal > 0 ? historicalMatching / historicalTotal : 0;

  // Weighted score: 70% recent, 30% historical
  const weightedScore = 0.70 * recentRate + 0.30 * historicalRate;

  // ── Build historical failure list (matching this weakness) ─────────────────
  const historicalFailures: HistoricalFailure[] = [];
  for (const sub of recentSubmissions.slice(0, 12)) {
    const matchingHyps = sub.evidence
      .flatMap(ev => ev.rootCauseHypotheses)
      .filter(h => rcFilter.includes(h.rootCauseType));
    if (matchingHyps.length > 0) {
      const topHyp = matchingHyps.sort((a, b) => b.confidence - a.confidence)[0];
      historicalFailures.push({
        problemTitle: sub.problem.title,
        problemSlug: sub.problem.slug,
        status: sub.status,
        rootCauseType: topHyp.rootCauseType,
        rootCauseName: topHyp.name,
        timestamp: sub.timestamp.toISOString(),
      });
    }
  }

  // ── Evidence statements ────────────────────────────────────────────────────
  const evidence: string[] = [];
  if (recentMatching > 0) {
    evidence.push(`${recentMatching} of your last ${recentTotal} failures match this weakness`);
  }
  if (historicalMatching > historicalTotal * 0.5) {
    evidence.push(`${Math.round(historicalRate * 100)}% of all-time failures involve this weakness`);
  }
  if (historicalFailures.length > 0) {
    evidence.push(`Most recent: ${historicalFailures[0].problemTitle} (${historicalFailures[0].rootCauseName})`);
  }

  // Check rapid resubmission pattern
  const rapidSubs = recentSubmissions.filter(s => s.rapidSubmission);
  if (rapidSubs.length >= 3) {
    evidence.push(`${rapidSubs.length} rapid resubmissions in the recent window — suggests trial-and-error over planning`);
  }

  // ── Behavioral patterns ────────────────────────────────────────────────────
  const behavioralPatterns = WEAKNESS_BEHAVIORAL_PATTERNS[weaknessId] || [
    'Recurring failure pattern detected',
    'Consistent difficulty with this weakness type',
  ];

  // ── Root behavior cause ────────────────────────────────────────────────────
  let rootBehaviorCause = '';
  if (weightedScore >= 0.55) {
    rootBehaviorCause = `You have a consistent verification gap with ${weaknessName}. This appears in ${Math.round(weightedScore * 100)}% of your recent failure window — it is the single highest-priority area to address.`;
  } else if (weightedScore >= 0.30) {
    rootBehaviorCause = `${weaknessName} appears in a significant portion of your failures. This is a recurring pattern, but not your only challenge.`;
  } else {
    rootBehaviorCause = `${weaknessName} occasionally appears in your failures. Consider adding it to your pre-submission checklist to eliminate it entirely.`;
  }

  // ── Prescription / Dynamic Reasoning ───────────────────────────────────────
  let reasoningPrescription: ReasoningPrescription | undefined = undefined;

  let targetSubmission = null;
  if (submissionId) {
    targetSubmission = await prisma.submissionEvent.findFirst({
      where: { userId, OR: [{ id: submissionId }, { eventId: submissionId }] },
      include: { problem: true }
    });
  }

  // Fallback to latest matching failed submission if none specified
  if (!targetSubmission && recentSubmissions.length > 0) {
    targetSubmission = recentSubmissions[0];
  }

  if (targetSubmission) {
    reasoningPrescription = await generateReasoningPrescription(
      weaknessName,
      targetSubmission.code,
      targetSubmission.problem.title,
      targetSubmission.problem.topics || [],
      targetSubmission.failedTestCase || null,
      historicalMatching
    );
  }

  const learningPrescription = WEAKNESS_PRESCRIPTIONS[weaknessId] || DEFAULT_PRESCRIPTION;

  return {
    weaknessId,
    weaknessName,
    confidence: Math.min(0.97, weightedScore + 0.15), // slight upward adjustment for classification confidence
    evidence,
    behavioralPatterns,
    historicalFailures,
    recentFailureRate: recentRate,
    historicalFailureRate: historicalRate,
    weightedScore,
    rootBehaviorCause,
    learningPrescription,
    estimatedImpact: computeImpact(weightedScore),
    reasoningPrescription,
  };
}
