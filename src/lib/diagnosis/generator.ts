/**
 * src/lib/diagnosis/generator.ts
 *
 * AI Diagnosis Generator for FailureAtlas.
 * Synthesizes user intent, target problem context, historical attempts,
 * PageRank topological weakness scores, and RAG similar failure evidence
 * into a structured, actionable diagnosis using Groq.
 */

import type { SubmissionEvent, WeaknessType, DiagnosisStage } from '@/types';
import type { RetrievedFailure } from '../rag/retrieval';
import type { WeaknessScore } from '../graph/pagerank';
import { groqClient } from '@/lib/api/groq-client';
import type { IntentResolutionResult } from './intent-resolver';
import type { ProblemResolutionResult } from './problem-resolver';

export const DIAGNOSIS_MODEL_VERSION = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

export interface StructuredDiagnosis {
  primaryWeaknessId: WeaknessType;
  primaryWeaknessName: string;
  confidence: number;
  reasoningChain: string;
  learningRecommendations: Array<{
    name: string;
    description: string;
    estimatedTime: number; // minutes
    priority: 'high' | 'medium' | 'low';
    practiceProblems: Array<{
      problemSlug: string;
      title: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
    }>;
  }>;
}

export interface DiagnosisContextOptions {
  userQuery?: string;
  intent?: IntentResolutionResult;
  problemResolution?: ProblemResolutionResult;
  historySummary?: {
    totalFailures: number;
    totalAccepted: number;
    recentWeaknesses: string[];
    streakDays: number;
  };
  existingDiagnosis?: {
    primaryWeaknessId: string;
    primaryWeaknessName: string;
    confidence: number;
    reasoningChain?: string;
  };
  onStage?: (stage: DiagnosisStage) => void;
}

