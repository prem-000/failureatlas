// src/lib/interceptor/collector.ts
// Validates and normalises a raw interceptor event payload.
// Called at the entry point of POST /api/interceptor/event before anything
// is persisted. Returns a NormalizedInterceptorEvent or throws a validation error.

import type { InterceptorEvent } from './types';
import type { NormalizedInterceptorEvent } from './types';
import { extractNetworkFields } from './parser';
import { computeMetrics } from './extractor';

export interface CollectorValidationError {
  field: string;
  message: string;
}

/**
 * Validates the raw payload coming from the API route body.
 * Returns an array of validation errors (empty = valid).
 */
export function validateInterceptorEvent(raw: any): CollectorValidationError[] {
  const errors: CollectorValidationError[] = [];

  if (!raw || typeof raw !== 'object') {
    errors.push({ field: 'root', message: 'Request body must be an object' });
    return errors;
  }

  // Require a request object
  if (!raw.request || typeof raw.request !== 'object') {
    errors.push({ field: 'request', message: 'Missing required field: request' });
  } else {
    if (!raw.request.url) errors.push({ field: 'request.url', message: 'request.url is required' });
    if (!raw.request.method) errors.push({ field: 'request.method', message: 'request.method is required' });
    if (!raw.request.timestamp) errors.push({ field: 'request.timestamp', message: 'request.timestamp (epoch ms) is required' });
  }

  // Require a response object
  if (!raw.response || typeof raw.response !== 'object') {
    errors.push({ field: 'response', message: 'Missing required field: response' });
  } else {
    if (raw.response.statusCode == null) {
      errors.push({ field: 'response.statusCode', message: 'response.statusCode is required' });
    }
    if (!raw.response.timestamp) errors.push({ field: 'response.timestamp', message: 'response.timestamp (epoch ms) is required' });
  }

  return errors;
}

/**
 * Builds a NormalizedInterceptorEvent from a validated raw payload.
 * Applies safe defaults and runs the parser + extractor.
 */
export function collectInterceptorEvent(raw: InterceptorEvent): NormalizedInterceptorEvent {
  const req = raw.request;
  const res = raw.response;
  const metrics = raw.metrics ?? {};

  const requestTimestamp  = new Date(req.timestamp);
  const responseTimestamp = new Date(res.timestamp);

  // Parse LeetCode-specific fields from the response body
  const parsed = extractNetworkFields(req, res);

  // Compute derived metrics
  const computed = computeMetrics(requestTimestamp, responseTimestamp, metrics);

  return {
    // Identity keys
    submissionId:  raw.submissionId  ?? parsed.submissionId  ?? null,
    submissionHash: raw.submissionHash ?? null,

    // Request
    requestMethod:    req.method?.toUpperCase() ?? 'POST',
    requestUrl:       req.url ?? '',
    requestHeaders:   (req.headers as Record<string, string>) ?? {},
    requestBody:      (req.body as Record<string, unknown>) ?? {},
    requestSize:      req.size ?? null,
    requestTimestamp,

    // Response
    responseStatusCode: res.statusCode ?? 200,
    responseHeaders:    (res.headers as Record<string, string>) ?? {},
    responseBody:       (res.body as Record<string, unknown>) ?? {},
    responseSize:       res.size ?? null,
    responseTimestamp,

    // Parsed verdict fields
    verdict:           parsed.verdict,
    runtime:           parsed.runtime ?? null,
    memory:            parsed.memory ?? null,
    totalTestcases:    parsed.totalTestcases ?? null,
    passedTestcases:   parsed.passedTestcases ?? null,
    failedTestcase:    parsed.failedTestcase ?? null,
    serverProcessingMs: parsed.serverProcessingMs ?? null,

    // Computed metrics
    latencyMs:        computed.latencyMs,
    retryCount:       metrics.retryCount ?? 0,
    pollingFrequency: computed.pollingFrequency,
  };
}
