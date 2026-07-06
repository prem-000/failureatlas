'use client';

import type { BehaviorInsight, HistoricalFailure } from '@/types';
import { ArrowRight } from 'lucide-react';

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  'Wrong Answer':        { text: '#ef4444', bg: '#450a0a' },
  'Time Limit Exceeded': { text: '#f97316', bg: '#431407' },
  'Runtime Error':       { text: '#a855f7', bg: '#3b0764' },
  'Compilation Error':   { text: '#f59e0b', bg: '#431407' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

interface Props {
  insight: BehaviorInsight;
}

export function BehaviorTimeline({ insight }: Props) {
  const failures = insight.historicalFailures;

  if (failures.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: '#52525b', fontSize: 13 }}>
        No historical failures found for this weakness in the recent window.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`
        .timeline-item {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .timeline-spine {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        .timeline-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
        }
        .timeline-connector {
          width: 2px;
          flex: 1;
          background: #1f1f1f;
          margin: 4px 0;
          min-height: 16px;
        }
        .timeline-card {
          flex: 1;
          background: #141414;
          border-radius: 9px;
          border: 1px solid #1f1f1f;
          padding: 10px 14px;
          margin-bottom: 10px;
        }
        .timeline-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }
        .timeline-card-metrics {
          display: flex;
          gap: 6px;
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
            width: 20px !important;
            height: 20px !important;
            font-size: 8px !important;
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
        }
      `}</style>
      {/* Summary banner */}
      <div
        className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-center sm:items-stretch"
        style={{
          background: '#1a1015', border: '1px solid #3f1515', borderRadius: 10,
          padding: '12px 14px', marginBottom: 16,
        }}
      >
        {/* Failures matched */}
        <div style={{ textAlign: 'center', minWidth: 80, flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ff5f52' }}>{failures.length}</div>
          <div style={{ fontSize: 10, color: '#71717a' }}>Failures Matched</div>
        </div>

        {/* Divider — visible only on sm+ */}
        <div className="hidden sm:block self-stretch" style={{ width: 1, background: '#2a2a2a' }} />

        {/* Weighted rate */}
        <div style={{ textAlign: 'center', minWidth: 80, flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>
            {Math.round(insight.weightedScore * 100)}%
          </div>
          <div style={{ fontSize: 10, color: '#71717a' }}>Weighted Rate</div>
        </div>

        {/* Divider — visible only on sm+ */}
        <div className="hidden sm:block self-stretch" style={{ width: 1, background: '#2a2a2a' }} />

        {/* Pattern description */}
        <div
          className="text-center sm:text-left w-full sm:w-auto"
          style={{ flex: 1, display: 'flex', alignItems: 'center' }}
        >
          <p style={{ fontSize: 11, color: '#a1a1aa', lineHeight: 1.4, margin: 0 }}>
            {insight.behavioralPatterns[0]}
          </p>
        </div>
      </div>

      {/* Timeline */}
      {failures.map((f: HistoricalFailure, i: number) => {
        const statusStyle = STATUS_COLORS[f.status] ?? { text: '#71717a', bg: '#1a1a1a' };
        const isLast = i === failures.length - 1;

        return (
          <div key={i} className="timeline-item">
            {/* Spine */}
            <div className="timeline-spine">
              <div className="timeline-circle" style={{
                background: statusStyle.bg, border: `2px solid ${statusStyle.text}`,
                color: statusStyle.text,
              }}>
                {i + 1}
              </div>
              {!isLast && <div className="timeline-connector" />}
            </div>

            {/* Card */}
            <div className="timeline-card">
              <div className="timeline-card-header">
                <span style={{ fontSize: 12, fontWeight: 600, color: '#e4e4e7' }}>{f.problemTitle}</span>
                <span style={{ fontSize: 10, color: '#52525b', flexShrink: 0, marginLeft: 8 }}>{timeAgo(f.timestamp)}</span>
              </div>
              <div className="timeline-card-metrics">
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                  background: statusStyle.bg, color: statusStyle.text,
                }}>
                  {f.status}
                </span>
                <span style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 3,
                  background: '#1a1a1a', color: '#a1a1aa', border: '1px solid #2a2a2a',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <ArrowRight size={10} style={{ color: '#a1a1aa' }} />
                  {f.rootCauseName}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
