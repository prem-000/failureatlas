import React, { useState } from 'react';
import type { AdversarialTestCase } from '@/types';

interface AiGeneratedTabProps {
  aiGeneratedCases: AdversarialTestCase[];
  colors: any;
}

export function AiGeneratedTab({ aiGeneratedCases, colors }: AiGeneratedTabProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!aiGeneratedCases || aiGeneratedCases.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13, width: '100%' }}>
        No AI reconstructed judge cases available.
      </div>
    );
  }

  const safeIndex = Math.min(currentIndex, aiGeneratedCases.length - 1);
  const currentCase = aiGeneratedCases[safeIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {/* Progressive Reveal Navigation */}
      <NavigationHeader
        currentIndex={safeIndex}
        totalCases={aiGeneratedCases.length}
        onPrev={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
        onNext={() => setCurrentIndex(prev => Math.min(aiGeneratedCases.length - 1, prev + 1))}
        colors={colors}
      />

      {/* Single Judge Case Display */}
      <JudgeCaseCard
        test={currentCase}
        caseNumber={safeIndex + 1}
        colors={colors}
      />
    </div>
  );
}

interface AttackLabTabProps {
  loadingGenerated: boolean;
  generatedTests: any[];
  difficultyStage: number;
  colors: any;
}

export function AttackLabTab({ loadingGenerated, generatedTests, difficultyStage, colors }: AttackLabTabProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

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
        <span style={{ color: '#71717a', fontSize: 12 }}>Reconstructing competitive judge cases at Stage {difficultyStage}…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!generatedTests || generatedTests.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13, width: '100%' }}>
        Click &quot;Generate More Tests&quot; to synthesize custom judge cases.
      </div>
    );
  }

  const safeIndex = Math.min(currentIndex, generatedTests.length - 1);
  const currentCase = generatedTests[safeIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {/* Progressive Reveal Navigation */}
      <NavigationHeader
        currentIndex={safeIndex}
        totalCases={generatedTests.length}
        onPrev={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
        onNext={() => setCurrentIndex(prev => Math.min(generatedTests.length - 1, prev + 1))}
        colors={colors}
      />

      {/* Single Judge Case Display */}
      <JudgeCaseCard
        test={currentCase}
        caseNumber={safeIndex + 1}
        colors={colors}
      />
    </div>
  );
}

function NavigationHeader({
  currentIndex,
  totalCases,
  onPrev,
  onNext,
  colors
}: {
  currentIndex: number;
  totalCases: number;
  onPrev: () => void;
  onNext: () => void;
  colors: any;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0a0d18',
        border: `1px solid ${colors.borderGlass}`,
        borderRadius: 10,
        padding: '10px 16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      }}
    >
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        style={{
          background: currentIndex === 0 ? 'transparent' : 'rgba(59, 130, 246, 0.12)',
          border: `1px solid ${currentIndex === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(59, 130, 246, 0.3)'}`,
          borderRadius: 6,
          color: currentIndex === 0 ? '#52525b' : '#60a5fa',
          fontSize: 12,
          fontWeight: 700,
          padding: '6px 14px',
          cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        ← Previous
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.02em' }}>
          Judge Case <span style={{ color: colors.blue }}>{currentIndex + 1}</span> of {totalCases}
        </span>
      </div>

      <button
        onClick={onNext}
        disabled={currentIndex === totalCases - 1}
        style={{
          background: currentIndex === totalCases - 1 ? 'transparent' : 'rgba(59, 130, 246, 0.12)',
          border: `1px solid ${currentIndex === totalCases - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(59, 130, 246, 0.3)'}`,
          borderRadius: 6,
          color: currentIndex === totalCases - 1 ? '#52525b' : '#60a5fa',
          fontSize: 12,
          fontWeight: 700,
          padding: '6px 14px',
          cursor: currentIndex === totalCases - 1 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        Next →
      </button>
    </div>
  );
}

function JudgeCaseCard({
  test,
  caseNumber,
  colors
}: {
  test: any;
  caseNumber: number;
  colors: any;
}) {
  const difficulty = Math.min(5, Math.max(1, test.judgeDifficulty || 3));
  const stars = Array.from({ length: 5 }, (_, i) => i < difficulty);

  // Extract target list
  const targetsList: string[] = Array.isArray(test.targets) && test.targets.length > 0
    ? test.targets
    : test.failureMode
      ? [`✓ ${test.failureMode}`]
      : ['✓ Boundary Conditions'];

  const categoryLabel = test.category || 'Reconstructed Case';
  const inferredStrategy = test.inferredStrategy || 'Algorithmic Test';
  const whyFails = test.whyIncorrectSolutionsFail || test.reason || 'Incorrect implementations mishandle edge state transition or boundary limits.';

  return (
    <div
      className="test-card"
      style={{
        background: colors.bgDark,
        border: `1px solid ${colors.borderGlass}`,
        borderRadius: 12,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header: Title + Category + Strategy + Difficulty Stars */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#e4e4e7',
                letterSpacing: '0.02em',
              }}
            >
              Judge Case #{caseNumber}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              {categoryLabel}
            </span>
            {inferredStrategy && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(168, 85, 247, 0.1)',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                }}
              >
                🧠 {inferredStrategy}
              </span>
            )}
          </div>
        </div>

        {/* Difficulty Stars */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#71717a', letterSpacing: '0.05em' }}>
            JUDGE DIFFICULTY
          </span>
          <div style={{ display: 'flex', gap: 3, fontSize: 16, lineHeight: 1 }}>
            {stars.map((filled, i) => (
              <span key={i} style={{ color: filled ? '#f59e0b' : '#3f3f46' }}>
                ★
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Purpose */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: 8,
          padding: '12px 14px',
          fontSize: 12,
          lineHeight: 1.5,
          color: '#cbd5e1',
        }}
      >
        <span style={{ fontWeight: 700, color: '#60a5fa', marginRight: 6 }}>PURPOSE:</span>
        {test.purpose || 'Designed to stress implementation boundaries and verify correctness under adversarial competitive judge cases.'}
      </div>

      {/* Input and Expected Output */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>INPUT</span>
          <div
            style={{
              background: '#05070e',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '10px 14px',
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#f8fafc',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
            }}
          >
            {test.input}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>EXPECTED OUTPUT</span>
          <div
            style={{
              background: '#05070e',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 8,
              padding: '10px 14px',
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#34d399',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
            }}
          >
            {test.expectedOutput || test.expected}
          </div>
        </div>
      </div>

      {/* Targets Stressed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>TARGETS STRESSED</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {targetsList.map((target, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.08)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {target.startsWith('✓') ? target : `✓ ${target}`}
            </span>
          ))}
        </div>
      </div>

      {/* Why Incorrect Solutions Fail */}
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 8,
          padding: '12px 14px',
          fontSize: 12,
          lineHeight: 1.5,
          color: '#fca5a5',
          marginTop: 4,
        }}
      >
        <span style={{ fontWeight: 700, color: '#ef4444', marginRight: 6 }}>WHY INCORRECT SOLUTIONS FAIL:</span>
        {whyFails}
      </div>
    </div>
  );
}
