import { renderBaseEmailLayout } from './common';
import { escapeHtml } from '../security';

export const TEMPLATE_VERSION = 1;

export interface WeeklyDigestEmailData {
  problemsSolved: number;
  acceptanceRate: number;
  streakDays: number;
  strongestTopic: string;
  weakestTopic: string;
  graphNodesUnlocked: number;
  sm2RetentionRate: number;
  estimatedMasteryPercentage: number;
  aiRecommendation: string;
  baseUrl?: string;
}

export function generateHtml(data: WeeklyDigestEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 8px;">
      📊 Weekly Progress Report
    </h1>
    <p style="font-size: 13px; color: #71717a; margin-bottom: 24px;">
      Here is your algorithmic performance digest for the past 7 days.
    </p>

    <!-- Key Metrics Grid -->
    <div style="display: table; width: 100%; margin-bottom: 20px;">
      <div style="display: table-cell; width: 33.33%; padding: 12px; background-color: #18181b; border: 1px solid #27272a; border-radius: 8px 0 0 8px; text-align: center;">
        <div style="font-size: 22px; font-weight: 800; color: #a855f7;">${data.problemsSolved}</div>
        <div style="font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: 700;">Problems Solved</div>
      </div>
      <div style="display: table-cell; width: 33.33%; padding: 12px; background-color: #18181b; border: 1px solid #27272a; border-left: none; text-align: center;">
        <div style="font-size: 22px; font-weight: 800; color: #22c55e;">${data.acceptanceRate}%</div>
        <div style="font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: 700;">Acceptance Rate</div>
      </div>
      <div style="display: table-cell; width: 33.33%; padding: 12px; background-color: #18181b; border: 1px solid #27272a; border-left: none; border-radius: 0 8px 8px 0; text-align: center;">
        <div style="font-size: 22px; font-weight: 800; color: #eab308;">${data.streakDays}🔥</div>
        <div style="font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: 700;">Day Streak</div>
      </div>
    </div>

    <!-- Insights Card -->
    <div class="card" style="border-left: 4px solid #a855f7;">
      <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">🎯 Mastery Breakdown</h3>
      <div style="font-size: 13px; color: #d4d4d8; line-height: 1.8;">
        <div>💪 <strong>Strongest Topic:</strong> ${escapeHtml(data.strongestTopic)}</div>
        <div>⚠️ <strong>Weakest Topic:</strong> ${escapeHtml(data.weakestTopic)}</div>
        <div>🕸️ <strong>Knowledge Graph Nodes:</strong> ${data.graphNodesUnlocked} Unlocked</div>
        <div>🧠 <strong>SM-2 Retention Score:</strong> ${data.sm2RetentionRate}%</div>
        <div>🚀 <strong>Overall Mastery Index:</strong> ${data.estimatedMasteryPercentage}%</div>
      </div>
    </div>

    <!-- AI Recommendation -->
    <div style="background-color: rgba(168, 85, 247, 0.08); border: 1px dashed #a855f7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 700; color: #c084fc; margin-bottom: 6px;">💡 AI Weekly Strategy</div>
      <div style="font-size: 13px; color: #d4d4d8; line-height: 1.5;">${escapeHtml(data.aiRecommendation)}</div>
    </div>

    <a href="${baseUrl}/dashboard" class="btn">View Detailed Analytics</a>
  `;

  return renderBaseEmailLayout({
    title: 'Weekly Progress Report 📊',
    badgeText: 'Weekly Report',
    content,
    baseUrl,
  });
}

export function generateText(data: WeeklyDigestEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `Praxis Weekly Progress Report 📊

Metrics:
- Solved: ${data.problemsSolved}
- Acceptance Rate: ${data.acceptanceRate}%
- Streak: ${data.streakDays} days
- Strongest Topic: ${data.strongestTopic}
- Weakest Topic: ${data.weakestTopic}
- SM-2 Retention: ${data.sm2RetentionRate}%
- Mastery Index: ${data.estimatedMasteryPercentage}%

AI Strategy:
${data.aiRecommendation}

View detailed analytics: ${baseUrl}/dashboard
`;
}
