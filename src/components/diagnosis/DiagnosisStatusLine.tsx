'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Brain, FileCode2, Cpu, Search, Share2, Sparkles, Check, ChevronDown, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiagnosisStage } from '@/types';

export type StageKey = 'routing' | 'reading' | 'classify' | 'searching' | 'graph' | 'writing';

export interface StageConfig {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  anim: Record<string, number[]>;
}

export const STAGES: Record<StageKey, StageConfig> = {
  routing: { Icon: Brain, label: 'Understanding your question', anim: { scale: [1, 1.18, 1] } },
  reading: { Icon: FileCode2, label: 'Reading your code', anim: { y: [0, -2, 0] } },
  classify: { Icon: Cpu, label: 'Identifying preliminary root cause', anim: { scale: [1, 1.12, 1] } },
  searching: {
    Icon: Search,
    label: 'Searching similar past failures',
    anim: { x: [0, 3, 0, -3, 0], y: [-3, 0, 3, 0, -3] }, // circular sweep
  },
  graph: { Icon: Share2, label: 'Tracing the knowledge graph', anim: { rotate: [0, 360] } },
  writing: { Icon: Sparkles, label: 'Writing the answer', anim: { scale: [1, 1.2, 1], rotate: [0, 12, 0] } },
};

function normalizeStage(stage: DiagnosisStage | null): StageKey {
  if (!stage) return 'routing';
  if (stage in STAGES) return stage as StageKey;
  if (stage === 'retrieving_embeddings') return 'searching';
  if (stage === 'traversing_graph') return 'graph';
  if (stage === 'fusing_evidence') return 'graph';
  if (stage === 'reasoning') return 'writing';
  return 'routing';
}

export interface DiagnosisStatusLineProps {
  currentStage: DiagnosisStage | null;
  elapsedMs: number;
  isDone: boolean;
  stageTimings?: Partial<Record<StageKey, number>>;
  error?: { stage: string; message: string; retryable?: boolean } | null;
  onRetry?: () => void;
}

const STAGE_ORDER: StageKey[] = ['routing', 'reading', 'classify', 'searching', 'graph', 'writing'];

export function StatusLine({
  stage,
  seconds,
  done,
  stageTimings,
  error,
  onRetry,
}: {
  stage: StageKey;
  seconds: number;
  done: boolean;
  stageTimings?: Partial<Record<StageKey, number>>;
  error?: { stage: string; message: string; retryable?: boolean } | null;
  onRetry?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();
  const currentConfig = STAGES[stage] || STAGES.routing;
  const { Icon, label, anim } = currentConfig;

  const isFailed = Boolean(error);

  return (
    <div className={cn(
      "border rounded-lg px-3.5 py-2 max-w-xl text-caption",
      isFailed ? "bg-[#1c1314] border-rose-900/40 text-rose-300" : "bg-[#18181b] border-[#27272a] text-muted-foreground"
    )}>
      <div className="flex items-center gap-2 text-caption w-full text-left select-none">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-caption text-[#a1a1aa] flex-1 cursor-pointer bg-transparent border-none p-0 text-left select-none"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={isFailed ? 'failed' : done ? 'done' : stage}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              {isFailed ? (
                <XCircle className="w-4 h-4 text-rose-500" />
              ) : done ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <motion.span
                  className="inline-flex"
                  animate={reduce ? undefined : anim}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Icon className="w-4 h-4 text-[#ff5f52]" />
                </motion.span>
              )}
            </motion.span>
          </AnimatePresence>

          <span className={cn("text-xs font-medium", isFailed ? "text-rose-400" : "text-[#e4e4e7]")}>
            {isFailed
              ? `Failed at ${error?.stage || stage}`
              : done
              ? 'Checked sources'
              : label}
          </span>
          <span className="text-[11px] text-[#71717a] font-mono ml-auto mr-1">{seconds}s</span>
          <ChevronDown
            className={cn('w-3.5 h-3.5 text-[#71717a] transition-transform duration-200', expanded && 'rotate-180')}
          />
        </button>

        {isFailed && onRetry && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-[11px] font-semibold text-rose-200 transition-colors cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t border-[#27272a] space-y-1.5 pl-1">
          {STAGE_ORDER.map((s) => {
            const config = STAGES[s];
            const StepIcon = config.Icon;
            const stepMs = stageTimings?.[s];
            const isCompleted = done || STAGE_ORDER.indexOf(s) < STAGE_ORDER.indexOf(stage);
            const isCurrent = !done && s === stage;

            return (
              <div
                key={s}
                className={cn(
                  'flex items-center justify-between text-[11px]',
                  isCurrent ? 'text-[#ff5f52] font-semibold' : isCompleted ? 'text-[#a1a1aa]' : 'text-[#52525b]'
                )}
              >
                <div className="flex items-center gap-2">
                  <StepIcon className="w-3.5 h-3.5" />
                  <span>{config.label}</span>
                </div>
                {stepMs !== undefined && (
                  <span className="text-[10px] font-mono text-[#71717a]">
                    {(stepMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const DiagnosisStatusLine: React.FC<DiagnosisStatusLineProps> = ({
  currentStage,
  elapsedMs,
  isDone,
  stageTimings,
  error,
  onRetry,
}) => {
  if (!currentStage && !isDone && !error) return null;
  const stageKey = normalizeStage(error?.stage ? (error.stage as DiagnosisStage) : currentStage);
  const seconds = Math.round(elapsedMs / 1000);

  return (
    <StatusLine
      stage={stageKey}
      seconds={seconds}
      done={isDone && !error}
      stageTimings={stageTimings}
      error={error}
      onRetry={onRetry}
    />
  );
};
