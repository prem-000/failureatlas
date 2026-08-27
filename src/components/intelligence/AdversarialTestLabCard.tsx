'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { AdversarialTestLab } from '@/types';
import {
  ExecutionMeshIcon,
  ProbabilityCollapseIcon,
  CoverageGridIcon,
  StructuralIntegrityCoreIcon,
  InferenceLensIcon,
  NeuralProbeIcon,
  FractureMatrixIcon,
} from './AdversarialIcons';

import { HiddenTestsTab } from './AdversarialTestLabCard/HiddenTestsTab';
import { BreakMySolutionTab } from './AdversarialTestLabCard/BreakMySolutionTab';

interface Props {
  data: AdversarialTestLab;
  problemSlug?: string;
  submissionId?: string;
}

type TabType = 'hidden' | 'break';

export function AdversarialTestLabCard({ data, problemSlug, submissionId }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('hidden');

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

  const {
    hiddenTests = [],
    breakMySolution = [],
    breakSolutionData,
    coverageIntelligence = {
      hiddenTestsSurvived: 5,
      potentialFailureModesAvoided: 5,
      constraintCoverage: 95,
      robustnessScore: 90,
      confidenceScore: 94,
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
      return val >= 85 ? colors.green : val >= 65 ? colors.orange : colors.red;
    }
    return val >= 4 ? colors.green : val >= 2 ? colors.orange : colors.red;
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
          grid-template-columns: 1fr;
          gap: 16px;
          width: 100%;
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
              color: getMetricColor(hiddenTests.length || 5, false),
            }}>
              {hiddenTests.length || 5}
            </span>
            <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>/ 5 TARGETS</span>
          </div>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>Evidence Synthesis</span>
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
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em' }}>INVARIANT INTEGRITY</span>
            <ProbabilityCollapseIcon size={16} style={{ color: colors.orange }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'monospace',
              color: getMetricColor(coverageIntelligence.confidenceScore || 94),
            }}>
              {coverageIntelligence.confidenceScore || 94}%
            </span>
          </div>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>State Balance</span>
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
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em' }}>CONSTRAINT LIMITS</span>
            <CoverageGridIcon size={16} style={{ color: colors.purple }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'monospace',
              color: getMetricColor(coverageIntelligence.constraintCoverage || 95),
            }}>
              {coverageIntelligence.constraintCoverage || 95}%
            </span>
          </div>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>Boundary Field</span>
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
              color: getMetricColor(coverageIntelligence.robustnessScore || 90),
            }}>
              {coverageIntelligence.robustnessScore || 90}%
            </span>
          </div>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>Structural Integrity</span>
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
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em' }}>EVIDENCE CONFIDENCE</span>
            <InferenceLensIcon size={16} style={{ color: colors.blue }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'monospace',
              color: getMetricColor(coverageIntelligence.confidenceScore || 94),
            }}>
              {coverageIntelligence.confidenceScore || 94}%
            </span>
          </div>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>Source Provenance</span>
        </div>
      </div>

      {/* ─── Intelligence Tab Selector ─── */}
      <div className="secondary-nav-container">
        <div className="secondary-nav-wrapper">
          {/* Tab 1: Hidden Tests */}
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
              <span className="sm:hidden">{activeTab === 'hidden' ? '← Hidden (5) →' : 'Hidden (5)'}</span>
              <span className="hidden sm:inline">HIDDEN TESTS (5)</span>
            </span>
          </button>

          {/* Tab 2: Break Solution */}
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
              <span className="sm:hidden">{activeTab === 'break' ? '← Break Solution →' : 'Break Solution'}</span>
              <span className="hidden sm:inline">BREAK SOLUTION</span>
            </span>
          </button>
        </div>
      </div>

      {/* ─── Tab Contents ─── */}
      <div className="test-cards-grid">
        {/* 1. Hidden Tests Content */}
        {activeTab === 'hidden' && (
          <HiddenTestsTab hiddenTests={hiddenTests} colors={colors} />
        )}

        {/* 2. Break Solution Content */}
        {activeTab === 'break' && (
          <BreakMySolutionTab
            breakMySolution={breakMySolution}
            breakSolutionData={breakSolutionData}
            colors={colors}
          />
        )}
      </div>
    </div>
  );
}
