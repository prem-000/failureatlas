'use client';

import React from 'react';
import {
  ScanLine,
  GitBranch,
  Gauge,
  Boxes,
  Code2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
} from 'lucide-react';
import type { AnalysisEvidence, AnalysisCategory, EvidenceStatus } from '@/lib/intelligence/analysis/evidence-engine';
import { SourceSnippet } from './SourceSnippet';

interface EvidenceCardProps {
  evidence: AnalysisEvidence;
}

const CATEGORY_ICONS: Record<AnalysisCategory, React.ElementType> = {
  boundary: ScanLine,
  algorithm: GitBranch,
  complexity: Gauge,
  data_structure: Boxes,
  implementation: Code2,
};

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence }) => {
  const Icon = CATEGORY_ICONS[evidence.category] || Code2;

  const getStatusBadge = (status: EvidenceStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
            <AlertTriangle className="w-3 h-3" /> Confirmed defect
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Tests passed / Unproven
          </span>
        );
      case 'INCONCLUSIVE':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
            <HelpCircle className="w-3 h-3" /> Inconclusive
          </span>
        );
      case 'TESTED':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
            <Clock className="w-3 h-3" /> Tested
          </span>
        );
      case 'POTENTIAL':
      default:
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
            <Clock className="w-3 h-3" /> Requires verification
          </span>
        );
    }
  };

  return (
    <div className="bg-[#12141a] border border-[#232733] rounded-xl p-5 space-y-3 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#161b22] border border-[#232733] flex items-center justify-center text-sky-400">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono text-[#8b949e]">{evidence.detector}</div>
            <div className="text-sm font-bold text-[#e6edf3]">Line {evidence.source.lineStart}</div>
          </div>
        </div>

        <div>{getStatusBadge(evidence.status)}</div>
      </div>

      <SourceSnippet
        lineStart={evidence.source.lineStart}
        lineEnd={evidence.source.lineEnd}
        snippet={evidence.source.snippet}
      />

      <div className="space-y-2 pt-1 text-xs">
        <div>
          <span className="font-semibold text-[#8b949e] uppercase tracking-wider text-[10px]">
            Finding:
          </span>
          <p className="text-[#e6edf3] mt-0.5">{evidence.finding}</p>
        </div>

        <div>
          <span className="font-semibold text-sky-400 uppercase tracking-wider text-[10px]">
            Hypothesis:
          </span>
          <p className="text-[#8b949e] mt-0.5 leading-relaxed">{evidence.hypothesis}</p>
        </div>
      </div>
    </div>
  );
};
