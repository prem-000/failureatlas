/**
 * mcp/src/tools/profile.ts
 * MCP Tool: get_my_profile
 */

import { z } from 'zod';
import { FailureAtlasApiService } from '../services/failureatlas-api';
import { requireScope, FAILUREATLAS_SCOPES } from '../auth/scopes';
import { AuthenticatedUserSession } from '../types/index';

export const getMyProfileDefinition = {
  name: 'get_my_profile',
  description:
    "Returns the authenticated FailureAtlas user's profile and high-level learning statistics (total submissions, accepted submissions, acceptance rate). Use this when the user asks about their overall progress, account details, or submission stats.",
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function handleGetMyProfile(
  session: AuthenticatedUserSession,
  apiService: FailureAtlasApiService,
  _args: unknown
) {
  requireScope(session.scopes, FAILUREATLAS_SCOPES.PROFILE);
  return await apiService.getUserProfile(session.userId);
}
