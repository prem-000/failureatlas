/**
 * tests/intelligence/mutation/mutation-engine.ts
 * Automated Mutation Testing Engine for Praxis Failure Intelligence.
 * Injects deliberate syntactic mutations into correct implementations and evaluates whether Praxis exposes the flaw.
 */

import { analyzeSubmission } from '../../../src/lib/intelligence/intelligence-pipeline';

export interface MutationResult {
  originalSlug: string;
  mutationType: string;
  originalCode: string;
  mutatedCode: string;
  detected: boolean;
  verdict?: string;
  healthScore?: number;
}

export interface MutationSuiteReport {
  totalMutants: number;
  detectedMutants: number;
  missedMutants: number;
  mutationScore: number;
  mutations: MutationResult[];
}

const CORRECT_SEED_SOLUTIONS: Array<{
  slug: string;
  title: string;
  code: string;
}> = [
  {
    slug: 'binary-search',
    title: 'Binary Search',
    code: `function search(nums, target) {
      let left = 0, right = nums.length - 1;
      while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
      }
      return -1;
    }`,
  },
  {
    slug: 'move-zeroes',
    title: 'Move Zeroes',
    code: `function moveZeroes(nums) {
      let pos = 0;
      for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== 0) nums[pos++] = nums[i];
      }
      while (pos < nums.length) nums[pos++] = 0;
    }`,
  },
  {
    slug: 'two-sum',
    title: 'Two Sum',
    code: `function twoSum(nums, target) {
      const map = new Map();
      for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) return [map.get(complement), i];
        map.set(nums[i], i);
      }
      return [];
    }`,
  },
  {
    slug: 'sort-colors',
    title: 'Sort Colors',
    code: `function sortColors(nums) {
      let low = 0, mid = 0, high = nums.length - 1;
      while (mid <= high) {
        if (nums[mid] === 0) {
          [nums[low], nums[mid]] = [nums[mid], nums[low]];
          low++;
          mid++;
        } else if (nums[mid] === 1) {
          mid++;
        } else {
          [nums[mid], nums[high]] = [nums[high], nums[mid]];
          high--;
        }
      }
    }`,
  },
];

export async function runMutationTesting(): Promise<MutationSuiteReport> {
  console.log('🧬 Running Automated Mutation Testing Suite...\n');
  const mutations: MutationResult[] = [];

  for (const sol of CORRECT_SEED_SOLUTIONS) {
    const generatedMutants = generateMutants(sol.slug, sol.code);

    for (const m of generatedMutants) {
      const report = await analyzeSubmission({
        code: m.mutatedCode,
        language: 'javascript',
        problemSlug: sol.slug,
        problemTitle: sol.title,
        status: 'Wrong Answer',
      });

      const detected = report.metrics.defectsExposedCount > 0;

      mutations.push({
        originalSlug: sol.slug,
        mutationType: m.type,
        originalCode: sol.code,
        mutatedCode: m.mutatedCode,
        detected,
        verdict: detected ? 'MUTANT_KILLED' : 'MUTANT_SURVIVED',
        healthScore: report.overallHealthScore,
      });
    }
  }

  const detectedCount = mutations.filter(m => m.detected).length;
  const total = mutations.length;
  const mutationScore = total > 0 ? (detectedCount / total) * 100 : 0;

  return {
    totalMutants: total,
    detectedMutants: detectedCount,
    missedMutants: total - detectedCount,
    mutationScore: Number(mutationScore.toFixed(2)),
    mutations,
  };
}

function generateMutants(
  slug: string,
  code: string
): Array<{ type: string; mutatedCode: string }> {
  const list: Array<{ type: string; mutatedCode: string }> = [];

  // 1. Boundary Operator Inversion (<= -> <)
  if (code.includes('<= right')) {
    list.push({
      type: 'INVERT_LESS_EQUAL_TO_LESS',
      mutatedCode: code.replace('<= right', '< right'),
    });
  }

  // 2. Pointer Update Omission (mid + 1 -> mid)
  if (code.includes('left = mid + 1')) {
    list.push({
      type: 'OMIT_POINTER_INCREMENT',
      mutatedCode: code.replace('left = mid + 1', 'left = mid'),
    });
  }

  // 3. Right Pointer Update Omission (mid - 1 -> mid)
  if (code.includes('right = mid - 1')) {
    list.push({
      type: 'OMIT_POINTER_DECREMENT',
      mutatedCode: code.replace('right = mid - 1', 'right = mid'),
    });
  }

  // 4. In-Place Loop Boundary Mutation (nums.length -> nums.length - 1)
  if (code.includes('i < nums.length')) {
    list.push({
      type: 'OFF_BY_ONE_LOOP_BOUND',
      mutatedCode: code.replace('i < nums.length', 'i < nums.length - 1'),
    });
  }

  // 5. Hash Map Polarity Mutation (target - nums[i] -> target + nums[i])
  if (code.includes('target - nums[i]')) {
    list.push({
      type: 'ARITHMETIC_POLARITY_INVERSION',
      mutatedCode: code.replace('target - nums[i]', 'target + nums[i]'),
    });
  }

  // 6. Partition Pointer Inversion (mid <= high -> mid < high)
  if (code.includes('mid <= high')) {
    list.push({
      type: 'STRICT_PARTITION_BOUNDARY',
      mutatedCode: code.replace('mid <= high', 'mid < high'),
    });
  }

  return list;
}
