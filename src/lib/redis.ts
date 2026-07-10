import { Redis } from '@upstash/redis';
import { logger } from './logger';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize singleton client, server-side only
let redisInstance: Redis | null = null;

if (typeof window === 'undefined') {
  if (url && token) {
    redisInstance = new Redis({
      url,
      token,
    });
  } else {
    logger.warn('[Redis] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. Redis caching is disabled.');
  }
}

export const redis = redisInstance;

/**
 * Parses the cache type from a structured key (e.g. "v1:analysis:abc" -> "analysis")
 */
function getCacheType(key: string): string {
  const parts = key.split(':');
  return parts[1] || 'generic';
}

/**
 * Increments cache metrics directly in Redis to avoid circular dependency
 */
async function trackMetric(key: string, operation: 'hit' | 'miss' | 'set' | 'del'): Promise<void> {
  if (!redisInstance) return;
  const type = getCacheType(key);
  try {
    await redisInstance.incr(`v1:metrics:${type}:${operation}`);
  } catch (err) {
    // Fail-silent for telemetry
  }
}

/**
 * Safely fetches a value from Redis. Fallback to null on failure.
 */
export async function safeRedisGet<T>(key: string): Promise<T | null> {
  if (!redisInstance) return null;
  const startTime = performance.now();
  try {
    const value = await redisInstance.get<T>(key);
    const duration = Math.round(performance.now() - startTime);
    if (value !== null) {
      console.log(`[Redis] HIT ${key} (${duration}ms)`);
      // Run metrics asynchronously
      trackMetric(key, 'hit');
      return value;
    }
    console.log(`[Redis] MISS ${key} (${duration}ms)`);
    trackMetric(key, 'miss');
    return null;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.warn(`[Redis] GET error for key ${key} (${duration}ms):`, { error });
    return null;
  }
}

/**
 * Safely writes a value to Redis. Fallback to continue on failure.
 */
export async function safeRedisSet(key: string, value: any, ttlSeconds?: number): Promise<void> {
  if (!redisInstance) return;
  const startTime = performance.now();
  try {
    if (ttlSeconds !== undefined) {
      await redisInstance.set(key, value, { ex: ttlSeconds });
    } else {
      await redisInstance.set(key, value);
    }
    const duration = Math.round(performance.now() - startTime);
    console.log(`[Redis] SET ${key} (${duration}ms)`);
    trackMetric(key, 'set');
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.warn(`[Redis] SET error for key ${key} (${duration}ms):`, { error });
  }
}

/**
 * Safely deletes a key from Redis. Fallback to continue on failure.
 */
export async function safeRedisDel(key: string): Promise<void> {
  if (!redisInstance) return;
  const startTime = performance.now();
  try {
    await redisInstance.del(key);
    const duration = Math.round(performance.now() - startTime);
    console.log(`[Redis] DEL ${key} (${duration}ms)`);
    trackMetric(key, 'del');
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.warn(`[Redis] DEL error for key ${key} (${duration}ms):`, { error });
  }
}
