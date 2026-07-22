import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { notificationService } from '@/lib/notifications/notification.service';
import { logger } from '@/lib/logger';
import { NotificationType, NotificationCategory } from '@/lib/email/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    logger.info('⏰ Daily Failure Summary Cron Job triggered (22:30 PM default).');

    const users = await prisma.user.findMany();
    const todayStr = new Date().toISOString().split('T')[0];
    const results = [];

    for (const user of users) {
      try {
        const dedupeKey = `daily-failure-summary-${user.id}-${todayStr}`;
        const res = await notificationService.createAndProcess({
          userId: user.id,
          type: NotificationType.FAILURE_SUMMARY,
          category: NotificationCategory.REPORT,
          title: '❌ Praxis Daily Failure Summary',
          scheduledAt: new Date(),
          dedupeKey,
        });

        results.push({ userId: user.id, email: user.email, ...res });
      } catch (userErr: any) {
        logger.error(`❌ Failed daily failure summary for user ${user.id}:`, { error: userErr.message });
        results.push({ userId: user.id, email: user.email, error: userErr.message });
      }
    }

    return NextResponse.json({ success: true, processedCount: users.length, results });
  } catch (error: any) {
    logger.error('❌ Daily Failure Summary Cron execution failed:', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
