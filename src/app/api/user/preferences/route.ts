import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveUserId(request);
    if (!auth.userId) {
      return unauthorizedResponse(auth.error);
    }

    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: auth.userId }
    });

    // If none exists yet, return default structure (we will create it on update or return it)
    if (!preferences) {
      preferences = {
        id: 'default',
        userId: auth.userId,
        dailyMissionEmail: true,
        preferredTime: '08:00',
        createdAt: new Date()
      };
    }

    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch preferences' },
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

    let body: { dailyMissionEmail?: boolean; preferredTime?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { dailyMissionEmail, preferredTime } = body;

    // Basic validation
    if (preferredTime !== undefined) {
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!timeRegex.test(preferredTime)) {
        return NextResponse.json({ success: false, error: 'preferredTime must be in HH:MM format (24-hour)' }, { status: 400 });
      }
    }

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: auth.userId },
      update: {
        dailyMissionEmail: dailyMissionEmail !== undefined ? dailyMissionEmail : undefined,
        preferredTime: preferredTime !== undefined ? preferredTime : undefined
      },
      create: {
        userId: auth.userId,
        dailyMissionEmail: dailyMissionEmail !== undefined ? dailyMissionEmail : true,
        preferredTime: preferredTime || '08:00'
      }
    });

    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
