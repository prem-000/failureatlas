'use client';

import React from 'react';
import type { PraxisReport } from '@/lib/intelligence/types';
import { RootCauseCard } from './RootCauseCard';
import { LearningPrescription } from './LearningPrescription';
import { PracticeRecommendation } from './PracticeRecommendation';

interface InsightsTabProps {
  report: PraxisReport;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({ report }) => {
  const confirmedEvidence = report.evidence.filter(e => e.status === 'CONFIRMED');

  return (
    <div className="space-y-6">
      <RootCauseCard confirmedEvidence={confirmedEvidence} />
      <LearningPrescription evidenceList={report.evidence} approach={report.detectedApproach} />
      <PracticeRecommendation contract={report.contract} />
    </div>
  );
};
