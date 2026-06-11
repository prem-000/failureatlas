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
  alpha: number = 0.6
): Promise<RetrievedFailure[]> {
  try {
    return await hybridRetrieval(userId, eventId, problemTitle, difficulty, topics, status, code, error, limit, alpha);
  } catch (err) {
    console.warn('⚠️ Hybrid retrieval failed, falling back to graph-only:', err);
    return await graphOnlyRetrieval(userId, eventId, limit);
  }
}

async function hybridRetrieval(
  userId: string,
  eventId: string,
  problemTitle: string,
  difficulty: string,
  topics: string[],
  status: string,
  code: string,
  error?: string,
  limit: number = 3,
  alpha: number = 0.6
): Promise<RetrievedFailure[]> {
  // -------------------------------------------------------------
  // Branch A: Semantic Embedding Similarity (PostgreSQL / In-Memory)
  // -------------------------------------------------------------
  const queryText = buildFailureEmbeddingContent(problemTitle, difficulty, topics, status, code, error);
  const queryEmbedding = await generateEmbedding(queryText);

  // If embedding generation failed, skip semantic branch entirely
  if (!queryEmbedding) {
    console.warn('⚠️ Embedding generation failed, using graph-only retrieval');
    return await graphOnlyRetrieval(userId, eventId, limit);
  }

  const userSubmissions = await prisma.submissionEvent.findMany({
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
          slug: true
        }
      }
    }
  });

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
        semanticScores.push({ id: sub.eventId, score: sim });
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
        similarityScore: result.score
      });
    }
  }

  return retrievedFailures;
}

/**
 * Fallback: graph-only retrieval when embedding generation is unavailable.
 */
async function graphOnlyRetrieval(
  userId: string,
  eventId: string,
  limit: number
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

    const topResults = graphScores
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
          similarityScore: result.score
        });
      }
    }

    return retrievedFailures;
  } catch (error) {
    console.error('Error in graphOnlyRetrieval:', error);
    return [];
  }
}