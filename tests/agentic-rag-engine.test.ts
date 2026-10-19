/**
 * tests/agentic-rag-engine.test.ts
 *
 * Comprehensive Test Suite for Praxis Agentic Diagnosis Engine
 * Tests all 14 Acceptance Criteria:
 * 1. High-quality retrieval generates relevant, grounded AI Evidence.
 * 2. Low-quality retrieval triggers corrective retrieval.
 * 3. Internal learning and graph sources are used when appropriate.
 * 4. AI Evidence contains informative explanations instead of URL-only output.
 * 5. RAG Evidence distinguishes direct evidence from historical analogy.
 * 6. Contradictory evidence triggers correction or qualification.
 * 7. Unsupported diagnosis claims are removed or downgraded.
 * 8. Missing evidence produces an explicit uncertainty state.
 * 9. Evidence IDs and provenance remain valid.
 * 10. Score meanings and thresholds are consistent.
 * 11. AI Evidence and RAG Evidence do not duplicate each other.
 * 12. The maximum iteration limit (3) is enforced.
 * 13. Retrieval and diagnosis evaluation metrics are calculated correctly.
 * 14. Existing API consumers and submission processing remain compatible.
 */

import assert from 'assert';
import {
  planRetrieval,
  executeRetrieval,
  gradeEvidence,
  correctRetrievalIfNeeded,
  generateAIEvidence,
  generateRAGEvidence,
  verifyDiagnosisGrounding,
  executeAgenticDiagnosis,
  DEFAULT_AGENTIC_CONFIG,
} from '../src/lib/diagnosis/agentic-engine';
import {
  calculatePrecisionAtK,
  calculateRecallAtK,
  calculateMRR,
  calculateNDCGAtK,
  evaluateRetrieval,
  evaluateDiagnosisGroundingMetrics,
  evaluateAIEvidenceQuality,
  BENCHMARK_DATASET_V1,
} from '../src/lib/diagnosis/evaluation';
import type { SubmissionEvent } from '../src/types';
import type { GradedEvidenceItem } from '../src/types/diagnosis-agentic';

console.log('🧪 [Test] Running Agentic RAG & CRAG Diagnosis Engine test suite...\n');

// ─── Mock Fixtures ─────────────────────────────────────────────────────────────

const mockSubmission: SubmissionEvent = {
  eventId: 'evt_test_bs_101',
  sessionId: 'sess_101',
  timestamp: new Date('2026-03-15T10:00:00Z'),
  problemSlug: 'binary-search',
  problemTitle: 'Binary Search',
  problemDifficulty: 'Easy',
  problemTopics: ['Binary Search', 'Array'],
  problemUrl: 'https://leetcode.com/problems/binary-search/',
  submissionStatus: 'Wrong Answer',
  submissionLanguage: 'python',
  submissionCode: 'def search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left < right:\n        mid = (left + right) // 2\n        if nums[mid] == target: return mid\n        elif nums[mid] < target: left = mid + 1\n        else: right = mid - 1\n    return -1',
  timeSpent: 95,
  attemptNumber: 2,
  rapidSubmission: false,
  failedTestCase: 'nums = [5], target = 5',
};

const preliminaryCause = {
  id: 'boundary-condition-error',
  name: 'Boundary Condition Error',
  confidence: 88,
};

const mockWeaknessScores = [
  { id: 'edge-case-reasoning', name: 'Edge Case Reasoning', pageRankScore: 0.182, frequency: 5, lastOccurrence: new Date() },
  { id: 'performance-analysis', name: 'Performance Analysis', pageRankScore: 0.091, frequency: 1, lastOccurrence: new Date() },
];

