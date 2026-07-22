import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { notificationService } from '@/lib/notifications/notification.service';
import { logger } from '@/lib/logger';
import { NotificationType, NotificationCategory } from '@/lib/email/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    logger.info('⏰ Practice Reminder Cron Job triggered (08:00 AM default).');

    const users = await prisma.user.findMany();
    const todayStr = new Date().toISOString().split('T')[0];
    const results = [];

    for (const user of users) {
      try {
        const dedupeKey = `practice-reminder-${user.id}-${todayStr}`;
        const res = await notificationService.createAndProcess({
          userId: user.id,
          type: NotificationType.PRACTICE_REMINDER,
          category: NotificationCategory.REMINDER,
          title: '🧠 Time To Practice',
          scheduledAt: new Date(),
          dedupeKey,
        });

        results.push({ userId: user.id, email: user.email, ...res });
      } catch (userErr: any) {
        logger.error(`❌ Failed practice reminder for user ${user.id}:`, { error: userErr.message });
        results.push({ userId: user.id, email: user.email, error: userErr.message });
      }
    }

    return NextResponse.json({ success: true, processedCount: users.length, results });
  } catch (error: any) {
    logger.error('❌ Practice Reminder Cron execution failed:', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
