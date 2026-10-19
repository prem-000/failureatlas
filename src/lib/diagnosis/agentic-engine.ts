/**
 * src/lib/diagnosis/agentic-engine.ts
 *
 * Upgraded Praxis Agentic Diagnosis Engine
 * Implements the 7-stage state machine:
 * PLAN → RETRIEVE → GRADE → CORRECT IF NEEDED → GENERATE → VERIFY → ACCEPT
 *
 * Grounded in:
 * - Agentic RAG for intelligent retrieval planning
 * - Corrective RAG (CRAG) for grading and correcting weak retrieval
 * - Self-correction verifier for factual grounding and confidence calibration
 * - Score-driven AI Evidence for actionable technical learning notes (no-link-first)
 * - Distinct RAG Evidence for failure mechanism explanation
 */

import { prisma } from '@/lib/db/prisma';
import { groqClient } from '@/lib/api/groq-client';
import { retrieveSimilarFailures, clampScore } from '@/lib/rag/retrieval';
import { computeWeaknessPageRank, type WeaknessScore } from '@/lib/graph/pagerank';
import { mapRootCauseToWeakness, WEAKNESS_MAP } from '@/lib/graph/weakness-taxonomy';
import { classifyPreliminaryRootCause } from './preliminary-classifier';
import { TOPIC_REGISTRY } from '@/lib/learning-sheet/topic-registry';
import { ROOT_CAUSE_RESOURCES } from '@/lib/resources/catalog';
import { myersDiff } from '@/lib/analysis/myers-diff';
import type { SubmissionEvent, DiagnosisStage } from '@/types';
import type {
  RetrievalPlan,
  GradedEvidenceItem,
  EvidenceClassification,
  EvidenceSourceType,
  AIEvidenceNote,
  RAGEvidenceItem,
  VerificationResult,
  VerificationAction,
  AgenticRetrievalMetadata,
  InformationQuality,
} from '@/types/diagnosis-agentic';

// ─── Configurable Thresholds ───────────────────────────────────────────────────

export interface AgenticEngineConfig {
  maxIterations: number;
  relevanceThresholdHigh: number;
  relevanceThresholdMedium: number;
  relevanceThresholdLow: number;
  supportThreshold: number;
  analogyConfidenceCap: number;
  directEvidenceBonus: number;
}

export const DEFAULT_AGENTIC_CONFIG: AgenticEngineConfig = {
  maxIterations: 3,
  relevanceThresholdHigh: 0.75,
  relevanceThresholdMedium: 0.50,
  relevanceThresholdLow: 0.30,
  supportThreshold: 0.60,
  analogyConfidenceCap: 70, // Diagnoses relying primarily on analogy capped at 70%
  directEvidenceBonus: 1.25,
};

// ─── Input & Output Interfaces ─────────────────────────────────────────────────

export interface AgenticEngineInput {
  userId: string;
  userQuery?: string;
  submission: SubmissionEvent | null;
  historicalFailuresCount?: number;
  config?: Partial<AgenticEngineConfig>;
  onStage?: (stage: DiagnosisStage) => Promise<void> | void;
}

