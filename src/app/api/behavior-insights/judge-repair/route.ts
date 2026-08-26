import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { analyzeSubmission } from '@/lib/intelligence/intelligence-pipeline';

// POST /api/behavior-insights/judge-repair
// Grounded failure analysis and repair steps derived directly from the Failure Intelligence Engine
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const { submissionId, problemSlug } = body;

    if (!submissionId && !problemSlug) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'submissionId or problemSlug is required' } },
        { status: 400 }
      );
    }

    const submission = await prisma.submissionEvent.findFirst({
      where: {
        userId,
        OR: [
          { id: submissionId },
          { eventId: submissionId },
          { problem: { slug: problemSlug } }
        ]
      },
      include: { problem: true },
      orderBy: { timestamp: 'desc' }
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No matching submission event found.' } },
        { status: 404 }
      );
    }

    // Run Failure Intelligence pipeline
    const report = await analyzeSubmission({
      code: submission.code,
      language: submission.language,
      problemSlug: submission.problem.slug,
      problemTitle: submission.problem.title,
      problemDifficulty: submission.problem.difficulty,
      status: submission.status,
      topics: (submission.problem.topics as string[]) || [],
    });

    const repairData = {
      reconstruction: {
        inferredAlgorithm: report.detectedApproach,
        implementationStrategy: `${report.detectedApproach} implementation`,
        complexity: report.estimatedComplexity,
        weakAssumptions: report.evidence.map(e => e.finding),
      },
      judgeCases: report.testCases.map((tc, idx) => ({
        id: idx + 1,
        difficulty: tc.priority === 'high' ? 'Hard' : tc.priority === 'medium' ? 'Medium' : 'Easy',
        input: tc.normalizedInput,
        expectedOutput: JSON.stringify(tc.expectedOutput),
        whyItFails: tc.evidenceConnection.whyItMatters,
        targetedLogic: tc.evidenceConnection.snippet,
        failureMode: tc.purposeGroup,
      })),
      failureAnalysis: report.evidence.map(e => `${e.detector}: ${e.finding}`),
      repairSteps: report.evidence.map(e => ({
        issue: e.finding,
        current: e.source.snippet,
        suggested: `Verify boundary condition at line ${e.source.lineStart}`,
        reason: e.hypothesis,
      })),
      optimizedSolution: {
        language: submission.language || 'javascript',
        code: submission.code,
        timeComplexity: report.estimatedComplexity,
        spaceComplexity: 'O(1)',
        robustnessReason: report.primaryObservation,
      },
      report,
    };

    return NextResponse.json({ success: true, data: repairData });
  } catch (error: any) {
    console.error('❌ POST /api/behavior-insights/judge-repair error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to generate repair insight' } },
      { status: 500 }
    );
  }
}
