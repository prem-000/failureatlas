/**
 * src/lib/analysis/invariant-extractor.ts
 *
 * Extracts algorithmic invariants directly from the submitted source code.
 *
 * NO static pattern-slug lookup tables. Every invariant condition is synthesized
 * from the actual code's loops, variables, conditions, and data structures.
 */

import type {
  ExtractedInvariant,
  EvidenceItem,
  NormalizedCodeFacts,
} from '@/lib/adversarial/types';

export function extractAlgorithmicInvariants(
  code: string,
  facts: NormalizedCodeFacts,
  _patternSlug: string       // kept for interface compatibility; NOT used for template selection
): ExtractedInvariant[] {
  const invariants: ExtractedInvariant[] = [];

  // ── 1. Loop Invariants (from actual loops in the code) ────────────────────
  for (let i = 0; i < facts.loops.length; i++) {
    const loop = facts.loops[i];

    if (loop.type === 'recursion') {
      invariants.push({
        id: `inv_recursion_${i}`,
        condition: `Recursive calls terminate: each call reduces the problem scope`,
        type: 'termination',
        importance: 0.92,
        evidence: [{
          source: 'source_code',
          description: `Recursive function detected — must converge to a base case`,
          codeLocation: { snippet: loop.bounds || 'recursive call' },
          confidence: 0.90,
        }],
      });
      continue;
    }

    // Loop iteration invariant: the loop variable progresses correctly
    if (loop.variable && loop.bounds) {
      invariants.push({
        id: `inv_loop_iter_${i}`,
        condition: `Loop variable "${loop.variable}" iterates through ${loop.bounds} without skipping required elements`,
        type: 'termination',
        importance: 0.88,
        evidence: [{
          source: 'source_code',
          description: `Loop: ${loop.type} (${loop.bounds})`,
          codeLocation: { snippet: loop.bounds },
          confidence: 0.90,
        }],
      });
    }

    // Nested loop invariant
    if (loop.depth > 1) {
      invariants.push({
        id: `inv_loop_depth_${i}`,
        condition: `Inner loop at depth ${loop.depth} produces correct results for each outer iteration`,
        type: 'state_balance',
        importance: 0.85,
        evidence: [{
          source: 'source_code',
          description: `Nested loop at depth ${loop.depth}`,
          codeLocation: { snippet: loop.bounds },
          confidence: 0.85,
        }],
      });
    }
  }

  // ── 2. Accumulator / State Invariants (from actual variables) ─────────────
  for (const v of facts.variables) {
    if (v.isAccumulator) {
      const initDesc = v.initialValue !== undefined ? ` (initialized to ${v.initialValue})` : '';
      invariants.push({
        id: `inv_accum_${v.name}`,
        condition: `Accumulator "${v.name}"${initDesc} correctly aggregates state across iterations`,
        type: 'running_sum',
        importance: 0.90,
        evidence: [{
          source: 'source_code',
          description: `Variable "${v.name}" is used as an accumulator${initDesc}`,
          codeLocation: { snippet: `${v.name} = ${v.initialValue ?? '...'}` },
          confidence: 0.88,
        }],
      });
    }

    if (v.isPointer) {
      invariants.push({
        id: `inv_pointer_${v.name}`,
        condition: `Pointer "${v.name}" maintains valid bounds throughout execution`,
        type: 'monotonic',
        importance: 0.87,
        evidence: [{
          source: 'source_code',
          description: `Variable "${v.name}" is used as a pointer/index`,
          confidence: 0.85,
        }],
      });
    }
  }

  // ── 3. Data Structure Invariants (from actual data structures) ─────────────
  for (const ds of facts.dataStructures) {
    if (ds.type === 'map') {
      invariants.push({
        id: `inv_ds_${ds.name}`,
        condition: `Map "${ds.name}" maintains consistent key-value associations (operations: ${ds.operations.join(', ')})`,
        type: 'state_balance',
        importance: 0.86,
        evidence: [{
          source: 'source_code',
          description: `Data structure: ${ds.name} (Map) with operations: ${ds.operations.join(', ')}`,
          confidence: 0.88,
        }],
      });
    } else if (ds.type === 'set') {
      invariants.push({
        id: `inv_ds_${ds.name}`,
        condition: `Set "${ds.name}" correctly tracks unique elements (operations: ${ds.operations.join(', ')})`,
        type: 'visited_state',
        importance: 0.85,
        evidence: [{
          source: 'source_code',
          description: `Data structure: ${ds.name} (Set) with operations: ${ds.operations.join(', ')}`,
          confidence: 0.87,
        }],
      });
    } else if (ds.type === 'stack') {
      invariants.push({
        id: `inv_ds_${ds.name}`,
        condition: `Stack "${ds.name}" maintains LIFO ordering — every push has a corresponding pop`,
        type: 'state_balance',
        importance: 0.88,
        evidence: [{
          source: 'source_code',
          description: `Data structure: ${ds.name} (Stack) with operations: ${ds.operations.join(', ')}`,
          confidence: 0.88,
        }],
      });
    } else if (ds.type === 'queue') {
      invariants.push({
        id: `inv_ds_${ds.name}`,
        condition: `Queue "${ds.name}" processes elements in FIFO order`,
        type: 'state_balance',
        importance: 0.85,
        evidence: [{
          source: 'source_code',
          description: `Data structure: ${ds.name} (Queue) with operations: ${ds.operations.join(', ')}`,
          confidence: 0.85,
        }],
      });
    } else if (ds.type === 'heap') {
      invariants.push({
        id: `inv_ds_${ds.name}`,
        condition: `Heap "${ds.name}" maintains the heap property across insertions and extractions`,
        type: 'state_balance',
        importance: 0.88,
        evidence: [{
          source: 'source_code',
          description: `Data structure: ${ds.name} (Heap) with operations: ${ds.operations.join(', ')}`,
          confidence: 0.87,
        }],
      });
    }
  }

  // ── 4. Condition-Guard Invariants ─────────────────────────────────────────
  for (let i = 0; i < Math.min(facts.conditions.length, 3); i++) {
    const cond = facts.conditions[i];
    if (cond.isBoundaryCheck) {
      invariants.push({
        id: `inv_guard_${i}`,
        condition: `Guard condition "${cond.condition}" correctly partitions valid from invalid states`,
        type: 'search_space',
        importance: 0.82,
        evidence: [{
          source: 'source_code',
          description: `Boundary check: ${cond.condition}`,
          codeLocation: { snippet: cond.condition },
          confidence: 0.85,
        }],
      });
    }
  }

  // ── 5. State Mutation Invariants ──────────────────────────────────────────
  for (let i = 0; i < Math.min(facts.stateMutations.length, 2); i++) {
    const mut = facts.stateMutations[i];
    invariants.push({
      id: `inv_mutation_${i}`,
      condition: `State update "${mut.operation}" on "${mut.target}" preserves correctness of the accumulated result`,
      type: 'state_balance',
      importance: 0.84,
      evidence: [{
        source: 'source_code',
        description: `State mutation: ${mut.target} via ${mut.operation}`,
        codeLocation: { snippet: mut.operation },
        confidence: 0.85,
      }],
    });
  }

  return invariants;
}
