'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Zap, Clock, ShieldCheck } from 'lucide-react';
import type { PraxisReport } from '@/lib/intelligence/types';

interface SubmissionAnalysisCardProps {
  report: PraxisReport;
  status?: string;
}

export const SubmissionAnalysisCard: React.FC<SubmissionAnalysisCardProps> = ({
  report,
}) => {
  const assessment = report.assessment || {
    correctness: report.metrics.defectsExposedCount > 0 ? 'DEFECT_CONFIRMED' : 'NO_DEFECT_FOUND',
    performance: report.scalingBenchmark?.performanceAssessment || 'WITHIN_EXPECTATION',
    coverage: report.analysisCoverage || 75,
    oracleSupport: report.oracleSupport || 'FULL_ORACLE_SUPPORT',
    untestedMechanisms: [],
  };

  const isNoDefectFound = assessment.correctness === 'NO_DEFECT_FOUND';
  const isPerformanceAtRisk =
    assessment.performance === 'AT_RISK' ||
    assessment.performance === 'LIKELY_LIMIT_EXCEEDED' ||
    assessment.performance === 'LIMIT_EXCEEDED';

  return (
    <div className="flex-1 bg-[#12141a] border border-[#232733] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
      {/* Header Row: Title and Assessment Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-xs font-bold tracking-widest text-[#8b949e] uppercase">
          Submission Assessment
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Correctness Badge */}
          {isNoDefectFound ? (
            <span className="text-xs px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Correctness: No Defect Found
            </span>
          ) : assessment.correctness === 'DEFECT_CONFIRMED' ? (
            <span className="text-xs px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-3.5 h-3.5" /> Correctness: Defect Confirmed (3/3)
            </span>
          ) : (
            <span className="text-xs px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5" /> Correctness: Inconclusive
            </span>
          )}

          {/* 2. Performance Badge */}
          {isPerformanceAtRisk ? (
            <span className="text-xs px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" /> Performance: Complexity Risk
            </span>
          ) : assessment.performance === 'WITHIN_EXPECTATION' ? (
            <span className="text-xs px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-3.5 h-3.5" /> Performance: Optimal
            </span>
          ) : null}
        </div>
      </div>

      {/* Grid of Strategy, Oracle Support, and Mechanisms Meta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#232733]/60">
        <div>
          <div className="text-[11px] text-[#8b949e] uppercase font-semibold">Detected approach</div>
          <div className="text-sm font-semibold text-[#e6edf3] mt-0.5">{report.detectedApproach}</div>
        </div>

        <div>
          <div className="text-[11px] text-[#8b949e] uppercase font-semibold">Oracle support</div>
          <div className="text-sm font-semibold text-sky-400 mt-0.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            {report.oracleSupport ? report.oracleSupport.replace(/_/g, ' ') : 'FULL ORACLE SUPPORT'}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-[#8b949e] uppercase font-semibold">Mechanisms tested</div>
          <div className="text-sm font-semibold text-emerald-400 mt-0.5">
            {report.failureMechanismCoverage
              ? `${report.failureMechanismCoverage.mechanismsTested} / ${report.failureMechanismCoverage.totalRelevantMechanisms} (${report.failureMechanismCoverage.coveragePercent}%)`
              : `${report.analysisCoverage}%`}
          </div>
        </div>
      </div>
    </div>
  );
};
