/**
 * src/lib/diagnosis/evidence-evaluator.ts
 *
 * Groq-based Internal Evidence Evaluation Pipeline.
 * Evaluates candidate historical evidence for relevance and sufficiency.
 * Pairs LLM judgment with deterministic threshold checks and calibration.
 */

import { z } from 'zod';
import { groqClient } from '@/lib/api/groq-client';
import type { HistoricalEvidenceItem } from '@/types/diagnosis-v2';
import type { InterpretedQuery } from './query-interpreter';

export const evidenceEvaluationSchema = z.object({
  isRelevant: z.boolean(),
  isSufficient: z.boolean(),
  confidence: z.number().min(0).max(100),
  missingInformation: z.array(z.string()).default([]),
  relevantEvidenceIds: z.array(z.string()).default([]),
  reason: z.string(),
  needsWebSearch: z.boolean(),
});

export type EvidenceEvaluation = z.infer<typeof evidenceEvaluationSchema>;

export async function evaluateEvidenceWithGroq(
  query: InterpretedQuery,
  candidates: HistoricalEvidenceItem[]
): Promise<EvidenceEvaluation> {
  // If the query is general technical and doesn't require personal history
  if (query.route === 'general_technical' && !query.requiresPersonalHistory) {
    return {
      isRelevant: false,
      isSufficient: false,
      confidence: 85,
      missingInformation: ['Technical concepts and algorithm reference required from knowledge base or web search'],
      relevantEvidenceIds: [],
      reason: 'User asked a general technical concept question which does not depend on personal history.',
      needsWebSearch: true,
    };
  }

  // If personal history was requested but 0 candidates were found
  if (candidates.length === 0) {
    return {
      isRelevant: false,
      isSufficient: false,
      confidence: 90,
      missingInformation: ['No matching personal submission history found for this topic/constraint'],
      relevantEvidenceIds: [],
      reason: 'No candidate historical submissions matched the query constraints.',
      // NEVER search web to manufacture personal history!
      needsWebSearch: query.route === 'combined' || query.requestedTasks.includes('concept_explanation'),
    };
  }

  // 1. Try Groq structured evaluation
  try {
    const groqEval = await callGroqEvidenceEvaluation(query, candidates);
    if (groqEval) {
      // Deterministic calibration: clamp and sanity check
      return calibrateEvaluation(query, candidates, groqEval);
    }
  } catch (err) {
    console.warn('[EvidenceEvaluator] Groq evaluation failed, using calibrated deterministic rules:', err);
  }

  // 2. Deterministic evaluation fallback
  return evaluateDeterministically(query, candidates);
}

async function callGroqEvidenceEvaluation(
  query: InterpretedQuery,
  candidates: HistoricalEvidenceItem[]
): Promise<EvidenceEvaluation | null> {
  const prompt = `You are the Praxis Evidence Evaluation Engine.
Evaluate whether the retrieved personal historical records are relevant and sufficient to answer the user's query.

ORIGINAL QUERY: "${query.originalQuery}"
INTERPRETED TASKS: ${JSON.stringify(query.requestedTasks)}
MAIN TOPIC: "${query.mainTopic}"
ROUTE: "${query.route}"

RETRIEVED HISTORICAL CANDIDATES:
${JSON.stringify(
  candidates.map((c) => ({
    id: c.id,
    problemTitle: c.problemTitle,
    topic: c.topic,
    status: c.status,
    rootCause: c.rootCauseOrPattern,
    relevanceScore: c.relevanceScore,
    selectionReason: c.selectionReason,
  })),
  null,
  2
)}

RULES:
1. "isRelevant": true if at least one candidate directly relates to the user's topic or requested comparison.
2. "isSufficient": true ONLY if the retrieved items provide enough evidence to fulfill all historical tasks.
3. "confidence": Number between 0 and 100.
4. "relevantEvidenceIds": IDs of candidate items that are genuinely useful.
5. "missingInformation": Specific gaps that cannot be answered from these records.
6. "needsWebSearch": Set to true if technical concepts, algorithm details, or official documentation are needed and cannot be established from personal history alone. NEVER use web search to manufacture personal history!

Output strictly valid JSON matching:
{
  "isRelevant": boolean,
  "isSufficient": boolean,
  "confidence": number,
  "missingInformation": string[],
  "relevantEvidenceIds": string[],
  "reason": string,
  "needsWebSearch": boolean
}`;

  const response = await groqClient.getChatCompletion({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    model: 'llama-3.1-8b-instant',
    response_format: { type: 'json_object' },
  });

  let clean = response.content.trim();
  if (clean.startsWith('```json')) clean = clean.slice(7);
  if (clean.startsWith('```')) clean = clean.slice(3);
  if (clean.endsWith('```')) clean = clean.slice(0, -3);

  const parsed = JSON.parse(clean.trim());
  const validated = evidenceEvaluationSchema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

function calibrateEvaluation(
  query: InterpretedQuery,
  candidates: HistoricalEvidenceItem[],
  groqEval: EvidenceEvaluation
): EvidenceEvaluation {
  // Deterministic checks:
  // If candidates have high relevance scores (>= 75), ensure at least those IDs are marked relevant
  const highScoringIds = candidates.filter((c) => c.relevanceScore >= 70).map((c) => c.id);
  const relevantIds = Array.from(new Set([...groqEval.relevantEvidenceIds, ...highScoringIds]));

  // Strict constraint: Never search web to manufacture personal history
  let needsWebSearch = groqEval.needsWebSearch;
  if (query.route === 'personal_history') {
    needsWebSearch = false; // Personal history can only come from user data
  } else if (query.route === 'general_technical' || query.route === 'combined') {
    // If the query asks for technical explanation, web search can supplement
    if (query.requiresExternalSearch || !groqEval.isSufficient) {
      needsWebSearch = true;
    }
  }

  // Calibrate confidence (avoid uncalibrated 100% or 0%)
  const calibratedConfidence = Math.min(96, Math.max(35, groqEval.confidence));

  return {
    ...groqEval,
    relevantEvidenceIds: relevantIds,
    confidence: calibratedConfidence,
    needsWebSearch,
  };
}

export function evaluateDeterministically(
  query: InterpretedQuery,
  candidates: HistoricalEvidenceItem[]
): EvidenceEvaluation {
  const highScoring = candidates.filter((c) => c.relevanceScore >= 60);
  const isRelevant = highScoring.length > 0;
  const isSufficient =
    query.route === 'submission_code'
      ? candidates.length >= 1
      : query.route === 'personal_history'
      ? candidates.length >= 2
      : highScoring.length >= 1;

  const missingInfo: string[] = [];
  if (!isSufficient && query.route === 'personal_history') {
    missingInfo.push('Insufficient historical comparisons across multiple problems');
  }

  let needsWebSearch = false;
  if (query.route === 'general_technical' || query.route === 'combined' || query.requestedTasks.includes('concept_explanation')) {
    needsWebSearch = true;
  }

  return {
    isRelevant,
    isSufficient,
    confidence: isRelevant ? 82 : 45,
    missingInformation: missingInfo,
    relevantEvidenceIds: highScoring.map((c) => c.id),
    reason: isRelevant
      ? `Found ${highScoring.length} historical attempt(s) matching topic "${query.mainTopic}".`
      : `Historical attempts did not meet minimum relevance threshold for topic "${query.mainTopic}".`,
    needsWebSearch,
  };
}
