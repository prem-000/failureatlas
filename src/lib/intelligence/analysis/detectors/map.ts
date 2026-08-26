/**
 * src/lib/intelligence/analysis/detectors/map.ts
 * Detects map key collisions and pair duplicate overwrites.
 */

import type { ProblemContract } from '../../contracts/problem-contract';
import type { AnalysisEvidence } from '../evidence-engine';

export function detectMapKeyCollision(
  code: string,
  contract: ProblemContract
): AnalysisEvidence | null {
  const mapInsertBeforeCheck = code.match(/map\.set\([^)]+\)[\s\S]*?map\.has\(/);
  if (!mapInsertBeforeCheck) return null;

  const staticConf = 0.8;

  return {
    id: 'MAP-COLLISION-1',
    category: 'data_structure',
    detector: 'MAP_KEY_COLLISION_RULE',
    severity: 0.8,
    confidence: staticConf,
    staticConfidence: staticConf,
    empiricalConfidence: 0.1,
    combinedConfidence: staticConf,
    status: 'POTENTIAL',
    source: {
      lineStart: 1,
      lineEnd: 1,
      snippet: 'map.set(...) before map.has(...)',
    },
    finding: 'Hash map entry inserted before checking complement existence.',
    hypothesis: 'When looking for pairs with target = 2 * val (e.g. nums = [3, 3], target = 6), element can match itself as complement.',
    whyItMatters: 'Self-pairing produces invalid single-element reuse indices.',
  };
}
