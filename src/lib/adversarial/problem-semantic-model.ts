/**
 * src/lib/adversarial/problem-semantic-model.ts
 *
 * Builds a structured understanding of what the problem requires
 * BEFORE analyzing the submitted solution.
 *
 * This module gives every downstream component (hypothesis discovery,
 * test synthesis, fallback generator) concrete problem context:
 *   - parameter names & inferred types
 *   - input shape
 *   - constraint boundaries (min/max per parameter)
 *   - correctness condition
 *   - boundary values worth testing
 */

import type { NormalizedCodeFacts } from './types';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface ParameterDescriptor {
  name: string;
  inferredType: 'integer' | 'string' | 'integer_array' | 'string_array' | 'matrix' | 'boolean' | 'linked_list' | 'tree' | 'unknown';
  constraints: { min?: string; max?: string; notes?: string };
}

export interface ConstraintBoundary {
  parameter: string;
  min: string;
  max: string;
  note?: string;
}

export interface ProblemSemanticModel {
  title: string;
  slug: string;
  difficulty: string;
  parameters: ParameterDescriptor[];
  inputShape: string;                    // e.g. "array + integer", "string", "integer", "array + target"
  correctnessCondition: string;          // What makes an answer correct for this problem
  boundaries: ConstraintBoundary[];      // Concrete boundary values from constraints
  mathematicalRelationships: string[];   // e.g. "1 <= k <= arr.length", "target = nums[i] + nums[j]"
  testableEdgeBehaviors: string[];       // Problem-specific edge behaviors worth testing
}

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildProblemSemanticModel(params: {
  title: string;
  slug: string;
  difficulty: string;
  constraints: string[];
  statement?: string;
  facts: NormalizedCodeFacts;
}): ProblemSemanticModel {
  const { title, slug, difficulty, constraints, statement, facts } = params;
  const constraintText = constraints.join(' ').toLowerCase();

  // 1. Infer parameters from code facts
  const codeParams = facts.functions[0]?.params || [];
  const parameters: ParameterDescriptor[] = codeParams.map(p => ({
    name: p,
    inferredType: inferParamType(p, constraintText, facts),
    constraints: extractParamConstraints(p, constraints),
  }));

  // If no function params detected, infer from constraints + variable names
  if (parameters.length === 0) {
    const inferred = inferParametersFromConstraints(constraints, facts);
    parameters.push(...inferred);
  }

  // 2. Determine input shape
  const inputShape = deriveInputShape(parameters);

  // 3. Derive correctness condition from problem title + constraints
  const correctnessCondition = deriveCorrectnessCondition(title, slug, parameters, constraints);

  // 4. Extract constraint boundaries
  const boundaries = extractBoundaries(constraints, parameters);

  // 5. Extract mathematical relationships
  const mathematicalRelationships = extractMathRelationships(constraints);

  // 6. Derive testable edge behaviors
  const testableEdgeBehaviors = deriveTestableEdges(title, slug, parameters, boundaries, correctnessCondition, facts);

  return {
    title,
    slug,
    difficulty,
    parameters,
    inputShape,
    correctnessCondition,
    boundaries,
    mathematicalRelationships,
    testableEdgeBehaviors,
  };
}

// ─── Parameter Type Inference ────────────────────────────────────────────────

