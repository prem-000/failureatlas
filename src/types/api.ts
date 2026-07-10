import type {
  SubmissionEvent,
  RootCauseHypothesis,
  SystemicWeakness,
  DiagnosisResult,
  GraphFilters,
  User,
  AuthToken,
  PaginationInfo,
} from './index';

// Auth endpoints
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
  token: AuthToken;
}

export interface LoginResponse {
  user: User;
  token: AuthToken;
}

// Submission endpoints
export interface CreateSubmissionRequest {
  eventId: string;
  sessionId: string;
  problemSlug: string;
  problemTitle: string;
  problemDifficulty: string;
  problemTopics: string[];
  problemUrl: string;
  submissionStatus: string;
  submissionLanguage: string;
  submissionCode: string;
  runtime?: number;
  memory?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  failedTestCase?: string;
  timeSpent: number;
  attemptNumber: number;
}

export interface CreateSubmissionResponse {
  submission: SubmissionEvent;
  analysis: {
    rootCauseHypotheses: RootCauseHypothesis[];
    systemicWeaknesses: SystemicWeakness[];
  };
}

export interface GetSubmissionsResponse {
  submissions: SubmissionEvent[];
  pagination: PaginationInfo;
}

// Analysis endpoints
export interface AnalyzeSubmissionRequest {
  submissionId: string;
  previousSubmissionId?: string;
}

export interface AnalyzeSubmissionResponse {
  rootCauseHypotheses: RootCauseHypothesis[];
  systemicWeaknesses: SystemicWeakness[];
  evidence: Array<{
    type: string;
    description: string;
    confidence: number;
  }>;
}

// Diagnosis endpoints
export interface GenerateDiagnosisRequest {
  submissionId: string;
  includeRecommendations?: boolean;
}

export interface GenerateDiagnosisResponse {
  diagnosis: DiagnosisResult;
}

// Graph endpoints
export interface QueryGraphRequest {
  filters: GraphFilters;
  limit?: number;
  offset?: number;
}

export interface QueryGraphResponse {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
  }>;
  pagination: PaginationInfo;
}

export interface GetProblemStatsResponse {
  totalSubmissions: number;
  acceptedCount: number;
  failedCount: number;
  lastSubmission: string;
  weaknesses: SystemicWeakness[];
}

// User endpoints
export interface GetUserResponse {
  user: User;
  stats: {
    totalSubmissions: number;
    totalProblems: number;
    overallWeaknesses: SystemicWeakness[];
  };
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export interface UpdateUserResponse {
  user: User;
}

// Problem endpoints
export interface GetProblemsResponse {
  problems: Array<{
    slug: string;
    title: string;
    difficulty: string;
    topics: string[];
    submissions: number;
    passRate: number;
  }>;
  pagination: PaginationInfo;
}

export interface GetProblemDetailResponse {
  slug: string;
  title: string;
  difficulty: string;
  topics: string[];
  submissions: Array<{
    id: string;
    status: string;
    timestamp: string;
    language: string;
  }>;
  weaknesses: SystemicWeakness[];
}

// Health check
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    graphDb?: 'connected' | 'disconnected';
    cache?: 'connected' | 'disconnected';
  };
}
