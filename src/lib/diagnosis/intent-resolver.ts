/**
 * src/lib/diagnosis/intent-resolver.ts
 *
 * Lightweight intent-resolution layer for FailureAtlas Diagnosis.
 * Maps raw user questions into structured intents using fast deterministic
 * pattern/entity matching with an optional Groq LLM fallback for ambiguous cases.
 */

import { groqClient } from '@/lib/api/groq-client';

export type DiagnosisIntent =
  | 'CURRENT_FAILURE'
  | 'HISTORICAL_FAILURES'
  | 'WEEKLY_PRACTICE'
  | 'PROBLEM_LOOKUP'
  | 'PROBLEM_EXPLANATION'
  | 'PATTERN_EXPLANATION'
  | 'RESOURCE_REQUEST'
  | 'COMPARISON'
  | 'GENERAL_DSA_QUESTION';

export interface IntentResolutionResult {
  intent: DiagnosisIntent;
  confidence: number; // 0.0 to 1.0
  isDeterministic: boolean;
  reasoning: string;
  matchedKeywords: string[];
}

interface PatternRule {
  intent: DiagnosisIntent;
  patterns: RegExp[];
  keywords: string[];
  baseConfidence: number;
}

const PATTERN_RULES: PatternRule[] = [
  // 1. WEEKLY_PRACTICE
  {
    intent: 'WEEKLY_PRACTICE',
    patterns: [
      /\b(this\s+week|weekly|next\s+week|schedule|study\s+plan|practice\s+plan|what\s+should\s+i\s+practice|practice\s+routine|daily\s+goal|weekly\s+goal)\b/i,
      /\b(plan\s+(for\s+)?(my\s+)?week|roadmap\s+for\s+this\s+week|what\s+to\s+solve\s+next)\b/i,
    ],
    keywords: ['week', 'weekly', 'schedule', 'practice plan', 'study plan', 'what should i practice'],
    baseConfidence: 0.95,
  },

  // 2. RESOURCE_REQUEST
  {
    intent: 'RESOURCE_REQUEST',
    patterns: [
      /\b(resource|resources|material|materials|tutorial|tutorials|article|articles|cheatsheet|cheat\s+sheet|docs|documentation|where\s+can\s+i\s+(learn|read|study)|recommend\s+(a\s+)?(book|video|course))\b/i,
    ],
    keywords: ['resource', 'resources', 'tutorial', 'article', 'cheatsheet', 'learn', 'read'],
    baseConfidence: 0.92,
  },

  // 3. COMPARISON
  {
    intent: 'COMPARISON',
    patterns: [
      /\b(compare|comparison|versus|vs\.?|difference\s+between|which\s+is\s+better|tradeoff|trade-off)\b/i,
      /\b(attempt\s+\d+\s+(vs|versus|and)\s+attempt\s+\d+)\b/i,
    ],
    keywords: ['compare', 'comparison', 'vs', 'versus', 'difference between', 'better'],
    baseConfidence: 0.90,
  },

  // 4. HISTORICAL_FAILURES
  {
    intent: 'HISTORICAL_FAILURES',
    patterns: [
      /\b(historical|history|recurring|over\s+time|trend|trends|past\s+failures|all\s+(my\s+)?failures|pattern\s+of\s+mistakes|why\s+do\s+i\s+keep\s+failing|overall\s+weakness|common\s+mistakes)\b/i,
      /\b(track\s+record|summary\s+of\s+my\s+failures|most\s+frequent\s+error)\b/i,
    ],
    keywords: ['history', 'historical', 'recurring', 'past failures', 'keep failing', 'trend', 'trends'],
    baseConfidence: 0.92,
  },

  // 5. PROBLEM_EXPLANATION
  {
    intent: 'PROBLEM_EXPLANATION',
    patterns: [
      /\b(why\s+did\s+i\s+fail|why\s+did\s+my\s+code\s+fail|explain\s+my\s+submission|explain\s+my\s+solution|what\s+went\s+wrong\s+(in|with)|why\s+was\s+it\s+(wrong\s+answer|tle|mle|wa)|how\s+to\s+fix\s+my)\b/i,
      /\b(bug\s+in\s+my|debug\s+my\s+solution\s+for|breakdown\s+of\s+my\s+code)\b/i,
    ],
    keywords: ['why did i fail', 'explain my submission', 'what went wrong', 'how to fix', 'wrong answer', 'debug'],
    baseConfidence: 0.90,
  },

  // 6. PROBLEM_LOOKUP
  {
    intent: 'PROBLEM_LOOKUP',
    patterns: [
      /\b(find\s+problem|look\s*up|status\s+of|did\s+i\s+solve|have\s+i\s+solved|check\s+problem|my\s+attempts\s+(on|for))\b/i,
      /\b(show\s+me\s+problem|details\s+for\s+problem)\b/i,
    ],
    keywords: ['find', 'lookup', 'status of', 'did i solve', 'have i solved', 'attempts on'],
    baseConfidence: 0.88,
  },

  // 7. PATTERN_EXPLANATION
  {
    intent: 'PATTERN_EXPLANATION',
    patterns: [
      /\b(what\s+is|explain|how\s+does)\s+(the\s+)?(pattern|technique|weakness|algorithm|boundary\s+condition|sliding\s+window|two\s+pointer|dynamic\s+programming|binary\s+search|monotonic\s+stack|graph\s+traversal|backtracking|greedy|trie|union\s+find)\b/i,
      /\b(explain\s+concept|teach\s+me\s+about|deep\s+dive\s+into)\b/i,
    ],
    keywords: ['what is', 'explain pattern', 'how does', 'concept', 'technique'],
    baseConfidence: 0.88,
  },

  // 8. CURRENT_FAILURE
  {
    intent: 'CURRENT_FAILURE',
    patterns: [
      /\b(my\s+latest\s+failure|last\s+submission|current\s+error|recent\s+failure|why\s+did\s+i\s+just\s+fail|diagnose\s+my\s+latest|what\s+happened\s+just\s+now)\b/i,
      /\b(latest\s+code|most\s+recent\s+attempt|diagnose\s+me)\b/i,
    ],
    keywords: ['latest failure', 'last submission', 'recent failure', 'current error', 'diagnose me'],
    baseConfidence: 0.90,
  },

  // 9. GENERAL_DSA_QUESTION
  {
    intent: 'GENERAL_DSA_QUESTION',
    patterns: [
      /\b(hello|hi|hey|greetings|help|who\s+are\s+you|what\s+can\s+you\s+do|how\s+does\s+failureatlas\s+work)\b/i,
      /\b(tips\s+for\s+interviews|general\s+advice|how\s+to\s+improve\s+dsa)\b/i,
    ],
    keywords: ['hello', 'hi', 'help', 'who are you', 'advice'],
    baseConfidence: 0.85,
  },
];

