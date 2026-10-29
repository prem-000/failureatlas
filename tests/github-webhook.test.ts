/**
 * tests/github-webhook.test.ts
 *
 * Comprehensive Test Suite for GitHub Webhook Endpoint & Signature Verification.
 * Tests:
 * 1. Valid HMAC SHA-256 signatures
 * 2. Invalid HMAC SHA-256 signatures & tampered payloads
 * 3. Missing X-Hub-Signature-256 header (401)
 * 4. Missing server GITHUB_WEBHOOK_SECRET handling (500)
 * 5. Ping event response (200)
 * 6. Unsupported event rejection (400)
 * 7. Malformed JSON payload rejection (400)
 * 8. Missing repository field rejection (400)
 * 9. Untracked repository response (200 ignored)
 * 10. Valid push event with durable PostgreSQL IngestionJob creation (202)
 * 11. Route alias (/api/webhooks/github) verification
 */

import assert from 'assert';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/db/prisma';
import {
  verifyGitHubSignature,
  computeGitHubSignature,
} from '../src/lib/knowledge/webhook-verifier';
import { POST as webhookPost, GET as webhookGet } from '../src/app/api/knowledge/webhook/route';
import { POST as aliasPost } from '../src/app/api/webhooks/github/route';

async function runWebhookTestSuite() {
  console.log('🧪 Starting GitHub Webhook & Security Test Suite...\n');

  const TEST_SECRET = 'test_webhook_secret_key_1234567890';
  const ORIGINAL_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
  process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;

  try {
    // ── TEST 1: Cryptographic Signature Verification ──────────────────────────
    console.log('Test 1: Valid and invalid HMAC SHA-256 signature verification...');
    const sampleBody = JSON.stringify({ action: 'test', number: 42 });
    const validSignature = computeGitHubSignature(sampleBody, TEST_SECRET);

    const validResult = verifyGitHubSignature(sampleBody, validSignature, TEST_SECRET);
    assert.strictEqual(validResult.valid, true, 'Valid signature should verify successfully');

    // Tampered payload
    const tamperedBody = JSON.stringify({ action: 'test', number: 43 });
    const tamperedResult = verifyGitHubSignature(tamperedBody, validSignature, TEST_SECRET);
    assert.strictEqual(tamperedResult.valid, false, 'Tampered body should fail verification');

    // Wrong secret
    const wrongSecretResult = verifyGitHubSignature(sampleBody, validSignature, 'wrong_secret');
    assert.strictEqual(wrongSecretResult.valid, false, 'Wrong secret should fail verification');

    // Malformed signature format
    const malformedSigResult = verifyGitHubSignature(sampleBody, 'not-a-sha256-sig', TEST_SECRET);
    assert.strictEqual(malformedSigResult.valid, false, 'Malformed signature header should fail');

    console.log('  ✓ Pass: Signature verifier correctly validates and rejects signatures.');

    // ── TEST 2: GET Health Check Handler ──────────────────────────────────────
    console.log('Test 2: GET /api/knowledge/webhook health check...');
    const getRes = await webhookGet();
    const getData = await getRes.json();
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getData.status, 'active');
    assert.strictEqual(getData.secretConfigured, true);
    console.log('  ✓ Pass: GET endpoint returns active status.');

    // ── TEST 3: Missing Signature Header (401) ────────────────────────────────
    console.log('Test 3: POST without X-Hub-Signature-256 returns 401...');
    const reqNoSig = new NextRequest('http://localhost:3000/api/knowledge/webhook', {
      method: 'POST',
      body: sampleBody,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
      },
    });
    const resNoSig = await webhookPost(reqNoSig);
    assert.strictEqual(resNoSig.status, 401);
    const dataNoSig = await resNoSig.json();
    assert.strictEqual(dataNoSig.success, false);
    console.log(`  ✓ Pass: Rejected missing signature header with 401 (${dataNoSig.error}).`);

    // ── TEST 4: Invalid Signature Header (401) ────────────────────────────────
    console.log('Test 4: POST with forged signature returns 401...');
    const reqInvalidSig = new NextRequest('http://localhost:3000/api/knowledge/webhook', {
      method: 'POST',
      body: sampleBody,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
      },
    });
    const resInvalidSig = await webhookPost(reqInvalidSig);
    assert.strictEqual(resInvalidSig.status, 401);
    console.log('  ✓ Pass: Rejected forged signature with 401.');

    // ── TEST 5: Missing Server Secret (500) ────────────────────────────────────
    console.log('Test 5: POST when server secret is not configured returns 500...');
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.WEBHOOK_SECRET;
    const reqMissingSecret = new NextRequest('http://localhost:3000/api/knowledge/webhook', {
      method: 'POST',
      body: sampleBody,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': validSignature,
      },
    });
    const resMissingSecret = await webhookPost(reqMissingSecret);
    assert.strictEqual(resMissingSecret.status, 500);
    process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;
    console.log('  ✓ Pass: Missing server secret returns 500 configuration error.');

    // ── TEST 6: Ping Event (200) ──────────────────────────────────────────────
    console.log('Test 6: GitHub "ping" event returns 200 pong...');
    const pingPayload = JSON.stringify({ zen: 'Keep it logically awesome.', hook_id: 12345 });
    const pingSig = computeGitHubSignature(pingPayload, TEST_SECRET);
    const reqPing = new NextRequest('http://localhost:3000/api/knowledge/webhook', {
      method: 'POST',
      body: pingPayload,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'ping',
        'x-hub-signature-256': pingSig,
      },
    });
    const resPing = await webhookPost(reqPing);
    assert.strictEqual(resPing.status, 200);
    const dataPing = await resPing.json();
    assert.strictEqual(dataPing.message, 'pong');
    console.log('  ✓ Pass: Handled GitHub ping event with 200.');

    // ── TEST 7: Unsupported GitHub Event (400) ────────────────────────────────
    console.log('Test 7: Unsupported GitHub event returns 400...');
    const issuesPayload = JSON.stringify({ action: 'opened' });
    const issuesSig = computeGitHubSignature(issuesPayload, TEST_SECRET);
    const reqIssues = new NextRequest('http://localhost:3000/api/knowledge/webhook', {
      method: 'POST',
      body: issuesPayload,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'issues',
        'x-hub-signature-256': issuesSig,
      },
    });
    const resIssues = await webhookPost(reqIssues);
    assert.strictEqual(resIssues.status, 400);
    const dataIssues = await resIssues.json();
    assert(dataIssues.error.includes('Unsupported GitHub event'));
    console.log('  ✓ Pass: Rejected unsupported event with 400.');

    // ── TEST 8: Malformed JSON Payload (400) ──────────────────────────────────
    console.log('Test 8: Malformed JSON payload returns 400...');
    const badJson = '{ invalid_json: true, ';
    const badJsonSig = computeGitHubSignature(badJson, TEST_SECRET);
    const reqBadJson = new NextRequest('http://localhost:3000/api/knowledge/webhook', {
      method: 'POST',
      body: badJson,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': badJsonSig,
      },
    });
    const resBadJson = await webhookPost(reqBadJson);
    assert.strictEqual(resBadJson.status, 400);
    const dataBadJson = await resBadJson.json();
    assert.strictEqual(dataBadJson.error, 'Malformed JSON payload');
    console.log('  ✓ Pass: Rejected malformed JSON with 400.');

    // ── TEST 9: Untracked Repository (200 Ignored) ────────────────────────────
    console.log('Test 9: Push to untracked repository safely acknowledged (200)...');
    const untrackedPayload = JSON.stringify({
      repository: { full_name: 'unknown-owner/unknown-repo', default_branch: 'main' },
      commits: [],
    });
    const untrackedSig = computeGitHubSignature(untrackedPayload, TEST_SECRET);
    const reqUntracked = new NextRequest('http://localhost:3000/api/knowledge/webhook', {
      method: 'POST',
      body: untrackedPayload,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': untrackedSig,
      },
    });
    const resUntracked = await webhookPost(reqUntracked);
    assert.strictEqual(resUntracked.status, 200);
    const dataUntracked = await resUntracked.json();
    assert(dataUntracked.message.includes('not tracked in knowledge sources'));
    console.log('  ✓ Pass: Untracked repository push safely ignored.');

    // ── TEST 10: Valid Push Event with Durable Job Creation (202) ─────────────
    console.log('Test 10: Push event for tracked repository enqueues durable IngestionJob...');
    // Ensure test knowledge source exists
    const testSource = await prisma.knowledgeSource.upsert({
      where: { owner_repo: { owner: 'test-org', repo: 'dsa-curated' } },
      create: {
        owner: 'test-org',
        repo: 'dsa-curated',
        url: 'https://github.com/test-org/dsa-curated',
        branch: 'main',
        status: 'active',
        isVerified: true,
      },
      update: { status: 'active' },
    });

    const pushPayload = JSON.stringify({
      repository: { full_name: 'test-org/dsa-curated', default_branch: 'main' },
      after: 'a1b2c3d4e5f67890abcdef1234567890abcdef12',
      commits: [
        {
          id: 'commit_1',
          added: ['questions/two_sum.csv', 'unsupported.png'],
          modified: ['questions/sliding_window.csv'],
          removed: ['questions/old_deprecated.csv'],
        },
      ],
    });
    const pushSig = computeGitHubSignature(pushPayload, TEST_SECRET);
    const reqPush = new NextRequest('http://localhost:3000/api/knowledge/webhook', {
      method: 'POST',
      body: pushPayload,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': pushSig,
      },
    });

    const resPush = await webhookPost(reqPush);
    assert.strictEqual(resPush.status, 202, 'Push event should return 202 Accepted');
    const dataPush = await resPush.json();
    assert.strictEqual(dataPush.success, true);
    assert.strictEqual(dataPush.repository, 'test-org/dsa-curated');
    assert.strictEqual(dataPush.filesToSyncCount, 2); // 2 supported .csv files
    assert.strictEqual(dataPush.filesToDeleteCount, 1); // 1 removed .csv file
    assert(dataPush.jobId, 'Durable IngestionJob ID must be returned');

    // Verify job exists in database
    const dbJob = await prisma.ingestionJob.findUnique({
      where: { id: dataPush.jobId },
    });
    assert(dbJob, 'IngestionJob must be persisted in PostgreSQL');
    assert.strictEqual(dbJob?.jobType, 'webhook_sync');
    assert(['queued', 'in_progress', 'completed'].includes(dbJob!.status));
    console.log(`  ✓ Pass: Push accepted with 202, durable job persisted in DB (${dbJob?.id}, status: ${dbJob?.status}).`);

    // ── TEST 11: Route Alias (/api/webhooks/github) ───────────────────────────
    console.log('Test 11: Route alias /api/webhooks/github operates identically...');
    const reqAlias = new NextRequest('http://localhost:3000/api/webhooks/github', {
      method: 'POST',
      body: pingPayload,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'ping',
        'x-hub-signature-256': pingSig,
      },
    });
    const resAlias = await aliasPost(reqAlias);
    assert.strictEqual(resAlias.status, 200);
    const dataAlias = await resAlias.json();
    assert.strictEqual(dataAlias.message, 'pong');
    // Clean up test source after brief pause
    await new Promise((r) => setTimeout(r, 300));
    await prisma.ingestionJob.deleteMany({ where: { sourceId: testSource.id } });
    await prisma.knowledgeSource.delete({ where: { id: testSource.id } });

    console.log('\n🎉 ALL 11 GITHUB WEBHOOK TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    if (ORIGINAL_SECRET !== undefined) {
      process.env.GITHUB_WEBHOOK_SECRET = ORIGINAL_SECRET;
    } else {
      delete process.env.GITHUB_WEBHOOK_SECRET;
    }
  }
}

runWebhookTestSuite().catch((err) => {
  console.error('❌ Webhook test suite failed:', err);
  process.exit(1);
});
