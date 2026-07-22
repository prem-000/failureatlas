import { prisma } from '@/lib/db/prisma';
import type { EngagementReminderEmailData } from '../email/templates/engagementReminder';

export async function generateEngagementDigest(userId: string): Promise<EngagementReminderEmailData | null> {
  const now = new Date();

  // Define Yesterday 00:00 to 23:59 in UTC
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
  const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

  // 1. Query yesterday's submission events
  const yesterdaySubmissionCount = await prisma.submissionEvent.count({
    where: {
      userId,
      timestamp: {
        gte: yesterdayStart,
        lte: yesterdayEnd,
      },
    },
  });

  // If user submitted solutions yesterday, they are NOT inactive => return null
  if (yesterdaySubmissionCount > 0) {
    return null;
  }

  // 2. Query user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  // Calculate overall days inactive (since last submission)
  const lastSubmission = await prisma.submissionEvent.findFirst({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  });

  let daysInactive = 1;
  if (lastSubmission) {
    const diffMs = now.getTime() - new Date(lastSubmission.timestamp).getTime();
    daysInactive = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return {
    userName: user?.name || undefined,
    daysInactive,
    yesterdaySubmissionCount: 0,
    currentStreak: 0,
    suggestedDifficulty: 'Easy',
    estimatedPracticeTime: 15,
    dashboardUrl: `${baseUrl}/dashboard`,
    baseUrl,
  };
}
