export type NotificationType =
  | 'WELCOME'
  | 'FAILURE_SUMMARY'
  | 'DAILY_MISSION'
  | 'PRACTICE_REMINDER'
  | 'WEEKLY_DIGEST'
  | 'ENGAGEMENT_REMINDER';

export const NotificationType = {
  WELCOME: 'WELCOME' as NotificationType,
  FAILURE_SUMMARY: 'FAILURE_SUMMARY' as NotificationType,
  DAILY_MISSION: 'DAILY_MISSION' as NotificationType,
  PRACTICE_REMINDER: 'PRACTICE_REMINDER' as NotificationType,
  WEEKLY_DIGEST: 'WEEKLY_DIGEST' as NotificationType,
  ENGAGEMENT_REMINDER: 'ENGAGEMENT_REMINDER' as NotificationType,
};

export type NotificationCategory = 'SYSTEM' | 'LEARNING' | 'REMINDER' | 'REPORT' | 'WELCOME';

export const NotificationCategory = {
  SYSTEM: 'SYSTEM' as NotificationCategory,
  LEARNING: 'LEARNING' as NotificationCategory,
  REMINDER: 'REMINDER' as NotificationCategory,
  REPORT: 'REPORT' as NotificationCategory,
  WELCOME: 'WELCOME' as NotificationCategory,
};

export type NotificationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RETRYING' | 'SKIPPED';

export const NotificationStatus = {
  PENDING: 'PENDING' as NotificationStatus,
  PROCESSING: 'PROCESSING' as NotificationStatus,
  SENT: 'SENT' as NotificationStatus,
  FAILED: 'FAILED' as NotificationStatus,
  RETRYING: 'RETRYING' as NotificationStatus,
  SKIPPED: 'SKIPPED' as NotificationStatus,
};

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
