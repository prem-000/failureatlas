import { redis } from './redis';

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRatio: number;
}

/**
 * Tracks a cache operation metric in Redis (e.g. hit, miss, set, del)
 */
export async function trackCacheMetric(
  type: string,
  operation: 'hit' | 'miss' | 'set' | 'del'
): Promise<void> {
  if (!redis) return;
  const key = `v1:metrics:${type}:${operation}`;
  try {
    await redis.incr(key);
  } catch (err) {
    // Fail silently
  }
}

/**
 * Retrieves cache statistics and calculates hit ratio for a specific cache type
 */
export async function getCacheMetrics(type: string): Promise<CacheMetrics> {
  if (!redis) {
    return { hits: 0, misses: 0, sets: 0, deletes: 0, hitRatio: 0 };
  }

  try {
    const [hitsStr, missesStr, setsStr, deletesStr] = await Promise.all([
      redis.get<string>(`v1:metrics:${type}:hit`),
      redis.get<string>(`v1:metrics:${type}:miss`),
      redis.get<string>(`v1:metrics:${type}:set`),
      redis.get<string>(`v1:metrics:${type}:del`),
    ]);

    const hits = parseInt(hitsStr || '0', 10);
    const misses = parseInt(missesStr || '0', 10);
    const sets = parseInt(setsStr || '0', 10);
    const deletes = parseInt(deletesStr || '0', 10);

    const total = hits + misses;
    const hitRatio = total > 0 ? parseFloat((hits / total).toFixed(4)) : 0;

    return {
      hits,
      misses,
      sets,
      deletes,
      hitRatio,
    };
  } catch (error) {
    console.warn(`[Redis Metrics] Failed to get metrics for type ${type}:`, error);
    return { hits: 0, misses: 0, sets: 0, deletes: 0, hitRatio: 0 };
  }
}
