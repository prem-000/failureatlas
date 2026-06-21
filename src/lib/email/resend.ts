import { logger } from '@/lib/logger';
import type { DailyMissionResult } from '../missions/generator';

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendMailParams): Promise<any> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn('⚠️ RESEND_API_KEY is not defined. Email dispatch will be simulated (logged only).');
    return { mock: true, success: true, message: 'Simulated email send because RESEND_API_KEY is missing.' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Praxis <missions@yourdomain.com>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    logger.error('❌ Failed to send email via Resend API', { status: res.status, error: errorText });
    throw new Error(`Resend API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  logger.info('✅ Email sent successfully via Resend API', { id: data.id });
  return data;
}

export function compileMissionEmailHtml(
  missionNumber: number,
  roadmapName: string,
  roadmapCompletion: number,
  mission: DailyMissionResult
): string {
  const primary = mission.primaryProblem;
  const secondary = mission.secondaryProblem;

  const difficultyColors: Record<string, string> = {
    Easy: '#22c55e',
    Medium: '#eab308',
    Hard: '#ef4444'
  };

  const primaryDiffColor = difficultyColors[primary.difficulty] || '#3b82f6';
  const secondaryDiffColor = secondary ? (difficultyColors[secondary.difficulty] || '#3b82f6') : '#3b82f6';

  const gainsHtml = mission.expectedLearningGain
    .map(g => `<li style="margin-bottom: 8px; font-size: 14px; color: #a1a1aa;"><strong style="color: #22c55e;">+</strong> ${g}</li>`)
    .join('');

  const formattedHint = mission.aiHint
    .replace(/\n/g, '<br />')
    .replace(/(\d+\.\s+[^<]+)/g, '<strong style="color: #eab308;">$1</strong>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Today's Praxis Mission</title>
  <style>
    body {
      background-color: #0d0d0f;
      color: #e4e4e7;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0d0d0f;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #16161a;
      border: 1px solid #232329;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .header {
      padding: 30px;
      background: linear-gradient(135deg, #1e1b29 0%, #16161a 100%);
      border-bottom: 1px solid #232329;
      text-align: center;
    }
    .coach-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background-color: #a855f7;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 10px 0;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 13px;
      color: #71717a;
      margin: 0;
    }
    .roadmap-badge {
      color: #a855f7;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #71717a;
      margin: 24px 0 12px 0;
    }
    .section-title.first {
      margin-top: 0;
    }
    .card {
      background-color: #1c1c24;
      border: 1px solid #2a2a35;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .card.primary {
      border-left: 4px solid #a855f7;
    }
    .card.secondary {
      border-left: 4px solid #ec4899;
    }
    .card-title {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 8px 0;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 8px;
    }
    .card-desc {
      font-size: 13px;
      color: #a1a1aa;
      line-height: 1.5;
      margin: 8px 0 0 0;
    }
    .stats-grid {
      display: table;
      width: 100%;
      margin: 20px 0;
    }
    .stat-cell {
      display: table-cell;
      width: 50%;
      padding: 16px;
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 11px;
      color: #71717a;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .hint-box {
      background-color: rgba(217, 119, 6, 0.08);
      border: 1px dashed #d97706;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .hint-title {
      font-size: 14px;
      font-weight: 700;
      color: #f59e0b;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hint-body {
      font-size: 13px;
      color: #f59e0b;
      line-height: 1.6;
    }
    .gain-list {
      list-style-type: none;
      padding: 0;
      margin: 0;
    }
    .footer {
      padding: 30px;
      background-color: #111115;
      border-top: 1px solid #232329;
      text-align: center;
      font-size: 12px;
      color: #52525b;
    }
    .footer a {
      color: #a855f7;
      text-decoration: none;
    }
    .btn {
      display: block;
      width: 100%;
      text-align: center;
      background-color: #a855f7;
      color: #ffffff !important;
      padding: 14px 0;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      margin-top: 24px;
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="coach-badge">AI Daily Coach</span>
        <h1 class="title">🎯 Mission #${missionNumber}</h1>
        <p class="subtitle">
          Current Roadmap: <span class="roadmap-badge">${roadmapName}</span> (${roadmapCompletion}% completion)
        </p>
      </div>

      <div class="content">
        <div class="section-title first">Primary Objective</div>
        <div class="card primary">
          <h3 class="card-title">
            ${primary.title}
            <span class="badge" style="background-color: rgba(${primary.difficulty === 'Easy' ? '34,197,94' : primary.difficulty === 'Medium' ? '234,179,8' : '239,68,68'}, 0.15); color: ${primaryDiffColor};">
              ${primary.difficulty}
            </span>
          </h3>
          <p class="card-desc">
            <strong>Purpose:</strong> Roadmap Progression (${primary.stage} Stage)
          </p>
        </div>

        ${secondary ? `
        <div class="section-title">Weakness Reinforcement</div>
        <div class="card secondary">
          <h3 class="card-title">
            ${secondary.title}
            <span class="badge" style="background-color: rgba(${secondary.difficulty === 'Easy' ? '34,197,94' : secondary.difficulty === 'Medium' ? '234,179,8' : '239,68,68'}, 0.15); color: ${secondaryDiffColor};">
              ${secondary.difficulty}
            </span>
          </h3>
          <p class="card-desc">
            <strong>Purpose:</strong> Repairing weakness <strong>"${secondary.targetedWeakness}"</strong>
          </p>
        </div>
        ` : ''}

        <div class="stats-grid">
          <div class="stat-cell" style="border-right: none; border-top-right-radius: 0; border-bottom-right-radius: 0;">
            <div class="stat-value" style="color: #ef4444;">${mission.failureRisk}%</div>
            <div class="stat-label">Failure Risk</div>
          </div>
          <div class="stat-cell" style="border-top-left-radius: 0; border-bottom-left-radius: 0;">
            <div class="stat-value" style="color: #22c55e;">${mission.successProbability}%</div>
            <div class="stat-label">Success Rate</div>
          </div>
        </div>

        <div class="section-title">AI Insights & Focus Areas</div>
        <div class="hint-box">
          <div class="hint-title">💡 Tactical Hint</div>
          <div class="hint-body">${formattedHint}</div>
        </div>

        <div class="section-title">Expected Growth</div>
        <ul class="gain-list">
          ${gainsHtml}
        </ul>

        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/problems/${primary.slug}" class="btn">Launch Daily Mission</a>
      </div>

      <div class="footer">
        <p>You received this because daily coach emails are enabled in your Praxis account.</p>
        <p>To opt out, update your preferences in the <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings">Settings Page</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
