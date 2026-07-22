import { renderBaseEmailLayout } from './common';
import { escapeHtml } from '../security';

export const TEMPLATE_VERSION = 1;

export interface EngagementReminderEmailData {
  userName?: string;
  daysInactive: number;
  yesterdaySubmissionCount: number;
  currentStreak: number;
  suggestedDifficulty: string;
  estimatedPracticeTime: number;
  dashboardUrl?: string;
  baseUrl?: string;
}

export function generateHtml(data: EngagementReminderEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const dashboardUrl = data.dashboardUrl || `${baseUrl}/dashboard`;
  const name = escapeHtml(data.userName || 'Developer');

  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 12px;">
      👋 We Missed You Yesterday, ${name}!
    </h1>
    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
      We noticed you didn't submit any solutions yesterday. Remember: <strong>consistency is far more important than intensity</strong> when mastering algorithms.
    </p>

    <div class="card" style="border-left: 4px solid #a855f7;">
      <h3 style="font-size: 16px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">⚡ Quick 15-Minute Re-engagement Strategy</h3>
      <ul style="padding-left: 20px; margin: 0; color: #d4d4d8; font-size: 14px; line-height: 1.8;">
        <li>Solve <strong>one Easy problem</strong> (${escapeHtml(data.suggestedDifficulty)} level)</li>
        <li>Review today's SM-2 spaced repetition topics</li>
        <li>Spend <strong>${data.estimatedPracticeTime} minutes</strong> practicing code syntax</li>
      </ul>
    </div>

    <a href="${dashboardUrl}" class="btn">Continue Practicing</a>
  `;

  return renderBaseEmailLayout({
    title: '👋 We Missed You Yesterday',
    badgeText: 'Re-engagement',
    content,
    baseUrl,
  });
}

export function generateText(data: EngagementReminderEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const dashboardUrl = data.dashboardUrl || `${baseUrl}/dashboard`;
  const name = data.userName || 'Developer';

  return `We Missed You Yesterday, ${name}! 👋

We noticed you didn't submit any solutions yesterday. Remember: consistency is far more important than intensity.

Quick Re-engagement Suggestions:
- Solve one Easy problem
- Review today's SM-2 topics
- Spend ${data.estimatedPracticeTime} minutes practicing

Continue Practicing: ${dashboardUrl}
`;
}
