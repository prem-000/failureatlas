import { renderBaseEmailLayout } from './common';
import { escapeHtml } from '../security';

export const TEMPLATE_VERSION = 1;

export interface FailedProblemItem {
  title: string;
  slug: string;
  verdict: string; // WA, TLE, MLE, CE, RE
  rootCause: string;
  category: string;
  confidence: number;
  aiSuggestion: string;
}

export interface CategoryTrendItem {
  category: string;
  change: string; // e.g. "↓18%", "↑11%", "0%"
  direction: 'up' | 'down' | 'neutral';
}

export interface DailyFailureSummaryData {
  date: string;
  totalAttempted: number;
  acceptedCount: number;
  failedCount: number;
  failedProblems: FailedProblemItem[];
  categoryTrends: CategoryTrendItem[];
  aiInsight: string;
  recommendedConcepts: string[];
  baseUrl?: string;
}

export function generateHtml(data: DailyFailureSummaryData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const formattedDate = escapeHtml(data.date);

  const problemRows = data.failedProblems.map(p => {
    const verdictColor = p.verdict === 'TLE' ? '#eab308' : p.verdict === 'MLE' ? '#3b82f6' : '#ef4444';
    return `
      <div style="background-color: #1c1c24; border: 1px solid #2a2a35; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #ffffff; font-size: 15px;">${escapeHtml(p.title)}</strong>
          <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background-color: rgba(239, 68, 68, 0.15); color: ${verdictColor};">
            ${escapeHtml(p.verdict)}
          </span>
        </div>
        <p style="font-size: 13px; color: #a1a1aa; margin: 4px 0;">
          <strong>Category:</strong> ${escapeHtml(p.category)} | <strong>Root Cause:</strong> ${escapeHtml(p.rootCause)} (${p.confidence}%)
        </p>
        <div style="font-size: 12px; color: #c084fc; background-color: rgba(168, 85, 247, 0.1); border-left: 3px solid #a855f7; padding: 8px 12px; border-radius: 4px; margin-top: 8px;">
          💡 <strong>AI Suggestion:</strong> ${escapeHtml(p.aiSuggestion)}
        </div>
      </div>
    `;
  }).join('');

  const trendBadges = data.categoryTrends.map(t => {
    const color = t.direction === 'down' ? '#22c55e' : t.direction === 'up' ? '#ef4444' : '#a1a1aa';
    return `
      <div style="display: inline-block; background-color: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 8px 14px; margin: 4px;">
        <span style="color: #a1a1aa; font-size: 12px;">${escapeHtml(t.category)}:</span>
        <strong style="color: ${color}; font-size: 13px; margin-left: 6px;">${escapeHtml(t.change)}</strong>
      </div>
    `;
  }).join('');

  const conceptsList = data.recommendedConcepts.map(c => `
    <li style="margin-bottom: 6px; font-size: 13px; color: #e4e4e7;">
      <strong style="color: #a855f7;">•</strong> ${escapeHtml(c)}
    </li>
  `).join('');

  const content = `
    <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 8px;">
      ❌ Daily Failure Summary (${formattedDate})
    </h1>
    <p style="font-size: 13px; color: #71717a; margin-bottom: 20px;">
      Aggregation of today's failed problem submissions and AI root-cause analysis.
    </p>

    <!-- Overview Stats -->
    <div style="display: table; width: 100%; margin-bottom: 20px;">
      <div style="display: table-cell; width: 33.33%; padding: 12px; background-color: #18181b; border: 1px solid #27272a; border-radius: 8px 0 0 8px; text-align: center;">
        <div style="font-size: 22px; font-weight: 800; color: #ffffff;">${data.totalAttempted}</div>
        <div style="font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: 700;">Attempted</div>
      </div>
      <div style="display: table-cell; width: 33.33%; padding: 12px; background-color: #18181b; border: 1px solid #27272a; border-left: none; text-align: center;">
        <div style="font-size: 22px; font-weight: 800; color: #22c55e;">${data.acceptedCount}</div>
        <div style="font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: 700;">Accepted</div>
      </div>
      <div style="display: table-cell; width: 33.33%; padding: 12px; background-color: #18181b; border: 1px solid #27272a; border-left: none; border-radius: 0 8px 8px 0; text-align: center;">
        <div style="font-size: 22px; font-weight: 800; color: #ef4444;">${data.failedCount}</div>
        <div style="font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: 700;">Failed</div>
      </div>
    </div>

    <!-- Category Trends -->
    ${data.categoryTrends.length > 0 ? `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #71717a; margin-bottom: 8px;">
        📈 Weakness Category Trends vs Last Week
      </div>
      <div>${trendBadges}</div>
    </div>
    ` : ''}

    <!-- Failed Problems Breakdown -->
    <div style="margin-bottom: 20px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #71717a; margin-bottom: 12px;">
        🔍 Failed Submissions Breakdown
      </div>
      ${problemRows}
    </div>

    <!-- AI Tactical Insight -->
    <div style="background-color: rgba(168, 85, 247, 0.08); border: 1px dashed #a855f7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 700; color: #c084fc; margin-bottom: 6px;">🧠 AI Key Insight</div>
      <div style="font-size: 13px; color: #d4d4d8; line-height: 1.5;">${escapeHtml(data.aiInsight)}</div>
    </div>

    <!-- Recommended Revisions -->
    ${data.recommendedConcepts.length > 0 ? `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #71717a; margin-bottom: 8px;">
        🎯 Concepts To Revise Tomorrow
      </div>
      <ul style="list-style-type: none; padding-left: 0; margin: 0;">${conceptsList}</ul>
    </div>
    ` : ''}

    <a href="${baseUrl}/dashboard" class="btn">View Full Diagnosis in Dashboard</a>
  `;

  return renderBaseEmailLayout({
    title: `Daily Failure Summary — ${formattedDate}`,
    badgeText: 'Daily Intelligence',
    content,
    baseUrl,
  });
}

export function generateText(data: DailyFailureSummaryData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `Praxis Daily Failure Summary (${data.date})

Stats: Attempted: ${data.totalAttempted} | Accepted: ${data.acceptedCount} | Failed: ${data.failedCount}

Failed Problems:
${data.failedProblems.map(p => `- ${p.title} (${p.verdict}): ${p.rootCause} - Suggestion: ${p.aiSuggestion}`).join('\n')}

AI Key Insight:
${data.aiInsight}

Recommended Concepts To Revise:
${data.recommendedConcepts.map(c => `- ${c}`).join('\n')}

View full diagnosis: ${baseUrl}/dashboard
`;
}