function getFallbackDiagnosis(
  current: SubmissionEvent | null,
  weaknessScores: WeaknessScore[],
  options?: DiagnosisContextOptions
): StructuredDiagnosis {
  let primaryId: WeaknessType = 'edge-case-reasoning';
  let primaryName = 'Edge Case Reasoning';
  let confidence = 85;

  if (options?.existingDiagnosis) {
    primaryId = options.existingDiagnosis.primaryWeaknessId as WeaknessType;
    primaryName = options.existingDiagnosis.primaryWeaknessName;
    confidence = options.existingDiagnosis.confidence;
  } else if (current?.submissionStatus === 'Time Limit Exceeded' || current?.submissionStatus === 'Memory Limit Exceeded') {
    primaryId = 'performance-analysis';
    primaryName = 'Performance Analysis';
  } else if (weaknessScores.length > 0 && weaknessScores[0]) {
    primaryId = weaknessScores[0].id as WeaknessType;
    primaryName = weaknessScores[0].name;
  }

  const recommendations: StructuredDiagnosis['learningRecommendations'] = [];
  const query = options?.userQuery?.trim() || '';
  const intent = options?.intent?.intent || 'CURRENT_FAILURE';
  const prob = options?.problemResolution;

  let fallbackReasoning = options?.existingDiagnosis?.reasoningChain
    ? `Continuing analysis on ${primaryName}: ${query ? `regarding "${query}", ` : ''}focus on invariant verification.`
    : 'Identified gap area based on algorithmic heuristic analysis.';

  switch (intent) {
    case 'WEEKLY_PRACTICE':
      fallbackReasoning = `Weekly Study Plan: Focus on strengthening "${primaryName}". Dedicate days 1-2 to core pattern review, days 3-5 to solving targeted practice drills, and days 6-7 to timed LeetCode challenges.`;
      recommendations.push(
        {
          name: `${primaryName} Fundamentals`,
          description: 'Review core invariant patterns and dry-run edge cases.',
          estimatedTime: 60,
          priority: 'high',
          practiceProblems: [
            { problemSlug: 'two-sum', title: 'Two Sum', difficulty: 'Easy' },
            { problemSlug: 'valid-parentheses', title: 'Valid Parentheses', difficulty: 'Easy' },
          ],
        },
        {
          name: `${primaryName} Consolidation Drill`,
          description: 'Solve 2 medium problems under 25-minute time constraints.',
          estimatedTime: 90,
          priority: 'medium',
          practiceProblems: [
            { problemSlug: 'longest-substring-without-repeating-characters', title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium' },
          ],
        }
      );
      break;

    case 'PROBLEM_EXPLANATION':
    case 'PROBLEM_LOOKUP':
      if (prob?.targetProblem) {
        if (!prob.userHasAttempted) {
          fallbackReasoning = `You haven't submitted an attempt for "${prob.targetProblem.title}" yet. Based on your profile (${primaryName}), make sure to clarify constraints, write down edge cases before writing loops, and verify complexity bounds.`;
          recommendations.push({
            name: `Approach Guide for ${prob.targetProblem.title}`,
            description: 'Break down problem into state transitions and check for off-by-one bounds.',
            estimatedTime: 45,
            priority: 'high',
            practiceProblems: [{
              problemSlug: prob.targetProblem.slug,
              title: prob.targetProblem.title,
              difficulty: (prob.targetProblem.difficulty as any) || 'Medium',
            }],
          });
        } else if (prob.latestFailedAttempt) {
          fallbackReasoning = `Your attempt for "${prob.targetProblem.title}" encountered ${prob.latestFailedAttempt.status}${prob.latestFailedAttempt.failedTestCase ? ` on test case: ${prob.latestFailedAttempt.failedTestCase}` : ''}. This points to ${primaryName}.`;
          recommendations.push({
            name: `Debug Checklist for ${prob.targetProblem.title}`,
            description: 'Trace variable bounds and review loop termination conditions.',
            estimatedTime: 30,
            priority: 'high',
            practiceProblems: [{
              problemSlug: prob.targetProblem.slug,
              title: prob.targetProblem.title,
              difficulty: (prob.targetProblem.difficulty as any) || 'Medium',
            }],
          });
        } else {
          fallbackReasoning = `You have already solved "${prob.targetProblem.title}" with an Accepted submission! To push further, optimize space complexity or attempt a harder variant.`;
        }
      } else {
        fallbackReasoning = query ? `Analysis for "${query}": Root cause points to ${primaryName}.` : fallbackReasoning;
      }
      break;

    case 'PATTERN_EXPLANATION':
      fallbackReasoning = `Pattern Breakdown: Algorithmic patterns require invariant maintenance. With ${primaryName}, bugs typically occur when state assumptions are violated at array extremes or during pointer updates.`;
      break;

    case 'HISTORICAL_FAILURES':
      fallbackReasoning = `Historical Failure Analysis: Your recurring error pattern centers on "${primaryName}". Across past attempts, failures cluster around boundary edge conditions and loop state transitions.`;
      break;

    case 'RESOURCE_REQUEST':
      fallbackReasoning = `Recommended Learning Resources for ${primaryName}: Review standard two-pointer/sliding-window invariants and practice writing test checklists before coding.`;
      break;

    case 'GENERAL_DSA_QUESTION':
      fallbackReasoning = query
        ? `Regarding "${query}": Systemic improvement in DSA comes from recognizing pattern invariants rather than memorizing individual solutions.`
        : 'Welcome to FailureAtlas. Submit your problem code or ask about your failure patterns to get started.';
      break;

    default:
      if (current) {
        fallbackReasoning = `Failure on ${current.problemTitle} (${current.submissionStatus}) is linked to ${primaryName}. Check loop bounds and boundary conditions.`;
      }
      break;
  }

  if (recommendations.length === 0) {
    recommendations.push({
      name: `${primaryName} Checklist`,
      description: 'Review boundary inputs: empty arrays, single elements, and max/min limits.',
      estimatedTime: 45,
      priority: 'high',
      practiceProblems: [
        { problemSlug: 'two-sum', title: 'Two Sum', difficulty: 'Easy' },
        { problemSlug: 'search-insert-position', title: 'Search Insert Position', difficulty: 'Easy' },
      ],
    });
  }

  return {
    primaryWeaknessId: primaryId,
    primaryWeaknessName: primaryName,
    confidence: 85,
    reasoningChain: fallbackReasoning,
    learningRecommendations: recommendations,
  };
}

export async function generateAIDiagnosis(
  current: SubmissionEvent | null,
  similarFailures: RetrievedFailure[],
  weaknessScores: WeaknessScore[],
  userQueryOrOptions?: string | DiagnosisContextOptions
): Promise<StructuredDiagnosis> {
  const options: DiagnosisContextOptions =
    typeof userQueryOrOptions === 'string'
      ? { userQuery: userQueryOrOptions }
      : userQueryOrOptions || {};

  const hasGroqKey = Boolean(
    (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_key_here') ||
      process.env.GROQ_API_KEY_1
  );

  if (!hasGroqKey) {
    options.onStage?.('reasoning');
    console.warn('⚠️ GROQ_API_KEY is not defined. Falling back to rule-based diagnosis.');
    return getFallbackDiagnosis(current, weaknessScores, options);
  }

  const query = options.userQuery?.trim() || '';
  const intent = options.intent?.intent || 'CURRENT_FAILURE';
  const prob = options.problemResolution;

  // Assemble intent-specific context
  let problemContextSection = '';
  if (prob?.problemMentioned && prob.targetProblem) {
    problemContextSection = `
## Queried Problem Context
- Problem: ${prob.targetProblem.title} (${prob.targetProblem.difficulty})
- Topics: ${prob.targetProblem.topics.join(', ')}
- User Attempted: ${prob.userHasAttempted ? `Yes (${prob.attempts.length} attempts)` : 'No (0 attempts)'}
${prob.latestFailedAttempt ? `- Latest Failure: ${prob.latestFailedAttempt.status}${prob.latestFailedAttempt.failedTestCase ? ` | Failed Test: ${prob.latestFailedAttempt.failedTestCase}` : ''}
- Failed Code:
\`\`\`
${prob.latestFailedAttempt.code?.slice(0, 1200) || '(no code captured)'}
\`\`\`
` : ''}
${prob.latestAcceptedAttempt ? `- User Has Accepted Submission: Yes (attempt #${prob.latestAcceptedAttempt.attemptNumber})` : ''}
`;
  } else if (current) {
    problemContextSection = `
## Current Failure Context
- Problem: ${current.problemTitle} (${current.problemDifficulty})
- Topics: ${current.problemTopics.join(', ')}
- Submission Status: ${current.submissionStatus}
- Code:
\`\`\`
${current.submissionCode?.slice(0, 1200) || '(no code captured)'}
\`\`\`
${current.failedTestCase ? `- Failed Test Case: ${current.failedTestCase}` : ''}
`;
  } else {
    problemContextSection = `
## Current Context
- No specific problem submission target. Focus on aggregate user patterns and query.
`;
  }

  const consistencySection = options.existingDiagnosis ? `
## Stored Root Cause Diagnosis (MUST REMAIN CONSISTENT)
- Established Root Cause: ${options.existingDiagnosis.primaryWeaknessName} (${options.existingDiagnosis.primaryWeaknessId})
- Established Confidence: ${options.existingDiagnosis.confidence}%
- Prior Diagnosis Reasoning: ${options.existingDiagnosis.reasoningChain || 'Established root cause for this attempt.'}

CRITICAL CONSISTENCY CONSTRAINT:
This session already has an established root cause diagnosis (${options.existingDiagnosis.primaryWeaknessName}, ${options.existingDiagnosis.confidence}% confidence).
You MUST preserve "primaryWeaknessId": "${options.existingDiagnosis.primaryWeaknessId}", "primaryWeaknessName": "${options.existingDiagnosis.primaryWeaknessName}", and "confidence": ${options.existingDiagnosis.confidence}.
Do NOT classify or invent a conflicting root cause.
Provide your reasoning and commentary in "reasoningChain" ON TOP of this established diagnosis to answer the user's question: "${query}".
` : '';

  const prompt = `
You are an expert AI Failure Analyst and Algorithmic Reasoning Tutor inside FailureAtlas.
Your goal is to answer the user's inquiry accurately and constructively.

## Detected User Intent
${intent}

## User's Actual Question
"${query || 'Diagnose my coding patterns'}"

${problemContextSection}
${consistencySection}

## Similar Past Failures (from embedding search)
${
  similarFailures.length > 0
    ? similarFailures
        .map(
          (sf) =>
            `- Problem: ${sf.problemTitle} (${sf.submissionStatus}). Similarity: ${sf.similarityScore.toFixed(2)}. Snippet: ${sf.code?.slice(0, 150)}`
        )
        .join('\n')
    : '- No similar past failures found.'
}

## Weakness Pattern Analysis (PageRank Scores)
${
  weaknessScores.length > 0
    ? weaknessScores
        .map(
          (ws) =>
            `- ${ws.name} (${ws.id}): PageRank = ${ws.pageRankScore.toFixed(3)}, Frequency = ${ws.frequency}`
        )
        .join('\n')
    : '- No weakness patterns computed yet.'
}

## Special Instructions Based on Intent:
- If intent is "WEEKLY_PRACTICE": Directly answer with a concrete study schedule for the week in "reasoningChain". Suggest problems that directly attack their top PageRank weakness.
- If intent is "PROBLEM_EXPLANATION" and user asked about a specific problem: Answer WHY that specific problem failed (or how to solve it) in "reasoningChain". Do NOT talk about unrelated problems.
- If user has NOT attempted the problem: Clearly state they haven't submitted code for it yet, explain the core algorithmic pitfall to avoid, and recommend the best starting approach.
- If intent is "PATTERN_EXPLANATION": Provide a deep, technical explanation of the pattern or invariant in "reasoningChain".
- If intent is "RESOURCE_REQUEST": Recommend structured strategies, articles, or curated problems.
- If intent is "GENERAL_DSA_QUESTION": Directly answer their question in a helpful, professional tone.

## Output Schema (Strict JSON, no markdown codeblocks):
{
  "primaryWeaknessId": "edge-case-reasoning" | "algorithmic-pattern-recognition" | "performance-analysis" | "implementation-precision",
  "primaryWeaknessName": "Edge Case Reasoning" | "Algorithmic Pattern Recognition" | "Performance Analysis" | "Implementation Precision",
  "confidence": number (between 0 and 100),
  "reasoningChain": string (clear, direct answer to the user's question, 2-4 sentences),
  "learningRecommendations": [
    {
      "name": string,
      "description": string,
      "estimatedTime": number,
      "priority": "high" | "medium" | "low",
      "practiceProblems": [
        {
          "problemSlug": string,
          "title": string,
          "difficulty": "Easy" | "Medium" | "Hard"
        }
      ]
    }
  ]
}
`;

  try {
    options.onStage?.('reasoning');
    console.log('[DIAGNOSIS] Groq request started for intent:', intent);
    const response = await groqClient.getChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      model: DIAGNOSIS_MODEL_VERSION,
    });

    let clean = response.content.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    clean = clean.trim();

    const parsed = JSON.parse(clean) as StructuredDiagnosis;
    if (parsed && parsed.reasoningChain) {
      if (options.existingDiagnosis) {
        parsed.primaryWeaknessId = options.existingDiagnosis.primaryWeaknessId as WeaknessType;
        parsed.primaryWeaknessName = options.existingDiagnosis.primaryWeaknessName;
        parsed.confidence = options.existingDiagnosis.confidence;
      }
      return parsed;
    }

    throw new Error('Groq response missing required fields');
  } catch (err: any) {
    console.error('[DIAGNOSIS] Groq generation failed:', err?.message || err);
    return getFallbackDiagnosis(current, weaknessScores, options);
  }
}

