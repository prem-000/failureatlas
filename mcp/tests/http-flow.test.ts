/**
 * mcp/tests/http-flow.test.ts
 * End-to-end HTTP integration tests for POST /mcp Streamable HTTP Endpoint
 */

import { SignJWT } from 'jose';
import { POST as mcpRouteHandler } from '../../src/app/mcp/route';
import { mcpConfig } from '../src/config';
import { ALL_FAILUREATLAS_SCOPES, FAILUREATLAS_SCOPES } from '../src/auth/scopes';
import { prisma } from '@/lib/db/prisma';

const secret = new TextEncoder().encode(mcpConfig.jwtSecret);

async function createTestToken(userId: string, scopes = ALL_FAILUREATLAS_SCOPES, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: userId,
    userId,
    scopes,
    type: 'access_token',
    ...overrides,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(mcpConfig.issuer)
    .setAudience(mcpConfig.audience)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(secret);
}

async function runHttpFlowTests() {
  console.log('🧪 Starting FailureAtlas MCP E2E HTTP Flow Tests...\n');
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

  // Ensure test users exist in Prisma DB
  let userA = await prisma.user.findFirst({ where: { email: 'usera@mcp-test.com' } });
  if (!userA) {
    userA = await prisma.user.create({
      data: {
        email: 'usera@mcp-test.com',
        name: 'User A',
      },
    });
  }

  let userB = await prisma.user.findFirst({ where: { email: 'userb@mcp-test.com' } });
  if (!userB) {
    userB = await prisma.user.create({
      data: {
        email: 'userb@mcp-test.com',
        name: 'User B',
      },
    });
  }

  // Ensure problem exists
  let problem = await prisma.problem.findFirst();
  if (!problem) {
    problem = await prisma.problem.create({
      data: {
        slug: 'two-sum-test',
        title: 'Two Sum Test',
        difficulty: 'Easy',
        topics: ['Array'],
      },
    });
  }

  // Create submission for User A
  const submissionA = await prisma.submissionEvent.create({
    data: {
      userId: userA.id,
      problemId: problem.id,
      eventId: `event-user-a-${Date.now()}`,
      sessionId: 'session-a',
      timestamp: new Date(),
      status: 'Wrong Answer',
      language: 'typescript',
      code: 'console.log("user a code");',
      timeSpent: 300,
      attemptNumber: 1,
    },
  });

  // Create submission for User B
  const submissionB = await prisma.submissionEvent.create({
    data: {
      userId: userB.id,
      problemId: problem.id,
      eventId: `event-user-b-${Date.now()}`,
      sessionId: 'session-b',
      timestamp: new Date(),
      status: 'Time Limit Exceeded',
      language: 'typescript',
      code: 'console.log("user b code");',
      timeSpent: 600,
      attemptNumber: 2,
    },
  });

  // 1. Unauthenticated POST /mcp -> HTTP 401 + WWW-Authenticate header
  try {
    const req = new Request('https://failureatlas.vercel.app/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });

    const res = await mcpRouteHandler(req as any);
    assert(res.status === 401, 'Unauthenticated POST /mcp returns HTTP 401');
    const authHeader = res.headers.get('WWW-Authenticate');
    assert(
      authHeader !== null && authHeader.includes('Bearer realm="failureatlas-mcp"'),
      'HTTP 401 response contains WWW-Authenticate: Bearer realm="failureatlas-mcp"'
    );
  } catch (e) {
    console.error('Unauthenticated HTTP test error:', e);
    failed++;
  }

  // 2. Expired Token -> HTTP 401
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = await new SignJWT({ sub: userA.id, userId: userA.id, scopes: ALL_FAILUREATLAS_SCOPES })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(mcpConfig.issuer)
      .setAudience(mcpConfig.audience)
      .setIssuedAt(now - 7200)
      .setExpirationTime(now - 3600)
      .sign(secret);

    const req = new Request('https://failureatlas.vercel.app/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expiredToken}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });

    const res = await mcpRouteHandler(req as any);
    assert(res.status === 401, 'Expired token POST /mcp returns HTTP 401');
  } catch (e) {
    console.error('Expired token test error:', e);
    failed++;
  }

  // 3. Invalid Issuer / Audience -> HTTP 401
  try {
    const invalidIssuerToken = await new SignJWT({ sub: userA.id, userId: userA.id, scopes: ALL_FAILUREATLAS_SCOPES })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('https://fake-domain.com')
      .setAudience(mcpConfig.audience)
      .setIssuedAt(Math.floor(Date.now() / 1000))
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(secret);

    const req = new Request('https://failureatlas.vercel.app/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${invalidIssuerToken}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });

    const res = await mcpRouteHandler(req as any);
    assert(res.status === 401, 'Invalid issuer token POST /mcp returns HTTP 401');
  } catch (e) {
    console.error('Invalid issuer test error:', e);
    failed++;
  }

  // 4. Authenticated Request tools/list -> HTTP 200 with 6 tools
  try {
    const validTokenA = await createTestToken(userA.id);

    const req = new Request('https://failureatlas.vercel.app/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validTokenA}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 2 }),
    });

    const res = await mcpRouteHandler(req as any);
    assert(res.status === 200, 'Authenticated tools/list returns HTTP 200');
    const json: any = await res.json();
    assert(json.result && json.result.tools && json.result.tools.length === 6, 'tools/list returns all 6 FailureAtlas tools');
  } catch (e) {
    console.error('Authenticated tools/list test error:', e);
    failed++;
  }

  // 5. Authenticated User A -> get_my_recent_failures() -> ONLY User A data returned
  try {
    const validTokenA = await createTestToken(userA.id);

    const req = new Request('https://failureatlas.vercel.app/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validTokenA}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'get_my_recent_failures', arguments: { limit: 10 } },
        id: 3,
      }),
    });

    const res = await mcpRouteHandler(req as any);
    assert(res.status === 200, 'get_my_recent_failures returns HTTP 200');
    const json: any = await res.json();
    const contentText = json.result?.content?.[0]?.text;
    const failures = JSON.parse(contentText);
    assert(Array.isArray(failures), 'get_my_recent_failures returns array of items');
    const hasUserAFailure = failures.some((f: any) => f.id === submissionA.eventId || f.id === submissionA.id);
    const hasUserBFailure = failures.some((f: any) => f.id === submissionB.eventId || f.id === submissionB.id);
    assert(hasUserAFailure === true, 'get_my_recent_failures returns User A failure');
    assert(hasUserBFailure === false, 'get_my_recent_failures DOES NOT return User B failure (data isolation verified)');
  } catch (e) {
    console.error('User A get_my_recent_failures test error:', e);
    failed++;
  }

  // 6. Authenticated User A -> get_failure_diagnosis(User B failure) -> 404 FAILURE_NOT_FOUND (Ownership check)
  try {
    const validTokenA = await createTestToken(userA.id);

    const req = new Request('https://failureatlas.vercel.app/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validTokenA}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'get_failure_diagnosis', arguments: { failureId: submissionB.eventId } },
        id: 4,
      }),
    });

    const res = await mcpRouteHandler(req as any);
    assert(res.status === 200, 'get_failure_diagnosis on unowned resource returns 200 with error result');
    const json: any = await res.json();
    assert(json.result?.isError === true, 'Response marks isError: true');
    const contentText = json.result?.content?.[0]?.text || '';
    assert(contentText.includes('FAILURE_NOT_FOUND'), 'User A requesting User B failure receives 404 FAILURE_NOT_FOUND rejection');
  } catch (e) {
    console.error('Resource ownership test error:', e);
    failed++;
  }

  // 7. Authenticated User A -> get_failure_diagnosis(User A failure) -> Diagnosis Returned
  try {
    const validTokenA = await createTestToken(userA.id);

    const req = new Request('https://failureatlas.vercel.app/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validTokenA}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'get_failure_diagnosis', arguments: { failureId: submissionA.eventId } },
        id: 5,
      }),
    });

    const res = await mcpRouteHandler(req as any);
    assert(res.status === 200, 'get_failure_diagnosis on owned resource returns 200');
    const json: any = await res.json();
    const contentText = json.result?.content?.[0]?.text;
    const diagnosis = JSON.parse(contentText);
    assert(diagnosis.failureId === submissionA.eventId, 'User A receives valid diagnosis for owned failure');
  } catch (e) {
    console.error('Owned diagnosis test error:', e);
    failed++;
  }

  // 8. Missing Scope -> Authorization Error
  try {
    const restrictedToken = await createTestToken(userA.id, [FAILUREATLAS_SCOPES.PROFILE]);

    const req = new Request('https://failureatlas.vercel.app/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${restrictedToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'get_my_recent_failures', arguments: {} },
        id: 6,
      }),
    });

    const res = await mcpRouteHandler(req as any);
    assert(res.status === 200, 'Restricted scope call returns HTTP 200 with error payload');
    const json: any = await res.json();
    assert(json.result?.isError === true, 'JSON-RPC response marks isError: true on missing scope');
    const textContent = json.result?.content?.[0]?.text || '';
    assert(textContent.includes('INSUFFICIENT_SCOPE'), 'Response includes INSUFFICIENT_SCOPE error code');
  } catch (e) {
    console.error('Missing scope test error:', e);
    failed++;
  }

  // Clean up test data
  try {
    await prisma.submissionEvent.deleteMany({ where: { id: { in: [submissionA.id, submissionB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  } catch (e) {}

  console.log(`\n📊 HTTP Flow Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runHttpFlowTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
