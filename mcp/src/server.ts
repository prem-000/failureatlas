/**
 * mcp/src/server.ts
 * FailureAtlas MCP Server implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FailureAtlasApiService } from './services/failureatlas-api';
import { verifyMcpToken } from './auth/identity';
import { getMyProfileDefinition, handleGetMyProfile } from './tools/profile';
import {
  getMyRecentFailuresDefinition,
  handleGetMyRecentFailures,
  searchMyFailuresDefinition,
  handleSearchMyFailures,
} from './tools/failures';
import { getMyWeaknessesDefinition, handleGetMyWeaknesses } from './tools/weaknesses';
import { getFailureDiagnosisDefinition, handleGetFailureDiagnosis } from './tools/diagnosis';
import {
  getLearningRecommendationsDefinition,
  handleGetLearningRecommendations,
} from './tools/recommendations';
import { FailureAtlasMcpError } from './utils/errors';

export const TOOL_DEFINITIONS = [
  getMyProfileDefinition,
  getMyRecentFailuresDefinition,
  searchMyFailuresDefinition,
  getMyWeaknessesDefinition,
  getFailureDiagnosisDefinition,
  getLearningRecommendationsDefinition,
];

export function createFailureAtlasMcpServer() {
  const server = new Server(
    {
      name: 'failureatlas-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const apiService = new FailureAtlasApiService();

  // List Available Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFINITIONS,
    };
  });

  // Execute Tool Handler
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const authHeader = (extra as any)?.authHeader || (extra as any)?.req?.headers?.authorization;
    const session = await verifyMcpToken(authHeader);

    const { name, arguments: args } = request.params;

    try {
      let result: any;
      switch (name) {
        case 'get_my_profile':
          result = await handleGetMyProfile(session, apiService, args);
          break;
        case 'get_my_recent_failures':
          result = await handleGetMyRecentFailures(session, apiService, args);
          break;
        case 'search_my_failures':
          result = await handleSearchMyFailures(session, apiService, args);
          break;
        case 'get_my_weaknesses':
          result = await handleGetMyWeaknesses(session, apiService, args);
          break;
        case 'get_failure_diagnosis':
          result = await handleGetFailureDiagnosis(session, apiService, args);
          break;
        case 'get_learning_recommendations':
          result = await handleGetLearningRecommendations(session, apiService, args);
          break;
        default:
          throw FailureAtlasMcpError.invalidInput(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof FailureAtlasMcpError) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify(error.toResponsePayload(), null, 2),
            },
          ],
        };
      }
      throw error;
    }
  });

  return { server, apiService };
}
