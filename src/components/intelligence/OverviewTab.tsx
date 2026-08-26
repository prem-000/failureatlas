'use client';

import React from 'react';
import {
  ScanLine,
  GitBranch,
  Gauge,
  Boxes,
  Code2,
  Info,
  Bug,
  Target,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { PraxisReport, DimensionHealthScore } from '@/lib/intelligence/types';
import type { AnalysisCategory } from '@/lib/intelligence/analysis/evidence-engine';

interface OverviewTabProps {
  report: PraxisReport;
  onSelectCategory?: (category: AnalysisCategory) => void;
}

const CATEGORY_ICONS: Record<AnalysisCategory, React.ElementType> = {
  boundary: ScanLine,
  algorithm: GitBranch,
  complexity: Gauge,
  data_structure: Boxes,
  implementation: Code2,
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ report, onSelectCategory }) => {
  const smallestProof = report.smallestCounterexample;
  const isPerformanceAtRisk =
    report.assessment?.performance === 'AT_RISK' ||
    report.assessment?.performance === 'LIKELY_LIMIT_EXCEEDED' ||
    report.assessment?.performance === 'LIMIT_EXCEEDED';

  const untestedMechanisms = report.failureMechanismCoverage?.untestedMechanisms || [];

  return (
    <div className="space-y-6">
      {/* 1. Primary Observation Narrative Card */}
      <div className="bg-[#12141a] border border-[#232733] rounded-xl p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-sky-400 tracking-wider uppercase mb-2">
          <Info className="w-4 h-4" />
          Primary Observation
        </div>
        <p className="text-sm text-[#e6edf3] leading-relaxed">
          {report.primaryObservation}
        </p>
      </div>

      {/* 2. Performance Complexity Warning (If Performance At Risk) */}
      {isPerformanceAtRisk && report.scalingBenchmark && (
        <div className="bg-[#1a1812] border border-amber-500/30 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 tracking-wider uppercase mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Asymptotic Scaling Warning ({report.scalingBenchmark.inferredComplexity})
          </div>
          <p className="text-xs text-[#e6edf3] leading-relaxed mb-3">
            {report.scalingBenchmark.explanation}
          </p>
          {report.scalingBenchmark.extrapolatedConstraintOperations && (
            <div className="text-[11px] text-amber-300 font-mono mb-3">
              Extrapolation: {report.scalingBenchmark.extrapolatedConstraintOperations}
            </div>
          )}
          {report.scalingBenchmark.measurements.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {report.scalingBenchmark.measurements.map(m => (
                <div
                  key={m.scaleN}
                  className="bg-[#12141a] border border-[#232733] px-2.5 py-1 rounded font-mono text-[11px] text-[#8b949e]"
                >
                  <span className="text-[#e6edf3]">N = {m.scaleN}</span>: <span className="text-amber-400">{m.runtimeMs}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Smallest Counterexample Card (If Confirmed Defect Exists) */}
      {smallestProof && (
        <div className="bg-[#1c131a] border border-rose-500/30 rounded-xl p-5 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 tracking-wider uppercase">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Smallest Verified Counterexample (Reproduced 3/3 Runs)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1 border border-emerald-500/40">
                <ShieldCheck className="w-2.5 h-2.5" /> 3/3 Deterministic
              </span>
              {smallestProof.minimalProof?.isMinimized && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold flex items-center gap-1 border border-rose-500/40">
                  <Zap className="w-2.5 h-2.5" /> Reduced ({smallestProof.minimalProof.reductionSteps} step shrink)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-[#12141a]/80 p-3 rounded-lg border border-[#232733]">
            <div>
              <span className="text-[#8b949e] font-semibold block mb-1">Input:</span>
              <code className="text-[#e6edf3] bg-[#161b22] px-2 py-1 rounded font-mono block overflow-x-auto">
                {smallestProof.normalizedInput}
              </code>
            </div>
            <div>
              <span className="text-emerald-400 font-semibold block mb-1">Reference Oracle (Expected):</span>
              <code className="text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded font-mono block overflow-x-auto border border-emerald-800/40">
                {JSON.stringify(smallestProof.expectedOutput)}
              </code>
            </div>
            <div>
              <span className="text-rose-400 font-semibold block mb-1">Your Submission (Actual):</span>
              <code className="text-rose-400 bg-rose-950/40 px-2 py-1 rounded font-mono block overflow-x-auto border border-rose-800/40">
                {JSON.stringify(smallestProof.userOutput)}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* 4. Failure Mechanism Exploration Detail */}
      {untestedMechanisms.length > 0 && (
        <div className="bg-[#12141a] border border-[#232733] rounded-xl p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-[#8b949e] uppercase mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            Unexplored Domain Mechanisms ({untestedMechanisms.length})
          </div>
          <p className="text-[#8b949e] mb-2 leading-relaxed">
            The following problem failure mechanisms were not fully explored in this submission's test suite:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[#e6edf3]/80">
            {untestedMechanisms.slice(0, 3).map((mech, idx) => (
              <li key={idx}>{mech}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Key Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#12141a] border border-[#232733] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#e6edf3]">{report.metrics.evidenceCount}</div>
            <div className="text-xs text-[#8b949e]">Evidence signals found</div>
          </div>
        </div>

        <div className="bg-[#12141a] border border-[#232733] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#e6edf3]">{report.metrics.testsCreatedCount}</div>
            <div className="text-xs text-[#8b949e]">Targeted tests verified</div>
          </div>
        </div>

        <div className="bg-[#12141a] border border-[#232733] rounded-xl p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            report.metrics.defectsExposedCount > 0
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#e6edf3]">{report.metrics.defectsExposedCount}</div>
            <div className="text-xs text-[#8b949e]">Confirmed defects</div>
          </div>
        </div>
      </div>

      {/* 6. Code Health 5-Dimension Bars */}
      <div className="bg-[#12141a] border border-[#232733] rounded-xl p-5">
        <div className="text-xs font-bold text-[#8b949e] tracking-wider uppercase mb-5">
          Code Health Dimensions
        </div>

        <div className="space-y-4">
          {report.dimensionScores.map((dim: DimensionHealthScore) => {
            const Icon = CATEGORY_ICONS[dim.category] || Code2;
            const isFailing = dim.confirmedDefectCount > 0;

            return (
              <div
                key={dim.category}
                onClick={() => onSelectCategory?.(dim.category)}
                className="group cursor-pointer p-3 rounded-lg hover:bg-[#161b22] border border-transparent hover:border-[#232733] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isFailing ? 'text-rose-400' : 'text-sky-400'}`} />
                    <span className="text-sm font-semibold text-[#e6edf3] group-hover:text-sky-400 transition-colors">
                      {dim.label}
                    </span>
                    {dim.confirmedDefectCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                        {dim.confirmedDefectCount} confirmed defect
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-[#e6edf3]">{dim.score} / 100</span>
                </div>

                <div className="w-full h-2 bg-[#232733] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      dim.score >= 85
                        ? 'bg-emerald-400'
                        : dim.score >= 70
                        ? 'bg-sky-400'
                        : dim.score >= 50
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
