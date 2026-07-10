import React from 'react';
import type { AdversarialTestCase } from '@/types';

interface HiddenTestsTabProps {
  hiddenTests: AdversarialTestCase[];
  colors: any;
}

export function HiddenTestsTab({ hiddenTests, colors }: HiddenTestsTabProps) {
  if (hiddenTests.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13 }}>
        No hidden test cases recorded.
      </div>
    );
  }

  return (
    <>
      {hiddenTests.map((test, idx) => (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.cyan,
                  background: 'rgba(0, 240, 255, 0.08)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                }}
              >
                HT-{idx + 1}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7' }}>{test.purpose}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#71717a', width: 65, flexShrink: 0, fontWeight: 600 }}>INPUT:</span>
                <code style={{ color: '#f4f4f5', fontFamily: 'monospace', wordBreak: 'break-all' }}>{test.input}</code>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#71717a', width: 65, flexShrink: 0, fontWeight: 600 }}>OUTPUT:</span>
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
                <span style={{ color: '#e4e4e7', fontWeight: 600 }}>Detected Mistake:</span>
                <span style={{ color: '#fda4af' }}>{test.failureMode}</span>
              </div>
              {test.whyPassed && (
                <div style={{ display: 'flex', gap: 6, color: '#a7f3d0' }}>
                  <span style={{ fontWeight: 600, color: '#a7f3d0' }}>Implementation Survival:</span>
                  <span>{test.whyPassed}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>RISK SCORE</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: test.riskScore >= 70 ? colors.red : test.riskScore >= 40 ? colors.orange : colors.green,
                }}
              >
                {test.riskScore}/100
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>CONFIDENCE</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: colors.cyan,
                }}
              >
                {test.confidence}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
