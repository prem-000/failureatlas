'use client';

import type { CodeQuality } from '@/types';
import { Check, ArrowUp, TrendingUp } from 'lucide-react';

function QualityMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.70 ? '#22c55e' : score >= 0.50 ? '#f59e0b' : '#ef4444';
  const label = score >= 0.70 ? 'Good' : score >= 0.50 ? 'Fair' : 'Needs Work';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 7, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 4, transition: 'width 0.6s ease-out',
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 60, textAlign: 'right' }}>
        {pct}% {label}
      </span>
    </div>
  );
}

interface Props {
  quality: CodeQuality;
}

export function CodeQualityCard({ quality }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Overall score meter */}
      <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 10, color: '#71717a', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>
          OVERALL CODE QUALITY
        </div>
        <QualityMeter score={quality.overallScore} />
        <div style={{ fontSize: 10, color: '#3f3f46', marginTop: 6 }}>
          Score derived from naming, nesting depth, loop structure, and readability heuristics.
        </div>
      </div>

      {/* Strengths */}
      {quality.strengths.length > 0 && (
        <div style={{ background: '#052e1615', border: '1px solid #166534', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Check size={12} style={{ color: '#22c55e' }} />
            <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, letterSpacing: '0.06em' }}>
              STRENGTHS
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {quality.strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Check size={11} style={{ color: '#22c55e', flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 12, color: '#86efac', lineHeight: 1.4 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements */}
      {quality.improvements.length > 0 && (
        <div style={{ background: '#431407', border: '1px solid #9a3412', borderRadius: 10, padding: '12px 14px', opacity: 0.85 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <TrendingUp size={12} style={{ color: '#f97316' }} />
            <div style={{ fontSize: 10, color: '#f97316', fontWeight: 700, letterSpacing: '0.06em' }}>
              POTENTIAL IMPROVEMENTS
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {quality.improvements.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <ArrowUp size={11} style={{ color: '#f97316', flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 12, color: '#fed7aa', lineHeight: 1.4 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
