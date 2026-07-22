import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { logger } from '@/lib/logger';
import type { EmailProvider, SendEmailParams, EmailResult } from './types';

export class GmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      logger.warn('⚠️ GMAIL_USER or GMAIL_APP_PASSWORD not set. Gmail SMTP transporter unavailable.');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 10000,
      socketTimeout: 10000,
      greetingTimeout: 10000,
    });

    return this.transporter;
  }

  public async verify(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      if (!transporter) return false;

      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('SMTP verification timed out after 10 seconds')), 10000)
      );

      await Promise.race([verifyPromise, timeoutPromise]);
      return true;
    } catch (err: any) {
      logger.error('❌ Gmail SMTP connection verification failed:', { error: err.message });
      return false;
    }
  }

  public async send(params: SendEmailParams): Promise<EmailResult> {
    const startTime = Date.now();
    const transporter = this.getTransporter();

    if (!transporter) {
      return {
        success: false,
        error: 'GMAIL_USER or GMAIL_APP_PASSWORD environment variable is missing.',
        latencyMs: Date.now() - startTime,
      };
    }

    const fromAddress = process.env.EMAIL_FROM || `Praxis <${process.env.GMAIL_USER}>`;

    const mailOptions = {
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: params.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
        contentType: att.contentType,
        cid: att.cid,
      })),
    };

    try {
      const sendPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Email send operation timed out (10s threshold)')), 10000)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      logger.info('✅ Email dispatched via Gmail SMTP', {
        messageId: info.messageId,
        recipient: params.to,
        latencyMs,
      });

      return {
        success: true,
        messageId: info.messageId,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      logger.error('❌ Failed to dispatch email via Gmail SMTP:', {
        recipient: params.to,
        error: err.message,
        latencyMs,
      });

      return {
        success: false,
        error: err.message || 'Unknown SMTP dispatch error',
        latencyMs,
      };
    }
  }
}

export const gmailProvider = new GmailProvider();
