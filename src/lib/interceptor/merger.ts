// src/lib/interceptor/merger.ts
// Core of the one-submission-one-record guarantee.
//
// Merge strategy (priority order):
//   1. Match by submissionId (eventId on SubmissionEvent)
//   2. Match by submissionHash (SHA-256 fallback)
//   3. Create a minimal SubmissionEvent stub sourced from the interceptor
//
// This module only touches the SubmissionEvent row. Persisting NetworkEvidence
// is handled separately by uploader.ts so each concern stays testable.

import { createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import type { NormalizedInterceptorEvent, MergeResult } from './types';

// ── Submission hash helpers ───────────────────────────────────────────────────

/**
 * Builds a deterministic SHA-256 key from problem slug, language, code, and
 * a 60-second time bucket (floor(timestamp / 60_000)).
 *
 * This is the fallback match key when no submission_id is available.
 */
export function buildSubmissionHash(
  problemSlug: string,
  language: string,
  code: string,
  timestampMs: number
): string {
  const bucket = Math.floor(timestampMs / 60_000);
  const raw    = `${problemSlug}::${language}::${code}::${bucket}`;
  return createHash('sha256').update(raw).digest('hex');
}

// ── Core merge function ───────────────────────────────────────────────────────

/**
 * Finds or creates the SubmissionEvent that this interceptor event belongs to.
 *
 * Rules:
 *   - Never creates a duplicate SubmissionEvent.
 *   - If an existing record is found, updates it with richer data from the
 *     interceptor (runtime, memory, testcase counts, status) and marks source='merged'.
 *   - If no record is found, creates a stub with source='interceptor' so the
 *     analysis pipeline can still run on network-only evidence.
 *
 * @param event    Normalized interceptor event from the collector
 * @param userId   Authenticated user ID (from JWT/API key)
 * @returns        MergeResult indicating the submission ID and action taken
 */
export async function mergeOrCreateSubmission(
  event: NormalizedInterceptorEvent,
  userId: string
): Promise<MergeResult> {
  // ── 1. Try to find by submissionId (extension's eventId = LeetCode submission_id)
  if (event.submissionId) {
    const byEventId = await prisma.submissionEvent.findUnique({
      where: { eventId: event.submissionId },
    });
    if (byEventId) {
      await enrichExistingSubmission(byEventId.id, event);
      return { submissionId: byEventId.id, action: 'enriched' };
    }
  }

  // ── 2. Try to find by submissionHash
  if (event.submissionHash) {
    const byHash = await prisma.submissionEvent.findUnique({
      where: { submissionHash: event.submissionHash },
    });
    if (byHash) {
      await enrichExistingSubmission(byHash.id, event);
      return { submissionId: byHash.id, action: 'enriched' };
    }
  }

  // ── 3. No match — create a stub submission from network evidence only
  const stub = await createInterceptorStub(event, userId);
  return { submissionId: stub.id, action: 'created_stub' };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Updates an existing SubmissionEvent with fields the interceptor captured
 * that the extension may have missed (runtime, memory, testcase counts, status).
 * Uses selective update — only overwrites null fields to avoid clobbering
 * extension data that arrived first.
 */
async function enrichExistingSubmission(
  id: string,
  event: NormalizedInterceptorEvent
): Promise<void> {
  const current = await prisma.submissionEvent.findUnique({
    where: { id },
    select: { runtime: true, memory: true, testCasesPassed: true, totalTestCases: true, status: true, source: true },
  });
  if (!current) return;

  await prisma.submissionEvent.update({
    where: { id },
    data: {
      // Only enrich fields that are currently null
      runtime:        current.runtime        ?? event.runtime,
      memory:         current.memory         ?? (event.memory != null ? Math.round(event.memory) : null),
      testCasesPassed: current.testCasesPassed ?? event.passedTestcases,
      totalTestCases:  current.totalTestCases  ?? event.totalTestcases,
      status:         current.status !== 'Accepted' && event.verdict ? event.verdict : current.status,
      // Mark as merged once both sources have contributed
      source: 'merged',
      updatedAt: new Date(),
    },
  });

  console.log(`[Merger] Enriched submission ${id} with network evidence`);
}

/**
 * Creates a minimal SubmissionEvent stub when only interceptor data is available.
 * The stub has source='interceptor' so the UI and analysis can distinguish it.
 *
 * Many required fields (code, problemId, etc.) are unknown at this point.
 * They will be filled in when the Chrome Extension event arrives and triggers
 * its own merge (which will find this stub via eventId/hash and enrich it).
 */
async function createInterceptorStub(
  event: NormalizedInterceptorEvent,
  userId: string
): Promise<{ id: string }> {
  // We need a problemId — look up a placeholder problem or create one
  // from whatever we can extract from the request URL.
  const slugFromUrl = extractSlugFromUrl(event.requestUrl);
  const problemSlug = slugFromUrl ?? 'unknown-problem';

  const problem = await prisma.problem.upsert({
    where:  { slug: problemSlug },
    update: {},
    create: {
      slug:       problemSlug,
      title:      problemSlug,
      difficulty: 'Medium',
      topics:     [],
    },
  });

  // Use the LeetCode submission_id as the eventId so extension events can match later
  const eventId = event.submissionId ?? `interceptor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const stub = await prisma.submissionEvent.create({
    data: {
      userId,
      problemId:      problem.id,
      eventId,
      submissionHash: event.submissionHash,
      sessionId:      'interceptor-session',
      timestamp:      event.requestTimestamp,
      status:         event.verdict ?? 'Unknown',
      language:       extractLanguageFromBody(event.requestBody),
      code:           '', // unknown until extension event arrives
      runtime:        event.runtime,
      memory:         event.memory != null ? Math.round(event.memory) : null,
      testCasesPassed: event.passedTestcases,
      totalTestCases:  event.totalTestcases,
      failedTestCase:  event.failedTestcase,
      timeSpent:      0,
      attemptNumber:  1,
      rapidSubmission: false,
      source:         'interceptor',
    },
  });

  console.log(`[Merger] Created interceptor stub submission ${stub.id} (eventId=${eventId})`);
  return { id: stub.id };
}

// ── URL / body helpers ────────────────────────────────────────────────────────

/**
 * Extracts the problem slug from a LeetCode URL.
 * Patterns:
 *   /problems/two-sum/submit/
 *   /submissions/detail/123/check/
 */
function extractSlugFromUrl(url: string): string | null {
  const match = url.match(/\/problems\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Extracts programming language from the request body.
 * LeetCode submit body typically contains { typed_code: '...', lang: 'python3' }.
 */
function extractLanguageFromBody(body: Record<string, unknown>): string {
  return (body['lang'] as string | undefined) ??
         (body['lang_slug'] as string | undefined) ??
         'unknown';
}