function inferParamType(
  name: string,
  constraintText: string,
  facts: NormalizedCodeFacts
): ParameterDescriptor['inferredType'] {
  const n = name.toLowerCase();

  // Direct name patterns
  if (n === 's' || n === 'str' || n === 'string' || n === 'haystack' || n === 'needle' || n === 'word' || n === 'pattern') {
    return 'string';
  }
  if (n === 'nums' || n === 'arr' || n === 'numbers' || n === 'prices' || n === 'height' || n === 'heights' || n === 'temperatures' || n === 'candidates' || n === 'coins' || n === 'weights' || n === 'intervals') {
    return 'integer_array';
  }
  if (n === 'strs' || n === 'words' || n === 'wordlist') {
    return 'string_array';
  }
  if (n === 'grid' || n === 'matrix' || n === 'board' || n === 'image') {
    return 'matrix';
  }
  if (n === 'head' || n === 'node' || n === 'list') {
    return 'linked_list';
  }
  if (n === 'root' || n === 'tree' || n === 'p' || n === 'q') {
    return 'tree';
  }
  if (n === 'n' || n === 'x' || n === 'num' || n === 'k' || n === 'target' || n === 'threshold' || n === 'val' || n === 'm' || n === 'left' || n === 'right' || n === 'capacity' || n === 'amount' || n === 'dividend' || n === 'divisor') {
    return 'integer';
  }

  // Check code usage patterns
  const hasArrayAccess = facts.loops.some(l => l.bounds.includes(name) || l.bounds.includes(`${name}.length`));
  if (hasArrayAccess) return 'integer_array';

  const hasStringOps = facts.dataStructures.some(ds => ds.operations.some(op => op.includes('charAt') || op.includes('charCodeAt')));
  if (hasStringOps && facts.functions[0]?.params.length === 1) return 'string';

  return 'unknown';
}

function extractParamConstraints(name: string, constraints: string[]): ParameterDescriptor['constraints'] {
  const result: ParameterDescriptor['constraints'] = {};
  const n = name.toLowerCase();

  for (const c of constraints) {
    const cl = c.toLowerCase();
    // Match patterns like "1 <= n <= 45", "0 <= arr[i] <= 10^4", "-10^9 <= nums[i] <= 10^9"
    const rangeMatch = cl.match(new RegExp(`(-?[0-9^*.]+)\\s*<=\\s*(?:${n}(?:\\.length)?|${n}\\[i\\])\\s*<=\\s*(-?[0-9^*.]+)`));
    if (rangeMatch) {
      result.min = rangeMatch[1].trim();
      result.max = rangeMatch[2].trim();
    }
    // Match "n >= 1" or "k >= 1"
    const lowerMatch = cl.match(new RegExp(`${n}\\s*>=\\s*(-?[0-9^*.]+)`));
    if (lowerMatch && !result.min) {
      result.min = lowerMatch[1].trim();
    }
    // Match descriptive constraints
    if (cl.includes(n) && (cl.includes('sorted') || cl.includes('unique') || cl.includes('distinct') || cl.includes('non-empty'))) {
      result.notes = c;
    }
  }

  return result;
}

function inferParametersFromConstraints(constraints: string[], facts: NormalizedCodeFacts): ParameterDescriptor[] {
  const params: ParameterDescriptor[] = [];
  const constraintText = constraints.join(' ').toLowerCase();

  // Try to detect from variable names in code
  for (const v of facts.variables) {
    const n = v.name.toLowerCase();
    if (['i', 'j', 'idx', 'index', 'result', 'res', 'ans', 'count', 'sum', 'temp', 'curr', 'prev', 'max', 'min'].includes(n)) {
      continue; // Skip internal variables
    }
    params.push({
      name: v.name,
      inferredType: inferParamType(v.name, constraintText, facts),
      constraints: extractParamConstraints(v.name, constraints),
    });
  }

  return params;
}

// ─── Input Shape ─────────────────────────────────────────────────────────────

function deriveInputShape(parameters: ParameterDescriptor[]): string {
  if (parameters.length === 0) return 'unknown';
  const types = parameters.map(p => {
    if (p.inferredType === 'integer_array') return 'array';
    if (p.inferredType === 'string_array') return 'string_array';
    return p.inferredType;
  });
  return types.join(' + ');
}

// ─── Correctness Condition ───────────────────────────────────────────────────

