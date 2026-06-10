// apps/web/src/app/api/auth/verify-key/route.ts
// Called by background.ts AUTHENTICATE_API_KEY handler to validate fa_... API keys

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get('x-api-key') ||
      (await request.json().catch(() => ({}))).apiKey;

    if (!apiKey || !apiKey.startsWith('fa_')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_API_KEY', message: 'Invalid API key format' } },
        { status: 401 }
      );
    }

    // Look up the user who owns this API key
    const user = await prisma.user.findFirst({
      where: { apiKey },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_API_KEY', message: 'API key not found or revoked' } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('verify-key error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Key verification failed' } },
      { status: 500 }
    );
  }
}