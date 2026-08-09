/**
 * mcp/src/tools/failures.ts
 * MCP Tools: get_my_recent_failures and search_my_failures
 */

import { FailureAtlasApiService } from '../services/failureatlas-api';
import { requireScope, FAILUREATLAS_SCOPES } from '../auth/scopes';
import { AuthenticatedUserSession } from '../types/index';
import { validateSchema, recentFailuresInputSchema, searchFailuresInputSchema } from '../utils/validation';

export const getMyRecentFailuresDefinition = {
  name: 'get_my_recent_failures',
  description:
    "Returns recent coding failures belonging to the authenticated FailureAtlas user with status, root cause, confidence, weakness, and concise evidence summary. Use this when the user asks about recent failed submissions, recent bugs, or submission errors.",
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of recent failures to return (default 10, max 100).',
      },
      topic: {
        type: 'string',
        description: 'Filter failures by topic slug (e.g. binary-search, dynamic-programming).',
      },
      status: {
        type: 'string',
        description: 'Filter by submission status (e.g. Wrong Answer, Time Limit Exceeded, Memory Limit Exceeded, Runtime Error).',
      },
    },
  },
};

export const searchMyFailuresDefinition = {
  name: 'search_my_failures',
  description:
    "Searches the authenticated user's historical coding failures using FailureAtlas semantic and structural retrieval. Use this when the user searches for specific past mistakes, topics, or error patterns across their submission history.",
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query describing the bug, topic, or error pattern (e.g. "binary search boundary off by one").',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default 10, max 50).',
      },
    },
    required: ['query'],
  },
};

export async function handleGetMyRecentFailures(
  session: AuthenticatedUserSession,
  apiService: FailureAtlasApiService,
  args: unknown
) {
  requireScope(session.scopes, FAILUREATLAS_SCOPES.FAILURES_READ);
  const validated = validateSchema(recentFailuresInputSchema, args || {});
  return await apiService.getRecentFailures(session.userId, validated);
}

export async function handleSearchMyFailures(
  session: AuthenticatedUserSession,
  apiService: FailureAtlasApiService,
  args: unknown
) {
  requireScope(session.scopes, FAILUREATLAS_SCOPES.FAILURES_READ);
  const validated = validateSchema(searchFailuresInputSchema, args || {});
  return await apiService.searchFailures(session.userId, validated.query, validated.limit);
}
