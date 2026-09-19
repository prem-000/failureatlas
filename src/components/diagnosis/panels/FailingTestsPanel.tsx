'use client';

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface FailingTestItem {
  input: string;
  expected: string;
  got: string;
  verified: boolean;
}

export interface FailingTestsPanelProps {
  tests: FailingTestItem[];
}

export const FailingTestsPanel: React.FC<FailingTestsPanelProps> = ({ tests }) => {
  if (!tests || tests.length === 0) return null;

  return (
    <div className="rounded-lg border border-[#27272a] bg-[#141416] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
          FAILING TESTS
        </div>
        <span className="text-[10px] text-[#52525b]">
          {tests.length} {tests.length === 1 ? 'test case' : 'test cases'}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {tests.map((t, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-1.5 rounded-md border border-[#222226] bg-[#18181b] p-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#a1a1aa] font-semibold text-[11px]">
                Case {idx + 1}
              </span>
              {t.verified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified failure
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  <AlertCircle className="w-3 h-3" />
                  Suggested, not verified
                </span>
              )}
            </div>

            <div className="font-mono text-xs text-[#e4e4e7] bg-[#121214] px-2.5 py-1.5 rounded overflow-x-auto">
              <span className="text-[#71717a] select-none">input: </span>
              <span>{t.input}</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono pt-1">
              <div className="text-emerald-400">
                <span className="text-[#71717a] text-[11px]">expected: </span>
                <span className="font-semibold">{t.expected}</span>
              </div>
              <div className="text-rose-400">
                <span className="text-[#71717a] text-[11px]">got: </span>
                <span className="font-semibold">{t.got}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
