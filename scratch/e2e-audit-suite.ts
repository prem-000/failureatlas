/**
 * scratch/e2e-audit-suite.ts
 * Executes and validates the 4 required end-to-end Failure Intelligence test cases.
 */

import { analyzeSubmission } from '../src/lib/intelligence/intelligence-pipeline';
import { resolveProblemContract } from '../src/lib/intelligence/contracts/contract-extractor';
import { validateInputAgainstContract } from '../src/lib/intelligence/contracts/contract-validator';
import { executeReferenceOracle } from '../src/lib/intelligence/execution/oracle-executor';
import { executeUserCode } from '../src/lib/intelligence/execution/user-executor';
import { compareExecutionResults } from '../src/lib/intelligence/execution/result-comparator';

interface E2EResult {
  caseName: string;
  success: boolean;
  provenance: {
    submissionCode: string;
    evidenceFound: string[];
    objectivesBuilt: string[];
    testsExecuted: Array<{
      input: string;
      expected: string;
      actual: string;
      verdict: string;
      linkedEvidence: string;
    }>;
    primaryObservation: string;
    healthScore: number;
  };
}

async function runE2EAudit() {
  console.log('🚀 Running Praxis Failure Intelligence 4-Case E2E Audit Suite...\n');
  const results: E2EResult[] = [];

  // ───────────────────────────────────────────────────────────────────────────
  // CASE 1: Move Zeroes (Buggy Consecutive Zero Compaction)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── CASE 1: Move Zeroes (Buggy Consecutive Zeroes) ───');
  const case1Code = `
function moveZeroes(nums) {
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) {
      nums.splice(i, 1);
      nums.push(0);
    }
  }
}
  `;

  const report1 = await analyzeSubmission({
    code: case1Code,
    language: 'javascript',
    problemSlug: 'move-zeroes',
    problemTitle: 'Move Zeroes',
    problemDifficulty: 'Easy',
    status: 'Wrong Answer',
  });

  const confirmed1 = report1.evidence.filter(e => e.status === 'CONFIRMED');
  const exposedTests1 = report1.testCases.filter(t => t.result === 'EXPOSED_ISSUE');

  const case1Passed = confirmed1.length > 0 && exposedTests1.length > 0;
  console.log(`Result: ${case1Passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Confirmed Evidence: ${confirmed1.map(e => e.detector).join(', ')}`);
  console.log(`Exposed Tests: ${exposedTests1.length}`);

  results.push({
    caseName: 'Case 1: Move Zeroes (Consecutive Zero Mutation Failure)',
    success: case1Passed,
    provenance: {
      submissionCode: case1Code.trim(),
      evidenceFound: report1.evidence.map(e => `[${e.status}] Line ${e.source.lineStart}: ${e.detector} - ${e.finding}`),
      objectivesBuilt: report1.objectives.map(o => o.objective),
      testsExecuted: report1.testCases.map(t => ({
        input: t.normalizedInput,
        expected: JSON.stringify(t.expectedOutput),
        actual: JSON.stringify(t.userOutput),
        verdict: t.result,
        linkedEvidence: t.evidenceConnection.detector,
      })),
      primaryObservation: report1.primaryObservation,
      healthScore: report1.overallHealthScore,
    },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CASE 2: Binary Search (Buggy while(left < right))
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n─── CASE 2: Binary Search (Strict Inequality Termination) ───');
  const case2Code = `
function search(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left < right) {
    let mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
  `;

  const report2 = await analyzeSubmission({
    code: case2Code,
    language: 'javascript',
    problemSlug: 'binary-search',
    problemTitle: 'Binary Search',
    problemDifficulty: 'Easy',
    status: 'Wrong Answer',
  });

  const confirmed2 = report2.evidence.filter(e => e.status === 'CONFIRMED');
  const exposedTests2 = report2.testCases.filter(t => t.result === 'EXPOSED_ISSUE');

  const case2Passed = confirmed2.length > 0 && exposedTests2.length > 0;
  console.log(`Result: ${case2Passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Confirmed Evidence: ${confirmed2.map(e => e.detector).join(', ')}`);
  console.log(`Exposed Tests: ${exposedTests2.length}`);

  results.push({
    caseName: 'Case 2: Binary Search (Right Boundary Excluded)',
    success: case2Passed,
    provenance: {
      submissionCode: case2Code.trim(),
      evidenceFound: report2.evidence.map(e => `[${e.status}] Line ${e.source.lineStart}: ${e.detector} - ${e.finding}`),
      objectivesBuilt: report2.objectives.map(o => o.objective),
      testsExecuted: report2.testCases.map(t => ({
        input: t.normalizedInput,
        expected: JSON.stringify(t.expectedOutput),
        actual: JSON.stringify(t.userOutput),
        verdict: t.result,
        linkedEvidence: t.evidenceConnection.detector,
      })),
      primaryObservation: report2.primaryObservation,
      healthScore: report2.overallHealthScore,
    },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CASE 3: Correct Optimal Solution (Two Sum)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n─── CASE 3: Correct Solution (Two Sum Optimal Hash Map) ───');
  const case3Code = `
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
  `;

  const report3 = await analyzeSubmission({
    code: case3Code,
    language: 'javascript',
    problemSlug: 'two-sum',
    problemTitle: 'Two Sum',
    problemDifficulty: 'Easy',
    status: 'Accepted',
  });

  const confirmed3 = report3.evidence.filter(e => e.status === 'CONFIRMED');
  const exposedTests3 = report3.testCases.filter(t => t.result === 'EXPOSED_ISSUE');
  const allTestsPassed3 = report3.testCases.every(t => t.result === 'PASSED');

  const case3Passed = confirmed3.length === 0 && exposedTests3.length === 0 && allTestsPassed3;
  console.log(`Result: ${case3Passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Confirmed Defects: ${confirmed3.length} (Expected: 0)`);
  console.log(`All Tests Passed: ${allTestsPassed3}`);
  console.log(`Health Score: ${report3.overallHealthScore} / 100`);

  results.push({
    caseName: 'Case 3: Correct Optimal Solution (Two Sum)',
    success: case3Passed,
    provenance: {
      submissionCode: case3Code.trim(),
      evidenceFound: report3.evidence.map(e => `[${e.status}] Line ${e.source.lineStart}: ${e.detector} - ${e.finding}`),
      objectivesBuilt: report3.objectives.map(o => o.objective),
      testsExecuted: report3.testCases.map(t => ({
        input: t.normalizedInput,
        expected: JSON.stringify(t.expectedOutput),
        actual: JSON.stringify(t.userOutput),
        verdict: t.result,
        linkedEvidence: t.evidenceConnection.detector,
      })),
      primaryObservation: report3.primaryObservation,
      healthScore: report3.overallHealthScore,
    },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CASE 4: Groq-Specific Multi-Condition Interacting Case (Sort Colors Partition)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n─── CASE 4: Multi-Condition Case (Sort Colors Off-by-One Pointer Swap) ───');
  const case4Code = `
function sortColors(nums) {
  let low = 0, mid = 0, high = nums.length - 1;
  while (mid < high) { // Bug: strict inequality mid < high skips last element when mid == high
    if (nums[mid] === 0) {
      let temp = nums[low];
      nums[low] = nums[mid];
      nums[mid] = temp;
      low++;
      mid++;
    } else if (nums[mid] === 1) {
      mid++;
    } else {
      let temp = nums[high];
      nums[high] = nums[mid];
      nums[mid] = temp;
      high--;
    }
  }
}
  `;

  const report4 = await analyzeSubmission({
    code: case4Code,
    language: 'javascript',
    problemSlug: 'sort-colors',
    problemTitle: 'Sort Colors',
    problemDifficulty: 'Medium',
    status: 'Wrong Answer',
  });

  const exposedTests4 = report4.testCases.filter(t => t.result === 'EXPOSED_ISSUE');
  const case4Passed = exposedTests4.length > 0;

  console.log(`Result: ${case4Passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Exposed Tests: ${exposedTests4.length}`);
  console.log(`Primary Observation: ${report4.primaryObservation}`);

  results.push({
    caseName: 'Case 4: Multi-Condition Sort Colors Strict Inequality Midpoint',
    success: case4Passed,
    provenance: {
      submissionCode: case4Code.trim(),
      evidenceFound: report4.evidence.map(e => `[${e.status}] Line ${e.source.lineStart}: ${e.detector} - ${e.finding}`),
      objectivesBuilt: report4.objectives.map(o => o.objective),
      testsExecuted: report4.testCases.map(t => ({
        input: t.normalizedInput,
        expected: JSON.stringify(t.expectedOutput),
        actual: JSON.stringify(t.userOutput),
        verdict: t.result,
        linkedEvidence: t.evidenceConnection.detector,
      })),
      primaryObservation: report4.primaryObservation,
      healthScore: report4.overallHealthScore,
    },
  });

  return results;
}

runE2EAudit()
  .then(res => {
    console.log('\n📊 Summary of 4-Case E2E Audit:');
    for (const r of res) {
      console.log(`- ${r.caseName}: ${r.success ? '✅ SUCCESS' : '❌ FAILURE'}`);
    }
  })
  .catch(console.error);
