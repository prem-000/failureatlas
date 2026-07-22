import { prisma } from '@/lib/db/prisma';
import type { PracticeReminderEmailData } from '../email/templates/practiceReminder';

export async function generatePracticeDigest(userId: string): Promise<PracticeReminderEmailData | null> {
  const now = new Date();

  // Find due items in SM-2 queue
  const dueItems = await prisma.practiceReviewState.findMany({
    where: {
      userId,
      nextReview: { lte: now },
    },
    take: 10,
  });

  if (dueItems.length === 0) {
    return null;
  }

  const dueTopics = Array.from(new Set(dueItems.map(item => item.platform || 'LeetCode')));
  const estimatedTimeMinutes = Math.max(5, dueItems.length * 4);

  return {
    dueCount: dueItems.length,
    dueTopics: dueTopics.length > 0 ? dueTopics : ['Arrays', 'Dynamic Programming'],
    estimatedTimeMinutes,
  };
}
