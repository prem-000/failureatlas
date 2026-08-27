import type {
  ExtractedAssumption,
  EvidenceItem,
  NormalizedCodeFacts,
} from '@/lib/adversarial/types';

export function detectCodeAssumptions(
  code: string,
  facts: NormalizedCodeFacts,
  constraints: string[] = []
): ExtractedAssumption[] {
  const assumptions: ExtractedAssumption[] = [];
  const constraintText = constraints.join(' ').toLowerCase();

  const addAssumption = (
    id: string,
    assumption: string,
    conflictCondition: boolean,
    conflictDesc: string,
    severity: 'High' | 'Medium' | 'Low',
    codeDesc: string,
    snippet?: string
  ) => {
    const codeEvidence: EvidenceItem = {
      source: 'source_code',
      description: codeDesc,
      codeLocation: snippet ? { snippet } : undefined,
      confidence: 0.90,
    };

    let conflictEvidence: EvidenceItem | undefined;
    if (conflictCondition) {
      conflictEvidence = {
        source: 'constraint',
        description: conflictDesc,
        confidence: 0.92,
      };
    }

    assumptions.push({
      id,
      assumption,
      constraintConflict: conflictCondition,
      conflictEvidence,
      riskSeverity: severity,
      evidence: [codeEvidence],
    });
  };

  // 1. Non-empty input assumption (direct index access nums[0] without length guard)
  const hasDirectIndexZero = /nums\[0\]|arr\[0\]|s\[0\]|head\.val/i.test(code);
  const hasLengthGuard = facts.boundaryChecks.some(c => /length\s*===?\s*0|len\(|empty\(\)|!head|head\s*==\s*null/.test(c));
  const constraintsAllowEmpty = /0\s*<=\s*(?:nums\.length|n|len)/.test(constraintText);

  if (hasDirectIndexZero && !hasLengthGuard) {
    addAssumption(
      'asmp_empty_1',
      'Assumes input collection contains at least one element without defensive length check',
      constraintsAllowEmpty,
      'Constraint allows nums.length = 0, causing potential index out-of-bounds error',
      constraintsAllowEmpty ? 'High' : 'Low',
      'Direct index access nums[0] occurs before boundary validation',
      facts.rawSnippets.init
    );
  }

  // 2. Positive-only numbers assumption (e.g. max initialized to 0 instead of -Infinity)
  const hasZeroMaxInit = /max\s*=\s*0|max_val\s*=\s*0|res\s*=\s*0|ans\s*=\s*0/i.test(code);
  const constraintsAllowNegative = /-\s*10\^|-\s*[0-9]+|negative/i.test(constraintText);

  if (hasZeroMaxInit && constraintsAllowNegative) {
    addAssumption(
      'asmp_neg_1',
      'Assumes result or maximum value is non-negative by initializing accumulator to 0',
      true,
      'Problem constraints allow negative integer values, where all-negative inputs would return incorrect 0',
      'High',
      'Initialization max/ans = 0 will fail if all valid candidate answers are strictly negative',
      facts.rawSnippets.init
    );
  }

  // 3. Integer overflow assumption (large cumulative sum in 32-bit integer or unscaled division)
  const hasCumulativeSum = facts.variables.some(v => v.isAccumulator);
  const largeConstraints = /10\^9|10\^8|10\^6/i.test(constraintText);
  if (hasCumulativeSum && largeConstraints) {
    addAssumption(
      'asmp_overflow_1',
      'Assumes sum accumulation does not exceed standard integer precision bounds',
      false,
      'Large constraints (10^9) may require 64-bit integer / BigInt representation',
      'Medium',
      'Sum accumulation across up to 10^5 elements of magnitude 10^9',
      facts.rawSnippets.update
    );
  }

  // 4. Sorted input assumption
  const isBinarySearchOrTwoPointer = /left\s*<=\s*right|low\s*<=\s*high/i.test(code);
  const problemMentionsUnsorted = !/sorted/i.test(constraintText);
  if (isBinarySearchOrTwoPointer && problemMentionsUnsorted && !code.includes('sort')) {
    addAssumption(
      'asmp_sort_1',
      'Assumes input array is monotonically sorted without invoking explicit sorting',
      false,
      'Binary search / converging two-pointer requires pre-sorted monotonic array',
      'High',
      'Converging pointer logic assumes monotonic ordering without sorting step',
      facts.rawSnippets.loop
    );
  }

  // 5. Distinct elements / duplicate handling assumption
  const hasStrictInequality = facts.conditions.some(c => c.condition.includes('>') || c.condition.includes('<'));
  if (hasStrictInequality) {
    addAssumption(
      'asmp_dup_1',
      'Assumes equality or duplicate elements behave symmetrically under comparison boundaries',
      false,
      'Duplicate values can cause zero-step state or boundary clipping if strictly filtered',
      'Medium',
      'Comparison operators (< or >) evaluated across elements',
      facts.rawSnippets.eval
    );
  }

  return assumptions;
}
