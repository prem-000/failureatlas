/**
 * tests/intelligence/run-all-tests.ts
 * Master Verification Suite executing the Evaluation Corpus and Mutation Testing Suite.
 */

import { runEvaluationCorpus } from './corpus/corpus-runner';
import { runMutationTesting } from './mutation/mutation-engine';

async function runMasterSuite() {
  console.log('====================================================');
  console.log('🎯 PRAXIS FAILURE INTELLIGENCE — PHASE 2 MASTER SUITE');
  console.log('====================================================\n');

  const corpusMetrics = await runEvaluationCorpus();
  console.log('\n📊 CORPUS EVALUATION RESULTS:');
  console.log(`- Total Cases: ${corpusMetrics.totalCases}`);
  console.log(`- Correct Solutions: ${corpusMetrics.correctSolutions}`);
  console.log(`- Buggy Solutions: ${corpusMetrics.buggySolutions}`);
  console.log(`- True Positives (Defects Caught): ${corpusMetrics.truePositives}`);
  console.log(`- True Negatives (Correct Verified): ${corpusMetrics.trueNegatives}`);
  console.log(`- False Positives: ${corpusMetrics.falsePositives}`);
  console.log(`- False Negatives: ${corpusMetrics.falseNegatives}`);
  console.log(`- Precision: ${corpusMetrics.precision.toFixed(1)}%`);
  console.log(`- Recall: ${corpusMetrics.recall.toFixed(1)}%`);
  console.log(`- False Positive Rate: ${corpusMetrics.falsePositiveRate.toFixed(1)}%`);
  console.log(`- Confirmed Defect Exposure Rate: ${corpusMetrics.confirmedDefectRate.toFixed(1)}%`);
  console.log(`- Avg Counterexample Reduction Steps: ${corpusMetrics.averageCounterexampleReductionSteps}`);

  console.log('\n----------------------------------------------------');
  const mutationMetrics = await runMutationTesting();
  console.log('\n🧬 MUTATION TESTING RESULTS:');
  console.log(`- Total Injected Mutants: ${mutationMetrics.totalMutants}`);
  console.log(`- Mutants Detected (Killed): ${mutationMetrics.detectedMutants}`);
  console.log(`- Mutants Survived: ${mutationMetrics.missedMutants}`);
  console.log(`- Mutation Score: ${mutationMetrics.mutationScore.toFixed(1)}%`);
  console.log('====================================================\n');

  if (corpusMetrics.falsePositives > 0 || corpusMetrics.recall < 80) {
    console.error('❌ Evaluation Corpus exceeded acceptable failure thresholds (Requires 0 False Positives and >= 80% Recall).');
    process.exit(1);
  }

  console.log('🎉 Phase 2 Master Verification Suite Passed Successfully!');
}

runMasterSuite().catch(err => {
  console.error('Suite error:', err);
  process.exit(1);
});
