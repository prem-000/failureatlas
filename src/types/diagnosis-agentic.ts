/**
 * src/types/diagnosis-agentic.ts
 *
 * Type definitions and contracts for the Agentic RAG, Corrective RAG (CRAG),
 * Self-Correction Verifier, AI Evidence, RAG Evidence, and Evaluation Pipeline.
 */

import { z } from 'zod';

// ─── 1. Controlled Agentic Workflow Stages ─────────────────────────────────────

export type AgenticStage =
  | 'plan'
  | 'retrieve'
  | 'grade'
  | 'correct'
  | 'generate'
  | 'verify'
  | 'accept';

export const AGENTIC_STAGE_LABELS: Record<AgenticStage, string> = {
  plan: 'Planning targeted retrieval',
  retrieve: 'Retrieving failure evidence & concepts',
  grade: 'Grading evidence relevance and support',
  correct: 'Applying corrective retrieval for gaps',
  generate: 'Synthesizing evidence-grounded diagnosis',
  verify: 'Verifying claims and factual grounding',
  accept: 'Diagnosis accepted and finalized',
};

// ─── 2. Structured Retrieval Plan ──────────────────────────────────────────────

export type RetrievalToolType =
  | 'hybrid_similar_failures'
  | 'knowledge_graph_traversal'
  | 'submission_history'
  | 'learning_concept_catalog'
  | 'code_diff_analysis'
  | 'test_case_runner';

export interface RetrievalPlan {
  query: string;
  targetProblem?: string;
  neededInformation: string[];
  retrievalTools: RetrievalToolType[];
  searchConcepts: string[];
  evidenceGaps: string[];
  acceptanceConditions: string[];
  maxIterations: number;
}

// ─── 3. Evidence Grading (CRAG) Types ──────────────────────────────────────────

export type EvidenceClassification =
  | 'relevant'
  | 'partially_relevant'
  | 'irrelevant'
  | 'contradictory'
  | 'insufficient';

export type EvidenceSourceType =
  | 'direct_code'
  | 'test_outcome'
  | 'graph_inference'
  | 'historical_analogy'
  | 'learning_catalog'
  | 'external_knowledge';

export interface GradedEvidenceItem {
  evidenceId: string;
  source: EvidenceSourceType;
  content: string;
  problemTitle?: string;
  problemSlug?: string;
  problemId?: string;
  codeSnippet?: string;
  diffSnippet?: string;
  observedSignal?: string;
  failureMechanism?: string;
  supportedRootCause?: string;
  relatedWeakness?: string;
  retrievalRelevanceScore: number; // 0.0 - 1.0
  rootCauseSupportScore: number;   // 0.0 - 1.0
  classification: EvidenceClassification;
  isDirect: boolean;
  provenance: {
    sourceType: string;
    sourceId: string;
    retrievalTimestamp: string;
    queryUsed: string;
  };
  rejectionReason?: string;
}

// ─── 4. Score-Driven AI Evidence (Technical Learning Note) ─────────────────────

export type InformationQuality = 'high' | 'medium' | 'low';

export interface AIEvidenceNote {
  topic: string;
  shortExplanation: string;
  whyItMatters: string;
  connectionToCurrentFailure: string;
  keyTakeaway: string;
  relatedTopics: string[];
  relevanceScore: number; // 0.0 - 1.0
  supportingEvidenceIds: string[];
  informationQuality: InformationQuality;
  uncertaintyNote?: string;
}

export const aiEvidenceNoteSchema = z.object({
  topic: z.string().min(1),
  shortExplanation: z.string().min(1),
  whyItMatters: z.string().min(1),
  connectionToCurrentFailure: z.string().min(1),
  keyTakeaway: z.string().min(1),
  relatedTopics: z.array(z.string()).default([]),
  relevanceScore: z.number().min(0).max(1),
  supportingEvidenceIds: z.array(z.string()).default([]),
  informationQuality: z.enum(['high', 'medium', 'low']),
  uncertaintyNote: z.string().optional(),
});

// ─── 5. RAG Evidence (Why Failure Occurred) ────────────────────────────────────

export interface RAGEvidenceItem {
  evidenceId: string;
  relatedProblem: string;
  problemId?: string;
  observedSignal: string;
  codeEvidence?: string;
  failureMechanism: string;
  supportedRootCause: string;
  relatedWeakness: string;
  retrievalRelevanceScore: number; // 0.0 - 1.0
  rootCauseSupportScore: number;   // 0.0 - 1.0
  evidenceType: EvidenceSourceType;
  provenance: {
    sourceType: string;
    sourceId: string;
    retrievalTimestamp: string;
    queryUsed: string;
  };
}

