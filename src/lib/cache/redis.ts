import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import type { DiagnosisResult } from '@/types';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// 7 days default TTL in seconds (configurable via DIAGNOSIS_CACHE_TTL_SECONDS)
export const DEFAULT_DIAGNOSIS_CACHE_TTL = Number(
  process.env.DIAGNOSIS_CACHE_TTL_SECONDS || 7 * 24 * 60 * 60
);

// Initialize Upstash Redis client (singleton)
let redisClient: Redis | null = null;
if (typeof window === 'undefined') {
  if (url && token && !url.includes('your-upstash') && !token.includes('your_upstash')) {
    try {
      redisClient = new Redis({ url, token });
    } catch (e) {
      console.warn('[Redis] Failed to initialize Redis client:', e);
    }
  } else {
    console.warn('[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing or placeholder.');
  }
}

export const upstashRedis = redisClient;

// Cache telemetry metrics counter
export const cacheTelemetry = {
  hits: 0,
  misses: 0,
  bypasses: 0,
};

/**
 * Normalizes code diff whitespace so trivial whitespace or line-ending changes
 * don't bust the cache, while semantic code changes do.
 */
export function normalizeDiff(diff: string): string {
  if (!diff) return '';
  return diff
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

export interface DiagnosisCacheKeyParams {
  problemSlug: string;
  submissionStatus: string;
  codeDiffFingerprint: string;
  failedTestCase?: string | null;
}

/**
 * Generates deterministic SHA-256 hash cache key from submission fingerprint
 */
export function createDiagnosisCacheKey(params: DiagnosisCacheKeyParams): string {
  const normalizedDiff = normalizeDiff(params.codeDiffFingerprint || '');
  const rawPayload = JSON.stringify({
    problemSlug: params.problemSlug.trim().toLowerCase(),
    submissionStatus: params.submissionStatus.trim(),
    codeDiffFingerprint: normalizedDiff,
    failedTestCase: (params.failedTestCase || '').trim(),
  });

  const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');
  return `diagnosis:${hash}`;
}

/**
 * Determines whether a query is time-sensitive (e.g. references recent, history, last N)
 * or is conversational chat Q&A, which should NOT be cached.
 */
export function isNonCacheableQuery(userQuery?: string): boolean {
  if (!userQuery) return false;
  const q = userQuery.trim().toLowerCase();
  if (q.length === 0) return false;

  // Patterns referencing time-sensitive user history
  const timeSensitivePatterns = [
    /\brecent\b/,
    /\blast\s+\d+/,
    /\blast\b/,
    /\bhistory\b/,
    /\bpast\b/,
    /\btoday\b/,
    /\bthis\s+week\b/,
    /\bstreak\b/,
  ];

  for (const pattern of timeSensitivePatterns) {
    if (pattern.test(q)) {
      return true;
    }
  }

  // Free-text chat conversational questions
  return true;
}

/**
 * Fetches cached diagnosis result from Upstash Redis
 */
export async function getCachedDiagnosis(key: string): Promise<DiagnosisResult | null> {
  if (!redisClient) {
    cacheTelemetry.misses++;
    return null;
  }

  const startTime = Date.now();
  try {
    const data = await redisClient.get<DiagnosisResult>(key);
    const duration = Date.now() - startTime;
    if (data) {
      cacheTelemetry.hits++;
      console.log(`[DiagnosisCache] HIT key=${key} (${duration}ms) [hits=${cacheTelemetry.hits}, misses=${cacheTelemetry.misses}]`);
      return {
        ...data,
        servedFromCache: true,
      };
    }

    cacheTelemetry.misses++;
    console.log(`[DiagnosisCache] MISS key=${key} (${duration}ms) [hits=${cacheTelemetry.hits}, misses=${cacheTelemetry.misses}]`);
    return null;
  } catch (err: any) {
    cacheTelemetry.misses++;
    console.warn(`[DiagnosisCache] Error reading key=${key}:`, err?.message || err);
    return null;
  }
}

/**
 * Stores structured diagnosis result in Upstash Redis with TTL
 */
export async function setCachedDiagnosis(
  key: string,
  data: DiagnosisResult,
  ttlSeconds: number = DEFAULT_DIAGNOSIS_CACHE_TTL
): Promise<void> {
  if (!redisClient) return;

  const startTime = Date.now();
  try {
    // Strip servedFromCache internal flag before caching
    const { servedFromCache, ...cachePayload } = data as any;
    await redisClient.set(key, cachePayload, { ex: ttlSeconds });
    const duration = Date.now() - startTime;
    console.log(`[DiagnosisCache] SET key=${key} TTL=${ttlSeconds}s (${duration}ms)`);
  } catch (err: any) {
    console.warn(`[DiagnosisCache] Error writing key=${key}:`, err?.message || err);
  }
}
