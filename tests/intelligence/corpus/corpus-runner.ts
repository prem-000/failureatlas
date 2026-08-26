/**
 * tests/intelligence/corpus/corpus-runner.ts
 * Automated Runner for the 51-Case Praxis Evaluation Corpus (Phase 3).
 */

import { analyzeSubmission } from '../../../src/lib/intelligence/intelligence-pipeline';
import { EVALUATION_CORPUS, type CorpusCase } from './corpus-definitions';

export interface CorpusEvaluationMetrics {
  totalCases: number;
  correctSolutions: number;
  buggySolutions: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  falsePositiveRate: number;
  confirmedDefectRate: number;
  averageCounterexampleReductionSteps: number;
  results: Array<{
    id: string;
    family: string;
    isCorrect: boolean;
    detectedApproach: string;
    defectsExposed: number;
    healthScore: number;
    coverage: number;
    performance: string;
    success: boolean;
    observation: string;
  }>;
}

export async function runEvaluationCorpus(): Promise<CorpusEvaluationMetrics> {
  console.log(`🧪 Running Praxis Evaluation Corpus (${EVALUATION_CORPUS.length} cases across 10 problem families)...\n`);

  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let totalReductionSteps = 0;
  let minimizedCasesCount = 0;

  const results: CorpusEvaluationMetrics['results'] = [];

  for (let i = 0; i < EVALUATION_CORPUS.length; i++) {
    const testCase = EVALUATION_CORPUS[i];

    const report = await analyzeSubmission({
      code: testCase.code,
      language: 'javascript',
      problemSlug: testCase.problemSlug,
      problemTitle: testCase.problemTitle,
      status: testCase.isCorrect ? 'Accepted' : 'Wrong Answer',
    });

    const hasConfirmedDefects = report.metrics.defectsExposedCount > 0;

    let isSuccess = false;
    if (testCase.isCorrect) {
      if (!hasConfirmedDefects) {
        trueNegatives++;
        isSuccess = true;
      } else {
        falsePositives++;
        isSuccess = false;
      }
    } else {
      if (hasConfirmedDefects) {
        truePositives++;
        isSuccess = true;
      } else {
        falseNegatives++;
        isSuccess = false;
        console.log(`⚠️ Missed defect in case [${testCase.id}] (${testCase.problemSlug}): ${testCase.description}`);
      }
    }

    if (report.smallestCounterexample?.minimalProof?.isMinimized) {
      totalReductionSteps += report.smallestCounterexample.minimalProof.reductionSteps;
      minimizedCasesCount++;
    }

    results.push({
      id: testCase.id,
      family: testCase.family,
      isCorrect: testCase.isCorrect,
      detectedApproach: report.detectedApproach,
      defectsExposed: report.metrics.defectsExposedCount,
      healthScore: report.overallHealthScore,
      coverage: report.analysisCoverage,
      performance: report.assessment.performance,
      success: isSuccess,
      observation: report.primaryObservation,
    });
  }

  const correctCount = EVALUATION_CORPUS.filter(c => c.isCorrect).length;
  const buggyCount = EVALUATION_CORPUS.filter(c => !c.isCorrect).length;

  const precision = truePositives + falsePositives > 0 ? (truePositives / (truePositives + falsePositives)) * 100 : 0;
  const recall = truePositives + falseNegatives > 0 ? (truePositives / (truePositives + falseNegatives)) * 100 : 0;
  const falsePositiveRate = falsePositives + trueNegatives > 0 ? (falsePositives / (falsePositives + trueNegatives)) * 100 : 0;
  const confirmedDefectRate = (truePositives / buggyCount) * 100;
  const avgReduction = minimizedCasesCount > 0 ? totalReductionSteps / minimizedCasesCount : 0;

  return {
    totalCases: EVALUATION_CORPUS.length,
    correctSolutions: correctCount,
    buggySolutions: buggyCount,
    truePositives,
    trueNegatives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    falsePositiveRate,
    confirmedDefectRate,
    averageCounterexampleReductionSteps: Number(avgReduction.toFixed(2)),
    results,
  };
}
