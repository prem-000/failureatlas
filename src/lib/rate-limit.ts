import { redis } from './redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Basic Redis-based rate limiter using INCR and EXPIRE.
 * Defaults to failing open if Redis is unavailable or offline.
 * 
 * @param identifier Unique identifier for the client (e.g. userId or IP)
 * @param limit Max number of requests allowed in the window
 * @param windowSeconds Time window in seconds
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!redis) {
    return { success: true, limit, remaining: limit, reset: 0 };
  }

  const rateKey = `v1:ratelimit:${identifier}`;
  try {
    const current = await redis.incr(rateKey);
    if (current === 1) {
      await redis.expire(rateKey, windowSeconds);
    }

    const ttl = await redis.ttl(rateKey);
    const remaining = Math.max(0, limit - current);
    const success = current <= limit;

    return {
      success,
      limit,
      remaining,
      reset: ttl > 0 ? ttl : windowSeconds,
    };
  } catch (error) {
    console.warn(`[Redis Rate Limit] Error checking rate limit for ${identifier}, failing open:`, error);
    return { success: true, limit, remaining: limit, reset: 0 }; // Fail-open
  }
}
