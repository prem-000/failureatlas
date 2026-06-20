'use client';

import type { OptimizationItem, ImpactLevel } from '@/types';
import { CheckCircle2, Lightbulb, ArrowRight } from 'lucide-react';

const IMPACT_STYLES: Record<ImpactLevel, { bg: string; text: string }> = {
  High:   { bg: '#450a0a', text: '#ef4444' },
  Medium: { bg: '#431407', text: '#f97316' },
  Low:    { bg: '#1c1c14', text: '#f59e0b' },
};

interface Props {
  items: OptimizationItem[];
}

export function OptimizationReviewCard({ items }: Props) {
  if (items.length === 0) {
    return (
      <div style={{
        background: '#052e16', border: '1px solid #166534', borderRadius: 10,
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <CheckCircle2 size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', marginBottom: 2 }}>Already Optimal</div>
          <div style={{ fontSize: 11, color: '#4ade80' }}>No significant optimizations detected — solution appears efficient.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => {
        const impactStyle = IMPACT_STYLES[item.estimatedImpact];
        return (
          <div key={i} style={{
            background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10,
            padding: '14px 16px',
          }}>
            {/* Impact badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#71717a', fontWeight: 600, letterSpacing: '0.06em' }}>
                OPTIMIZATION #{i + 1}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: impactStyle.bg, color: impactStyle.text,
              }}>
                {item.estimatedImpact} Impact
              </span>
            </div>

            {/* Current → Alternative */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
              {/* Current */}
              <div style={{
                background: '#1a0a0a', border: '1px solid #3f1515', borderRadius: 8,
                padding: '8px 12px',
              }}>
                <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginBottom: 3 }}>CURRENT</div>
                <div style={{ fontSize: 12, color: '#fca5a5' }}>{item.current}</div>
              </div>

              {/* Arrow */}
              <ArrowRight size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />

              {/* Alternative */}
              <div style={{
                background: '#0f1f0f', border: '1px solid #166534', borderRadius: 8,
                padding: '8px 12px',
              }}>
                <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, marginBottom: 3 }}>ALTERNATIVE</div>
                <div style={{ fontSize: 12, color: '#86efac' }}>{item.alternative}</div>
              </div>
            </div>

            {/* Benefit */}
            <div style={{
              marginTop: 10, fontSize: 11, color: '#3b82f6',
              background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 6, padding: '6px 10px',
              display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <Lightbulb size={12} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />
              <span>{item.benefit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
