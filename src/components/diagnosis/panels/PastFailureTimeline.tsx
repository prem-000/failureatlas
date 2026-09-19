'use client';

import React from 'react';

export interface PastFailureItem {
  id?: string;
  eventId?: string;
  problemTitle: string;
  problemDifficulty?: string;
  status: string;
  timestamp: string;
  similarity: number;
  verdict?: string;
  diffSnippet?: string;
}

export interface PastFailureTimelineProps {
  headerText?: string;
  failures: PastFailureItem[];
}

export const PastFailureTimeline: React.FC<PastFailureTimelineProps> = ({
  headerText,
  failures,
}) => {
  if (!failures || failures.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 p-4">
      {headerText && (
        <div className="rounded-md border border-[#3f3f46] bg-[#1a1a1e] px-3.5 py-2 text-xs font-semibold text-[#f4f4f5] tracking-wide">
          {headerText}
        </div>
      )}

      <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] mt-1">
        Past Failure Occurrences ({failures.length})
      </div>

      <div className="flex flex-col gap-3">
        {failures.map((f, i) => {
          const pct = Math.round(f.similarity * 100);
          return (
            <div
              key={f.id || i}
              className="rounded-lg border border-[#27272a] bg-[#18181b] p-3.5 flex flex-col gap-2 transition-all hover:border-[#3f3f46]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#f4f4f5]">
                  {f.problemTitle}
                </span>
                <span className="text-[10px] text-[#71717a]">
                  {new Date(f.timestamp).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#a1a1aa]">
                <span className="text-rose-400 font-mono text-[10px]">{f.status}</span>
                {f.verdict && <span>· {f.verdict}</span>}
              </div>

              {f.diffSnippet && (
                <div className="font-mono text-[11px] bg-[#121214] text-[#a1a1aa] p-2 rounded overflow-x-auto border border-[#222226]">
                  {f.diffSnippet}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-1.5 bg-[#27272a] rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff5f52] to-[#ff8a80] rounded transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#71717a] font-mono min-w-[32px] text-right">
                  {pct}% match
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
