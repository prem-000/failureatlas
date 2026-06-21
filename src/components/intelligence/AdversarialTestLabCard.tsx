'use client';

import React, { useState } from 'react';
import type { AdversarialTestLab, AdversarialTestCase } from '@/types';
import { Check, AlertTriangle, Cpu, HardDrive, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  data: AdversarialTestLab;
}

type TabType = 'hidden' | 'break' | 'constraints' | 'ai';

// ─── Geometric SVG Icon Components ──────────────────────────────────────────

// 1. Execution Mesh (Hidden Tests Survived)
function ExecutionMeshIcon({ className, size = 20, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="5" r="2.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="5" cy="12" r="2.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="19" cy="12" r="2.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="12" cy="19" r="2.5" fill="currentColor" fillOpacity="0.2" />
      <line x1="12" y1="7.5" x2="5" y2="9.5" />
      <line x1="12" y1="7.5" x2="19" y2="9.5" />
      <line x1="5" y1="14.5" x2="12" y2="16.5" />
      <line x1="19" y1="14.5" x2="12" y2="16.5" />
      <line x1="5" y1="12" x2="19" y2="12" strokeDasharray="2 2" opacity="0.6" />
      <line x1="12" y1="5" x2="12" y2="19" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  );
}

// 2. Probability Collapse (Potential Failure Modes Avoided)
function ProbabilityCollapseIcon({ className, size = 20, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="10" strokeDasharray="3 3" opacity="0.4" />
      <circle cx="12" cy="12" r="6" strokeDasharray="2 2" opacity="0.7" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" opacity="0.8" />
    </svg>
  );
}

