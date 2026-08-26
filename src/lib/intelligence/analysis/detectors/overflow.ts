/**
 * src/lib/intelligence/analysis/detectors/overflow.ts
 * Detects 32-bit integer arithmetic midpoint overflow.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { AnalysisEvidence } from '../evidence-engine';

export function detectIntegerOverflow(
  code: string,
  contract: ProblemContract
): AnalysisEvidence | null {
  const midMatch = code.match(/Math\.floor\s*\(\s*\(\s*(left|lo|l)\s*\+\s*(right|hi|r)\s*\)\s*\/\s*2\s*\)/i);
  if (!midMatch) return null;

  const lines = code.split('\n');
  let lineStart = 1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(midMatch[0])) {
      lineStart = i + 1;
      break;
    }
  }

  const staticConf = 0.8;

  return {
    id: 'OVERFLOW-MID-1',
    category: 'implementation',
    detector: 'INTEGER_OVERFLOW_RULE',
    severity: 0.5,
    confidence: staticConf,
    staticConfidence: staticConf,
    empiricalConfidence: 0.1,
    combinedConfidence: staticConf,
    status: 'POTENTIAL',
    source: {
      lineStart,
      lineEnd: lineStart,
      snippet: lines[lineStart - 1]?.trim() || midMatch[0],
    },
    finding: 'Midpoint computed via direct addition `(left + right) / 2`.',
    hypothesis: 'When left + right exceeds MAX_SAFE_INTEGER or 32-bit signed limits (2^31 - 1), sum wraps or loses precision.',
    whyItMatters: 'Standard best practice in binary search requires `left + (right - left) / 2`.',
  };
}
