// src/app/api/submissions/[id]/explain/route.ts
// POST /api/submissions/:id/explain  → generate (or regenerate) a FailureExplanation
// GET  /api/submissions/:id/explain  → return cached FailureExplanation

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId, unauthorizedResponse } from "@/lib/auth/resolve-user";
import { myersDiff } from "@/lib/analysis/myers-diff";
import { parseBehavioralSignals } from "@/lib/analysis/behavioral";
import { computeWeaknessPageRank } from "@/lib/graph/pagerank";
import { retrieveSimilarFailures } from "@/lib/rag/retrieval";
import { generateFailureExplanation, type ExplanationEngineInput } from "@/lib/explanation/engine";
import type { SubmissionEvent, BehavioralSignal, RootCauseHypothesis } from "@/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ─── GET: Return cached explanation ──────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveUserId(request);
  if (!auth.userId) return unauthorizedResponse(auth.error ?? "Authentication required.");

  const { id: submissionId } = await params;

  try {
    const submission = await prisma.submissionEvent.findFirst({
      where: {
        OR: [{ id: submissionId }, { eventId: submissionId }],
        userId: auth.userId,
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Submission not found." } },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const explanation = await prisma.failureExplanation.findUnique({
      where: { submissionId: submission.id },
    });

    if (!explanation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "No explanation generated yet. POST to this endpoint to trigger generation.",
          },
        },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data: serializeExplanation(explanation) },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error("[/explain GET] Error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err?.message ?? "Unknown error" } },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ─── POST: Generate or regenerate explanation ─────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await resolveUserId(request);
  if (!auth.userId) return unauthorizedResponse(auth.error ?? "Authentication required.");

  const { id: submissionId } = await params;
  const userId = auth.userId;

  let forceRegenerate = false;
  try {
    const body = await request.json();
    forceRegenerate = Boolean(body?.force);
  } catch {
    // empty body is fine
  }

  try {
    // 1. Fetch submission + all evidence + network data
    const submission = await prisma.submissionEvent.findFirst({
      where: {
        OR: [{ id: submissionId }, { eventId: submissionId }],
        userId,
      },
      include: {
        problem: true,
        evidence: { include: { rootCauseHypotheses: true } },
        networkEvidence: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Submission not found." } },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // 2. Return cached if available (unless force=true)
    if (!forceRegenerate) {
      const cached = await prisma.failureExplanation.findUnique({
        where: { submissionId: submission.id },
      });
      if (cached) {
        return NextResponse.json(
          { success: true, data: serializeExplanation(cached), cached: true },
          { headers: CORS_HEADERS }
        );
      }
    }

    // 3. Map to SubmissionEvent
    const mappedSubmission: SubmissionEvent = {
      version: submission.version,
      platform: submission.platform,
      externalSubmissionId: submission.externalSubmissionId,
      eventId: submission.eventId,
      sessionId: submission.sessionId,
      timestamp: submission.timestamp,
      problemSlug: submission.problem.slug,
      problemTitle: submission.problem.title,
      problemDifficulty: submission.problem.difficulty as any,
      problemTopics: submission.problem.topics,
      problemUrl: submission.problem.url ?? "",
      submissionStatus: submission.status as any,
      submissionLanguage: submission.language,
      submissionCode: submission.code,
      runtime: submission.runtime ?? undefined,
      memory: submission.memory ?? undefined,
      testCasesPassed: submission.testCasesPassed ?? undefined,
      totalTestCases: submission.totalTestCases ?? undefined,
      failedTestCase: submission.failedTestCase ?? undefined,
      timeSpent: submission.timeSpent,
      attemptNumber: submission.attemptNumber,
      rapidSubmission: submission.rapidSubmission,
    };

    // 4. Myers Diff vs previous attempt
    const prevSubmission = await prisma.submissionEvent.findFirst({
      where: {
        userId,
        problemId: submission.problemId,
        timestamp: { lt: submission.timestamp },
      },
      orderBy: { timestamp: "desc" },
    });

    const diffOps = prevSubmission
      ? myersDiff(prevSubmission.code, submission.code)
      : [];

    // 5. Behavioral signals
    const prevMapped: SubmissionEvent[] = prevSubmission
      ? [
          {
            version: prevSubmission.version,
            platform: prevSubmission.platform,
            externalSubmissionId: prevSubmission.externalSubmissionId,
            eventId: prevSubmission.eventId,
            sessionId: prevSubmission.sessionId,
            timestamp: prevSubmission.timestamp,
            problemSlug: submission.problem.slug,
            problemTitle: submission.problem.title,
            problemDifficulty: submission.problem.difficulty as any,
            problemTopics: submission.problem.topics,
            problemUrl: submission.problem.url ?? "",
            submissionStatus: prevSubmission.status as any,
            submissionLanguage: prevSubmission.language,
            submissionCode: prevSubmission.code,
            timeSpent: prevSubmission.timeSpent,
            attemptNumber: prevSubmission.attemptNumber,
            rapidSubmission: prevSubmission.rapidSubmission,
          },
        ]
      : [];

    const behavioralSignals: BehavioralSignal[] = parseBehavioralSignals(
      mappedSubmission,
      prevMapped
    );

    // 6. Extract hypotheses from persisted evidence
    const hypotheses: RootCauseHypothesis[] = submission.evidence
      .flatMap(ev => ev.rootCauseHypotheses)
      .map(h => ({
        rootCause: h.rootCauseType as any,
        name: h.name,
        confidence: h.confidence,
        evidence: [],
      }))
      .sort((a, b) => b.confidence - a.confidence);

    // 7. Weakness scores (non-fatal)
    let weaknessScores: any[] = [];
    try {
      weaknessScores = await computeWeaknessPageRank(userId);
    } catch { /* non-fatal */ }

    // 8. Similar failures (non-fatal)
    let similarFailures: any[] = [];
    try {
      similarFailures = await retrieveSimilarFailures(
        userId,
        submission.eventId,
        submission.problem.title,
        submission.problem.difficulty,
        submission.problem.topics,
        submission.status,
        submission.code,
        submission.failedTestCase ?? undefined
      );
    } catch { /* non-fatal */ }

    // 9. Historical pattern counts
    const historicalPatternCounts = await computeHistoricalPatternCounts(userId);

    // 10. Build engine input
    const ne = submission.networkEvidence;
    const engineInput: ExplanationEngineInput = {
      submission: mappedSubmission,
      networkVerdictRaw: ne?.verdict ?? null,
      networkFailedInput: ne?.failedTestcase ?? null,
      networkExpectedOutput: null,
      networkUserOutput: null,
      networkPassedTestcases: ne?.passedTestcases ?? null,
      networkTotalTestcases: ne?.totalTestcases ?? null,
      diffOps,
      behavioralSignals,
      hypotheses,
      similarFailures,
      weaknessScores,
      historicalPatternCounts,
    };

    // 11. Generate explanation
    const explanation = await generateFailureExplanation(engineInput);

    // 12. Upsert to DB
    const saved = await prisma.failureExplanation.upsert({
      where: { submissionId: submission.id },
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
        submissionId: submission.id,
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

    console.log("[/explain POST] Explanation saved for submission:", submission.id);

    return NextResponse.json(
      { success: true, data: serializeExplanation(saved) },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error("[/explain POST] Error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err?.message ?? "Unknown error" } },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeExplanation(row: any) {
  return {
    submissionId: row.submissionId,
    rootCause: row.rootCause,
    rootCauseCategory: row.rootCauseCategory,
    confidence: row.confidence,
    reason: row.reason,
    logicBreakdown: row.logicBreakdown,
    learningConcept: row.learningConcept,
    recommendation: row.recommendation,
    estimatedLearningTimeMinutes: row.estimatedLearningTimeMinutes,
    evidenceItems: row.evidenceItems ?? [],
    representativeTestCase: row.representativeTestCase ?? null,
    recurringPatterns: row.recurringPatterns ?? [],
    generatedAt:
      row.generatedAt instanceof Date
        ? row.generatedAt.toISOString()
        : row.generatedAt,
  };
}

async function computeHistoricalPatternCounts(
  userId: string
): Promise<Record<string, number>> {
  try {
    const hypotheses = await prisma.rootCauseHypothesis.findMany({
      where: { evidence: { submission: { userId } } },
      select: { rootCauseType: true },
    });

    const counts: Record<string, number> = {};
    for (const h of hypotheses) {
      counts[h.rootCauseType] = (counts[h.rootCauseType] ?? 0) + 1;
    }

    const LABEL_MAP: Record<string, string> = {
      "boundary-condition-error": "Boundary Condition",
      "algorithm-selection-mistake": "Algorithm Selection",
      "pattern-recognition-gap": "Algorithm Selection",
      "time-complexity-oversight": "Implementation Detail",
      "space-complexity-oversight": "Implementation Detail",
      "data-structure-mismatch": "HashMap Misuse",
      "implementation-detail-error": "Implementation Detail",
      "input-output-handling-error": "Edge Case",
    };

    const labeledCounts: Record<string, number> = {};
    for (const [rc, count] of Object.entries(counts)) {
      const label = LABEL_MAP[rc] ?? rc;
      labeledCounts[label] = (labeledCounts[label] ?? 0) + count;
    }

    return labeledCounts;
  } catch {
    return {};
  }
}