import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { notificationService } from '@/lib/notifications/notification.service';
import { logger } from '@/lib/logger';
import { NotificationType, NotificationCategory } from '@/lib/email/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    logger.info('⏰ Incomplete Submission Reminder Cron Job triggered (20:00 PM default).');

    // Query active users
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const batchSize = 10;
    let usersChecked = users.length;
    let eligibleCount = 0;
    let sentCount = 0;
    let skippedCount = 0;
    let failureCount = 0;

    const results = [];

    // Process in small batches with rate limiting
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      for (const user of batch) {
        try {
          const dedupeKey = `incomplete-submission-${user.id}-${todayStr}`;
          const res = await notificationService.createAndProcess({
            userId: user.id,
            type: NotificationType.INCOMPLETE_SUBMISSION,
            category: NotificationCategory.REMINDER,
            title: 'Continue Your Practice Journey 🚀',
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
          logger.error(`❌ Incomplete submission reminder error for user ${user.id}:`, { error: userErr.message });
          results.push({ userId: user.id, email: user.email, error: userErr.message });
        }
      }

      // Small delay between batches to respect SMTP rate limits
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    logger.info('📊 Incomplete Submission Reminder Execution Summary:', {
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
    logger.error('❌ Incomplete Submission Reminder Cron execution failed:', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
