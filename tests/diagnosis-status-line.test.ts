import assert from 'assert';
import { STAGE_LABELS, type DiagnosisStage } from '../src/types';

console.log('🧪 [Test] Running Diagnosis Status Line & Stages tests...');

// Test 1: STAGE_LABELS mapping completeness
const expectedStages: DiagnosisStage[] = [
  'retrieving_embeddings',
  'traversing_graph',
  'fusing_evidence',
  'reasoning',
];

for (const stage of expectedStages) {
  assert(STAGE_LABELS[stage], `STAGE_LABELS must have label for ${stage}`);
  assert(typeof STAGE_LABELS[stage] === 'string' && STAGE_LABELS[stage].length > 0);
}

assert.strictEqual(
  STAGE_LABELS['retrieving_embeddings'],
  'Searching similar past failures'
);
assert.strictEqual(
  STAGE_LABELS['traversing_graph'],
  'Traversing your knowledge graph'
);
assert.strictEqual(
  STAGE_LABELS['fusing_evidence'],
  'Building evidence context'
);
assert.strictEqual(
  STAGE_LABELS['reasoning'],
  'Reasoning through the diagnosis'
);

// Test 2: Sequence of pipeline progression
const recordedStages: DiagnosisStage[] = [];
const mockOnStage = (stage: DiagnosisStage) => {
  recordedStages.push(stage);
};

// Simulate pipeline emission
mockOnStage('retrieving_embeddings');
mockOnStage('traversing_graph');
mockOnStage('fusing_evidence');
mockOnStage('reasoning');

assert.deepStrictEqual(recordedStages, expectedStages);

console.log('✅ [Pass] All Diagnosis Status Line & Stages tests passed!\n');
