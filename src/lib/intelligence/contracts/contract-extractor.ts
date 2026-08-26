/**
 * src/lib/intelligence/contracts/contract-extractor.ts
 * Extracts or synthesizes a ProblemContract from problem metadata and source code.
 */

import type { ProblemContract, ProblemParameter, ExecutionMode } from './problem-contract';
import { getCanonicalContract } from './contract-registry';

export function resolveProblemContract(opts: {
  slug: string;
  title: string;
  difficulty?: string;
  code?: string;
  topics?: string[];
}): ProblemContract {
  const { slug, title, difficulty = 'Medium', code = '', topics = [] } = opts;

  // 1. Check Canonical Registry first
  const existing = getCanonicalContract(slug);
  if (existing) {
    return existing;
  }

  // 2. Synthesize dynamically from source code structure and signature
  const extracted = extractContractFromCode(code, slug, title, difficulty, topics);
  return extracted;
}

function extractContractFromCode(
  code: string,
  slug: string,
  title: string,
  difficulty: string,
  topics: string[]
): ProblemContract {
  // Extract function signature: e.g. function twoSum(nums, target) or var moveZeroes = function(nums)
  const fnMatch =
    code.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/) ||
    code.match(/(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:function|\(([^)]*)\)\s*=>)/);

  const functionName = fnMatch?.[1] || 'solution';
  const paramListStr = (fnMatch?.[2] || '').trim();

  const rawParamNames = paramListStr
    ? paramListStr.split(',').map(p => p.trim().split(':')[0].trim()).filter(Boolean)
    : [];

  // Infer execution mode: check for in-place patterns or void return
  const isInPlace =
    slug.includes('move-zero') ||
    slug.includes('sort-color') ||
    slug.includes('rotate-array') ||
    slug.includes('reverse-string') ||
    (code.includes('nums[') && !code.includes('return ') && (rawParamNames.includes('nums') || rawParamNames.includes('arr')));

  const executionMode: ExecutionMode = isInPlace ? 'in_place' : 'return_value';

  const parameters: ProblemParameter[] = rawParamNames.map(name => {
    let type = 'number[]';
    if (name === 'target' || name === 'k' || name === 'val' || name === 'threshold' || name === 'n') {
      type = 'number';
    } else if (name === 's' || name === 'str' || name === 'word') {
      type = 'string';
    } else if (name === 'matrix' || name === 'grid') {
      type = 'number[][]';
    }
    return { name, type };
  });

  // If no params detected, fallback sensibly based on slug / topics
  if (parameters.length === 0) {
    if (topics.includes('String') || slug.includes('string') || slug.includes('palindrome')) {
      parameters.push({ name: 's', type: 'string' });
    } else if (slug.includes('target') || slug.includes('two-sum')) {
      parameters.push({ name: 'nums', type: 'number[]' }, { name: 'target', type: 'number' });
    } else {
      parameters.push({ name: 'nums', type: 'number[]' });
    }
  }

  return {
    slug,
    title,
    difficulty: (difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium',
    functionName,
    parameters,
    returnType: isInPlace ? 'void' : 'any',
    executionMode,
    inPlaceTargetParam: isInPlace ? parameters[0]?.name : undefined,
    constraints: [
      { expression: '1 <= N <= 10^5', variable: 'N', min: 1, max: 100000 },
    ],
    invariants: [
      `Satisfies algorithmic contract for ${title}`,
    ],
    oracleType: 'reference_solution',
  };
}
