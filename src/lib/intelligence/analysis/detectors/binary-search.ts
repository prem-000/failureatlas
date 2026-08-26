/**
 * src/lib/intelligence/analysis/detectors/binary-search.ts
 * Detector for Binary Search loop condition and right-boundary omission.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { AnalysisEvidence } from '../evidence-engine';

export function detectBinarySearchTermination(
  code: string,
  contract: ProblemContract
): AnalysisEvidence | null {
  const match = code.match(/while\s*\(\s*(left|l|low|lo)\s*<\s*(right|r|high|hi)\s*\)/i);
  if (!match) return null;

  const lines = code.split('\n');
  let lineStart = 1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match[0])) {
      lineStart = i + 1;
      break;
    }
  }

  const staticConf = 0.88;

  return {
    id: 'BS-TERM-1',
    category: 'algorithm',
    detector: 'BINARY_SEARCH_TERMINATION_RULE',
    severity: 0.85,
    confidence: staticConf,
    staticConfidence: staticConf,
    empiricalConfidence: 0.1,
    combinedConfidence: staticConf,
    status: 'POTENTIAL',
    source: {
      lineStart,
      lineEnd: lineStart,
      snippet: match[0].trim(),
    },
    finding: 'Loop condition uses strict inequality `<` rather than inclusive `<=`.',
    hypothesis: 'The loop terminates when pointers converge (left == right), potentially missing evaluation of the final candidate element at that single remaining index.',
    whyItMatters: 'If the target is at the right boundary or after pointer convergence, search returns -1 falsely.',
  };
}
