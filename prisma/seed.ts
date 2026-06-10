import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.textEmbedding.deleteMany();
  await prisma.learningRecommendation.deleteMany();
  await prisma.learningStrategy.deleteMany();
  await prisma.systemicWeakness.deleteMany();
  await prisma.diagnosisResult.deleteMany();
  await prisma.rootCauseHypothesis.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.submissionEvent.deleteMany();
  await prisma.rootCauseOccurrence.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.learningPlan.deleteMany();
  await prisma.user.deleteMany();

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
    },
  });

  console.log(`Created user: ${testUser.email}`);

  // Create test problems
  const problems = await prisma.problem.createMany({
    data: [
      {
        slug: 'two-sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        topics: ['Array', 'Hash Table'],
        url: 'https://leetcode.com/problems/two-sum/',
      },
      {
        slug: 'longest-substring-without-repeating-characters',
        title: 'Longest Substring Without Repeating Characters',
        difficulty: 'Medium',
        topics: ['Hash Table', 'String', 'Sliding Window'],
        url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
      },
      {
        slug: 'median-of-two-sorted-arrays',
        title: 'Median of Two Sorted Arrays',
        difficulty: 'Hard',
        topics: ['Array', 'Binary Search', 'Divide and Conquer'],
        url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
      },
    ],
  });

  console.log(`Created ${problems.count} problems`);

  // Get problem IDs
  const [twoSum, longestSubstring, medianOfTwoArrays] = await prisma.problem.findMany();

  // Create systemic weaknesses
  const weaknesses = await prisma.systemicWeakness.createMany({
    data: [
      {
        name: 'Boundary Condition Handling',
        type: 'edge-case-reasoning',
        severity: 'high',
        confidence: 0.85,
        frequency: 5,
        riskIndex: 7.5,
        pageRankScore: 0.42,
      },
      {
        name: 'Time Complexity Analysis',
        type: 'performance-analysis',
        severity: 'high',
        confidence: 0.78,
        frequency: 3,
        riskIndex: 6.8,
        pageRankScore: 0.38,
      },
      {
        name: 'Pattern Recognition',
        type: 'algorithmic-pattern-recognition',
        severity: 'medium',
        confidence: 0.72,
        frequency: 4,
        riskIndex: 5.2,
        pageRankScore: 0.31,
      },
    ],
  });

  console.log(`Created ${weaknesses.count} systemic weaknesses`);

  // Get weakness IDs
  const allWeaknesses = await prisma.systemicWeakness.findMany();
  const boundaryWeakness = allWeaknesses[0];
  const timeComplexityWeakness = allWeaknesses[1];

  // Create test submission
  const submission = await prisma.submissionEvent.create({
    data: {
      userId: testUser.id,
      problemId: twoSum.id,
      eventId: 'event-001',
      sessionId: 'session-001',
      timestamp: new Date(),
      status: 'Wrong Answer',
      language: 'python3',
      code: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        for i in range(len(nums)):
            for j in range(i+1, len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j]`,
      timeSpent: 1200,
      attemptNumber: 3,
      testCasesPassed: 54,
      totalTestCases: 57,
      failedTestCase: '[2,7,11,15]\\nTarget: 9',
      rapidSubmission: true,
    },
  });

  console.log(`Created submission: ${submission.id}`);

  // Create evidence
  const evidence = await prisma.evidence.create({
    data: {
      submissionId: submission.id,
      type: 'code_diff',
      description: 'Off-by-one error in loop bounds check',
      confidence: 0.88,
      source: 'ast_diff',
      rawData: {
        diff: '- while left < right\\n+ while left <= right',
        lines_added: 1,
        lines_removed: 1,
      },
    },
  });

  console.log(`Created evidence: ${evidence.id}`);

  // Create root cause hypothesis
  const rootCause = await prisma.rootCauseHypothesis.create({
    data: {
      evidenceId: evidence.id,
      rootCauseType: 'boundary-condition-error',
      name: 'Off-by-one boundary error',
      confidence: 0.91,
    },
  });

  console.log(`Created root cause hypothesis: ${rootCause.id}`);

  // Create diagnosis result
  const diagnosis = await prisma.diagnosisResult.create({
    data: {
      userId: testUser.id,
      submissionId: submission.id,
      primaryWeaknessId: boundaryWeakness.id,
      progressMetrics: {
        estimatedRecoveryTime: '2 weeks',
        relatedProblems: 12,
        similarPatterns: 3,
      },
    },
  });

  console.log(`Created diagnosis result: ${diagnosis.id}`);

  // Create learning strategies
  const strategy = await prisma.learningStrategy.create({
    data: {
      weaknessId: boundaryWeakness.id,
      name: 'Boundary Condition Mastery',
      description:
        'Systematic practice with off-by-one errors, inclusive/exclusive bounds, and edge cases',
      estimatedTime: 480,
      priority: 'high',
      practiceProblems: [
        'two-sum',
        'valid-palindrome',
        'container-with-most-water',
      ],
    },
  });

  console.log(`Created learning strategy: ${strategy.id}`);

  // Create learning recommendation
  const recommendation = await prisma.learningRecommendation.create({
    data: {
      diagnosisId: diagnosis.id,
      strategyId: strategy.id,
      completed: false,
    },
  });

  console.log(`Created learning recommendation: ${recommendation.id}`);

  // Create API key
  const apiKey = await prisma.apiKey.create({
    data: {
      key: 'test-api-key-' + Math.random().toString(36).substring(7),
      name: 'Test API Key',
      active: true,
    },
  });

  console.log(`Created API key: ${apiKey.name}`);

  console.log('✅ Database seeding completed!');
}

main()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
