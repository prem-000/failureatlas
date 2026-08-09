/**
 * mcp/src/services/failureatlas-api.ts
 * Reusable FailureAtlas service layer wrapper for MCP tools
 */

import { prisma } from '@/lib/db/prisma';
import { getUserFailureSubgraph, getTopWeaknesses } from '@/lib/graph/operations';
import { retrieveSimilarFailures } from '@/lib/rag/retrieval';
import { generateAIDiagnosis } from '@/lib/diagnosis/generator';
import {
  UserProfileResult,
  CompactFailureItem,
  FailureSearchResult,
  WeaknessItem,
  StructuredDiagnosisOutput,
  LearningRecommendationItem,
} from '../types/index';
import { FailureAtlasMcpError } from '../utils/errors';

export class FailureAtlasApiService {
  /**
   * 1. Get User Profile and high-level statistics
   */
  public async getUserProfile(userId: string): Promise<UserProfileResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw FailureAtlasMcpError.userNotFound();
    }

    const [totalSubmissions, acceptedSubmissions] = await Promise.all([
      prisma.submissionEvent.count({ where: { userId } }),
      prisma.submissionEvent.count({ where: { userId, status: 'Accepted' } }),
    ]);

    const acceptanceRate =
      totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100) / 100
        : 0;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      statistics: {
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate,
      },
    };
  }

  /**
   * 2. Get Recent Failures belonging to the user
   */
  public async getRecentFailures(
    userId: string,
    options: { limit?: number; topic?: string; status?: string } = {}
  ): Promise<CompactFailureItem[]> {
    const limit = Math.min(options.limit || 10, 100);

    const whereCondition: any = {
      userId,
      NOT: { status: 'Accepted' },
    };

    if (options.status) {
      whereCondition.status = options.status;
    }

    if (options.topic) {
      whereCondition.problem = {
        topics: { has: options.topic },
      };
    }

    const submissions = await prisma.submissionEvent.findMany({
      where: whereCondition,
      include: {
        problem: {
          select: { title: true, slug: true, difficulty: true, topics: true },
        },
        evidence: {
          include: { rootCauseHypotheses: true },
        },
        diagnosis: {
          include: { primaryWeakness: true },
        },
        failureExplanation: true,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return submissions.map((sub: any) => {
      const hyp = sub.evidence.flatMap((e: any) => e.rootCauseHypotheses)[0];
      const rootCause =
        sub.failureExplanation?.rootCause ||
        hyp?.name ||
        'Unspecified Root Cause';

      const confidence =
        sub.failureExplanation?.confidence || hyp?.confidence || 0.8;

      const weakness =
        sub.diagnosis?.primaryWeakness?.name || 'Edge Case Reasoning';

      const evidenceSummary =
        sub.failureExplanation?.reason ||
        sub.evidence[0]?.description ||
        `Submission failed with status ${sub.status}.`;

      return {
        id: sub.eventId || sub.id,
        problem: {
          title: sub.problem?.title || 'Unknown Problem',
          slug: sub.problem?.slug || '',
          difficulty: sub.problem?.difficulty || 'Medium',
          topics: sub.problem?.topics || [],
        },
        platform: sub.source || 'LeetCode',
        status: sub.status,
        timestamp: sub.timestamp.toISOString(),
        rootCause,
        confidence,
        weakness,
        evidenceSummary,
      };
    });
  }

  /**
   * 3. Search Failures using RAG retrieval
   */
  public async searchFailures(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<FailureSearchResult> {
    const safeLimit = Math.min(limit, 50);

    const retrieved = await retrieveSimilarFailures(
      userId,
      'query-search',
      query,
      'Medium',
      [],
      'Wrong Answer',
      '',
      query,
      safeLimit
    );

    const items: CompactFailureItem[] = retrieved.map((r: any) => ({
      id: r.submissionId,
      problem: {
        title: r.problemTitle,
        slug: r.problemSlug,
        difficulty: 'Medium',
        topics: [],
      },
      platform: 'LeetCode',
      status: r.submissionStatus,
      timestamp: new Date().toISOString(),
      rootCause: 'Semantic Match',
      confidence: Math.round(r.similarityScore * 100) / 100,
      weakness: 'Pattern Recognition',
      evidenceSummary: `Match similarity score: ${r.similarityScore.toFixed(2)}`,
    }));

    return {
      failures: items,
      totalMatches: items.length,
    };
  }

  /**
   * 4. Get User's Recurring Weaknesses
   */
  public async getWeaknesses(userId: string): Promise<WeaknessItem[]> {
    const rawWeaknesses = await getTopWeaknesses(userId, 10);

    if (rawWeaknesses.length > 0) {
      return rawWeaknesses.map((w: any) => ({
        id: w.id || w.name,
        name: w.name,
        score: Math.round((w.confidence || 0.85) * 100) / 100,
        frequency: w.frequency || 1,
        severity: (w.confidence > 0.8 ? 'high' : 'medium') as 'high' | 'medium',
      }));
    }

    const graph = await getUserFailureSubgraph(userId, 100);
    const weaknessNodes = graph.nodes.filter((n: any) => n.data.nodeType === 'Weakness');

    return weaknessNodes.map((w: any) => ({
      id: w.id,
      name: w.data.label,
      score: Math.round((w.data.properties.confidence || 0.8) * 100) / 100,
      frequency: w.data.properties.frequency || 1,
      severity: (w.data.properties.severity || 'high') as any,
    }));
  }

  /**
   * 5. Get Failure Diagnosis (WITH STRICT RESOURCE OWNERSHIP CHECK)
   */
  public async getFailureDiagnosis(
    userId: string,
    failureId: string
  ): Promise<StructuredDiagnosisOutput> {
    const submission = await prisma.submissionEvent.findFirst({
      where: {
        OR: [
          { id: failureId },
          { eventId: failureId },
          { submissionHash: failureId },
        ],
      },
      include: {
        problem: true,
        diagnosis: {
          include: {
            primaryWeakness: true,
            recommendations: { include: { strategy: true } },
          },
        },
        evidence: true,
        failureExplanation: true,
      },
    });

    if (!submission) {
      throw FailureAtlasMcpError.failureNotFound();
    }

    // STRICT RESOURCE OWNERSHIP CHECK
    if (submission.userId !== userId) {
      console.warn(`[MCP Ownership Warning] User ${userId} attempted to access failure ${failureId} owned by ${submission.userId}`);
      throw FailureAtlasMcpError.failureNotFound(); // Return 404 to avoid leaking existence
    }

    const evidenceList = submission.evidence.map((e: any) => ({
      type: e.type,
      description: e.description,
      source: e.source,
    }));

    const rootCause =
      submission.failureExplanation?.rootCause ||
      'Edge Case Boundary Handling Failure';

    const confidence =
      submission.failureExplanation?.confidence || 0.88;

    const weakness =
      submission.diagnosis?.primaryWeakness?.name ||
      'Edge Case Reasoning';

    const explanation =
      submission.failureExplanation?.reason ||
      'The submission failed due to improper boundary condition checks on edge cases.';

    return {
      failureId: submission.eventId || submission.id,
      problem: {
        title: submission.problem.title,
        slug: submission.problem.slug,
        difficulty: submission.problem.difficulty,
      },
      status: submission.status,
      rootCause,
      confidence,
      weakness,
      evidence: evidenceList,
      explanation,
    };
  }

  /**
   * 6. Get Personalised Learning Recommendations
   */
  public async getLearningRecommendations(
    userId: string
  ): Promise<LearningRecommendationItem[]> {
    const weaknesses = await this.getWeaknesses(userId);
    const topWeakness = weaknesses[0]?.name || 'Edge Case Reasoning';

    const recommendations: LearningRecommendationItem[] = [
      {
        weakness: topWeakness,
        strategy: 'Boundary Testing Verification Workflow',
        reason: `Based on your recent failures associated with ${topWeakness}, focus on dry-running extreme bounds.`,
        priority: 'high',
        practiceProblems: [
          { title: 'Two Sum', problemSlug: 'two-sum', difficulty: 'Easy' },
          { title: 'Search Insert Position', problemSlug: 'search-insert-position', difficulty: 'Easy' },
        ],
      },
      {
        weakness: 'Performance Analysis',
        strategy: 'Constraints and Time Complexity Check',
        reason: 'Avoid sub-optimal nested loops on large input constraints (N >= 10^5).',
        priority: 'medium',
        practiceProblems: [
          { title: 'Longest Substring Without Repeating Characters', problemSlug: 'longest-substring-without-repeating-characters', difficulty: 'Medium' },
        ],
      },
    ];

    return recommendations;
  }
}
