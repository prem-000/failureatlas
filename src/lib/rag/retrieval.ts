import { prisma } from '@/lib/db/prisma';
import { generateEmbedding, buildFailureEmbeddingContent } from '@/lib/embeddings/pipeline';

export interface RetrievedFailure {
  submissionId: string;
  problemSlug: string;
  problemTitle: string;
  submissionStatus: string;
  code: string;
  similarityScore: number;
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
}

function magnitude(a: number[]): number {
  return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

function normalizeScores(scores: { id: string; score: number }[]): { id: string; score: number }[] {
  if (scores.length === 0) return [];
  const rawValues = scores.map(s => s.score);
  const minVal = Math.min(...rawValues);
  const maxVal = Math.max(...rawValues);

  if (maxVal === minVal) {
    return scores.map(s => ({ id: s.id, score: 0.5 }));
  }

  return scores.map(s => ({
    id: s.id,
    score: (s.score - minVal) / (maxVal - minVal)
  }));
}

export const DEFAULT_RAG_ALPHA = Number(process.env.RAG_RETRIEVAL_ALPHA ?? 0.45);

export function clampScore(score: number): number {
  return Math.min(Math.max(score, 0.0), 1.0);
}

/**
 * Performs hybrid semantic + structural retrieval for similar historical failures.
 * Falls back to graph-only retrieval if embedding generation fails.
 */
export async function retrieveSimilarFailures(
  userId: string,
  eventId: string,
  problemTitle: string,
  difficulty: string,
  topics: string[],
  status: string,
  code: string,
  error?: string,
  limit: number = 3,
  alpha: number = DEFAULT_RAG_ALPHA
): Promise<RetrievedFailure[]> {
  try {
    return await hybridRetrieval(userId, eventId, problemTitle, difficulty, topics, status, code, error, limit, alpha);
  } catch (err) {
    console.warn('⚠️ Hybrid retrieval failed, falling back to graph-only:', err);
    return await graphOnlyRetrieval(userId, eventId, limit, topics);
  }
}

export async function hybridRetrieval(
  userId: string,
  eventId: string,
  problemTitle: string,
  difficulty: string,
  topics: string[],
  status: string,
  code: string,
  error?: string,
  limit: number = 3,
  alpha: number = DEFAULT_RAG_ALPHA
): Promise<RetrievedFailure[]> {
  // -------------------------------------------------------------
  // Branch A: Semantic Embedding Similarity (PostgreSQL / In-Memory)
  // -------------------------------------------------------------
  const queryText = buildFailureEmbeddingContent(problemTitle, difficulty, topics, status, code, error);
  const queryEmbedding = await generateEmbedding(queryText);

  // If embedding generation failed, skip semantic branch entirely
  if (!queryEmbedding) {
    console.warn('⚠️ Embedding generation failed, using graph-only retrieval');
    return await graphOnlyRetrieval(userId, eventId, limit, topics);
  }

  // Pre-filter candidate pool by shared problemTopics before running hybrid fusion
  const hasTopics = Array.isArray(topics) && topics.length > 0;
  let userSubmissions = await prisma.submissionEvent.findMany({
    where: {
      userId,
      NOT: { eventId },
      ...(hasTopics ? {
        problem: {
          topics: { hasSome: topics }
        }
      } : {})
    },
    select: {
      id: true,
      eventId: true,
      status: true,
      code: true,
      problem: {
        select: {
          title: true,
          slug: true,
          topics: true
        }
      }
    }
  });

  // Fallback to all user submissions if topic pre-filtering returned zero candidates
  if (userSubmissions.length === 0 && hasTopics) {
    userSubmissions = await prisma.submissionEvent.findMany({
      where: {
        userId,
        NOT: { eventId }
      },
      select: {
        id: true,
        eventId: true,
        status: true,
        code: true,
        problem: {
          select: {
            title: true,
            slug: true,
            topics: true
          }
        }
      }
    });
  }

  const subIds = userSubmissions.map(s => s.id);
  const embeddings = subIds.length > 0
    ? await prisma.textEmbedding.findMany({
        where: {
          sourceType: 'SubmissionEvent',
          sourceId: { in: subIds }
        }
      })
    : [];

  const submissionsMap = new Map(userSubmissions.map(s => [s.id, s]));
  const semanticScores: { id: string; score: number }[] = [];

  for (const emb of embeddings) {
    if (emb.embedding && Array.isArray(emb.embedding)) {
      const candidateVec = emb.embedding as unknown as number[];
      const sim = cosineSimilarity(queryEmbedding, candidateVec);
      const sub = submissionsMap.get(emb.sourceId);
      if (sub) {
        const subAny = sub as any;
        semanticScores.push({ id: subAny.eventId || subAny.id || '', score: sim });
      }
    }
  }
  const normSemantic = normalizeScores(semanticScores);

  // -------------------------------------------------------------
  // Branch B: Structural Graph Similarity (PostgreSQL)
  // -------------------------------------------------------------
  const currentSub = await prisma.submissionEvent.findUnique({
    where: { eventId },
    select: { problemId: true }
  });
  const currentProblemId = currentSub?.problemId;

  const currentHypotheses = await prisma.rootCauseHypothesis.findMany({
    where: {
      evidence: {
        submission: { eventId }
      }
    },
    select: { rootCauseType: true }
  });
  const currentRcTypes = currentHypotheses.map(h => h.rootCauseType);

  const otherSubmissions = await prisma.submissionEvent.findMany({
    where: {
      userId,
      NOT: { eventId }
    },
    include: {
      evidence: {
        include: {
          rootCauseHypotheses: true
        }
      }
    }
  });

  const graphScores = otherSubmissions.map(sub => {
    const sameProblem = sub.problemId === currentProblemId;
    const otherRcTypes = sub.evidence.flatMap(e => e.rootCauseHypotheses.map(h => h.rootCauseType));
    const sharedCount = otherRcTypes.filter(rc => currentRcTypes.includes(rc)).length;
    const score = (sameProblem ? 2.5 : 0.0) + sharedCount * 3.5;
    return {
      id: sub.eventId,
      score
    };
  });

  const normGraph = normalizeScores(graphScores);

  // -------------------------------------------------------------
  // Hybrid Fusion
  // -------------------------------------------------------------
  const allIds = new Set([
    ...normSemantic.map(s => s.id),
    ...normGraph.map(s => s.id)
  ]);

  const semanticMap = new Map(normSemantic.map(s => [s.id, s.score]));
  const graphMap = new Map(normGraph.map(s => [s.id, s.score]));

  const hybridScores: { id: string; score: number }[] = [];
  for (const id of allIds) {
    const sScore = semanticMap.get(id) ?? 0.0;
    const gScore = graphMap.get(id) ?? 0.0;

    let hybridScore = alpha * sScore + (1 - alpha) * gScore;

    // 20% bonus for appearing in both retrieval branches
    if (semanticMap.has(id) && graphMap.has(id)) {
      hybridScore *= 1.2;
    }

    // Bugfix: Clamp hybrid score so it never exceeds 1.0 (100%)
    hybridScore = clampScore(hybridScore);

    console.log(`[RAG-Hybrid] id=${id} semantic=${sScore.toFixed(3)} graph=${gScore.toFixed(3)} hybrid=${hybridScore.toFixed(3)} (alpha=${alpha})`);

    hybridScores.push({ id, score: hybridScore });
  }

  const topResults = hybridScores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const retrievedFailures: RetrievedFailure[] = [];
  for (const result of topResults) {
    const sub = await prisma.submissionEvent.findUnique({
      where: { eventId: result.id },
      include: { problem: true }
    });

    if (sub) {
      retrievedFailures.push({
        submissionId: sub.eventId,
        problemSlug: sub.problem.slug,
        problemTitle: sub.problem.title,
        submissionStatus: sub.status,
        code: sub.code,
        similarityScore: clampScore(result.score)
      });
    }
  }

  return retrievedFailures;
}

// Alias for backwards compatibility with test scripts
export const hybrid_failure_retrieval = hybridRetrieval;

/**
 * Fallback: graph-only retrieval when embedding generation is unavailable.
 */
export async function graphOnlyRetrieval(
  userId: string,
  eventId: string,
  limit: number,
  topics?: string[]
): Promise<RetrievedFailure[]> {
  try {
    const currentSub = await prisma.submissionEvent.findUnique({
      where: { eventId },
      select: { problemId: true }
    });
    const currentProblemId = currentSub?.problemId;

    const currentHypotheses = await prisma.rootCauseHypothesis.findMany({
      where: {
        evidence: {
          submission: { eventId }
        }
      },
      select: { rootCauseType: true }
    });
    const currentRcTypes = currentHypotheses.map(h => h.rootCauseType);

    const hasTopics = Array.isArray(topics) && topics.length > 0;
    let otherSubmissions = await prisma.submissionEvent.findMany({
      where: {
        userId,
        NOT: { eventId },
        ...(hasTopics ? {
          problem: {
            topics: { hasSome: topics }
          }
        } : {})
      },
      include: {
        evidence: {
          include: {
            rootCauseHypotheses: true
          }
        }
      }
    });

    if (otherSubmissions.length === 0 && hasTopics) {
      otherSubmissions = await prisma.submissionEvent.findMany({
        where: {
          userId,
          NOT: { eventId }
        },
        include: {
          evidence: {
            include: {
              rootCauseHypotheses: true
            }
          }
        }
      });
    }

    const graphScores = otherSubmissions.map(sub => {
      const sameProblem = sub.problemId === currentProblemId;
      const otherRcTypes = sub.evidence.flatMap(e => e.rootCauseHypotheses.map(h => h.rootCauseType));
      const sharedCount = otherRcTypes.filter(rc => currentRcTypes.includes(rc)).length;
      const score = (sameProblem ? 2.5 : 0.0) + sharedCount * 3.5;
      return {
        id: sub.eventId,
        score
      };
    });

    const normGraph = normalizeScores(graphScores);

    const topResults = normGraph
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const retrievedFailures: RetrievedFailure[] = [];
    for (const result of topResults) {
      const sub = await prisma.submissionEvent.findUnique({
        where: { eventId: result.id },
        include: { problem: true }
      });

      if (sub) {
        retrievedFailures.push({
          submissionId: sub.eventId,
          problemSlug: sub.problem.slug,
          problemTitle: sub.problem.title,
          submissionStatus: sub.status,
          code: sub.code,
          similarityScore: clampScore(result.score)
        });
      }
    }

    return retrievedFailures;
  } catch (error) {
    console.error('Error in graphOnlyRetrieval:', error);
    return [];
  }
}