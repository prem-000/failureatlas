import type {
  EvidenceItem,
  MutationCandidate,
  NormalizedCodeFacts,
} from './types';

export function generateCodeMutations(
  code: string,
  facts: NormalizedCodeFacts,
  patternSlug: string
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
          description: `Mutation of "${orig}" to "${mut}" targets ${targetHypo}`,
          codeLocation: { snippet: orig },
          confidence: 0.90,
        },
      ],
    });
  };

  // 1. Comparison Mutations (< ↔ <=, > ↔ >=, == ↔ !=)
  for (let i = 0; i < facts.conditions.length; i++) {
    const cond = facts.conditions[i].condition;
    if (cond.includes('>=')) {
      addMut(
        `mut_comp_${i}`,
        'comparison',
        cond,
        cond.replace('>=', '>'),
        'Strict equality boundary check alteration',
        'Tests whether boundary values exactly matching the threshold produce false negatives',
        0.85
      );
    } else if (cond.includes('<=')) {
      addMut(
        `mut_comp_${i}`,
        'comparison',
        cond,
        cond.replace('<=', '<'),
        'Strict equality boundary check alteration',
        'Tests whether boundary values exactly matching the upper limit produce false negatives',
        0.85
      );
    } else if (cond.includes('===') || cond.includes('==')) {
      addMut(
        `mut_comp_${i}`,
        'comparison',
        cond,
        cond.replace(/===|==/, '!=='),
        'Equality polarity inversion',
        'Tests whether single-element or null-identity checks alter execution flow',
        0.80
      );
    }
  }

  // 2. Loop Bound Mutations (i < n vs i < n - 1, or start offset)
  for (let i = 0; i < facts.loops.length; i++) {
    const loop = facts.loops[i];
    if (loop.bounds.includes('<') && !loop.bounds.includes('<=')) {
      addMut(
        `mut_loop_${i}`,
        'loop',
        loop.bounds,
        loop.bounds.replace('<', '<='),
        'Loop boundary expansion mutation',
        'Tests whether iterating beyond length bounds triggers index out of range',
        0.88
      );
    }
  }

  // 3. Index Mutations (i - k vs i - k + 1)
  if (patternSlug === 'sliding_window') {
    addMut(
      'mut_idx_sw',
      'index',
      'nums[i - k]',
      'nums[i - k + 1]',
      'Window outgoing index off-by-one mutation',
      'Tests whether window eviction shifts the window size out of alignment',
      0.92
    );
  }

  // 4. State Update Mutations (Accumulator reverse or skip)
  if (facts.stateMutations.length > 0) {
    const mut = facts.stateMutations[0];
    addMut(
      'mut_state_1',
      'state_update',
      mut.operation,
      `/* omitted */ ${mut.target}`,
      'State accumulation disruption',
      'Tests whether partial updates or omitted state components leave stale state',
      0.86
    );
  }

  // 5. Initialization Mutations
  for (let i = 0; i < facts.variables.length; i++) {
    const v = facts.variables[i];
    if (v.isAccumulator && v.initialValue === '0') {
      addMut(
        `mut_init_${i}`,
        'initialization',
        `${v.name} = 0`,
        `${v.name} = -Infinity`,
        'Accumulator initialization polarity check',
        'Tests whether negative input ranges produce incorrect zero outputs',
        0.82
      );
      break;
    }
  }

  // 6. Scale / Complexity Pressure
  addMut(
    'mut_scale_1',
    'scale',
    'N = small',
    'N = maximum constraint',
    'Scale stress mutation',
    'Tests whether time complexity or recursion depth safely executes under maximal scale',
    0.75
  );

  return mutations;
}
