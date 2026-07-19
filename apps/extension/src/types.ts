export type SubmissionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Runtime Error'
  | 'Compilation Error';

export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface CodeDiff {
  timestamp: number;
  additions: string[];
  deletions: string[];
  lineCount: number;
  charCount: number;
}

export interface SubmissionEvent {
  version: number;
  platform: string;
  externalSubmissionId?: string | null;
  eventId: string;
  submissionTraceId?: string;
  sessionId: string;
  userId: string;
  timestamp: number;
  problemSlug: string;
  problemTitle: string;
  problemDifficulty: ProblemDifficulty;
  problemTopics: string[];
  problemUrl: string;
  submissionStatus: SubmissionStatus;
  submissionLanguage: string;
  submissionCode: string;
  runtime?: number;
  memory?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  failedTestCase?: string;
  timeSpent: number;
  attemptNumber: number;
  rapidSubmission: boolean;
  codeEvolution: CodeDiff[];
}

export interface ProblemMetadata {
  slug: string;
  title: string;
  difficulty: ProblemDifficulty;
  topics: string[];
  description?: string;
  constraints?: string;
  url: string;
}

export type ExtensionMessageType =
  | 'SUBMISSION_EVENT'
  | 'AUTHENTICATE'
  | 'AUTHENTICATE_API_KEY'   // ← new: API key login from popup
  | 'GET_STATUS'
  | 'SYNC_PENDING'
  | 'SET_API_URL'
  | 'LOGOUT'
  | 'PING';

export interface ExtensionMessage {
  type: ExtensionMessageType;
  data?: any;          // optional — GET_STATUS, SYNC_PENDING, LOGOUT send no data
  timestamp?: number;  // optional — popup doesn't always set this
}

export interface ExtensionState {
  isAuthenticated: boolean;
  userId?: string;
  apiUrl: string;
  pendingEvents: number;
  lastSync?: number;
  sessionActive: boolean;
}

export interface StoredCredentials {
  token: string;
  userId: string;
  email: string;
  expiresAt: number;
  apiKey?: string;     // ← new: fa_... key from Settings page (optional for backwards compat)
}

export type AnalysisStatus = 'idle' | 'capturing' | 'sending' | 'analyzing' | 'error';