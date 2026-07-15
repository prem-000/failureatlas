import { prisma } from '@/lib/db/prisma';

/**
 * Checks if a practice review state exists for the user and problem, and creates it if not.
 * Invoked whenever an Accepted submission is recorded.
 */
export async function checkAndCreatePracticeReview(
  userId: string,
  problemId: string,
  solveDate: Date = new Date()
) {
  try {
    // 1. Fetch the problem details
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });
    if (!problem) {
      console.warn(`[Scheduler] Problem not found for ID: ${problemId}`);
      return;
    }

    // 2. Determine platform
    let platform = 'LeetCode';
    if (problem.url?.includes('codeforces.com')) platform = 'Codeforces';
    else if (problem.url?.includes('codechef.com')) platform = 'CodeChef';
    else if (problem.url?.includes('atcoder.jp')) platform = 'AtCoder';

    // 3. Check if PracticeReviewState already exists
    const existing = await prisma.practiceReviewState.findUnique({
      where: {
        userId_platform_problemId: {
          userId,
          platform,
          problemId: problem.slug,
        },
      },
    });

    if (existing) {
      return; // Already scheduled, skip to ensure idempotency
    }

    // 4. Create tomorrow's date at midnight for the next review
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // 5. Create the review state
    await prisma.practiceReviewState.create({
      data: {
        userId,
        platform,
        problemId: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        solveDate,
        repetitions: 0,
        easeFactor: 2.5,
        interval: 1,
        nextReview: tomorrow,
      },
    });

    console.log(`[Scheduler] Automatically created review state for user ${userId}, problem ${problem.slug}`);
  } catch (error) {
    console.error('[Scheduler] Error in checkAndCreatePracticeReview:', error);
  }
}

/**
 * Transparently migrates an existing user's accepted submissions into the practice queue.
 * Runs automatically if they have 0 review states but >0 accepted submissions.
 */
export async function runPracticeQueueMigration(userId: string) {
  try {
    // Check if migration is needed:
    // PracticeReviewState Count == 0 AND Accepted Submission Count > 0
    const reviewCount = await prisma.practiceReviewState.count({
      where: { userId },
    });

    if (reviewCount > 0) {
      return { migrated: false, reason: 'Already migrated' };
    }

    const acceptedSubmissions = await prisma.submissionEvent.findMany({
      where: {
        userId,
        status: { in: ['Accepted', 'AC'] },
      },
      include: {
        problem: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (acceptedSubmissions.length === 0) {
      return { migrated: false, reason: 'No accepted submissions' };
    }

    // Deduplicate by problem slug
    const uniqueSubmissions: typeof acceptedSubmissions = [];
    const seenProblems = new Set<string>();
    for (const sub of acceptedSubmissions) {
      const key = `${sub.problem.slug}`;
      if (!seenProblems.has(key)) {
        seenProblems.add(key);
        uniqueSubmissions.push(sub);
      }
    }

    console.log(`[Migration] Running practice queue migration for user ${userId}. ${uniqueSubmissions.length} unique problems found.`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    let migratedCount = 0;

    for (const sub of uniqueSubmissions) {
      let subPlatform = 'LeetCode';
      if (sub.problem.url?.includes('codeforces.com')) subPlatform = 'Codeforces';
      else if (sub.problem.url?.includes('codechef.com')) subPlatform = 'CodeChef';
      else if (sub.problem.url?.includes('atcoder.jp')) subPlatform = 'AtCoder';

      await prisma.practiceReviewState.upsert({
        where: {
          userId_platform_problemId: {
            userId,
            platform: subPlatform,
            problemId: sub.problem.slug,
          },
        },
        update: {}, // Keep existing if it exists
        create: {
          userId,
          platform: subPlatform,
          problemId: sub.problem.slug,
          title: sub.problem.title,
          difficulty: sub.problem.difficulty,
          solveDate: sub.timestamp,
          repetitions: 0,
          easeFactor: 2.5,
          interval: 1,
          nextReview: tomorrow,
        },
      });

      migratedCount++;
    }

    console.log(`[Migration] Successfully migrated ${migratedCount} review states for user ${userId}`);
    return { migrated: true, count: migratedCount };
  } catch (error) {
    console.error('[Migration] Error in runPracticeQueueMigration:', error);
    throw error;
  }
}
