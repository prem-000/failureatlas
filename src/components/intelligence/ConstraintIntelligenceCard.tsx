'use client';

import { useState, useEffect } from 'react';
import type { ConstraintIntelligence } from '@/types';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Cpu,
  TrendingUp,
  Zap,
  BookOpen,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Scale
} from 'lucide-react';

const MAX_OPERATIONS = 1e8; // 10^8 operations budget limit

interface Props {
  data?: ConstraintIntelligence;
  difficulty?: string;
  detectedComplexity?: string;
  problemTitle?: string;
}

export function ConstraintIntelligenceCard({ data, difficulty = 'Medium', detectedComplexity = 'O(n²)', problemTitle = '' }: Props) {


  // Safe fallback if data is missing
  const activeData: ConstraintIntelligence = data || {
    problemConstraints: [
      `1 <= n <= ${difficulty === 'Easy' ? '10^4' : difficulty === 'Hard' ? '5 * 10^4' : '10^5'}`,
      '1 <= nums[i] <= 10^9'
    ],
    maxInputSize: difficulty === 'Easy' ? 10000 : difficulty === 'Hard' ? 50000 : 100000,
    inputSizeVariable: 'n',
    complexityBudget: [
      { complexity: 'O(1)', operations: 1, reasoning: 'O(1) is well within the online judge budget.' },
      { complexity: 'O(log n)', operations: 17, reasoning: 'O(log n) is well within the online judge budget.' },
      { complexity: 'O(n)', operations: 100000, reasoning: 'O(n) is well within the online judge budget.' },
      { complexity: 'O(n log n)', operations: 1660964, reasoning: 'O(n log n) is well within the online judge budget.' },
      { complexity: 'O(n²)', operations: 10000000000, reasoning: 'O(n²) exceeds the online judge budget by approximately 100x.' },
      { complexity: 'O(n³)', operations: 1000000000000000, reasoning: 'O(n³) exceeds the online judge budget.' }
    ],
    solutionAnalysis: {
      detectedComplexity: detectedComplexity,
      estimatedOperations: detectedComplexity.includes('n²') ? 10000000000 : 100000,
      safetyMargin: detectedComplexity.includes('n²') ? 0 : 99.9,
      verdict: detectedComplexity.includes('n²') ? 'Dangerous' : 'Safe'
    },
    variantSimulator: [
      { inputSize: 100, status: '✅' },
      { inputSize: 1000, status: '✅' },
      { inputSize: 10000, status: '⚠' },
      { inputSize: 100000, status: '❌' },
      { inputSize: 1000000, status: '❌' }
    ],
    patternRecommendations: [
      { pattern: 'Hash Map', confidence: 90, reason: 'Allows O(1) lookups instead of nested iterations.' },
      { pattern: 'Two Pointer', confidence: 60, reason: 'Useful if arrays can be sorted or partitioned.' }
    ],
    learningOpportunity: {
      currentComplexity: detectedComplexity,
      optimalComplexity: 'O(n)',
      improvement: '100x fewer operations',
      technique: 'Frequency Counter Hash Map'
    }
  };

  const verdict = activeData.solutionAnalysis.verdict;
  const verdictColor = verdict === 'Dangerous' ? '#ef4444' : verdict === 'Borderline' ? '#f59e0b' : '#22c55e';
  const verdictBg = verdict === 'Dangerous' ? 'rgba(239,68,68,0.1)' : verdict === 'Borderline' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        .ci-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
          gap: 16px;
          width: 100%;
        }
        .ci-card {
          background: #141416;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 16px 18px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
          min-width: 0;
          overflow-x: hidden;
          word-break: break-word;
        }
        .ci-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          color: #a1a1aa;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .ci-accent-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
        }
        .budget-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          font-size: 12px;
        }
        .budget-row:last-child {
          border-bottom: none;
        }
        .ci-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 12px;
        }
        .ci-table th {
          color: #71717a;
          font-weight: 700;
          padding: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ci-table td {
          padding: 10px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          color: #e4e4e7;
        }
        .ci-mob-row {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
      `}</style>

      {/* Row 1: Problem Constraints & Solution Analysis */}
      <div className="ci-grid">
        {/* Card 1: Problem Constraints */}
        <div className="ci-card">
          <div className="ci-accent-line" style={{ background: 'linear-gradient(90deg, #3b82f6, transparent)' }} />
          <div className="ci-card-header">
            <Cpu size={14} style={{ color: '#3b82f6' }} />
            Problem Constraints
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeData.problemConstraints.map((constraint, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: '#60a5fa',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <ChevronRight size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <span>{constraint}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Your Solution Analysis */}
        <div className="ci-card">
          <div className="ci-accent-line" style={{ background: `linear-gradient(90deg, ${verdictColor}, transparent)` }} />
          <div className="ci-card-header">
            <Activity size={14} style={{ color: verdictColor }} />
            Your Solution Analysis
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: '#71717a', fontWeight: 600 }}>DETECTED COMPLEXITY</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#f4f4f5', fontFamily: 'monospace' }}>
                  {activeData.solutionAnalysis.detectedComplexity}
                </div>
              </div>
              <div style={{
                background: verdictBg,
                color: verdictColor,
                border: `1px solid ${verdictColor}30`,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800
              }}>
                {verdict}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ height: 6, background: '#222', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                width: `${activeData.solutionAnalysis.safetyMargin}%`,
                height: '100%',
                background: verdictColor,
                borderRadius: 3,
                boxShadow: `0 0 8px ${verdictColor}60`,
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
              }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px] mt-1">
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 8 }}>
                <span style={{ fontSize: 9, color: '#71717a', display: 'block', fontWeight: 600 }}>EST. OPERATIONS</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7' }}>
                  {activeData.solutionAnalysis.estimatedOperations.toLocaleString()}
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 8 }}>
                <span style={{ fontSize: 9, color: '#71717a', display: 'block', fontWeight: 600 }}>SAFETY MARGIN</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: verdictColor }}>
                  {activeData.solutionAnalysis.safetyMargin}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Complexity Budget & Variant Simulator */}
      <div className="ci-grid">
        {/* Card 3: Complexity Budget */}
        <div className="ci-card">
          <div className="ci-accent-line" style={{ background: 'linear-gradient(90deg, #10b981, transparent)' }} />
          <div className="ci-card-header">
            <Scale size={14} style={{ color: '#10b981' }} />
            Complexity Budget (Max Input Size: {activeData.maxInputSize.toLocaleString()})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activeData.complexityBudget.map((budget, i) => {
              const exceeds = budget.operations > MAX_OPERATIONS;
              return (
                <div key={i} className="budget-row" style={{ flexDirection: 'column', gap: 3, padding: '6px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#e4e4e7', fontSize: 12 }}>{budget.complexity}</span>
                    <span style={{ color: exceeds ? '#ef4444' : '#71717a', fontFamily: 'monospace', fontSize: 11 }}>
                      {budget.operations.toLocaleString()} ops
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: exceeds ? '#fca5a5' : '#52525b', lineHeight: 1.4, opacity: 0.9 }}>
                    {budget.reasoning}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 4: Variant Simulator */}
        <div className="ci-card">
          <div className="ci-accent-line" style={{ background: 'linear-gradient(90deg, #f59e0b, transparent)' }} />
          <div className="ci-card-header">
            <Scale size={14} style={{ color: '#f59e0b' }} />
            If This Problem Scaled
          </div>

          <div className="hidden sm:block">
            <table className="ci-table">
              <thead>
                <tr>
                  <th>Input Size ({activeData.inputSizeVariable})</th>
                  <th>Estimated Status</th>
                </tr>
              </thead>
              <tbody>
                {activeData.variantSimulator.map((sim, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sim.inputSize.toLocaleString()}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 700,
                        color: sim.status === '✅' ? '#22c55e' : sim.status === '⚠' ? '#f59e0b' : '#ef4444'
                       }}>
                        {sim.status} {sim.status === '✅' ? 'Safe' : sim.status === '⚠' ? 'Borderline' : 'TLE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block sm:hidden">
            {activeData.variantSimulator.map((sim, i) => (
              <div key={i} className="ci-mob-row">
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{sim.inputSize.toLocaleString()}</span>
                <span style={{
                  fontWeight: 700,
                  fontSize: 11,
                  color: sim.status === '✅' ? '#22c55e' : sim.status === '⚠' ? '#f59e0b' : '#ef4444'
                }}>
                  {sim.status} {sim.status === '✅' ? 'Safe' : sim.status === '⚠' ? 'Borderline' : 'TLE'}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 14,
            padding: '10px 12px',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.12)',
            borderRadius: 8,
            fontSize: 11,
            color: '#fcd34d',
            lineHeight: 1.5
          }}>
            {scalabilitySummary(activeData)}
          </div>
        </div>
      </div>

      {/* Row 3: Pattern Recommendations & Learning Upgrade */}
      <div className="ci-grid">
        {/* Card 5: Pattern Recommendations */}
        <div className="ci-card">
          <div className="ci-accent-line" style={{ background: 'linear-gradient(90deg, #a855f7, transparent)' }} />
          <div className="ci-card-header">
            <Sparkles size={14} style={{ color: '#a855f7' }} />
            Pattern Recommendations
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeData.patternRecommendations.slice(0, 3).map((rec, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontWeight: 800, color: '#f4f4f5', fontSize: 12 }}>{rec.pattern}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#a855f7' }}>{rec.confidence}% confidence</span>
                </div>
                <div style={{ fontSize: 11, color: '#71717a', lineHeight: 1.4 }}>{rec.reason}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 6: Learning Opportunity */}
        <div className="ci-card" style={{ background: 'linear-gradient(135deg, #141416, #0a1420)' }}>
          <div className="ci-accent-line" style={{ background: 'linear-gradient(90deg, #0284c7, transparent)' }} />
          <div className="ci-card-header">
            <Zap size={14} style={{ color: '#0284c7' }} />
            Learning Opportunity
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 9, color: '#71717a', display: 'block', fontWeight: 600 }}>CURRENT COMPLEXITY</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#f4f4f5', fontFamily: 'monospace' }}>
                  {activeData.learningOpportunity.currentComplexity}
                </span>
              </div>
              <div style={{ background: 'rgba(2,132,199,0.08)', padding: '10px', borderRadius: 8, border: '1px solid rgba(2,132,199,0.2)' }}>
                <span style={{ fontSize: 9, color: '#38bdf8', display: 'block', fontWeight: 600 }}>KNOWN OPTIMAL</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                  {activeData.learningOpportunity.optimalComplexity}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', padding: '10px 14px', borderRadius: 10 }}>
              <ShieldCheck size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 9, color: '#4ade80', fontWeight: 700 }}>EFFICIENCY GAIN</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#86efac' }}>
                  {activeData.learningOpportunity.improvement}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: 10 }}>
              <BookOpen size={16} style={{ color: '#0284c7', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 9, color: '#71717a', fontWeight: 700 }}>RECOMMENDED TECHNIQUE</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#e4e4e7' }}>
                  {activeData.learningOpportunity.technique}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function scalabilitySummary(activeData: ConstraintIntelligence): string {
  const lastSafe = [...activeData.variantSimulator].reverse().find(v => v.status === '✅');
  const lastBorderline = [...activeData.variantSimulator].reverse().find(v => v.status === '⚠');
  const maxPracticalSize = lastSafe ? lastSafe.inputSize : (lastBorderline ? lastBorderline.inputSize : 0);

  if (maxPracticalSize === 0) {
    return `Your solution is impractical even at very small scales (n = 100). A more efficient approach is immediately required.`;
  }
  if (maxPracticalSize >= 1000000) {
    return `Your solution remains practical and highly scalable even for very large inputs up to n = 1,000,000.`;
  }
  return `Your solution remains practical until approximately n = ${maxPracticalSize.toLocaleString()}. Beyond that, a more efficient approach becomes necessary.`;
}
