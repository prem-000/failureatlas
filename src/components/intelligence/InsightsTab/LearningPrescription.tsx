'use client';

import React from 'react';
import { BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';
import type { AnalysisEvidence } from '@/lib/intelligence/analysis/evidence-engine';

interface LearningPrescriptionProps {
  evidenceList: AnalysisEvidence[];
  approach: string;
}

export const LearningPrescription: React.FC<LearningPrescriptionProps> = ({
  evidenceList,
  approach,
}) => {
  const confirmedList = evidenceList.filter(e => e.status === 'CONFIRMED');
  const prescriptions = generatePrescriptions(confirmedList.length > 0 ? confirmedList : evidenceList, approach, confirmedList.length > 0);

  return (
    <div className="bg-[#12141a] border border-[#232733] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
        <BookOpen className="w-4 h-4" />
        Learning Prescription & Remediation Guide
      </div>

      <div className="space-y-3">
        {prescriptions.map((p, idx) => (
          <div key={idx} className="flex items-start gap-3 bg-[#0b0c10] border border-[#232733] rounded-lg p-3">
            {p.isConfirmed ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
            )}
            <div className="text-xs">
              <div className={`font-bold mb-1 ${p.isConfirmed ? 'text-rose-300' : 'text-[#e6edf3]'}`}>{p.title}</div>
              <div className="text-[#8b949e] leading-relaxed">{p.action}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function generatePrescriptions(evidenceList: AnalysisEvidence[], approach: string, isConfirmed: boolean) {
  const steps: { title: string; action: string; isConfirmed?: boolean }[] = [];

  const hasBS = evidenceList.some(e => e.detector === 'BINARY_SEARCH_TERMINATION_RULE');
  if (hasBS) {
    steps.push({
      title: 'Master Binary Search Loop Termination',
      action: 'Always clarify search interval inclusivity. If using `while (left <= right)`, use `left = mid + 1` and `right = mid - 1`. If using `while (left < right)`, the convergence index requires deliberate post-loop handling.',
      isConfirmed,
    });
  }

  const hasMutation = evidenceList.some(e => e.detector === 'IN_PLACE_MUTATION_INDEX_RULE');
  if (hasMutation) {
    steps.push({
      title: 'In-Place Pointer Transition Safety',
      action: 'When mutating arrays in-place (e.g. Move Zeroes or Sort Colors), use separate read and write pointers (`slow/fast` or `left/right`) instead of modifying length with `.splice()` inside a standard loop.',
      isConfirmed,
    });
  }

  const hasBoundary = evidenceList.some(e => e.detector === 'EMPTY_INPUT_GUARD_RULE' || e.detector === 'SINGLE_ELEMENT_INDEX_RULE');
  if (hasBoundary) {
    steps.push({
      title: 'Input Range Guard Invariants',
      action: 'Before indexing into `nums[0]` or `nums[1]`, ensure length is at least $K$. Handle $N=0$ and $N=1$ base cases at the entry of the function.',
      isConfirmed,
    });
  }

  if (steps.length === 0) {
    steps.push({
      title: `Optimize ${approach} Invariant Proofs`,
      action: 'Maintain strict loop invariants across every iteration: document what properties hold before and after pointer updates.',
      isConfirmed: false,
    });
    steps.push({
      title: 'Pre-Submission Extreme Constraint Checks',
      action: 'Before final submission, mentally dry-run your algorithm on single-element arrays `[x]` and arrays with all identical values `[2, 2, 2, 2]`.',
      isConfirmed: false,
    });
  }

  return steps;
}
