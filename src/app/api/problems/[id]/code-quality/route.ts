import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { runSolutionStressModel } from '@/lib/adversarial/solution-stress-model';

// POST /api/problems/[id]/code-quality
// Returns: 5 Problem-Aware Quality Dimensions with Provenance
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

    return NextResponse.json({
      success: true,
      data: {
        problemId: id,
        problemSlug,
        submissionId: submissionId || null,
        sourceHash,
        language: submissionLang || 'python',
        analysisVersion: '2.0.0',
        codeQuality: ssmResult.codeQuality,
      },
    });
  } catch (error) {
    console.error('❌ Error in /api/problems/[id]/code-quality:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Internal error' },
      },
      { status: 500 }
    );
  }
}
