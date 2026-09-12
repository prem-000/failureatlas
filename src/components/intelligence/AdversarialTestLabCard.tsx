'use client';

import React from 'react';
import type { AdversarialTestLab } from '@/types';
import {
  ProbabilityCollapseIcon,
  CoverageGridIcon,
  StructuralIntegrityCoreIcon,
} from './AdversarialIcons';

import { BreakMySolutionTab } from './AdversarialTestLabCard/BreakMySolutionTab';

interface Props {
  data: AdversarialTestLab;
  problemSlug?: string;
  submissionId?: string;
}

export function AdversarialTestLabCard({ data, problemSlug, submissionId }: Props) {
  const {
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
        {/* Metric 1: Invariant Integrity */}
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

        {/* Metric 2: Constraint Limits */}
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

        {/* Metric 3: Robustness Score */}
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
      </div>

      {/* ─── Break Solution Content ─── */}
      <div className="test-cards-grid">
        <BreakMySolutionTab
          breakMySolution={breakMySolution}
          breakSolutionData={breakSolutionData}
          colors={colors}
        />
      </div>
    </div>
  );
}
