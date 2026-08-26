/**
 * src/lib/intelligence/analysis/detectors/complexity.ts
 * Detects quadratic O(N^2) or nested loop patterns over large constraint inputs.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { AnalysisEvidence } from '../evidence-engine';

export function detectQuadraticScaling(
  code: string,
  contract: ProblemContract
): AnalysisEvidence | null {
  const nestedLoopMatch = code.match(/for\s*\([^)]+\)\s*\{[\s\S]*?for\s*\([^)]+\)/);
  if (!nestedLoopMatch) return null;

  const lines = code.split('\n');
  let lineStart = 1;
  for (let i = 0; i < lines.length; i++) {
    if (/for\s*\(/.test(lines[i])) {
      lineStart = i + 1;
      break;
    }
  }

  const staticConf = 0.85;

  return {
    id: 'COMPLEX-QUAD-1',
    category: 'complexity',
    detector: 'QUADRATIC_OVER_LARGE_N_RULE',
    severity: 0.75,
    confidence: staticConf,
    staticConfidence: staticConf,
    empiricalConfidence: 0.1,
    combinedConfidence: staticConf,
    status: 'POTENTIAL',
    source: {
      lineStart,
      lineEnd: lineStart,
      snippet: lines[lineStart - 1]?.trim() || 'for (...) { for (...) }',
    },
    finding: 'Nested loop structure indicates potential O(N^2) time complexity.',
    hypothesis: 'If constraint allows N >= 10,000, execution will exceed practical 1.5s time budget.',
    whyItMatters: 'Large scale inputs will trigger Time Limit Exceeded (TLE).',
  };
}
