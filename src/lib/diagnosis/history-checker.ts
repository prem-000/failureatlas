/**
 * src/lib/diagnosis/history-checker.ts
 *
 * Checks user history for matching failure patterns:
 * 1. Same preliminary root cause in FailureExplanation or Evidence
 * 2. Same problem topics / skills in past failed submissions
 * 3. Calibrated k-NN cosine similarity (threshold >= 0.68)
 *
 * Excludes the current submission event from its own history!
 */

import { prisma } from '@/lib/db/prisma';
import type { RetrievedFailure } from '@/lib/rag/retrieval';

export interface HistoryCheckResult {
  hasHistory: boolean;
  count: number;
  historyIds: string[];
  similarFailures: Array<{
    id: string;
    problemTitle: string;
    problemDifficulty: string;
    status: string;
    timestamp: string;
    similarity: number;
    verdict?: string;
    diffSnippet?: string;
  }>;
  headerText?: string;
}

export async function checkFailureHistory(params: {
  userId: string;
  currentEventId?: string;
  rootCauseId: string;
  rootCauseName: string;
  problemTopics?: string[];
  retrievedFailures?: RetrievedFailure[];
  similarityThreshold?: number;
}): Promise<HistoryCheckResult> {
  const {
    userId,
    currentEventId,
    rootCauseId,
    rootCauseName,
    problemTopics = [],
    retrievedFailures = [],
    similarityThreshold = 0.68,
  } = params;

  // Filter out current submission from retrieved vector results
  const filteredRetrieved = retrievedFailures.filter(
    (rf) => rf.submissionId !== currentEventId && rf.similarityScore >= similarityThreshold
  );

  // 1. Query past failures for this user matching the root cause in FailureExplanation
  const pastExplanations = await prisma.failureExplanation.findMany({
    where: {
      submission: {
        userId,
        eventId: { not: currentEventId },
        NOT: { status: 'Accepted' },
      },
      OR: [
        { rootCause: { contains: rootCauseId, mode: 'insensitive' } },
        { rootCause: { contains: rootCauseName, mode: 'insensitive' } },
      ],
    },
    include: {
      submission: {
        include: { problem: true },
      },
    },
    orderBy: { generatedAt: 'desc' },
    take: 10,
  });

  // 2. Query past failed submissions matching skill/topics if topics provided
  const pastTopicFailures =
    problemTopics.length > 0
      ? await prisma.submissionEvent.findMany({
          where: {
            userId,
            eventId: { not: currentEventId },
            NOT: { status: 'Accepted' },
            problem: {
              topics: { hasSome: problemTopics },
            },
          },
          include: { problem: true },
          orderBy: { timestamp: 'desc' },
          take: 10,
        })
      : [];

  // Combine unique historical IDs
  const historyIdSet = new Set<string>();
  const similarItemsMap = new Map<
    string,
    {
      id: string;
      problemTitle: string;
      problemDifficulty: string;
      status: string;
      timestamp: string;
      similarity: number;
      verdict?: string;
      diffSnippet?: string;
    }
  >();

  // Add from past explanations
  for (const exp of pastExplanations) {
    const s = exp.submission;
    if (!s) continue;
    historyIdSet.add(s.eventId);
    similarItemsMap.set(s.eventId, {
      id: s.eventId,
      problemTitle: s.problem.title,
      problemDifficulty: s.problem.difficulty,
      status: s.status,
      timestamp: s.timestamp.toISOString(),
      similarity: 0.9,
      verdict: exp.reason || exp.rootCause,
      diffSnippet: s.code?.slice(0, 160),
    });
  }

  // Add from vector similarity search
  for (const rf of filteredRetrieved) {
    historyIdSet.add(rf.submissionId);
    if (!similarItemsMap.has(rf.submissionId)) {
      similarItemsMap.set(rf.submissionId, {
        id: rf.submissionId,
        problemTitle: rf.problemTitle,
        problemDifficulty: 'Medium',
        status: rf.submissionStatus,
        timestamp: new Date().toISOString(),
        similarity: rf.similarityScore,
        verdict: `Similar pattern detected (${Math.round(rf.similarityScore * 100)}% match)`,
        diffSnippet: rf.code?.slice(0, 160),
      });
    }
  }

  // Add from topic failures
  for (const tf of pastTopicFailures) {
    historyIdSet.add(tf.eventId);
    if (!similarItemsMap.has(tf.eventId)) {
      similarItemsMap.set(tf.eventId, {
        id: tf.eventId,
        problemTitle: tf.problem.title,
        problemDifficulty: tf.problem.difficulty,
        status: tf.status,
        timestamp: tf.timestamp.toISOString(),
        similarity: 0.78,
        verdict: `Failed on ${tf.problem.topics[0] || 'algorithm'}`,
        diffSnippet: tf.code?.slice(0, 160),
      });
    }
  }

  const historyIds = Array.from(historyIdSet);
  const count = historyIds.length;
  const hasHistory = count > 0;

  // Compute header text e.g. "4th boundary error · 3 on binary search"
  let headerText: string | undefined = undefined;
  if (hasHistory) {
    const topicCount = pastTopicFailures.length;
    const topTopic = problemTopics[0] || 'similar problems';
    const ordinal = getOrdinal(count + 1);
    const shortCause = rootCauseName.toLowerCase().replace(' error', '').replace(' oversight', '');
    headerText = `${ordinal} ${shortCause} error${topicCount > 0 ? ` · ${topicCount} on ${topTopic}` : ` · ${count} past occurrences`}`;
  }

  return {
    hasHistory,
    count,
    historyIds,
    similarFailures: Array.from(similarItemsMap.values()).slice(0, 6),
    headerText,
  };
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
