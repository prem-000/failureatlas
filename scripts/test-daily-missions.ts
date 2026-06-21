import { prisma } from '../src/lib/db/prisma';
import { generateDailyMission } from '../src/lib/missions/generator';
import { compileMissionEmailHtml } from '../src/lib/email/resend';

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
    console.log(`👤 Found existing Google user: ${user.email} (id=${user.id})`);
  }

  // 3. Ensure some failure history exists for realistic risk and hints calculation
  const testProblem = await prisma.problem.findFirst({ where: { slug: 'two-sum' } });
  if (testProblem) {
    // Add a couple of failures
    const existingFailure = await prisma.submissionEvent.findFirst({
      where: { userId: user.id, problemId: testProblem.id, NOT: { status: 'Accepted' } }
    });

    if (!existingFailure) {
      console.log('📊 Seeding dummy failures to verify AI hint / weakness graph calculation...');
      
      const boundaryWeakness = await prisma.systemicWeakness.upsert({
        where: { name: 'boundary-condition-error' },
        update: {},
        create: {
          name: 'boundary-condition-error',
          type: 'edge-case-reasoning',
          severity: 'high',
          confidence: 0.85,
          frequency: 5,
          riskIndex: 7.5,
          pageRankScore: 0.42
        }
      });

      const submission = await prisma.submissionEvent.create({
        data: {
          userId: user.id,
          problemId: testProblem.id,
          eventId: `test-event-${Date.now()}`,
          sessionId: 'test-session',
          timestamp: new Date(),
          status: 'Wrong Answer',
          language: 'python3',
          code: 'def twoSum(nums, target): return [0, 0]',
          timeSpent: 300,
          attemptNumber: 1,
          testCasesPassed: 10,
          totalTestCases: 50,
          failedTestCase: '[2,7,11,15]\nTarget: 9',
          rapidSubmission: false
        }
      });

      const evidence = await prisma.evidence.create({
        data: {
          submissionId: submission.id,
          type: 'code_diff',
          description: 'Boundary error checking empty arrays',
          confidence: 0.9,
          source: 'ast_diff'
        }
      });

      await prisma.rootCauseHypothesis.create({
        data: {
          evidenceId: evidence.id,
          rootCauseType: 'boundary-condition-error',
          name: 'Off-by-one boundary error',
          confidence: 0.95
        }
      });

      await prisma.diagnosisResult.create({
        data: {
          userId: user.id,
          submissionId: submission.id,
          primaryWeaknessId: boundaryWeakness.id,
          progressMetrics: {
            estimatedRecoveryTime: '2 weeks'
          }
        }
      });
    }
  }

  // 4. Generate the daily mission!
  console.log('⚡ Generating daily mission...');
  try {
    const mission = await generateDailyMission(user.id);
    console.log('\n👑 Generated Mission Results:');
    console.log(JSON.stringify(mission, null, 2));

    // Compile email HTML to verify it renders without errors
    console.log('\n✉️ Compiling preview HTML email...');
    const html = compileMissionEmailHtml(1, mission.primaryProblem.stage, 45, mission);
    console.log(`✅ Email HTML compiled successfully. Size: ${html.length} bytes.`);

  } catch (error) {
    console.error('❌ Generator failed:', error);
  }
}

runTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
