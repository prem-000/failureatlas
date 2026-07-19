/**
 * Context Builder
 *
 * Deliberately READ-ONLY — computes nothing new. Its only job is assembling
 * already-produced outputs into one shared DiagnosisContext object.
 *
 * Consumed by both:
 * - Recommendation Engine (to select practice problems)
 * - LLM Diagnosis (to build the prompt)
 *
 * If a future need arises to derive something new (a combined score, a ranking),
 * that logic belongs in the Recommendation Engine or a dedicated scoring stage —
 * not here.
 */

import type {
  SubmissionEvent,
  AggregatedEvidence,
  EvidenceType,
  Section,
} from '@/types';
import type { RetrievedFailure } from '@/lib/rag/retrieval';
import type { WeaknessScore } from '@/lib/graph/pagerank';
import type { SectionMastery } from '@/lib/analysis/section-rollup';

// ─── Context Shape ────────────────────────────────────────────────────────────

/**
 * The bounded, relevant subset assembled for downstream consumers.
 * The LLM does NOT receive the raw firehose — this shapes what it sees.
 */
export interface DiagnosisContext {
  /** The current submission being diagnosed */
  submission: SubmissionSummary;

  /** Aggregated evidence from the analysis pipeline */
  evidence: AggregatedEvidence;

  /** Root cause hypothesis from the heuristic scorer */
  rootCause: {
    type: string;
    name: string;
    confidence: number;
  };

  /** User's weakness / concept / section history */
  userHistory: {
    weaknessScores: WeaknessScore[];
    sectionMastery: SectionMastery[];
    weakSections: string[];
  };

  /** Retrieved similar past failures (from RAG / embeddings) */
  similarFailures: RetrievedFailure[];

  /** Concept chain for the dominant evidence type */
  conceptChain: {
    evidenceType: EvidenceType;
    concepts: Array<{ slug: string; name: string }>;
    sections: Array<{ slug: string; name: string }>;
  };
}

/**
 * Bounded submission summary — not the full SubmissionEvent.
 * Strips large fields to keep the context lean for the LLM prompt.
 */
export interface SubmissionSummary {
  problemTitle: string;
  problemSlug: string;
  problemDifficulty: string;
  problemTopics: string[];
  submissionStatus: string;
  language: string;
  /** Truncated to first ~200 lines */
  codeSnippet: string;
  /** Whether the full code was truncated */
  codeTruncated: boolean;
  testCasesPassed?: number;
  totalTestCases?: number;
  failedTestCase?: string;
  attemptNumber: number;
  platform: string;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

const MAX_CODE_LINES = 200;

/**
 * Assemble a DiagnosisContext from already-computed pipeline outputs.
 * This is a pure assembly step — no scoring, classification, or retrieval.
 */
export function buildDiagnosisContext(inputs: {
  submission: SubmissionEvent;
  evidence: AggregatedEvidence;
  rootCause: { type: string; name: string; confidence: number };
  weaknessScores: WeaknessScore[];
  sectionMastery: SectionMastery[];
  similarFailures: RetrievedFailure[];
  conceptChain: {
    evidenceType: EvidenceType;
    concepts: Array<{ slug: string; name: string }>;
    sections: Array<{ slug: string; name: string }>;
  };
}): DiagnosisContext {
  const {
    submission,
    evidence,
    rootCause,
    weaknessScores,
    sectionMastery,
    similarFailures,
    conceptChain,
  } = inputs;

  // Create bounded submission summary
  const codeLines = submission.submissionCode.split('\n');
  const codeTruncated = codeLines.length > MAX_CODE_LINES;
  const codeSnippet = codeTruncated
    ? codeLines.slice(0, MAX_CODE_LINES).join('\n') + '\n// ... (truncated)'
    : submission.submissionCode;

  const submissionSummary: SubmissionSummary = {
    problemTitle: submission.problemTitle,
    problemSlug: submission.problemSlug,
    problemDifficulty: submission.problemDifficulty,
    problemTopics: submission.problemTopics,
    submissionStatus: submission.submissionStatus,
    language: submission.submissionLanguage,
    codeSnippet,
    codeTruncated,
    testCasesPassed: submission.testCasesPassed,
    totalTestCases: submission.totalTestCases,
    failedTestCase: submission.failedTestCase,
    attemptNumber: submission.attemptNumber,
    platform: submission.platform,
  };

  // Identify weak sections
  const weakSections = sectionMastery
    .filter(s => s.isWeak)
    .map(s => s.sectionName);

  return {
    submission: submissionSummary,
    evidence,
    rootCause,
    userHistory: {
      weaknessScores,
      sectionMastery,
      weakSections,
    },
    similarFailures,
    conceptChain,
  };
}

/**
 * Format the DiagnosisContext into a bounded LLM prompt.
 * The LLM explains the diagnosis in natural language but does NOT
 * infer weaknesses or root causes — that's done deterministically upstream.
 */
export function formatContextForLLM(ctx: DiagnosisContext): string {
  const sections: string[] = [];

  // Submission context
  sections.push(`## Current Submission
Problem: ${ctx.submission.problemTitle} (${ctx.submission.problemDifficulty})
Platform: ${ctx.submission.platform}
Topics: ${ctx.submission.problemTopics.join(', ')}
Status: ${ctx.submission.submissionStatus}
Attempt #${ctx.submission.attemptNumber}
${ctx.submission.failedTestCase ? `Failed Test Case: ${ctx.submission.failedTestCase}` : ''}

\`\`\`${ctx.submission.language}
${ctx.submission.codeSnippet}
\`\`\``);

  // Evidence summary
  const evidenceSummary = Object.entries(ctx.evidence.counts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => `- ${type}: ${count} occurrence(s)`)
    .join('\n');

  sections.push(`## Evidence Analysis (${ctx.evidence.total} items)
Dominant evidence: ${ctx.evidence.dominant} (${ctx.evidence.dominantCount}×)
${evidenceSummary}`);

  // Root cause
  sections.push(`## Root Cause (Heuristic)
Type: ${ctx.rootCause.type}
Name: ${ctx.rootCause.name}
Confidence: ${ctx.rootCause.confidence}%`);

  // Concept chain
  sections.push(`## Concept Chain
Evidence → ${ctx.conceptChain.concepts.map(c => c.name).join(', ')} → ${ctx.conceptChain.sections.map(s => s.name).join(', ')}`);

  // User weakness history
  if (ctx.userHistory.weaknessScores.length > 0) {
    const weaknesses = ctx.userHistory.weaknessScores
      .slice(0, 5)
      .map(w => `- ${w.name}: frequency=${w.frequency}`)
      .join('\n');
    sections.push(`## User Weakness History (top 5)
${weaknesses}`);
  }

  // Weak sections
  if (ctx.userHistory.weakSections.length > 0) {
    sections.push(`## Weak Sections
${ctx.userHistory.weakSections.join(', ')}`);
  }

  // Similar past failures
  if (ctx.similarFailures.length > 0) {
    const similar = ctx.similarFailures
      .slice(0, 3)
      .map(sf => `- ${sf.problemTitle} (${sf.submissionStatus}, similarity: ${sf.similarityScore.toFixed(2)})`)
      .join('\n');
    sections.push(`## Similar Past Failures
${similar}`);
  }

  return sections.join('\n\n');
}
