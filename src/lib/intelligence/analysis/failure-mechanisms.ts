/**
 * src/lib/intelligence/analysis/failure-mechanisms.ts
 * Failure Mechanism Coverage Engine (Phase 4).
 * Maps problem families and algorithms to canonical failure mechanisms and tracks verified exploration.
 */

import type { ProblemContract } from '../contracts/problem-contract';
import type { VerifiedTestCase, FailureMechanismCoverage } from '../types';

export const PROBLEM_FAILURE_MECHANISMS: Record<string, string[]> = {
  'binary-search': [
    'Empty input collection handling',
    'Single-element array evaluation',
    'Target at leftmost index boundary',
    'Target at rightmost index boundary',
    'Target absent below minimum bound',
    'Target absent above maximum bound',
    'Target absent between array values',
    'Loop convergence termination condition',
    'Midpoint index arithmetic overflow',
  ],

  'move-zeroes': [
    'Single-element array base case',
    'All-zero array preservation',
    'No-zero array preservation',
    'Consecutive zero pointer advancement',
    'Trailing zeroes placement',
    'Non-zero relative ordering preservation',
  ],

  'two-sum': [
    'Minimum collection size 2 boundary',
    'Duplicate value same-index reuse',
    'Distinct identical values matching target',
    'Negative values and zero complement',
    'Unsorted array index preservation',
  ],

  'sort-colors': [
    'Single-element array base case',
    'All identical colors partition',
    'Three-way partition convergence',
    'Unexamined swapped element inspection',
    'Reverse sorted partition [2, 1, 0]',
  ],

  'maximum-subarray': [
    'Single-element array base case',
    'All-negative collection maximum',
    'Mixed positive and negative segments',
    'Subarray sum reset order',
    'Maximum sum at right boundary',
  ],

  'best-time-to-buy-and-sell-stock': [
    'Single-day price evaluation (0 profit)',
    'Strictly decreasing prices (0 profit)',
    'Strictly increasing prices',
    'Valley-peak price transaction timing',
    'Re-buying / same-day transaction invalidation',
  ],

  'valid-palindrome': [
    'Empty string and single-character base case',
    'Punctuation and whitespace filtering',
    'Case-insensitive character normalization',
    'Numeric character preservation',
    'Asymmetric character difference detection',
  ],

  'contains-duplicate': [
    'Single-element unique array',
    'Adjacent duplicates in sorted collection',
    'Non-adjacent duplicates in unsorted collection',
    'All identical elements collection',
    'Negative duplicate numbers',
  ],

  'valid-parentheses': [
    'Empty string and single unclosed bracket',
    'Nested matching bracket structures',
    'Consecutive matching bracket pairs',
    'Mismatched closing bracket type',
    'Mismatched closing bracket order',
  ],

  'sliding-window': [
    'Single-window base case',
    'Incremental window state subtraction',
    'Exact threshold equality boundary',
    'Alternating value sum transitions',
    'Maximum array length scalability',
  ],
};

export function computeFailureMechanismCoverage(opts: {
  contract: ProblemContract;
  verifiedTests: VerifiedTestCase[];
}): FailureMechanismCoverage {
  const { contract, verifiedTests } = opts;
  const slug = contract.slug.toLowerCase().replace(/_/g, '-');

  const mechanismNames =
    PROBLEM_FAILURE_MECHANISMS[slug] || [
      'Minimum valid boundary configuration',
      'Single-element collection evaluation',
      'Duplicate and identical values handling',
      'Ordering and partition progression',
      'Extreme constraint scalability',
    ];

  const mechanismList = mechanismNames.map(name => {
    const tested = verifiedTests.length > 0;
    const exposed = verifiedTests.some(
      t =>
        (t.verdict === 'WRONG_ANSWER' || t.verdict === 'TIME_LIMIT_EXCEEDED' || t.result === 'EXPOSED_ISSUE') &&
        (t.objective.toLowerCase().includes(name.toLowerCase().split(' ')[0]) ||
          t.purposeGroup.toLowerCase().includes(name.toLowerCase().split(' ')[0]))
    );

    return {
      name,
      tested,
      exposed,
    };
  });

  const total = mechanismList.length;
  const testedCount = Math.min(total, Math.max(1, Math.round(total * Math.min(1.0, verifiedTests.length / 4))));
  const exposedCount = mechanismList.filter(m => m.exposed).length;
  const coveragePercent = Math.round((testedCount / total) * 100);

  const untestedMechanisms = mechanismList.filter(m => !m.tested).map(m => m.name);

  return {
    totalRelevantMechanisms: total,
    mechanismsTested: testedCount,
    mechanismsExposed: exposedCount,
    coveragePercent,
    untestedMechanisms,
    mechanismList,
  };
}
