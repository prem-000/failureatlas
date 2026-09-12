/**
 * src/lib/graph/weakness-taxonomy.ts
 *
 * Canonical mapping from failure root causes to systemic weaknesses.
 */

export const WEAKNESS_MAP: Record<string, string> = {
  // Edge Case Reasoning
  'boundary-condition-error': 'edge-case-reasoning',
  'input-output-handling-error': 'edge-case-reasoning',
  'overflow-underflow-error': 'edge-case-reasoning',
  'empty-null-input-error': 'edge-case-reasoning',
  'off-by-one-error': 'edge-case-reasoning',

  // Algorithmic Pattern Recognition
  'pattern-recognition-gap': 'algorithmic-pattern-recognition',
  'algorithm-selection-mistake': 'algorithmic-pattern-recognition',
  'wrong-heuristic-choice': 'algorithmic-pattern-recognition',
  'paradigm-mismatch': 'algorithmic-pattern-recognition',

  // Performance Analysis
  'time-complexity-oversight': 'performance-analysis',
  'space-complexity-oversight': 'performance-analysis',
  'data-structure-mismatch': 'performance-analysis',
  'tle-recursion-limit': 'performance-analysis',

  // Implementation Precision
  'implementation-detail-error': 'implementation-precision',
  'state-management-bug': 'implementation-precision',
  'pointer-mutation-error': 'implementation-precision',
  'index-out-of-bounds': 'implementation-precision',
  'syntax-logic-error': 'implementation-precision',
};

export const WEAKNESS_LABELS: Record<string, string> = {
  'edge-case-reasoning': 'Edge Case Reasoning',
  'algorithmic-pattern-recognition': 'Algorithmic Pattern Recognition',
  'performance-analysis': 'Performance Analysis',
  'implementation-precision': 'Implementation Precision',
};

export function normalizeRootCauseKey(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

export function mapRootCauseToWeakness(rootCause?: string | null): { id: string; name: string } | null {
  if (!rootCause) return null;
  const key = normalizeRootCauseKey(rootCause);
  const weaknessId = WEAKNESS_MAP[key] || (
    key.includes('boundary') || key.includes('edge') || key.includes('lookahead') || key.includes('empty')
      ? 'edge-case-reasoning'
      : key.includes('pattern') || key.includes('algorithm')
      ? 'algorithmic-pattern-recognition'
      : key.includes('complexity') || key.includes('time') || key.includes('tle') || key.includes('space')
      ? 'performance-analysis'
      : 'implementation-precision'
  );

  return {
    id: weaknessId,
    name: WEAKNESS_LABELS[weaknessId] || 'Systemic Weakness',
  };
}
