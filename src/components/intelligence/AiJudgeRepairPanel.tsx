'use client';

import React from 'react';
import { FailureIntelligenceView } from './FailureIntelligenceView';

interface Props {
  submissionId: string;
  problemSlug?: string;
  problemTitle: string;
}

export function AiJudgeRepairPanel({ submissionId, problemSlug = '', problemTitle }: Props) {
  return (
    <FailureIntelligenceView
      submissionId={submissionId}
      problemSlug={problemSlug}
      problemTitle={problemTitle}
      status="Wrong Answer"
    />
  );
}
