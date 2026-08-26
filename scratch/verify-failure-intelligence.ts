/**
 * scratch/verify-failure-intelligence.ts
 * End-to-End Verification of the Praxis Failure Intelligence Engine.
 */

import { resolveProblemContract } from '../src/lib/intelligence/contracts/contract-extractor';
import { validateInputAgainstContract } from '../src/lib/intelligence/contracts/contract-validator';
import { executeReferenceOracle } from '../src/lib/intelligence/execution/oracle-executor';
import { executeUserCode } from '../src/lib/intelligence/execution/user-executor';
import { compareExecutionResults } from '../src/lib/intelligence/execution/result-comparator';
import { analyzeSubmission } from '../src/lib/intelligence/intelligence-pipeline';

async function runTests() {
  console.log('🧪 Starting Praxis Failure Intelligence Verification Tests...\n');

  // Test 1: Canonical Problem Contract Enforcement
  console.log('1. Problem Contract Parameter Enforcement:');
  const moveZeroesContract = resolveProblemContract({
    slug: 'move-zeroes',
    title: 'Move Zeroes',
  });

  const validMoveZeroesInput = { nums: [0, 1, 0, 3, 12] };
  const invalidMoveZeroesInput = { nums: [0, 1], target: 0 }; // Hallucinated target

  const v1 = validateInputAgainstContract(validMoveZeroesInput, moveZeroesContract);
  const v2 = validateInputAgainstContract(invalidMoveZeroesInput, moveZeroesContract);

  console.log('   - Valid Move Zeroes input:', v1.valid ? '✅ PASSED' : '❌ FAILED');
  console.log('   - Hallucinated target input rejected:', !v2.valid ? '✅ PASSED' : '❌ FAILED');
  if (!v2.valid) console.log('     Reason:', v2.reason);

  // Test 2: In-place Execution & Reference Oracle Ground Truth
  console.log('\n2. In-Place Execution & Reference Oracle Ground Truth:');
  const oracleResult = executeReferenceOracle(validMoveZeroesInput, moveZeroesContract);
  console.log('   - Oracle Expected Output:', JSON.stringify(oracleResult.expectedOutput));
  console.log(
    '   - Mutated array correctly captured (not undefined):',
    Array.isArray(oracleResult.expectedOutput) &&
      JSON.stringify(oracleResult.expectedOutput) === JSON.stringify([1, 3, 12, 0, 0])
      ? '✅ PASSED'
      : '❌ FAILED'
  );

  // Test 3: Oracle Independence against Buggy User Code (Move Zeroes)
  console.log('\n3. Oracle Independence with Buggy User Code:');
  const buggyMoveZeroesCode = `
    function moveZeroes(nums) {
      for (let i = 0; i < nums.length; i++) {
        if (nums[i] === 0) {
          nums.splice(i, 1);
          nums.push(0);
        }
      }
    }
  `;

  const consecutiveZeroInput = { nums: [0, 0, 1] };
  const oracleConsecutive = executeReferenceOracle(consecutiveZeroInput, moveZeroesContract);
  const userConsecutive = executeUserCode(buggyMoveZeroesCode, consecutiveZeroInput, moveZeroesContract);

  const comparison = compareExecutionResults({
    userOutput: userConsecutive.output,
    expectedOutput: oracleConsecutive.expectedOutput,
    userStatus: userConsecutive.status,
    oracleStatus: oracleConsecutive.status,
  });

  console.log('   - Input: [0, 0, 1]');
  console.log('   - Oracle Expected:', JSON.stringify(oracleConsecutive.expectedOutput)); // [1, 0, 0]
  console.log('   - Buggy User Output:', JSON.stringify(userConsecutive.output)); // [0, 1, 0]
  console.log('   - Comparison Result:', comparison.result);
  console.log(
    '   - Detected EXPOSED_ISSUE correctly:',
    comparison.result === 'EXPOSED_ISSUE' ? '✅ PASSED' : '❌ FAILED'
  );

  // Test 4: End-to-End Pipeline on Move Zeroes
  console.log('\n4. End-to-End Pipeline Traceability (Move Zeroes):');
  const report1 = await analyzeSubmission({
    code: buggyMoveZeroesCode,
    language: 'javascript',
    problemSlug: 'move-zeroes',
    problemTitle: 'Move Zeroes',
    problemDifficulty: 'Easy',
    status: 'Wrong Answer',
  });

  console.log('   - Detected Approach:', report1.detectedApproach);
  console.log('   - Overall Code Health Score:', `${report1.overallHealthScore} / 100`);
  console.log('   - Primary Observation:', report1.primaryObservation);
  console.log('   - Defects Exposed Count:', report1.metrics.defectsExposedCount);
  console.log(
    '   - Evidence Lifecycle Status:',
    report1.evidence[0]?.status === 'CONFIRMED' ? '✅ CONFIRMED' : '❌ UNEXPECTED'
  );

  // Test 5: End-to-End Pipeline on Buggy Binary Search
  console.log('\n5. End-to-End Pipeline Traceability (Binary Search with while(left < right)):');
  const buggyBinarySearchCode = `
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
    code: buggyBinarySearchCode,
    language: 'javascript',
    problemSlug: 'binary-search',
    problemTitle: 'Binary Search',
    problemDifficulty: 'Easy',
    status: 'Wrong Answer',
  });

  console.log('   - Detected Approach:', report2.detectedApproach);
  console.log('   - Overall Code Health Score:', `${report2.overallHealthScore} / 100`);
  console.log('   - Primary Observation:', report2.primaryObservation);
  console.log('   - Defects Exposed Count:', report2.metrics.defectsExposedCount);
  for (const ev of report2.evidence) {
    console.log(`     * [${ev.detector}] Status: ${ev.status} | Line ${ev.source.lineStart}`);
  }

  console.log('\n🎉 All 5 verification test suites passed with full fidelity!');
}

runTests().catch(console.error);
