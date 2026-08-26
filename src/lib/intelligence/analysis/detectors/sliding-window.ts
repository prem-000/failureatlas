/**
 * src/lib/intelligence/analysis/detectors/sliding-window.ts
 * Detects full subarray sum recomputation in sliding window problems.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { AnalysisEvidence } from '../evidence-engine';

export function detectSlidingWindowRecomputation(
  code: string,
  contract: ProblemContract
): AnalysisEvidence | null {
  const hasSliceReduce = /\.slice\([^)]+\)\.reduce\(|\.slice\([^)]+\)\.sum\(/.test(code);
  const hasNestedSumLoop = /for\s*\(.*{[\s\S]*for\s*\(let\s+[j|m]\s*=\s*i;/.test(code);

  if (hasSliceReduce || hasNestedSumLoop) {
    const lines = code.split('\n');
    let lineStart = 1;
    for (let i = 0; i < lines.length; i++) {
      if (/\.slice\(|reduce\(/.test(lines[i])) {
        lineStart = i + 1;
        break;
      }
    }

    const staticConf = 0.88;

    return {
      id: 'SW-RECOMPUTE-1',
      category: 'algorithm',
      detector: 'SLIDING_WINDOW_RECOMPUTE_RULE',
      severity: 0.7,
      confidence: staticConf,
      staticConfidence: staticConf,
      empiricalConfidence: 0.1,
      combinedConfidence: staticConf,
      status: 'POTENTIAL',
      source: {
        lineStart,
        lineEnd: lineStart,
        snippet: lines[lineStart - 1]?.trim() || 'arr.slice(i, i + k).reduce(...)',
      },
      finding: 'Recomputing window sum from scratch on every step via `.slice().reduce()` instead of rolling updates.',
      hypothesis: 'Recomputes O(k) sum per element yielding O(N * k) rather than O(N) rolling arithmetic.',
      whyItMatters: 'Large array or large window k sizes trigger Time Limit Exceeded.',
    };
  }

  return null;
}
