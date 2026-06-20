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
      {/* Summary banner */}
      <div style={{
        background: '#1a1015', border: '1px solid #3f1515', borderRadius: 10,
        padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 16,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ff5f52' }}>{failures.length}</div>
          <div style={{ fontSize: 10, color: '#71717a' }}>Failures Matched</div>
        </div>
        <div style={{ width: 1, background: '#2a2a2a' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>
            {Math.round(insight.weightedScore * 100)}%
          </div>
          <div style={{ fontSize: 10, color: '#71717a' }}>Weighted Rate</div>
        </div>
        <div style={{ width: 1, background: '#2a2a2a' }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
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
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {/* Spine */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: statusStyle.bg, border: `2px solid ${statusStyle.text}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: statusStyle.text,
              }}>
                {i + 1}
              </div>
              {!isLast && (
                <div style={{ width: 2, flex: 1, background: '#1f1f1f', margin: '4px 0', minHeight: 16 }} />
              )}
            </div>

            {/* Card */}
            <div style={{
              flex: 1, background: '#141414', borderRadius: 9, border: '1px solid #1f1f1f',
              padding: '10px 14px', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#e4e4e7' }}>{f.problemTitle}</span>
                <span style={{ fontSize: 10, color: '#52525b', flexShrink: 0, marginLeft: 8 }}>{timeAgo(f.timestamp)}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
