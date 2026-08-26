/**
 * src/lib/intelligence/generation/candidate-generator.ts
 * Coordinates deterministic candidate generation and Groq synthesis.
 * Employs structural signature diversity selection and 5-factor quality scoring.
 */

import type { ProblemContract } from '../contracts/problem-contract';
import type { AnalysisEvidence } from '../analysis/evidence-engine';
import type { TestObjective } from '../objectives/test-objective-builder';
import { generateBoundaryCandidates } from './deterministic/boundary-generators';
import { generateDuplicateCandidates } from './deterministic/duplicate-generators';
import { generateOrderingCandidates } from './deterministic/ordering-generators';
import { generateTargetCandidates } from './deterministic/target-generators';
import { synthesizeGroqCandidates } from './groq-synthesizer';
import { selectDiverseCandidates } from './candidate-selector';

export interface ObjectiveCandidatePool {
  objective: TestObjective;
  evidence: AnalysisEvidence;
  validCandidates: Record<string, unknown>[];
}

export async function generateCandidatePools(opts: {
  contract: ProblemContract;
  evidenceList: AnalysisEvidence[];
  objectives: TestObjective[];
  userCode: string;
}): Promise<ObjectiveCandidatePool[]> {
  const { contract, evidenceList, objectives, userCode } = opts;
  const pools: ObjectiveCandidatePool[] = [];

  for (const objective of objectives) {
    const matchedEvidence =
      evidenceList.find(e => e.id === objective.evidenceId) ||
      evidenceList[0] || {
        id: 'BASELINE',
        category: objective.category,
        detector: objective.detector,
        severity: 0.5,
        confidence: 0.5,
        staticConfidence: 0.5,
        empiricalConfidence: 0.1,
        combinedConfidence: 0.5,
        status: 'POTENTIAL' as const,
        source: { lineStart: 1, lineEnd: 1, snippet: '' },
        finding: objective.objective,
        hypothesis: objective.hypothesis,
      };

    const rawCandidateList: Record<string, unknown>[] = [];

    // 1. Deterministic generation
    const boundaryCases = generateBoundaryCandidates(contract, objective);
    const duplicateCases = generateDuplicateCandidates(contract, objective);
    const orderingCases = generateOrderingCandidates(contract, objective);
    const targetCases = generateTargetCandidates(contract, objective);

    const deterministicCombined = [
      ...duplicateCases,
      ...boundaryCases,
      ...targetCases,
      ...orderingCases,
    ];

    // 2. Groq synthesis with deterministic test context to prevent duplicate generation
    let groqCandidates: { input: Record<string, unknown>; reason: string }[] = [];
    if (objective.priority === 'high' || deterministicCombined.length < 4) {
      groqCandidates = await synthesizeGroqCandidates({
        contract,
        evidence: matchedEvidence,
        objective,
        userCode,
        deterministicTestsAlreadyGenerated: deterministicCombined.slice(0, 5),
      });
    }

    rawCandidateList.push(...deterministicCombined, ...groqCandidates.map(g => g.input));

    // 3. Structural Diversity & Quality Selection
    const diverseValidCandidates = selectDiverseCandidates({
      rawCandidates: rawCandidateList,
      contract,
      objective,
      maxCount: 10,
    });

    pools.push({
      objective,
      evidence: matchedEvidence,
      validCandidates: diverseValidCandidates,
    });
  }

  return pools;
}
