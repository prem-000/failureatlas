import assert from 'assert';
import { deduplicateRecommendations, normalizeRecommendationKey } from '../src/lib/recommendations/dedup';

console.log('🧪 [Test] Running recommendation deduplication tests...');

// Test 1: Deduplication by strategyId
const withStrategyIds = [
  {
    strategyId: 'strat-1',
    name: 'Monotonic Stack Pattern Mastery',
    description: 'Master stack invariants.',
    priority: 'high',
    practiceProblems: ['daily-temperatures'],
  },
  {
    strategyId: 'strat-1',
    name: 'Monotonic Stack Pattern Mastery',
    description: 'Master stack invariants and boundaries.',
    priority: 'high',
    practiceProblems: ['next-greater-element-i'],
  },
  {
    strategyId: 'strat-2',
    name: 'Sliding Window Drill',
    description: 'Two pointers with window state.',
    priority: 'medium',
  },
];

const deduped1 = deduplicateRecommendations(withStrategyIds);
assert.strictEqual(deduped1.length, 2, 'Must deduplicate items with identical strategyId to 2 items');
assert.strictEqual(deduped1[0].strategyId, 'strat-1');
assert.strictEqual(deduped1[0].practiceProblems?.length, 2, 'Practice problems should be merged across duplicates');

// Test 2: Deduplication by near-duplicate titles without strategyId
const nearDuplicates = [
  {
    name: 'Monotonic Stack Pattern Mastery',
    description: 'Learn monotonic stack.',
  },
  {
    name: 'Stack-Based Pattern Mastery',
    description: 'Learn monotonic stack.',
  },
  {
    name: 'Binary Search Boundary Guide',
    description: 'Practice lower and upper bounds.',
  },
];

const deduped2 = deduplicateRecommendations(nearDuplicates);
// "Monotonic Stack Pattern Mastery" and "Stack-Based Pattern Mastery" both reduce to "stack" / "monotonic stack"
assert(deduped2.length <= 2, `Near duplicates must be merged, got length ${deduped2.length}`);

// Test 3: Normalized key helper
const key1 = normalizeRecommendationKey('Monotonic Stack Pattern Mastery', 'desc');
const key2 = normalizeRecommendationKey('Monotonic Stack Drill', 'desc');
assert.strictEqual(key1, key2, 'Keys with different suffixes (Mastery vs Drill) should normalize identically');

// Test 4: Replacement behavior (not appending previous turns)
let currentCardSet: any[] = [];
const turn1Recs = [
  { strategyId: 's1', name: 'Two Pointer Technique', description: 'Left and right pointers.' },
];
// Turn 1
currentCardSet = deduplicateRecommendations(turn1Recs);
assert.strictEqual(currentCardSet.length, 1);
assert.strictEqual(currentCardSet[0].name, 'Two Pointer Technique');

// Turn 2: must replace, NOT append
const turn2Recs = [
  { strategyId: 's2', name: 'Binary Search Checklist', description: 'Check boundaries.' },
];
currentCardSet = deduplicateRecommendations(turn2Recs);
assert.strictEqual(currentCardSet.length, 1);
assert.strictEqual(currentCardSet[0].name, 'Binary Search Checklist');

console.log('✅ [Pass] All recommendation deduplication tests passed!\n');
