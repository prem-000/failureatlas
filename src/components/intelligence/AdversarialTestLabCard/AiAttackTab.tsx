import React, { useState } from 'react';
import type { JudgePersona, PraxisJudgeCase, CoverageHeatmap } from '@/types';
import { CoverageHeatmapPanel } from './CoverageHeatmapPanel';

const CATEGORY_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  'Boundary': { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  'Constraint': { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
  'Overflow': { bg: 'rgba(239, 68, 68, 0.12)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.3)' },
  'Duplicate': { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  'Binary Search': { bg: 'rgba(0, 240, 255, 0.12)', text: '#00f0ff', border: 'rgba(0, 240, 255, 0.3)' },
  'Greedy': { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  'DP': { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  'Graph': { bg: 'rgba(14, 165, 233, 0.12)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)' },
  'Tree': { bg: 'rgba(34, 197, 94, 0.12)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' },
  'Hashing': { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  'Sliding Window': { bg: 'rgba(249, 115, 22, 0.12)', text: '#ff9800', border: 'rgba(249, 115, 22, 0.3)' },
  'Two Pointer': { bg: 'rgba(6, 182, 212, 0.12)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' },
  'Adversarial': { bg: 'rgba(225, 29, 72, 0.15)', text: '#fb7185', border: 'rgba(225, 29, 72, 0.4)' },
  'Judge Killer': { bg: 'rgba(185, 28, 28, 0.25)', text: '#f87171', border: 'rgba(239, 68, 68, 0.6)' },
};

interface AttackLabTabProps {
  loadingGenerated: boolean;
  generatedTests: PraxisJudgeCase[];
  difficultyStage: number;
  selectedPersona?: JudgePersona;
  heatmap?: CoverageHeatmap;
  colors: any;
}

export function AttackLabTab({
  loadingGenerated,
  generatedTests,
  difficultyStage,
  selectedPersona = 'leetcode',
  heatmap,
  colors,
}: AttackLabTabProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (loadingGenerated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: '32px 0', width: '100%' }}>
        <div
          style={{
            width: 24,
            height: 24,
            border: '3px solid #2a2a2a',
            borderTopColor: colors.red || '#ef4444',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ color: '#71717a', fontSize: 12 }}>
          PRAXIS v1.0 Agent Pipeline Synthesizing Cases ({selectedPersona.toUpperCase()} Judge, Stage {difficultyStage})…
        </span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!generatedTests || generatedTests.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13, width: '100%' }}>
        Select a Judge Persona above to run the PRAXIS multi-agent test generation pipeline.
      </div>
    );
  }

  const safeIndex = Math.min(currentIndex, generatedTests.length - 1);
  const currentCase = generatedTests[safeIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {/* Coverage Heatmap Panel if available */}
      {heatmap && <CoverageHeatmapPanel heatmap={heatmap} colors={colors} />}

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
  colors,
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
        border: `1px solid ${colors.borderGlass || 'rgba(255,255,255,0.08)'}`,
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
          Judge Case <span style={{ color: colors.blue || '#3b82f6' }}>{currentIndex + 1}</span> of {totalCases}
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
  colors,
}: {
  test: PraxisJudgeCase;
  caseNumber: number;
  colors: any;
}) {
  const diffStr = test.difficulty || 'Medium';
  const judgeDifficulty = typeof test.judgeDifficulty === 'number'
    ? Math.min(5, Math.max(1, test.judgeDifficulty))
    : diffStr === 'Adversarial' || diffStr === 'Judge Killer' ? 5 : diffStr === 'Hard' ? 4 : diffStr === 'Easy' ? 1 : 3;

  const stars = Array.from({ length: 5 }, (_, i) => i < judgeDifficulty);

  const categoryLabel = test.constraintCategory || test.category || 'Boundary';
  const categoryBadge = CATEGORY_BADGES[categoryLabel] || CATEGORY_BADGES['Boundary'];

  const whyExists = test.reason || test.explanation || test.why || 'Designed to stress implementation boundaries under PRAXIS judge cases.';
  const whyFails = test.whyIncorrectSolutionsFail || test.implementationAssumption || 'Mishandles logic edge transitions.';
  const coverageContrib = test.coverageGain ? `+${test.coverageGain}% Coverage` : null;

  return (
    <div
      className="test-card"
      style={{
        background: colors.bgDark || '#0b0f19',
        border: `1px solid ${test.permanentHiddenTest ? 'rgba(245, 158, 11, 0.4)' : colors.borderGlass || 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: test.permanentHiddenTest ? '0 0 20px rgba(245, 158, 11, 0.15)' : '0 8px 24px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header: Title + Badges + Rating */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#e4e4e7', letterSpacing: '0.02em' }}>
              Judge Case #{test.judgeId || caseNumber}
            </span>

            {/* Permanent Hidden Test Badge */}
            {test.permanentHiddenTest && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                }}
              >
                ★ PERMANENT HIDDEN TEST
              </span>
            )}

            {/* Category Badge */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 6,
                background: categoryBadge.bg,
                color: categoryBadge.text,
                border: `1px solid ${categoryBadge.border}`,
              }}
            >
              {categoryLabel}
            </span>

            {/* Bug Pattern ID */}
            {test.bugPatternId && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#a1a1aa',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                BUG: {test.bugPatternId}
              </span>
            )}

            {/* Difficulty Badge */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 6,
                background: diffStr === 'Adversarial' || diffStr === 'Judge Killer' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                color: diffStr === 'Adversarial' || diffStr === 'Judge Killer' ? '#fca5a5' : '#60a5fa',
                border: diffStr === 'Adversarial' || diffStr === 'Judge Killer' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              {diffStr}
            </span>

            {/* Mutation Tag */}
            {test.mutation && test.mutation !== 'None' && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(168, 85, 247, 0.12)',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                }}
              >
                ⚡ {test.mutation}
              </span>
            )}

            {coverageContrib && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                {coverageContrib}
              </span>
            )}
          </div>
        </div>

        {/* Rating & Confidence */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#71717a', letterSpacing: '0.05em' }}>
            RATING {test.judgeRating || '1500'}
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

      {/* Invariant Tested */}
      {test.invariant && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 11,
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>INVARIANT TESTED:</span>
          <span>{test.invariant}</span>
        </div>
      )}

      {/* Why it exists */}
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
        <span style={{ fontWeight: 700, color: '#60a5fa', marginRight: 6 }}>JUDGE RATIONALE:</span>
        {whyExists}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>EXPECTED OUTPUT</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {test.mismatchCorrected && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  ⚠ OUTPUT AUTO-CORRECTED FROM VM
                </span>
              )}
              {test.verified !== false && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  ✓ VM VERIFIED
                </span>
              )}
            </div>
          </div>
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
            {test.expectedOutput}
          </div>
        </div>
      </div>

      {/* Targeted Weaknesses / Weak Concepts */}
      {test.weakConcepts && test.weakConcepts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>TARGETED USER WEAKNESSES</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {test.weakConcepts.map((wc, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                🎯 {wc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Implementation Assumption / Targeted Weakness */}
      {whyFails && (
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
          <span style={{ fontWeight: 700, color: '#ef4444', marginRight: 6 }}>TARGETED CODE ASSUMPTION:</span>
          {whyFails}
        </div>
      )}
    </div>
  );
}
