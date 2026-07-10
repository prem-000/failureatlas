import React from 'react';
import type { AdversarialTestCase } from '@/types';

interface BreakMySolutionTabProps {
  breakMySolution: AdversarialTestCase[];
  colors: any;
}

export function BreakMySolutionTab({ breakMySolution, colors }: BreakMySolutionTabProps) {
  if (breakMySolution.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13 }}>
        No solution-breaking vulnerability scenarios identified.
      </div>
    );
  }

  return (
    <>
      {breakMySolution.map((test, idx) => (
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
                  color: colors.orange,
                  background: 'rgba(249, 115, 22, 0.08)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                }}
              >
                BUG-{idx + 1}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7' }}>{test.failureMode}</span>

              {test.bugSeverity && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background:
                      test.bugSeverity === 'Critical' || test.bugSeverity === 'High'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color: test.bugSeverity === 'Critical' || test.bugSeverity === 'High' ? colors.red : colors.orange,
                    border: `1px solid ${
                      test.bugSeverity === 'Critical' || test.bugSeverity === 'High'
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'rgba(245, 158, 11, 0.3)'
                    }`,
                  }}
                >
                  {test.bugSeverity.toUpperCase()}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#71717a', width: 110, flexShrink: 0, fontWeight: 600 }}>BREAKING INPUT:</span>
                <code style={{ color: '#f4f4f5', fontFamily: 'monospace', wordBreak: 'break-all' }}>{test.input}</code>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#71717a', width: 110, flexShrink: 0, fontWeight: 600 }}>EXPECTED:</span>
                <code style={{ color: colors.green, fontFamily: 'monospace', wordBreak: 'break-all' }}>{test.expectedOutput}</code>
              </div>
              {test.buggyOutput && (
                <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  <span style={{ color: '#71717a', width: 110, flexShrink: 0, fontWeight: 600 }}>BUGGY OUTPUT:</span>
                  <code style={{ color: colors.red, fontFamily: 'monospace', wordBreak: 'break-all' }}>{test.buggyOutput}</code>
                </div>
              )}
            </div>

            {test.buggyVersion && (
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>Likely Buggy Statement:</span>
                <pre
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    background: '#040711',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    color: '#fecdd3',
                    overflowX: 'auto',
                    marginTop: 4,
                  }}
                >
                  {test.buggyVersion}
                </pre>
              </div>
            )}

            {test.reason && (
              <div
                style={{
                  fontSize: 11,
                  color: '#d1d5db',
                  lineHeight: 1.4,
                  borderLeft: `2px solid ${colors.orange}`,
                  paddingLeft: 8,
                  marginTop: 4,
                }}
              >
                {test.reason}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>PROBABILITY</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color:
                    (test.failureProbability ?? 0) >= 60
                      ? colors.red
                      : (test.failureProbability ?? 0) >= 30
                      ? colors.orange
                      : colors.green,
                }}
              >
                {test.failureProbability}%
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>RISK SCORE</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: colors.orange,
                }}
              >
                {test.riskScore}/100
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
