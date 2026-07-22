/**
 * Re-export Prisma-generated enums and add runtime objects so consumers don't
 * need to import from @prisma/client directly.
 *
 * Using `import type` + type aliases means TypeScript resolves these against
 * the generated client (node_modules/.prisma/client) at compile time, which
 * avoids the dual-resolution conflict that appears when pnpm hoists
 * @prisma/client into a versioned sub-path.
 */
import type {
  NotificationType as _NotificationType,
  NotificationCategory as _NotificationCategory,
  NotificationStatus as _NotificationStatus,
} from '@prisma/client';

export type NotificationType = _NotificationType;
export type NotificationCategory = _NotificationCategory;
export type NotificationStatus = _NotificationStatus;

// Runtime enum-like objects (safe to use in switch/if without importing from Prisma directly)
export const NotificationType = {
  WELCOME: 'WELCOME' as const,
  FAILURE_SUMMARY: 'FAILURE_SUMMARY' as const,
  DAILY_MISSION: 'DAILY_MISSION' as const,
  PRACTICE_REMINDER: 'PRACTICE_REMINDER' as const,
  WEEKLY_DIGEST: 'WEEKLY_DIGEST' as const,
  ENGAGEMENT_REMINDER: 'ENGAGEMENT_REMINDER' as const,
  PASSWORD_RESET: 'PASSWORD_RESET' as const,
  VERIFICATION: 'VERIFICATION' as const,
  INCOMPLETE_SUBMISSION: 'INCOMPLETE_SUBMISSION' as const,
} satisfies Record<string, NotificationType>;

export const NotificationCategory = {
  SYSTEM: 'SYSTEM' as const,
  LEARNING: 'LEARNING' as const,
  REMINDER: 'REMINDER' as const,
  REPORT: 'REPORT' as const,
  WELCOME: 'WELCOME' as const,
} satisfies Record<string, NotificationCategory>;

export const NotificationStatus = {
  PENDING: 'PENDING' as const,
  PROCESSING: 'PROCESSING' as const,
  SENT: 'SENT' as const,
  FAILED: 'FAILED' as const,
  RETRYING: 'RETRYING' as const,
  SKIPPED: 'SKIPPED' as const,
} satisfies Record<string, NotificationStatus>;

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  cid?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  emailType?: NotificationType;
  category?: NotificationCategory;
  userId?: string;
  notificationId?: string;
  templateVersion?: number;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  latencyMs?: number;
}

export interface EmailProvider {
  verify(): Promise<boolean>;
  send(params: SendEmailParams): Promise<EmailResult>;
}
