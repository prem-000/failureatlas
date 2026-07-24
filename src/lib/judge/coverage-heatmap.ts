/**
 * src/lib/judge/coverage-heatmap.ts
 *
 * Deterministic coverage heatmap engine.
 * Takes verified judge cases and produces per-concept bar chart data.
 * NO LLM — pure counting + normalization.
 */

import type { PraxisJudgeCase, CoverageHeatmap, CoverageHeatmapBar } from '@/types';

// ─── Concept → Display Name + Color ──────────────────────────────────────────

interface ConceptDisplay {
  label: string;
  color: string;
}

const CONCEPT_DISPLAY: Record<string, ConceptDisplay> = {
  'Boundary':       { label: 'Boundary',       color: '#60a5fa' },
  'Constraint':     { label: 'Constraint',      color: '#c084fc' },
  'Overflow':       { label: 'Overflow',        color: '#fca5a5' },
  'Duplicate':      { label: 'Duplicates',      color: '#fbbf24' },
  'Binary Search':  { label: 'Binary Search',   color: '#00f0ff' },
  'Greedy':         { label: 'Greedy',          color: '#34d399' },
  'DP':             { label: 'Dynamic Prog.',   color: '#f472b6' },
  'Graph':          { label: 'Graph',           color: '#38bdf8' },
  'Tree':           { label: 'Tree',            color: '#4ade80' },
  'Hashing':        { label: 'Hashing',         color: '#a78bfa' },
  'Sliding Window': { label: 'Sliding Window',  color: '#fb923c' },
  'Two Pointer':    { label: 'Two Pointer',     color: '#22d3ee' },
  'Adversarial':    { label: 'Adversarial',     color: '#fb7185' },
  'Judge Killer':   { label: 'Judge Killer',    color: '#f87171' },
  'Maximum':        { label: 'Max Constraints', color: '#818cf8' },
  'Implementation': { label: 'Implementation',  color: '#94a3b8' },
  'Sorting':        { label: 'Sorting',         color: '#f0abfc' },
  'Math':           { label: 'Math',            color: '#fde68a' },
  'Recursion':      { label: 'Recursion',       color: '#6ee7b7' },
  'Strings':        { label: 'Strings',         color: '#93c5fd' },
};

const DEFAULT_COLOR = '#64748b';

// ─── Category extraction ──────────────────────────────────────────────────────

function extractCategory(test: PraxisJudgeCase): string {
  return test.category
    || test.constraintCategory
    || (test.concepts?.[0])
    || 'Boundary';
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeCoverageHeatmap(tests: PraxisJudgeCase[]): CoverageHeatmap {
  if (tests.length === 0) {
    return {
      bars: [],
      weakestConcept: 'N/A',
      strongestConcept: 'N/A',
      overallScore: 0,
    };
  }

  // Count occurrences per concept category
  const counts: Record<string, number> = {};
  for (const test of tests) {
    const cat = extractCategory(test);
    counts[cat] = (counts[cat] || 0) + 1;
  }

  // Also count from weakConcepts for visibility
  for (const test of tests) {
    for (const wc of test.weakConcepts || []) {
      const normalizedWc = Object.keys(CONCEPT_DISPLAY).find(
        k => k.toLowerCase() === wc.toLowerCase()
      ) || wc;
      counts[normalizedWc] = (counts[normalizedWc] || 0) + 0.5; // half-weight
    }
  }

  const maxCount = Math.max(...Object.values(counts), 1);

  const bars: CoverageHeatmapBar[] = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([concept, count]) => {
      const display = CONCEPT_DISPLAY[concept];
      return {
        concept: display?.label || concept,
        coverage: Math.round((count / maxCount) * 100),
        count: Math.round(count),
        color: display?.color || DEFAULT_COLOR,
      };
    });

  const weakest = bars[bars.length - 1]?.concept || 'N/A';
  const strongest = bars[0]?.concept || 'N/A';

  // Overall score: how many distinct concept categories are covered (out of expected 8)
  const distinctCategories = Object.keys(counts).length;
  const overallScore = Math.min(100, Math.round((distinctCategories / 8) * 100));

  return { bars, weakestConcept: weakest, strongestConcept: strongest, overallScore };
}
