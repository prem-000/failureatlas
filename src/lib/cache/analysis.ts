import { safeRedisGet, safeRedisSet, safeRedisDel } from '../redis';

const ANALYSIS_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Retrieves the compiled analysis payload from Redis
 */
export async function getAnalysisCache(fingerprint: string): Promise<any | null> {
  return safeRedisGet<any>(`v1:analysis:${fingerprint}`);
}

/**
 * Stores the compiled analysis payload in Redis
 */
export async function setAnalysisCache(fingerprint: string, data: any): Promise<void> {
  await safeRedisSet(`v1:analysis:${fingerprint}`, data, ANALYSIS_TTL);
}

/**
 * Deletes the analysis cache for the given fingerprint
 */
export async function delAnalysisCache(fingerprint: string): Promise<void> {
  await safeRedisDel(`v1:analysis:${fingerprint}`);
}