/**
 * Maps arbitrary root cause or weakness string to one of the 8 canonical RootCauseTypes
 */
export function resolveRootCauseType(raw: string): import('@/types').RootCauseType {
  const norm = (raw || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
  if (norm.includes('boundary') || norm.includes('off-by-one')) return 'boundary-condition-error';
  if (norm.includes('algorithm-selection') || norm.includes('greedy-failure')) return 'algorithm-selection-mistake';
  if (norm.includes('pattern') || norm.includes('recognition')) return 'pattern-recognition-gap';
  if (norm.includes('time-complexity') || norm.includes('time-limit') || norm.includes('tle') || norm.includes('performance')) return 'time-complexity-oversight';
  if (norm.includes('space-complexity') || norm.includes('memory-limit') || norm.includes('mle')) return 'space-complexity-oversight';
  if (norm.includes('data-structure') || norm.includes('hashmap') || norm.includes('stack')) return 'data-structure-mismatch';
  if (norm.includes('implementation') || norm.includes('precision') || norm.includes('overflow')) return 'implementation-detail-error';
  if (norm.includes('input-output') || norm.includes('edge-case') || norm.includes('io')) return 'input-output-handling-error';
  return 'boundary-condition-error';
}

/**
 * High-level unified diagnosis generator function.
 * Produces a unified DiagnosisResult with attached static resources, deduplicated recommendations,
 * and handles caching via Upstash Redis.
 */
export async function generateDiagnosis(params: {
  current: SubmissionEvent | null;
  similarFailures: RetrievedFailure[];
  weaknessScores: WeaknessScore[];
  options?: DiagnosisContextOptions;
  cacheKey?: string;
}): Promise<import('@/types').DiagnosisResult> {
  const { current, similarFailures, weaknessScores, options, cacheKey } = params;
  const { getCachedDiagnosis, setCachedDiagnosis, isNonCacheableQuery } = await import('@/lib/cache/redis');
  const { ROOT_CAUSE_RESOURCES } = await import('@/lib/resources/catalog');
  const { deduplicateRecommendations } = await import('@/lib/recommendations/dedup');

  const isBypass = isNonCacheableQuery(options?.userQuery);

  // 1. Check Redis Cache first if cacheKey provided and not non-cacheable query
  if (cacheKey && !isBypass) {
    const cached = await getCachedDiagnosis(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // 2. Generate structured diagnosis
  const structured = await generateAIDiagnosis(current, similarFailures, weaknessScores, options);
  const rootCauseType = resolveRootCauseType(structured.primaryWeaknessId || structured.primaryWeaknessName);
  const resources = ROOT_CAUSE_RESOURCES[rootCauseType] || [];

  const rawRecs = structured.learningRecommendations.map((r) => ({
    strategyId: `strategy-${r.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: r.name,
    description: r.description,
    estimatedTime: r.estimatedTime,
    priority: r.priority,
    practiceProblems: r.practiceProblems.map((p) => ({
      problemSlug: p.problemSlug,
      problemTitle: p.title,
      difficulty: p.difficulty,
      topicsTested: [],
    })),
  }));

  const dedupedRecs = deduplicateRecommendations(rawRecs);

  const diagnosisResult: import('@/types').DiagnosisResult = {
    diagnosisId: `diag-${Date.now()}`,
    generatedAt: new Date(),
    rootCause: rootCauseType,
    confidence: structured.confidence,
    resources,
    primaryWeakness: {
      id: structured.primaryWeaknessId,
      name: structured.primaryWeaknessName,
      severity: 'high',
      confidence: structured.confidence / 100,
      frequency: 1,
      lastOccurrence: new Date(),
      riskIndex: (100 - structured.confidence) / 100,
      pageRankScore: weaknessScores[0]?.pageRankScore || 0.25,
    },
    secondaryWeaknesses: weaknessScores.slice(1).map((ws) => ({
      id: ws.id,
      name: ws.name,
      severity: 'medium',
      confidence: ws.pageRankScore,
      frequency: ws.frequency,
      lastOccurrence: new Date(),
      riskIndex: 0.1,
      pageRankScore: ws.pageRankScore,
    })),
    learningRecommendations: dedupedRecs,
    progressMetrics: {
      confidence: structured.confidence,
      reasoningChain: structured.reasoningChain,
    },
  };

  // 3. Store result in cache if cacheKey provided and not bypassed
  if (cacheKey && !isBypass) {
    await setCachedDiagnosis(cacheKey, diagnosisResult);
  }

  return diagnosisResult;
}
