/**
 * src/lib/adversarial/mutation-engine.ts
 *
 * Code-Grounded Mutation Analysis
 *
 * Generates mutations from the actual submitted source code.
 * Each mutation description references real variable names, real expressions,
 * and real code constructs — never generic labels.
 *
 * Removed: hardcoded sliding-window index mutation, generic "Scale stress mutation".
 */

import type {
  EvidenceItem,
  MutationCandidate,
  NormalizedCodeFacts,
} from './types';

export function generateCodeMutations(
  code: string,
  facts: NormalizedCodeFacts,
  _patternSlug: string       // kept for interface compatibility; NOT used for template selection
): MutationCandidate[] {
  const mutations: MutationCandidate[] = [];

  const addMut = (
    id: string,
    family: MutationCandidate['family'],
    orig: string,
    mut: string,
    desc: string,
    targetHypo: string,
    score: number
  ) => {
    mutations.push({
      id,
      family,
      originalSnippet: orig,
      mutatedSnippet: mut,
      description: desc,
      targetHypothesis: targetHypo,
      sensitivityScore: score,
      evidence: [
        {
          source: 'source_code',
          description: `Mutation: "${orig}" → "${mut}" — ${desc}`,
          codeLocation: { snippet: orig },
          confidence: 0.90,
        },
      ],
    });
  };

  // 1. Comparison Mutations (from actual conditions in the code)
  for (let i = 0; i < facts.conditions.length; i++) {
    const cond = facts.conditions[i].condition;
    if (cond.includes('>=')) {
      addMut(
        `mut_comp_${i}`,
        'comparison',
        cond,
        cond.replace('>=', '>'),
        `Changing "${cond}" to use strict > instead of >= could miss values exactly at the boundary`,
        `If the condition "${cond}" is changed to strict >, inputs where the compared values are exactly equal would be excluded`,
        0.85
      );
    } else if (cond.includes('<=')) {
      addMut(
        `mut_comp_${i}`,
        'comparison',
        cond,
        cond.replace('<=', '<'),
        `Changing "${cond}" to use strict < instead of <= could miss the upper boundary value`,
        `If the condition "${cond}" is changed to strict <, the maximum valid value would be incorrectly excluded`,
        0.85
      );
    } else if (cond.includes('===') || cond.includes('==')) {
      const operator = cond.includes('===') ? '===' : '==';
      addMut(
        `mut_comp_${i}`,
        'comparison',
        cond,
        cond.replace(operator, operator === '===' ? '!==' : '!='),
        `Inverting "${cond}" would negate the match condition, accepting wrong values and rejecting correct ones`,
        `If "${cond}" is negated, the logic flow is reversed — previously matching inputs would be skipped`,
        0.80
      );
    }
  }

  // 2. Loop Bound Mutations (from actual loops in the code)
  for (let i = 0; i < facts.loops.length; i++) {
    const loop = facts.loops[i];
    if (loop.type === 'recursion') continue;

    if (loop.bounds.includes('<') && !loop.bounds.includes('<=')) {
      addMut(
        `mut_loop_${i}`,
        'loop',
        loop.bounds,
        loop.bounds.replace('<', '<='),
        `Expanding loop bound "${loop.bounds}" from < to <= would iterate one extra time, potentially causing an out-of-bounds access`,
        `If "${loop.bounds}" uses <= instead of <, the loop processes one additional element beyond the valid range`,
        0.88
      );
    } else if (loop.bounds.includes('<=')) {
      addMut(
        `mut_loop_${i}`,
        'loop',
        loop.bounds,
        loop.bounds.replace('<=', '<'),
        `Shrinking loop bound "${loop.bounds}" from <= to < would skip the last valid element`,
        `If "${loop.bounds}" uses < instead of <=, the final valid iteration is missed`,
        0.87
      );
    }
  }

  // 3. State Update Mutations (from actual state mutations in the code)
  for (let i = 0; i < Math.min(facts.stateMutations.length, 3); i++) {
    const mut = facts.stateMutations[i];
    addMut(
      `mut_state_${i}`,
      'state_update',
      mut.operation,
      `/* removed: ${mut.target} update */`,
      `Removing the state update "${mut.operation}" on "${mut.target}" would leave stale values from previous iterations`,
      `If the update "${mut.operation}" is removed, "${mut.target}" retains its old value, causing incorrect accumulation`,
      0.86
    );
  }

  // 4. Initialization Mutations (from actual variable initializations)
  for (let i = 0; i < facts.variables.length; i++) {
    const v = facts.variables[i];
    if (v.isAccumulator && v.initialValue !== undefined) {
      const altInit = v.initialValue === '0' ? '-Infinity'
        : v.initialValue === 'Infinity' ? '0'
        : v.initialValue === '-Infinity' ? '0'
        : v.initialValue === 'true' ? 'false'
        : v.initialValue === 'false' ? 'true'
        : '0';

      addMut(
        `mut_init_${i}`,
        'initialization',
        `${v.name} = ${v.initialValue}`,
        `${v.name} = ${altInit}`,
        `Changing the initial value of "${v.name}" from ${v.initialValue} to ${altInit} could produce incorrect results for edge inputs`,
        `If "${v.name}" starts at ${altInit} instead of ${v.initialValue}, inputs where all values are negative (or at the boundary) would return the wrong answer`,
        0.82
      );
      break; // Only mutate the first accumulator
    }
  }

  return mutations;
}
