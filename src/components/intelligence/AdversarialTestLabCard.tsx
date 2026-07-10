'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { AdversarialTestLab } from '@/types';
import { apiFetch } from '@/lib/api/client';

// Imported modular components & icons
import {
  ExecutionMeshIcon,
  ProbabilityCollapseIcon,
  CoverageGridIcon,
  StructuralIntegrityCoreIcon,
  InferenceLensIcon,
  NeuralProbeIcon,
  FractureMatrixIcon,
  BoundaryFieldIcon,
  SyntheticCoreIcon,
} from './AdversarialIcons';

import { HiddenTestsTab } from './AdversarialTestLabCard/HiddenTestsTab';
import { BreakMySolutionTab } from './AdversarialTestLabCard/BreakMySolutionTab';
import { ConstraintsTab } from './AdversarialTestLabCard/ConstraintsTab';
import { AiGeneratedTab, AttackLabTab } from './AdversarialTestLabCard/AiAttackTab';

interface Props {
  data: AdversarialTestLab;
  problemSlug?: string;
  submissionId?: string;
}

type TabType = 'hidden' | 'break' | 'constraints' | 'ai' | 'attack';

export function AdversarialTestLabCard({ data, problemSlug, submissionId }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('hidden');
  const [generatedTests, setGeneratedTests] = useState<any[]>([]);
  const [loadingGenerated, setLoadingGenerated] = useState(false);
  const [difficultyStage, setDifficultyStage] = useState(3);

  const tabRefs = useRef<Record<TabType, HTMLButtonElement | null>>({} as any);

  useEffect(() => {
    const activeBtn = tabRefs.current[activeTab];
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  const handleGenerateMore = async () => {
    setActiveTab('attack');
    setLoadingGenerated(true);
    try {
      const res = await apiFetch<{ success: boolean; data: { tests: any[]; difficultyStage: number } }>(
        '/api/behavior-insights/generate-tests',
        {
          method: 'POST',
          body: JSON.stringify({
            problemSlug,
            submissionId,
            difficultyStage
          })
        }
      );
      if (res.data?.tests) {
        setGeneratedTests(res.data.tests);
        setDifficultyStage(res.data.difficultyStage);
      }
    } catch (err) {
      console.error('Failed to generate tests:', err);
    } finally {
      setLoadingGenerated(false);
    }
  };

  const handleGenerateHarder = async () => {
    const nextStage = difficultyStage >= 5 ? 1 : difficultyStage + 1;
    setDifficultyStage(nextStage);
    setActiveTab('attack');
    setLoadingGenerated(true);
    try {
      const res = await apiFetch<{ success: boolean; data: { tests: any[]; difficultyStage: number } }>(
        '/api/behavior-insights/generate-tests',
        {
          method: 'POST',
          body: JSON.stringify({
            problemSlug,
            submissionId,
            difficultyStage: nextStage
          })
        }
      );
      if (res.data?.tests) {
        setGeneratedTests(res.data.tests);
        setDifficultyStage(res.data.difficultyStage);
      }
    } catch (err) {
      console.error('Failed to generate harder tests:', err);
    } finally {
      setLoadingGenerated(false);
    }
  };

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
      <style>{`
        .coverage-intelligence-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
          gap: 10px;
        }
        .test-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
          gap: 24px;
          width: 100%;
        }
        .risk-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
          gap: 10px;
        }
        .test-card {
          min-width: 0;
          overflow-x: hidden;
          flex-shrink: 1;
          word-break: break-word;
        }
        @media (max-width: 767px) {
          .test-card {
            flex-direction: column !important;
            gap: 12px !important;
            padding: 12px 14px !important;
          }
        }
      `}</style>
      {/* ─── Coverage Intelligence Panel (Header Bar) ─── */}
      <div className="coverage-intelligence-grid" style={{
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
      <div className="secondary-nav-container">
        <div className="secondary-nav-wrapper">
          {/* Tab 1 */}
          <button
            ref={el => { tabRefs.current['hidden'] = el; }}
            onClick={() => setActiveTab('hidden')}
            className={`secondary-nav-tab compact ${activeTab === 'hidden' ? 'active' : ''}`}
            style={{
              '--active-bg': 'rgba(0, 240, 255, 0.08)',
              '--active-border': colors.borderActiveCyan,
              '--active-color': colors.cyan,
            } as React.CSSProperties}
          >
            <NeuralProbeIcon size={14} className="hidden sm:inline-block" style={{ color: activeTab === 'hidden' ? colors.cyan : '#71717a', marginRight: 4 }} />
            <span>
              <span className="sm:hidden">{activeTab === 'hidden' ? '← Hidden →' : 'Hidden'}</span>
              <span className="hidden sm:inline">HIDDEN TESTS</span>
            </span>
          </button>

          {/* Tab 2 */}
          <button
            ref={el => { tabRefs.current['break'] = el; }}
            onClick={() => setActiveTab('break')}
            className={`secondary-nav-tab compact ${activeTab === 'break' ? 'active' : ''}`}
            style={{
              '--active-bg': 'rgba(249, 115, 22, 0.08)',
              '--active-border': colors.borderActiveOrange,
              '--active-color': colors.orange,
            } as React.CSSProperties}
          >
            <FractureMatrixIcon size={14} className="hidden sm:inline-block" style={{ color: activeTab === 'break' ? colors.orange : '#71717a', marginRight: 4 }} />
            <span>
              <span className="sm:hidden">{activeTab === 'break' ? '← Break →' : 'Break'}</span>
              <span className="hidden sm:inline">BREAK SOLUTION</span>
            </span>
          </button>

          {/* Tab 3 */}
          <button
            ref={el => { tabRefs.current['constraints'] = el; }}
            onClick={() => setActiveTab('constraints')}
            className={`secondary-nav-tab compact ${activeTab === 'constraints' ? 'active' : ''}`}
            style={{
              '--active-bg': 'rgba(168, 85, 247, 0.08)',
              '--active-border': colors.borderActivePurple,
              '--active-color': colors.purple,
            } as React.CSSProperties}
          >
            <BoundaryFieldIcon size={14} className="hidden sm:inline-block" style={{ color: activeTab === 'constraints' ? colors.purple : '#71717a', marginRight: 4 }} />
            <span>
              <span className="sm:hidden">{activeTab === 'constraints' ? '← Constraints →' : 'Constraints'}</span>
              <span className="hidden sm:inline">CONSTRAINT EXTREMES</span>
            </span>
          </button>

          {/* Tab 4 */}
          <button
            ref={el => { tabRefs.current['ai'] = el; }}
            onClick={() => setActiveTab('ai')}
            className={`secondary-nav-tab compact ${activeTab === 'ai' ? 'active' : ''}`}
            style={{
              '--active-bg': 'rgba(59, 130, 246, 0.08)',
              '--active-border': colors.borderActiveBlue,
              '--active-color': colors.blue,
            } as React.CSSProperties}
          >
            <SyntheticCoreIcon size={14} className="hidden sm:inline-block" style={{ color: activeTab === 'ai' ? colors.blue : '#71717a', marginRight: 4 }} />
            <span>
              <span className="sm:hidden">{activeTab === 'ai' ? '← AI Cases →' : 'AI Cases'}</span>
              <span className="hidden sm:inline">AI NOVEL CASES</span>
            </span>
          </button>

          {/* Tab 5 (Attack Lab) */}
          {(generatedTests.length > 0 || loadingGenerated) && (
            <button
              ref={el => { tabRefs.current['attack'] = el; }}
              onClick={() => setActiveTab('attack')}
              className={`secondary-nav-tab compact ${activeTab === 'attack' ? 'active' : ''}`}
              style={{
                '--active-bg': 'rgba(239, 68, 68, 0.08)',
                '--active-border': 'rgba(239, 68, 68, 0.3)',
                '--active-color': '#ef4444',
              } as React.CSSProperties}
            >
              <span className="hidden sm:inline-block" style={{ fontSize: 13, marginRight: 4 }}>💥</span>
              <span>
                <span className="sm:hidden">{activeTab === 'attack' ? `← Attack (${generatedTests.length}) →` : `Attack (${generatedTests.length})`}</span>
                <span className="hidden sm:inline">{`ATTACK LAB (${generatedTests.length})`}</span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Control buttons */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        background: '#111',
        border: '1px solid #1f1f1f',
        borderRadius: 8,
        marginTop: -8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#71717a', fontWeight: 600 }}>
          <span>TARGET STAGE:</span>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(56, 189, 248, 0.1)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.2)'
          }}>STAGE {difficultyStage} ({['Basic', 'Edge', 'Adversarial', 'Worst Case', 'Constraint Max'][difficultyStage - 1]})</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleGenerateHarder}
            disabled={loadingGenerated}
            className="compact"
            style={{
              background: 'none',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              borderRadius: 6,
              color: '#c084fc',
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            ⚡ Generate Harder Tests
          </button>
          <button
            onClick={handleGenerateMore}
            disabled={loadingGenerated}
            className="compact"
            style={{
              background: '#ff5f5215',
              border: '1px solid #ff5f5240',
              borderRadius: 6,
              color: '#ff5f52',
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            💥 Generate More Tests
          </button>
        </div>
      </div>

      {/* ─── Tab Contents (High-Density Info Cards) ─── */}
      <div className="test-cards-grid">
        
        {/* 1. Hidden Tests Content */}
        {activeTab === 'hidden' && (
          <HiddenTestsTab hiddenTests={hiddenTests} colors={colors} />
        )}

        {/* 2. Break My Solution Content */}
        {activeTab === 'break' && (
          <BreakMySolutionTab breakMySolution={breakMySolution} colors={colors} />
        )}

        {/* 3. Constraint Extremes Content */}
        {activeTab === 'constraints' && (
          <ConstraintsTab constraintExtremes={constraintExtremes} colors={colors} />
        )}

        {/* 4. AI Generated Cases Content */}
        {activeTab === 'ai' && (
          <AiGeneratedTab aiGeneratedCases={aiGeneratedCases} colors={colors} />
        )}

        {/* 5. Attack Lab Content */}
        {activeTab === 'attack' && (
          <AttackLabTab
            loadingGenerated={loadingGenerated}
            generatedTests={generatedTests}
            difficultyStage={difficultyStage}
            colors={colors}
          />
        )}

      </div>
    </div>
  );
}
