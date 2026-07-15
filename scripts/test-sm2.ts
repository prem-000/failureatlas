import { updateSM2, SM2State } from '../src/lib/practice-queue/sm2';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

function runTests() {
  console.log('Running SM-2 Spaced Repetition Engine tests...');
  
  let state: SM2State = {
    repetitions: 0,
    easeFactor: 2.5,
    interval: 1
  };
  const today = new Date('2026-07-15T00:00:00Z');

  // Review 1: Quality 4 (Solved after thinking)
  console.log('\n--- Review 1: Quality 4 ---');
  let result = updateSM2(state, 4, today);
  console.log(result);
  assert(result.repetitions === 1, 'Repetitions should be 1');
  assert(result.easeFactor === 2.5, 'Ease Factor should remain 2.5');
  assert(result.interval === 1, 'Interval should be 1 day');
  
  // Review 2: Quality 5 (Solved independently)
  console.log('\n--- Review 2: Quality 5 ---');
  state = { repetitions: result.repetitions, easeFactor: result.easeFactor, interval: result.interval };
  result = updateSM2(state, 5, today);
  console.log(result);
  assert(result.repetitions === 2, 'Repetitions should be 2');
  assert(result.easeFactor === 2.6, 'Ease Factor should be 2.6');
  assert(result.interval === 6, 'Interval should be 6 days');

  // Review 3: Quality 3 (Solved with difficulty)
  console.log('\n--- Review 3: Quality 3 ---');
  state = { repetitions: result.repetitions, easeFactor: result.easeFactor, interval: result.interval };
  result = updateSM2(state, 3, today);
  console.log(result);
  assert(result.repetitions === 3, 'Repetitions should be 3');
  assert(Math.abs(result.easeFactor - 2.46) < 1e-9, 'Ease Factor should decrease to 2.46');
  assert(result.interval === 15, 'Interval should be round(6 * 2.46) = 15 days');

  // Review 4: Quality 2 (Needed Editorial - Failure!)
  console.log('\n--- Review 4: Quality 2 (Failure) ---');
  state = { repetitions: result.repetitions, easeFactor: result.easeFactor, interval: result.interval };
  result = updateSM2(state, 2, today);
  console.log(result);
  assert(result.repetitions === 0, 'Repetitions should reset to 0');
  assert(Math.abs(result.easeFactor - 2.14) < 1e-9, 'Ease Factor should decrease to 2.14 (recalculated, not frozen!)');
  assert(result.interval === 1, 'Interval should reset to 1 day');

  // Review 5: Quality 5 (Solved independently)
  console.log('\n--- Review 5: Quality 5 ---');
  state = { repetitions: result.repetitions, easeFactor: result.easeFactor, interval: result.interval };
  result = updateSM2(state, 5, today);
  console.log(result);
  assert(result.repetitions === 1, 'Repetitions should increment to 1');
  assert(Math.abs(result.easeFactor - 2.24) < 1e-9, 'Ease Factor should increase to 2.24');
  assert(result.interval === 1, 'Interval should be 1 day (since repetitions === 1)');

  console.log('\nAll SM-2 algorithm tests completed successfully!');
}

try {
  runTests();
} catch (e: any) {
  console.error('\n❌ Test failed:', e.message);
  process.exit(1);
}
