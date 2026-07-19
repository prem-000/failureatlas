/**
 * Evidence Aggregator
 *
 * Groups and counts evidence per submission before root cause scoring.
 * Keeps counting/grouping logic in one place so it isn't reimplemented
 * inconsistently inside the Root Cause Scoring step.
 */

import type { EvidenceType, EvidenceObject, AggregatedEvidence } from '@/types';

/** All possible evidence types for initializing zero-counts */
const ALL_EVIDENCE_TYPES: EvidenceType[] = [
  'BoundaryError',
  'MissingNullCheck',
  'WrongComparator',
  'InfiniteLoop',
  'Overflow',
  'OffByOne',
  'MissingBaseCase',
  'WrongVariable',
  'MissingReturn',
  'AlgorithmRewrite',
  'DataStructureChange',
  'ImplementationDetail',
];

/**
 * Aggregate evidence from a single submission.
 *
 * Example output:
 * ```
 * {
 *   counts: { BoundaryError: 3, WrongComparator: 1, ... },
 *   total: 5,
 *   dominant: 'BoundaryError',
 *   dominantCount: 3,
 *   items: [// original evidence objects]
 * }
 * ```
 *
 * @param evidence  Array of EvidenceObject from the evidence mapper
 * @returns AggregatedEvidence with counts, dominant type, and originals
 */
export function aggregateEvidence(evidence: EvidenceObject[]): AggregatedEvidence {
  // Initialize all counts to 0
  const counts = {} as Record<EvidenceType, number>;
  for (const type of ALL_EVIDENCE_TYPES) {
    counts[type] = 0;
  }

  // Count occurrences
  for (const item of evidence) {
    counts[item.type] = (counts[item.type] || 0) + 1;
  }

  // Find dominant type
  let dominant: EvidenceType = 'ImplementationDetail';
  let dominantCount = 0;

  for (const [type, count] of Object.entries(counts)) {
    if (count > dominantCount) {
      dominant = type as EvidenceType;
      dominantCount = count;
    }
  }

  return {
    counts,
    total: evidence.length,
    dominant,
    dominantCount,
    items: evidence,
  };
}

/**
 * Merge aggregated evidence from multiple submissions.
 * Useful for computing weakness patterns across a problem's submission history.
 *
 * @param aggregations  Array of AggregatedEvidence from individual submissions
 * @returns A single AggregatedEvidence representing the combined view
 */
export function mergeAggregations(aggregations: AggregatedEvidence[]): AggregatedEvidence {
  const mergedCounts = {} as Record<EvidenceType, number>;
  for (const type of ALL_EVIDENCE_TYPES) {
    mergedCounts[type] = 0;
  }

  const allItems: EvidenceObject[] = [];

  for (const agg of aggregations) {
    for (const type of ALL_EVIDENCE_TYPES) {
      mergedCounts[type] += agg.counts[type] || 0;
    }
    allItems.push(...agg.items);
  }

  let dominant: EvidenceType = 'ImplementationDetail';
  let dominantCount = 0;
  for (const [type, count] of Object.entries(mergedCounts)) {
    if (count > dominantCount) {
      dominant = type as EvidenceType;
      dominantCount = count;
    }
  }

  return {
    counts: mergedCounts,
    total: allItems.length,
    dominant,
    dominantCount,
    items: allItems,
  };
}

/**
 * Get a summary string for logging/display.
 */
export function summarizeEvidence(agg: AggregatedEvidence): string {
  const nonZero = Object.entries(agg.counts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => `${type}=${count}`)
    .join(', ');

  return `[${agg.total} items] ${nonZero || '(no evidence)'}`;
}
