'use client';

import React from 'react';
import type { QueryAwareDiagnosis } from '@/types/diagnosis-v2';
import { DiagnosisStatusLine } from './DiagnosisStatusLine';
import { ChevronRight } from 'lucide-react';

export interface ChatMessageV2 {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  diagnosisV2?: QueryAwareDiagnosis;
  timestamp: Date;
  elapsedMs?: number;
  isError?: boolean;
  error?: {
    stage: string;
    message: string;
    requestId?: string;
    retryable?: boolean;
  };
}

export interface ChatBubbleV2Props {
  msg: ChatMessageV2;
  mounted: boolean;
  isActive?: boolean;
  onOpenEntry?: (id: string) => void;
  onRetry?: () => void;
}

export const ChatBubbleV2: React.FC<ChatBubbleV2Props> = ({
  msg,
  mounted,
  isActive = false,
  onOpenEntry,
  onRetry,
}) => {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[85%] px-4 py-2.5 rounded-[16px_16px_4px_16px] bg-[#ff5f52] text-white text-xs leading-relaxed font-normal shadow-sm">
          {msg.content}
        </div>
        <span
          suppressHydrationWarning
          className="text-[10px] text-[#52525b] mr-1 font-mono"
        >
          {mounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </span>
      </div>
    );
  }

  const v2 = msg.diagnosisV2;

  return (
    <div className="flex flex-col items-start gap-1.5 max-w-[85%]">
      {v2 ? (
        <div
          onClick={() => onOpenEntry?.(msg.id)}
          className={`w-full border rounded-[16px_16px_16px_4px] p-4 text-xs flex flex-col gap-2 shadow-sm transition-all cursor-pointer ${
            isActive
              ? 'border-l-4 border-l-[#ff5f52] border-t-[#3f3f46] border-r-[#3f3f46] border-b-[#3f3f46] bg-[#1a1a1e]'
              : 'border-[#27272a] bg-[#18181b] hover:border-[#3f3f46]'
          }`}
        >
          {/* Mode 1: CODE REVIEW */}
          {v2.kind === 'code_review' && (
            <>
              <div className="font-semibold text-[#f4f4f5] text-sm">
                Bug found · line {v2.location.line}
              </div>
              <div className="text-[#a1a1aa] text-xs">
                {v2.rootCause.name} · {v2.rootCause.confidence}%
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#ff5f52] hover:text-[#ff8a80] transition-colors self-start">
                <span>
                  {v2.hasHistory
                    ? `${v2.historyIds?.length || 1} similar past failures · view concept →`
                    : "First time you've hit this →"}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </>
          )}

          {/* Mode 2: SUBMISSION REVIEW */}
          {v2.kind === 'submission_review' && (
            <>
              <div className="font-semibold text-[#f4f4f5] text-sm">
                Bug found · line {v2.location.line}
              </div>
              <div className="text-[#a1a1aa] text-xs">
                {v2.problem.title} · {v2.rootCause.name} · {v2.rootCause.confidence}%
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#ff5f52] hover:text-[#ff8a80] transition-colors self-start">
                <span>2 failing tests + dry run →</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </>
          )}

          {/* Mode 2B: SUBMISSION ACCEPTED */}
          {v2.kind === 'submission_accepted' && (
            <>
              <div className="font-semibold text-emerald-400 text-sm">
                Latest submission passed
              </div>
              <div className="text-[#a1a1aa] text-xs">
                {v2.problem.title}
                {v2.runtime ? ` · ${v2.runtime} ms` : ''}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors self-start">
                <span>Want a complexity review? →</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </>
          )}

          {/* Mode 2C: NO SUBMISSION */}
          {v2.kind === 'no_submission' && (
            <>
              <div className="font-semibold text-[#f4f4f5] text-sm">
                No submissions captured
              </div>
              <div className="text-[#a1a1aa] text-xs">
                {v2.message}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#ff5f52] hover:text-[#ff8a80] transition-colors self-start">
                <span>Connect extension or paste code →</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </>
          )}

          {/* Mode 3: PLAN */}
          {v2.kind === 'plan' && (
            <>
              <div className="font-semibold text-[#f4f4f5] text-sm">
                7-day plan ready
              </div>
              <div className="text-[#a1a1aa] text-xs">
                {v2.focus.name}
                {v2.topics && v2.topics.length > 0 && ` · ${v2.topics[0]?.name}`}
                {v2.topics && v2.topics.length > 1 && ` +${v2.topics.length - 1}`}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#a855f7] hover:text-[#d8b4fe] transition-colors self-start">
                <span>Open plan →</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </>
          )}

          {/* Mode 4: EXPLAIN */}
          {v2.kind === 'explain' && (
            <>
              <div className="font-semibold text-[#f4f4f5] text-sm">
                Pattern found · {v2.pastFailures?.length || 4} failures
              </div>
              <div className="text-[#a1a1aa] text-xs">
                {v2.topic}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#ff5f52] hover:text-[#ff8a80] transition-colors self-start">
                <span>View breakdown →</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </>
          )}

          {/* Mode 5: HISTORY */}
          {v2.kind === 'history' && (
            <>
              <div className="font-semibold text-[#f4f4f5] text-sm">
                Failure history retrieved
              </div>
              <div className="text-[#a1a1aa] text-xs">
                {v2.count} past occurrences found
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#38bdf8] hover:text-[#7dd3fc] transition-colors self-start">
                <span>Explore failure timeline →</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </>
          )}
        </div>
      ) : (
        // Plain non-clickable bubble for legacy/welcome text
        <div className={`px-4 py-3 rounded-[16px_16px_16px_4px] border text-xs leading-relaxed whitespace-pre-wrap ${
          msg.isError
            ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
            : 'bg-[#1e1e1e] border-[#2a2a2a] text-[#e4e4e7]'
        }`}>
          {msg.content}
        </div>
      )}

      {msg.elapsedMs !== undefined && (
        <DiagnosisStatusLine
          currentStage={null}
          elapsedMs={msg.elapsedMs}
          isDone={!msg.isError}
          error={msg.error}
          onRetry={msg.isError ? onRetry : undefined}
        />
      )}

      <span
        suppressHydrationWarning
        className="text-[10px] text-[#52525b] ml-1 font-mono"
      >
        {mounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
      </span>
    </div>
  );
};
