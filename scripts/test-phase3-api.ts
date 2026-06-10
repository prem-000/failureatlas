/**
 * Phase 3 API verification — profile, submission detail, subgraph
 * Run: npx tsx scripts/test-phase3-api.ts
 * Requires: npm run dev (or server on localhost:3000)
 */

export {};

const BASE = process.env.API_BASE ?? 'http://localhost:3000';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✅ ${message}`);
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
  });
  const json = await res.json();
  assert(res.ok && json.success === true, `login status ${res.status}`);
  assert(typeof json.data?.token?.token === 'string', 'login returns JWT token');
  assert(res.headers.get('content-type')?.includes('application/json') ?? false, 'login Content-Type is JSON');
  return json.data.token.token as string;
}

async function testProfile(token: string) {
  console.log('\n[1] GET /api/user/profile');
  const res = await fetch(`${BASE}/api/user/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  assert(res.status === 200, 'profile returns 200');
  assert(json.success === true, 'profile success flag');
  assert(json.data?.user?.email, 'profile has user.email');
  assert(typeof json.data?.stats?.totalSubmissions === 'number', 'profile has stats.totalSubmissions');
  assert(Array.isArray(json.data?.stats?.languageDistribution), 'profile has languageDistribution');
  assert(Array.isArray(json.data?.stats?.activityTimeline), 'profile has activityTimeline');
  assert(res.headers.get('content-type')?.includes('application/json') ?? false, 'profile Content-Type is JSON');
}

async function testSubgraph(token: string) {
  console.log('\n[2] GET /api/graph/subgraph');
  const res = await fetch(`${BASE}/api/graph/subgraph?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  assert(res.status === 200, 'subgraph returns 200');
  assert(json.success === true, 'subgraph success flag');
  assert(Array.isArray(json.data?.nodes), 'subgraph has nodes array');
  assert(Array.isArray(json.data?.edges), 'subgraph has edges array');
  if (json.data.nodes.length > 0) {
    const n = json.data.nodes[0];
    assert(typeof n.id === 'string', 'node has id');
    assert(n.data?.nodeType !== undefined, 'node has data.nodeType');
    assert(n.position?.x !== undefined, 'node has React Flow position');
  }
  assert(json.data?.stats?.totalNodes !== undefined, 'subgraph has stats.totalNodes');
}

async function testSubmissionDetail(token: string) {
  console.log('\n[3] GET /api/submissions (list) + detail');
  const listRes = await fetch(`${BASE}/api/submissions?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listJson = await listRes.json();
  assert(listRes.status === 200 && listJson.success === true, 'submissions list OK');

  const first = listJson.submissions?.[0];
  if (!first?.eventId) {
    console.log('  ⚠️  No submissions in DB — skipping detail assertions');
    return;
  }

  const detailRes = await fetch(`${BASE}/api/submissions/${first.eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const detailJson = await detailRes.json();
  assert(detailRes.status === 200, 'submission detail returns 200');
  assert(detailJson.success === true, 'submission detail success flag');
  assert(detailJson.data?.submission?.eventId === first.eventId, 'detail matches eventId');
  assert(Array.isArray(detailJson.data?.codeDiff), 'detail has codeDiff array');
  assert(Array.isArray(detailJson.data?.evidences), 'detail has evidences array');
  assert(Array.isArray(detailJson.data?.rootCauseHypotheses), 'detail has rootCauseHypotheses');
  assert(detailJson.data?.submission?.problem?.slug, 'detail includes problem.slug');
}

async function testUnauthorized() {
  console.log('\n[4] GET /api/user/profile (no auth → 401)');
  const res = await fetch(`${BASE}/api/user/profile`);
  const json = await res.json();
  assert(res.status === 401, 'unauthenticated profile returns 401');
  assert(json.success === false, 'unauthenticated profile success is false');
  assert(json.error?.code === 'AUTHENTICATION_REQUIRED', 'unauthenticated error code');
}

async function run() {
  console.log('\n🔎 FailureAtlas Phase 3 API Tests\n' + '─'.repeat(44));
  console.log(`Base URL: ${BASE}`);

  await testUnauthorized();
  const token = await login();
  await testProfile(token);
  await testSubgraph(token);
  await testSubmissionDetail(token);

  console.log('\n' + '─'.repeat(44));
  console.log('✅ All Phase 3 API checks passed\n');
}

run().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
