// src/lib/interceptor/parser.ts
// Parses LeetCode-specific fields from raw HTTP request / response bodies.
//
// LeetCode's submission flow:
//   POST /problems/{slug}/submit/   → returns { submission_id: 12345 }
//   GET  /submissions/detail/{id}/check/ (polling)
//       → returns {
//           state: "SUCCESS",
//           status_msg: "Wrong Answer" | "Accepted" | "Time Limit Exceeded" | ...,
//           run_success: true/false,
//           runtime: "44 ms",
//           memory: "18.2 MB",
//           total_correct: 61,
//           total_testcases: 63,
//           input_formatted: "...",   ← failed testcase
//           expected_output: "...",
//           code_output: "...",
//         }

import type { InterceptorRequest, InterceptorResponse } from './types';

export interface ParsedNetworkFields {
  submissionId: string | null;
  verdict: string | null;
  runtime: number | null;         // ms
  memory: number | null;          // MB
  totalTestcases: number | null;
  passedTestcases: number | null;
  failedTestcase: string | null;
  serverProcessingMs: number | null;
}

// Normalise LeetCode status_msg → FailureAtlas SubmissionStatus
const VERDICT_MAP: Record<string, string> = {
  'accepted':               'Accepted',
  'wrong answer':           'Wrong Answer',
  'time limit exceeded':    'Time Limit Exceeded',
  'memory limit exceeded':  'Memory Limit Exceeded',
  'runtime error':          'Runtime Error',
  'compile error':          'Compilation Error',
  'compilation error':      'Compilation Error',
};

function normalizeVerdict(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return VERDICT_MAP[raw.toLowerCase()] ?? raw;
}

/** Parse numeric value from strings like "44 ms" or "18.2 MB". */
function parseNumeric(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const match = String(value).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Extracts all structured fields the pipeline cares about from
 * the raw request + response bodies of a LeetCode submission call.
 */
export function extractNetworkFields(
  req: InterceptorRequest,
  res: InterceptorResponse
): ParsedNetworkFields {
  const reqBody  = (req.body  as Record<string, unknown>) ?? {};
  const resBody  = (res.body  as Record<string, unknown>) ?? {};

  // ── submission_id ────────────────────────────────────────────────────────────
  // Present in the POST /submit/ response body
  const rawSubId =
    res.verdict != null ? null          // already a check/ response
    : (resBody['submission_id'] ?? resBody['submissionId'] ?? null);
  const submissionId = rawSubId != null ? String(rawSubId) : null;

  // ── verdict ──────────────────────────────────────────────────────────────────
  const rawVerdict =
    res.verdict ??                      // already parsed by caller
    (resBody['status_msg'] as string | undefined) ??
    (resBody['status']     as string | undefined) ??
    null;
  const verdict = normalizeVerdict(rawVerdict);

  // ── runtime ──────────────────────────────────────────────────────────────────
  const runtime = parseNumeric(
    resBody['runtime'] ??
    resBody['status_runtime'] ??
    null
  );

  // ── memory ───────────────────────────────────────────────────────────────────
  // LeetCode returns "18.2 MB" as a string
  const rawMem =
    resBody['memory'] ??
    resBody['status_memory'] ??
    null;
  const memory = parseNumeric(rawMem);

  // ── testcase counts ───────────────────────────────────────────────────────────
  const totalTestcases  = parseNumeric(resBody['total_testcases']  ?? resBody['totalTestcases']  ?? null);
  const passedTestcases = parseNumeric(resBody['total_correct']    ?? resBody['passedTestcases'] ?? null);

  // ── failed testcase ───────────────────────────────────────────────────────────
  // LeetCode puts the failing input in `input_formatted` or `last_testcase`
  const failedTestcase =
    (resBody['input_formatted'] as string | undefined) ??
    (resBody['last_testcase']   as string | undefined) ??
    null;

  // ── server processing time ────────────────────────────────────────────────────
  const serverProcessingMs = parseNumeric(resBody['elapsed_time'] ?? null);

  return {
    submissionId,
    verdict,
    runtime,
    memory,
    totalTestcases,
    passedTestcases,
    failedTestcase,
    serverProcessingMs,
  };
}
