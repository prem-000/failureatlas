// apps/web/src/app/api/submissions/route.ts
// Accepts submissions from BOTH:
//   - Web dashboard  → Authorization: Bearer <jwt>
//   - Chrome extension → X-API-Key: fa_...
//
// FIX: The original route ran the entire analysis pipeline synchronously before
// responding. If the database graph, embeddings, RAG, or AI diagnosis threw for ANY reason,
// the whole route returned 500 — even though the submission was already saved.
// The extension then treated it as a failure and queued the event locally,
// causing duplicates on retry.
//
// Now: save submission + evidence + Bayesian hypotheses → return 200 immediately
// → kick off the heavy pipeline (graph, embeddings, RAG, AI) in the background
// using a fire-and-forget pattern so a crash there never affects data ingestion.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';
import { myersDiff, computeDiffConfidence } from '@/lib/analysis/myers-diff';
import { structuralCodePatternAnalysis } from '@/lib/analysis/ast-diff';
import { delDashboardCache } from '@/lib/cache/dashboard';
import { delGraphCache } from '@/lib/cache/graph';
import { delRoadmapCache } from '@/lib/cache/roadmap';
import { getAnalysisCache, setAnalysisCache } from '@/lib/cache/analysis';
import { setProblemCache } from '@/lib/cache/problem';
import { parseBehavioralSignals } from '@/lib/analysis/behavioral';
import { runBayesianInference, BayesianEvidence } from '@/lib/inference/bayesian';
import { recordFailureEventInGraph } from '@/lib/graph/operations';
import { computeWeaknessPageRank, type WeaknessScore } from '@/lib/graph/pagerank';
import { saveTextEmbedding, buildFailureEmbeddingContent } from '@/lib/embeddings/pipeline';
import { retrieveSimilarFailures } from '@/lib/rag/retrieval';
import { generateAIDiagnosis, DIAGNOSIS_MODEL_VERSION } from '@/lib/diagnosis/generator';
import { createFingerprint } from '@/lib/fingerprint/fingerprint';
import { generateFailureExplanation, type ExplanationEngineInput } from '@/lib/explanation/engine';
import { upsertCodeEvidence } from '@/lib/interceptor/uploader';
import { isHighLatency } from '@/lib/interceptor/extractor';
import type { SubmissionEvent, Evidence, NormalizedSubmission } from '@/types';
import { checkAndCreatePracticeReview, addRecommendedProblemsToQueue } from '@/lib/practice-queue/scheduler';

// Realignment imports
import { getAdapter } from '@/platforms/registry';
import { validateSubmission } from '@/lib/validation/submission-validator';
import { mapASTChangesToEvidence, mapDiffToEvidence, combineEvidence } from '@/lib/analysis/evidence-mapper';
import { aggregateEvidence } from '@/lib/analysis/evidence-aggregator';
import { buildConceptChain } from '@/lib/analysis/concept-mapper';
import { computeSectionMastery, persistSectionMastery } from '@/lib/analysis/section-rollup';
import { buildDiagnosisContext } from '@/lib/context/builder';
import { generateRecommendations } from '@/lib/recommendation/engine';


export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// ─── GET /api/submissions ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await resolveUserId(request);
  if (!auth.userId) return unauthorizedResponse(auth.error || 'Authentication required.');
  const userId = auth.userId;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const problemSlug = searchParams.get('problemSlug');
    const status = searchParams.get('status');

    const whereQuery: any = { userId };
    if (problemSlug) whereQuery.problem = { slug: problemSlug };
    if (status) whereQuery.status = status;

    const [submissions, total] = await Promise.all([
      prisma.submissionEvent.findMany({
        where: whereQuery,
        take: limit,
        skip: offset,
        orderBy: { timestamp: 'desc' },
        include: { problem: true },
      }),
      prisma.submissionEvent.count({ where: whereQuery }),
    ]);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    };

    return NextResponse.json({
      success: true,
      submissions: submissions.map(sub => ({
        eventId: sub.eventId,
        problemSlug: sub.problem.slug,
        problemTitle: sub.problem.title,
        submissionStatus: sub.status,
        timestamp: sub.timestamp.getTime(),
        attemptNumber: sub.attemptNumber,
        hasAnalysis: true,
      })),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('❌ GET submissions error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve submissions' } },
      { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      } }
    );
  }
}

