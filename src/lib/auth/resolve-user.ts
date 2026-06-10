// src/lib/auth/resolve-user.ts
// Resolves user ID from either JWT (Authorization: Bearer) or API Key (X-API-Key)
//
// FIX: resolve-user was calling prisma.apiCredential.findUnique() but the schema
// has NO ApiCredential model. API keys are stored on User.apiKey directly.
// This caused a Prisma runtime error → caught silently → null → 401 on every
// API-key-authenticated request. Queue grew forever because all POSTs returned 401.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db/prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your_jwt_secret_change_me_in_production'
);

export interface AuthResult {
  userId: string | null;
  method: 'JWT' | 'X-API-Key' | 'Bearer API Key' | 'None';
  error?: string;
}

/**
 * Resolves user ID from JWT or API key.
 * Returns user ID string if valid, null if not authenticated.
 *
 * Auth priority:
 *   1. Authorization: Bearer <jwt>   → verify JWT, extract sub/userId
 *   2. X-API-Key: fa_...             → look up User.apiKey in DB
 */
export async function resolveUserId(request: NextRequest): Promise<AuthResult> {
  try {
    // ── 1. Try JWT (Authorization: Bearer <token>) ────────────────────────────
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();

      // If it's an fa_ API key sent in the Bearer header (legacy compat),
      // fall through to the X-API-Key path below instead of JWT-verifying it.
      if (token.startsWith('fa_')) {
        console.log('[Auth] Bearer header contains fa_ key — treating as API key');
        const user = await prisma.user.findUnique({
          where: { apiKey: token },
          select: { id: true, email: true },
        });
        if (user) {
          console.log('[Auth] ✅ fa_ key (via Bearer) resolved for user:', user.id);
          return { userId: user.id, method: 'Bearer API Key' };
        }
        const err = `fa_ key in Bearer header not found in database: ${token.substring(0, 12)}...`;
        console.warn('[Auth] ⚠️', err);
        return { userId: null, method: 'Bearer API Key', error: err };
      }

      try {
        const verified = await jwtVerify(token, JWT_SECRET);
        const userId = (verified.payload.sub || verified.payload.userId) as string | undefined;
        if (userId) {
          console.log('[Auth] ✅ JWT verified for user:', userId);
          return { userId: String(userId), method: 'JWT' };
        }
        const err = 'JWT is valid but is missing sub/userId claims';
        console.warn('[Auth] ⚠️', err);
        return { userId: null, method: 'JWT', error: err };
      } catch (jwtError) {
        const err = `JWT verification failed: ${(jwtError as Error).message}`;
        console.warn('[Auth] ⚠️', err);
        // Fall through to X-API-Key check as fallback
      }
    }

    // ── 2. Try API Key (X-API-Key: fa_...) ───────────────────────────────────
    const apiKey = request.headers.get('x-api-key');
    if (apiKey?.startsWith('fa_')) {
      try {
        const user = await prisma.user.findUnique({
          where: { apiKey },
          select: { id: true, email: true },
        });

        if (user) {
          console.log('[Auth] ✅ X-API-Key verified for user:', user.id, '(' + user.email + ')');
          return { userId: user.id, method: 'X-API-Key' };
        }

        const err = `X-API-Key not found in DB: ${apiKey.substring(0, 12)}...`;
        console.warn('[Auth] ⚠️', err);
        return { userId: null, method: 'X-API-Key', error: err };
      } catch (dbError) {
        const err = `DB error during API key lookup: ${(dbError as Error).message}`;
        console.error('[Auth] ❌', err);
        return { userId: null, method: 'X-API-Key', error: err };
      }
    }

    // ── 3. No recognised auth header ─────────────────────────────────────────
    const hasAuth  = !!authHeader;
    const hasXKey  = !!apiKey;
    const err = hasAuth 
      ? 'Authorization header present but failed verification.' 
      : hasXKey 
        ? 'X-API-Key present but failed verification.' 
        : 'Missing required credentials.';
    
    console.warn(
      '[Auth] ⚠️ No valid auth.',
      hasAuth  ? `Authorization header present but failed.` : 'No Authorization header.',
      hasXKey  ? `X-API-Key present but failed.` : 'No X-API-Key header.',
    );
    return { userId: null, method: 'None', error: err };

  } catch (error) {
    const err = `Unexpected auth error: ${(error as Error).message || error}`;
    console.error('[Auth] ❌', err);
    return { userId: null, method: 'None', error: err };
  }
}

/**
 * Returns a 401 Unauthorized response with a clear message.
 */
export function unauthorizedResponse(reason: string = 'Authentication required.') {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: `Authentication required. ${reason} Provide Authorization: Bearer <jwt> or X-API-Key: fa_...`,
      },
    },
    { status: 401 }
  );
}

/**
 * Verify JWT token and return payload. Used for web dashboard authentication.
 */
export async function verifyJWT(token: string): Promise<any> {
  try {
    const verified = await jwtVerify(token, secretKey());
    return verified.payload;
  } catch {
    return null;
  }
}

function secretKey() {
  return JWT_SECRET;
}

/**
 * Create JWT token for user. Used during login.
 */
export async function createJWT(userId: string): Promise<string> {
  const { SignJWT } = await import('jose');
  const now       = Math.floor(Date.now() / 1000);
  const expiresAt = now + 24 * 60 * 60; // 24 hours

  return new SignJWT({ sub: userId, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);
}