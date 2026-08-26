/**
 * src/lib/intelligence/objectives/test-objective-builder.ts
 * Transforms static AnalysisEvidence items into explicit Failure-Driven Test Objectives.
 */

import type { AnalysisEvidence, AnalysisCategory } from '../analysis/evidence-engine';
import type { ProblemContract } from '../contracts/problem-contract';

export interface TestObjective {
  id: string;
  evidenceId: string;
  category: AnalysisCategory;
  detector: string;
  objective: string;
  hypothesis: string;
  failureMechanism: string;
  requiredProperties: string[];
  forbiddenProperties: string[];
  generationStrategy: 'deterministic' | 'llm' | 'hybrid';
  priority: 'high' | 'medium' | 'low';
}

export function buildTestObjectives(
  evidenceList: AnalysisEvidence[],
  contract: ProblemContract
): TestObjective[] {
  const objectives: TestObjective[] = [];

  for (let i = 0; i < evidenceList.length; i++) {
    const ev = evidenceList[i];
    const objId = `OBJ-${ev.id || i + 1}`;

    switch (ev.detector) {
      case 'BINARY_SEARCH_TERMINATION_RULE':
        objectives.push({
          id: objId,
          evidenceId: ev.id,
          category: ev.category,
          detector: ev.detector,
          objective: 'Target must occupy the final searchable position to falsify strict loop termination.',
          hypothesis: ev.hypothesis,
          failureMechanism: 'Loop condition while(left < right) terminates when left == right, omitting inspection of the last remaining candidate index.',
          requiredProperties: ['target_at_last_index', 'target_at_first_index', 'sorted_array'],
          forbiddenProperties: ['empty_array'],
          generationStrategy: 'hybrid',
          priority: 'high',
        });
        break;

      case 'IN_PLACE_MUTATION_INDEX_RULE':
        objectives.push({
          id: objId,
          evidenceId: ev.id,
          category: ev.category,
          detector: ev.detector,
          objective: 'Construct consecutive matching target elements to falsify in-place index advancement without decrement.',
          hypothesis: ev.hypothesis,
          failureMechanism: 'Array splicing or in-place shift shifts the adjacent matching element to index i, but index increments to i + 1 skipping evaluation.',
          requiredProperties: ['consecutive_zeroes', 'all_identical', 'consecutive_duplicates'],
          forbiddenProperties: [],
          generationStrategy: 'hybrid',
          priority: 'high',
        });
        break;

      case 'SLIDING_WINDOW_RECOMPUTE_RULE':
        objectives.push({
          id: objId,
          evidenceId: ev.id,
          category: ev.category,
          detector: ev.detector,
          objective: 'Stress sliding window updates with varying k thresholds to falsify window accumulator state transitions.',
          hypothesis: ev.hypothesis,
          failureMechanism: 'Window sum or frequency map fails to properly decrement outgoing left-boundary element.',
          requiredProperties: ['sliding_window_threshold', 'alternating_values'],
          forbiddenProperties: [],
          generationStrategy: 'hybrid',
          priority: 'medium',
        });
        break;

      case 'QUADRATIC_OVER_LARGE_N_RULE':
        objectives.push({
          id: objId,
          evidenceId: ev.id,
          category: ev.category,
          detector: ev.detector,
          objective: 'Construct scaled inputs to verify whether execution exceeds time limits under constraint scale.',
          hypothesis: ev.hypothesis,
          failureMechanism: 'Nested loops iterate over N elements yielding O(N^2) time complexity, which exceeds practical runtime budgets for N >= 10^4.',
          requiredProperties: ['stress_scale_large_n'],
          forbiddenProperties: ['empty_array'],
          generationStrategy: 'deterministic',
          priority: 'high',
        });
        break;

      case 'MAP_KEY_COLLISION_RULE':
        objectives.push({
          id: objId,
          evidenceId: ev.id,
          category: ev.category,
          detector: ev.detector,
          objective: 'Provide duplicate values with identical keys to falsify map overwrite assumptions.',
          hypothesis: ev.hypothesis,
          failureMechanism: 'Map stores single key entry, overwriting earlier index occurrences required for pairs.',
          requiredProperties: ['duplicate_keys', 'identical_pairs'],
          forbiddenProperties: [],
          generationStrategy: 'hybrid',
          priority: 'high',
        });
        break;

      case 'INTEGER_OVERFLOW_RULE':
        objectives.push({
          id: objId,
          evidenceId: ev.id,
          category: ev.category,
          detector: ev.detector,
          objective: 'Construct inputs near MAX_SAFE_INTEGER bounds to test midpoint overflow.',
          hypothesis: ev.hypothesis,
          failureMechanism: 'Direct addition (left + right) overflows 32-bit integer boundary in typed runtimes.',
          requiredProperties: ['max_constraint_values'],
          forbiddenProperties: [],
          generationStrategy: 'deterministic',
          priority: 'low',
        });
        break;

      case 'EMPTY_INPUT_GUARD_RULE':
      case 'SINGLE_ELEMENT_INDEX_RULE':
      default:
        objectives.push({
          id: objId,
          evidenceId: ev.id,
          category: ev.category,
          detector: ev.detector,
          objective: 'Test minimum valid boundary configurations to falsify index access assumptions.',
          hypothesis: ev.hypothesis,
          failureMechanism: 'Direct index access nums[0] or nums[1] fails when input collection is empty or has a single element.',
          requiredProperties: ['single_element', 'empty_array', 'minimum_bounds'],
          forbiddenProperties: [],
          generationStrategy: 'deterministic',
          priority: 'medium',
        });
        break;
    }
  }

  // If no static evidence was triggered, build baseline exploratory objectives
  if (objectives.length === 0) {
    objectives.push({
      id: 'OBJ-BASELINE-1',
      evidenceId: 'BASELINE-BOUNDARY',
      category: 'boundary',
      detector: 'BOUNDARY_EXPLORATION',
      objective: 'Evaluate minimum and boundary configurations under contract constraints.',
      hypothesis: 'Boundary and single-element inputs may cause unhandled branch behavior.',
      failureMechanism: 'Edge condition edge-cases in index initialization.',
      requiredProperties: ['minimum_bounds', 'single_element'],
      forbiddenProperties: [],
      generationStrategy: 'deterministic',
      priority: 'medium',
    });
    objectives.push({
      id: 'OBJ-BASELINE-2',
      evidenceId: 'BASELINE-DUPLICATE',
      category: 'data_structure',
      detector: 'DUPLICATE_EXPLORATION',
      objective: 'Evaluate duplicate and repeated elements under contract constraints.',
      hypothesis: 'Duplicate elements may cause unexpected state transitions.',
      failureMechanism: 'State collision on identical elements.',
      requiredProperties: ['all_identical', 'consecutive_duplicates'],
      forbiddenProperties: [],
      generationStrategy: 'deterministic',
      priority: 'medium',
    });
  }

  return objectives;
}
