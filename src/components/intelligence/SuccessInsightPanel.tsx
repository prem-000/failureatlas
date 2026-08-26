'use client';

import React from 'react';
import { FailureIntelligenceView } from './FailureIntelligenceView';

interface Props {
  submissionId: string;
  problemTitle: string;
  problemSlug?: string;
}

export function SuccessInsightPanel({ submissionId, problemTitle, problemSlug = '' }: Props) {
  return (
    <FailureIntelligenceView
      submissionId={submissionId}
      problemSlug={problemSlug}
      problemTitle={problemTitle}
      status="Accepted"
    />
  );
}
