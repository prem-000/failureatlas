import { z } from 'zod';

export type DiagnosisStageV2 =
  | 'routing'
  | 'reading'
  | 'classify'
  | 'searching'
  | 'graph'
  | 'writing';

export const STAGE_LABELS_V2: Record<DiagnosisStageV2, string> = {
  routing: 'Understanding your question',
  reading: 'Reading your code',
  classify: 'Identifying preliminary root cause',
  searching: 'Searching similar past failures',
  graph: 'Tracing the knowledge graph',
  writing: 'Writing the answer',
};

// Word counter utility
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Word clamping utility (truncates cleanly on word boundary)
export function clampWords(text: string, maxWords: number): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ');
}

// ─── 1. CODE REVIEW SCHEMA & CONTRACT ──────────────────────────────────────────

export const codeReviewTestSchema = z.object({
  input: z.string(),
  expected: z.string(),
  got: z.string(),
  verified: z.boolean(), // Server-owned: required
});

export const codeReviewConceptSchema = z.object({
  name: z.string(),
  points: z
    .array(
      z.string().refine((val) => countWords(val) <= 12, {
        message: 'Concept point must be at most 12 words',
      })
    )
    .max(3, 'At most 3 concept points allowed'),
});

export const codeReviewSchema = z
  .object({
    kind: z.literal('code_review'),
    hasHistory: z.boolean(),
    verdict: z.string(),
    rootCause: z.object({
      id: z.string(),
      name: z.string(),
      confidence: z.number().min(0).max(100),
    }),
    location: z.object({
      line: z.number().int().positive(),
      code: z.string(),
      issue: z.string().refine((val) => countWords(val) <= 15, {
        message: 'Issue description must be at most 15 words',
      }),
    }),
    tests: z.array(codeReviewTestSchema).max(2, 'At most 2 tests allowed'),
    concept: codeReviewConceptSchema.optional(),
    historyIds: z.array(z.string()).default([]),
    headerText: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.hasHistory && data.concept !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'concept must be absent when hasHistory is false',
        path: ['concept'],
      });
    }
  });

export type CodeReviewDiagnosis = z.infer<typeof codeReviewSchema>;

// ─── 2. SUBMISSION REVIEW SCHEMAS (LOOSE LLM + STRICT CLIENT PAYLOAD) ──────────

// Loose text-only schema for raw LLM output (no word limits, no server-owned fields)
export const llmReviewTestSchema = z.object({
  input: z.string(),
  expected: z.string(),
  got: z.string(),
  whyItBreaks: z.string().optional().default(''),
});

export const llmReviewWalkthroughItemSchema = z.object({
  label: z.string(),
  text: z.string(),
});

export const llmReviewSchema = z.object({
  verdict: z.string(),
  location: z
    .object({
      line: z.number().int(),
      code: z.string(),
      issue: z.string(),
    })
    .optional(),
  tests: z.array(llmReviewTestSchema).min(1).max(2),
  walkthrough: z.array(llmReviewWalkthroughItemSchema).max(5).optional().default([]),
  invariant: z
    .object({
      name: z.string(),
      statement: z.string(),
    })
    .optional(),
  checklist: z.array(z.string()).max(3).optional().default([]),
});

export type LlmReview = z.infer<typeof llmReviewSchema>;

// Strict client payload schema (assembled with server-owned fields and word limits)
export const submissionReviewSchema = z.object({
  kind: z.literal('submission_review'),
  problem: z.object({ slug: z.string(), title: z.string() }),
  verdict: z.string().refine((s) => countWords(s) <= 12, {
    message: 'Verdict must be at most 12 words',
  }),
  rootCause: z.object({ id: z.string(), name: z.string(), confidence: z.number() }), // server-owned
  location: z.object({
    line: z.number().int().positive(),
    code: z.string(),
    issue: z.string().refine((s) => countWords(s) <= 15, {
      message: 'Issue must be at most 15 words',
    }),
  }),
  tests: z
    .array(
      z.object({
        input: z.string(),
        expected: z.string(),
        got: z.string(),
        whyItBreaks: z.string().refine((s) => countWords(s) <= 18, {
          message: 'whyItBreaks must be at most 18 words',
        }),
        verified: z.boolean(), // server-owned
      })
    )
    .min(1)
    .max(2),
  walkthrough: z
    .array(
      z.object({
        label: z.string().refine((s) => countWords(s) <= 4, {
          message: 'label must be at most 4 words',
        }),
        text: z.string().refine((s) => countWords(s) <= 20, {
          message: 'text must be at most 20 words',
        }),
      })
    )
    .max(5),
  invariant: z.object({
    name: z.string().refine((s) => countWords(s) <= 4, {
      message: 'name must be at most 4 words',
    }),
    statement: z.string().refine((s) => countWords(s) <= 20, {
      message: 'statement must be at most 20 words',
    }),
  }),
  checklist: z
    .array(
      z.string().refine((s) => countWords(s) <= 12, {
        message: 'checklist item must be at most 12 words',
      })
    )
    .max(3),
  fixAvailable: z.boolean().default(true), // server-owned
  submissionId: z.string().optional(),
});

