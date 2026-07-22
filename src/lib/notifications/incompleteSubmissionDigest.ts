import { prisma } from '@/lib/db/prisma';
import type { IncompleteSubmissionEmailData } from '../email/templates/incompleteSubmission';

export async function generateIncompleteSubmissionDigest(userId: string): Promise<IncompleteSubmissionEmailData | null> {
  const now = new Date();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
  const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

  // 1. Query yesterday's total submissions for user
  const yesterdaySubmissions = await prisma.submissionEvent.findMany({
    where: {
      userId,
      timestamp: {
        gte: yesterdayStart,
        lte: yesterdayEnd,
      },
    },
    select: { id: true, status: true },
  });

  // Did the user start solving at least one problem?
  // User started if yesterdaySubmissions.length > 0
  if (yesterdaySubmissions.length === 0) {
    return null; // Did not start solving yesterday
  }

  // Did the user submit an Accepted solution yesterday?
  const hasAccepted = yesterdaySubmissions.some(s => s.status === 'Accepted');
  if (hasAccepted) {
    return null; // Completed an accepted solution, so not an incomplete submission
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return {
    userName: user?.name || undefined,
    problemCount: yesterdaySubmissions.length,
    baseUrl,
  };
}
