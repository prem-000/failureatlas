/**
 * mcp/src/auth/scopes.ts
 * Authorization Scopes for FailureAtlas MCP
 */

import { FailureAtlasScope } from '../types/index';
import { FailureAtlasMcpError } from '../utils/errors';

export const FAILUREATLAS_SCOPES = {
  PROFILE: 'failureatlas:profile' as FailureAtlasScope,
  FAILURES_READ: 'failureatlas:failures:read' as FailureAtlasScope,
  WEAKNESSES_READ: 'failureatlas:weaknesses:read' as FailureAtlasScope,
  DIAGNOSIS_READ: 'failureatlas:diagnosis:read' as FailureAtlasScope,
  RECOMMENDATIONS_READ: 'failureatlas:recommendations:read' as FailureAtlasScope,
} as const;

export const ALL_FAILUREATLAS_SCOPES: FailureAtlasScope[] = [
  FAILUREATLAS_SCOPES.PROFILE,
  FAILUREATLAS_SCOPES.FAILURES_READ,
  FAILUREATLAS_SCOPES.WEAKNESSES_READ,
  FAILUREATLAS_SCOPES.DIAGNOSIS_READ,
  FAILUREATLAS_SCOPES.RECOMMENDATIONS_READ,
];

export function hasScope(userScopes: string[] | undefined, requiredScope: FailureAtlasScope): boolean {
  if (!userScopes || !Array.isArray(userScopes)) return false;
  return userScopes.includes(requiredScope);
}

export function requireScope(userScopes: string[] | undefined, requiredScope: FailureAtlasScope): void {
  if (!hasScope(userScopes, requiredScope)) {
    throw FailureAtlasMcpError.insufficientScope(requiredScope);
  }
}
