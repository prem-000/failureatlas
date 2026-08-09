/**
 * mcp/tests/auth.test.ts
 * Unit tests for FailureAtlas MCP Authentication, OAuth 2.0 PKCE, Refresh Tokens, and Scopes
 */

import crypto from 'crypto';
import { generateAuthorizationCode, exchangeAuthorizationCode, renewAccessToken } from '../src/auth/oauth';
import { verifyMcpToken } from '../src/auth/identity';
import { hasScope, requireScope, FAILUREATLAS_SCOPES } from '../src/auth/scopes';
import { FailureAtlasMcpError } from '../src/utils/errors';

async function runAuthTests() {
  console.log('🧪 Starting FailureAtlas MCP Auth Unit Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName}`);
      failed++;
    }
  }

  // 1. Test Scope Checking
  try {
    const userScopes = [FAILUREATLAS_SCOPES.PROFILE, FAILUREATLAS_SCOPES.FAILURES_READ];
    assert(hasScope(userScopes, FAILUREATLAS_SCOPES.PROFILE) === true, 'hasScope returns true for present scope');
    assert(hasScope(userScopes, FAILUREATLAS_SCOPES.DIAGNOSIS_READ) === false, 'hasScope returns false for missing scope');
    
    let scopeErrThrown = false;
    try {
      requireScope(userScopes, FAILUREATLAS_SCOPES.DIAGNOSIS_READ);
    } catch (e: any) {
      if (e instanceof FailureAtlasMcpError && e.code === 'INSUFFICIENT_SCOPE') {
        scopeErrThrown = true;
      }
    }
    assert(scopeErrThrown === true, 'requireScope throws INSUFFICIENT_SCOPE for missing scope');
  } catch (e) {
    console.error('Scope test error:', e);
    failed++;
  }

  // 2. Test OAuth Authorization Code & PKCE S256 Flow
  try {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const authCode = await generateAuthorizationCode({
      clientId: 'failureatlas-chatgpt-client',
      redirectUri: 'https://chatgpt.com/oauth/callback',
      userId: 'test-user-id-123',
      scopes: [FAILUREATLAS_SCOPES.PROFILE, FAILUREATLAS_SCOPES.FAILURES_READ],
      codeChallenge,
      codeChallengeMethod: 'S256',
    });

    assert(typeof authCode === 'string' && authCode.length > 20, 'generateAuthorizationCode issues valid string');

    // Attempt exchange with invalid code verifier -> MUST FAIL
    let pkceFailed = false;
    try {
      await exchangeAuthorizationCode({
        code: authCode,
        clientId: 'failureatlas-chatgpt-client',
        redirectUri: 'https://chatgpt.com/oauth/callback',
        codeVerifier: 'wrong-verifier',
      });
    } catch {
      pkceFailed = true;
    }
    assert(pkceFailed === true, 'exchangeAuthorizationCode rejects invalid PKCE code_verifier');

    // Exchange with valid code verifier -> MUST SUCCEED
    const tokens = await exchangeAuthorizationCode({
      code: authCode,
      clientId: 'failureatlas-chatgpt-client',
      redirectUri: 'https://chatgpt.com/oauth/callback',
      codeVerifier,
    });

    assert(typeof tokens.access_token === 'string', 'Token exchange returns access_token');
    assert(typeof tokens.refresh_token === 'string', 'Token exchange returns refresh_token');
    assert(tokens.expires_in === 3600, 'Token exchange returns 1-hour expiration (3600s)');

    // Test Refresh Token renewal -> MUST SUCCEED
    const renewedTokens = await renewAccessToken(tokens.refresh_token);
    assert(typeof renewedTokens.access_token === 'string', 'renewAccessToken issues new access_token');

    // Test Invalid Refresh Token -> MUST FAIL
    let refreshFailed = false;
    try {
      await renewAccessToken('invalid.refresh.token');
    } catch {
      refreshFailed = true;
    }
    assert(refreshFailed === true, 'renewAccessToken rejects invalid refresh token');

  } catch (e) {
    console.error('OAuth/PKCE test error:', e);
    failed++;
  }

  // 3. Test Unauthenticated & Invalid Token Rejections
  try {
    let unauthErr = false;
    try {
      await verifyMcpToken(null);
    } catch (e: any) {
      if (e instanceof FailureAtlasMcpError && e.code === 'NOT_AUTHENTICATED') unauthErr = true;
    }
    assert(unauthErr === true, 'verifyMcpToken rejects missing Authorization header');

    let invalidTokenErr = false;
    try {
      await verifyMcpToken('Bearer invalid.jwt.token');
    } catch (e: any) {
      if (e instanceof FailureAtlasMcpError && e.code === 'NOT_AUTHENTICATED') invalidTokenErr = true;
    }
    assert(invalidTokenErr === true, 'verifyMcpToken rejects invalid JWT token');
  } catch (e) {
    console.error('Token verification test error:', e);
    failed++;
  }

  console.log(`\n📊 Auth Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runAuthTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
