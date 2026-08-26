/**
 * scripts/e2e-production-audit.ts
 * Executes 4 real-world user submission scenarios through the production intelligence pipeline.
 */

import { analyzeSubmission } from '../src/lib/intelligence/intelligence-pipeline';

async function runProductionFlowAudit() {
  console.log('===============================================================');
  console.log('🔬 PRAXIS FAILURE INTELLIGENCE — REAL USER PRODUCTION AUDIT');
  console.log('===============================================================\n');

  // Scenario 1 — Correct but Inefficient Two Sum
  console.log('--- SCENARIO 1: Correct but Inefficient Two Sum (Nested Loops) ---');
  const code1 = `function twoSum(nums, target) {
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        if (nums[i] + nums[j] === target) {
          return [i, j];
        }
      }
    }
    return [];
  }`;

  const res1 = await analyzeSubmission({
    code: code1,
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
  });

  console.log('Detected Approach:', res1.detectedApproach);
  console.log('Correctness Verdict:', res1.assessment.correctness);
  console.log('Performance Verdict:', res1.assessment.performance);
  console.log('Estimated Complexity:', res1.estimatedComplexity);
  console.log('Defects Exposed Count:', res1.metrics.defectsExposedCount);
  console.log('Primary Observation:', res1.primaryObservation);
  console.log('Scaling Measurements:', res1.scalingBenchmark?.measurements);
  console.log('');

  // Scenario 2 — Optimal Hash Map Two Sum
  console.log('--- SCENARIO 2: Optimal Hash Map Two Sum ---');
  const code2 = `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
      const complement = target - nums[i];
      if (map.has(complement)) {
        return [map.get(complement), i];
      }
      map.set(nums[i], i);
    }
    return [];
  }`;

  const res2 = await analyzeSubmission({
    code: code2,
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
  });

  console.log('Detected Approach:', res2.detectedApproach);
  console.log('Correctness Verdict:', res2.assessment.correctness);
  console.log('Performance Verdict:', res2.assessment.performance);
  console.log('Defects Exposed Count:', res2.metrics.defectsExposedCount);
  console.log('Primary Observation:', res2.primaryObservation);
  console.log('');

  // Scenario 3 — Actual Two Sum Bug (Pre-populating/Inserting before Checking)
  console.log('--- SCENARIO 3: Actual Buggy Two Sum (Self-Pairing) ---');
  const code3 = `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
      map.set(nums[i], i);
      const complement = target - nums[i];
      if (map.has(complement)) {
        return [i, map.get(complement)];
      }
    }
    return [];
  }`;

  const res3 = await analyzeSubmission({
    code: code3,
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
  });

  console.log('Detected Approach:', res3.detectedApproach);
  console.log('Correctness Verdict:', res3.assessment.correctness);
  console.log('Defects Exposed Count:', res3.metrics.defectsExposedCount);
  console.log('Smallest Counterexample Input:', res3.smallestCounterexample?.input);
  console.log('Expected Output:', res3.smallestCounterexample?.expectedOutput);
  console.log('Actual User Output:', res3.smallestCounterexample?.userOutput);
  console.log('Primary Observation:', res3.primaryObservation);
  console.log('');

  // Scenario 4 — Correct Hard/Medium Problem Using Non-Optimal Approach
  console.log('--- SCENARIO 4: Brute Force Maximum Subarray (O(N^2) on N <= 10^5) ---');
  const code4 = `function maxSubArray(nums) {
    let max = -Infinity;
    for (let i = 0; i < nums.length; i++) {
      let currentSum = 0;
      for (let j = i; j < nums.length; j++) {
        currentSum += nums[j];
        if (currentSum > max) max = currentSum;
      }
    }
    return max;
  }`;

  const res4 = await analyzeSubmission({
    code: code4,
    problemSlug: 'maximum-subarray',
    problemTitle: 'Maximum Subarray',
  });

  console.log('Detected Approach:', res4.detectedApproach);
  console.log('Correctness Verdict:', res4.assessment.correctness);
  console.log('Performance Verdict:', res4.assessment.performance);
  console.log('Estimated Complexity:', res4.estimatedComplexity);
  console.log('Defects Exposed Count:', res4.metrics.defectsExposedCount);
  console.log('Primary Observation:', res4.primaryObservation);
  console.log('');
}

runProductionFlowAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
