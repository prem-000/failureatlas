import { renderBaseEmailLayout } from './common';
import { escapeHtml } from '../security';

export const TEMPLATE_VERSION = 1;

export interface WelcomeEmailData {
  name?: string;
  baseUrl?: string;
}

export function generateHtml(data: WelcomeEmailData): string {
  const name = escapeHtml(data.name || 'Developer');
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 12px;">
      Welcome to Praxis, ${name}! 🚀
    </h1>
    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
      Praxis is your intelligent AI companion designed to dissect competitive programming failures, isolate root causes, and accelerate your algorithmic mastery.
    </p>

    <div class="card" style="border-left: 4px solid #a855f7;">
      <h3 style="font-size: 16px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">⚡ Key Features</h3>
      <ul style="padding-left: 20px; margin: 0; color: #d4d4d8; font-size: 14px; line-height: 1.8;">
        <li><strong>Automatic Root Cause Intelligence:</strong> Deep diagnostics for WA, TLE, MLE, and CE submissions.</li>
        <li><strong>Spaced Repetition (SM-2):</strong> Never forget solved patterns with optimized review queues.</li>
        <li><strong>AI Daily Missions:</strong> Tailored problem sets targeting your active algorithmic weaknesses.</li>
        <li><strong>Daily & Weekly Progress Reports:</strong> Automated performance analytics to track mastery gains.</li>
      </ul>
    </div>

    <a href="${baseUrl}/dashboard" class="btn">Go to Praxis Dashboard</a>
  `;

  return renderBaseEmailLayout({
    title: 'Welcome to Praxis 🚀',
    badgeText: 'Onboarding',
    content,
    baseUrl,
  });
}

export function generateText(data: WelcomeEmailData): string {
  const name = data.name || 'Developer';
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return `Welcome to Praxis, ${name}!

Praxis is your intelligent AI companion designed to dissect competitive programming failures, isolate root causes, and accelerate your algorithmic mastery.

Key Features:
- Automatic Root Cause Intelligence: Deep diagnostics for WA, TLE, MLE, and CE submissions.
- Spaced Repetition (SM-2): Never forget solved patterns with optimized review queues.
- AI Daily Missions: Tailored problem sets targeting your active algorithmic weaknesses.
- Daily & Weekly Progress Reports: Automated performance analytics.

Access your dashboard: ${baseUrl}/dashboard
`;
}
