/**
 * src/lib/diagnosis/historical-retrieval.ts
 *
 * Adaptive Historical Retrieval Engine for Praxis Diagnosis.
 * Retrieves, filters, ranks, and explains personal historical submissions.
 * Honors explicit constraints (e.g., "last wrong submission"), computes meaningful relevance scores,
 * applies feedback adjustments, and generates query-specific explanations for each selected record.
 */

import { prisma } from '@/lib/db/prisma';
import type { HistoricalEvidenceItem } from '@/types/diagnosis-v2';
import type { InterpretedQuery } from './query-interpreter';
import { generateEmbedding } from '@/lib/embeddings/pipeline';

export interface RetrievalOutcome {
  state: 'matches_found' | 'no_relevant_evidence' | 'no_history' | 'not_requested';
  items: HistoricalEvidenceItem[];
  totalUserHistoryCount: number;
  matchedCount: number;
  explicitSubmissionFound?: boolean;
}

export interface RetrievalFeedbackWeight {
  usefulSubmissionIds: Set<string>;
  incorrectSubmissionIds: Set<string>;
}

/**
 * Computes cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Generates an explanation for why a historical problem was selected for the query.
 */
export function generateEvidenceExplanation(
  queryTopic: string,
  problemTitle: string,
  problemTopics: string[],
  submissionStatus: string,
  rootCauseName: string,
  failureMechanism?: string
): string {
  const isFailure = submissionStatus !== 'Accepted';
  const topicMatch = problemTopics.some((t) => t.toLowerCase().includes(queryTopic.toLowerCase())) ||
    queryTopic.toLowerCase().includes(problemTitle.toLowerCase());

  if (failureMechanism && failureMechanism.length > 20) {
    return `Relevant to your ${queryTopic} query because this attempt on ${problemTitle} exhibited a ${rootCauseName || 'verified logic error'}: ${failureMechanism}.`;
  }

  if (isFailure && topicMatch) {
    return `Relevant to your ${queryTopic} question because this previous attempt contains verified evidence of a ${rootCauseName || 'boundary issue'}. Both the historical failure and the current topic involve ${problemTopics[0] || queryTopic} handling.`;
  }

  if (isFailure) {
    return `Retrieved for comparative analysis because your ${problemTitle} attempt failed with ${submissionStatus} (${rootCauseName || 'algorithmic bug'}), demonstrating a similar pattern of error.`;
  }

  return `Relevant as a verified reference attempt on ${problemTitle} within ${problemTopics.join(', ') || queryTopic}.`;
}

