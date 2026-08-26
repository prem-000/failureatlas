'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { VerifiedTestCase } from '@/lib/intelligence/types';
import { VerifiedTestCard } from './VerifiedTestCard';

interface TestGroupProps {
  groupName: string;
  testCases: VerifiedTestCase[];
  defaultOpen?: boolean;
}

export const TestGroup: React.FC<TestGroupProps> = ({
  groupName,
  testCases,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const defectCount = testCases.filter(t => t.result === 'EXPOSED_ISSUE').length;

  return (
    <div className="bg-[#12141a] border border-[#232733] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-[#161b22] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#e6edf3]">{groupName}</span>
          <span className="text-xs text-[#8b949e]">({testCases.length} tests)</span>

          {defectCount > 0 ? (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
              <AlertTriangle className="w-3 h-3" /> {defectCount} exposed issue
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> All passed
            </span>
          )}
        </div>

        <div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[#8b949e]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8b949e]" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-0 space-y-3">
          {testCases.map(tc => (
            <VerifiedTestCard key={tc.id} testCase={tc} />
          ))}
        </div>
      )}
    </div>
  );
};
