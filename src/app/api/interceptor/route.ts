// src/app/api/interceptor/route.ts
// POST /api/interceptor/event
//
// Accepts network-level evidence from the Network Interceptor (or Chrome
// Extension webRequest hooks) and enriches the corresponding SubmissionEvent.
//
// Design invariants:
//   - NEVER creates a duplicate SubmissionEvent. Always UPSERT.
//   - Returns 200 immediately after persisting NetworkEvidence.
//   - If the submission already exists → enriches it and optionally triggers
//     a lightweight Bayesian re-run with the new network signals.
//   - If no submission exists yet → creates a stub and stores network evidence.
//     The analysis pipeline runs when the extension event arrives later.

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId, unauthorizedResponse } from '@/lib/auth/resolve-user';
import { validateInterceptorEvent, collectInterceptorEvent } from '@/lib/interceptor/collector';
import { mergeOrCreateSubmission } from '@/lib/interceptor/merger';
import { upsertNetworkEvidence } from '@/lib/interceptor/uploader';
import { runNetworkEnrichedAnalysis } from '@/lib/interceptor/analysis-bridge';

// ── CORS headers ─────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: { ...CORS_HEADERS, 'Access-Control-Max-Age': '86400' } });
}

// ── POST /api/interceptor/event ───────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await resolveUserId(request);
  if (!auth.userId) return unauthorizedResponse(auth.error || 'Authentication required.');
  const userId = auth.userId;

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // ── Validate ─────────────────────────────────────────────────────────────
  const validationErrors = validateInterceptorEvent(body);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid interceptor event payload',
          details: Object.fromEntries(validationErrors.map(e => [e.field, e.message])),
        },
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // ── Normalize ─────────────────────────────────────────────────────────────
  let event;
  try {
    event = collectInterceptorEvent(body);
  } catch (err: any) {
    console.error('[Interceptor] Collector failed:', err?.message);
    return NextResponse.json(
      { success: false, error: { code: 'PARSE_ERROR', message: 'Failed to parse interceptor event' } },
      { status: 422, headers: CORS_HEADERS }
    );
  }

  // ── Merge (find-or-create submission) ────────────────────────────────────
  let mergeResult;
  try {
    mergeResult = await mergeOrCreateSubmission(event, userId);
  } catch (err: any) {
    console.error('[Interceptor] Merge failed:', err?.message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to merge submission' } },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const { submissionId, action } = mergeResult;

  // ── Persist NetworkEvidence ───────────────────────────────────────────────
  try {
    await upsertNetworkEvidence(submissionId, event);
  } catch (err: any) {
    console.error('[Interceptor] NetworkEvidence upsert failed:', err?.message);
    // Non-fatal — still return 200 because the submission row is safe
  }

  // ── Optional: re-run analysis with network signals (fire-and-forget) ──────
  // Only when enriching an existing, already-analysed submission so the
  // diagnosis picks up the new network signals. Safe to skip on stub creation
  // because the analysis pipeline runs in full when the extension event arrives.
  if (action === 'enriched') {
    runNetworkEnrichedAnalysis(submissionId, event).catch(err => {
      console.warn('[Interceptor] Network-enriched analysis failed (non-fatal):', err?.message);
    });
  }

  return NextResponse.json(
    {
      success: true,
      submissionId,
      action,
      message: action === 'enriched'
        ? 'Network evidence added to existing submission.'
        : 'Interceptor stub created. Awaiting extension event to complete submission.',
    },
    { headers: CORS_HEADERS }
  );
}