function deriveCorrectnessCondition(title: string, slug: string, params: ParameterDescriptor[], constraints: string[]): string {
  const t = title.toLowerCase();
  const s = slug.toLowerCase();

  // Known problem patterns — derived from problem semantics, not algorithm classification
  if (s.includes('two-sum')) return 'Return indices of two numbers in the array that add up to target. Each input has exactly one solution, and the same element cannot be used twice.';
  if (s.includes('palindrome-number')) return 'Return true if x is a palindrome integer (reads the same forward and backward). Negative numbers are not palindromes.';
  if (s.includes('valid-parentheses')) return 'Return true if the input string of brackets is valid: every open bracket has a matching close bracket in correct order.';
  if (s.includes('longest-substring-without-repeating')) return 'Return the length of the longest substring without any repeating characters.';
  if (s.includes('binary-search') && !s.includes('tree')) return 'Return the index of target in a sorted array, or -1 if target is not present.';
  if (s.includes('climbing-stairs')) return 'Return the number of distinct ways to climb n stairs, taking 1 or 2 steps at a time.';
  if (s.includes('maximum-subarray')) return 'Return the largest sum of any contiguous subarray.';
  if (s.includes('best-time-to-buy-and-sell-stock') && !s.includes('ii')) return 'Return the maximum profit from one buy-sell transaction, or 0 if no profit is possible.';
  if (s.includes('valid-palindrome') && !s.includes('ii')) return 'Return true if the string is a palindrome after removing all non-alphanumeric characters and converting to lowercase.';
  if (s.includes('roman-to-integer')) return 'Convert a Roman numeral string to its integer value.';
  if (s.includes('length-of-last-word')) return 'Return the length of the last word in the string. A word is a maximal substring of non-space characters.';
  if (s.includes('find-the-index-of-the-first-occurrence')) return 'Return the index of the first occurrence of needle in haystack, or -1 if needle is not part of haystack.';
  if (s.includes('sub-arrays-of-size-k') || s.includes('average-greater-than-or-equal-to-threshold')) {
    return 'Count the number of contiguous subarrays of exactly size k whose arithmetic mean is greater than or equal to threshold.';
  }
  if (s.includes('contains-duplicate')) return 'Return true if any value appears at least twice in the array.';
  if (s.includes('valid-anagram')) return 'Return true if s and t are anagrams of each other (same characters, same frequency).';
  if (s.includes('merge-two-sorted-lists')) return 'Merge two sorted linked lists into one sorted linked list.';
  if (s.includes('reverse-linked-list')) return 'Reverse a singly linked list.';
  if (s.includes('invert-binary-tree')) return 'Invert a binary tree (swap left and right children at every node).';
  if (s.includes('maximum-depth-of-binary-tree')) return 'Return the maximum depth of the binary tree (longest path from root to leaf).';
  if (s.includes('same-tree')) return 'Return true if two binary trees are structurally identical with the same node values.';
  if (s.includes('3sum') || s.includes('three-sum')) return 'Return all unique triplets that sum to zero. No duplicate triplets.';
  if (s.includes('container-with-most-water')) return 'Return the maximum area of water a container can store, formed by two lines from the height array.';
  if (s.includes('search-in-rotated-sorted-array')) return 'Search for target in a rotated sorted array and return its index, or -1 if not found.';
  if (s.includes('coin-change')) return 'Return the minimum number of coins needed to make up the amount, or -1 if impossible.';
  if (s.includes('house-robber')) return 'Return the maximum amount that can be robbed without robbing two adjacent houses.';
  if (s.includes('product-of-array-except-self')) return 'Return an array where each element is the product of all other elements, without using division.';
  if (s.includes('number-of-islands')) return 'Count the number of islands (connected components of 1s surrounded by 0s) in a 2D grid.';

  // Generic derivation from title and parameters
  const paramList = params.map(p => p.name).join(', ');
  if (t.includes('count') || t.includes('number of')) return `Count the elements or occurrences satisfying the stated condition given (${paramList}).`;
  if (t.includes('find') || t.includes('search')) return `Find the target element or position satisfying the stated condition given (${paramList}).`;
  if (t.includes('maximum') || t.includes('longest') || t.includes('largest')) return `Return the maximum/longest value satisfying the stated condition given (${paramList}).`;
  if (t.includes('minimum') || t.includes('shortest') || t.includes('smallest')) return `Return the minimum/shortest value satisfying the stated condition given (${paramList}).`;
  if (t.includes('valid') || t.includes('check') || t.includes('is')) return `Return true/false based on whether the input satisfies the stated validity condition.`;
  if (t.includes('reverse') || t.includes('rotate') || t.includes('merge') || t.includes('sort')) return `Transform the input according to the stated operation and return the result.`;

  return `Compute the correct result for "${title}" given input parameters (${paramList}).`;
}

