'use client';

import React from 'react';

interface SourceSnippetProps {
  lineStart: number;
  lineEnd: number;
  snippet: string;
}

export const SourceSnippet: React.FC<SourceSnippetProps> = ({
  lineStart,
  lineEnd,
  snippet,
}) => {
  return (
    <div className="bg-[#0b0c10] border border-[#232733] rounded-lg p-3 my-2 font-mono text-xs overflow-x-auto">
      <div className="flex items-start gap-3">
        <span className="text-[#8b949e] select-none text-right w-6 font-semibold">
          {lineStart}
        </span>
        <pre className="text-[#e6edf3] font-mono leading-relaxed whitespace-pre-wrap">
          {snippet}
        </pre>
      </div>
    </div>
  );
};
