'use client';

import React from 'react';
import { Target, Lightbulb } from 'lucide-react';
import type { AnalysisEvidence } from '@/lib/intelligence/analysis/evidence-engine';

interface RootCauseCardProps {
  confirmedEvidence: AnalysisEvidence[];
}

export const RootCauseCard: React.FC<RootCauseCardProps> = ({ confirmedEvidence }) => {
  if (confirmedEvidence.length === 0) {
    return (
      <div className="bg-[#12141a] border border-[#232733] rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
          <Lightbulb className="w-4 h-4" />
          Algorithmic Invariant Intact
        </div>
        <p className="text-sm text-[#e6edf3]">
          No systemic logic defects were confirmed by targeted test execution. Your solution correctly maintains all boundary invariants.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#12141a] border border-[#232733] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
        <Target className="w-4 h-4" />
        Confirmed Root Cause Analysis
      </div>

      <div className="space-y-3">
        {confirmedEvidence.map((ev, idx) => (
          <div key={ev.id} className="bg-[#0b0c10] border border-[#232733] rounded-lg p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sky-400">{ev.detector}</span>
              <span className="text-[#8b949e]">Line {ev.source.lineStart}</span>
            </div>
            <p className="text-[#e6edf3] font-semibold">{ev.finding}</p>
            <p className="text-[#8b949e] leading-relaxed">{ev.hypothesis}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
