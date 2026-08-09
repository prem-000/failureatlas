import { NextResponse } from 'next/server';
import { mcpConfig } from '../../../../mcp/src/config';
import { ALL_FAILUREATLAS_SCOPES } from '../../../../mcp/src/auth/scopes';

export async function GET() {
  return NextResponse.json({
    issuer: mcpConfig.issuer,
    authorization_endpoint: `${mcpConfig.issuer}/oauth/authorize`,
    token_endpoint: `${mcpConfig.issuer}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ALL_FAILUREATLAS_SCOPES,
  });
}
