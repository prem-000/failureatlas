/**
 * GET /api/learning-sheet
 *
 * Retrieves a list of cached learning sheets.
 *
 * Query Parameters:
 * - category?: string
 * - limit?: number (default 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import type { SheetCategory, Difficulty } from '@/types/learning-sheet';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const bookmarkedOnly = searchParams.get('bookmarked') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    logger.info('🎯 Fetching learning sheets list', { userId: session.id, category, bookmarkedOnly, limit });

    // Build filter query
    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (bookmarkedOnly) {
      where.userId = session.id;
      where.bookmarked = true;
    } else {
      where.userId = null;
    }

    const sheets = await prisma.learningSheet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const data = sheets.map((s) => ({
      id: s.id,
      topic: s.topic,
      slug: s.slug,
      category: s.category as SheetCategory,
      difficulty: s.difficulty as Difficulty,
      language: s.language,
      version: s.version,
      hash: s.hash,
      generatedBy: s.generatedBy,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('❌ Error fetching learning sheets list:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retrieve learning sheets',
        },
      },
      { status: 500 }
    );
  }
}
