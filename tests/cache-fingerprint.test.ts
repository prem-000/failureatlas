import assert from 'assert';
import {
  createDiagnosisCacheKey,
  normalizeDiff,
  isNonCacheableQuery,
  cacheTelemetry,
} from '../src/lib/cache/redis';

console.log('🧪 [Test] Running Upstash Redis cache & fingerprint tests...');

// Test 1: Deterministic key generation
const key1 = createDiagnosisCacheKey({
  problemSlug: 'two-sum',
  submissionStatus: 'Wrong Answer',
  codeDiffFingerprint: 'def twoSum(nums, target):\n    return [0, 1]',
  failedTestCase: '[3,2,4], 6',
});

const key2 = createDiagnosisCacheKey({
  problemSlug: 'two-sum',
  submissionStatus: 'Wrong Answer',
  codeDiffFingerprint: 'def twoSum(nums, target):\n    return [0, 1]',
  failedTestCase: '[3,2,4], 6',
});

assert.strictEqual(key1, key2, 'Identical submission params must produce identical SHA-256 keys');
assert(key1.startsWith('diagnosis:'), 'Key must start with diagnosis: prefix');
assert.strictEqual(key1.length, 'diagnosis:'.length + 64, 'Key must contain a 64-char SHA-256 hex digest');

// Test 2: Whitespace normalization in diff
// Trivial formatting changes (trailing spaces, extra indentation) should produce the identical key
const diffOriginal = 'line1\n  line2  \n\nline3\n';
const diffWithExtraSpaces = 'line1\nline2\nline3';

const normalized1 = normalizeDiff(diffOriginal);
const normalized2 = normalizeDiff(diffWithExtraSpaces);
assert.strictEqual(normalized1, normalized2, 'Whitespace normalization must match');

const keyWithSpaces = createDiagnosisCacheKey({
  problemSlug: 'two-sum',
  submissionStatus: 'Wrong Answer',
  codeDiffFingerprint: diffOriginal,
  failedTestCase: 'test1',
});

const keyClean = createDiagnosisCacheKey({
  problemSlug: 'two-sum',
  submissionStatus: 'Wrong Answer',
  codeDiffFingerprint: diffWithExtraSpaces,
  failedTestCase: 'test1',
});

assert.strictEqual(
  keyWithSpaces,
  keyClean,
  'Trivial whitespace formatting changes must NOT bust the cache key'
);

// Semantic changes (different code) MUST produce different key
const keySemanticDiff = createDiagnosisCacheKey({
  problemSlug: 'two-sum',
  submissionStatus: 'Wrong Answer',
  codeDiffFingerprint: 'def twoSum(nums, target):\n    return []',
  failedTestCase: 'test1',
});

assert.notStrictEqual(
  keyClean,
  keySemanticDiff,
  'Semantic code changes MUST produce a different cache key'
);

// Different status or failed test case MUST produce different key
const keyDifferentStatus = createDiagnosisCacheKey({
  problemSlug: 'two-sum',
  submissionStatus: 'Time Limit Exceeded',
  codeDiffFingerprint: diffClean(diffOriginal),
  failedTestCase: 'test1',
});
assert.notStrictEqual(keyClean, keyDifferentStatus, 'Different status must produce different key');

function diffClean(s: string) { return s; }

// Test 3: Time-sensitive and conversational Q&A queries bypass caching
assert.strictEqual(isNonCacheableQuery('What were my recent failures?'), true);
assert.strictEqual(isNonCacheableQuery('Analyze my last 5 attempts'), true);
assert.strictEqual(isNonCacheableQuery('Tell me about my failure history'), true);
assert.strictEqual(isNonCacheableQuery('Why did this fail? Can you explain the loop?'), true);
assert.strictEqual(isNonCacheableQuery(''), false, 'Standard empty query (submission diagnosis) should be cacheable');
assert.strictEqual(isNonCacheableQuery(undefined), false, 'Undefined query should be cacheable');

// Test 4: Telemetry counters
const initialMisses = cacheTelemetry.misses;
assert(typeof initialMisses === 'number', 'Telemetry misses must be tracked');

console.log('✅ [Pass] All Upstash Redis cache & fingerprint tests passed!\n');
