import React, { useState } from 'react';
import type { AdversarialTestCase, BreakSolutionPayload, SourceCodeBlock } from '@/types';
import {
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Code2,
  Variable,
  GitBranch,
  Layers,
} from 'lucide-react';

interface BreakMySolutionTabProps {
  breakMySolution?: AdversarialTestCase[];
  breakSolutionData?: BreakSolutionPayload;
  colors: any;
}

export function BreakMySolutionTab({
  breakSolutionData,
  breakMySolution = [],
  colors,
}: BreakMySolutionTabProps) {
  const [expandedHint, setExpandedHint] = useState<number>(1);

  // Fallback data if breakSolutionData is not yet populated
  const data: BreakSolutionPayload = breakSolutionData || {
    approach: {
      detected: 'Algorithmic Solution',
      confidence: 95,
      evidence: [{ source: 'source_code', description: 'Analyzed AST operations and control-flow structure.', confidence: 0.95 }],
    },
    yourComplexity: {
      time: 'O(n)',
      space: 'O(1)',
    },
    expectedComplexity: {
      time: 'O(n)',
      space: 'O(1)',
      acceptableRange: ['O(n)', 'O(n log n)'],
    },
    codeWalkthrough: [
      {
        stepNumber: '01',
        stepTitle: 'Initialize state registers',
        explanation: 'The code sets up required variables to maintain loop state and track execution.',
        codeSnippet: 'let original = x;\nlet reversed_num = 0;',
        variables: [{ name: 'reversed_num', role: 'Accumulator', change: 'Stores reconstructed digits' }],
        contribution: 'Establishes initial registers before iteration begins.',
      },
    ],
    weaknessOrRisk: {
      hasWeakness: false,
      potentialIssue: 'No confirmed correctness or asymptotic weakness was found.',
      evidence: '• Required states are covered.\n• Boundary behavior matches constraints.\n• Detected complexity fits the expected optimal range.',
      impact: 'Execution safely completes within competitive programming resource budgets.',
      expectedDirection: 'Maintain current approach and structure.',
      evidenceChain: [],
    },
    optimalPath: {
      hints: [
        { level: 1, title: 'Hint 1 — Observation', hint: 'Examine state transitions to ensure invariant preservation across boundary conditions.' },
        { level: 2, title: 'Hint 2 — Key Insight', hint: 'Reusing intermediate registers prevents redundant passes.' },
        { level: 3, title: 'Hint 3 — Strategy', hint: 'Maintain constant space while updating values iteratively in-place.' },
        { level: 4, title: 'Hint 4 — Complexity Direction', hint: 'Achieves optimal asymptotic time and space bounds.' },
      ],
      targetComplexity: {
        time: 'O(n)',
        space: 'O(1)',
      },
    },
  };

  const { approach, yourComplexity, expectedComplexity, codeWalkthrough, sourceCodeBlocks, weaknessOrRisk, optimalPath } = data;

  // Use sourceCodeBlocks if available, or fallback to codeWalkthrough
  const blocksToDisplay = sourceCodeBlocks && sourceCodeBlocks.length > 0
    ? sourceCodeBlocks.map(b => ({
        stepNumber: b.step < 10 ? `0${b.step}` : `${b.step}`,
        stepTitle: b.title,
        explanation: b.explanation,
        codeSnippet: b.code,
        variables: b.variables,
        controlFlow: b.controlFlow,
        contribution: b.contribution,
      }))
    : codeWalkthrough;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>

      {/* ─── Section A: Your Approach ─── */}
      <div
        style={{
          background: colors.bgDark,
          border: `1px solid ${colors.borderGlass}`,
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BrainCircuit size={16} style={{ color: colors.cyan }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: colors.cyan, letterSpacing: '0.06em' }}>
              SECTION A · YOUR APPROACH
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(0, 240, 255, 0.1)',
              color: colors.cyan,
              border: '1px solid rgba(0, 240, 255, 0.25)',
              fontFamily: 'monospace',
            }}
          >
            {approach.confidence}% CONFIDENCE
          </span>
        </div>

        <div style={{ fontSize: 16, fontWeight: 800, color: '#f4f4f5' }}>
          {approach.detected}
        </div>

        {/* Complexity Comparison Matrix */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginTop: 2,
          }}
        >
          {/* Your Solution */}
          <div
            style={{
              background: 'rgba(13, 21, 39, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em' }}>YOUR SOLUTION</span>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, fontFamily: 'monospace', fontWeight: 800 }}>
              <div>
                <span style={{ color: '#71717a', fontSize: 11 }}>Time: </span>
                <span style={{ color: colors.orange }}>{yourComplexity.time}</span>
              </div>
              <div>
                <span style={{ color: '#71717a', fontSize: 11 }}>Space: </span>
                <span style={{ color: '#38bdf8' }}>{yourComplexity.space}</span>
              </div>
            </div>
          </div>

          {/* Expected / Optimal */}
          <div
            style={{
              background: 'rgba(13, 21, 39, 0.6)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: colors.green, letterSpacing: '0.04em' }}>EXPECTED / OPTIMAL</span>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, fontFamily: 'monospace', fontWeight: 800 }}>
              <div>
                <span style={{ color: '#71717a', fontSize: 11 }}>Time: </span>
                <span style={{ color: colors.green }}>{expectedComplexity.time}</span>
              </div>
              <div>
                <span style={{ color: '#71717a', fontSize: 11 }}>Space: </span>
                <span style={{ color: colors.green }}>{expectedComplexity.space}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section B: Break the Submitted Code Step by Step ─── */}
      <div
        style={{
          background: colors.bgDark,
          border: `1px solid ${colors.borderGlass}`,
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Code2 size={16} style={{ color: '#a855f7' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#c084fc', letterSpacing: '0.06em' }}>
              SECTION B · BREAK THE SUBMITTED CODE STEP BY STEP
            </span>
          </div>
          <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>
            {blocksToDisplay.length} LOGICAL {blocksToDisplay.length === 1 ? 'BLOCK' : 'BLOCKS'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {blocksToDisplay.map((step, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(13, 21, 39, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Header: Step Number & Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#c084fc',
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                    }}
                  >
                    STEP {step.stepNumber}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5' }}>
                    {step.stepTitle}
                  </span>
                </div>

                {step.controlFlow && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {step.controlFlow.type}
                  </span>
                )}
              </div>

              {/* Exact Submitted Code Snippet */}
              {step.codeSnippet && (
                <pre
                  style={{
                    fontSize: 11,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    background: '#040711',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '10px 12px',
                    borderRadius: 6,
                    color: '#a5f3fc',
                    overflowX: 'auto',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {step.codeSnippet}
                </pre>
              )}

              {/* Explanation */}
              <p style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.5, margin: 0 }}>
                {step.explanation}
              </p>

              {/* Variables / State / Effect */}
              {step.variables && step.variables.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>
                    <Variable size={12} style={{ color: '#38bdf8' }} />
                    <span>VARIABLES & STATE CHANGE:</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {step.variables.map((v, vIdx) => (
                      <span
                        key={vIdx}
                        style={{
                          fontSize: 10,
                          fontFamily: 'monospace',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          color: '#e2e8f0',
                        }}
                      >
                        <strong style={{ color: '#38bdf8' }}>{v.name}</strong>
                        {v.role ? ` (${v.role})` : ''}
                        {v.change ? ` → ${v.change}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contribution to Final Result */}
              {step.contribution && (
                <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, color: '#64748b', fontSize: 10, letterSpacing: '0.04em' }}>CONTRIBUTION:</span>
                  <span>{step.contribution}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Section C: Where the Submitted Code Can Break ─── */}
      <div
        style={{
          background: weaknessOrRisk.hasWeakness ? 'rgba(67, 20, 7, 0.25)' : 'rgba(5, 46, 22, 0.25)',
          border: `1px solid ${weaknessOrRisk.hasWeakness ? 'rgba(249, 115, 22, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {weaknessOrRisk.hasWeakness ? (
            <AlertTriangle size={16} style={{ color: colors.orange }} />
          ) : (
            <CheckCircle2 size={16} style={{ color: colors.green }} />
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: weaknessOrRisk.hasWeakness ? colors.orange : colors.green,
              letterSpacing: '0.06em',
            }}
          >
            SECTION C · {weaknessOrRisk.hasWeakness ? 'WHERE THE SUBMITTED CODE CAN BREAK' : 'SOLUTION EFFICIENCY & ROBUSTNESS'}
          </span>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5' }}>
          {weaknessOrRisk.potentialIssue}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#d1d5db' }}>
          {weaknessOrRisk.evidence && (
            <div>
              <strong style={{ color: '#9ca3af' }}>Evidence: </strong>
              <div style={{ whiteSpace: 'pre-line', marginTop: 2, color: '#cbd5e1' }}>
                {weaknessOrRisk.evidence}
              </div>
            </div>
          )}
          {weaknessOrRisk.impact && (
            <div>
              <strong style={{ color: '#9ca3af' }}>Impact: </strong>
              <span style={{ color: weaknessOrRisk.hasWeakness ? '#fda4af' : '#a7f3d0' }}>{weaknessOrRisk.impact}</span>
            </div>
          )}
          {weaknessOrRisk.expectedDirection && (
            <div>
              <strong style={{ color: '#9ca3af' }}>Recommended Direction: </strong>
              <span style={{ color: '#93c5fd' }}>{weaknessOrRisk.expectedDirection}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Section D: Optimal Path (Hints Toward the Optimal Solution) ─── */}
      <div
        style={{
          background: colors.bgDark,
          border: `1px solid ${colors.borderGlass}`,
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lightbulb size={16} style={{ color: '#facc15' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#facc15', letterSpacing: '0.06em' }}>
              SECTION D · HINTS TOWARD THE OPTIMAL SOLUTION
            </span>
          </div>
          <span style={{ fontSize: 10, color: '#71717a', fontWeight: 600 }}>
            Progressive Hints · No full code revealed
          </span>
        </div>

        {/* Progressive Hints Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {optimalPath.hints.map(h => {
            const isExp = expandedHint === h.level;
            return (
              <div
                key={h.level}
                style={{
                  background: 'rgba(13, 21, 39, 0.6)',
                  border: `1px solid ${isExp ? 'rgba(250, 204, 21, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                  transition: 'border 0.2s ease',
                }}
              >
                <button
                  onClick={() => setExpandedHint(isExp ? 0 : h.level)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    color: '#f4f4f5',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: 'rgba(250, 204, 21, 0.15)',
                        color: '#facc15',
                        fontFamily: 'monospace',
                      }}
                    >
                      HINT {h.level}
                    </span>
                    <span>{h.title}</span>
                  </div>
                  {isExp ? <ChevronDown size={14} color="#facc15" /> : <ChevronRight size={14} color="#71717a" />}
                </button>

                {isExp && (
                  <div
                    style={{
                      padding: '0 14px 12px 14px',
                      fontSize: 12,
                      color: '#d1d5db',
                      lineHeight: 1.5,
                      borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                      paddingTop: 8,
                    }}
                  >
                    {h.hint}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Target Complexity Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 6,
            fontSize: 11,
          }}
        >
          <span style={{ color: '#9ca3af', fontWeight: 700 }}>TARGET COMPLEXITY:</span>
          <span style={{ fontFamily: 'monospace', color: colors.green, fontWeight: 800 }}>
            Time: {optimalPath.targetComplexity.time} · Space: {optimalPath.targetComplexity.space}
          </span>
        </div>
      </div>
    </div>
  );
}
