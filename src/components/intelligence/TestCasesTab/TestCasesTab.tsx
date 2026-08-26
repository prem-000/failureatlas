'use client';

import React from 'react';
import type { PraxisReport, VerifiedTestCase } from '@/lib/intelligence/types';
import { TestGroup } from './TestGroup';

interface TestCasesTabProps {
  report: PraxisReport;
}

export const TestCasesTab: React.FC<TestCasesTabProps> = ({ report }) => {
  // Group tests by purposeGroup
  const groups: Record<string, VerifiedTestCase[]> = {};

  for (const tc of report.testCases) {
    const groupKey = tc.purposeGroup || 'Targeted Verification';
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(tc);
  }

  const groupEntries = Object.entries(groups);

  if (groupEntries.length === 0) {
    return (
      <div className="bg-[#12141a] border border-[#232733] rounded-xl p-8 text-center">
        <p className="text-sm text-[#8b949e]">
          No targeted tests generated yet. Run analysis to execute candidate tests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupEntries.map(([groupName, tests]) => (
        <TestGroup key={groupName} groupName={groupName} testCases={tests} />
      ))}
    </div>
  );
};
