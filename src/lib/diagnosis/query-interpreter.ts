/**
 * src/lib/diagnosis/query-interpreter.ts
 *
 * Dynamic Query Understanding & Interpretation Pipeline.
 * Produces a validated structured internal representation of user intent,
 * multi-task extraction, information routing, explicit constraints, and follow-up context.
 */

import { z } from 'zod';
import { groqClient } from '@/lib/api/groq-client';
import { detectCode } from './code-detector';

export type QueryRoute =
  | 'personal_history'
  | 'general_technical'
  | 'combined'
  | 'submission_code'
  | 'follow_up';

export const interpretedQuerySchema = z.object({
  originalQuery: z.string(),
  mainTopic: z.string(),
  requestedTasks: z.array(z.string()).min(1),
  route: z.enum(['personal_history', 'general_technical', 'combined', 'submission_code', 'follow_up']),
  requiresPersonalHistory: z.boolean(),
  requiresExternalSearch: z.boolean(),
  explicitSubmissionReference: z.boolean(),
  submissionFilter: z
    .object({
      status: z.string().optional(), // 'any_failure' | 'Accepted' | 'Wrong Answer' | etc.
      recency: z.enum(['latest', 'any']).default('latest'),
      problemTitle: z.string().optional(),
    })
    .optional(),
  conceptsAndKeywords: z.array(z.string()).default([]),
  ambiguityOrMissingInfo: z.string().nullable().default(null),
  resolvedContext: z.string().nullable().default(null),
});

export type InterpretedQuery = z.infer<typeof interpretedQuerySchema>;

export interface InterpretationContext {
  conversationHistory?: Array<{ role: string; content?: string }>;
  authenticatedUserId?: string;
}

// Deterministic patterns for resilient heuristic routing & task detection
const EXPLICIT_WRONG_SUBMISSION =
  /\b(last|latest|recent|previous)\b.{0,25}\b(wrong|failed|failing|error|wa|tle)\b.{0,20}\b(submission|attempt|solution)?\b/i;

const EXPLICIT_SUBMISSION =
  /\b(last|latest|recent|previous)\b.{0,25}\b(submission|attempt|code|solution)\b/i;

const PERSONAL_HISTORY_PATTERNS = [
  /\b(?:my\s+(?:recurring\s+)?mistakes|how\s+(?:have\s+)?(?:my\s+results|i)\s+improved|my\s+(?:past\s+)?failures|weakest\s+concepts?|what\s+have\s+i\s+improved|recurring\s+mistakes|track\s+record)\b/i,
  /\b(?:compare\s+my|analyze\s+my|find\s+my\s+(?:most\s+common|recurring))\b/i,
];

const GENERAL_TECHNICAL_PATTERNS = [
  /\b(?:teach\s+me|explain|what\s+is|how\s+does|walk\s+me\s+through)\b.{1,40}\b(?:basics|algorithm|pattern|concept|time\s+complexity|monotonic|binary\s+search|dp|tree|graph)\b/i,
  /\b(?:explain\s+(?:binary\s+search|monotonic\s+stack|dynamic\s+programming|dijkstra|segment\s+tree|two\s+pointers))\b/i,
];

const FOLLOW_UP_PATTERNS = [
  /^(?:why\s+is\s+that|can\s+you\s+show|what\s+about\s+that|how\s+does\s+that\s+compare|why\s+did\s+it\s+fail|and\s+then\?|why\?)/i,
  /\b(?:that\s+approach|the\s+previous\s+problem|the\s+earlier\s+method|that\s+solution)\b/i,
];

export async function interpretUserQuery(
  rawQuery: string,
  context?: InterpretationContext
): Promise<InterpretedQuery> {
  const query = (rawQuery || '').trim();
  const codeCheck = detectCode(query);

  // Check if there is conversation context for follow-up resolution
  const history = context?.conversationHistory || [];
  const lastAssistantTurn = [...history].reverse().find((m) => m.role === 'assistant');
  const lastUserTurn = [...history].reverse().find((m) => m.role === 'user' && m.content !== query);

  let contextualReference: string | null = null;
  if (lastAssistantTurn?.content) {
    contextualReference = lastAssistantTurn.content.slice(0, 300);
  }

  // 1. Try Groq structured interpretation
  try {
    const groqInterpreted = await interpretWithGroq(query, contextualReference, codeCheck.hasCode);
    if (groqInterpreted) {
      return groqInterpreted;
    }
  } catch (err) {
    console.warn('[QueryInterpreter] Groq interpretation failed, falling back to heuristic engine:', err);
  }

  // 2. High-precision deterministic heuristic fallback
  return interpretDeterministically(query, contextualReference, codeCheck);
}

