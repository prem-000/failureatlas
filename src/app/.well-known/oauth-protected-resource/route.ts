import { NextResponse } from 'next/server';
import { mcpConfig } from '../../../../mcp/src/config';
import { ALL_FAILUREATLAS_SCOPES } from '../../../../mcp/src/auth/scopes';

export async function GET() {
  return NextResponse.json({
    resource: `${mcpConfig.issuer}/mcp`,
    authorization_servers: [mcpConfig.issuer],
    scopes_supported: ALL_FAILUREATLAS_SCOPES,
  });
}
