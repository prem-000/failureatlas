/**
 * src/lib/intelligence/analysis/detectors/boundary.ts
 * Detects missing empty collection guards and single-element indexing risks.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { AnalysisEvidence } from '../evidence-engine';

export function detectBoundaryIssues(
  code: string,
  contract: ProblemContract
): AnalysisEvidence[] {
  const evidences: AnalysisEvidence[] = [];
  const lines = code.split('\n');

  // 1. Direct index without length guard
  const directIndexMatch = code.match(/(nums|prices|arr|s)\[0\]/);
  const hasGuard = /length\s*===?\s*0|!nums|nums\.length\s*<\s*1/.test(code);

  if (directIndexMatch && !hasGuard) {
    let lineStart = 1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(directIndexMatch[0])) {
        lineStart = i + 1;
        break;
      }
    }

    const staticConf = 0.72;
    evidences.push({
      id: 'BOUND-EMPTY-1',
      category: 'boundary',
      detector: 'EMPTY_INPUT_GUARD_RULE',
      severity: 0.6,
      confidence: staticConf,
      staticConfidence: staticConf,
      empiricalConfidence: 0.1,
      combinedConfidence: staticConf,
      status: 'POTENTIAL',
      source: {
        lineStart,
        lineEnd: lineStart,
        snippet: lines[lineStart - 1]?.trim() || directIndexMatch[0],
      },
      finding: 'Direct indexing on array without preceding empty or single-element guard.',
      hypothesis: 'Submissions with empty input [] or size 0 will throw TypeError or evaluate undefined.',
      whyItMatters: 'Competitive programming test suites frequently test empty collections.',
    });
  }

  return evidences;
}
