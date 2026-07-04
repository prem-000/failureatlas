// src/lib/interceptor/types.ts
// Re-exports shared interceptor types from the main types module.
// Also defines internal types used only within the interceptor pipeline.

export type {
  InterceptorRequest,
  InterceptorResponse,
  InterceptorMetrics,
  InterceptorEvent,
} from '@/types';

/**
 * Normalized, validated interceptor event — produced by the collector.
 * All fields that the pipeline relies on are guaranteed non-null here.
 */
export interface NormalizedInterceptorEvent {
  // Submission identity
  submissionId: string | null;   // LeetCode submission_id from response body (preferred)
  submissionHash: string | null; // SHA-256 fallback key

  // Request
  requestMethod: string;
  requestUrl: string;
  requestHeaders: Record<string, string>;
  requestBody: Record<string, unknown>;
  requestSize: number | null;
  requestTimestamp: Date;

  // Response
  responseStatusCode: number;
  responseHeaders: Record<string, string>;
  responseBody: Record<string, unknown>;
  responseSize: number | null;
  responseTimestamp: Date;

  // Parsed verdicts (from response body)
  verdict: string | null;
  runtime: number | null;         // ms
  memory: number | null;          // MB
  totalTestcases: number | null;
  passedTestcases: number | null;
  failedTestcase: string | null;
  serverProcessingMs: number | null;

  // Computed metrics
  latencyMs: number | null;
  retryCount: number;
  pollingFrequency: number | null;
}

/**
 * Result from the merger — tells the API route what action was taken.
 */
export type MergeAction = 'enriched' | 'created_stub';

export interface MergeResult {
  submissionId: string;
  action: MergeAction;
}
