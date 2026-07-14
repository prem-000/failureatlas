/**
 * POST /api/learning-sheet/generate
 *
 * Generates or retrieves a cached compact learning cheat sheet.
 *
 * Request Body:
 * {
 *   "topic": string,
 *   "difficulty": "fundamentals" | "interview" | "expert",
 *   "language": string (optional, default "English")
 * }
 *
 * Query Params:
 *   ?force=true — bypass DB cache and regenerate (explicit user request)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { getCategoryForTopic, slugifyTopic } from '@/lib/learning-sheet/topic-registry';
import { buildPrompt, PROMPT_VERSION } from '@/lib/learning-sheet/prompts';
import { generateWithGemini, getGeminiModel } from '@/lib/gemini';
import { parseAndRepair, generateHash } from '@/lib/learning-sheet/parser';
import { safeRedisGet, safeRedisSet } from '@/lib/redis';
import type { Difficulty, SheetCategory } from '@/types/learning-sheet';

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
    // 1. Authenticate user
    const session = await auth(request);
    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    const userId = session.id;

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON request body' } },
        { status: 400 }
      );
    }

    const topic = body.topic?.trim();
    if (!topic) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Topic is required' } },
        { status: 400 }
      );
    }

    const difficulty = (body.difficulty || 'interview') as Difficulty;
    const language = body.language || 'English';

    // Supports explicit user-triggered regeneration via ?force=true
    const force = request.nextUrl.searchParams.get('force') === 'true';
    const category = getCategoryForTopic(topic);

    const globalSlug = `${slugifyTopic(topic)}-${difficulty}-${language.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-pv${PROMPT_VERSION}`;
    const userSlug = `usr-${userId}-${slugifyTopic(topic)}-${difficulty}-${language.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-pv${PROMPT_VERSION}`;

    logger.info('🧠 Processing learning sheet request', {
      userId,
      topic,
      difficulty,
      category,
      language,
      promptVersion: PROMPT_VERSION,
      globalSlug,
      userSlug,
      force,
    });

    // A. Search if user has a bookmark copy in DB. This is ALWAYS checked (unless force=true)
    let userBookmark = null;
    if (!force) {
      userBookmark = await prisma.learningSheet.findFirst({
        where: {
          topic,
          difficulty,
          language,
          version: PROMPT_VERSION,
          userId,
          bookmarked: true,
        },
      });

      if (userBookmark) {
        logger.info('💾 Bookmark hit! Returning user saved sheet', { userSlug });
        return NextResponse.json({
          success: true,
          data: {
            id: userBookmark.id,
            topic: userBookmark.topic,
            slug: userBookmark.slug,
            category: userBookmark.category as SheetCategory,
            difficulty: userBookmark.difficulty as Difficulty,
            language: userBookmark.language,
            version: userBookmark.version,
            data: userBookmark.json,
            cached: true,
            bookmarked: true,
            createdAt: userBookmark.createdAt.toISOString(),
          },
        });
      }

      // B. Search Redis cache for global sheet
      const redisCached = await safeRedisGet<any>(globalSlug);
      if (redisCached) {
        logger.info('⚡ Redis Cache hit! Returning cached global sheet', { globalSlug });
        return NextResponse.json({
          success: true,
          data: {
            id: redisCached.id || 'redis-cached',
            topic: redisCached.topic,
            slug: redisCached.slug,
            category: redisCached.category as SheetCategory,
            difficulty: redisCached.difficulty as Difficulty,
            language: redisCached.language,
            version: redisCached.version,
            data: redisCached.data,
            cached: true,
            bookmarked: false,
            createdAt: redisCached.createdAt || new Date().toISOString(),
          },
        });
      }

      // C. Search Database for global sheet
      const cachedDbSheet = await prisma.learningSheet.findFirst({
        where: {
          topic,
          difficulty,
          language,
          version: PROMPT_VERSION,
          userId: null,
        },
      });

      if (cachedDbSheet) {
        logger.info('💾 DB Cache hit! Storing in Redis and returning global sheet', { globalSlug });
        const redisPayload = {
          id: cachedDbSheet.id,
          topic: cachedDbSheet.topic,
          slug: cachedDbSheet.slug,
          category: cachedDbSheet.category,
          difficulty: cachedDbSheet.difficulty,
          language: cachedDbSheet.language,
          version: cachedDbSheet.version,
          data: cachedDbSheet.json,
          createdAt: cachedDbSheet.createdAt.toISOString(),
        };
        await safeRedisSet(globalSlug, redisPayload, 86400 * 7); // cache for 7 days

        return NextResponse.json({
          success: true,
          data: {
            id: cachedDbSheet.id,
            topic: cachedDbSheet.topic,
            slug: cachedDbSheet.slug,
            category: cachedDbSheet.category as SheetCategory,
            difficulty: cachedDbSheet.difficulty as Difficulty,
            language: cachedDbSheet.language,
            version: cachedDbSheet.version,
            data: cachedDbSheet.json,
            cached: true,
            bookmarked: false,
            createdAt: cachedDbSheet.createdAt.toISOString(),
          },
        });
      }
    } else {
      // If forcing, retrieve user bookmark status to determine if we should update user's bookmarked sheet
      userBookmark = await prisma.learningSheet.findFirst({
        where: {
          topic,
          difficulty,
          language,
          version: PROMPT_VERSION,
          userId,
          bookmarked: true,
        },
      });
    }

    logger.info('🌐 Cache miss/regeneration. Fetching user context for personalization', { userId });

    // 4. Fetch user's failure and weakness data for personalization
    const [weaknesses, failures] = await Promise.all([
      prisma.systemicWeakness.findMany({
        where: { diagnoses: { some: { userId } } },
        orderBy: { pageRankScore: 'desc' },
        take: 5,
      }),
      prisma.submissionEvent.findMany({
        where: { userId, status: { not: 'Accepted' } },
        include: { problem: true, evidence: { include: { rootCauseHypotheses: true } } },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    const formattedWeaknesses = weaknesses.map(w => ({
      name: w.name,
      pageRankScore: w.pageRankScore,
      frequency: w.frequency,
    }));

    const formattedFailures = failures
      .filter(f => f.problem)
      .map(f => {
        const topHyp = f.evidence.flatMap((e: any) => e.rootCauseHypotheses)[0];
        return {
          problem: f.problem.title,
          rootCause: topHyp?.name || 'Unknown Root Cause',
          status: f.status,
        };
      });

    // 5. Build compact prompt and generate content using Gemini
    const prompt = buildPrompt({
      topic,
      difficulty,
      category,
      weaknesses: formattedWeaknesses,
      recentFailures: formattedFailures,
    });

    const rawResponse = await generateWithGemini(prompt);

    // 6. Validate and repair raw response with Zod parser
    let parsedData;
    try {
      parsedData = parseAndRepair(rawResponse);
    } catch (parseError) {
      console.error('RAW GEMINI OUTPUT (PARSING FAILED):');
      console.error(JSON.stringify(rawResponse));
      throw parseError;
    }
    const hash = generateHash(parsedData);
    const modelUsed = getGeminiModel();

    // 7. Store sheet in database (upsert user-specific or global depending on bookmark status)
    let savedSheet;
    if (userBookmark) {
      savedSheet = await prisma.learningSheet.upsert({
        where: { slug: userSlug },
        update: {
          json: parsedData as any,
          hash,
          generatedBy: modelUsed,
        },
        create: {
          userId,
          topic,
          slug: userSlug,
          category,
          difficulty,
          language,
          version: PROMPT_VERSION,
          json: parsedData as any,
          hash,
          generatedBy: modelUsed,
          bookmarked: true,
        },
      });
      logger.info('💾 Saved newly generated bookmarked sheet to database', { userSlug });
    } else {
      savedSheet = await prisma.learningSheet.upsert({
        where: { slug: globalSlug },
        update: {
          json: parsedData as any,
          hash,
          generatedBy: modelUsed,
        },
        create: {
          topic,
          slug: globalSlug,
          category,
          difficulty,
          language,
          version: PROMPT_VERSION,
          json: parsedData as any,
          hash,
          generatedBy: modelUsed,
          bookmarked: false,
        },
      });

      // Update Redis cache for this global sheet
      const redisPayload = {
        id: savedSheet.id,
        topic: savedSheet.topic,
        slug: savedSheet.slug,
        category: savedSheet.category,
        difficulty: savedSheet.difficulty,
        language: savedSheet.language,
        version: savedSheet.version,
        data: savedSheet.json,
        createdAt: savedSheet.createdAt.toISOString(),
      };
      await safeRedisSet(globalSlug, redisPayload, 86400 * 7); // cache for 7 days
      logger.info('💾 Saved newly generated global sheet to database and Redis', { globalSlug });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: savedSheet.id,
        topic: savedSheet.topic,
        slug: savedSheet.slug,
        category: savedSheet.category as SheetCategory,
        difficulty: savedSheet.difficulty as Difficulty,
        language: savedSheet.language,
        version: savedSheet.version,
        data: savedSheet.json,
        cached: false,
        bookmarked: savedSheet.bookmarked,
        createdAt: savedSheet.createdAt.toISOString(),
      },
    });

  } catch (error) {
    logger.error('❌ Learning sheet generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate learning sheet',
        },
      },
      { status: 500 }
    );
  }
}
