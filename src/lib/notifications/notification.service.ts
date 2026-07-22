import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { emailService } from '../email/email.service';
import { NotificationType, NotificationCategory, NotificationStatus } from '../email/types';

import { generateDailyFailureDigest } from './dailyFailureDigest';
import { generatePracticeDigest } from './practiceDigest';
import { generateDailyMissionDigest } from './dailyMissionDigest';
import { generateWeeklyDigest } from './weeklyDigest';
import { generateEngagementDigest } from './engagementDigest';

import * as welcomeTemplate from '../email/templates/welcome';
import * as dailyFailureTemplate from '../email/templates/dailyFailureSummary';
import * as dailyMissionTemplate from '../email/templates/dailyMission';
import * as practiceReminderTemplate from '../email/templates/practiceReminder';
import * as weeklyDigestTemplate from '../email/templates/weeklyDigest';
import * as engagementTemplate from '../email/templates/engagementReminder';

export class NotificationService {
  /**
   * Helper to check if current time is within user quiet hours.
   */
  public isQuietHoursActive(startHHMM: string, endHHMM: string, timeZone: string = 'UTC'): { active: boolean; nextAvailableAt: Date } {
    try {
      const now = new Date();
      // Parse local time in given timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

      const currentMinutes = hour * 60 + minute;
      const [sH, sM] = startHHMM.split(':').map(Number);
      const [eH, eM] = endHHMM.split(':').map(Number);

      const startMinutes = sH * 60 + sM;
      const endMinutes = eH * 60 + eM;

      let isActive = false;
      if (startMinutes > endMinutes) {
        // Overnight quiet hours (e.g. 22:00 to 07:00)
        isActive = currentMinutes >= startMinutes || currentMinutes < endMinutes;
      } else {
        isActive = currentMinutes >= startMinutes && currentMinutes < endMinutes;
      }

      // Calculate next available time: quietHoursEnd + 5 minutes
      const nextAvailableAt = new Date(now);
      let targetHour = eH;
      let targetMinute = eM + 5;
      if (targetMinute >= 60) {
        targetHour += 1;
        targetMinute -= 60;
      }
      if (currentMinutes >= endMinutes && startMinutes > endMinutes && currentMinutes >= startMinutes) {
        // quietHoursEnd is tomorrow morning
        nextAvailableAt.setDate(nextAvailableAt.getDate() + 1);
      }
      nextAvailableAt.setHours(targetHour, targetMinute, 0, 0);

      return { active: isActive, nextAvailableAt };
    } catch (e: any) {
      logger.warn('Error evaluating quiet hours, defaulting to inactive:', { error: e.message });
      return { active: false, nextAvailableAt: new Date() };
    }
  }

