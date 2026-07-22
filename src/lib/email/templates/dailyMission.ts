import { renderBaseEmailLayout } from './common';
import { escapeHtml } from '../security';

export const TEMPLATE_VERSION = 1;

export interface DailyMissionEmailData {
  missionNumber: number;
  roadmapName: string;
  roadmapCompletion: number;
  primaryTitle: string;
  primarySlug: string;
  primaryDifficulty: string;
  secondaryTitle?: string;
  secondarySlug?: string;
  secondaryDifficulty?: string;
  secondaryWeakness?: string;
  failureRisk: number;
  successProbability: number;
  estimatedTimeMinutes?: number;
  aiHint: string;
  expectedLearningGain: string[];
  baseUrl?: string;
}

export function generateHtml(data: DailyMissionEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const primaryTitle = escapeHtml(data.primaryTitle);
  const diffColor = data.primaryDifficulty === 'Easy' ? '#22c55e' : data.primaryDifficulty === 'Medium' ? '#eab308' : '#ef4444';
  const formattedHint = escapeHtml(data.aiHint).replace(/\n/g, '<br />');

  const gainsHtml = data.expectedLearningGain.map(g => `
    <li style="margin-bottom: 6px; font-size: 13px; color: #a1a1aa;">
      <strong style="color: #22c55e;">+</strong> ${escapeHtml(g)}
    </li>
  `).join('');

  const content = `
    <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 8px;">
      🎯 Mission #${data.missionNumber}
    </h1>
    <p style="font-size: 13px; color: #71717a; margin-bottom: 20px;">
      Current Roadmap: <span style="color: #a855f7; font-weight: 600;">${escapeHtml(data.roadmapName)}</span> (${data.roadmapCompletion}% complete)
    </p>

    <!-- Primary Objective Card -->
    <div class="card" style="border-left: 4px solid #a855f7;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #71717a; margin-bottom: 4px;">Primary Objective</div>
      <h3 style="font-size: 17px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0;">
        ${primaryTitle}
        <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background-color: rgba(168,85,247,0.15); color: ${diffColor}; margin-left: 8px;">
          ${escapeHtml(data.primaryDifficulty)}
        </span>
      </h3>
      ${data.estimatedTimeMinutes ? `<div style="font-size: 12px; color: #71717a;">Estimated Time: ${data.estimatedTimeMinutes} mins</div>` : ''}
    </div>

    <!-- Secondary Reinforcement Card if available -->
    ${data.secondaryTitle ? `
    <div class="card" style="border-left: 4px solid #ec4899;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #71717a; margin-bottom: 4px;">Weakness Reinforcement</div>
      <h3 style="font-size: 16px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0;">
        ${escapeHtml(data.secondaryTitle)}
        <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background-color: rgba(236,72,153,0.15); color: #ec4899; margin-left: 8px;">
          ${escapeHtml(data.secondaryDifficulty || 'Medium')}
        </span>
      </h3>
      ${data.secondaryWeakness ? `<div style="font-size: 12px; color: #a1a1aa;">Targeting: "${escapeHtml(data.secondaryWeakness)}"</div>` : ''}
    </div>
    ` : ''}

    <!-- Risk & Success Stats -->
    <div style="display: table; width: 100%; margin-bottom: 20px;">
      <div style="display: table-cell; width: 50%; padding: 14px; background-color: #18181b; border: 1px solid #27272a; border-radius: 8px 0 0 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: 800; color: #ef4444;">${data.failureRisk}%</div>
        <div style="font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 600;">Failure Risk</div>
      </div>
      <div style="display: table-cell; width: 50%; padding: 14px; background-color: #18181b; border: 1px solid #27272a; border-left: none; border-radius: 0 8px 8px 0; text-align: center;">
        <div style="font-size: 24px; font-weight: 800; color: #22c55e;">${data.successProbability}%</div>
        <div style="font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 600;">Success Rate</div>
      </div>
    </div>

    <!-- AI Tactical Hint -->
    <div style="background-color: rgba(217, 119, 6, 0.08); border: 1px dashed #d97706; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 700; color: #f59e0b; margin-bottom: 8px;">💡 Tactical AI Hint</div>
      <div style="font-size: 13px; color: #f59e0b; line-height: 1.6;">${formattedHint}</div>
    </div>

    <!-- Expected Growth -->
    ${data.expectedLearningGain.length > 0 ? `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #71717a; margin-bottom: 8px;">Expected Growth</div>
      <ul style="list-style-type: none; padding-left: 0; margin: 0;">${gainsHtml}</ul>
    </div>
    ` : ''}

    <a href="${baseUrl}/problems/${data.primarySlug}" class="btn">Start Daily Mission</a>
  `;

  return renderBaseEmailLayout({
    title: `Today's Praxis Mission #${data.missionNumber}`,
    badgeText: 'Daily Coach',
    content,
    baseUrl,
  });
}

export function generateText(data: DailyMissionEmailData): string {
  const baseUrl = data.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `Today's Praxis Mission #${data.missionNumber}

Roadmap: ${data.roadmapName} (${data.roadmapCompletion}% completion)
Primary Objective: ${data.primaryTitle} (${data.primaryDifficulty})
Failure Risk: ${data.failureRisk}% | Success Probability: ${data.successProbability}%

Tactical Hint:
${data.aiHint}

Expected Growth:
${data.expectedLearningGain.map(g => `+ ${g}`).join('\n')}

Start Mission: ${baseUrl}/problems/${data.primarySlug}
`;
}