// ─── Constraint Boundaries ───────────────────────────────────────────────────

function extractBoundaries(constraints: string[], params: ParameterDescriptor[]): ConstraintBoundary[] {
  const boundaries: ConstraintBoundary[] = [];

  for (const p of params) {
    if (p.constraints.min || p.constraints.max) {
      boundaries.push({
        parameter: p.name,
        min: p.constraints.min || '0',
        max: p.constraints.max || 'unspecified',
        note: p.constraints.notes,
      });
    }
  }

  // Also extract array-element-level constraints
  for (const c of constraints) {
    const elemMatch = c.match(/(-?[0-9^*. ]+)\s*<=\s*(\w+)\[i\]\s*<=\s*(-?[0-9^*. ]+)/i);
    if (elemMatch) {
      const paramName = elemMatch[2];
      if (!boundaries.some(b => b.parameter === `${paramName}[i]`)) {
        boundaries.push({
          parameter: `${paramName}[i]`,
          min: elemMatch[1].trim(),
          max: elemMatch[3].trim(),
          note: `Element-level constraint for ${paramName}`,
        });
      }
    }
  }

  return boundaries;
}

// ─── Mathematical Relationships ──────────────────────────────────────────────

function extractMathRelationships(constraints: string[]): string[] {
  return constraints.filter(c => {
    const cl = c.toLowerCase();
    return cl.includes('<=') || cl.includes('>=') || cl.includes('==') || cl.includes('sorted') || cl.includes('unique') || cl.includes('distinct');
  });
}

// ─── Testable Edge Behaviors ─────────────────────────────────────────────────

function deriveTestableEdges(
  title: string,
  slug: string,
  params: ParameterDescriptor[],
  boundaries: ConstraintBoundary[],
  correctness: string,
  facts: NormalizedCodeFacts
): string[] {
  const edges: string[] = [];

  // From parameters: minimum and maximum boundary values
  for (const b of boundaries) {
    if (b.min === '0' || b.min === '1') {
      edges.push(`${b.parameter} at minimum value (${b.min})`);
    }
    if (b.max && b.max !== 'unspecified') {
      edges.push(`${b.parameter} at maximum constraint (${b.max})`);
    }
  }

  // From parameter types: type-specific edge cases
  for (const p of params) {
    switch (p.inferredType) {
      case 'string':
        edges.push(`Empty string input for ${p.name}`);
        edges.push(`Single character input for ${p.name}`);
        edges.push(`All identical characters in ${p.name}`);
        break;
      case 'integer_array':
        edges.push(`Single element array for ${p.name}`);
        edges.push(`Array with all identical values for ${p.name}`);
        edges.push(`Array with negative values for ${p.name}`);
        break;
      case 'integer':
        edges.push(`${p.name} = 0 (if constraint-valid)`);
        edges.push(`Negative value for ${p.name} (if constraint-valid)`);
        break;
      case 'matrix':
        edges.push(`1x1 grid for ${p.name}`);
        edges.push(`Single row grid for ${p.name}`);
        break;
    }
  }

  // From code structure: early returns, special conditions
  for (const er of facts.earlyReturns) {
    edges.push(`Input triggering early return: ${er.condition}`);
  }

  // From correctness condition: semantic edges
  if (correctness.includes('palindrome')) {
    edges.push('Input that is a palindrome');
    edges.push('Input that is NOT a palindrome');
    edges.push('Single character or empty input');
  }
  if (correctness.includes('sorted')) {
    edges.push('Already sorted input');
    edges.push('Reverse sorted input');
  }
  if (correctness.includes('duplicate') || correctness.includes('unique')) {
    edges.push('Input with duplicate values');
    edges.push('Input with all unique values');
  }

  // Deduplicate
  return [...new Set(edges)];
}
