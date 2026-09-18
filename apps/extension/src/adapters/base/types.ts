import type { SubmissionStatus, ProblemDifficulty } from '../../types';

export type Platform = 'leetcode' | 'hackerrank' | 'geeksforgeeks';

export type LifecycleState = 'UNKNOWN' | 'SUBMITTED' | 'RUNNING' | 'TERMINAL';

export interface EditorEvidence {
  code: string;
  language: string;
  source: 'monaco' | 'ace' | 'dom' | 'textarea' | 'buffer';
  timestamp: number;
}

export interface NetworkEvidence {
  url: string;
  method: string;
  requestBody?: any;
  responseBody?: any;
  platformSubmissionId?: string;
  status?: SubmissionStatus;
  rawStatus?: string;
  runtime?: number;
  memory?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  timestamp: number;
}

export interface DOMEvidence {
  selector: string;
  textContent: string;
  timestamp: number;
}

export interface SubmitEvidence {
  trigger: 'button_click' | 'network_post' | 'hotkey';
  timestamp: number;
}

export interface ResultEvidence {
  status: SubmissionStatus;
  rawStatus: string;
  platformSubmissionId?: string;
  runtime?: number;
  memory?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  failedTestCase?: string;
  timestamp: number;
}

export interface ProblemEvidence {
  platform: Platform;
  slug?: string;
  title?: string;
  difficulty?: ProblemDifficulty;
  topics?: string[];
  url: string;
}

export interface CanonicalSubmissionEvent {
  eventId: string;
  platform: Platform;
  platformSubmissionId?: string;
  submissionTraceId?: string;
  sessionId: string;
  userId: string;
  timestamp: number;
  problem: {
    slug?: string;
    title?: string;
    difficulty?: ProblemDifficulty;
    topics?: string[];
    url: string;
  };
  code: string;
  language: string;
  submissionStatus: SubmissionStatus;
  runtime?: number;
  memory?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  failedTestCase?: string;
  evidence: {
    editor?: EditorEvidence;
    network?: NetworkEvidence;
    result?: ResultEvidence;
  };
  fingerprint: string;
  timeSpent?: number;
  attemptNumber?: number;
  rapidSubmission?: boolean;
}

export interface AdapterContext {
  tabId?: number;
  platform: Platform;
  url: string;
}
