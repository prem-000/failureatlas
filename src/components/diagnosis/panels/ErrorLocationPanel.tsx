'use client';

import React from 'react';

export interface ErrorLocationProps {
  location: {
    line: number;
    code: string;
    issue: string;
  };
}

export const ErrorLocationPanel: React.FC<ErrorLocationProps> = ({ location }) => {
  return (
    <div className="rounded-lg border border-[#27272a] bg-[#141416] p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] mb-2.5">
        WHERE IT BREAKS
      </div>
      <div className="flex flex-col gap-2 font-mono text-xs">
        <div className="flex items-baseline gap-3">
          <span className="rounded bg-[#27272a] px-2 py-0.5 text-[11px] font-semibold text-[#a1a1aa]">
            line {location.line}
          </span>
          <span className="text-[#f4f4f5] bg-[#1c1c1f] px-2.5 py-1 rounded flex-1 overflow-x-auto">
            {location.code}
          </span>
        </div>
        <div className="flex items-start gap-2 pl-2 text-[#ff8a80] text-xs font-sans">
          <span className="text-[#ff5f52] select-none text-sm leading-none mt-0.5">↳</span>
          <span className="leading-relaxed">{location.issue}</span>
        </div>
      </div>
    </div>
  );
};
