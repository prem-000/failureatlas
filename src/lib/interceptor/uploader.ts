// src/lib/interceptor/uploader.ts
// Persists a NetworkEvidence row for a given submission.
//
// Uses UPSERT semantics (by submissionId) so it is safe to call multiple times
// for the same submission — only one NetworkEvidence row will ever exist.

import { prisma } from '@/lib/db/prisma';
import type { NormalizedInterceptorEvent } from './types';

/**
 * Upserts a NetworkEvidence row for the given submissionId.
 * Subsequent calls for the same submission update the existing row rather than
 * creating a duplicate — this handles the case where the check/ polling endpoint
 * fires multiple times before the final verdict arrives.
 *
 * @param submissionId  The internal FailureAtlas SubmissionEvent.id
 * @param event         Normalized interceptor event
 */
export async function upsertNetworkEvidence(
  submissionId: string,
  event: NormalizedInterceptorEvent
): Promise<void> {
  await prisma.networkEvidence.upsert({
    where: { submissionId },
    update: {
      // Always update with the latest data — later poll responses contain the
      // final verdict, so we want to overwrite earlier partial data.
      requestMethod:      event.requestMethod,
      requestUrl:         event.requestUrl,
      requestHeaders:     event.requestHeaders as any,
      requestBody:        event.requestBody    as any,
      requestSize:        event.requestSize,
      requestTimestamp:   event.requestTimestamp,
      responseStatusCode: event.responseStatusCode,
      responseHeaders:    event.responseHeaders as any,
      responseBody:       event.responseBody    as any,
      responseSize:       event.responseSize,
      responseTimestamp:  event.responseTimestamp,
      verdict:            event.verdict,
      runtime:            event.runtime,
      memory:             event.memory,
      totalTestcases:     event.totalTestcases,
      passedTestcases:    event.passedTestcases,
      failedTestcase:     event.failedTestcase,
      serverProcessingMs: event.serverProcessingMs,
      latencyMs:          event.latencyMs != null ? Math.round(event.latencyMs) : null,
      retryCount:         event.retryCount,
      pollingFrequency:   event.pollingFrequency,
      updatedAt:          new Date(),
    },
    create: {
      submissionId,
      requestMethod:      event.requestMethod,
      requestUrl:         event.requestUrl,
      requestHeaders:     event.requestHeaders as any,
      requestBody:        event.requestBody    as any,
      requestSize:        event.requestSize,
      requestTimestamp:   event.requestTimestamp,
      responseStatusCode: event.responseStatusCode,
      responseHeaders:    event.responseHeaders as any,
      responseBody:       event.responseBody    as any,
      responseSize:       event.responseSize,
      responseTimestamp:  event.responseTimestamp,
      verdict:            event.verdict,
      runtime:            event.runtime,
      memory:             event.memory,
      totalTestcases:     event.totalTestcases,
      passedTestcases:    event.passedTestcases,
      failedTestcase:     event.failedTestcase,
      serverProcessingMs: event.serverProcessingMs,
      latencyMs:          event.latencyMs != null ? Math.round(event.latencyMs) : null,
      retryCount:         event.retryCount,
      pollingFrequency:   event.pollingFrequency,
    },
  });

  console.log(`[Uploader] NetworkEvidence upserted for submission ${submissionId}`);
}

/**
 * Upserts a BehaviorEvidence row — called when the Chrome Extension sends
 * typed behavioral signals alongside the submission event.
 * Kept here for symmetry; the extension route may call this directly in future.
 */
export async function upsertBehaviorEvidence(
  submissionId: string,
  data: {
    typingTime?:      number;
    editorEvents?:    number;
    tabSwitches?:     number;
    focusLoss?:       number;
    sessionDuration?: number;
    rawData?:         Record<string, unknown>;
  }
): Promise<void> {
  await prisma.behaviorEvidence.upsert({
    where:  { submissionId },
    update: { ...data, rawData: data.rawData as any ?? {} },
    create: {
      submissionId,
      typingTime:      data.typingTime,
      editorEvents:    data.editorEvents,
      tabSwitches:     data.tabSwitches,
      focusLoss:       data.focusLoss,
      sessionDuration: data.sessionDuration,
      rawData:         data.rawData as any ?? {},
    },
  });
}

/**
 * Upserts a CodeEvidence row — called after Myers Diff is run on the submission.
 */
export async function upsertCodeEvidence(
  submissionId: string,
  data: {
    previousCode?: string;
    currentCode?:  string;
    diff?:         string;
    changedLines?: number;
    confidence?:   number;
  }
): Promise<void> {
  await prisma.codeEvidence.upsert({
    where:  { submissionId },
    update: data,
    create: { submissionId, ...data },
  });
}
