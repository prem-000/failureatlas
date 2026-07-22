import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { notificationService } from '@/lib/notifications/notification.service';
import { logger } from '@/lib/logger';
import { NotificationType, NotificationCategory } from '@/lib/email/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    logger.info('⏰ Engagement Reminder Cron Job triggered (09:00 AM default).');

    // 1. Fetch all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    const todayStr = new Date().toISOString().split('T')[0];

    let usersChecked = users.length;
    let eligibleCount = 0;
    let sentCount = 0;
    let skippedCount = 0;
    let failureCount = 0;

    const results = [];

    for (const user of users) {
      try {
        const dedupeKey = `engagement-reminder-${user.id}-${todayStr}`;
        const res = await notificationService.createAndProcess({
          userId: user.id,
          type: NotificationType.ENGAGEMENT_REMINDER,
          category: NotificationCategory.REMINDER,
          title: '👋 We Missed You Yesterday',
          scheduledAt: new Date(),
          dedupeKey,
        });

        if (res.processed) {
          sentCount++;
          eligibleCount++;
        } else {
          skippedCount++;
        }

        results.push({ userId: user.id, email: user.email, ...res });
      } catch (userErr: any) {
        failureCount++;
        logger.error(`❌ Engagement reminder error for user ${user.id}:`, { error: userErr.message });
        results.push({ userId: user.id, email: user.email, error: userErr.message });
      }
    }

    logger.info('📊 Engagement Reminder Cron Execution Summary:', {
      usersChecked,
      eligibleUsers: eligibleCount,
      emailsSent: sentCount,
      emailsSkipped: skippedCount,
      failures: failureCount,
    });

    return NextResponse.json({
      success: true,
      stats: {
        usersChecked,
        eligibleUsers: eligibleCount,
        emailsSent: sentCount,
        emailsSkipped: skippedCount,
        failures: failureCount,
      },
      results,
    });
  } catch (error: any) {
    logger.error('❌ Engagement Reminder Cron execution failed:', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
