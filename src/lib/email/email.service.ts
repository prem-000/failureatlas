import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { gmailProvider } from './gmail';
import { isValidEmail, generateTextFromHtml } from './security';
import type { EmailProvider, SendEmailParams, EmailResult } from './types';
import { NotificationType, NotificationCategory, NotificationStatus } from './types';

export class EmailService {
  private provider: EmailProvider;

  constructor(provider: EmailProvider = gmailProvider) {
    this.provider = provider;
  }

  public async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    const emailType = params.emailType || NotificationType.WELCOME;
    const category = params.category || NotificationCategory.SYSTEM;
    const templateVersion = params.templateVersion || 1;

    // 1. Recipient Validation
    if (!isValidEmail(params.to)) {
      logger.error('❌ Invalid recipient email address provided:', { recipient: params.to });
      await this.logDispatch({
        params,
        emailType,
        category,
        status: NotificationStatus.FAILED,
        failedReason: `Invalid recipient address: ${params.to}`,
        templateVersion,
        retryCount: 0,
      });
      return { success: false, error: `Invalid recipient email: ${params.to}` };
    }

    // 2. Fallback text generation
    const textContent = params.text || generateTextFromHtml(params.html);

    // 3. Development / Missing Credentials handling
    const isDev = process.env.NODE_ENV === 'development';
    const isConfigured = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

    if (!isConfigured) {
      logger.warn('⚠️ SMTP credentials not configured. Email dispatch simulated.');
      if (isDev) {
        try {
          const scratchDir = path.join(process.cwd(), '.scratch', 'email-previews');
          if (!fs.existsSync(scratchDir)) {
            fs.mkdirSync(scratchDir, { recursive: true });
          }
          const filename = `${emailType.toLowerCase()}-${Date.now()}.html`;
          fs.writeFileSync(path.join(scratchDir, filename), params.html, 'utf-8');
          logger.info(`📝 Saved dev email HTML preview to .scratch/email-previews/${filename}`);
        } catch (e: any) {
          logger.warn('Could not save HTML preview scratch file:', { error: e.message });
        }
      }

      await this.logDispatch({
        params,
        emailType,
        category,
        status: NotificationStatus.SKIPPED,
        failedReason: 'SMTP credentials missing; dispatch simulated',
        templateVersion,
        retryCount: 0,
      });

      return {
        success: true,
        messageId: `mock-msg-${Date.now()}`,
      };
    }

    // 4. Dispatch with Retry (Max 3 attempts, 2 retries)
    const maxAttempts = 3;
    let attempt = 0;
    let lastResult: EmailResult = { success: false, error: 'Dispatch not initiated' };

    while (attempt < maxAttempts) {
      attempt++;
      logger.info(`📧 Email dispatch attempt ${attempt}/${maxAttempts}`, {
        to: params.to,
        subject: params.subject,
      });

      lastResult = await this.provider.send({
        ...params,
        text: textContent,
      });

      if (lastResult.success) {
        await this.logDispatch({
          params,
          emailType,
          category,
          status: NotificationStatus.SENT,
          providerMessageId: lastResult.messageId,
          providerLatency: lastResult.latencyMs,
          templateVersion,
          retryCount: attempt - 1,
        });

        return lastResult;
      }

      if (attempt < maxAttempts) {
        const backoffMs = attempt * 1000;
        logger.warn(`⚠️ Email dispatch failed. Retrying in ${backoffMs}ms...`, {
          error: lastResult.error,
        });
        await new Promise(res => setTimeout(res, backoffMs));
      }
    }

    // 5. Final Failure Logging
    await this.logDispatch({
      params,
      emailType,
      category,
      status: NotificationStatus.FAILED,
      failedReason: lastResult.error || 'All SMTP dispatch retry attempts failed',
      providerLatency: lastResult.latencyMs,
      templateVersion,
      retryCount: maxAttempts - 1,
    });

    return lastResult;
  }

  private async logDispatch(opts: {
    params: SendEmailParams;
    emailType: NotificationType;
    category: NotificationCategory;
    status: NotificationStatus;
    providerMessageId?: string;
    failedReason?: string;
    providerLatency?: number;
    templateVersion: number;
    retryCount: number;
  }): Promise<void> {
    try {
      await prisma.emailLog.create({
        data: {
          userId: opts.params.userId || null,
          notificationId: opts.params.notificationId || null,
          recipient: opts.params.to,
          emailType: opts.emailType,
          category: opts.category,
          subject: opts.params.subject,
          status: opts.status,
          providerMessageId: opts.providerMessageId || null,
          failedReason: opts.failedReason || null,
          providerLatency: opts.providerLatency || null,
          retryCount: opts.retryCount,
          templateVersion: opts.templateVersion,
        },
      });
    } catch (dbErr: any) {
      logger.error('❌ Failed to create EmailLog record in database:', { error: dbErr.message });
    }
  }
}

export const emailService = new EmailService();
export const sendEmail = (params: SendEmailParams) => emailService.sendEmail(params);
