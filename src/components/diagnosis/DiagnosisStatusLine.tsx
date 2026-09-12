'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_LABELS, type DiagnosisStage } from '@/types';

export interface DiagnosisStatusLineProps {
  currentStage: DiagnosisStage | null;
  elapsedMs: number;
  isDone: boolean;
}

const ALL_STAGES: DiagnosisStage[] = [
  'retrieving_embeddings',
  'traversing_graph',
  'fusing_evidence',
  'reasoning',
];

export const DiagnosisStatusLine: React.FC<DiagnosisStatusLineProps> = ({
  currentStage,
  elapsedMs,
  isDone,
}) => {
  const [expanded, setExpanded] = useState(false);
  const seconds = Math.round(elapsedMs / 1000);

  if (!currentStage && !isDone) return null;

  return (
    <div className="bg-muted rounded-lg px-4 py-2 max-w-2xl">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center space-x-2 text-caption text-muted-foreground w-full cursor-pointer bg-transparent border-none p-0 text-left"
      >
        {!isDone && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
        )}
        <span>
          {isDone ? `Checked sources · ${seconds}s` : STAGE_LABELS[currentStage!]}
        </span>
        {!isDone && <span className="text-muted-foreground">{seconds}s</span>}
        <ChevronDown
          className={cn('w-3 h-3 ml-auto transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className="mt-2 pl-3.5 border-l border-border space-y-1">
          {ALL_STAGES.map((stage) => (
            <div key={stage} className="text-caption text-muted-foreground">
              {STAGE_LABELS[stage]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
