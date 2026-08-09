/**
 * mcp/src/auth/oauth.ts
 * OAuth 2.0 Authorization Server helpers (PKCE S256 & Refresh Tokens)
 */

import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { mcpConfig } from '../config';
import { ALL_FAILUREATLAS_SCOPES } from './scopes';
import { FailureAtlasScope, OAuthTokenResponse } from '../types/index';
import { FailureAtlasMcpError } from '../utils/errors';
import { prisma } from '@/lib/db/prisma';

const secret = new TextEncoder().encode(mcpConfig.jwtSecret);

export interface IssueAuthCodeParams {
  clientId: string;
  redirectUri: string;
  userId: string;
  scopes: FailureAtlasScope[];
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * Generate a short-lived (5 minute) signed authorization code
 */
export async function generateAuthorizationCode(params: IssueAuthCodeParams): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 5 * 60; // 5 minutes

  return new SignJWT({
    type: 'authorization_code',
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    userId: params.userId,
    scopes: params.scopes,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(mcpConfig.issuer)
    .setAudience(mcpConfig.audience)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(secret);
}

/**
 * Exchange Authorization Code (with PKCE verification) for access & refresh tokens
 */
export async function exchangeAuthorizationCode(params: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<OAuthTokenResponse> {
  try {
    const { payload } = await jwtVerify(params.code, secret, {
      issuer: mcpConfig.issuer,
      audience: mcpConfig.audience,
    });

    if (payload.type !== 'authorization_code') {
      throw FailureAtlasMcpError.invalidInput('Invalid authorization code type.');
    }

    if (payload.clientId !== params.clientId) {
      throw FailureAtlasMcpError.invalidInput('Client ID mismatch.');
    }

    if (payload.redirectUri !== params.redirectUri) {
      throw FailureAtlasMcpError.invalidInput('Redirect URI mismatch.');
    }

    // PKCE S256 verification
    const codeChallenge = payload.codeChallenge as string;
    const computedChallenge = crypto
      .createHash('sha256')
      .update(params.codeVerifier)
      .digest('base64url');

    if (computedChallenge !== codeChallenge) {
      throw FailureAtlasMcpError.invalidInput('PKCE verification failed. Code verifier mismatch.');
    }

    const userId = payload.userId as string;
    const scopes = (payload.scopes as FailureAtlasScope[]) || ALL_FAILUREATLAS_SCOPES;

    return await issueTokens(userId, scopes);
  } catch (error) {
    if (error instanceof FailureAtlasMcpError) throw error;
    throw FailureAtlasMcpError.invalidInput(`Authorization code exchange failed: ${(error as Error).message}`);
  }
}

/**
 * Renew access token using refresh token
 */
export async function renewAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
  try {
    const { payload } = await jwtVerify(refreshToken, secret, {
      issuer: mcpConfig.issuer,
      audience: mcpConfig.audience,
    });

    if (payload.type !== 'refresh_token') {
      throw FailureAtlasMcpError.invalidInput('Invalid refresh token type.');
    }

    const userId = payload.sub || (payload.userId as string);
    const scopes = (payload.scopes as FailureAtlasScope[]) || ALL_FAILUREATLAS_SCOPES;

    return await issueTokens(userId, scopes);
  } catch (error) {
    if (error instanceof FailureAtlasMcpError) throw error;
    throw FailureAtlasMcpError.notAuthenticated('Invalid or expired refresh token.');
  }
}
/**
 * Helper to issue signed access token (1 hour) and refresh token (30 days)
 */
async function issueTokens(userId: string, scopes: FailureAtlasScope[]): Promise<OAuthTokenResponse> {
  const now = Math.floor(Date.now() / 1000);
  const accessTokenExp = now + 60 * 60; // 1 hour
  const refreshTokenExp = now + 30 * 24 * 60 * 60; // 30 days

  // Persist connection state on UserPreferences if user exists
  try {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (userExists) {
      const connectedAt = new Date();
      await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          chatgptConnected: true,
          chatgptConnectedAt: connectedAt,
        },
        create: {
          userId,
          dailyMissionEmail: true,
          preferredTime: '08:00',
          chatgptConnected: true,
          chatgptConnectedAt: connectedAt,
        },
      });
    }
  } catch (dbErr) {
    console.warn('[OAuth] ⚠️ Non-blocking UserPreferences update error:', dbErr);
  }

  const accessToken = await new SignJWT({
    sub: userId,
    userId,
    scopes,
    type: 'access_token',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(mcpConfig.issuer)
    .setAudience(mcpConfig.audience)
    .setIssuedAt(now)
    .setExpirationTime(accessTokenExp)
    .sign(secret);

  const refreshToken = await new SignJWT({
    sub: userId,
    userId,
    scopes,
    type: 'refresh_token',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(mcpConfig.issuer)
    .setAudience(mcpConfig.audience)
    .setIssuedAt(now)
    .setExpirationTime(refreshTokenExp)
    .sign(secret);

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: refreshToken,
    scope: scopes.join(' '),
  };
}
