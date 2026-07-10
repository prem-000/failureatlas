import { redis } from './redis';

/**
 * Acquires a distributed lock using Redis SETNX (SET with NX and PX options)
 * @param key The key to lock on
 * @param ttlMs Time-to-live for the lock in milliseconds (defaults to 30 seconds)
 * @returns boolean True if lock was acquired or if Redis is offline (fail-open), false if lock is already held
 */
export async function acquireLock(key: string, ttlMs: number = 30000): Promise<boolean> {
  if (!redis) return true; // Fail-open if Redis is disabled or offline
  const lockKey = `v1:lock:${key}`;
  try {
    const res = await redis.set(lockKey, 'locked', { nx: true, px: ttlMs });
    return res === 'OK';
  } catch (error) {
    console.warn(`[Redis Lock] Failed to acquire lock for key ${key}, failing open:`, error);
    return true; // Fail-open
  }
}

/**
 * Releases the lock by deleting the key from Redis
 * @param key The key to release the lock for
 */
export async function releaseLock(key: string): Promise<void> {
  if (!redis) return;
  const lockKey = `v1:lock:${key}`;
  try {
    await redis.del(lockKey);
  } catch (error) {
    console.warn(`[Redis Lock] Failed to release lock for key ${key}:`, error);
  }
}
