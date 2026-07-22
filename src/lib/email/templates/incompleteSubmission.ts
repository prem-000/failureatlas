import { renderBaseEmailLayout } from './common';
import { escapeHtml } from '../security';

export const TEMPLATE_VERSION = 1;

export interface IncompleteSubmissionEmailData {
  userName?: string;
  problemCount?: number;
  baseUrl?: string;
}

export function generateHtml(data: IncompleteSubmissionEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const name = escapeHtml(data.userName || 'Developer');
  const practiceUrl = `${baseUrl}/dashboard`;

  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 12px;">
      Continue Your Practice Journey 🚀
    </h1>
    <p style="font-size: 15px; color: #e4e4e7; line-height: 1.6; margin-bottom: 16px;">
      Hi ${name},
    </p>
    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 16px;">
      Yesterday you started solving problems but didn't submit them.
    </p>
    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
      Your progress is already saved. Come back and finish them to improve your learning streak.
    </p>

    <a href="${practiceUrl}" class="btn">Continue Practicing →</a>
  `;

  return renderBaseEmailLayout({
    title: 'Continue Your Practice Journey 🚀',
    badgeText: 'Incomplete Practice',
    content,
    baseUrl,
  });
}

export function generateText(data: IncompleteSubmissionEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const name = data.userName || 'Developer';
  const practiceUrl = `${baseUrl}/dashboard`;

  return `Hi ${name},

Yesterday you started solving problems but didn't submit them.

Your progress is already saved.

Come back and finish them to improve your learning streak.

Continue Practicing → ${practiceUrl}
`;
}
