import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';

export const AUTHORIZED_SCOPES = [
  'Failure history',
  'Weaknesses',
  'Diagnosis',
  'Learning recommendations',
] as const;

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveUserId(request);
    if (!auth.userId) {
      return unauthorizedResponse(auth.error);
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: auth.userId },
    });

    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId: auth.userId,
          dailyMissionEmail: true,
          preferredTime: '08:00',
          chatgptConnected: false,
          chatgptConnectedAt: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: preferences.chatgptConnected,
        connectedAt: preferences.chatgptConnectedAt
          ? preferences.chatgptConnectedAt.toISOString()
          : null,
        scopes: AUTHORIZED_SCOPES,
        userEmail: user.email,
      },
    });
  } catch (error: unknown) {
    console.error('GET /api/integrations/chatgpt error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch ChatGPT connection status',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveUserId(request);
    if (!auth.userId) {
      return unauthorizedResponse(auth.error);
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const now = new Date();
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: auth.userId },
      update: {
        chatgptConnected: true,
        chatgptConnectedAt: now,
      },
      create: {
        userId: auth.userId,
        dailyMissionEmail: true,
        preferredTime: '08:00',
        chatgptConnected: true,
        chatgptConnectedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        connected: preferences.chatgptConnected,
        connectedAt: preferences.chatgptConnectedAt
          ? preferences.chatgptConnectedAt.toISOString()
          : now.toISOString(),
        scopes: AUTHORIZED_SCOPES,
        userEmail: user.email,
      },
    });
  } catch (error: unknown) {
    console.error('POST /api/integrations/chatgpt error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update ChatGPT connection',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await resolveUserId(request);
    if (!auth.userId) {
      return unauthorizedResponse(auth.error);
    }

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: auth.userId },
      update: {
        chatgptConnected: false,
        chatgptConnectedAt: null,
      },
      create: {
        userId: auth.userId,
        dailyMissionEmail: true,
        preferredTime: '08:00',
        chatgptConnected: false,
        chatgptConnectedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'ChatGPT integration disconnected successfully. Praxis data remains safe.',
      data: {
        connected: preferences.chatgptConnected,
        connectedAt: null,
        scopes: AUTHORIZED_SCOPES,
      },
    });
  } catch (error: unknown) {
    console.error('DELETE /api/integrations/chatgpt error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to disconnect ChatGPT integration',
        },
      },
      { status: 500 }
    );
  }
}