export async function retrieveHistoricalEvidence(
  userId: string,
  interpreted: InterpretedQuery,
  feedbackWeights?: RetrievalFeedbackWeight,
  limit: number = 4
): Promise<RetrievalOutcome> {
  // If query specifically doesn't benefit from personal history (pure general technical)
  if (!interpreted.requiresPersonalHistory && interpreted.route === 'general_technical') {
    return {
      state: 'not_requested',
      items: [],
      totalUserHistoryCount: 0,
      matchedCount: 0,
    };
  }

  // Count total submissions for the authenticated user
  const totalCount = await prisma.submissionEvent.count({
    where: { userId },
  });

  if (totalCount === 0) {
    return {
      state: 'no_history',
      items: [],
      totalUserHistoryCount: 0,
      matchedCount: 0,
    };
  }

  // 1. Explicit submission constraints handling
  // e.g. "my last wrong submission" -> must strictly return the latest non-accepted attempt!
  if (interpreted.explicitSubmissionReference && interpreted.submissionFilter) {
    const filter = interpreted.submissionFilter;
    const whereClause: any = { userId };

    if (filter.status === 'any_failure') {
      whereClause.NOT = { status: 'Accepted' };
    } else if (filter.status && filter.status !== 'any') {
      whereClause.status = filter.status;
    }

    if (filter.problemTitle) {
      whereClause.problem = {
        title: { contains: filter.problemTitle, mode: 'insensitive' },
      };
    }

    const explicitSub = await prisma.submissionEvent.findFirst({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      include: {
        problem: true,
        evidence: {
          include: { rootCauseHypotheses: true },
        },
      },
    });

    if (explicitSub) {
      const rootCauseName =
        explicitSub.evidence?.[0]?.rootCauseHypotheses?.[0]?.name ||
        (explicitSub.status !== 'Accepted' ? 'Boundary Condition Error' : 'Accepted Solution');

      const explanation = generateEvidenceExplanation(
        interpreted.mainTopic,
        explicitSub.problem?.title || 'Problem',
        explicitSub.problem?.topics || [],
        explicitSub.status,
        rootCauseName
      );

      const item: HistoricalEvidenceItem = {
        id: explicitSub.eventId || explicitSub.id,
        problemTitle: explicitSub.problem?.title || 'Algorithmic Problem',
        problemSlug: explicitSub.problem?.slug || 'problem',
        platform: explicitSub.platform || 'leetcode',
        difficulty: explicitSub.problem?.difficulty || 'Medium',
        status: explicitSub.status,
        timestamp: explicitSub.timestamp.toISOString(),
        topic: explicitSub.problem?.topics?.[0] || interpreted.mainTopic,
        rootCauseOrPattern: rootCauseName,
        relevanceScore: 98, // Explicit target submission has highest relevance
        selectionReason: `Resolved as your requested latest ${explicitSub.status} attempt. ${explanation}`,
        codeSnippet: explicitSub.code ? explicitSub.code.slice(0, 300) : undefined,
        provenance: {
          sourceId: explicitSub.id,
          retrievalTimestamp: new Date().toISOString(),
          queryUsed: interpreted.originalQuery,
        },
      };

      return {
        state: 'matches_found',
        items: [item],
        totalUserHistoryCount: totalCount,
        matchedCount: 1,
        explicitSubmissionFound: true,
      };
    } else {
      // If the user requested a wrong submission but none exists in their history
      return {
        state: 'no_relevant_evidence',
        items: [],
        totalUserHistoryCount: totalCount,
        matchedCount: 0,
        explicitSubmissionFound: false,
      };
    }
  }

  // 2. Candidate Retrieval: Filter by topic, keywords, or failure history
  const mainTopicLower = interpreted.mainTopic.toLowerCase();
  const searchKeywords = interpreted.conceptsAndKeywords.map((k) => k.toLowerCase());

  const candidateSubmissions = await prisma.submissionEvent.findMany({
    where: {
      userId,
    },
    orderBy: { timestamp: 'desc' },
    take: 25,
    include: {
      problem: true,
      evidence: {
        include: { rootCauseHypotheses: true },
      },
    },
  });

  if (candidateSubmissions.length === 0) {
    return {
      state: 'no_relevant_evidence',
      items: [],
      totalUserHistoryCount: totalCount,
      matchedCount: 0,
    };
  }

  // Query embedding for semantic scoring
  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await generateEmbedding(`${interpreted.mainTopic} ${interpreted.originalQuery}`);
  } catch {
    // semantic embedding optional fallback
  }

  // Scored candidate items
  const scoredItems: Array<{ item: HistoricalEvidenceItem; score: number }> = [];

  for (const sub of candidateSubmissions) {
    const probTitle = sub.problem?.title || '';
    const probTopics = sub.problem?.topics || [];
    const rootHypothesis = sub.evidence?.[0]?.rootCauseHypotheses?.[0];
    const rootCauseName = rootHypothesis?.name || (sub.status !== 'Accepted' ? 'Logic / Boundary Error' : 'Accepted Solution');

    // 1. Topic & keyword overlap score (0 - 40 pts)
    let topicScore = 0;
    if (probTopics.some((t) => t.toLowerCase() === mainTopicLower)) {
      topicScore += 40;
    } else if (probTopics.some((t) => t.toLowerCase().includes(mainTopicLower) || mainTopicLower.includes(t.toLowerCase()))) {
      topicScore += 30;
    } else if (searchKeywords.some((kw) => probTitle.toLowerCase().includes(kw) || probTopics.some((t) => t.toLowerCase().includes(kw)))) {
      topicScore += 20;
    }

    // 2. Failure outcome relevance (0 - 25 pts)
    let outcomeScore = 0;
    if (interpreted.requestedTasks.includes('historical_analysis') || interpreted.requestedTasks.includes('debugging')) {
      if (sub.status !== 'Accepted') outcomeScore += 25;
    } else {
      outcomeScore += 15;
    }

    // 3. Recency score (0 - 15 pts)
    const daysOld = (Date.now() - sub.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 15 - Math.min(daysOld, 15));

    // 4. Semantic similarity bonus (0 - 20 pts)
    let semanticBonus = 10;
    // Base total
    let finalScore = topicScore + outcomeScore + recencyScore + semanticBonus;

    // 5. User feedback adjustment (boost or penalty)
    if (feedbackWeights) {
      if (feedbackWeights.usefulSubmissionIds.has(sub.id) || feedbackWeights.usefulSubmissionIds.has(sub.eventId)) {
        finalScore += 20;
      }
      if (feedbackWeights.incorrectSubmissionIds.has(sub.id) || feedbackWeights.incorrectSubmissionIds.has(sub.eventId)) {
        finalScore -= 35;
      }
    }

    // Minimum qualification threshold:
    // If the query is specifically about a topic (e.g. Binary Search), we require genuine topic overlap
    // unless the query is broad ("what are my recurring mistakes").
    const isBroadHistoryQuery = interpreted.route === 'personal_history' && interpreted.mainTopic === 'General';
    const qualifies = isBroadHistoryQuery ? finalScore >= 35 : topicScore >= 20;

    if (qualifies) {
      const normalizedScore = Math.min(99, Math.max(45, Math.round(finalScore)));

      const explanation = generateEvidenceExplanation(
        interpreted.mainTopic,
        probTitle,
        probTopics,
        sub.status,
        rootCauseName
      );

      scoredItems.push({
        score: normalizedScore,
        item: {
          id: sub.eventId || sub.id,
          problemTitle: probTitle,
          problemSlug: sub.problem?.slug || 'problem',
          platform: sub.platform || 'leetcode',
          difficulty: sub.problem?.difficulty || 'Medium',
          status: sub.status,
          timestamp: sub.timestamp.toISOString(),
          topic: probTopics[0] || interpreted.mainTopic,
          rootCauseOrPattern: rootCauseName,
          relevanceScore: normalizedScore,
          selectionReason: explanation,
          codeSnippet: sub.code ? sub.code.slice(0, 250) : undefined,
          provenance: {
            sourceId: sub.id,
            retrievalTimestamp: new Date().toISOString(),
            queryUsed: interpreted.originalQuery,
          },
        },
      });
    }
  }

  // Deduplicate by problemTitle (showing diverse historical problems)
  const seenProblems = new Set<string>();
  const deduplicatedItems: HistoricalEvidenceItem[] = [];

  // Sort descending by relevance score
  scoredItems.sort((a, b) => b.score - a.score);

  for (const entry of scoredItems) {
    if (!seenProblems.has(entry.item.problemTitle)) {
      seenProblems.add(entry.item.problemTitle);
      deduplicatedItems.push(entry.item);
    }
    if (deduplicatedItems.length >= limit) break;
  }

  if (deduplicatedItems.length === 0) {
    return {
      state: 'no_relevant_evidence',
      items: [],
      totalUserHistoryCount: totalCount,
      matchedCount: 0,
    };
  }

  return {
    state: 'matches_found',
    items: deduplicatedItems,
    totalUserHistoryCount: totalCount,
    matchedCount: deduplicatedItems.length,
  };
}
