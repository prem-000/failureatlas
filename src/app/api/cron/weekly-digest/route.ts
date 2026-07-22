import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { notificationService } from '@/lib/notifications/notification.service';
import { logger } from '@/lib/logger';
import { NotificationType, NotificationCategory } from '@/lib/email/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    logger.info('⏰ Weekly Digest Cron Job triggered (Sunday 20:00 PM default).');

    const users = await prisma.user.findMany();
    const todayStr = new Date().toISOString().split('T')[0];
    const results = [];

    for (const user of users) {
      try {
        const dedupeKey = `weekly-digest-${user.id}-${todayStr}`;
        const res = await notificationService.createAndProcess({
          userId: user.id,
          type: NotificationType.WEEKLY_DIGEST,
          category: NotificationCategory.REPORT,
          title: '📊 Your Praxis Weekly Progress Report',
          scheduledAt: new Date(),
          dedupeKey,
        });

        results.push({ userId: user.id, email: user.email, ...res });
      } catch (userErr: any) {
        logger.error(`❌ Failed weekly digest for user ${user.id}:`, { error: userErr.message });
        results.push({ userId: user.id, email: user.email, error: userErr.message });
      }
    }

    return NextResponse.json({ success: true, processedCount: users.length, results });
  } catch (error: any) {
    logger.error('❌ Weekly Digest Cron execution failed:', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
