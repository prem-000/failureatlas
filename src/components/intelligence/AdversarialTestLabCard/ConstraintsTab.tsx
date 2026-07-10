import React from 'react';
import { Cpu, HardDrive, Zap } from 'lucide-react';
import type { AdversarialTestCase } from '@/types';

interface ConstraintExtremes {
  metrics: {
    cpuImpact: string;
    memoryImpact: string;
    complexitySafety: string;
  };
  tests: AdversarialTestCase[];
}

interface ConstraintsTabProps {
  constraintExtremes: ConstraintExtremes;
  colors: any;
}

export function ConstraintsTab({ constraintExtremes, colors }: ConstraintsTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Premium Metric Cards */}
      <div className="risk-metrics-grid">
        {/* CPU Impact Card */}
        <div
          style={{
            background: 'rgba(13, 21, 39, 0.4)',
            border: `1px solid ${colors.borderGlass}`,
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: 'rgba(168, 85, 247, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Cpu size={16} style={{ color: colors.purple }} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.04em' }}>CPU PERFORMANCE</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5', fontFamily: 'monospace' }}>
              {constraintExtremes.metrics.cpuImpact}
            </div>
          </div>
        </div>

        {/* Memory Impact Card */}
        <div
          style={{
            background: 'rgba(13, 21, 39, 0.4)',
            border: `1px solid ${colors.borderGlass}`,
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: 'rgba(168, 85, 247, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HardDrive size={16} style={{ color: colors.purple }} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.04em' }}>MEMORY HEADROOM</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5', fontFamily: 'monospace' }}>
              {constraintExtremes.metrics.memoryImpact}
            </div>
          </div>
        </div>

        {/* Complexity Safety Card */}
        <div
          style={{
            background: 'rgba(13, 21, 39, 0.4)',
            border: `1px solid ${colors.borderGlass}`,
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: 'rgba(168, 85, 247, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Zap size={16} style={{ color: colors.purple }} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.04em' }}>COMPLEXITY SAFETY</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5', fontFamily: 'monospace' }}>
              {constraintExtremes.metrics.complexitySafety}
            </div>
          </div>
        </div>
      </div>

      {/* Constraint Extreme Test Cases */}
      {constraintExtremes.tests.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13 }}>
          No extreme boundary test cases recorded.
        </div>
      ) : (
        constraintExtremes.tests.map((test, idx) => (
          <div
            key={idx}
            className="test-card"
            style={{
              background: colors.bgDark,
              border: `1px solid ${colors.borderGlass}`,
              borderRadius: 10,
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: colors.purple,
                    background: 'rgba(168, 85, 247, 0.08)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                  }}
                >
                  LIMIT-{idx + 1}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7' }}>{test.purpose}</span>

                {test.constraint && (
                  <span
                    style={{
                      fontSize: 10,
                      color: '#c084fc',
                      fontFamily: 'monospace',
                      background: 'rgba(168, 85, 247, 0.05)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '1px solid rgba(168, 85, 247, 0.15)',
                    }}
                  >
                    Constraint: {test.constraint}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  <span style={{ color: '#71717a', width: 85, flexShrink: 0, fontWeight: 600 }}>STRESS INPUT:</span>
                  <code style={{ color: '#f4f4f5', fontFamily: 'monospace', wordBreak: 'break-all' }}>{test.input}</code>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  <span style={{ color: '#71717a', width: 85, flexShrink: 0, fontWeight: 600 }}>EXPECTED:</span>
                  <code style={{ color: colors.green, fontFamily: 'monospace', wordBreak: 'break-all' }}>{test.expectedOutput}</code>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 11,
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  paddingTop: 8,
                  marginTop: 4,
                }}
              >
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ color: '#e4e4e7', fontWeight: 600 }}>Verification:</span>
                  <span style={{ color: '#e2e8f0' }}>{test.checks}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ color: '#e4e4e7', fontWeight: 600 }}>Mistake Risk:</span>
                  <span style={{ color: '#fda4af' }}>{test.failureMode}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
              {test.result && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background:
                      test.result === 'PASSED'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : test.result === 'FAILED'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color: test.result === 'PASSED' ? colors.green : test.result === 'FAILED' ? colors.red : colors.orange,
                    border: `1px solid ${
                      test.result === 'PASSED'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : test.result === 'FAILED'
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'rgba(245, 158, 11, 0.3)'
                    }`,
                  }}
                >
                  {test.result}
                </span>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>RISK SCORE</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color: colors.purple,
                  }}
                >
                  {test.riskScore}/100
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
