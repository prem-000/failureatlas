import { NextRequest, NextResponse } from 'next/server';
import { verifyMcpToken } from '../../../mcp/src/auth/identity';
import { FailureAtlasApiService } from '../../../mcp/src/services/failureatlas-api';
import { TOOL_DEFINITIONS } from '../../../mcp/src/server';
import { handleGetMyProfile } from '../../../mcp/src/tools/profile';
import { handleGetMyRecentFailures, handleSearchMyFailures } from '../../../mcp/src/tools/failures';
import { handleGetMyWeaknesses } from '../../../mcp/src/tools/weaknesses';
import { handleGetFailureDiagnosis } from '../../../mcp/src/tools/diagnosis';
import { handleGetLearningRecommendations } from '../../../mcp/src/tools/recommendations';
import { FailureAtlasMcpError } from '../../../mcp/src/utils/errors';

const apiService = new FailureAtlasApiService();

export async function POST(request: NextRequest) {
  // 1. Authenticate Request at HTTP Boundary
  const authHeader = request.headers.get('authorization');
  let session;
  try {
    session = await verifyMcpToken(authHeader);
  } catch (authError) {
    const message = (authError as Error).message || 'Unauthorized';
    return new NextResponse(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: `Authentication failed: ${message}`,
        },
        id: null,
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="failureatlas-mcp"',
        },
      }
    );
  }

  // 2. Parse JSON-RPC Payload
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error: invalid JSON' },
        id: null,
      },
      { status: 400 }
    );
  }

  const { jsonrpc, method, params, id } = body || {};

  if (jsonrpc !== '2.0' || !method) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request: missing jsonrpc="2.0" or method' },
        id: id ?? null,
      },
      { status: 400 }
    );
  }

  // 3. Handle Methods
  try {
    // Protocol Initialization
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'failureatlas-mcp',
            version: '0.1.0',
          },
        },
        id,
      });
    }

    // Ping / Notifications
    if (method === 'ping') {
      return NextResponse.json({ jsonrpc: '2.0', result: {}, id });
    }

    // List Tools
    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          tools: TOOL_DEFINITIONS,
        },
        id,
      });
    }

    // Call Tool
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      let data: any;

      switch (toolName) {
        case 'get_my_profile':
          data = await handleGetMyProfile(session, apiService, toolArgs);
          break;
        case 'get_my_recent_failures':
          data = await handleGetMyRecentFailures(session, apiService, toolArgs);
          break;
        case 'search_my_failures':
          data = await handleSearchMyFailures(session, apiService, toolArgs);
          break;
        case 'get_my_weaknesses':
          data = await handleGetMyWeaknesses(session, apiService, toolArgs);
          break;
        case 'get_failure_diagnosis':
          data = await handleGetFailureDiagnosis(session, apiService, toolArgs);
          break;
        case 'get_learning_recommendations':
          data = await handleGetLearningRecommendations(session, apiService, toolArgs);
          break;
        default:
          return NextResponse.json({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method or tool not found: ${toolName}` },
            id,
          });
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        },
        id,
      });
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      error: { code: -32601, message: `Method not found: ${method}` },
      id,
    });

  } catch (error) {
    if (error instanceof FailureAtlasMcpError) {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify(error.toResponsePayload(), null, 2),
            },
          ],
        },
        id,
      });
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: (error as Error).message || 'Internal server error',
      },
      id,
    });
  }
}

// GET method for health check or discovery info
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'failureatlas-mcp',
    transport: 'Streamable HTTP',
    endpoint: 'https://failureatlas.vercel.app/mcp',
  });
}