async function interpretWithGroq(
  query: string,
  contextualReference: string | null,
  hasCode: boolean
): Promise<InterpretedQuery | null> {
  const prompt = `You are the Praxis Query Interpretation Engine for competitive programming.
Analyze the user's natural language query and output a strict JSON structured representation.

USER QUERY: "${query}"
PREVIOUS CONVERSATION CONTEXT: ${contextualReference ? `"${contextualReference}"` : 'None'}
CODE DETECTED IN QUERY: ${hasCode ? 'YES' : 'NO'}

REQUIREMENTS:
1. "route": Choose exactly one:
   - "personal_history": User asks specifically about their personal past submissions, mistakes, improvement, or performance.
   - "general_technical": User asks about an algorithm, data structure, concept, complexity, or tutorial WITHOUT requiring their own past data.
   - "combined": User combines learning or algorithm queries WITH their own past mistakes/attempts (e.g., "Teach me binary search using my previous mistakes").
   - "submission_code": User provides code or explicitly references a specific submission ("last wrong submission", "review my code", "optimize this").
   - "follow_up": Query refers to a previous turn's solution, approach, or concept ("Why is that approach better?", "Can you show an example?").
2. "requestedTasks": Array of all tasks requested by the user, such as:
   ["concept_explanation", "debugging", "code_review", "optimization", "complexity_analysis", "historical_analysis", "performance_analysis", "practice_planning", "test_generation"]
3. "requiresPersonalHistory": true ONLY if the question relies on or benefits from the user's own past submissions.
4. "requiresExternalSearch": true if external technical facts, language references, or verified documentation would enhance accuracy.
5. "explicitSubmissionReference": true if the user explicitly references a specific past submission (e.g., "last wrong submission", "latest attempt").
6. "submissionFilter": If explicitSubmissionReference is true:
   { "status": "any_failure" | "Accepted" | "any", "recency": "latest" | "any", "problemTitle": string }
   NOTE: If user specifically asks for "last wrong submission", status MUST be "any_failure"!
7. "mainTopic": Extracted topic (e.g. "Binary Search", "Dynamic Programming", "Monotonic Stack", "Array", etc.).
8. "conceptsAndKeywords": Array of key technical terms.

Output STRICT JSON matching:
{
  "originalQuery": string,
  "mainTopic": string,
  "requestedTasks": string[],
  "route": "personal_history" | "general_technical" | "combined" | "submission_code" | "follow_up",
  "requiresPersonalHistory": boolean,
  "requiresExternalSearch": boolean,
  "explicitSubmissionReference": boolean,
  "submissionFilter": { "status": string, "recency": "latest" | "any", "problemTitle": string },
  "conceptsAndKeywords": string[],
  "ambiguityOrMissingInfo": string | null,
  "resolvedContext": string | null
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
  const validated = interpretedQuerySchema.safeParse(parsed);
  if (validated.success) {
    return validated.data;
  }
  return null;
}

export function interpretDeterministically(
  query: string,
  contextualReference: string | null,
  codeCheck: { hasCode: boolean; language?: string }
): InterpretedQuery {
  const q = query.toLowerCase();

  const isFollowUp = FOLLOW_UP_PATTERNS.some((p) => p.test(query)) && !!contextualReference;
  const isExplicitWrongSubmission = EXPLICIT_WRONG_SUBMISSION.test(query);
  const isExplicitSubmission = EXPLICIT_SUBMISSION.test(query);
  const mentionsPersonalHistory = PERSONAL_HISTORY_PATTERNS.some((p) => p.test(query));
  const mentionsGeneralTechnical = GENERAL_TECHNICAL_PATTERNS.some((p) => p.test(query));

  // Extract topics
  let mainTopic = 'General';
  const topicKeywords: string[] = [];

  const knownTopics: Record<string, string[]> = {
    'Binary Search': ['binary search', 'search space', 'bisect', 'lower_bound', 'upper_bound'],
    'Dynamic Programming': ['dynamic programming', 'dp', 'memoization', 'knapsack', 'subsequence'],
    'Monotonic Stack': ['monotonic stack', 'next greater element', 'sliding window maximum', 'stack'],
    'Two Pointers': ['two pointers', 'sliding window', 'left right pointers'],
    'Graph': ['graph', 'bfs', 'dfs', 'dijkstra', 'shortest path', 'topological'],
    'Tree': ['tree', 'binary tree', 'bst', 'lca', 'traversal'],
    'Array': ['array', 'arrays', 'subarray', 'matrix', 'prefix sum'],
  };

  for (const [topicName, keywords] of Object.entries(knownTopics)) {
    if (keywords.some((kw) => q.includes(kw))) {
      mainTopic = topicName;
      topicKeywords.push(...keywords.filter((kw) => q.includes(kw)));
      break;
    }
  }

  // Detect Tasks
  const requestedTasks: string[] = [];
  if (
    q.includes('teach') ||
    q.includes('explain') ||
    q.includes('what is') ||
    q.includes('basics') ||
    q.includes('approach') ||
    q.includes('how does') ||
    q.includes('how to')
  ) {
    requestedTasks.push('concept_explanation');
  }
  if (
    q.includes('why does my solution fail') ||
    q.includes('edge case') ||
    q.includes('failing') ||
    q.includes('bug') ||
    q.includes('fails') ||
    q.includes('wrong')
  ) {
    requestedTasks.push('debugging');
  }
  if (q.includes('review') || q.includes('mistake') || codeCheck.hasCode) {
    requestedTasks.push('code_review');
  }
  if (q.includes('optimize') || q.includes('reduce') || q.includes('faster') || q.includes('efficient')) {
    requestedTasks.push('optimization');
  }
  if (q.includes('complexity') || q.includes('time complexity') || q.includes('space complexity')) {
    requestedTasks.push('complexity_analysis');
  }
  if (
    q.includes('compare') ||
    q.includes('recurring') ||
    q.includes('history') ||
    q.includes('previous attempt') ||
    q.includes('past attempts') ||
    q.includes('my attempts')
  ) {
    requestedTasks.push('historical_analysis');
  }
  if (q.includes('improved') || q.includes('progress') || q.includes('weakness') || q.includes('work on next')) {
    requestedTasks.push('performance_analysis');
  }
  if (q.includes('recommend') || q.includes('practice') || q.includes('study plan') || q.includes('weakest concept')) {
    requestedTasks.push('practice_planning');
  }
  if (
    q.includes('test case') ||
    q.includes('edge case') ||
    q.includes('test cases') ||
    q.includes('tests') ||
    q.includes('hidden test')
  ) {
    requestedTasks.push('test_generation');
  }

  if (requestedTasks.length === 0) {
    requestedTasks.push('concept_explanation');
  }

  // Decide Route
  let route: QueryRoute = 'general_technical';
  let requiresPersonalHistory = false;
  let requiresExternalSearch = true;

  if (isFollowUp) {
    route = 'follow_up';
    requiresPersonalHistory = false;
  } else if (codeCheck.hasCode || isExplicitWrongSubmission || isExplicitSubmission) {
    route = 'submission_code';
    requiresPersonalHistory = true;
    requiresExternalSearch = requestedTasks.includes('optimization') || requestedTasks.includes('concept_explanation');
  } else if (
    (q.includes('teach') || q.includes('explain')) &&
    (q.includes('my mistake') || q.includes('my previous attempt') || q.includes('my past'))
  ) {
    route = 'combined';
    requiresPersonalHistory = true;
    requiresExternalSearch = true;
  } else if (mentionsPersonalHistory || requestedTasks.includes('historical_analysis') || requestedTasks.includes('performance_analysis')) {
    route = 'personal_history';
    requiresPersonalHistory = true;
    requiresExternalSearch = false;
  } else if (mentionsGeneralTechnical || requestedTasks.includes('concept_explanation')) {
    route = 'general_technical';
    requiresPersonalHistory = false;
    requiresExternalSearch = true;
  }

  let submissionFilter: InterpretedQuery['submissionFilter'] = undefined;
  if (isExplicitWrongSubmission) {
    submissionFilter = {
      status: 'any_failure',
      recency: 'latest',
    };
  } else if (isExplicitSubmission) {
    submissionFilter = {
      status: q.includes('accepted') ? 'Accepted' : undefined,
      recency: 'latest',
    };
  }

  return {
    originalQuery: query,
    mainTopic,
    requestedTasks,
    route,
    requiresPersonalHistory,
    requiresExternalSearch,
    explicitSubmissionReference: isExplicitWrongSubmission || isExplicitSubmission,
    submissionFilter,
    conceptsAndKeywords: topicKeywords.length > 0 ? topicKeywords : [mainTopic],
    ambiguityOrMissingInfo: null,
    resolvedContext: contextualReference,
  };
}