  /**
   * Enqueues a notification and triggers immediate processing.
   */
  public async createAndProcess(params: {
    userId: string;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    payload?: any;
    scheduledAt?: Date;
    dedupeKey?: string;
  }): Promise<{ notificationId: string; processed: boolean }> {
    const scheduledAt = params.scheduledAt || new Date();

    let notification;
    try {
      notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          category: params.category,
          title: params.title,
          payload: params.payload || {},
          scheduledAt,
          dedupeKey: params.dedupeKey || null,
          status: NotificationStatus.PENDING,
        },
      });
    } catch (createErr: any) {
      // If unique dedupe constraint is hit, return existing
      if (createErr.code === 'P2002') {
        logger.info('ℹ️ Duplicate notification prevented by idempotency constraint', {
          userId: params.userId,
          type: params.type,
          dedupeKey: params.dedupeKey,
        });
        const existing = await prisma.notification.findFirst({
          where: { userId: params.userId, type: params.type, scheduledAt },
        });
        return { notificationId: existing?.id || 'duplicate', processed: false };
      }
      throw createErr;
    }

    const processed = await this.process(notification.id);
    return { notificationId: notification.id, processed };
  }

  /**
   * Processes a single notification by ID.
   */
  public async process(notificationId: string): Promise<boolean> {
    const notif = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true },
    });

    if (!notif) {
      logger.error('❌ Notification not found for processing:', { notificationId });
      return false;
    }

    if (notif.status === NotificationStatus.SENT) {
      logger.info('ℹ️ Notification already processed and sent:', { notificationId });
      return true;
    }

    // 1. Fetch User Preferences
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: notif.userId },
    });

    // 2. Preference Enabled Check
    let enabled = true;
    if (prefs) {
      if (notif.type === NotificationType.DAILY_MISSION && !prefs.dailyMission) enabled = false;
      if (notif.type === NotificationType.PRACTICE_REMINDER && !prefs.practiceReminder) enabled = false;
      if (notif.type === NotificationType.FAILURE_SUMMARY && !prefs.failureSummary) enabled = false;
      if (notif.type === NotificationType.WEEKLY_DIGEST && !prefs.weeklyDigest) enabled = false;
      if (notif.type === NotificationType.ENGAGEMENT_REMINDER && !prefs.engagementReminder) enabled = false;
    }

    if (!enabled) {
      logger.info(`ℹ️ Notification skipped per user preferences (Type: ${notif.type})`, { userId: notif.userId });
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.SKIPPED, error: 'Disabled by user preference' },
      });
      return false;
    }

    // 3. Quiet Hours Check
    const startQuiet = prefs?.quietHoursStart || '22:00';
    const endQuiet = prefs?.quietHoursEnd || '07:00';
    const timeZone = prefs?.timezone || 'UTC';

    const quietCheck = this.isQuietHoursActive(startQuiet, endQuiet, timeZone);
    if (quietCheck.active) {
      logger.info(`🌙 Quiet hours active. Rescheduling notification to ${quietCheck.nextAvailableAt.toISOString()}`, {
        notificationId,
        userId: notif.userId,
      });

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          scheduledAt: quietCheck.nextAvailableAt,
          status: NotificationStatus.PENDING,
          error: `Rescheduled due to quiet hours (${startQuiet} - ${endQuiet})`,
        },
      });
      return false;
    }

    // 4. Update Status: PENDING -> PROCESSING
    const processingStartedAt = new Date();
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.PROCESSING,
        processingStartedAt,
      },
    });

    // 5. Generate Digest & Render Email Template
    let subject = notif.title;
    let html = '';
    let text = '';
    let templateVersion = 1;

    try {
      switch (notif.type) {
        case NotificationType.WELCOME: {
          templateVersion = welcomeTemplate.TEMPLATE_VERSION;
          const data = { name: notif.user.name || undefined };
          subject = 'Welcome to Praxis 🚀';
          html = welcomeTemplate.generateHtml(data);
          text = welcomeTemplate.generateText(data);
          break;
        }

        case NotificationType.FAILURE_SUMMARY: {
          templateVersion = dailyFailureTemplate.TEMPLATE_VERSION;
          const digest = await generateDailyFailureDigest(notif.userId);
          if (!digest) {
            logger.info('ℹ️ No failed submissions today for user. Skipping failure summary email.');
            await prisma.notification.update({
              where: { id: notificationId },
              data: {
                status: NotificationStatus.SKIPPED,
                processingFinishedAt: new Date(),
                error: 'No failed submissions today',
              },
            });
            return false;
          }
          subject = `❌ Praxis Daily Failure Summary — ${digest.date}`;
          html = dailyFailureTemplate.generateHtml(digest);
          text = dailyFailureTemplate.generateText(digest);
          break;
        }

        case NotificationType.DAILY_MISSION: {
          templateVersion = dailyMissionTemplate.TEMPLATE_VERSION;
          const digest = await generateDailyMissionDigest(notif.userId);
          subject = `🎯 Today's Praxis Mission #${digest.missionNumber}`;
          html = dailyMissionTemplate.generateHtml(digest);
          text = dailyMissionTemplate.generateText(digest);
          break;
        }

        case NotificationType.PRACTICE_REMINDER: {
          templateVersion = practiceReminderTemplate.TEMPLATE_VERSION;
          const digest = await generatePracticeDigest(notif.userId);
          if (!digest) {
            logger.info('ℹ️ No SM-2 items due for review. Skipping practice reminder email.');
            await prisma.notification.update({
              where: { id: notificationId },
              data: {
                status: NotificationStatus.SKIPPED,
                processingFinishedAt: new Date(),
                error: 'No review items due',
              },
            });
            return false;
          }
          subject = '🧠 Time To Practice';
          html = practiceReminderTemplate.generateHtml(digest);
          text = practiceReminderTemplate.generateText(digest);
          break;
        }

        case NotificationType.WEEKLY_DIGEST: {
          templateVersion = weeklyDigestTemplate.TEMPLATE_VERSION;
          const digest = await generateWeeklyDigest(notif.userId);
          subject = '📊 Your Praxis Weekly Progress Report';
          html = weeklyDigestTemplate.generateHtml(digest);
          text = weeklyDigestTemplate.generateText(digest);
          break;
        }

        case NotificationType.ENGAGEMENT_REMINDER: {
          templateVersion = engagementTemplate.TEMPLATE_VERSION;
          const digest = await generateEngagementDigest(notif.userId);
          if (!digest) {
            logger.info('ℹ️ User was active yesterday. Skipping engagement reminder email.');
            await prisma.notification.update({
              where: { id: notificationId },
              data: {
                status: NotificationStatus.SKIPPED,
                processingFinishedAt: new Date(),
                error: 'User submitted solutions yesterday',
              },
            });
            return false;
          }
          subject = '👋 We Missed You Yesterday';
          html = engagementTemplate.generateHtml(digest);
          text = engagementTemplate.generateText(digest);
          break;
        }

        default:
          throw new Error(`Unsupported NotificationType: ${notif.type}`);
      }

      // 6. Send Email via EmailService
      const sendResult = await emailService.sendEmail({
        to: notif.user.email,
        subject,
        html,
        text,
        emailType: notif.type,
        category: notif.category,
        userId: notif.userId,
        notificationId: notif.id,
        templateVersion,
      });

      const processingFinishedAt = new Date();

      if (sendResult.success) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.SENT,
            sentAt: processingFinishedAt,
            processingFinishedAt,
          },
        });
        return true;
      } else {
        await prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.FAILED,
            error: sendResult.error || 'SMTP dispatch failure',
            processingFinishedAt,
          },
        });
        return false;
      }
    } catch (err: any) {
      const processingFinishedAt = new Date();
      logger.error('❌ Notification processing error:', { notificationId, error: err.message });
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.FAILED,
          error: err.message || 'Processing exception',
          processingFinishedAt,
        },
      });
      return false;
    }
  }
}

export const notificationService = new NotificationService();
