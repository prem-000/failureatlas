'use client';

import type { SuccessInsight } from '@/types';
import { Award, Sparkles, Workflow, Timer, Database, Trophy } from 'lucide-react';

const LEVEL_STYLES = {
  1: { bg: '#052e16', text: '#22c55e', border: '#166534', label: 'L1', icon: Award },
  2: { bg: '#042044', text: '#3b82f6', border: '#1e40af', label: 'L2', icon: Award },
  3: { bg: '#3b0764', text: '#a855f7', border: '#6b21a8', label: 'L3', icon: Sparkles },
  4: { bg: '#431407', text: '#f97316', border: '#9a3412', label: 'L4', icon: Sparkles },
};

const CONFIDENCE_COLOR_MAP = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#22c55e'];

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease-out' }} />
      </div>
      <span style={{ fontSize: 10, color: '#71717a', minWidth: 30 }}>{pct}%</span>
    </div>
  );
}

interface Props { insight: SuccessInsight }

export function SuccessInsightCard({ insight }: Props) {
  const lvl = LEVEL_STYLES[insight.successLevel];
  const LvlIcon = lvl.icon;
  const confColor = CONFIDENCE_COLOR_MAP[Math.min(4, Math.floor(insight.patternConfidence * 5))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`
        .success-header-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          align-items: center;
        }
        .success-pattern-complexity-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 500px) {
          .success-header-grid {
            grid-template-columns: 1fr !important;
            justify-items: center;
            text-align: center;
          }
          .success-pattern-complexity-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Level badge + header */}
      <div className="success-header-grid" style={{
        background: '#141414', border: '1px solid #1f1f1f', borderRadius: 12,
        padding: '16px 20px',
      }}>
        {/* Level badge */}
        <div style={{
          width: 60, height: 60, borderRadius: 12,
          background: lvl.bg, border: `2px solid ${lvl.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2,
          margin: '0 auto',
        }}>
          <LvlIcon size={18} style={{ color: lvl.text }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: lvl.text }}>{lvl.label}</span>
        </div>
        {/* Level label + description */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: lvl.text, marginBottom: 2 }}>
            {insight.successLevelLabel}
          </div>
          <div style={{ fontSize: 11, color: '#71717a', lineHeight: 1.4 }}>
            {insight.reasonForSuccess}
          </div>
        </div>
      </div>

      {/* Pattern + Complexity row */}
      <div className="success-pattern-complexity-grid">
        {/* Pattern */}
        <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: '#71717a', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>PATTERN DETECTED</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Workflow size={16} style={{ color: '#a855f7', flexShrink: 0 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#a855f7' }}>{insight.patternDetected}</div>
          </div>
          <ConfidenceBar value={insight.patternConfidence} color="#a855f7" />
        </div>
        {/* Complexity */}
        <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: '#71717a', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 6 }}>COMPLEXITY</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 6, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Timer size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>{insight.timeComplexity}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Database size={14} style={{ color: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{insight.spaceComplexity}</span>
            </div>
          </div>
          <ConfidenceBar value={insight.complexityConfidence} color={confColor} />
        </div>
      </div>

      {/* Algorithmic insight */}
      <div style={{ background: '#0f1f2f', border: '1px solid #1e3a5f', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>ALGORITHMIC INSIGHT</div>
        <p style={{ fontSize: 12, color: '#bfdbfe', lineHeight: 1.6, margin: 0 }}>{insight.algorithmicInsight}</p>
      </div>

      {/* Strength badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#052e16', border: '1px solid #166534', borderRadius: 8, padding: '8px 12px',
      }}>
        <Trophy size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>Strength demonstrated:</span>
        <span style={{ fontSize: 12, color: '#86efac', fontWeight: 700 }}>{insight.strength}</span>
      </div>
    </div>
  );
}
