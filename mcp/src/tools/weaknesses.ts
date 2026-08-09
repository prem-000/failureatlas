/**
 * mcp/src/tools/weaknesses.ts
 * MCP Tool: get_my_weaknesses
 */

import { FailureAtlasApiService } from '../services/failureatlas-api';
import { requireScope, FAILUREATLAS_SCOPES } from '../auth/scopes';
import { AuthenticatedUserSession } from '../types/index';

export const getMyWeaknessesDefinition = {
  name: 'get_my_weaknesses',
  description:
    "Returns the authenticated FailureAtlas user's recurring programming weaknesses derived from their coding failure history. Use this when the user asks about their personal weaknesses, recurring mistakes, learning gaps, or patterns across previous submissions.",
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function handleGetMyWeaknesses(
  session: AuthenticatedUserSession,
  apiService: FailureAtlasApiService,
  _args: unknown
) {
  requireScope(session.scopes, FAILUREATLAS_SCOPES.WEAKNESSES_READ);
  const weaknesses = await apiService.getWeaknesses(session.userId);
  return { weaknesses };
}
