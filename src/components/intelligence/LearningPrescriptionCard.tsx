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
  const rp = insight.reasoningPrescription;

  if (rp) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Failure reason card */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 12,
          padding: '16px',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5', letterSpacing: '0.06em' }}>DIAGNOSTIC REASONING</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5', lineHeight: 1.5 }}>
            {rp.failureReason}
          </div>
        </div>

        {/* Inferred Hidden Test */}
        <div style={{
          background: '#141414',
          border: '1px solid #1f1f1f',
          borderRadius: 12,
          padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.04em' }}>INFERRED HIDDEN TEST CASE</span>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }}>{rp.inferredTestPurpose}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#0d0d0d', padding: 12, borderRadius: 8, border: '1px solid #1a1a1a', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
              <span style={{ color: '#71717a', width: 65, flexShrink: 0, fontWeight: 600 }}>INPUT:</span>
              <code style={{ color: '#f4f4f5', fontFamily: 'monospace', wordBreak: 'break-all' }}>{rp.inferredTestInput}</code>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
              <span style={{ color: '#71717a', width: 65, flexShrink: 0, fontWeight: 600 }}>EXPECTED:</span>
              <code style={{ color: '#10b981', fontFamily: 'monospace', wordBreak: 'break-all' }}>{rp.inferredTestExpected}</code>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
              <span style={{ color: '#71717a', width: 65, flexShrink: 0, fontWeight: 600 }}>BUGGY:</span>
              <code style={{ color: '#ef4444', fontFamily: 'monospace', wordBreak: 'break-all' }}>{rp.inferredTestOutput}</code>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>
            {rp.explanation}
          </div>
        </div>

        {/* Evidence & Historical Similarity */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
        }}>
          {/* Evidence card */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: 10,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', letterSpacing: '0.04em' }}>CODE EVIDENCE</span>
            <code style={{ fontSize: 11, fontFamily: 'monospace', color: '#93c5fd', wordBreak: 'break-all' }}>{rp.evidence}</code>
          </div>

          {/* Historical Similarity */}
          <div style={{
            background: 'rgba(168, 85, 247, 0.05)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: 10,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#c084fc', letterSpacing: '0.04em' }}>HISTORICAL SIMILARITY</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e9d5ff' }}>
              {rp.historicalSimilarityCount} previous failures
            </span>
          </div>
        </div>

        {/* Confidence & Action */}
        <div style={{
          background: '#161616',
          border: '1px solid #1f1f1f',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 9, color: '#71717a', fontWeight: 700, letterSpacing: '0.04em' }}>ANALYSIS CONFIDENCE</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>{rp.confidence}%</div>
          </div>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(56, 189, 248, 0.1)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.2)'
          }}>REASONING-BASED</span>
        </div>
      </div>
    );
  }

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
