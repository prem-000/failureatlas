/**
 * src/lib/diagnosis/intent-router.ts
 *
 * Query-Aware Intent Router for FailureAtlas v2.
 * Precedence:
 * 1. hasCode -> CODE_REVIEW
 * 2. LAST_SUBMISSION -> SUBMISSION_REVIEW
 * 3. PLAN
 * 4. HISTORY
 * 5. EXPLAIN
 */

import { detectCode, type CodeDetectionResult } from './code-detector';
import { groqClient } from '@/lib/api/groq-client';

export type DiagnosisMode =
  | 'CODE_REVIEW'
  | 'SUBMISSION_REVIEW'
  | 'PLAN'
  | 'EXPLAIN'
  | 'HISTORY';

export interface RouteResolutionResult {
  mode: DiagnosisMode;
  confidence: number; // 0.0 to 1.0
  isDeterministic: boolean;
  codeResult?: CodeDetectionResult;
  targetTopic?: string;
  reasoning: string;
}

const LAST_SUBMISSION_PATTERN =
  /\b(last|latest|previous|recent)\b.{0,30}\b(submission|attempt|wrong|failed|solution|error)\b/i;

const PLAN_PATTERNS = [
  /\b(?:study\s+plan|practice\s+plan|weekly\s+plan|schedule|roadmap)\b/i,
  /\bwhat\s+should\s+i\s+(?:study|practice|solve|work\s+on)\b/i,
  /\bplan\s+(?:for\s+)?(?:this|next|my)\s+week\b/i,
  /\b(?:daily|weekly)\s+(?:routine|goal)\b/i,
];

const HISTORY_PATTERNS = [
  /\b(?:past\s+failures|my\s+history|history\s+of|previous\s+errors|all\s+my\s+failures)\b/i,
  /\bshow\s+(?:me\s+)?(?:my\s+)?past\b/i,
  /\b(?:track\s+record|recurring\s+mistakes|historical\s+trend)\b/i,
];

const EXPLAIN_PATTERNS = [
  /\bexplain\s+(?:my\s+)?(?:errors|mistakes|failures|patterns?|concept)\b/i,
  /\bwhy\s+do\s+i\s+keep\s+(?:failing|making)\b/i,
  /\bwhy\s+did\s+(?:this|my\s+code)\s+fail\b/i,
  /\bbreakdown\s+of\b/i,
  /\bwhat\s+is\s+(?:the\s+)?(?:root\s+cause|weakness)\b/i,
];

export async function routeUserMessage(userMessage: string): Promise<RouteResolutionResult> {
  const query = (userMessage || '').trim();

  // 1. Code Detector check: Code ALWAYS takes highest precedence
  const codeResult = detectCode(query);
  if (codeResult.hasCode) {
    return {
      mode: 'CODE_REVIEW',
      confidence: Math.max(0.85, codeResult.score),
      isDeterministic: true,
      codeResult,
      reasoning: `Code detected (${codeResult.language || 'generic'}, score: ${codeResult.score.toFixed(2)}). Routed to CODE_REVIEW.`,
    };
  }

  // 2. Last / wrong submission query: SUBMISSION_REVIEW
  if (LAST_SUBMISSION_PATTERN.test(query)) {
    return {
      mode: 'SUBMISSION_REVIEW',
      confidence: 0.95,
      isDeterministic: true,
      reasoning: 'Matched LAST_SUBMISSION query. Routed to SUBMISSION_REVIEW.',
    };
  }

  // 3. Deterministic text rules
  for (const pattern of PLAN_PATTERNS) {
    if (pattern.test(query)) {
      return {
        mode: 'PLAN',
        confidence: 0.95,
        isDeterministic: true,
        reasoning: 'Matched PLAN rule.',
      };
    }
  }

  for (const pattern of HISTORY_PATTERNS) {
    if (pattern.test(query)) {
      return {
        mode: 'HISTORY',
        confidence: 0.95,
        isDeterministic: true,
        reasoning: 'Matched HISTORY rule.',
      };
    }
  }

  for (const pattern of EXPLAIN_PATTERNS) {
    if (pattern.test(query)) {
      return {
        mode: 'EXPLAIN',
        confidence: 0.92,
        isDeterministic: true,
        reasoning: 'Matched EXPLAIN rule.',
      };
    }
  }

  // Check simple keywords
  const lower = query.toLowerCase();
  if (lower.includes('plan') || lower.includes('study') || lower.includes('practice this week') || lower.includes('what to solve')) {
    return {
      mode: 'PLAN',
      confidence: 0.88,
      isDeterministic: true,
      reasoning: 'Keyword matched PLAN.',
    };
  }

  if (lower.includes('history') || lower.includes('past') || lower.includes('timeline')) {
    return {
      mode: 'HISTORY',
      confidence: 0.88,
      isDeterministic: true,
      reasoning: 'Keyword matched HISTORY.',
    };
  }

  if (lower.includes('explain') || lower.includes('why') || lower.includes('understand')) {
    return {
      mode: 'EXPLAIN',
      confidence: 0.85,
      isDeterministic: true,
      reasoning: 'Keyword matched EXPLAIN.',
    };
  }

  // 4. Ambiguous Fallback: Lightweight LLM classifier
  try {
    const prompt = `Classify this user request into EXACTLY ONE mode:
- SUBMISSION_REVIEW: User asks about their last/latest/previous submission or attempt.
- PLAN: User asks for a study plan, weekly roadmap, or what to practice.
- EXPLAIN: User asks to explain a concept, root cause, or why an error occurs.
- HISTORY: User asks to view past failures, historical timeline, or recurring errors.

User query: "${query}"

Output ONLY JSON: { "mode": "SUBMISSION_REVIEW" | "PLAN" | "EXPLAIN" | "HISTORY", "confidence": number }`;

    const response = await groqClient.getChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
    });

    let clean = response.content.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    const parsed = JSON.parse(clean.trim());

    if (
      parsed.mode === 'SUBMISSION_REVIEW' ||
      parsed.mode === 'PLAN' ||
      parsed.mode === 'EXPLAIN' ||
      parsed.mode === 'HISTORY'
    ) {
      return {
        mode: parsed.mode,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        isDeterministic: false,
        reasoning: 'Classified via fast LLM intent router.',
      };
    }
  } catch (err) {
    console.warn('[IntentRouter] LLM fallback failed, defaulting to EXPLAIN:', err);
  }

  // Default fallback
  return {
    mode: 'EXPLAIN',
    confidence: 0.65,
    isDeterministic: true,
    reasoning: 'Defaulted to EXPLAIN.',
  };
}
