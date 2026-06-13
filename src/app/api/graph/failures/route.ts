/**
 * GET /api/graph/failures?limit=50&days=30
 *
 * Returns recent failure submissions with associated evidence and root cause hypotheses.
 *
 * Response: { success, data: [{ id, eventId, problemTitle, problemSlug, difficulty,
 *   status, language, timestamp, attemptNumber, timeSpent,
 *   rootCauses: [{ type, name, confidence }],
 *   evidence: [{ type, description, confidence }]
 * }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 365);

    const minDate = new Date();
    minDate.setDate(minDate.getDate() - days);

    logger.info('📋 Fetching recent failures', { userId: session.id, limit, days });

    // Query SubmissionEvent with Evidence and RootCauseHypothesis
    const submissions = await prisma.submissionEvent.findMany({
      where: {
        userId: session.id,
        timestamp: { gte: minDate },
        NOT: { status: 'Accepted' },
      },
      include: {
        problem: true,
        evidence: {
          include: {
            rootCauseHypotheses: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const data = submissions.map((sub) => {
      // Collect all root cause hypotheses across all evidence
      const rootCauses = sub.evidence.flatMap((ev) => ev.rootCauseHypotheses);
      const topHyp = rootCauses.sort((a, b) => b.confidence - a.confidence)[0];

      // Collect evidence summaries
      const evidence = sub.evidence.map((ev) => ({
        type: ev.type,
        description: ev.description,
        confidence: ev.confidence,
        rawData: ev.rawData,
      }));

      return {
        id: sub.id,
        problemTitle: sub.problem.title,
        status: sub.status,
        rootCause: topHyp?.name || 'Unknown Root Cause',
        confidence: topHyp?.confidence || 0.5,
        timestamp: sub.timestamp.toISOString(),
        // Additional UI fields for rich display in feed and story drawer
        problemSlug: sub.problem.slug,
        difficulty: sub.problem.difficulty,
        attemptNumber: sub.attemptNumber,
        timeSpent: sub.timeSpent,
        failedTestCase: sub.failedTestCase,
        code: sub.code,
        language: sub.language,
        rootCauses: rootCauses.map(h => ({ type: h.rootCauseType, name: h.name, confidence: h.confidence })),
        evidence,
      };
    });

    logger.info('✅ Recent failures fetched', { count: data.length });

    return NextResponse.json(data);
  } catch (error) {
    logger.error('❌ Error fetching failures:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve failures',
      },
      { status: 500 }
    );
  }
}
