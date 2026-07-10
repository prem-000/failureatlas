import React from 'react';
import type { AdversarialTestCase } from '@/types';

interface AiGeneratedTabProps {
  aiGeneratedCases: AdversarialTestCase[];
  colors: any;
}

export function AiGeneratedTab({ aiGeneratedCases, colors }: AiGeneratedTabProps) {
  if (aiGeneratedCases.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13 }}>
        No AI synthetic novel cases generated.
      </div>
    );
  }

  return (
    <>
      {aiGeneratedCases.map((test, idx) => (
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
                  color: colors.blue,
                  background: 'rgba(59, 130, 246, 0.08)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                }}
              >
                SYN-{idx + 1}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7' }}>{test.purpose}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#71717a', width: 65, flexShrink: 0, fontWeight: 600 }}>INPUT:</span>
                <code style={{ color: '#f4f4f5', fontFamily: 'monospace', wordBreak: 'break-all' }}>{test.input}</code>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#71717a', width: 65, flexShrink: 0, fontWeight: 600 }}>EXPECTED:</span>
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
                <span style={{ color: '#e4e4e7', fontWeight: 600 }}>Synthetic Target:</span>
                <span style={{ color: '#9ca3af' }}>{test.failureMode}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>NOVELTY</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color: colors.blue,
                  }}
                >
                  {test.noveltyScore ?? 90}%
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>COVERAGE</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color: colors.green,
                  }}
                >
                  {test.coverageScore ?? 85}%
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>RISK SCORE</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: colors.blue,
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

interface AttackLabTabProps {
  loadingGenerated: boolean;
  generatedTests: any[];
  difficultyStage: number;
  colors: any;
}

export function AttackLabTab({ loadingGenerated, generatedTests, difficultyStage, colors }: AttackLabTabProps) {
  if (loadingGenerated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: '32px 0', width: '100%' }}>
        <div
          style={{
            width: 24,
            height: 24,
            border: '3px solid #2a2a2a',
            borderTopColor: colors.red,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ color: '#71717a', fontSize: 12 }}>Synthesizing 20 adversarial tests at Stage {difficultyStage}…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (generatedTests.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13, width: '100%' }}>
        Click &quot;Generate More Tests&quot; to synthesize 20 custom test cases.
      </div>
    );
  }

  return (
    <>
      {generatedTests.map((test, idx) => (
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
                CASE-{idx + 1}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                {test.category}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7' }}>{test.purpose}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#71717a', width: 75, flexShrink: 0, fontWeight: 600 }}>INPUT:</span>
                <code style={{ color: '#f4f4f5', fontFamily: 'monospace', wordBreak: 'break-all' }}>{test.input}</code>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#71717a', width: 75, flexShrink: 0, fontWeight: 600 }}>EXPECTED:</span>
                <code style={{ color: colors.green, fontFamily: 'monospace', wordBreak: 'break-all' }}>{test.expected || test.expectedOutput}</code>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#a1a1aa',
                  borderLeft: `2px solid ${colors.orange}`,
                  paddingLeft: 8,
                  marginTop: 4,
                }}
              >
                {test.reason}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>BUG PROBABILITY</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: test.probability >= 70 ? colors.red : test.probability >= 40 ? colors.orange : colors.green,
                }}
              >
                {test.probability}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