export const ragEvidenceItemSchema = z.object({
  evidenceId: z.string().min(1),
  relatedProblem: z.string().min(1),
  problemId: z.string().optional(),
  observedSignal: z.string().min(1),
  codeEvidence: z.string().optional(),
  failureMechanism: z.string().min(1),
  supportedRootCause: z.string().min(1),
  relatedWeakness: z.string().min(1),
  retrievalRelevanceScore: z.number().min(0).max(1),
  rootCauseSupportScore: z.number().min(0).max(1),
  evidenceType: z.enum([
    'direct_code',
    'test_outcome',
    'graph_inference',
    'historical_analogy',
    'learning_catalog',
    'external_knowledge',
  ]),
  provenance: z.object({
    sourceType: z.string(),
    sourceId: z.string(),
    retrievalTimestamp: z.string(),
    queryUsed: z.string(),
  }),
});

// ─── 6. Self-Correction & Verification ─────────────────────────────────────────

export type VerificationAction =
  | 'accept'
  | 'retrieve_more_evidence'
  | 'regenerate'
  | 'downgrade_confidence';

export interface VerificationResult {
  grounded: boolean;
  score: number; // 0 - 100
  unsupportedClaims: string[];
  missingEvidence: string[];
  contradictions: string[];
  recommendedAction: VerificationAction;
  details: string;
}

export const verificationResultSchema = z.object({
  grounded: z.boolean(),
  score: z.number().min(0).max(100),
  unsupportedClaims: z.array(z.string()).default([]),
  missingEvidence: z.array(z.string()).default([]),
  contradictions: z.array(z.string()).default([]),
  recommendedAction: z.enum([
    'accept',
    'retrieve_more_evidence',
    'regenerate',
    'downgrade_confidence',
  ]),
  details: z.string(),
});

// ─── 7. Metadata Definitions ───────────────────────────────────────────────────

export interface AgenticRetrievalMetadata {
  plan: RetrievalPlan;
  iterations: number;
  maxIterations: number;
  totalRetrieved: number;
  acceptedCount: number;
  rejectedCount: number;
  correctionTriggered: boolean;
  reformulatedQueries: string[];
  finalEvidenceQuality: InformationQuality;
  earlyStopped: boolean;
  reasoningSummary: string;
}

// ─── 8. Evaluation Framework Contracts ─────────────────────────────────────────

export interface RetrievalEvaluationMetrics {
  precisionAtK: number;
  recallAtK: number;
  mrr: number;
  ndcgAtK: number;
  evidenceRejectionQuality: {
    distractorRejectionRate: number;
    falsePositiveRate: number;
  };
  correctiveRetrievalGain: {
    initialPrecision: number;
    correctedPrecision: number;
    precisionDelta: number;
    newRelevantItemsFound: number;
  };
}

export interface DiagnosisEvaluationMetrics {
  rootCauseAccuracy: number;
  claimLevelSupportRate: number;
  unsupportedClaimRate: number;
  contradictionDetectionRate: number;
  evidenceProvenanceValidity: number;
  confidenceCalibrationError: number; // Expected Calibration Error (0-1)
}

export interface AIEvidenceEvaluationMetrics {
  topicRelevanceScore: number;
  technicalCorrectnessScore: number;
  failureConnectionScore: number;
  takeawayClarityScore: number;
  relatedTopicRelevanceScore: number;
  zeroFabricatedSourcesRate: number;
  appropriateUncertaintyRate: number;
}

export interface AgenticWorkflowEvaluationMetrics {
  correctiveRetrievalTriggerRate: number;
  queryReformulationSuccessRate: number;
  evidenceQualityImprovementDelta: number;
  unsupportedClaimResolutionRate: number;
  earlyStopComplianceRate: number;
  maxIterationLimitEnforced: boolean;
  insufficientEvidenceSafetyRate: number;
  avgLatencyMs: number;
  avgRetrievalCount: number;
  estimatedCostCents: number;
}

export interface ComprehensiveEvaluationReport {
  timestamp: string;
  sampleCount: number;
  retrieval: RetrievalEvaluationMetrics;
  diagnosis: DiagnosisEvaluationMetrics;
  aiEvidence: AIEvidenceEvaluationMetrics;
  workflow: AgenticWorkflowEvaluationMetrics;
  overallScore: number; // 0 - 100
  baselineComparison?: {
    baselineOverallScore: number;
    improvementDelta: number;
    keyGains: string[];
  };
}
