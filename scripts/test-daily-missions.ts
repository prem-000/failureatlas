import { prisma } from '../src/lib/db/prisma';
import { generateHtml } from '../src/lib/email/templates/dailyMission';
import { generateDailyMissionDigest } from '../src/lib/notifications/dailyMissionDigest';

async function runTest() {
  console.log('🧪 Starting Daily Mission Coach Test Workflow...');

  // 1. Ensure we have LeetCode problems seeded
  const problemsCount = await prisma.leetcodeProblem.count();
  console.log(`📚 Database contains ${problemsCount} seeded Leetcode problems.`);
  if (problemsCount === 0) {
    console.log('⚠️ No problems found. Please run "npm run prisma:seed" or "npx tsx prisma/leetcode-seed.ts" first.');
    return;
  }

  // 2. Find or create a test user authenticated through Google OAuth
  let user = await prisma.user.findFirst({
    where: { provider: 'google' }
  });

  if (!user) {
    console.log('⚠️ No Google OAuth test user found. Fetching first available user...');
    user = await prisma.user.findFirst();
  }

  if (!user) {
    console.log('👤 Creating a Google OAuth test user...');
    user = await prisma.user.create({
      data: {
        email: 'coach-test@example.com',
        name: 'Coach Test User',
        provider: 'google',
        providerId: 'google-test-id-12345',
        apiKey: 'fa_test_api_key_for_daily_coach'
      }
    });
  } else {
    console.log(`👤 Found existing user: ${user.email} (id=${user.id})`);
  }

  try {
    const digestData = await generateDailyMissionDigest(user.id);
    console.log('\n👑 Generated Mission Results:');
    console.log(JSON.stringify(digestData, null, 2));

    // Compile email HTML to verify it renders without errors
    console.log('\n✉️ Compiling preview HTML email...');
    const html = generateHtml(digestData);
    console.log(`✅ Email HTML compiled successfully. Size: ${html.length} bytes.`);

  } catch (error) {
    console.error('❌ Generator failed:', error);
  }
}

runTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
