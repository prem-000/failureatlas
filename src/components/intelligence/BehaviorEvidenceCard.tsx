'use client';

import type { BehaviorInsight } from '@/types';
import { Check, ArrowRight } from 'lucide-react';

const IMPACT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  High:   { bg: '#450a0a', text: '#ef4444', border: '#991b1b' },
  Medium: { bg: '#431407', text: '#f97316', border: '#9a3412' },
  Low:    { bg: '#052e16', text: '#22c55e', border: '#166534' },
};

function ConfidenceBar({ value, color = '#ff5f52' }: { value: number; color?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color, borderRadius: 3,
          transition: 'width 0.6s ease-out',
        }} />
      </div>
      <span style={{ fontSize: 10, color: '#71717a', minWidth: 30, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

interface Props {
  insight: BehaviorInsight;
}

export function BehaviorEvidenceCard({ insight }: Props) {
  const impactStyle = IMPACT_COLORS[insight.estimatedImpact] ?? IMPACT_COLORS['Medium'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Diagnosis Confidence */}
      <div style={{ background: '#141414', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f1f1f' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: '#71717a', fontWeight: 600, letterSpacing: '0.06em' }}>DIAGNOSIS CONFIDENCE</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: impactStyle.bg, color: impactStyle.text, border: `1px solid ${impactStyle.border}`,
          }}>
            {insight.estimatedImpact} Impact
          </span>
        </div>
        <ConfidenceBar value={insight.confidence} color="#ff5f52" />
        <div style={{ marginTop: 8 }}>
          <ConfidenceBar value={insight.weightedScore} color="#f59e0b" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: '#52525b' }}>Weighted Score (70% recent · 30% historical)</span>
            <span style={{ fontSize: 10, color: '#52525b' }}>{Math.round(insight.weightedScore * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Weighted breakdown */}
      <div style={{ background: '#141414', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: 11, color: '#71717a', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 10 }}>FAILURE RATE BREAKDOWN</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#a1a1aa' }}>Recent (last 50 / 90 days)</span>
              <span style={{ fontSize: 11, color: '#ff5f52' }}>{Math.round(insight.recentFailureRate * 100)}%</span>
            </div>
            <ConfidenceBar value={insight.recentFailureRate} color="#ff5f52" />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#a1a1aa' }}>All-time historical</span>
              <span style={{ fontSize: 11, color: '#f59e0b' }}>{Math.round(insight.historicalFailureRate * 100)}%</span>
            </div>
            <ConfidenceBar value={insight.historicalFailureRate} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Evidence bullets */}
      <div style={{ background: '#141414', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: 11, color: '#71717a', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 10 }}>CLASSIFICATION EVIDENCE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {insight.evidence.map((ev, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Check size={11} style={{ color: '#ff5f52', flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{ev}</span>
            </div>
          ))}
          {insight.evidence.length === 0 && (
            <span style={{ fontSize: 12, color: '#52525b' }}>Insufficient data for confident classification</span>
          )}
        </div>
      </div>

      {/* Root behavior cause */}
      <div style={{ background: '#1a1015', borderRadius: 10, padding: '14px 16px', border: '1px solid #3f1515' }}>
        <div style={{ fontSize: 11, color: '#ff5f52', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>ROOT BEHAVIORAL CAUSE</div>
        <p style={{ fontSize: 12, color: '#d4d4d8', lineHeight: 1.6, margin: 0 }}>{insight.rootBehaviorCause}</p>
      </div>

      {/* Behavioral patterns */}
      <div style={{ background: '#141414', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: 11, color: '#71717a', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 10 }}>OBSERVED BEHAVIORAL PATTERNS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {insight.behavioralPatterns.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <ArrowRight size={11} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
