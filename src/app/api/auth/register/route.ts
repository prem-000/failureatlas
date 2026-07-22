import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { generateToken } from '@/lib/auth/jwt';
import { RegisterRequest, RegisterResponse } from '@/types/api';
import type { ApiResponse } from '@/types';


export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<RegisterResponse>>> {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Email, password, and name are required' },
        },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'USER_EXISTS', message: 'User with this email already exists' },
        },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        notificationPreference: {
          create: {
            dailyMission: true,
            practiceReminder: true,
            failureSummary: true,
            weeklyDigest: true,
            timezone: 'UTC',
          },
        },
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    // Trigger Welcome notification asynchronously
    try {
      const { notificationService } = await import('@/lib/notifications/notification.service');
      const { NotificationType, NotificationCategory } = await import('@/lib/email/types');
      notificationService.createAndProcess({
        userId: user.id,
        type: NotificationType.WELCOME,
        category: NotificationCategory.WELCOME,
        title: 'Welcome to Praxis 🚀',
        scheduledAt: new Date(),
        dedupeKey: `welcome-${user.id}`,
      }).catch(err => console.error('[Register] Failed to send welcome notification:', err));
    } catch (e) {
      console.error('[Register] Error initializing notification service:', e);
    }

    const token = await generateToken({ userId: user.id, email: user.email });

    return NextResponse.json(
      {
        success: true,
        data: {
          user,
          token: { token, expiresIn: 86400, user },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Registration failed' },
      },
      { status: 500 }
    );
  }
}
