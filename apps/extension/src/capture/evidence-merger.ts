import type {
  Platform,
  EditorEvidence,
  NetworkEvidence,
  ResultEvidence,
  SubmitEvidence,
  ProblemEvidence,
  CanonicalSubmissionEvent,
} from '../adapters/base/types';
import type { SubmissionStatus } from '../types';

export interface MergeInput {
  platform: Platform;
  sessionId: string;
  userId?: string;
  problem: ProblemEvidence;
  editor?: EditorEvidence | null;
  bufferSnapshot?: EditorEvidence | null;
  network?: NetworkEvidence | null;
  result?: ResultEvidence | null;
  submit?: SubmitEvidence | null;
  timeSpent?: number;
  attemptNumber?: number;
}

export class EvidenceMerger {
  /**
   * Merges all collected pieces of evidence into a single canonical event.
   */
  static merge(input: MergeInput): CanonicalSubmissionEvent | null {
    // 1. Resolve Code: Network payload -> Immediate editor -> Buffer snapshot
    let code = '';
    let language = 'unknown';

    if (input.network?.requestBody?.code && typeof input.network.requestBody.code === 'string' && input.network.requestBody.code.trim().length > 10) {
      code = input.network.requestBody.code;
      if (input.network.requestBody.language) {
        language = String(input.network.requestBody.language);
      }
    } else if (input.editor?.code && input.editor.code.trim().length > 10) {
      code = input.editor.code;
      language = input.editor.language;
    } else if (input.bufferSnapshot?.code && input.bufferSnapshot.code.trim().length > 10) {
      code = input.bufferSnapshot.code;
      language = input.bufferSnapshot.language;
    }

    if (!code || code.trim().length <= 10) {
      console.warn('[EvidenceMerger] Unable to merge submission event: No valid code captured.');
      return null;
    }

    // 2. Resolve Status
    let submissionStatus: SubmissionStatus = 'Wrong Answer';
    if (input.result?.status) {
      submissionStatus = input.result.status;
    } else if (input.network?.status) {
      submissionStatus = input.network.status;
    }

    // 3. Resolve Metrics
    const runtime = input.result?.runtime ?? input.network?.runtime;
    const memory = input.result?.memory ?? input.network?.memory;
    const testCasesPassed = input.result?.testCasesPassed ?? input.network?.testCasesPassed;
    const totalTestCases = input.result?.totalTestCases ?? input.network?.totalTestCases;
    const failedTestCase = input.result?.failedTestCase;

    // 4. Resolve Platform Submission ID
    const platformSubmissionId = input.network?.platformSubmissionId || input.result?.platformSubmissionId;

    // 5. Generate Event ID & Fingerprint
    const eventId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `ev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    const problemSlug = input.problem.slug || 'unknown-problem';
    const fingerprint = `${input.platform}:${problemSlug}:${hashString(code)}:${submissionStatus}`;

    return {
      eventId,
      platform: input.platform,
      platformSubmissionId,
      submissionTraceId: platformSubmissionId || eventId.substring(0, 8),
      sessionId: input.sessionId,
      userId: input.userId || '',
      timestamp: now,
      problem: {
        slug: input.problem.slug,
        title: input.problem.title,
        difficulty: input.problem.difficulty,
        topics: input.problem.topics,
        url: input.problem.url,
      },
      code,
      language,
      submissionStatus,
      runtime,
      memory,
      testCasesPassed,
      totalTestCases,
      failedTestCase,
      evidence: {
        editor: input.editor || input.bufferSnapshot || undefined,
        network: input.network || undefined,
        result: input.result || undefined,
      },
      fingerprint,
      timeSpent: input.timeSpent || 0,
      attemptNumber: input.attemptNumber || 1,
    };
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
