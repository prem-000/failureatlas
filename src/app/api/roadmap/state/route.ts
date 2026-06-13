/**
 * GET  /api/roadmap/state?topic=binary-search
 * POST /api/roadmap/state  — body: { topic, currentLevel, levels }
 *
 * Reads or writes the user's persisted RoadmapState for a given topic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

async function authenticate(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const token = getTokenFromHeader(authHeader || undefined);
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Missing Authorization token' } },
        { status: 401 }
      );
    }

    const topic = new URL(request.url).searchParams.get('topic') || 'binary-search';

    const state = await prisma.roadmapState.findUnique({
      where: { userId_topic: { userId, topic } },
    });

    return NextResponse.json({ success: true, state: state || null });
  } catch (error) {
    logger.error('❌ GET roadmap state error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch roadmap state' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Missing Authorization token' } },
        { status: 401 }
      );
    }

    let body: { topic?: string; currentLevel?: number; levels?: unknown[] } = {};
    try { body = await request.json(); } catch { /* empty body */ }

    const { topic, currentLevel, levels } = body;

    if (!topic) {
      return NextResponse.json(
        { success: false, error: { message: 'topic is required' } },
        { status: 400 }
      );
    }

    const state = await prisma.roadmapState.upsert({
      where: { userId_topic: { userId, topic } },
      update: { currentLevel: currentLevel ?? 1, levels: (levels ?? []) as any },
      create: { userId, topic, currentLevel: currentLevel ?? 1, levels: (levels ?? []) as any },
    });

    return NextResponse.json({ success: true, state });
  } catch (error) {
    logger.error('❌ POST roadmap state error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to save roadmap state' } },
      { status: 500 }
    );
  }
}