// ─── POST /api/submissions ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await resolveUserId(request);
  if (!auth.userId) return unauthorizedResponse(auth.error || 'Authentication required.');
  const userId = auth.userId;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
      { status: 400, headers: corsHeaders }
    );
  }

  // ── Realignment: Get Platform Adapter & Normalize ─────────────────────────
  const platform = body.platform || 'leetcode';
  let adapter;
  try {
    adapter = getAdapter(platform);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'UNSUPPORTED_PLATFORM', message: err.message } },
      { status: 400, headers: corsHeaders }
    );
  }

  let normalized: NormalizedSubmission;
  if (body.version === undefined) {
    // Treat as raw submission from old extension format and normalize it
    const raw: any = {
      submissionId: body.eventId || body.externalSubmissionId,
      slug: body.problemSlug || body.problemId,
      title: body.problemTitle || body.title,
      difficulty: body.problemDifficulty || 'Medium',
      topics: body.problemTopics || [],
      url: body.problemUrl || '',
      language: body.submissionLanguage || body.language,
      code: body.submissionCode || body.code,
      status: body.submissionStatus || body.status,
      runtime: body.runtime,
      memory: body.memory,
      timestamp: body.timestamp ? new Date(body.timestamp).getTime() : Date.now(),
      testCasesPassed: body.testCasesPassed,
      totalTestCases: body.totalTestCases,
      failedTestCase: body.failedTestCase,
    };
    normalized = adapter.normalize(raw);
  } else {
    normalized = body as NormalizedSubmission;
  }

  // ── Submission Validator ───────────────────────────────────────────────────
  const validation = validateSubmission(normalized, adapter.capabilities());
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.errors } },
      { status: 400, headers: corsHeaders }
    );
  }

  const { eventId, sessionId, timeSpent, attemptNumber, rapidSubmission, submissionTraceId } = body;

  try {
    // ── Deduplicate by eventId ────────────────────────────────────────────────
    const checkEventId = eventId || normalized.externalSubmissionId || `ev-${Date.now()}`;
    const existing = await prisma.submissionEvent.findUnique({ where: { eventId: checkEventId } });
    if (existing) {
      return NextResponse.json(
        { success: true, submissionId: existing.id, analysisQueued: false, message: 'Already recorded.' },
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Upsert problem (needed for both dedup check and creation) ─────────────
    const problem = await prisma.problem.upsert({
      where: { slug: normalized.problemId },
      update: {
        title: normalized.title || normalized.problemId,
        difficulty: body.problemDifficulty || 'Medium',
        topics: body.problemTopics ?? [],
        url: body.problemUrl ?? null,
      },
      create: {
        slug: normalized.problemId,
        title: normalized.title || normalized.problemId,
        difficulty: body.problemDifficulty || 'Medium',
        topics: body.problemTopics ?? [],
        url: body.problemUrl ?? null,
      },
    });

    // Cache problem metadata
    await setProblemCache(problem.slug, problem);

    // ── Deduplicate by content: same user+problem+code+status within 60s ─────
    const sixtySecondsAgo = new Date(Date.now() - 60_000);
    const recentDupe = await prisma.submissionEvent.findFirst({
      where: {
        userId,
        problemId: problem.id,
        status: normalized.status,
        code: normalized.code,
        timestamp: { gte: sixtySecondsAgo },
      },
    });
    if (recentDupe) {
      return NextResponse.json(
        { success: true, submissionId: recentDupe.id, analysisQueued: false, message: 'Duplicate submission detected within 60s.' },
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Save submission — this is the critical write ──────────────────────────
    const subRecord = await prisma.submissionEvent.create({
      data: {
        userId,
        problemId: problem.id,
        eventId: checkEventId,
        submissionTraceId: submissionTraceId || checkEventId,
        sessionId: sessionId || 'session-unknown',
        timestamp: new Date(normalized.timestamp),
        status: normalized.status,
        language: normalized.language,
        code: normalized.code,
        runtime: normalized.runtime,
        memory: normalized.memory,
        testCasesPassed: normalized.testCasesPassed,
        totalTestCases: normalized.totalTestCases,
        failedTestCase: normalized.failedTestCase,
        timeSpent: timeSpent || 0,
        attemptNumber: attemptNumber || 1,
        rapidSubmission: rapidSubmission || false,
        version: normalized.version,
        platform: normalized.platform,
        externalSubmissionId: normalized.externalSubmissionId,
      },
    });

    // Invalidate Caches
    await delDashboardCache(userId);
    await delGraphCache(userId);
    if (normalized.status === 'Accepted') {
      await delRoadmapCache(userId);
      await checkAndCreatePracticeReview(userId, subRecord.problemId, subRecord.timestamp);
    }

    // ── Return 200 immediately — analysis runs async ──────────────────────────
    runAnalysisPipeline(userId, subRecord, problem, normalized, rapidSubmission || false).catch(err => {
      console.error(`⚠️ Analysis pipeline failed for submission ${subRecord.id}:`, err?.message ?? err);
    });

    return NextResponse.json({
      success: true,
      submissionId: subRecord.id,
      analysisQueued: true,
      message: 'Submission recorded. Analysis running in background.',
    }, { headers: corsHeaders });


  } catch (error: any) {
    console.error('❌ POST submission error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to record submission' } },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ─── Background analysis pipeline ────────────────────────────────────────────
// Runs AFTER the HTTP response has been sent. Any exception here is caught by
// the caller and logged — it never propagates to the route handler.
// ─── Background analysis pipeline ────────────────────────────────────────────
// Runs AFTER the HTTP response has been sent. Any exception here is caught by
// the caller and logged — it never propagates to the route handler.
async function runAnalysisPipeline(
  userId: string,
  subRecord: any,
  problem: any,
  normalized: NormalizedSubmission,
  rapidSubmission: boolean
) {
  const toSubmissionEvent = (s: any): SubmissionEvent => ({
    version: s.version,
    platform: s.platform,
    externalSubmissionId: s.externalSubmissionId,
    eventId: s.eventId,
    sessionId: s.sessionId,
    timestamp: s.timestamp,
    problemSlug: problem.slug,
    problemTitle: problem.title,
    problemDifficulty: problem.difficulty as any,
    problemTopics: problem.topics,
    problemUrl: problem.url || '',
    submissionStatus: s.status as any,
    submissionLanguage: s.language,
    submissionCode: s.code,
    runtime: s.runtime ?? undefined,
    memory: s.memory ?? undefined,
    testCasesPassed: s.testCasesPassed ?? undefined,
    totalTestCases: s.totalTestCases ?? undefined,
    failedTestCase: s.failedTestCase ?? undefined,
    timeSpent: s.timeSpent,
    attemptNumber: s.attemptNumber,
    rapidSubmission: s.rapidSubmission,
  });

  const mappedCurrent = toSubmissionEvent(subRecord);

  // Previous attempts for diffing (exclude current row)
  const previousSubmissions = await prisma.submissionEvent.findMany({
    where: {
      userId,
      problemId: problem.id,
      id: { not: subRecord.id },
    },
    orderBy: { timestamp: 'desc' },
    take: 5,
  });
  const mappedPrevious = previousSubmissions.map(toSubmissionEvent);
  const lastAttempt = mappedPrevious[0];

  // ── Code-diff evidence ────────────────────────────────────────────────────
  let hasBoundaryDiff = false;
  let hasStructuralBoundaryChange = false;
  let hasAlgorithmRewrite = false;
  let hasDataStructureChange = false;
  let hasImplementationDetailChange = false;

  const evidencesToCreate: Array<{
    type: string;
    description: string;
    confidence: number;
    source: string;
    rawData: any;
  }> = [];

  let astEvidence: any[] = [];
  let diffEvidence: any[] = [];

  if (lastAttempt) {
    const diffOps = myersDiff(lastAttempt.submissionCode, mappedCurrent.submissionCode);
    const diffConfidence = computeDiffConfidence(diffOps);
    const changesCount = diffOps.filter(o => o.type !== 'EQUAL').length;
    hasBoundaryDiff = diffOps.some(o => o.type !== 'EQUAL' && /[<>=!+\-]/.test(o.content));

    diffEvidence = mapDiffToEvidence(diffOps);

    const astChanges = structuralCodePatternAnalysis(
      lastAttempt.submissionCode,
      mappedCurrent.submissionCode
    );
    astEvidence = mapASTChangesToEvidence(astChanges);

    for (const ch of astChanges) {
      if (ch.type === 'BOUNDARY_CONDITION_CHANGE') hasStructuralBoundaryChange = true;
      if (ch.type === 'ALGORITHM_REWRITE') hasAlgorithmRewrite = true;
      if (ch.type === 'DATA_STRUCTURE_CHANGE') hasDataStructureChange = true;
      if (ch.type === 'IMPLEMENTATION_DETAIL') hasImplementationDetailChange = true;
    }

    // Persist CodeEvidence row (typed table)
    upsertCodeEvidence(subRecord.id, {
      previousCode: lastAttempt.submissionCode,
      currentCode:  mappedCurrent.submissionCode,
      diff:         diffOps.map(o => `${o.type[0]}${o.content}`).join('\n'),
      changedLines: changesCount,
      confidence:   diffConfidence,
    }).catch(e => console.warn('⚠️ CodeEvidence upsert failed (non-fatal):', e?.message));
  }

  // Combine and deduplicate evidence from AST & Myers diff
  const codeEvidence = combineEvidence(astEvidence, diffEvidence);
  for (const ev of codeEvidence) {
    evidencesToCreate.push({
      type: ev.type,
      description: ev.description,
      confidence: ev.confidence,
      source: ev.source,
      rawData: ev.rawChange || {},
    });
  }

  // ── Behavioral evidence ───────────────────────────────────────────────────
  let hasRapidResubmission = false;
  let hasLongGap = false;
  let hasManyMinorChanges = false;

  for (const sig of parseBehavioralSignals(mappedCurrent, mappedPrevious)) {
    if (sig.type === 'rapid_resubmission') hasRapidResubmission = true;
    if (sig.type === 'long_gap') hasLongGap = true;
    if (sig.type === 'many_minor_changes') hasManyMinorChanges = true;
    evidencesToCreate.push({
      type: 'behavioral',
      description: `${sig.type} (${sig.confidence.toFixed(2)})`,
      confidence: sig.confidence,
      source: 'behavioral-parser',
      rawData: sig,
    });
  }

  // ── Test failure evidence ─────────────────────────────────────────────────
  if (mappedCurrent.submissionStatus !== 'Accepted') {
    evidencesToCreate.push({
      type: 'test_failure',
      description: `${mappedCurrent.submissionStatus} — passed ${mappedCurrent.testCasesPassed ?? 0}/${mappedCurrent.totalTestCases ?? 0}`,
      confidence: 0.95,
      source: 'platform-verdict',
      rawData: {
        verdict: mappedCurrent.submissionStatus,
        passed: mappedCurrent.testCasesPassed,
        total: mappedCurrent.totalTestCases,
        failedCase: mappedCurrent.failedTestCase,
      },
    });
  }

  // ── Persist evidence rows ─────────────────────────────────────────────────
  const createdEvidences: Evidence[] = [];
  for (const ev of evidencesToCreate) {
    const dbEv = await prisma.evidence.create({
      data: { submissionId: subRecord.id, ...ev },
    });
    createdEvidences.push({
      evidenceId: dbEv.id,
      type: dbEv.type as any,
      description: dbEv.description,
      confidence: dbEv.confidence,
      source: dbEv.source,
      rawData: dbEv.rawData as any,
      extractedAt: dbEv.extractedAt,
    });
  }

  // ── Evidence Aggregator ───────────────────────────────────────────────────
  const evidenceObjects = createdEvidences.map(e => ({
    type: e.type as any,
    description: e.description,
    confidence: e.confidence,
    source: e.source as any,
    rawData: e.rawData as any,
    extractedAt: e.extractedAt,
  }));
  const aggregated = aggregateEvidence(evidenceObjects);

  // ── Bayesian root cause inference ─────────────────────────────────────────
  const networkEv = await prisma.networkEvidence.findUnique({
    where: { submissionId: subRecord.id },
  });

  const bayesEvidence: BayesianEvidence = {
    hasBoundaryDiff,
    hasStructuralBoundaryChange,
    hasAlgorithmRewrite,
    hasDataStructureChange,
    hasImplementationDetailChange,
    hasRapidResubmission,
    hasLongGap,
    hasManyMinorChanges,
    verdict: mappedCurrent.submissionStatus,
    failedTestCase: mappedCurrent.failedTestCase || undefined,
    hasHighLatency:     networkEv ? isHighLatency(networkEv.latencyMs)                    : undefined,
    hasRetries:         networkEv ? networkEv.retryCount > 0                               : undefined,
    hasTLEFromRuntime:  networkEv ? networkEv.verdict === 'Time Limit Exceeded'            : undefined,
    hasMLE:             networkEv ? networkEv.verdict === 'Memory Limit Exceeded'           : undefined,
    failedTestcaseRatio: networkEv?.passedTestcases != null && networkEv?.totalTestcases
      ? networkEv.passedTestcases / Math.max(networkEv.totalTestcases, 1)
      : undefined,
  };
  const hypotheses = runBayesianInference(bayesEvidence);

  for (const hyp of hypotheses) {
    await prisma.rootCauseHypothesis.create({
      data: {
        evidenceId: createdEvidences[0]?.evidenceId ?? null,
        rootCauseType: hyp.rootCause,
        name: hyp.name,
        confidence: hyp.confidence,
      },
    });
  }

  // ── Database graph + PageRank ────────────────────────────────────────────────
  try {
    await recordFailureEventInGraph(userId, mappedCurrent, hypotheses, createdEvidences);
  } catch (e: any) {
    console.warn('⚠️ Graph write failed (non-fatal):', e?.message);
  }

  let pageRankScores: WeaknessScore[] = [];
  try {
    pageRankScores = await computeWeaknessPageRank(userId);
  } catch (e: any) {
    console.warn('⚠️ PageRank computation failed (non-fatal):', e?.message);
  }

  // ── Section Rollup ────────────────────────────────────────────────────────
  try {
    await persistSectionMastery(prisma, userId);
  } catch (e: any) {
    console.warn('⚠️ Section mastery rollup failed (non-fatal):', e?.message);
  }

  // ── Embeddings ────────────────────────────────────────────────────────────
  try {
    await saveTextEmbedding(
      buildFailureEmbeddingContent(
        mappedCurrent.problemTitle,
        mappedCurrent.problemDifficulty,
        mappedCurrent.problemTopics,
        mappedCurrent.submissionStatus,
        mappedCurrent.submissionCode,
        mappedCurrent.failedTestCase || undefined
      ),
      'SubmissionEvent',
      subRecord.id
    );
  } catch (e: any) {
    console.warn('⚠️ Embedding save failed (non-fatal):', e?.message);
  }

  // ── RAG retrieval + AI diagnosis ──────────────────────────────────────────
  try {
    const { fingerprint, codeHash } = createFingerprint({
      userId,
      problemSlug: problem.slug,
      language: mappedCurrent.submissionLanguage,
      status: mappedCurrent.submissionStatus,
      code: mappedCurrent.submissionCode
    });

    let cachedDiagnosis: any = await getAnalysisCache(fingerprint);
    if (!cachedDiagnosis) {
      cachedDiagnosis = await prisma.diagnosisResult.findUnique({
        where: { fingerprint },
        include: {
          primaryWeakness: true,
          recommendations: { include: { strategy: true } }
        }
      });
      if (cachedDiagnosis) {
        await setAnalysisCache(fingerprint, cachedDiagnosis);
      }
    }

    if (cachedDiagnosis && cachedDiagnosis.modelVersion === DIAGNOSIS_MODEL_VERSION) {
      console.log(`[CACHE HIT] Found existing diagnosis for fingerprint ${fingerprint}. Linking to submission ${subRecord.id}`);
      const updated = await prisma.diagnosisResult.update({
        where: { id: cachedDiagnosis.id },
        data: { submissionId: subRecord.id },
        include: {
          primaryWeakness: true,
          recommendations: { include: { strategy: true } }
        }
      });
      await setAnalysisCache(fingerprint, updated);
    } else {
      const similarFailures = await retrieveSimilarFailures(
        userId, subRecord.eventId,
        mappedCurrent.problemTitle, mappedCurrent.problemDifficulty,
        mappedCurrent.problemTopics, mappedCurrent.submissionStatus,
        mappedCurrent.submissionCode, mappedCurrent.failedTestCase || undefined
      );

      // ── Context Builder (pure assembly) ────────────────────────────────────
      const sectionMastery = await computeSectionMastery(prisma, userId);
      const conceptChain = buildConceptChain(aggregated.dominant);

      const context = buildDiagnosisContext({
        submission: mappedCurrent,
        evidence: aggregated,
        rootCause: {
          type: hypotheses[0]?.rootCause ?? 'implementation-detail-error',
          name: hypotheses[0]?.name ?? 'Implementation Detail Error',
          confidence: hypotheses[0]?.confidence ?? 50,
        },
        weaknessScores: pageRankScores,
        sectionMastery,
        similarFailures,
        conceptChain,
      });

      // ── LLM Diagnosis ──────────────────────────────────────────────────────
      const aiDiagnosis = await generateAIDiagnosis(context);

      // ── Recommendation Engine ──────────────────────────────────────────────
      const recommendations = await generateRecommendations(prisma, {
        evidence: aggregated,
        sectionMastery,
        similarFailures,
        currentDifficulty: mappedCurrent.problemDifficulty,
        currentTopics: mappedCurrent.problemTopics,
        userId,
      });

      // ── Wire recommendations into SM2 queue ────────────────────────────────
      await addRecommendedProblemsToQueue(userId, recommendations);

      const primaryWeaknessNode = await prisma.systemicWeakness.upsert({
        where: { name: aiDiagnosis.primaryWeaknessId },
        update: {},
        create: {
          name: aiDiagnosis.primaryWeaknessId,
          type: aiDiagnosis.primaryWeaknessId,
          severity: 'high',
          confidence: aiDiagnosis.confidence / 100,
        },
      });

      let diagnosis;
      if (cachedDiagnosis) {
        diagnosis = await prisma.diagnosisResult.update({
          where: { fingerprint },
          data: {
            submissionId: subRecord.id,
            primaryWeaknessId: primaryWeaknessNode.id,
            modelVersion: DIAGNOSIS_MODEL_VERSION,
            diagnosisJson: aiDiagnosis as any,
            progressMetrics: {
              confidence: aiDiagnosis.confidence,
              reasoningChain: aiDiagnosis.reasoningChain,
            },
          }
        });
      } else {
        diagnosis = await prisma.diagnosisResult.upsert({
          where: { submissionId: subRecord.id },
          update: {
            primaryWeaknessId: primaryWeaknessNode.id,
            fingerprint,
            codeHash,
            modelVersion: DIAGNOSIS_MODEL_VERSION,
            diagnosisJson: aiDiagnosis as any,
            progressMetrics: {
              confidence: aiDiagnosis.confidence,
              reasoningChain: aiDiagnosis.reasoningChain,
            },
          },
          create: {
            userId,
            submissionId: subRecord.id,
            primaryWeaknessId: primaryWeaknessNode.id,
            fingerprint,
            codeHash,
            modelVersion: DIAGNOSIS_MODEL_VERSION,
            diagnosisJson: aiDiagnosis as any,
            progressMetrics: {
              confidence: aiDiagnosis.confidence,
              reasoningChain: aiDiagnosis.reasoningChain,
            },
          },
        });
      }

      await prisma.learningRecommendation.deleteMany({
        where: { diagnosisId: diagnosis.id }
      });

      for (const rec of aiDiagnosis.learningRecommendations) {
        const strategy = await prisma.learningStrategy.create({
          data: {
            weaknessId: primaryWeaknessNode.id,
            name: rec.name,
            description: rec.description,
            estimatedTime: rec.estimatedTime,
            priority: rec.priority,
            practiceProblems: rec.practiceProblems.map((p: any) => p.problemSlug ?? p),
          },
        });
        await prisma.learningRecommendation.create({
          data: { diagnosisId: diagnosis.id, strategyId: strategy.id, completed: false },
        });
      }

      const fullDiagnosis = await prisma.diagnosisResult.findUnique({
        where: { id: diagnosis.id },
        include: {
          primaryWeakness: true,
          recommendations: { include: { strategy: true } }
        }
      });
      if (fullDiagnosis) {
        await setAnalysisCache(fingerprint, fullDiagnosis);
      }
      
      await delRoadmapCache(userId);
    }
  } catch (e: any) {
    console.warn('⚠️ AI diagnosis failed (non-fatal):', e?.message);
  }

  // ── AI Failure Explanation Engine (auto-trigger for failed submissions) ────
  // Runs after all other pipeline steps. Non-fatal — never blocks the pipeline.
  if (normalized.status !== 'Accepted') {
    try {
      // Fetch hypotheses that were just persisted
      const persistedHypotheses = await prisma.rootCauseHypothesis
        .findMany({
          where: { evidence: { submission: { id: subRecord.id } } },
          select: { rootCauseType: true, name: true, confidence: true },
        })
        .then(rows =>
          rows.map(r => ({
            rootCause: r.rootCauseType as any,
            name: r.name,
            confidence: r.confidence,
            evidence: [],
          }))
        );

      // Fetch network evidence
      const networkEv = await prisma.networkEvidence.findUnique({
        where: { submissionId: subRecord.id },
      });

      // Historical pattern counts
      const rawHypotheses = await prisma.rootCauseHypothesis.findMany({
        where: { evidence: { submission: { userId } } },
        select: { rootCauseType: true },
      });
      const LABEL_MAP: Record<string, string> = {
        'boundary-condition-error': 'Boundary Condition',
        'algorithm-selection-mistake': 'Algorithm Selection',
        'pattern-recognition-gap': 'Algorithm Selection',
        'time-complexity-oversight': 'Implementation Detail',
        'space-complexity-oversight': 'Implementation Detail',
        'data-structure-mismatch': 'HashMap Misuse',
        'implementation-detail-error': 'Implementation Detail',
        'input-output-handling-error': 'Edge Case',
      };
      const historicalPatternCounts: Record<string, number> = {};
      for (const h of rawHypotheses) {
        const label = LABEL_MAP[h.rootCauseType] ?? h.rootCauseType;
        historicalPatternCounts[label] = (historicalPatternCounts[label] ?? 0) + 1;
      }

      const engineInput: ExplanationEngineInput = {
        submission: {
          ...mappedCurrent,
          testCasesPassed: normalized.testCasesPassed ?? undefined,
          totalTestCases: normalized.totalTestCases ?? undefined,
          failedTestCase: normalized.failedTestCase ?? undefined,
        },
        networkVerdictRaw: networkEv?.verdict ?? null,
        networkFailedInput: networkEv?.failedTestcase ?? null,
        networkExpectedOutput: null,
        networkUserOutput: null,
        networkPassedTestcases: networkEv?.passedTestcases ?? null,
        networkTotalTestcases: networkEv?.totalTestcases ?? null,
        diffOps: [], // already handled by main pipeline; no re-diff needed
        behavioralSignals: [],
        hypotheses: persistedHypotheses,
        similarFailures: [],
        weaknessScores: [],
        historicalPatternCounts,
      };

      const explanation = await generateFailureExplanation(engineInput);

      await prisma.failureExplanation.upsert({
        where: { submissionId: subRecord.id },
        update: {
          rootCause: explanation.rootCause,
          rootCauseCategory: explanation.rootCauseCategory,
          confidence: explanation.confidence,
          reason: explanation.reason,
          logicBreakdown: explanation.logicBreakdown,
          learningConcept: explanation.learningConcept,
          recommendation: explanation.recommendation,
          estimatedLearningTimeMinutes: explanation.estimatedLearningTimeMinutes,
          evidenceItems: explanation.evidenceItems as any,
          representativeTestCase: explanation.representativeTestCase as any,
          recurringPatterns: explanation.recurringPatterns as any,
          generatedAt: new Date(explanation.generatedAt),
        },
        create: {
          submissionId: subRecord.id,
          rootCause: explanation.rootCause,
          rootCauseCategory: explanation.rootCauseCategory,
          confidence: explanation.confidence,
          reason: explanation.reason,
          logicBreakdown: explanation.logicBreakdown,
          learningConcept: explanation.learningConcept,
          recommendation: explanation.recommendation,
          estimatedLearningTimeMinutes: explanation.estimatedLearningTimeMinutes,
          evidenceItems: explanation.evidenceItems as any,
          representativeTestCase: explanation.representativeTestCase as any,
          recurringPatterns: explanation.recurringPatterns as any,
          generatedAt: new Date(explanation.generatedAt),
        },
      });
    } catch (e: any) {
      console.warn('⚠️ Failure explanation generation failed (non-fatal):', e?.message);
    }
  }
}