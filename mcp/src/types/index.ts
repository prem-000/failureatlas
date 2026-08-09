/**
 * mcp/src/types/index.ts
 * Type definitions for FailureAtlas MCP Server
 */

export type FailureAtlasScope =
  | 'failureatlas:profile'
  | 'failureatlas:failures:read'
  | 'failureatlas:weaknesses:read'
  | 'failureatlas:diagnosis:read'
  | 'failureatlas:recommendations:read';

export type McpErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'NOT_AUTHORIZED'
  | 'INSUFFICIENT_SCOPE'
  | 'USER_NOT_FOUND'
  | 'FAILURE_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'FAILUREATLAS_API_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface AuthenticatedUserSession {
  userId: string;
  email: string;
  scopes: FailureAtlasScope[];
}

export interface McpToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: McpErrorCode;
    message: string;
  };
}

export interface UserProfileResult {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  statistics: {
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: number;
  };
}

export interface CompactFailureItem {
  id: string;
  problem: {
    title: string;
    slug: string;
    difficulty: string;
    topics: string[];
  };
  platform: string;
  status: string;
  timestamp: string;
  rootCause: string;
  confidence: number;
  weakness: string;
  evidenceSummary: string;
}

export interface FailureSearchResult {
  failures: CompactFailureItem[];
  totalMatches: number;
}

export interface WeaknessItem {
  id: string;
  name: string;
  score: number;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface StructuredDiagnosisOutput {
  failureId: string;
  problem: {
    title: string;
    slug: string;
    difficulty: string;
  };
  status: string;
  rootCause: string;
  confidence: number;
  weakness: string;
  evidence: Array<{
    type: string;
    description: string;
    source: string;
  }>;
  explanation: string;
}

export interface LearningRecommendationItem {
  weakness: string;
  strategy: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  practiceProblems: Array<{
    title: string;
    problemSlug: string;
    difficulty: string;
  }>;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface AuthorizationCodePayload {
  clientId: string;
  redirectUri: string;
  userId: string;
  scopes: FailureAtlasScope[];
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  exp: number;
}
