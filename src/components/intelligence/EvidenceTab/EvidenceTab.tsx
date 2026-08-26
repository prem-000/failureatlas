'use client';

import React from 'react';
import type { PraxisReport } from '@/lib/intelligence/types';
import type { AnalysisCategory } from '@/lib/intelligence/analysis/evidence-engine';
import { EvidenceCard } from './EvidenceCard';

interface EvidenceTabProps {
  report: PraxisReport;
  selectedCategory?: AnalysisCategory | null;
}

export const EvidenceTab: React.FC<EvidenceTabProps> = ({
  report,
  selectedCategory,
}) => {
  const filteredEvidence = selectedCategory
    ? report.evidence.filter(e => e.category === selectedCategory)
    : report.evidence;

  if (filteredEvidence.length === 0) {
    return (
      <div className="bg-[#12141a] border border-[#232733] rounded-xl p-8 text-center">
        <p className="text-sm text-[#8b949e]">
          No static evidence signals flagged in this category. All standard boundary and structural rules checked clean.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredEvidence.map(ev => (
        <EvidenceCard key={ev.id} evidence={ev} />
      ))}
    </div>
  );
};
