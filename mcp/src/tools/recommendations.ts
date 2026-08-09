/**
 * mcp/src/tools/recommendations.ts
 * MCP Tool: get_learning_recommendations
 */

import { FailureAtlasApiService } from '../services/failureatlas-api';
import { requireScope, FAILUREATLAS_SCOPES } from '../auth/scopes';
import { AuthenticatedUserSession } from '../types/index';

export const getLearningRecommendationsDefinition = {
  name: 'get_learning_recommendations',
  description:
    "Returns personalized learning recommendations and practice strategies based on the user's FailureAtlas failure history and weakness profile. Use this when the user asks for study recommendations, next steps, or practice advice.",
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function handleGetLearningRecommendations(
  session: AuthenticatedUserSession,
  apiService: FailureAtlasApiService,
  _args: unknown
) {
  requireScope(session.scopes, FAILUREATLAS_SCOPES.RECOMMENDATIONS_READ);
  const recommendations = await apiService.getLearningRecommendations(session.userId);
  return { recommendations };
}
