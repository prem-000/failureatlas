import { prisma } from '@/lib/db/prisma';
import type { DailyFailureSummaryData, FailedProblemItem, CategoryTrendItem } from '../email/templates/dailyFailureSummary';

export async function generateDailyFailureDigest(userId: string): Promise<DailyFailureSummaryData | null> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 1. Fetch today's submissions for user
  const todaySubmissions = await prisma.submissionEvent.findMany({
    where: {
      userId,
      timestamp: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      problem: true,
      diagnosis: {
        include: {
          primaryWeakness: true,
        },
      },
      failureExplanation: true,
    },
    orderBy: { timestamp: 'desc' },
  });

  if (todaySubmissions.length === 0) {
    return null;
  }

  const acceptedSubmissions = todaySubmissions.filter(s => s.status === 'Accepted');
  const failedSubmissions = todaySubmissions.filter(s => s.status !== 'Accepted');

  // If user had no failed submissions today, return null (do not send email)
  if (failedSubmissions.length === 0) {
    return null;
  }

  // 2. Format failed problems
  const failedProblems: FailedProblemItem[] = failedSubmissions.map(sub => {
    const rootCause = sub.failureExplanation?.rootCause || sub.diagnosis?.primaryWeakness?.name || 'Algorithmic Flaw';
    const category = sub.failureExplanation?.rootCauseCategory || sub.diagnosis?.primaryWeakness?.type || 'General';
    const confidence = Math.round((sub.failureExplanation?.confidence || sub.diagnosis?.primaryWeakness?.confidence || 0.85) * 100);
    const aiSuggestion = sub.failureExplanation?.recommendation || 'Review corner test cases and invariant bounds before submitting.';

    return {
      title: sub.problem.title,
      slug: sub.problem.slug,
      verdict: sub.status || 'Wrong Answer',
      rootCause,
      category,
      confidence,
      aiSuggestion,
    };
  });

  // 3. Compute category trends comparing today to the last 7 days
  const sevenDaysAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pastFailures = await prisma.submissionEvent.findMany({
    where: {
      userId,
      status: { not: 'Accepted' },
      timestamp: {
        gte: sevenDaysAgo,
        lt: startOfDay,
      },
    },
    include: {
      failureExplanation: true,
      diagnosis: { include: { primaryWeakness: true } },
    },
  });

  const categoryCountsPast: Record<string, number> = {};
  for (const f of pastFailures) {
    const cat = f.failureExplanation?.rootCauseCategory || f.diagnosis?.primaryWeakness?.type || 'General';
    categoryCountsPast[cat] = (categoryCountsPast[cat] || 0) + 1;
  }

  const categoryCountsToday: Record<string, number> = {};
  for (const f of failedProblems) {
    categoryCountsToday[f.category] = (categoryCountsToday[f.category] || 0) + 1;
  }

  const categoryTrends: CategoryTrendItem[] = Object.keys(categoryCountsToday).map(cat => {
    const todayCount = categoryCountsToday[cat];
    const pastAvg = (categoryCountsPast[cat] || 0) / 7;
    const diff = todayCount - pastAvg;
    const pctChange = pastAvg > 0 ? Math.round((diff / pastAvg) * 100) : 100;

    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    let changeStr = `${pctChange > 0 ? '+' : ''}${pctChange}%`;

    if (pctChange > 5) {
      direction = 'up'; // Increase in errors
      changeStr = `↑${Math.abs(pctChange)}%`;
    } else if (pctChange < -5) {
      direction = 'down'; // Decrease in errors (improvement)
      changeStr = `↓${Math.abs(pctChange)}%`;
    }

    return {
      category: cat,
      change: changeStr,
      direction,
    };
  });

  // 4. Generate AI Insight and Recommended Concepts
  const topCategories = Array.from(new Set(failedProblems.map(p => p.category)));
  const aiInsight = `Based on today's performance, errors heavily concentrated in ${topCategories.join(', ')}. Pay special attention to loop invariants and boundary edge conditions.`;

  const recommendedConcepts = Array.from(
    new Set(failedProblems.map(p => p.rootCause))
  ).slice(0, 3);

  const dateStr = startOfDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return {
    date: dateStr,
    totalAttempted: todaySubmissions.length,
    acceptedCount: acceptedSubmissions.length,
    failedCount: failedSubmissions.length,
    failedProblems,
    categoryTrends,
    aiInsight,
    recommendedConcepts,
  };
}
