/**
 * src/lib/intelligence/analysis/detectors/mutation.ts
 * Detects in-place array modification pointer skips.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { AnalysisEvidence } from '../evidence-engine';

export function detectInPlaceMutationIndex(
  code: string,
  contract: ProblemContract
): AnalysisEvidence | null {
  const spliceMatch = code.match(/for\s*\(\s*let\s+i\s*=\s*0;[\s\S]*?\.splice\(i,\s*1\)/);
  const hasDecrement = /i--|--i/.test(code);

  if (spliceMatch && !hasDecrement) {
    const lines = code.split('\n');
    let lineStart = 1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('.splice(')) {
        lineStart = i + 1;
        break;
      }
    }

    const staticConf = 0.94;

    return {
      id: 'MUTATION-SKIP-1',
      category: 'implementation',
      detector: 'IN_PLACE_MUTATION_INDEX_RULE',
      severity: 0.9,
      confidence: staticConf,
      staticConfidence: staticConf,
      empiricalConfidence: 0.1,
      combinedConfidence: staticConf,
      status: 'POTENTIAL',
      source: {
        lineStart,
        lineEnd: lineStart,
        snippet: lines[lineStart - 1]?.trim() || 'nums.splice(i, 1);',
      },
      finding: 'In-place `.splice()` alters the array length during iteration without decrementing the loop index.',
      hypothesis: 'When two matching target elements (e.g. consecutive zeroes `[0, 0, 1]`) occur adjacently, the second element shifts to the current index and is skipped by loop advancement.',
      whyItMatters: 'Adjacent target elements remain unprocessed in the array.',
    };
  }

  return null;
}
