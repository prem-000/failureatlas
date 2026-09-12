import assert from 'assert';
import { clampScore, DEFAULT_RAG_ALPHA } from '../src/lib/rag/retrieval';

console.log('🧪 [Test] Running RAG retrieval score clamp tests...');

// Test 1: clampScore must clamp scores > 1.0 to exactly 1.0
assert.strictEqual(clampScore(1.2), 1.0, 'Score 1.2 must be clamped to 1.0');
assert.strictEqual(clampScore(1.16), 1.0, 'Observed 116% must be clamped to 1.0');
assert.strictEqual(clampScore(1.08), 1.0, 'Observed 108% must be clamped to 1.0');
assert.strictEqual(clampScore(1.05), 1.0, 'Observed 105% must be clamped to 1.0');
assert.strictEqual(clampScore(1.0), 1.0, 'Score 1.0 must remain 1.0');
assert.strictEqual(clampScore(0.85), 0.85, 'Score 0.85 must remain 0.85');
assert.strictEqual(clampScore(0.0), 0.0, 'Score 0.0 must remain 0.0');
assert.strictEqual(clampScore(-0.1), 0.0, 'Score below 0 must be clamped to 0.0');

// Test 2: Simulate hybrid fusion with dual-presence 1.2x bonus
const testCases = [
  { sScore: 1.0, gScore: 1.0, alpha: 0.45 },
  { sScore: 0.95, gScore: 0.95, alpha: 0.45 },
  { sScore: 0.90, gScore: 0.90, alpha: 0.45 },
  { sScore: 0.88, gScore: 0.92, alpha: 0.45 },
  { sScore: 0.70, gScore: 0.60, alpha: 0.45 },
];

for (const { sScore, gScore, alpha } of testCases) {
  let hybridScore = alpha * sScore + (1 - alpha) * gScore;
  // Apply 20% bonus
  hybridScore *= 1.2;
  const clamped = clampScore(hybridScore);
  assert(clamped <= 1.0, `Clamped score ${clamped} must be <= 1.0 (raw was ${hybridScore})`);
  assert(clamped >= 0.0, `Clamped score ${clamped} must be >= 0.0`);
}

// Test 3: Verify alpha default is between 0.4 and 0.5
assert(
  DEFAULT_RAG_ALPHA >= 0.4 && DEFAULT_RAG_ALPHA <= 0.5,
  `DEFAULT_RAG_ALPHA must default to 0.4–0.5, got: ${DEFAULT_RAG_ALPHA}`
);

console.log('✅ [Pass] All RAG retrieval score clamp tests passed!\n');
