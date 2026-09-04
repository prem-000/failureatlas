import React from 'react';
import type { AdversarialTestCase } from '@/types';
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HiddenTestsTabProps {
  hiddenTests: AdversarialTestCase[];
  colors: any;
}

export function HiddenTestsTab({ hiddenTests, colors }: HiddenTestsTabProps) {
  if (hiddenTests.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13 }}>
        No evidence-based hidden tests available.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {hiddenTests.map((test, idx) => {
        const testId = (test as any).testId || test.id || `HT-0${idx + 1}`;
        const isVerified = test.verificationStatus === 'verified_oracle' || test.verificationStatus === 'verified_reference';
        const badgeText = test.verificationBadgeText || (isVerified ? 'VERIFIED ✓' : 'HIGH CONFIDENCE — INFERRED');

        return (
          <div
            key={idx}
            className="test-card"
            style={{
              background: colors.bgDark,
              border: `1px solid ${colors.borderGlass}`,
              borderRadius: 10,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Bar: ID, Title, Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: colors.cyan,
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    padding: '3px 8px',
                    borderRadius: 5,
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                  }}
                >
                  {testId}
                </span>

                <span style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5' }}>
                  {test.riskTitle || test.purpose || `Stress Target ${idx + 1}`}
                </span>
              </div>

              {/* Status & Confidence Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: isVerified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                    color: isVerified ? colors.green : '#38bdf8',
                    border: `1px solid ${isVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.25)'}`,
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {isVerified ? <CheckCircle2 size={11} /> : <ShieldCheck size={11} />}
                  {badgeText}
                </span>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#9ca3af',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {test.confidence || 95}% CONFIDENCE
                </span>
              </div>
            </div>

            {/* Risk & Failure Target */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ color: '#71717a', width: 90, flexShrink: 0, fontWeight: 700, fontSize: 11 }}>ATTACKS:</span>
                <span style={{ color: '#fda4af', fontWeight: 600 }}>{test.whatItAttacks || test.failureMode || 'Boundary condition'}</span>
              </div>
              {test.whyExists && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ color: '#71717a', width: 90, flexShrink: 0, fontWeight: 700, fontSize: 11 }}>WHY EXISTS:</span>
                  <span style={{ color: '#d1d5db' }}>{test.whyExists}</span>
                </div>
              )}
            </div>

            {/* Input & Expected Output Box */}
            <div
              style={{
                background: '#040711',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 10, fontSize: 11, alignItems: 'baseline' }}>
                <span style={{ color: '#71717a', width: 75, flexShrink: 0, fontWeight: 700, fontFamily: 'monospace' }}>INPUT</span>
                <code style={{ color: '#f4f4f5', fontFamily: 'monospace', wordBreak: 'break-all' }}>{test.input}</code>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, alignItems: 'baseline', borderTop: '1px dashed rgba(255, 255, 255, 0.05)', paddingTop: 6 }}>
                <span style={{ color: '#71717a', width: 75, flexShrink: 0, fontWeight: 700, fontFamily: 'monospace' }}>EXPECTED</span>
                <code style={{ color: colors.green, fontFamily: 'monospace', fontWeight: 700, wordBreak: 'break-all' }}>{test.expectedOutput}</code>
              </div>
            </div>

            {/* Constraint / Complexity Relevance */}
            {test.constraintRelevance && (
              <div style={{ fontSize: 11, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ color: '#71717a', width: 90, flexShrink: 0, fontWeight: 700, fontSize: 10, letterSpacing: '0.03em' }}>RELEVANCE:</span>
                <span style={{ color: '#93c5fd' }}>{test.constraintRelevance}</span>
              </div>
            )}

            {/* Evidence Provenance Footer */}
            {test.evidence && test.evidence.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 11,
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: '#9ca3af', fontWeight: 700, fontSize: 10, letterSpacing: '0.04em' }}>EVIDENCE:</span>
                  <span style={{ color: '#a5f3fc', fontSize: 11 }}>
                    {test.evidence.map(e => e.description).join(' · ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