export type SubmissionReviewDiagnosis = z.infer<typeof submissionReviewSchema>;

// ─── 2B. SUBMISSION ACCEPTED & NO SUBMISSION SCHEMAS ────────────────────────────

export const submissionAcceptedSchema = z.object({
  kind: z.literal('submission_accepted'),
  problem: z.object({ slug: z.string(), title: z.string() }),
  message: z.string(),
  submissionId: z.string().optional(),
  runtime: z.number().nullable().optional(),
  memory: z.number().nullable().optional(),
});

export type SubmissionAcceptedDiagnosis = z.infer<typeof submissionAcceptedSchema>;

export const noSubmissionSchema = z.object({
  kind: z.literal('no_submission'),
  message: z.string(),
});

export type NoSubmissionDiagnosis = z.infer<typeof noSubmissionSchema>;

// ─── 3. PLAN SCHEMA & CONTRACT (Zero PageRank, Topics Required) ───────────────

export const stepRungEnum = z.enum([
  'concept_check',
  'trace',
  'tiny_build',
  'easy_variant',
  'modified_variant',
  'original',
  'transfer',
]);

export type StepRung = z.infer<typeof stepRungEnum>;

export const planStepSchema = z.object({
  id: z.string(),
  day: z.string(),
  topic: z.string(),
  title: z.string(),
  minutes: z.number().int().positive(),
  rung: stepRungEnum,
  completed: z.boolean().default(false),
  resourceIds: z.array(z.string()).default([]),
});

export const planSchema = z.object({
  kind: z.literal('plan'),
  focus: z.object({
    skillId: z.string(),
    name: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    why: z.string(), // e.g. "Behind 6 of your last 14 failures"
  }),
  topics: z
    .array(
      z.object({
        skillId: z.string(),
        name: z.string(),
      })
    )
    .default([]),
  steps: z.array(planStepSchema).min(1),
});

export type PlanDiagnosis = z.infer<typeof planSchema>;

// ─── 4. EXPLAIN SCHEMA & CONTRACT ─────────────────────────────────────────────

export const explainBulletSchema = z.object({
  label: z.string(),
  text: z.string(),
  evidenceIds: z.array(z.string()).default([]),
});

export const explainSchema = z.object({
  kind: z.literal('explain'),
  topic: z.string(),
  bullets: z.array(explainBulletSchema).min(1),
  historySummary: z.string().optional(),
  rootCauseId: z.string().optional(),
  pastFailures: z
    .array(
      z.object({
        id: z.string(),
        problemTitle: z.string(),
        status: z.string(),
        date: z.string(),
        snippet: z.string().optional(),
      })
    )
    .default([]),
});

export type ExplainDiagnosis = z.infer<typeof explainSchema>;

// ─── 5. HISTORY SCHEMA & CONTRACT ─────────────────────────────────────────────

export const historyItemSchema = z.object({
  id: z.string(),
  problemTitle: z.string(),
  problemDifficulty: z.string(),
  status: z.string(),
  timestamp: z.string(),
  similarity: z.number(),
  verdict: z.string().optional(),
  diffSnippet: z.string().optional(),
});

export const historySchema = z.object({
  kind: z.literal('history'),
  summary: z.string(),
  count: z.number().int().nonnegative(),
  historyIds: z.array(z.string()),
  topic: z.string().optional(),
  timeline: z.array(historyItemSchema).default([]),
});

export type HistoryDiagnosis = z.infer<typeof historySchema>;

// ─── UNIFIED DISCRIMINATED UNION ──────────────────────────────────────────────

export const queryAwareDiagnosisSchema = z.discriminatedUnion('kind', [
  codeReviewSchema,
  submissionReviewSchema,
  submissionAcceptedSchema,
  noSubmissionSchema,
  planSchema,
  explainSchema,
  historySchema,
]);

export type QueryAwareDiagnosis = z.infer<typeof queryAwareDiagnosisSchema>;

// ─── SESSION ENTRY ─────────────────────────────────────────────────────────────

export interface DiagnosisEntry {
  id: string; // same as assistant message id
  createdAt: number;
  query: string;
  result?: QueryAwareDiagnosis;
  error?: {
    stage: string;
    message: string;
    requestId?: string;
    retryable?: boolean;
  };
}