// 3. Coverage Grid (Constraint Coverage)
function CoverageGridIcon({ className, size = 20, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="2 2" opacity="0.5" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" strokeWidth="1.5" opacity="0.4" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

// 4. Structural Integrity Core (Robustness Score)
function StructuralIntegrityCoreIcon({ className, size = 20, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 2L2 7v8.5c0 5.5 4.5 8 10 10.5 5.5-2.5 10-5 10-10.5V7L12 2z" fill="currentColor" fillOpacity="0.1" />
      <polygon points="12,6 17,9 17,15 12,18 7,15 7,9" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

// 5. Inference Lens (Confidence Score)
function InferenceLensIcon({ className, size = 20, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <path d="M8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2z" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

// Neural Probe (Hidden Tests Active Tab)
function NeuralProbeIcon({ className, size = 14, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 2v8M12 14v8M2 12h8M14 12h8" />
      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M4.5 4.5l3 3M16.5 16.5l3 3M19.5 4.5l-3 3M7.5 16.5l-3 3" opacity="0.6" />
    </svg>
  );
}

// Fracture Matrix (Break My Solution Active Tab)
function FractureMatrixIcon({ className, size = 14, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h8l2-3 2 6 2-3h7" strokeWidth="1.5" strokeDasharray="1 1" opacity="0.4" />
      <path d="M12 3l-2 5 4 4-3 9" strokeWidth="2" />
    </svg>
  );
}

// Boundary Field (Constraint Extremes Active Tab)
function BoundaryFieldIcon({ className, size = 14, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M5 3H3v18h2M19 3h2v18h-2" />
      <line x1="8" y1="12" x2="16" y2="12" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

// Synthetic Intelligence Core (AI Generated Cases Active Tab)
function SyntheticCoreIcon({ className, size = 14, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.3" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
    </svg>
  );
}

export function AdversarialTestLabCard({ data }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('hidden');

  const {
    hiddenTests = [],
    breakMySolution = [],
    constraintExtremes = { tests: [], metrics: { cpuImpact: 'N/A', memoryImpact: 'N/A', complexitySafety: 'N/A' } },
    aiGeneratedCases = [],
    coverageIntelligence = {
      hiddenTestsSurvived: 0,
      potentialFailureModesAvoided: 0,
      constraintCoverage: 0,
      robustnessScore: 0,
      confidenceScore: 0,
    },
  } = data || {};

  // Color Mapping
  const colors = {
    cyan: '#00f0ff',
    orange: '#f97316',
    purple: '#a855f7',
    blue: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
    bgDark: '#070a13',
    borderGlass: 'rgba(59, 130, 246, 0.1)',
    borderActiveCyan: 'rgba(0, 240, 255, 0.3)',
    borderActiveOrange: 'rgba(249, 115, 22, 0.3)',
    borderActivePurple: 'rgba(168, 85, 247, 0.3)',
    borderActiveBlue: 'rgba(59, 130, 246, 0.3)',
  };

  const getMetricColor = (val: number, isPercent = true) => {
    if (isPercent) {
      return val >= 90 ? colors.green : val >= 70 ? colors.orange : colors.red;
    }
    return val >= 2 ? colors.green : val >= 1 ? colors.orange : colors.red;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ─── Coverage Intelligence Panel (Header Bar) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10,
        background: '#0d1321',
        border: `1px solid ${colors.borderGlass}`,
        borderRadius: 12,
        padding: 12,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Metric 1 */}
        <div style={{
          background: 'rgba(13, 21, 39, 0.5)',
          border: `1px solid ${colors.borderGlass}`,
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em' }}>HIDDEN TESTS</span>
            <ExecutionMeshIcon size={16} style={{ color: colors.cyan }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'monospace',
              color: getMetricColor(coverageIntelligence.hiddenTestsSurvived, false),
            }}>
              {coverageIntelligence.hiddenTestsSurvived}
            </span>
            <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>/ {hiddenTests.length || 3}</span>
          </div>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>Mesh Verification</span>
        </div>

        {/* Metric 2 */}
        <div style={{
          background: 'rgba(13, 21, 39, 0.5)',
          border: `1px solid ${colors.borderGlass}`,
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em' }}>BUGS DETECTED</span>
            <ProbabilityCollapseIcon size={16} style={{ color: colors.orange }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'monospace',
              color: getMetricColor(coverageIntelligence.potentialFailureModesAvoided, false),
            }}>
              {coverageIntelligence.potentialFailureModesAvoided}
            </span>
            <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>/ {breakMySolution.length || 3}</span>
          </div>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>Failure Probability</span>
        </div>

        {/* Metric 3 */}
        <div style={{
          background: 'rgba(13, 21, 39, 0.5)',
          border: `1px solid ${colors.borderGlass}`,
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em' }}>LIMIT COVERAGE</span>
            <CoverageGridIcon size={16} style={{ color: colors.purple }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'monospace',
              color: getMetricColor(coverageIntelligence.constraintCoverage),
            }}>
              {coverageIntelligence.constraintCoverage}%
            </span>
          </div>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>Extreme Boundary Field</span>
        </div>

        {/* Metric 4 */}
        <div style={{
          background: 'rgba(13, 21, 39, 0.5)',
          border: `1px solid ${colors.borderGlass}`,
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em' }}>ROBUSTNESS SCORE</span>
            <StructuralIntegrityCoreIcon size={16} style={{ color: colors.green }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'monospace',
              color: getMetricColor(coverageIntelligence.robustnessScore),
            }}>
              {coverageIntelligence.robustnessScore}%
            </span>
          </div>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>Structural Integrity Core</span>
        </div>

        {/* Metric 5 */}
        <div style={{
          background: 'rgba(13, 21, 39, 0.5)',
          border: `1px solid ${colors.borderGlass}`,
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em' }}>CONFIDENCE</span>
            <InferenceLensIcon size={16} style={{ color: colors.blue }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'monospace',
              color: getMetricColor(coverageIntelligence.confidenceScore),
            }}>
              {coverageIntelligence.confidenceScore}%
            </span>
          </div>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>Inference Lens</span>
        </div>
      </div>

      {/* ─── Intelligence Tab Selector ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        background: '#111',
        border: '1px solid #1f1f1f',
        borderRadius: 8,
        padding: 3,
        gap: 4,
      }}>
        {/* Tab 1 */}
        <button
          onClick={() => setActiveTab('hidden')}
          style={{
            flex: '1 1 auto',
            minWidth: 120,
            padding: '8px 12px',
            background: activeTab === 'hidden' ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
            border: activeTab === 'hidden' ? `1px solid ${colors.borderActiveCyan}` : '1px solid transparent',
            borderRadius: 6,
            color: activeTab === 'hidden' ? colors.cyan : '#71717a',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <NeuralProbeIcon size={14} style={{ color: activeTab === 'hidden' ? colors.cyan : '#71717a' }} />
          <span>HIDDEN TESTS</span>
        </button>

        {/* Tab 2 */}
        <button
          onClick={() => setActiveTab('break')}
          style={{
            flex: '1 1 auto',
            minWidth: 120,
            padding: '8px 12px',
            background: activeTab === 'break' ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
            border: activeTab === 'break' ? `1px solid ${colors.borderActiveOrange}` : '1px solid transparent',
            borderRadius: 6,
            color: activeTab === 'break' ? colors.orange : '#71717a',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <FractureMatrixIcon size={14} style={{ color: activeTab === 'break' ? colors.orange : '#71717a' }} />
          <span>BREAK SOLUTION</span>
        </button>

        {/* Tab 3 */}
        <button
          onClick={() => setActiveTab('constraints')}
          style={{
            flex: '1 1 auto',
            minWidth: 120,
            padding: '8px 12px',
            background: activeTab === 'constraints' ? 'rgba(168, 85, 247, 0.08)' : 'transparent',
            border: activeTab === 'constraints' ? `1px solid ${colors.borderActivePurple}` : '1px solid transparent',
            borderRadius: 6,
            color: activeTab === 'constraints' ? colors.purple : '#71717a',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <BoundaryFieldIcon size={14} style={{ color: activeTab === 'constraints' ? colors.purple : '#71717a' }} />
          <span>CONSTRAINT EXTREMES</span>
        </button>

        {/* Tab 4 */}
        <button
          onClick={() => setActiveTab('ai')}
          style={{
            flex: '1 1 auto',
            minWidth: 120,
            padding: '8px 12px',
            background: activeTab === 'ai' ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
            border: activeTab === 'ai' ? `1px solid ${colors.borderActiveBlue}` : '1px solid transparent',
            borderRadius: 6,
            color: activeTab === 'ai' ? colors.blue : '#71717a',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <SyntheticCoreIcon size={14} style={{ color: activeTab === 'ai' ? colors.blue : '#71717a' }} />
          <span>AI NOVEL CASES</span>
        </button>
      </div>

      {/* ─── Tab Contents (High-Density Info Cards) ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        
        {/* 1. Hidden Tests Content */}
        {activeTab === 'hidden' && (
          hiddenTests.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13 }}>
              No hidden test cases recorded.
            </div>
          ) : (
            hiddenTests.map((test, idx) => (
              <div key={idx} style={{
                background: colors.bgDark,
                border: `1px solid ${colors.borderGlass}`,
                borderRadius: 10,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.cyan,
                      background: 'rgba(0, 240, 255, 0.08)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                    }}>
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4 }}>
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
                    <span style={{
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: test.riskScore >= 70 ? colors.red : test.riskScore >= 40 ? colors.orange : colors.green,
                    }}>
                      {test.riskScore}/100
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>CONFIDENCE</span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: colors.cyan,
                    }}>
                      {test.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {/* 2. Break My Solution Content */}
        {activeTab === 'break' && (
          breakMySolution.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13 }}>
              No solution-breaking vulnerability scenarios identified.
            </div>
          ) : (
            breakMySolution.map((test, idx) => (
              <div key={idx} style={{
                background: colors.bgDark,
                border: `1px solid ${colors.borderGlass}`,
                borderRadius: 10,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.orange,
                      background: 'rgba(249, 115, 22, 0.08)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                    }}>
                      BUG-{idx + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7' }}>{test.failureMode}</span>
                    
                    {test.bugSeverity && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: test.bugSeverity === 'Critical' || test.bugSeverity === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: test.bugSeverity === 'Critical' || test.bugSeverity === 'High' ? colors.red : colors.orange,
                        border: `1px solid ${test.bugSeverity === 'Critical' || test.bugSeverity === 'High' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      }}>
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
                      <pre style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        background: '#040711',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        color: '#fecdd3',
                        overflowX: 'auto',
                        marginTop: 4,
                      }}>
                        {test.buggyVersion}
                      </pre>
                    </div>
                  )}

                  {test.reason && (
                    <div style={{ fontSize: 11, color: '#d1d5db', lineHeight: 1.4, borderLeft: `2px solid ${colors.orange}`, paddingLeft: 8, marginTop: 4 }}>
                      {test.reason}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>PROBABILITY</span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: (test.failureProbability ?? 0) >= 60 ? colors.red : (test.failureProbability ?? 0) >= 30 ? colors.orange : colors.green,
                    }}>
                      {test.failureProbability}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>RISK SCORE</span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: colors.orange,
                    }}>
                      {test.riskScore}/100
                    </span>
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {/* 3. Constraint Extremes Content */}
        {activeTab === 'constraints' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Premium Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}>
              {/* CPU Impact Card */}
              <div style={{
                background: 'rgba(13, 21, 39, 0.4)',
                border: `1px solid ${colors.borderGlass}`,
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: 'rgba(168, 85, 247, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
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
              <div style={{
                background: 'rgba(13, 21, 39, 0.4)',
                border: `1px solid ${colors.borderGlass}`,
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: 'rgba(168, 85, 247, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
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
              <div style={{
                background: 'rgba(13, 21, 39, 0.4)',
                border: `1px solid ${colors.borderGlass}`,
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: 'rgba(168, 85, 247, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
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
                <div key={idx} style={{
                  background: colors.bgDark,
                  border: `1px solid ${colors.borderGlass}`,
                  borderRadius: 10,
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: colors.purple,
                        background: 'rgba(168, 85, 247, 0.08)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                      }}>
                        LIMIT-{idx + 1}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7' }}>{test.purpose}</span>
                      
                      {test.constraint && (
                        <span style={{
                          fontSize: 10,
                          color: '#c084fc',
                          fontFamily: 'monospace',
                          background: 'rgba(168, 85, 247, 0.05)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          border: '1px solid rgba(168, 85, 247, 0.15)',
                        }}>
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4 }}>
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
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: test.result === 'PASSED' ? 'rgba(16, 185, 129, 0.15)' : test.result === 'FAILED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: test.result === 'PASSED' ? colors.green : test.result === 'FAILED' ? colors.red : colors.orange,
                        border: `1px solid ${test.result === 'PASSED' ? 'rgba(16, 185, 129, 0.3)' : test.result === 'FAILED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      }}>
                        {test.result}
                      </span>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>RISK SCORE</span>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        color: colors.purple,
                      }}>
                        {test.riskScore}/100
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. AI Generated Cases Content */}
        {activeTab === 'ai' && (
          aiGeneratedCases.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13 }}>
              No AI synthetic novel cases generated.
            </div>
          ) : (
            aiGeneratedCases.map((test, idx) => (
              <div key={idx} style={{
                background: colors.bgDark,
                border: `1px solid ${colors.borderGlass}`,
                borderRadius: 10,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.blue,
                      background: 'rgba(59, 130, 246, 0.08)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                    }}>
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4 }}>
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
                      <span style={{
                        fontSize: 12,
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        color: colors.blue,
                      }}>
                        {test.noveltyScore ?? 90}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>COVERAGE</span>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        color: colors.green,
                      }}>
                        {test.coverageScore ?? 85}%
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>RISK SCORE</span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: colors.blue,
                    }}>
                      {test.riskScore}/100
                    </span>
                  </div>
                </div>
              </div>
            ))
          )
        )}

      </div>
    </div>
  );
}
