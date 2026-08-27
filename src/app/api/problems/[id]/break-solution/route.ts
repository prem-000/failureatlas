import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { runSolutionStressModel } from '@/lib/adversarial/solution-stress-model';

// POST /api/problems/[id]/break-solution
// Returns: detectedApproach, confidence, timeComplexity, spaceComplexity, expectedComplexity, optimalComplexity, sourceCodeBlocks, identifiedBreakpoints, progressiveHints, evidence
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { code, language, submissionId } = body;

    let submissionCode = code;
    let submissionLang = language;
    let problemTitle = id;
    let problemSlug = id;
    let problemDifficulty = 'Medium';
    let problemConstraints: string[] = [];
    let problemTopics: string[] = [];

    const submission = await prisma.submissionEvent.findFirst({
      where: {
        OR: [
          { id: submissionId || id },
          { eventId: submissionId || id },
          { problem: { slug: id } },
        ],
      },
      include: { problem: true },
      orderBy: { timestamp: 'desc' },
    });

    if (submission) {
      submissionCode = submissionCode || submission.code;
      submissionLang = submissionLang || submission.language;
      problemTitle = submission.problem.title;
      problemSlug = submission.problem.slug;
      problemDifficulty = submission.problem.difficulty;
      problemTopics = submission.problem.topics || [];
    } else {
      const problem = await prisma.problem.findFirst({
        where: {
          OR: [
            { slug: id },
            { id: id },
            { title: { equals: id, mode: 'insensitive' } },
          ],
        },
      });
      if (problem) {
        problemTitle = problem.title;
        problemSlug = problem.slug;
        problemDifficulty = problem.difficulty;
        problemTopics = problem.topics || [];
      }
    }

    if (!submissionCode) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Source code is required' } },
        { status: 400 }
      );
    }

    const sourceHash = crypto.createHash('sha256').update(submissionCode).digest('hex');

    const ssmResult = await runSolutionStressModel({
      code: submissionCode,
      language: submissionLang,
      problemTitle,
      problemSlug,
      problemDifficulty,
      problemConstraints: problemConstraints.length > 0 ? problemConstraints : undefined,
      problemTopics,
    });

    const { breakSolution, algorithm, complexity, invariants } = ssmResult;

    return NextResponse.json({
      success: true,
      data: {
        problemId: id,
        problemSlug,
        submissionId: submissionId || null,
        sourceHash,
        language: submissionLang || 'python',
        analysisVersion: '2.0.0',

        // Explicit breakdown payload fields
        detectedApproach: breakSolution.approach.detected,
        confidence: breakSolution.approach.confidence,
        timeComplexity: breakSolution.yourComplexity.time,
        spaceComplexity: breakSolution.yourComplexity.space,
        expectedComplexity: breakSolution.expectedComplexity,
        optimalComplexity: breakSolution.optimalPath.targetComplexity,

        sourceCodeBlocks: breakSolution.sourceCodeBlocks,
        codeWalkthrough: breakSolution.codeWalkthrough,
        identifiedBreakpoints: breakSolution.weaknessOrRisk.hasWeakness
          ? [
              {
                title: breakSolution.weaknessOrRisk.potentialIssue,
                evidence: breakSolution.weaknessOrRisk.evidence,
                impact: breakSolution.weaknessOrRisk.impact,
                direction: breakSolution.weaknessOrRisk.expectedDirection,
              },
            ]
          : [],
        progressiveHints: breakSolution.optimalPath.hints,
        evidence: {
          approachEvidence: algorithm.evidence,
          complexityEvidence: complexity.evidence,
          invariantsExtracted: invariants.map(i => i.condition),
        },

        // Nested payload for component backwards compatibility
        breakSolution,
      },
    });
  } catch (error) {
    console.error('❌ Error in /api/problems/[id]/break-solution:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Internal error' },
      },
      { status: 500 }
    );
  }
}
