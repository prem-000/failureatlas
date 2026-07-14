/**
 * POST /api/learning-sheet/bookmark
 *
 * Toggles bookmark status of a learning sheet for the current user.
 *
 * Request Body:
 * {
 *   "topic": string,
 *   "difficulty": "fundamentals" | "interview" | "expert",
 *   "bookmarked": boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { slugifyTopic } from '@/lib/learning-sheet/topic-registry';
import { PROMPT_VERSION } from '@/lib/learning-sheet/prompts';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    const userId = session.id;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON request body' } },
        { status: 400 }
      );
    }

    const { topic, difficulty, bookmarked } = body;
    if (!topic || !difficulty) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Topic and difficulty are required' } },
        { status: 400 }
      );
    }

    logger.info('⭐ Toggling cheatsheet bookmark', { userId, topic, difficulty, bookmarked });

    if (bookmarked) {
      // Find global sheet to clone from
      const globalSheet = await prisma.learningSheet.findFirst({
        where: {
          topic,
          difficulty,
          userId: null,
        },
      });

      if (!globalSheet) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Global sheet not found' } },
          { status: 404 }
        );
      }

      const userSlug = `usr-${userId}-${slugifyTopic(topic)}-${difficulty}-${globalSheet.language.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-pv${PROMPT_VERSION}`;

      const savedSheet = await prisma.learningSheet.upsert({
        where: { slug: userSlug },
        update: {
          bookmarked: true,
        },
        create: {
          userId,
          topic,
          slug: userSlug,
          category: globalSheet.category,
          difficulty: globalSheet.difficulty,
          language: globalSheet.language,
          version: PROMPT_VERSION,
          json: globalSheet.json as any,
          hash: globalSheet.hash,
          generatedBy: globalSheet.generatedBy,
          bookmarked: true,
        },
      });

      return NextResponse.json({
        success: true,
        bookmarked: true,
        data: savedSheet,
      });
    } else {
      // Unbookmarking: delete user-specific duplicate row to fallback to global sheet
      await prisma.learningSheet.deleteMany({
        where: {
          topic,
          difficulty,
          userId,
        },
      });

      return NextResponse.json({
        success: true,
        bookmarked: false,
      });
    }
  } catch (error) {
    logger.error('❌ Failed to toggle bookmark:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to toggle bookmark',
        },
      },
      { status: 500 }
    );
  }
}