/**
 * Deterministically match intent from user query.
 */
export function matchDeterministicIntent(query: string): IntentResolutionResult | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      intent: 'CURRENT_FAILURE',
      confidence: 0.5,
      isDeterministic: true,
      reasoning: 'Empty query defaults to CURRENT_FAILURE.',
      matchedKeywords: [],
    };
  }

  let bestMatch: IntentResolutionResult | null = null;

  for (const rule of PATTERN_RULES) {
    const matchedKws: string[] = [];
    let patternMatched = false;

    for (const pat of rule.patterns) {
      if (pat.test(trimmed)) {
        patternMatched = true;
        break;
      }
    }

    for (const kw of rule.keywords) {
      if (trimmed.toLowerCase().includes(kw)) {
        matchedKws.push(kw);
      }
    }

    if (patternMatched || matchedKws.length > 0) {
      const matchScore = patternMatched ? rule.baseConfidence : 0.70 + Math.min(0.2, matchedKws.length * 0.05);
      if (!bestMatch || matchScore > bestMatch.confidence) {
        bestMatch = {
          intent: rule.intent,
          confidence: matchScore,
          isDeterministic: true,
          reasoning: `Matched pattern for ${rule.intent} with keywords: ${matchedKws.join(', ') || 'regex pattern'}`,
          matchedKeywords: matchedKws,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Resolve user intent: deterministic first, Groq fallback if ambiguous.
 */
export async function resolveUserIntent(query: string): Promise<IntentResolutionResult> {
  const deterministic = matchDeterministicIntent(query);

  // If deterministic score is high enough (>= 0.80), return immediately
  if (deterministic && deterministic.confidence >= 0.80) {
    return deterministic;
  }

  // If query is short or empty, rely on deterministic
  if (!query || query.trim().length < 10) {
    return deterministic || {
      intent: 'CURRENT_FAILURE',
      confidence: 0.6,
      isDeterministic: true,
      reasoning: 'Short query defaulted to CURRENT_FAILURE.',
      matchedKeywords: [],
    };
  }

  // LLM Fallback for ambiguous or multi-faceted queries
  try {
    const prompt = `Classify the user's intent into EXACTLY ONE of these categories:
- CURRENT_FAILURE: User asks about their most recent or active coding failure.
- HISTORICAL_FAILURES: User asks about recurring failure trends, long-term traps, or overall weakness history.
- WEEKLY_PRACTICE: User asks for a weekly schedule, study plan, or practice recommendations.
- PROBLEM_LOOKUP: User asks to find, check status, or list attempts for a specific problem.
- PROBLEM_EXPLANATION: User asks to explain or diagnose a specific problem solution or error.
- PATTERN_EXPLANATION: User asks conceptual questions about an algorithm, data structure, or failure pattern.
- RESOURCE_REQUEST: User asks for tutorials, articles, guides, or external resources.
- COMPARISON: User asks to compare two solutions, algorithms, or attempts.
- GENERAL_DSA_QUESTION: General greetings, meta-questions, or general interview prep questions.

User Query: "${query}"

Respond with ONLY valid JSON:
{
  "intent": "CURRENT_FAILURE" | "HISTORICAL_FAILURES" | "WEEKLY_PRACTICE" | "PROBLEM_LOOKUP" | "PROBLEM_EXPLANATION" | "PATTERN_EXPLANATION" | "RESOURCE_REQUEST" | "COMPARISON" | "GENERAL_DSA_QUESTION",
  "confidence": number (between 0 and 1),
  "reasoning": "brief explanation"
}`;

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
    clean = clean.trim();

    const parsed = JSON.parse(clean);
    const validIntents: DiagnosisIntent[] = [
      'CURRENT_FAILURE',
      'HISTORICAL_FAILURES',
      'WEEKLY_PRACTICE',
      'PROBLEM_LOOKUP',
      'PROBLEM_EXPLANATION',
      'PATTERN_EXPLANATION',
      'RESOURCE_REQUEST',
      'COMPARISON',
      'GENERAL_DSA_QUESTION',
    ];

    if (validIntents.includes(parsed.intent)) {
      return {
        intent: parsed.intent,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
        isDeterministic: false,
        reasoning: parsed.reasoning || 'Classified via LLM intent parser.',
        matchedKeywords: deterministic?.matchedKeywords || [],
      };
    }
  } catch (err) {
    console.warn('[IntentResolver] LLM fallback classification failed, using deterministic result:', err);
  }

  // Fallback to deterministic or default
  return (
    deterministic || {
      intent: 'CURRENT_FAILURE',
      confidence: 0.65,
      isDeterministic: true,
      reasoning: 'Fallback default to CURRENT_FAILURE.',
      matchedKeywords: [],
    }
  );
}
