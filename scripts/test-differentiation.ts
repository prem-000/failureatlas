import { runSolutionStressModel } from '../src/lib/adversarial/solution-stress-model';
import type { StressTarget } from '../src/lib/adversarial/types';

async function testTwoSum() {
  console.log('================================================================');
  console.log('TEST 1: Two Sum (Hash Map solution)');
  console.log('================================================================');

  const res = await runSolutionStressModel({
    code: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    language: 'javascript',
    problemTitle: 'Two Sum',
    problemSlug: 'two-sum',
    problemDifficulty: 'Easy',
    problemTopics: ['Array', 'Hash Table'],
  });

  console.log('\n--- Stress Targets ---');
  res.stressTargets.forEach((t: StressTarget) => {
    console.log(`[${t.id}] "${t.riskTitle}" (${t.targetHypothesis})`);
    console.log(`   Attacks: ${t.whatItAttacks}`);
    console.log();
  });
}

async function testLongestSubstring() {
  console.log('================================================================');
  console.log('TEST 2: Longest Substring Without Repeating Characters');
  console.log('================================================================');

  const res = await runSolutionStressModel({
    code: `function lengthOfLongestSubstring(s) {
  let maxLen = 0;
  let left = 0;
  const seen = new Map();
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (seen.has(char) && seen.get(char) >= left) {
      left = seen.get(char) + 1;
    }
    seen.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}`,
    language: 'javascript',
    problemTitle: 'Longest Substring Without Repeating Characters',
    problemSlug: 'longest-substring-without-repeating-characters',
    problemDifficulty: 'Medium',
    problemTopics: ['Hash Table', 'String', 'Sliding Window'],
  });

  console.log('\n--- Stress Targets ---');
  res.stressTargets.forEach((t: StressTarget) => {
    console.log(`[${t.id}] "${t.riskTitle}" (${t.targetHypothesis})`);
    console.log(`   Attacks: ${t.whatItAttacks}`);
    console.log();
  });
}

async function testBinarySearch() {
  console.log('================================================================');
  console.log('TEST 3: Binary Search');
  console.log('================================================================');

  const res = await runSolutionStressModel({
    code: `function search(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
    language: 'javascript',
    problemTitle: 'Binary Search',
    problemSlug: 'binary-search',
    problemDifficulty: 'Easy',
    problemTopics: ['Array', 'Binary Search'],
  });

  console.log('\n--- Stress Targets ---');
  res.stressTargets.forEach((t: StressTarget) => {
    console.log(`[${t.id}] "${t.riskTitle}" (${t.targetHypothesis})`);
    console.log(`   Attacks: ${t.whatItAttacks}`);
    console.log();
  });
}

async function main() {
  await testTwoSum();
  console.log('\n\n');
  await testLongestSubstring();
  console.log('\n\n');
  await testBinarySearch();

  console.log('\n\n================================================================');
  console.log('DIFFERENTIATION CHECK COMPLETE');
  console.log('================================================================');
}

main().catch(console.error);
