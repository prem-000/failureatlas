import React from 'react';
import { DiffViewer, type DiffOp } from './DiffViewer';

interface SubmissionDetail {
  id: string;
  eventId: string;
  status: string;
  language: string;
  code: string;
  runtime: number | null;
  memory: number | null;
  testCasesPassed: number | null;
  totalTestCases: number | null;
  failedTestCase: string | null;
  attemptNumber: number;
  timeSpent: number;
  timestamp: string;
  problem: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    topics: string[];
    url: string | null;
  };
}

interface SubmissionData {
  submission: SubmissionDetail;
  previousSubmission: { eventId: string; status: string; code: string; timestamp: string; attemptNumber: number } | null;
  codeDiff: DiffOp[];
  evidences: Array<{ id: string; type: string; description: string; confidence: number; source: string; extractedAt: string }>;
  rootCauseHypotheses: Array<{ id: string; rootCauseType: string; name: string; confidence: number }>;
  diagnosis: any;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Accepted:              { bg: '#052e16', text: '#22c55e', border: '#166534' },
  'Wrong Answer':        { bg: '#450a0a', text: '#ef4444', border: '#991b1b' },
  'Time Limit Exceeded': { bg: '#431407', text: '#f97316', border: '#9a3412' },
  'Runtime Error':       { bg: '#3b0764', text: '#a855f7', border: '#6b21a8' },
};

interface AttemptTimelineProps {
  submissions: SubmissionData[];
}

export function AttemptTimeline({ submissions }: AttemptTimelineProps) {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`
        .timeline-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .timeline-spine {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        .timeline-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }
        .timeline-connector {
          width: 2px;
          flex: 1;
          background: #1f1f1f;
          margin: 4px 0;
          min-height: 20px;
        }
        .timeline-card {
          flex: 1;
          background: #141414;
          border-radius: 10px;
          border: 1px solid #1f1f1f;
          padding: 12px 16px;
          margin-bottom: 12px;
        }
        .timeline-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .timeline-card-metrics {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        @media (max-width: 767px) {
          .timeline-item {
            flex-direction: column !important;
            gap: 8px !important;
            margin-bottom: 16px;
          }
          .timeline-spine {
            flex-direction: row !important;
            width: 100% !important;
            gap: 8px !important;
          }
          .timeline-connector {
            width: 100% !important;
            height: 2px !important;
            min-height: auto !important;
            flex: 1 !important;
            margin: 0 !important;
          }
          .timeline-circle {
            width: 24px !important;
            height: 24px !important;
            font-size: 9px !important;
          }
          .timeline-card {
            width: 100% !important;
            margin-bottom: 0 !important;
            padding: 8px 12px !important;
          }
          .timeline-card-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 4px !important;
          }
          .timeline-card-metrics {
            flex-direction: column !important;
            gap: 6px !important;
          }
        }
      `}</style>
      {submissions.map((sd, i) => {
        const colors = STATUS_COLORS[sd.submission.status] || { bg: '#1a1a1a', text: '#71717a', border: '#2a2a2a' };
        const isLast = i === submissions.length - 1;
        return (
          <div key={sd.submission.eventId} className="timeline-item">
            {/* Timeline spine */}
            <div className="timeline-spine">
              <div
                className="timeline-circle"
                style={{
                  background: colors.bg,
                  border: `2px solid ${colors.border}`,
                  color: colors.text,
                }}
              >
                {sd.submission.attemptNumber}
              </div>
              {!isLast && <div className="timeline-connector" />}
            </div>

            {/* Card */}
            <div className="timeline-card">
              <div className="timeline-card-header">
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{sd.submission.status}</span>
                <span style={{ fontSize: 11, color: '#52525b' }}>
                  {new Date(sd.submission.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="timeline-card-metrics">
                {sd.submission.runtime != null && (
                  <span style={{ fontSize: 11, color: '#71717a' }}>⚡ {sd.submission.runtime} ms</span>
                )}
                {sd.submission.memory != null && (
                  <span style={{ fontSize: 11, color: '#71717a' }}>💾 {sd.submission.memory} MB</span>
                )}
                {sd.submission.testCasesPassed != null && (
                  <span style={{ fontSize: 11, color: '#71717a' }}>
                    ✅ {sd.submission.testCasesPassed}/{sd.submission.totalTestCases} tests
                  </span>
                )}
                {sd.submission.timeSpent > 0 && (
                  <span style={{ fontSize: 11, color: '#71717a' }}>⏱ {Math.round(sd.submission.timeSpent / 60)} min</span>
                )}
              </div>
              {/* Diff toggle inline */}
              {sd.codeDiff && sd.codeDiff.filter(o => o.type !== 'EQUAL').length > 0 && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ fontSize: 11, color: '#ff5f52', cursor: 'pointer', userSelect: 'none' }}>
                    View code diff ({sd.codeDiff.filter(o => o.type !== 'EQUAL').length} changes)
                  </summary>
                  <div style={{ marginTop: 8, borderRadius: 8, border: '1px solid #1f1f1f', overflow: 'hidden' }}>
                    <DiffViewer ops={sd.codeDiff} />
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
