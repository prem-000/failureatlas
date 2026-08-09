/**
 * mcp/src/config.ts
 * FailureAtlas MCP Configuration
 */

export const mcpConfig = {
  issuer: process.env.MCP_ISSUER || 'https://failureatlas.vercel.app',
  audience: process.env.MCP_AUDIENCE || 'failureatlas-mcp',
  port: parseInt(process.env.MCP_PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fallback-mcp-jwt-secret-change-in-production',
  oauthClientId: process.env.OAUTH_CLIENT_ID || 'failureatlas-chatgpt-client',
  oauthClientSecret: process.env.OAUTH_CLIENT_SECRET || 'failureatlas-chatgpt-secret',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};