async function runAllTests() {
  // ─── Test 1: High-Quality Retrieval Generates Relevant Grounded AI Evidence ───
  console.log('Test 1: High-quality retrieval generates relevant, grounded AI Evidence...');
  const highQualityItems: GradedEvidenceItem[] = [
    {
      evidenceId: 'ev_code_1',
      source: 'direct_code',
      content: 'Line 3: while left < right terminates before checking last candidate index',
      codeSnippet: 'while left < right:',
      observedSignal: 'Premature termination when left == right',
      failureMechanism: 'Skips element at index left when search space reduces to length 1',
      supportedRootCause: 'Boundary Condition Error',
      relatedWeakness: 'Edge Case Reasoning',
      retrievalRelevanceScore: 0.95,
      rootCauseSupportScore: 0.92,
      classification: 'relevant',
      isDirect: true,
      provenance: { sourceType: 'SubmissionCode', sourceId: 'evt_1', retrievalTimestamp: new Date().toISOString(), queryUsed: 'boundary' },
    },
    {
      evidenceId: 'ev_concept_1',
      source: 'learning_catalog',
      content: 'Binary Search Invariants require while left <= right for inclusive intervals [left, right]',
      supportedRootCause: 'Boundary Condition Error',
      relatedWeakness: 'Edge Case Reasoning',
      retrievalRelevanceScore: 0.90,
      rootCauseSupportScore: 0.88,
      classification: 'relevant',
      isDirect: false,
      provenance: { sourceType: 'InternalTopicRegistry', sourceId: 'bs_invariants', retrievalTimestamp: new Date().toISOString(), queryUsed: 'invariants' },
    },
  ];

  const aiEvidenceHigh = generateAIEvidence('why did it fail', mockSubmission, highQualityItems, preliminaryCause, 'high');
  assert.strictEqual(aiEvidenceHigh.length, 1, 'Should generate 1 comprehensive AI evidence note');
  assert.strictEqual(aiEvidenceHigh[0]?.informationQuality, 'high', 'Information quality must be high');
  assert(aiEvidenceHigh[0]?.relevanceScore >= 0.85, 'Relevance score must be >= 0.85 for high quality');
  assert(aiEvidenceHigh[0]?.shortExplanation.length > 50, 'Explanation must be rich and technical');
  assert(aiEvidenceHigh[0]?.connectionToCurrentFailure.includes('while left < right'), 'Connection must reference actual failing code snippet');
  assert(!aiEvidenceHigh[0]?.uncertaintyNote, 'High quality evidence should not require uncertainty note');
  console.log('  ✓ Pass: High-quality retrieval grounded AI Evidence verified.');

  // ─── Test 2: Low-Quality Retrieval Triggers Corrective Retrieval (CRAG) ───────
  console.log('Test 2: Low-quality retrieval triggers corrective retrieval...');
  const weakInitialItems: GradedEvidenceItem[] = [
    {
      evidenceId: 'ev_weak_1',
      source: 'historical_analogy',
      content: 'Weak historical match with unrelated status',
      retrievalRelevanceScore: 0.35,
      rootCauseSupportScore: 0.30,
      classification: 'partially_relevant',
      isDirect: false,
      provenance: { sourceType: 'HybridRAG', sourceId: 'old_sub', retrievalTimestamp: new Date().toISOString(), queryUsed: 'weak' },
    },
  ];

  const plan = planRetrieval('how to fix', mockSubmission, preliminaryCause, mockWeaknessScores, 3);
  const cragResult = await correctRetrievalIfNeeded(
    plan,
    'user_123',
    mockSubmission,
    preliminaryCause,
    mockWeaknessScores,
    weakInitialItems
  );

  assert.strictEqual(cragResult.correctionTriggered, true, 'CRAG must trigger corrective retrieval on weak items');
  assert(cragResult.iterationsRun >= 2, 'Should execute at least 2 iterations during correction');
  assert(cragResult.reformulatedQueries.length > 0, 'Must record reformulated queries');
  assert(cragResult.finalEvidence.length > weakInitialItems.length, 'Corrective retrieval must expand accepted evidence');
  console.log('  ✓ Pass: Corrective retrieval triggered and enriched evidence.');

  // ─── Test 3: Internal Learning & Graph Sources Used ─────────────────────────
  console.log('Test 3: Internal learning and graph sources used without external URL dependencies...');
  const retrieved = await executeRetrieval(plan, 'user_123', mockSubmission, preliminaryCause, mockWeaknessScores, 1);
  const sources = retrieved.map(r => r.source);
  assert(sources.includes('learning_catalog'), 'Must use internal learning catalog');
  assert(sources.includes('graph_inference'), 'Must use knowledge graph traversal');
  assert(sources.includes('direct_code'), 'Must use direct code analysis');
  console.log('  ✓ Pass: Internal learning catalog and graph sources used.');

  // ─── Test 4: AI Evidence Contains Informative Notes (No-Link-First) ───────────
  console.log('Test 4: AI Evidence contains informative explanations without raw URL walls...');
  const primaryNote = aiEvidenceHigh[0]!;
  assert(!primaryNote.topic.includes('http'), 'Topic title must not be a URL');
  assert(!primaryNote.shortExplanation.includes('http'), 'Explanation must not be a URL');
  assert(!primaryNote.whyItMatters.includes('http'), 'WhyItMatters must not be a URL');
  assert(!primaryNote.keyTakeaway.includes('http'), 'KeyTakeaway must not be a URL');
  assert(primaryNote.relatedTopics.length >= 3, 'Must provide structured related topics array');
  console.log('  ✓ Pass: AI Evidence is informative and satisfies no-link-first policy.');

  // ─── Test 5: RAG Evidence Distinguishes Direct Code from Analogy ──────────────
  console.log('Test 5: RAG Evidence distinguishes direct code from historical analogy...');
  const mixedItems: GradedEvidenceItem[] = [
    ...highQualityItems,
    {
      evidenceId: 'ev_analogy_1',
      source: 'historical_analogy',
      content: 'Past submission on search-insert-position',
      problemTitle: 'Search Insert Position',
      problemSlug: 'search-insert-position',
      retrievalRelevanceScore: 0.70,
      rootCauseSupportScore: 0.65,
      classification: 'relevant',
      isDirect: false,
      provenance: { sourceType: 'HybridRAG', sourceId: 'evt_past', retrievalTimestamp: new Date().toISOString(), queryUsed: 'sim' },
    },
  ];

  const ragEvidence = generateRAGEvidence(mockSubmission, mixedItems, preliminaryCause);
  const directItems = ragEvidence.filter(r => r.evidenceType === 'direct_code');
  const analogyItems = ragEvidence.filter(r => r.evidenceType === 'historical_analogy');
  assert(directItems.length >= 1, 'Must have direct code items');
  assert(analogyItems.length >= 1, 'Must have analogy items');
  assert.strictEqual(directItems[0]?.relatedProblem, 'Binary Search', 'Direct evidence must point to current problem');
  assert.strictEqual(analogyItems[0]?.relatedProblem, 'Search Insert Position', 'Analogy must identify historical problem');
  console.log('  ✓ Pass: Direct code evidence and historical analogy clearly separated.');

  // ─── Test 6: Contradictory Evidence Triggers Rejection & Regeneration ─────────
  console.log('Test 6: Contradictory evidence triggers correction / rejection...');
  const contradictoryItems: GradedEvidenceItem[] = [
    {
      evidenceId: 'ev_contra_1',
      source: 'direct_code',
      content: 'Fatal memory allocation failure',
      failureMechanism: 'Fatal crash on initialization',
      retrievalRelevanceScore: 0.90,
      rootCauseSupportScore: 0.85,
      classification: 'relevant',
      isDirect: true,
      provenance: { sourceType: 'CrashLog', sourceId: 'crash_1', retrievalTimestamp: new Date().toISOString(), queryUsed: 'crash' },
    },
  ];

  // Submission was actually "Accepted"
  const acceptedSubmission: SubmissionEvent = { ...mockSubmission, submissionStatus: 'Accepted' };
  const gradedContra = gradeEvidence(contradictoryItems, 'check', acceptedSubmission, preliminaryCause);
  assert.strictEqual(gradedContra.rejectedItems.length, 1, 'Contradictory item must be rejected');
  assert.strictEqual(gradedContra.rejectedItems[0]?.classification, 'contradictory');

  const verifyContra = verifyDiagnosisGrounding(
    'Fatal Crash',
    90,
    aiEvidenceHigh,
    [{
      evidenceId: 'ev_contra_1',
      relatedProblem: 'Binary Search',
      observedSignal: 'Crash',
      failureMechanism: 'Fatal crash',
      supportedRootCause: 'Fatal Crash',
      relatedWeakness: 'Implementation Precision',
      retrievalRelevanceScore: 0.9,
      rootCauseSupportScore: 0.85,
      evidenceType: 'direct_code',
      provenance: { sourceType: 'Crash', sourceId: 'c1', retrievalTimestamp: '', queryUsed: '' },
    }],
    [],
    acceptedSubmission
  );
  assert.strictEqual(verifyContra.recommendedAction, 'regenerate', 'Contradiction must recommend regeneration');
  assert.strictEqual(verifyContra.grounded, false, 'Contradictory state must not be grounded');
  console.log('  ✓ Pass: Contradictions identified and handled safely.');

  // ─── Test 7: Unsupported Claims Downgraded When Relying Solely on Analogy ────
  console.log('Test 7: Unsupported claims / pure analogy confidence downgraded...');
  const onlyAnalogyRAG = [
    {
      evidenceId: 'ev_analogy_only',
      relatedProblem: 'Different Problem',
      observedSignal: 'Similar failure in past',
      failureMechanism: 'Hypothesized analogous bug',
      supportedRootCause: 'Boundary Condition Error',
      relatedWeakness: 'Edge Case Reasoning',
      retrievalRelevanceScore: 0.65,
      rootCauseSupportScore: 0.60,
      evidenceType: 'historical_analogy' as const,
      provenance: { sourceType: 'HybridRAG', sourceId: 'p1', retrievalTimestamp: '', queryUsed: '' },
    },
  ];

  const verifyAnalogy = verifyDiagnosisGrounding(
    'Boundary Condition Error',
    95, // Inflated 95% confidence without direct evidence
    aiEvidenceHigh,
    onlyAnalogyRAG,
    [mixedItems[2]!],
    mockSubmission
  );

  assert.strictEqual(verifyAnalogy.recommendedAction, 'downgrade_confidence', 'Should recommend downgrading confidence');
  assert(verifyAnalogy.unsupportedClaims.some(c => c.includes('uncalibrated')), 'Should flag uncalibrated confidence');
  console.log('  ✓ Pass: Pure analogy confidence capped and flagged for downgrade.');

  // ─── Test 8: Missing Evidence Produces Explicit Uncertainty State ─────────────
  console.log('Test 8: Missing evidence produces explicit uncertainty state...');
  const lowQualityNotes = generateAIEvidence('obscure bug', null, [], preliminaryCause, 'low');
  assert(Boolean(lowQualityNotes[0]?.uncertaintyNote), 'Low quality note must contain uncertaintyNote');
  assert(lowQualityNotes[0]?.uncertaintyNote!.includes('qualified'), 'Uncertainty note must qualify the guidance');
  console.log('  ✓ Pass: Explicit uncertainty note generated when evidence is missing.');

  // ─── Test 9: Evidence IDs and Provenance Valid ───────────────────────────────
  console.log('Test 9: Evidence IDs and provenance validity...');
  for (const item of retrieved) {
    assert(item.evidenceId.startsWith('ev_'), `Evidence ID ${item.evidenceId} must start with 'ev_'`);
    assert(item.provenance.sourceType.length > 0, 'Provenance sourceType must be non-empty');
    assert(item.provenance.sourceId.length > 0, 'Provenance sourceId must be non-empty');
    assert(item.provenance.retrievalTimestamp.length > 0, 'Provenance timestamp must exist');
  }
  console.log('  ✓ Pass: All evidence IDs and provenance fields valid.');

  // ─── Test 10: Score Meanings and Thresholds Consistent ───────────────────────
  console.log('Test 10: Score definitions and thresholds consistent...');
  assert.strictEqual(DEFAULT_AGENTIC_CONFIG.maxIterations, 3, 'Max iterations must default to 3');
  assert(DEFAULT_AGENTIC_CONFIG.relevanceThresholdHigh > DEFAULT_AGENTIC_CONFIG.relevanceThresholdMedium);
  assert(DEFAULT_AGENTIC_CONFIG.relevanceThresholdMedium > DEFAULT_AGENTIC_CONFIG.relevanceThresholdLow);
  assert.strictEqual(DEFAULT_AGENTIC_CONFIG.analogyConfidenceCap, 70, 'Analogy cap must be exactly 70%');
  console.log('  ✓ Pass: Threshold definitions and ordering verified.');

  // ─── Test 11: AI Evidence & RAG Evidence Do Not Duplicate ────────────────────
  console.log('Test 11: AI Evidence and RAG Evidence have distinct concerns...');
  // AI Evidence teaches concept and takeaway
  assert(Boolean(aiEvidenceHigh[0]?.keyTakeaway), 'AI Evidence focuses on key takeaway');
  assert(Boolean(aiEvidenceHigh[0]?.shortExplanation), 'AI Evidence focuses on technical explanation');

  // RAG Evidence demonstrates observed signals and concrete failure mechanism
  assert(Boolean(ragEvidence[0]?.observedSignal), 'RAG Evidence focuses on observed signals');
  assert(Boolean(ragEvidence[0]?.failureMechanism), 'RAG Evidence focuses on failure mechanism');
  assert(Boolean(ragEvidence[0]?.evidenceType), 'RAG Evidence categorizes direct code vs analogy');
  assert.notStrictEqual(aiEvidenceHigh[0]?.shortExplanation, ragEvidence[0]?.failureMechanism, 'Must not duplicate text');
  console.log('  ✓ Pass: AI Evidence and RAG Evidence maintain distinct schemas and roles.');

  // ─── Test 12: Maximum Iteration Limit Enforced ───────────────────────────────
  console.log('Test 12: Strict 3-iteration limit enforced...');
  const alwaysFailingPlan = planRetrieval('query', null, preliminaryCause, [], 3);
  const boundedResult = await correctRetrievalIfNeeded(
    alwaysFailingPlan,
    'user_test',
    null,
    preliminaryCause,
    [],
    [] // Always empty to force loop
  );
  assert(boundedResult.iterationsRun <= 3, `Iterations run ${boundedResult.iterationsRun} must be <= 3`);
  console.log('  ✓ Pass: Iteration count strictly bounded to <= 3.');

  // ─── Test 13: Evaluation Metrics Calculated Correctly ─────────────────────────
  console.log('Test 13: Evaluation metrics calculated accurately...');
  const retrievedIds = ['doc1', 'doc2', 'doc3', 'doc4'];
  const groundTruth = ['doc1', 'doc3'];

  const pAt2 = calculatePrecisionAtK(retrievedIds, groundTruth, 2);
  assert.strictEqual(pAt2, 0.5, 'Precision@2 of [doc1, doc2] with truth [doc1, doc3] must be 0.5');

  const rAt2 = calculateRecallAtK(retrievedIds, groundTruth, 2);
  assert.strictEqual(rAt2, 0.5, 'Recall@2 must be 1/2 = 0.5');

  const pAt4 = calculatePrecisionAtK(retrievedIds, groundTruth, 4);
  assert.strictEqual(pAt4, 0.5, 'Precision@4 of [doc1, doc2, doc3, doc4] must be 2/4 = 0.5');

  const rAt4 = calculateRecallAtK(retrievedIds, groundTruth, 4);
  assert.strictEqual(rAt4, 1.0, 'Recall@4 must be 2/2 = 1.0');

  const mrr = calculateMRR(retrievedIds, groundTruth);
  assert.strictEqual(mrr, 1.0, 'First relevant item is at rank 1, so MRR must be 1.0');

  const ndcg = calculateNDCGAtK(retrievedIds, groundTruth, 3);
  assert(ndcg > 0.8 && ndcg <= 1.0, `nDCG@3 must be high for rank 1 and 3 hits (got: ${ndcg})`);

  const fullEval = evaluateRetrieval(['doc2', 'doc4'], retrievedIds, groundTruth, ['distractor1'], 3);
  assert(fullEval.correctiveRetrievalGain.precisionDelta >= 0, 'Gain must measure improvement');
  console.log('  ✓ Pass: P@K, R@K, MRR, nDCG, and gain metrics verified.');

  // ─── Test 14: End-to-End Compatibility of Orchestrator Output ────────────────
  console.log('Test 14: Agentic diagnosis engine orchestrator integration...');
  const fullOutput = await executeAgenticDiagnosis({
    userId: 'user_integ_test',
    userQuery: 'why does my binary search fail on boundary',
    submission: mockSubmission,
  });

  assert(Boolean(fullOutput.primaryWeaknessId), 'Must have primaryWeaknessId');
  assert(Boolean(fullOutput.primaryWeaknessName), 'Must have primaryWeaknessName');
  assert(typeof fullOutput.confidence === 'number' && fullOutput.confidence > 0, 'Confidence must be positive number');
  assert(Array.isArray(fullOutput.aiEvidence) && fullOutput.aiEvidence.length > 0, 'Must produce aiEvidence array');
  assert(Array.isArray(fullOutput.ragEvidence) && fullOutput.ragEvidence.length > 0, 'Must produce ragEvidence array');
  assert(Boolean(fullOutput.retrievalMetadata.plan), 'Must include retrieval plan in metadata');
  assert(Boolean(fullOutput.verificationMetadata), 'Must include verification metadata');
  assert(fullOutput.retrievalMetadata.iterations <= 3, 'Iterations must be <= 3');
  console.log('  ✓ Pass: Full end-to-end engine orchestrator produces complete, compatible response.\n');

  console.log('🎉 ALL 14 AGENTIC RAG & CRAG ENGINE ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
}

runAllTests().catch(err => {
  console.error('❌ Agentic engine test failed:', err);
  process.exit(1);
});
