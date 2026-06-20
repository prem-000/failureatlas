'use client';

import type { FutureRisk, ImpactLevel } from '@/types';
import { Shield, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const SEVERITY_STYLES: Record<ImpactLevel, { bg: string; text: string; border: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = {
  High:   { bg: '#450a0a', text: '#ef4444', border: '#991b1b', icon: AlertTriangle },
  Medium: { bg: '#431407', text: '#f97316', border: '#9a3412', icon: AlertCircle },
  Low:    { bg: '#0f1f0f', text: '#22c55e', border: '#166534', icon: Info },
};

interface Props {
  risks: FutureRisk[];
}

export function FutureRiskCard({ risks }: Props) {
  if (risks.length === 0) {
    return (
      <div style={{
        background: '#052e16', border: '1px solid #166534', borderRadius: 10,
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Shield size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#4ade80' }}>No significant future risks detected for this solution.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {risks.map((risk, i) => {
        const style = SEVERITY_STYLES[risk.severity];
        const RiskIcon = style.icon;
        return (
          <div key={i} style={{
            background: '#141414', border: `1px solid ${style.border}`,
            borderRadius: 10, padding: '12px 14px',
            borderLeft: `3px solid ${style.text}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <RiskIcon size={14} style={{ color: style.text, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: style.text }}>{risk.risk}</span>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, flexShrink: 0, marginLeft: 8,
                background: style.bg, color: style.text,
              }}>
                {risk.severity}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#71717a', lineHeight: 1.5 }}>{risk.reason}</div>
          </div>
        );
      })}

      {/* Footer note */}
      <div style={{ fontSize: 10, color: '#3f3f46', textAlign: 'center', paddingTop: 4 }}>
        Severity is qualitative (High/Medium/Low) — derived from code structure analysis, not computed probabilities.
      </div>
    </div>
  );
}
