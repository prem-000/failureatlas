import { renderBaseEmailLayout } from './common';
import { escapeHtml } from '../security';

export const TEMPLATE_VERSION = 1;

export interface PracticeReminderEmailData {
  dueCount: number;
  dueTopics: string[];
  estimatedTimeMinutes: number;
  baseUrl?: string;
}

export function generateHtml(data: PracticeReminderEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const topicsList = data.dueTopics.map(t => `
    <span style="display: inline-block; background-color: #18181b; border: 1px solid #27272a; color: #a855f7; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 4px; margin: 4px;">
      ${escapeHtml(t)}
    </span>
  `).join('');

  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 8px;">
      🧠 Time To Practice
    </h1>
    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
      Your SM-2 spaced repetition schedule indicates algorithmic concepts are due for review. Refreshing these now prevents memory decay and locks in mastery.
    </p>

    <div class="card" style="border-left: 4px solid #a855f7;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <strong style="color: #ffffff; font-size: 16px;">Due Items: ${data.dueCount}</strong>
        <span style="font-size: 12px; color: #71717a;">Est. Time: ~${data.estimatedTimeMinutes} mins</span>
      </div>
      <div style="margin-top: 8px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #71717a; margin-bottom: 6px;">Topics Due</div>
        <div>${topicsList}</div>
      </div>
    </div>

    <a href="${baseUrl}/practice" class="btn">Start Practice Session</a>
  `;

  return renderBaseEmailLayout({
    title: '🧠 Time To Practice',
    badgeText: 'Spaced Repetition',
    content,
    baseUrl,
  });
}

export function generateText(data: PracticeReminderEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `Time To Practice 🧠

You have ${data.dueCount} items due for review in your SM-2 spaced repetition queue (~${data.estimatedTimeMinutes} mins).
Topics due: ${data.dueTopics.join(', ')}

Start Practice Session: ${baseUrl}/practice
`;
}
