import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { myersDiff } from '@/lib/analysis/myers-diff';

// GET /api/submissions/[id]
// Returns full detail for a single submission including evidence, hypotheses, diagnosis,
// and code evolution diff against the previous attempt on the same problem.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || undefined);
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Missing Authorization token' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHORIZATION_FAILED', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }
    const userId = payload.userId;
    const { id } = await params;

    const submission = await prisma.submissionEvent.findFirst({
      where: {
        userId,
        OR: [{ id }, { eventId: id }],
      },
      include: {
        problem: true,
        evidence: true,
        diagnosis: {
          include: {
            primaryWeakness: {
              include: { strategies: true },
            },
            recommendations: {
              include: { strategy: true },
            },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Submission not found' } },
        { status: 404 }
      );
    }

    const hypotheses = await prisma.rootCauseHypothesis.findMany({
      where: {
        evidenceId: { in: submission.evidence.map((e) => e.id) },
      },
      orderBy: { confidence: 'desc' },
    });

    const previousSubmission = await prisma.submissionEvent.findFirst({
      where: {
        userId,
        problemId: submission.problemId,
        timestamp: { lt: submission.timestamp },
      },
      orderBy: { timestamp: 'desc' },
    });

    let codeDiff: Array<{ type: string; content: string }> = [];
    if (previousSubmission) {
      codeDiff = myersDiff(previousSubmission.code, submission.code);
    }

    const diagnosisResult = submission.diagnosis;

    return NextResponse.json({
      success: true,
      data: {
        submission: {
          id: submission.id,
          eventId: submission.eventId,
          status: submission.status,
          language: submission.language,
          code: submission.code,
          runtime: submission.runtime,
          memory: submission.memory,
          testCasesPassed: submission.testCasesPassed,
          totalTestCases: submission.totalTestCases,
          failedTestCase: submission.failedTestCase,
          attemptNumber: submission.attemptNumber,
          timeSpent: submission.timeSpent,
          timestamp: submission.timestamp.toISOString(),
          problem: {
            id: submission.problem.id,
            slug: submission.problem.slug,
            title: submission.problem.title,
            difficulty: submission.problem.difficulty,
            topics: submission.problem.topics,
            url: submission.problem.url,
          },
        },
        previousSubmission: previousSubmission
          ? {
              id: previousSubmission.id,
              eventId: previousSubmission.eventId,
              status: previousSubmission.status,
              code: previousSubmission.code,
              timestamp: previousSubmission.timestamp.toISOString(),
              attemptNumber: previousSubmission.attemptNumber,
            }
          : null,
        codeDiff,
        evidences: submission.evidence.map((ev) => ({
          id: ev.id,
          type: ev.type,
          description: ev.description,
          confidence: ev.confidence,
          source: ev.source,
          extractedAt: ev.extractedAt.toISOString(),
        })),
        rootCauseHypotheses: hypotheses.map((h) => ({
          id: h.id,
          rootCauseType: h.rootCauseType,
          name: h.name,
          confidence: h.confidence,
        })),
        diagnosis: diagnosisResult
          ? {
              id: diagnosisResult.id,
              primaryWeakness: diagnosisResult.primaryWeakness
                ? {
                    id: diagnosisResult.primaryWeakness.id,
                    name: diagnosisResult.primaryWeakness.name,
                    type: diagnosisResult.primaryWeakness.type,
                    severity: diagnosisResult.primaryWeakness.severity,
                    confidence: diagnosisResult.primaryWeakness.confidence,
                  }
                : null,
              progressMetrics: diagnosisResult.progressMetrics,
              recommendations: diagnosisResult.recommendations.map((r) => ({
                id: r.id,
                completed: r.completed,
                strategy: r.strategy
                  ? {
                      id: r.strategy.id,
                      name: r.strategy.name,
                      description: r.strategy.description,
                      estimatedTime: r.strategy.estimatedTime,
                      priority: r.strategy.priority,
                      practiceProblems: r.strategy.practiceProblems,
                    }
                  : null,
              })),
            }
          : null,
      },
    });
  } catch (error) {
    console.error('❌ GET /api/submissions/[id] error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve submission details' } },
      { status: 500 }
    );
  }
}