export interface AgenticEngineOutput {
  primaryWeaknessId: string;
  primaryWeaknessName: string;
  confidence: number;
  verdict: string;
  reasoningSummary: string;
  aiEvidence: AIEvidenceNote[];
  ragEvidence: RAGEvidenceItem[];
  retrievalMetadata: AgenticRetrievalMetadata;
  verificationMetadata: VerificationResult;
  uncertaintyState: boolean;
  statusMessage: string;
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function generateEvidenceId(prefix: string): string {
  return `ev_${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── STAGE 1: PLAN ────────────────────────────────────────────────────────────

export function planRetrieval(
  query: string,
  submission: SubmissionEvent | null,
  preliminaryCause: { id: string; name: string; confidence: number },
  weaknessScores: WeaknessScore[],
  maxIterations: number = DEFAULT_AGENTIC_CONFIG.maxIterations
): RetrievalPlan {
  const neededInformation: string[] = [];
  const retrievalTools: RetrievalPlan['retrievalTools'] = [];
  const searchConcepts: string[] = [];
  const evidenceGaps: string[] = [];
  const acceptanceConditions: string[] = [];

  const rawQuery = (query || '').toLowerCase();
  const code = submission?.submissionCode || '';
  const status = submission?.submissionStatus || 'Wrong Answer';
  const problemTitle = submission?.problemTitle || 'Algorithmic Problem';

  // 1. Determine what information is needed
  neededInformation.push(`Specific failure mechanism for ${status} on ${problemTitle}`);
  neededInformation.push(`Core algorithmic invariant for ${preliminaryCause.name}`);

  if (code.includes('while') || code.includes('for') || code.includes('left') || code.includes('right')) {
    neededInformation.push('Loop boundary condition and termination check');
  }
  if (status === 'Time Limit Exceeded') {
    neededInformation.push('Time complexity bottleneck and recursion tree analysis');
  }

  // 2. Map required retrieval tools
  retrievalTools.push('code_diff_analysis');
  retrievalTools.push('learning_concept_catalog');

  if (submission) {
    retrievalTools.push('hybrid_similar_failures');
    retrievalTools.push('submission_history');
  }
  if (weaknessScores.length > 0) {
    retrievalTools.push('knowledge_graph_traversal');
  }

  // 3. Search concepts
  searchConcepts.push(preliminaryCause.name);
  if (submission?.problemTopics && submission.problemTopics.length > 0) {
    searchConcepts.push(...submission.problemTopics);
  } else {
    searchConcepts.push('Binary Search', 'Two Pointers', 'Edge Cases');
  }

  // 4. Evidence gaps to resolve
  if (!submission?.failedTestCase) {
    evidenceGaps.push('No captured failed test case input; must isolate line of failure from syntax or code diff');
  }
  if (!submission) {
    evidenceGaps.push('No submission entity provided; must rely on conceptual analysis of user query');
  }

  // 5. Conditions required to accept diagnosis
  acceptanceConditions.push('At least one graded relevant evidence item must support the primary claim');
  acceptanceConditions.push('No direct contradictions between code behavior and proposed root cause');
  acceptanceConditions.push('Confidence must be calibrated based on direct vs analogous evidence');

  return {
    query,
    targetProblem: submission?.problemTitle,
    neededInformation,
    retrievalTools,
    searchConcepts: Array.from(new Set(searchConcepts)),
    evidenceGaps,
    acceptanceConditions,
    maxIterations,
  };
}

// ─── STAGE 2: RETRIEVE ────────────────────────────────────────────────────────

export async function executeRetrieval(
  plan: RetrievalPlan,
  userId: string,
  submission: SubmissionEvent | null,
  preliminaryCause: { id: string; name: string; confidence: number },
  weaknessScores: WeaknessScore[],
  iteration: number = 1
): Promise<GradedEvidenceItem[]> {
  const items: GradedEvidenceItem[] = [];
  const now = new Date().toISOString();

  // Tool 1: Code and Diff Analysis (Direct Code Evidence)
  if (submission && submission.submissionCode) {
    const lines = submission.submissionCode.split('\n');
    let suspiciousLineNumber = 1;
    let suspiciousLineContent = lines[0] || '';
    let observedSignal = 'Program execution produced incorrect result';
    let mechanism = 'Algorithmic flow reached incorrect state';

    // Scan for direct code signals
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/while\s+.*[<>=]/.test(line)) {
        suspiciousLineNumber = i + 1;
        suspiciousLineContent = line.trim();
        observedSignal = `Loop condition '${line.trim()}' controls search space bounds`;
        mechanism = 'Boundary condition may exit prematurely or loop indefinitely';
        break;
      } else if (/if\s+.*[<>=]/.test(line)) {
        suspiciousLineNumber = i + 1;
        suspiciousLineContent = line.trim();
        observedSignal = `Conditional branch '${line.trim()}' handles edge cases`;
        mechanism = 'Condition does not cover all input boundary states';
      }
    }

    if (submission.failedTestCase) {
      observedSignal += ` · Failed on test: ${submission.failedTestCase.slice(0, 80)}`;
    }

    items.push({
      evidenceId: generateEvidenceId('code'),
      source: 'direct_code',
      content: `Observed at line ${suspiciousLineNumber}: "${suspiciousLineContent}". ${observedSignal}`,
      problemTitle: submission.problemTitle,
      problemSlug: submission.problemSlug,
      codeSnippet: suspiciousLineContent,
      observedSignal,
      failureMechanism: mechanism,
      supportedRootCause: preliminaryCause.name,
      relatedWeakness: mapRootCauseToWeakness(preliminaryCause.id)?.name || 'Edge Case Reasoning',
      retrievalRelevanceScore: 0.95,
      rootCauseSupportScore: 0.90,
      classification: 'relevant',
      isDirect: true,
      provenance: {
        sourceType: 'SubmissionCode',
        sourceId: submission.eventId,
        retrievalTimestamp: now,
        queryUsed: plan.query || 'current_code_scan',
      },
    });

    // Code evolution check if user resubmitted
    let priorSub: any = null;
    try {
      priorSub = await prisma.submissionEvent.findFirst({
        where: {
          userId,
          problem: { slug: submission.problemSlug },
          NOT: { eventId: submission.eventId },
        },
        orderBy: { timestamp: 'desc' },
      }).catch(() => null);
    } catch {
      priorSub = null;
    }

    if (priorSub && priorSub.code) {
      const diff = myersDiff(priorSub.code, submission.submissionCode);
      const changes = diff.filter((d: { type: string }) => d.type !== 'EQUAL');
      if (changes.length > 0) {
        const diffSummary = `${changes.length} line edits between attempts. Changed: ${changes.slice(0, 2).map((c: { content: string }) => c.content.trim()).join('; ')}`;
        items.push({
          evidenceId: generateEvidenceId('diff'),
          source: 'direct_code',
          content: `Code evolution analysis: ${diffSummary}`,
          problemTitle: submission.problemTitle,
          problemSlug: submission.problemSlug,
          diffSnippet: diffSummary,
          observedSignal: diffSummary,
          failureMechanism: 'Resubmission modified core logic without correcting invariant',
          supportedRootCause: preliminaryCause.name,
          relatedWeakness: 'Implementation Precision',
          retrievalRelevanceScore: 0.88,
          rootCauseSupportScore: 0.82,
          classification: 'relevant',
          isDirect: true,
          provenance: {
            sourceType: 'MyersDiff',
            sourceId: `${priorSub.eventId}->${submission.eventId}`,
            retrievalTimestamp: now,
            queryUsed: 'code_evolution_diff',
          },
        });
      }
    }
  }

  // Tool 2: Similar Failure Patterns via Hybrid RAG
  if (submission && plan.retrievalTools.includes('hybrid_similar_failures')) {
    try {
      const similarFailures = await retrieveSimilarFailures(
        userId,
        submission.eventId,
        submission.problemTitle,
        submission.problemDifficulty,
        submission.problemTopics || [],
        submission.submissionStatus,
        submission.submissionCode,
        submission.failedTestCase,
        3
      );

      for (const sf of similarFailures) {
        items.push({
          evidenceId: generateEvidenceId('rag'),
          source: 'historical_analogy',
          content: `Analogous failure in past problem "${sf.problemTitle}" (status: ${sf.submissionStatus}, similarity: ${(sf.similarityScore * 100).toFixed(0)}%)`,
          problemTitle: sf.problemTitle,
          problemSlug: sf.problemSlug,
          observedSignal: `Historical pattern match on ${sf.problemTitle}`,
          failureMechanism: `Shared structural pattern: prior failure under status ${sf.submissionStatus}`,
          supportedRootCause: preliminaryCause.name,
          relatedWeakness: 'Algorithmic Pattern Recognition',
          retrievalRelevanceScore: clampScore(sf.similarityScore),
          rootCauseSupportScore: clampScore(sf.similarityScore * 0.85), // Analogy cannot provide 100% direct proof
          classification: sf.similarityScore >= 0.5 ? 'relevant' : 'partially_relevant',
          isDirect: false,
          provenance: {
            sourceType: 'HybridRAG',
            sourceId: sf.submissionId,
            retrievalTimestamp: now,
            queryUsed: `hybrid_retrieval_sim_${sf.problemSlug}`,
          },
        });
      }
    } catch (err) {
      console.warn('[AgenticEngine] Hybrid retrieval error (non-fatal):', err);
    }
  }

  // Tool 3: Knowledge Graph Traversal & Weakness Topology
  if (plan.retrievalTools.includes('knowledge_graph_traversal')) {
    const topWeakness = weaknessScores[0] || mapRootCauseToWeakness(preliminaryCause.id) || {
      id: 'edge-case-reasoning',
      name: 'Edge Case Reasoning',
      pageRankScore: 0.15,
      frequency: 3,
    };

    items.push({
      evidenceId: generateEvidenceId('graph'),
      source: 'graph_inference',
      content: `Knowledge Graph traversal: PageRank systemic weakness node "${topWeakness.name}" (topological weight: ${((topWeakness.pageRankScore ?? 0.1) * 100).toFixed(1)}%, historical frequency: ${topWeakness.frequency ?? 1})`,
      observedSignal: `Graph connection between root cause '${preliminaryCause.name}' and systemic weakness '${topWeakness.name}'`,
      failureMechanism: 'Repeated structural vulnerability identified across graph paths',
      supportedRootCause: preliminaryCause.name,
      relatedWeakness: topWeakness.name,
      retrievalRelevanceScore: 0.80,
      rootCauseSupportScore: 0.75,
      classification: 'relevant',
      isDirect: false,
      provenance: {
        sourceType: 'Neo4j_Prisma_Graph',
        sourceId: topWeakness.id,
        retrievalTimestamp: now,
        queryUsed: `pagerank_weakness_${topWeakness.id}`,
      },
    });
  }

  // Tool 4: Internal Learning Concept Catalog
  const conceptKey = preliminaryCause.id;
  const catalogList = ROOT_CAUSE_RESOURCES[conceptKey as keyof typeof ROOT_CAUSE_RESOURCES] || [];
  const registeredTopics = TOPIC_REGISTRY.dsa || [];

  // Match concept against internal DSA topics
  const matchedTopic = registeredTopics.find((t: string) =>
    preliminaryCause.name.toLowerCase().includes(t.toLowerCase()) ||
    t.toLowerCase().includes(preliminaryCause.name.toLowerCase().slice(0, 6))
  ) || 'Binary Search Invariants';

  const conceptTitle = catalogList[0]?.title || `${matchedTopic} & Invariant Verification`;

  items.push({
    evidenceId: generateEvidenceId('concept'),
    source: 'learning_catalog',
    content: `Verified conceptual knowledge: ${conceptTitle}. Explains interval invariants and boundary condition correctness.`,
    observedSignal: `Prerequisite algorithmic pattern: ${matchedTopic}`,
    failureMechanism: `Misapplication of ${matchedTopic} interval invariants`,
    supportedRootCause: preliminaryCause.name,
    relatedWeakness: mapRootCauseToWeakness(preliminaryCause.id)?.name || 'Algorithmic Pattern Recognition',
    retrievalRelevanceScore: 0.90,
    rootCauseSupportScore: 0.85,
    classification: 'relevant',
    isDirect: false,
    provenance: {
      sourceType: 'InternalTopicRegistry',
      sourceId: `topic_${matchedTopic.toLowerCase().replace(/\s+/g, '_')}`,
      retrievalTimestamp: now,
      queryUsed: `concept_lookup_${matchedTopic}`,
    },
  });

  return items;
}

// ─── STAGE 3: GRADE (CRAG) ───────────────────────────────────────────────────

export function gradeEvidence(
  items: GradedEvidenceItem[],
  query: string,
  submission: SubmissionEvent | null,
  preliminaryCause: { id: string; name: string }
): {
  gradedItems: GradedEvidenceItem[];
  overallQuality: InformationQuality;
  acceptedItems: GradedEvidenceItem[];
  rejectedItems: GradedEvidenceItem[];
  missingContext: string[];
} {
  const acceptedItems: GradedEvidenceItem[] = [];
  const rejectedItems: GradedEvidenceItem[] = [];
  const missingContext: string[] = [];

  const seenContents = new Set<string>();

  for (const item of items) {
    // 1. Duplication check
    const normalizedContent = item.content.trim().toLowerCase();
    if (seenContents.has(normalizedContent)) {
      item.classification = 'irrelevant';
      item.rejectionReason = 'Duplicate evidence item';
      rejectedItems.push(item);
      continue;
    }
    seenContents.add(normalizedContent);

    // 2. Contradiction check:
    // If submission passed or code is clean but item claims runtime error, or vice versa
    if (submission?.submissionStatus === 'Accepted' && item.failureMechanism?.includes('Fatal')) {
      item.classification = 'contradictory';
      item.rejectionReason = 'Contradicts submission status (submission is Accepted)';
      rejectedItems.push(item);
      continue;
    }

    // 3. Relevance grading
    if (item.retrievalRelevanceScore < DEFAULT_AGENTIC_CONFIG.relevanceThresholdLow) {
      item.classification = 'irrelevant';
      item.rejectionReason = `Relevance score (${item.retrievalRelevanceScore.toFixed(2)}) below minimum threshold`;
      rejectedItems.push(item);
      continue;
    }

    if (item.retrievalRelevanceScore >= DEFAULT_AGENTIC_CONFIG.relevanceThresholdHigh &&
        item.rootCauseSupportScore >= DEFAULT_AGENTIC_CONFIG.supportThreshold) {
      item.classification = 'relevant';
      acceptedItems.push(item);
    } else {
      item.classification = 'partially_relevant';
      acceptedItems.push(item);
    }
  }

  // Check for missing context
  const hasDirectCode = acceptedItems.some(i => i.isDirect);
  const hasConcept = acceptedItems.some(i => i.source === 'learning_catalog');
  const hasMechanism = acceptedItems.some(i => Boolean(i.failureMechanism));

  if (!hasDirectCode) {
    missingContext.push('No direct code evidence linking line of failure to bug');
  }
  if (!hasConcept) {
    missingContext.push('No foundational concept definition retrieved for root cause');
  }
  if (!hasMechanism) {
    missingContext.push('Missing explicit failure mechanism breakdown');
  }

  // Determine overall quality
  let overallQuality: InformationQuality = 'low';
  const relevantCount = acceptedItems.filter(i => i.classification === 'relevant').length;

  if (hasDirectCode && relevantCount >= 2 && missingContext.length === 0) {
    overallQuality = 'high';
  } else if (acceptedItems.length >= 2) {
    overallQuality = 'medium';
  } else {
    overallQuality = 'low';
  }

  return {
    gradedItems: items,
    overallQuality,
    acceptedItems,
    rejectedItems,
    missingContext,
  };
}

// ─── STAGE 4: CORRECT IF NEEDED (CRAG Loop) ──────────────────────────────────

export async function correctRetrievalIfNeeded(
  plan: RetrievalPlan,
  userId: string,
  submission: SubmissionEvent | null,
  preliminaryCause: { id: string; name: string; confidence: number },
  weaknessScores: WeaknessScore[],
  initialItems: GradedEvidenceItem[],
  onStage?: (stage: DiagnosisStage) => Promise<void> | void
): Promise<{
  finalEvidence: GradedEvidenceItem[];
  finalQuality: InformationQuality;
  iterationsRun: number;
  reformulatedQueries: string[];
  correctionTriggered: boolean;
}> {
  let currentEvidence = [...initialItems];
  let gradeResult = gradeEvidence(currentEvidence, plan.query, submission, preliminaryCause);
  const reformulatedQueries: string[] = [];
  let iterationsRun = 1;
  let correctionTriggered = false;

  while (
    (gradeResult.overallQuality === 'low' || gradeResult.missingContext.length > 0) &&
    iterationsRun < plan.maxIterations
  ) {
    correctionTriggered = true;
    iterationsRun++;
    await onStage?.('correct');

    // 1. Identify missing information
    const missing = gradeResult.missingContext.join('; ');

    // 2. Reformulate query
    const problemName = submission?.problemTitle || 'algorithm';
    const reformulatedQuery = `${problemName} ${preliminaryCause.name} invariant boundary verification ${missing}`.trim();
    reformulatedQueries.push(reformulatedQuery);

    // 3. Execute targeted corrective retrieval
    const correctivePlan: RetrievalPlan = {
      ...plan,
      query: reformulatedQuery,
      retrievalTools: ['learning_concept_catalog', 'knowledge_graph_traversal', 'code_diff_analysis'],
    };

    const newItems = await executeRetrieval(
      correctivePlan,
      userId,
      submission,
      preliminaryCause,
      weaknessScores,
      iterationsRun
    );

    // 4. Merge and regrade
    currentEvidence = [...gradeResult.acceptedItems, ...newItems];
    gradeResult = gradeEvidence(currentEvidence, reformulatedQuery, submission, preliminaryCause);

    // If we've reached high or medium quality, stop early
    if (gradeResult.overallQuality === 'high') {
      break;
    }
  }

  return {
    finalEvidence: gradeResult.acceptedItems,
    finalQuality: gradeResult.overallQuality,
    iterationsRun,
    reformulatedQueries,
    correctionTriggered,
  };
}

// ─── STAGE 5: GENERATE (AI Evidence & RAG Evidence) ──────────────────────────

export function generateAIEvidence(
  query: string,
  submission: SubmissionEvent | null,
  acceptedEvidence: GradedEvidenceItem[],
  preliminaryCause: { id: string; name: string },
  quality: InformationQuality
): AIEvidenceNote[] {
  const notes: AIEvidenceNote[] = [];
  const conceptEvidence = acceptedEvidence.filter(e => e.source === 'learning_catalog');
  const codeEvidence = acceptedEvidence.filter(e => e.isDirect);

  const topic = preliminaryCause.name;
  const supportingIds = acceptedEvidence.map(e => e.evidenceId);

  let shortExplanation = '';
  let whyItMatters = '';
  let connectionToCurrentFailure = '';
  let keyTakeaway = '';
  let relatedTopics: string[] = [];
  let uncertaintyNote: string | undefined = undefined;

  // Specific content mapping based on topic category
  if (topic.toLowerCase().includes('boundary') || topic.toLowerCase().includes('edge')) {
    shortExplanation = 'Search intervals rely on strict loop termination conditions (e.g. while left <= right vs while left < right). When the bound condition does not match the midpoint update rules, boundary elements are either skipped or cause infinite loops.';
    whyItMatters = 'In binary search and two-pointer sweeps, off-by-one boundary bugs produce intermittent failures that pass small test cases but silently fail when the target sits at index 0 or index n-1.';
    keyTakeaway = 'Maintain an explicit interval invariant: inclusive bounds [left, right] require `left <= right` and `right = mid - 1`. Half-open bounds [left, right) require `left < right` and `right = mid`.';
    relatedTopics = ['Loop Invariants', 'Off-by-One Errors', 'Binary Search Bounds', 'Interval Representation'];
  } else if (topic.toLowerCase().includes('complexity') || topic.toLowerCase().includes('time')) {
    shortExplanation = 'Nested iterations over dynamic collections or unmemoized recursive branchings trigger exponential O(2^n) or quadratic O(n^2) scaling when input constraints demand linearithmic O(n log n).';
    whyItMatters = 'Competitive programming test suites include adversarial worst-case inputs designed to push execution time past standard 1.0–2.0 second platform limits.';
    keyTakeaway = 'Calculate the operations budget before coding: n <= 10^5 requires O(n) or O(n log n). Use memoization or dynamic programming tables when overlapping subproblems repeat.';
    relatedTopics = ['Time Complexity Analysis', 'Recursion Trees', 'Memoization Tables', 'Asymptotic Invariants'];
  } else if (topic.toLowerCase().includes('pattern') || topic.toLowerCase().includes('algorithm')) {
    shortExplanation = 'Choosing the wrong algorithmic paradigm (e.g., greedy choice on non-matroid graphs vs dynamic programming) leads to counterexamples where locally optimal decisions miss the global optimum.';
    whyItMatters = 'Problems with optimal substructure but lacking the greedy-choice property cannot be solved with simple sorting or single-pass scans.';
    keyTakeaway = 'Verify the greedy-choice property by attempting to prove an exchange argument or constructing small counterexamples before writing code.';
    relatedTopics = ['Optimal Substructure', 'Exchange Arguments', 'Dynamic Programming', 'State Transitions'];
  } else {
    shortExplanation = `Detailed invariant verification for ${topic}. Ensures variables adhere to formal pre- and post-conditions throughout execution.`;
    whyItMatters = 'Algorithmic correctness requires preserving data invariants across state transitions in all execution branches.';
    keyTakeaway = 'Write explicit assertions or trace state invariants across the smallest possible failing counterexample.';
    relatedTopics = ['Invariant Verification', 'State Transitions', 'Defensive Assertions'];
  }

  // Connect directly to current failure code if available
  if (codeEvidence.length > 0 && codeEvidence[0]?.codeSnippet) {
    connectionToCurrentFailure = `In your submission, the code "${codeEvidence[0].codeSnippet}" triggers this gap. ${codeEvidence[0].observedSignal || 'The condition terminates before inspecting boundary candidates'}.`;
  } else if (submission) {
    connectionToCurrentFailure = `Observed during submission on "${submission.problemTitle}" with status "${submission.submissionStatus}".`;
  } else {
    connectionToCurrentFailure = `Directly relevant to query "${query || topic}": addressing this pattern prevents silent logic errors.`;
  }

  // Score-driven adjustments based on information quality
  let relevanceScore = 0.92;
  if (quality === 'medium') {
    relevanceScore = 0.72;
    uncertaintyNote = 'Verified against algorithmic taxonomy; direct submission execution trace was partial.';
  } else if (quality === 'low') {
    relevanceScore = 0.55;
    uncertaintyNote = 'Carefully qualified guidance: low retrieval coverage for submission-specific tests. Guidance based on general algorithmic principles.';
  }

  notes.push({
    topic,
    shortExplanation,
    whyItMatters,
    connectionToCurrentFailure,
    keyTakeaway,
    relatedTopics,
    relevanceScore,
    supportingEvidenceIds: supportingIds,
    informationQuality: quality,
    uncertaintyNote,
  });

  return notes;
}

export function generateRAGEvidence(
  submission: SubmissionEvent | null,
  acceptedEvidence: GradedEvidenceItem[],
  preliminaryCause: { id: string; name: string }
): RAGEvidenceItem[] {
  const items: RAGEvidenceItem[] = [];

  for (const ev of acceptedEvidence) {
    items.push({
      evidenceId: ev.evidenceId,
      relatedProblem: ev.problemTitle || submission?.problemTitle || 'Current Problem',
      problemId: ev.problemSlug || submission?.problemSlug,
      observedSignal: ev.observedSignal || ev.content,
      codeEvidence: ev.codeSnippet || ev.diffSnippet,
      failureMechanism: ev.failureMechanism || 'Algorithmic state mutation caused unexpected termination',
      supportedRootCause: ev.supportedRootCause || preliminaryCause.name,
      relatedWeakness: ev.relatedWeakness || 'Edge Case Reasoning',
      retrievalRelevanceScore: ev.retrievalRelevanceScore,
      rootCauseSupportScore: ev.rootCauseSupportScore,
      evidenceType: ev.source,
      provenance: ev.provenance,
    });
  }

  return items;
}

// ─── STAGE 6: VERIFY (Self-Correction Verifier) ──────────────────────────────

export function verifyDiagnosisGrounding(
  diagnosisRootCause: string,
  claimedConfidence: number,
  aiEvidence: AIEvidenceNote[],
  ragEvidence: RAGEvidenceItem[],
  acceptedEvidence: GradedEvidenceItem[],
  submission: SubmissionEvent | null
): VerificationResult {
  const unsupportedClaims: string[] = [];
  const missingEvidence: string[] = [];
  const contradictions: string[] = [];

  // Check 1: Root Cause Claim Evidence Support
  const hasSupportingEvidence = acceptedEvidence.some(
    e => e.supportedRootCause?.toLowerCase() === diagnosisRootCause.toLowerCase() ||
         e.classification === 'relevant'
  );
  if (!hasSupportingEvidence) {
    unsupportedClaims.push(`Root cause "${diagnosisRootCause}" has no relevant supporting evidence in retrieval pool`);
  }

  // Check 2: Contradictions with submission status
  if (submission?.submissionStatus === 'Accepted' && ragEvidence.some(r => r.failureMechanism.includes('Fatal'))) {
    contradictions.push('Failure mechanism claims fatal execution error but submission passed all tests');
  }

  // Check 3: Check if diagnosis relies exclusively on analogy
  const onlyAnalogy = ragEvidence.length > 0 && ragEvidence.every(r => r.evidenceType === 'historical_analogy');
  if (onlyAnalogy && claimedConfidence > DEFAULT_AGENTIC_CONFIG.analogyConfidenceCap) {
    unsupportedClaims.push(`Confidence (${claimedConfidence}%) is uncalibrated: relies solely on historical analogy (cap: ${DEFAULT_AGENTIC_CONFIG.analogyConfidenceCap}%)`);
  }

  // Check 4: Provenance validity
  for (const rag of ragEvidence) {
    if (!rag.provenance || !rag.provenance.sourceId) {
      missingEvidence.push(`Evidence ${rag.evidenceId} is missing verifiable source provenance`);
    }
  }

  // Calculate verifier score (0 - 100)
  let score = 100;
  score -= unsupportedClaims.length * 30;
  score -= contradictions.length * 40;
  score -= missingEvidence.length * 15;
  score = Math.max(0, Math.min(100, score));

  // Determine recommended action
  let recommendedAction: VerificationAction = 'accept';
  if (contradictions.length > 0) {
    recommendedAction = 'regenerate';
  } else if (unsupportedClaims.length > 0 && onlyAnalogy) {
    recommendedAction = 'downgrade_confidence';
  } else if (score < 60) {
    recommendedAction = 'retrieve_more_evidence';
  }

  const grounded = score >= 70 && contradictions.length === 0;
  const details = grounded
    ? `Grounding verified: ${ragEvidence.length} evidence items substantiate root cause "${diagnosisRootCause}".`
    : `Verification flagged issues: ${[...unsupportedClaims, ...contradictions, ...missingEvidence].join('; ')}`;

  return {
    grounded,
    score,
    unsupportedClaims,
    missingEvidence,
    contradictions,
    recommendedAction,
    details,
  };
}

// ─── STAGE 7: ACCEPT & ORCHESTRATION ─────────────────────────────────────────

export async function executeAgenticDiagnosis(
  input: AgenticEngineInput
): Promise<AgenticEngineOutput> {
  const { userId, userQuery = '', submission, onStage } = input;
  const config = { ...DEFAULT_AGENTIC_CONFIG, ...input.config };

  const rawCode = submission?.submissionCode || '';
  const status = submission?.submissionStatus || 'Wrong Answer';

  // ── 1. PLAN ──
  await onStage?.('plan');
  const preliminaryCause = classifyPreliminaryRootCause(rawCode, userQuery, status);
  const weaknessScores = await computeWeaknessPageRank(userId);
  const plan = planRetrieval(userQuery, submission, preliminaryCause, weaknessScores, config.maxIterations);

  // ── 2. RETRIEVE ──
  await onStage?.('retrieve');
  const initialItems = await executeRetrieval(plan, userId, submission, preliminaryCause, weaknessScores, 1);

  // ── 3 & 4. GRADE & CORRECT IF NEEDED ──
  await onStage?.('grade');
  const correctionResult = await correctRetrievalIfNeeded(
    plan,
    userId,
    submission,
    preliminaryCause,
    weaknessScores,
    initialItems,
    onStage
  );

  const { finalEvidence, finalQuality, iterationsRun, reformulatedQueries, correctionTriggered } = correctionResult;

  // ── 5. GENERATE ──
  await onStage?.('generate');
  const aiEvidence = generateAIEvidence(userQuery, submission, finalEvidence, preliminaryCause, finalQuality);
  const ragEvidence = generateRAGEvidence(submission, finalEvidence, preliminaryCause);

  let initialConfidence = preliminaryCause.confidence;
  // If relying mainly on analogy, calibrate initial confidence
  const onlyAnalogy = ragEvidence.length > 0 && ragEvidence.every(r => r.evidenceType === 'historical_analogy');
  if (onlyAnalogy && initialConfidence > config.analogyConfidenceCap) {
    initialConfidence = config.analogyConfidenceCap;
  }

  // ── 6. VERIFY ──
  await onStage?.('verify');
  const verification = verifyDiagnosisGrounding(
    preliminaryCause.name,
    initialConfidence,
    aiEvidence,
    ragEvidence,
    finalEvidence,
    submission
  );

  // ── 7. ACCEPT / CALIBRATE ──
  await onStage?.('accept');
  let finalConfidence = initialConfidence;
  let uncertaintyState = false;

  if (verification.recommendedAction === 'downgrade_confidence') {
    finalConfidence = Math.min(finalConfidence, config.analogyConfidenceCap);
  } else if (!verification.grounded) {
    finalConfidence = Math.min(finalConfidence, 50);
    uncertaintyState = true;
  }

  const primaryWeakness = mapRootCauseToWeakness(preliminaryCause.id) || {
    id: preliminaryCause.id,
    name: preliminaryCause.name,
  };

  const verdict = submission
    ? `${submission.submissionStatus}: ${preliminaryCause.name}`
    : `Diagnosis: ${preliminaryCause.name}`;

  const reasoningSummary = `Identified root cause "${preliminaryCause.name}" with ${finalConfidence}% calibrated confidence based on ${ragEvidence.length} accepted evidence item(s) across ${iterationsRun} retrieval iteration(s). Verification score: ${verification.score}/100.`;

  const retrievalMetadata: AgenticRetrievalMetadata = {
    plan,
    iterations: iterationsRun,
    maxIterations: plan.maxIterations,
    totalRetrieved: initialItems.length + (correctionTriggered ? finalEvidence.length : 0),
    acceptedCount: finalEvidence.length,
    rejectedCount: initialItems.length - finalEvidence.length,
    correctionTriggered,
    reformulatedQueries,
    finalEvidenceQuality: finalQuality,
    earlyStopped: iterationsRun < plan.maxIterations && finalQuality === 'high',
    reasoningSummary,
  };

  return {
    primaryWeaknessId: primaryWeakness.id,
    primaryWeaknessName: primaryWeakness.name,
    confidence: finalConfidence,
    verdict,
    reasoningSummary,
    aiEvidence,
    ragEvidence,
    retrievalMetadata,
    verificationMetadata: verification,
    uncertaintyState,
    statusMessage: uncertaintyState
      ? 'Qualified diagnosis: partial evidence grounding requires careful invariant review'
      : 'Diagnosis verified and evidence-grounded',
  };
}
