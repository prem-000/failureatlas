/**
 * FailureAtlas Pipeline E2E Test
 * Run: npx tsx scripts/test-pipeline.ts
 *
 * Tests:
 *  1. DB connectivity + user enumeration
 *  2. Registration (creates test user if needed)
 *  3. Login → JWT
 *  4. POST /api/submissions with JWT  (Accepted)
 *  5. POST /api/submissions with JWT  (Wrong Answer)
 *  6. GET  /api/submissions           (verify both stored)
 *  7. Auth header detection: fa_ key via X-API-Key
 *  8. Auth header detection: fa_ key sent as Bearer (compat path)
 */

import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3000/api';
const prisma = new PrismaClient();

function log(tag: string, msg: string) {
  console.log(`[${tag}] ${msg}`);
}

async function apiPost(path: string, body: object, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

async function apiGet(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  FailureAtlas Pipeline E2E Test');
  console.log('══════════════════════════════════════════════════\n');

  // ── 1. DB connectivity ────────────────────────────────────────────────────
  log('DB', 'Connecting…');
  const users = await prisma.user.findMany({ select: { id: true, email: true, apiKey: true }, take: 5 });
  log('DB', `Found ${users.length} user(s):`);
  users.forEach(u => log('DB', `  id=${u.id}  email=${u.email}  apiKey=${u.apiKey?.substring(0, 15) ?? 'null'}`));

  // ── 2. Ensure test user exists ────────────────────────────────────────────
  const TEST_EMAIL = 'pipeline-test@failureatlas.dev';
  const TEST_PASS  = 'TestPass123!';
  let testUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });

  if (!testUser) {
    log('REGISTER', 'Creating test user…');
    const r = await apiPost('/auth/register', { email: TEST_EMAIL, password: TEST_PASS, name: 'Pipeline Test' });
    log('REGISTER', `Status: ${r.status} → ${JSON.stringify(r.json).substring(0, 120)}`);
    if (!r.ok) {
      log('REGISTER', '❌ Registration failed — aborting'); process.exit(1);
    }
    testUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  } else {
    log('REGISTER', `Test user already exists: ${testUser.id}`);
  }

  // ── 3. Login → JWT ────────────────────────────────────────────────────────
  log('LOGIN', `Authenticating as ${TEST_EMAIL}…`);
  const loginRes = await apiPost('/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
  log('LOGIN', `Status: ${loginRes.status}`);

  if (!loginRes.ok || !loginRes.json.success) {
    log('LOGIN', `❌ Login failed: ${JSON.stringify(loginRes.json)}`); process.exit(1);
  }

  const tokenData = loginRes.json.data?.token;
  const jwt = typeof tokenData === 'object' ? tokenData?.token : tokenData;
  if (!jwt) {
    log('LOGIN', `❌ No JWT in response: ${JSON.stringify(loginRes.json)}`); process.exit(1);
  }
  log('LOGIN', `✅ JWT obtained: ${jwt.substring(0, 40)}…`);

  const authHeaders = { Authorization: `Bearer ${jwt}` };

  // ── 4. POST Accepted submission ───────────────────────────────────────────
  const acceptedId = `e2e-accepted-${Date.now()}`;
  const acceptedTraceId = `TR-ACC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  log('POST', 'Submitting Accepted event…');
  const accRes = await apiPost('/submissions', {
    eventId:           acceptedId,
    submissionTraceId: acceptedTraceId,
    sessionId:         'e2e-session-1',
    problemSlug:       'two-sum',
    problemTitle:      'Two Sum',
    problemDifficulty: 'Easy',
    problemTopics:     ['Array', 'Hash Table'],
    submissionStatus:  'Accepted',
    submissionLanguage:'python3',
    submissionCode:    'def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target-n], i]\n        seen[n] = i',
    runtime:           48,
    memory:            16.4,
    testCasesPassed:   63,
    totalTestCases:    63,
    timeSpent:         300000,
    attemptNumber:     1,
    rapidSubmission:   false,
  }, authHeaders);
  log('POST', `Status: ${accRes.status} → ${JSON.stringify(accRes.json).substring(0, 150)}`);
  if (accRes.ok && accRes.json.success) {
    log('POST', `✅ Accepted stored. submissionId=${accRes.json.submissionId}`);
  } else {
    log('POST', `❌ Accepted FAILED`);
  }

  // ── 5. POST Wrong Answer submission ───────────────────────────────────────
  const waId = `e2e-wa-${Date.now()}`;
  const waTraceId = `TR-WA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  log('POST', 'Submitting Wrong Answer event…');
  const waRes = await apiPost('/submissions', {
    eventId:           waId,
    submissionTraceId: waTraceId,
    sessionId:         'e2e-session-1',
    problemSlug:       'two-sum',
    problemTitle:      'Two Sum',
    problemDifficulty: 'Easy',
    problemTopics:     ['Array'],
    submissionStatus:  'Wrong Answer',
    submissionLanguage:'python3',
    submissionCode:    'def twoSum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i]+nums[j]==target: return [i,j]',
    runtime:           null,
    memory:            null,
    testCasesPassed:   12,
    totalTestCases:    63,
    failedTestCase:    '[3,2,4]\n6',
    timeSpent:         180000,
    attemptNumber:     2,
    rapidSubmission:   true,
  }, authHeaders);
  log('POST', `Status: ${waRes.status} → ${JSON.stringify(waRes.json).substring(0, 150)}`);
  if (waRes.ok && waRes.json.success) {
    log('POST', `✅ Wrong Answer stored. submissionId=${waRes.json.submissionId}`);
  } else {
    log('POST', `❌ Wrong Answer FAILED`);
  }

  // ── 6. GET submissions — verify both stored ────────────────────────────────
  log('GET', 'Retrieving stored submissions…');
  const getRes = await apiGet('/submissions?problemSlug=two-sum&limit=10', authHeaders);
  log('GET', `Status: ${getRes.status}`);
  if (getRes.ok && getRes.json.success) {
    const subs = getRes.json.submissions ?? [];
    log('GET', `✅ Found ${subs.length} submission(s) for two-sum:`);
    subs.forEach((s: any) => log('GET', `  ${s.submissionStatus.padEnd(22)} | eventId: ${s.eventId?.substring(0, 20)}…`));
  } else {
    log('GET', `❌ GET failed: ${JSON.stringify(getRes.json)}`);
  }

  // ── 7. Test fa_ key via X-API-Key header ─────────────────────────────────
  const apiKey = testUser?.apiKey;
  if (apiKey) {
    log('API-KEY', `Testing X-API-Key auth with ${apiKey.substring(0, 15)}…`);
    const keyId = `e2e-apikey-${Date.now()}`;
    const keyRes = await apiPost('/submissions', {
      eventId:           keyId,
      sessionId:         'e2e-apikey-session',
      problemSlug:       'two-sum',
      problemTitle:      'Two Sum',
      problemDifficulty: 'Easy',
      problemTopics:     ['Array'],
      submissionStatus:  'Runtime Error',
      submissionLanguage:'python3',
      submissionCode:    'def twoSum(nums, target): return nums[999]',
      timeSpent:         30000,
      attemptNumber:     3,
      rapidSubmission:   true,
    }, { 'X-API-Key': apiKey });
    log('API-KEY', `Status: ${keyRes.status} → ${JSON.stringify(keyRes.json).substring(0, 150)}`);
    if (keyRes.ok) log('API-KEY', '✅ X-API-Key auth works');
    else           log('API-KEY', '❌ X-API-Key auth FAILED');

    // ── 8. Test fa_ key sent as Bearer (backward compat) ──────────────────
    log('BEARER-KEY', `Testing fa_ key sent as Bearer header…`);
    const bearerId = `e2e-bearer-${Date.now()}`;
    const bearerRes = await apiPost('/submissions', {
      eventId:           bearerId,
      sessionId:         'e2e-bearer-session',
      problemSlug:       'two-sum',
      problemTitle:      'Two Sum',
      problemDifficulty: 'Easy',
      problemTopics:     ['Array'],
      submissionStatus:  'Time Limit Exceeded',
      submissionLanguage:'python3',
      submissionCode:    'def twoSum(nums, target):\n    time.sleep(999)',
      timeSpent:         30000,
      attemptNumber:     4,
      rapidSubmission:   true,
    }, { Authorization: `Bearer ${apiKey}` });
    log('BEARER-KEY', `Status: ${bearerRes.status} → ${JSON.stringify(bearerRes.json).substring(0, 150)}`);
    if (bearerRes.ok) log('BEARER-KEY', '✅ fa_ key via Bearer works (compat path)');
    else              log('BEARER-KEY', '❌ fa_ key via Bearer FAILED');
  } else {
    log('API-KEY', '⚠️  User has no apiKey in DB — skipping X-API-Key and Bearer-key tests');
    log('API-KEY', '   Generate one from Settings page or run: UPDATE users SET "apiKey" = \'fa_test_key\' WHERE email = \'...\';');
  }

  // ── 9. Final DB check ─────────────────────────────────────────────────────
  if (testUser) {
    const count = await prisma.submissionEvent.count({ where: { userId: testUser.id } });
    log('DB', `✅ Total submission_events for test user: ${count}`);

    const dbSub = await prisma.submissionEvent.findFirst({
      where: { submissionTraceId: waTraceId }
    });
    if (dbSub) {
      log('DB', `✅ Wrong Answer successfully persisted in database!`);
      log('DB', `   submissionTraceId: ${dbSub.submissionTraceId}`);
      log('DB', `   problemSlug:       two-sum`);
      log('DB', `   status:            ${dbSub.status}`);
      log('DB', `   code length:       ${dbSub.code.length} chars`);
    } else {
      log('DB', `❌ Wrong Answer NOT found by submissionTraceId: ${waTraceId}`);
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('  Test complete');
  console.log('══════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(async e => {
  console.error('❌ Test script error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
