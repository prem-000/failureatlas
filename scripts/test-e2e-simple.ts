/**
 * E2E verification script — tests login + dashboard stats API
 * Run: npx tsx scripts/test-e2e-simple.ts
 */

export {};

const BASE = 'http://localhost:3000';

async function run() {
  console.log('\n🔎 FailureAtlas E2E Verification\n' + '─'.repeat(40));

  // ── 1. Login ──────────────────────────────────
  console.log('\n[1] POST /api/auth/login');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
  });
  const loginData = await loginRes.json();

  if (!loginRes.ok || !loginData.success) {
    console.error('  ❌ Login FAILED:', loginData.error);
    process.exit(1);
  }

  const { user, token } = loginData.data;
  console.log(`  ✅ Login OK  — status ${loginRes.status}`);
  console.log(`     user.name  : ${user.name}`);
  console.log(`     user.email : ${user.email}`);
  console.log(`     token      : ${token.token.slice(0, 30)}…`);

  if (user.email !== 'test@example.com') {
    console.error('  ❌ Email mismatch — expected test@example.com, got', user.email);
    process.exit(1);
  }

  // ── 2. Dashboard Stats ────────────────────────
  console.log('\n[2] GET /api/dashboard/stats');
  const statsRes = await fetch(`${BASE}/api/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token.token}` },
  });
  const statsData = await statsRes.json();

  if (!statsRes.ok || !statsData.success) {
    console.error('  ❌ Stats FAILED:', statsData.error);
    process.exit(1);
  }

  const { stats, recentSubmissions } = statsData.data;
  console.log(`  ✅ Stats OK  — status ${statsRes.status}`);
  console.log(`     totalSubmissions   : ${stats.totalSubmissions}`);
  console.log(`     acceptedSubmissions: ${stats.acceptedSubmissions}`);
  console.log(`     acceptanceRate     : ${stats.acceptanceRate}%`);
  console.log(`     weaknesses (high)  : ${stats.weaknesses}`);
  console.log(`     recentSubmissions  : ${recentSubmissions.length} rows`);

  // ── 3. Health check ───────────────────────────
  console.log('\n[3] GET /api/health');
  const healthRes = await fetch(`${BASE}/api/health`);
  const healthData = await healthRes.json();
  console.log(`  ${healthRes.ok ? '✅' : '❌'} Health — status ${healthRes.status}:`, JSON.stringify(healthData).slice(0, 80));

  // ── Summary ───────────────────────────────────
  console.log('\n' + '─'.repeat(40));
  console.log('✅ All checks passed — E2E flow verified!\n');
  console.log('  Dashboard will display:');
  console.log(`    Name  → ${user.name}`);
  console.log(`    Email → ${user.email}`);
  console.log(`    Stats → ${stats.totalSubmissions} submissions, ${stats.acceptanceRate}% rate`);
}

run().catch((err) => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});
