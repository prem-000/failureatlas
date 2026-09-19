'use client';

import React, { useState } from 'react';
import type { SubmissionReviewDiagnosis } from '@/types/diagnosis-v2';
import { CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { getAuthToken } from '@/lib/api/client';

export interface SubmissionReviewPanelProps {
  review: SubmissionReviewDiagnosis;
}

export const SubmissionReviewPanel: React.FC<SubmissionReviewPanelProps> = ({ review }) => {
  const [revealed, setRevealed] = useState(false);
  const [loadingFix, setLoadingFix] = useState(false);
  const [diffText, setDiffText] = useState<string | null>(null);

  const handleRevealFix = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }

    if (diffText) {
      setRevealed(true);
      return;
    }

    setLoadingFix(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/diagnosis/reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          submissionId: review.submissionId,
          code: review.location.code,
          line: review.location.line,
        }),
      });

      const json = await res.json();
      if (json.success && json.diff) {
        setDiffText(json.diff);
      } else {
        setDiffText(`@@ -${review.location.line},1 +${review.location.line},1 @@\n-${review.location.code}\n+${review.location.code.replace('<', '<=')}`);
      }
      setRevealed(true);
    } catch {
      setDiffText(`@@ -${review.location.line},1 +${review.location.line},1 @@\n-${review.location.code}\n+${review.location.code.replace('<', '<=')}`);
      setRevealed(true);
    } finally {
      setLoadingFix(false);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-4 text-xs">
      {/* Header: Bug location & Root Cause */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
            BUG · line {review.location.line}
          </span>
          <span className="text-xs text-[#a1a1aa]">({review.problem.title})</span>
        </div>
        <div className="flex items-center gap-2 font-mono font-bold">
          <span className="text-xs text-[#f4f4f5]">{review.rootCause.name}</span>
          <span className="text-xs text-[#ff5f52]">{review.rootCause.confidence}%</span>
        </div>
      </div>

      {/* Where it breaks */}
      <div className="rounded-lg border border-[#27272a] bg-[#141416] p-3.5 flex flex-col gap-2 font-mono">
        <div className="bg-[#1c1c1f] px-3 py-1.5 rounded text-[#f4f4f5] overflow-x-auto">
          {review.location.code}
        </div>
        <div className="flex items-start gap-2 text-[#ff8a80] text-xs font-sans pl-1">
          <span className="text-[#ff5f52] select-none text-sm leading-none mt-0.5">↳</span>
          <span>{review.location.issue}</span>
        </div>
      </div>

      {/* Failing tests */}
      <div className="rounded-lg border border-[#27272a] bg-[#141416] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
            FAILING TESTS ({review.tests.length})
          </span>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {review.tests[0]?.verified ? 'executed' : 'traced by AI, not executed'}
          </span>
        </div>

        {review.tests.map((test, idx) => (
          <div key={idx} className="p-3 bg-[#18181b] border border-[#222226] rounded-md flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-[#a1a1aa] font-bold">Test {idx + 1}</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400">expected {test.expected}</span>
                <span className="text-rose-400">got {test.got}</span>
              </div>
            </div>
            <div className="font-mono text-xs bg-[#121214] px-2.5 py-1 rounded text-[#e4e4e7] overflow-x-auto">
              {test.input}
            </div>
            {test.whyItBreaks && (
              <p className="text-[#a1a1aa] text-[11px] font-sans mt-0.5">
                {test.whyItBreaks}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Dry run walkthrough */}
      {review.walkthrough && review.walkthrough.length > 0 && (
        <div className="rounded-lg border border-[#27272a] bg-[#141416] p-4 flex flex-col gap-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
            DRY RUN · Test Walkthrough
          </div>
          <div className="flex flex-col gap-2">
            {review.walkthrough.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 rounded bg-[#18181b] border border-[#222226]">
                <span className="text-[#ff5f52] font-mono font-bold text-[11px] shrink-0 min-w-[50px]">
                  {step.label}
                </span>
                <span className="text-[#e4e4e7] leading-relaxed text-[11px]">
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invariant you needed */}
      {review.invariant && (
        <div className="rounded-lg border border-[#3f205c] bg-[#1a1224] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#d8b4fe] mb-1">
            INVARIANT YOU NEEDED ({review.invariant.name})
          </div>
          <p className="text-xs text-[#f4f4f5] leading-relaxed">
            {review.invariant.statement}
          </p>
        </div>
      )}

      {/* Before you submit checklist */}
      {review.checklist && review.checklist.length > 0 && (
        <div className="rounded-lg border border-[#27272a] bg-[#141416] p-3.5 flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
            BEFORE YOU SUBMIT
          </div>
          <ul className="list-none flex flex-col gap-1.5 pl-1">
            {review.checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[#e4e4e7]">
                <span className="text-[#22c55e] text-xs select-none">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Opt-in minimal fix button */}
      <div className="pt-2 border-t border-[#222226] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRevealFix}
          disabled={loadingFix}
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] text-xs font-semibold transition-colors cursor-pointer border border-[#3f3f46]"
        >
          {loadingFix ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : revealed ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-[#ff5f52]" />
          )}
          <span>{revealed ? 'Hide minimal fix' : 'Reveal minimal fix'}</span>
          <span className="text-[10px] text-[#71717a] font-normal">(logs as solution revealed)</span>
        </button>

        {revealed && diffText && (
          <div className="rounded-lg border border-[#22c55e]/40 bg-[#0c1f14] p-3 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed text-[#86efac]">
            {diffText}
          </div>
        )}
      </div>
    </div>
  );
};
