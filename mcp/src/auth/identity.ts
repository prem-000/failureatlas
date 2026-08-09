/**
 * mcp/src/auth/identity.ts
 * Token verification & FailureAtlas user identity resolution
 */

import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db/prisma';
import { mcpConfig } from '../config';
import { AuthenticatedUserSession, FailureAtlasScope } from '../types/index';
import { FailureAtlasMcpError } from '../utils/errors';

export async function verifyMcpToken(authHeader: string | null | undefined): Promise<AuthenticatedUserSession> {
  if (!authHeader) {
    throw FailureAtlasMcpError.notAuthenticated('Missing Authorization header.');
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw FailureAtlasMcpError.notAuthenticated('Invalid Authorization header format. Expected Bearer token.');
  }

  const token = parts[1];
  if (!token) {
    throw FailureAtlasMcpError.notAuthenticated('Missing access token.');
  }

  const secret = new TextEncoder().encode(mcpConfig.jwtSecret);

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: mcpConfig.issuer,
      audience: mcpConfig.audience,
    });

    const userId = (payload.sub || payload.userId) as string | undefined;
    if (!userId) {
      throw FailureAtlasMcpError.notAuthenticated('Access token missing sub/userId claim.');
    }

    const scopes = (payload.scopes as FailureAtlasScope[]) || [];

    // Verify active user in Prisma database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw FailureAtlasMcpError.userNotFound();
    }

    return {
      userId: user.id,
      email: user.email,
      scopes,
    };
  } catch (error) {
    if (error instanceof FailureAtlasMcpError) throw error;

    const errMsg = (error as Error).message || 'Token verification failed';
    console.warn('[MCP Auth] ⚠️ Token verification failed:', errMsg);
    throw FailureAtlasMcpError.notAuthenticated(`Token validation error: ${errMsg}`);
  }
}
