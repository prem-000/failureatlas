'use client';

import type { BehaviorInsight } from '@/types';
import { Target, Zap, Lightbulb } from 'lucide-react';

const IMPACT_COLORS = {
  High:   { bg: '#450a0a', text: '#ef4444', border: '#991b1b' },
  Medium: { bg: '#431407', text: '#f97316', border: '#9a3412' },
  Low:    { bg: '#052e16', text: '#22c55e', border: '#166534' },
};

interface Props {
  insight: BehaviorInsight;
}

export function LearningPrescriptionCard({ insight }: Props) {
  const impactStyle = IMPACT_COLORS[insight.estimatedImpact] ?? IMPACT_COLORS['Medium'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Impact badge — no fake % */}
      <div style={{
        background: impactStyle.bg, border: `1px solid ${impactStyle.border}`,
        borderRadius: 10, padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11, color: impactStyle.text, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>
            ESTIMATED IMPACT
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: impactStyle.text }}>
            {insight.estimatedImpact}
          </div>
        </div>
        <div style={{ color: impactStyle.text, display: 'flex', alignItems: 'center' }}>
          {insight.estimatedImpact === 'High' ? (
            <Target size={28} style={{ color: impactStyle.text }} />
          ) : insight.estimatedImpact === 'Medium' ? (
            <Zap size={28} style={{ color: impactStyle.text }} />
          ) : (
            <Lightbulb size={28} style={{ color: impactStyle.text }} />
          )}
        </div>
      </div>

      {/* Context */}
      <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
        Before every submission on <strong style={{ color: '#e4e4e7' }}>{insight.weaknessName}</strong>-type problems, run through this checklist:
      </div>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insight.learningPrescription.map((step) => (
          <div
            key={step.step}
            style={{
              background: '#141414', borderRadius: 9, border: '1px solid #1f1f1f',
              padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start',
            }}
          >
            {/* Step number */}
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: '#ff5f5220', border: '1px solid #ff5f5240',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#ff5f52',
            }}>
              {step.step}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#e4e4e7', lineHeight: 1.4 }}>{step.action}</div>
              {step.targetEdgeCase && (
                <div style={{
                  marginTop: 4, fontSize: 10, color: '#52525b',
                  fontStyle: 'italic',
                }}>
                  Target: {step.targetEdgeCase}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{
        background: '#0f1f0f', border: '1px solid #166534', borderRadius: 8,
        padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Lightbulb size={14} style={{ color: '#4ade80', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 11, color: '#4ade80', lineHeight: 1.5 }}>
          This checklist is generated from your specific failure history — not a generic list.
          Completing all steps before submission addresses your highest-frequency weakness.
        </div>
      </div>
    </div>
  );
}
