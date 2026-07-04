// src/lib/interceptor/extractor.ts
// Computes derived metrics from raw timestamps and the interceptor metrics object.
// Called by the collector after parsing to fill latency, polling frequency, etc.

import type { InterceptorMetrics } from './types';

export interface ComputedMetrics {
  latencyMs: number | null;
  pollingFrequency: number | null; // polls per second (if applicable)
}

/**
 * Derives latency and polling frequency from timestamps.
 *
 * @param requestTimestamp  When the request was sent
 * @param responseTimestamp When the response was received
 * @param metrics           Raw metrics object from the interceptor payload
 */
export function computeMetrics(
  requestTimestamp: Date,
  responseTimestamp: Date,
  metrics: InterceptorMetrics
): ComputedMetrics {
  // ── Latency ───────────────────────────────────────────────────────────────────
  // Use explicit value from metrics if provided; otherwise compute from timestamps.
  let latencyMs: number | null = metrics.latencyMs ?? null;
  if (latencyMs == null) {
    const diff = responseTimestamp.getTime() - requestTimestamp.getTime();
    latencyMs = diff >= 0 ? diff : null;
  }

  // ── Polling frequency ─────────────────────────────────────────────────────────
  // pollingFrequency = retryCount / (latency in seconds)
  // Only meaningful when retryCount > 0 and latency is known.
  let pollingFrequency: number | null = metrics.pollingFrequency ?? null;
  if (pollingFrequency == null && (metrics.retryCount ?? 0) > 0 && latencyMs != null && latencyMs > 0) {
    const latencySec = latencyMs / 1000;
    pollingFrequency = (metrics.retryCount!) / latencySec;
  }

  return { latencyMs, pollingFrequency };
}

/**
 * Classifies the submission round-trip pattern based on computed metrics.
 * Used as a diagnostic signal in the Bayesian engine.
 */
export function classifyLatency(latencyMs: number | null): 'low' | 'medium' | 'high' | 'unknown' {
  if (latencyMs == null) return 'unknown';
  if (latencyMs < 500)   return 'low';
  if (latencyMs < 2000)  return 'medium';
  return 'high';
}

/**
 * Returns true if the network evidence indicates abnormally high latency (> 2s).
 * This is used as a boolean Bayesian evidence flag.
 */
export function isHighLatency(latencyMs: number | null): boolean {
  return latencyMs != null && latencyMs > 2000;
}
