import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { computeWeaknessPageRank } from '@/lib/graph/pagerank';
import { retrieveSimilarFailures } from '@/lib/rag/retrieval';
import { generateAIDiagnosis } from '@/lib/diagnosis/generator';
import type { SubmissionEvent } from '@/types';


export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function POST(request: NextRequest) {
  console.log("[TRACE] Route /api/diagnosis/generate reached");
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || undefined);
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Missing Authorization token' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHORIZATION_FAILED', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }
    const userId = payload.userId;
    console.log(`[TRACE] User ID extracted: ${userId}`);

    let userQuery = '';
    try {
      const body = await request.json();
      userQuery = typeof body?.query === 'string' ? body.query.trim() : '';
    } catch {
      // empty body is fine
    }

    // 2. Fetch the user's most recent failure event
    console.log("[TRACE] Fetching latest failure from Prisma...");
    const latestFailure = await prisma.submissionEvent.findFirst({
      where: {
        userId,
        NOT: { status: 'Accepted' }
      },
      orderBy: { timestamp: 'desc' },
      include: { problem: true }
    });

    if (!latestFailure) {
      const emptyAnalysis = userQuery
        ? `No failure history found to answer: "${userQuery}". Submit a failed attempt first.`
        : 'No weaknesses identified! Keep solving problems.';
      return NextResponse.json({
        success: true,
        data: {
          analysis: emptyAnalysis,
          confidence: 100,
          primaryWeaknessId: 'none',
          reasoningChain: [],
          similarFailures: [],
          recommendations: [],
        },
        diagnosis: {
          diagnosisId: 'mock-diagnosis-id',
          generatedAt: new Date().toISOString(),
          analysisScope: 'all',
          primaryWeakness: {
            name: 'None',
            description: 'No weaknesses identified! Keep solving problems.',
            confidence: 100,
            impactScore: 0.0
          },
          secondaryWeaknesses: [],
          learningRecommendations: [],
          progressMetrics: {
            totalFailures: 0,
            improvementRate: 100,
            streakAnalysis: {
              currentStreak: 0,
              longestStreak: 0,
              averageStreak: 0.0
            }
          }
        }
      });
    }

    console.log(`[TRACE] Latest failure found: id=${latestFailure.id}`);

    // Map latest failure to type SubmissionEvent
    const mappedCurrent: SubmissionEvent = {
      eventId: latestFailure.eventId,
      sessionId: latestFailure.sessionId,
      timestamp: latestFailure.timestamp,
      problemSlug: latestFailure.problem.slug,
      problemTitle: latestFailure.problem.title,
      problemDifficulty: latestFailure.problem.difficulty as any,
      problemTopics: latestFailure.problem.topics,
      problemUrl: latestFailure.problem.url || '',
      submissionStatus: latestFailure.status as any,
      submissionLanguage: latestFailure.language,
      submissionCode: latestFailure.code,
      runtime: latestFailure.runtime ?? undefined,
      memory: latestFailure.memory ?? undefined,
      testCasesPassed: latestFailure.testCasesPassed ?? undefined,
      totalTestCases: latestFailure.totalTestCases ?? undefined,
      failedTestCase: latestFailure.failedTestCase ?? undefined,
      timeSpent: latestFailure.timeSpent,
      attemptNumber: latestFailure.attemptNumber,
      rapidSubmission: latestFailure.rapidSubmission
    };

    // 3. Compute PageRank weakness scores
    const pageRankScores = await computeWeaknessPageRank(userId);

    // 4. Retrieve similar failures using Hybrid RAG search
    const similarFailures = await retrieveSimilarFailures(
      userId,
      latestFailure.eventId,
      mappedCurrent.problemTitle,
      mappedCurrent.problemDifficulty,
      mappedCurrent.problemTopics,
      mappedCurrent.submissionStatus,
      mappedCurrent.submissionCode,
      mappedCurrent.failedTestCase
    );

    // Delete existing diagnosis for this submission event to ensure we always regenerate with Groq
    await prisma.diagnosisResult.deleteMany({
      where: { submissionId: latestFailure.id }
    });

    let diagnosis: any = null;

    const responseRecs: Array<{
      strategyId: string;
      name: string;
      description: string;
      estimatedTime: number;
      priority: string | number;
      practiceProblems: unknown[];
    }> = [];
    let aiDiagnosisPrimaryName = "";
    let aiDiagnosisConfidence = 85;
    let aiDiagnosisReasoning = "Identified gap area.";

    if (diagnosis) {
      aiDiagnosisPrimaryName = diagnosis.primaryWeakness.name;
      aiDiagnosisConfidence = (diagnosis.progressMetrics as any)?.confidence ?? 85;
      aiDiagnosisReasoning = (diagnosis.progressMetrics as any)?.reasoningChain ?? "Identified gap area.";

      for (const rec of diagnosis.recommendations) {
        responseRecs.push({
          strategyId: rec.strategy.id,
          name: rec.strategy.name,
          description: rec.strategy.description,
          estimatedTime: Math.round((rec.strategy.estimatedTime / 60) * 10) / 10, // convert minutes to hours for API spec
          priority: rec.strategy.priority,
          practiceProblems: rec.strategy.practiceProblems.map((slug: string) => ({
            problemSlug: slug,
            title: slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            difficulty: 'Medium' as const,
            reasoning: `Recommended to practice the pattern: ${rec.strategy.name}`
          }))
        });
      }
    } else {
      // 5. Generate AI Diagnosis (pass userQuery so Groq can answer it directly)
      const aiDiagnosis = await generateAIDiagnosis(mappedCurrent, similarFailures, pageRankScores, userQuery || undefined);
      aiDiagnosisPrimaryName = aiDiagnosis.primaryWeaknessName;
      aiDiagnosisConfidence = aiDiagnosis.confidence;
      aiDiagnosisReasoning = aiDiagnosis.reasoningChain;

      // 6. Save primary weakness in Prisma PostgreSQL
      console.log("[TRACE] Saving diagnosis to Prisma...");
      const primaryWeaknessNode = await prisma.systemicWeakness.upsert({
        where: { name: aiDiagnosis.primaryWeaknessId },
        update: {},
        create: {
          name: aiDiagnosis.primaryWeaknessId,
          type: aiDiagnosis.primaryWeaknessId,
          severity: 'high',
          confidence: aiDiagnosis.confidence / 100
        }
      });

      const created = await prisma.diagnosisResult.upsert({
        where: { submissionId: latestFailure.id },
        update: {
          primaryWeaknessId: primaryWeaknessNode.id,
          progressMetrics: {
            confidence: aiDiagnosis.confidence,
            reasoningChain: aiDiagnosis.reasoningChain
          }
        },
        create: {
          userId,
          submissionId: latestFailure.id,
          primaryWeaknessId: primaryWeaknessNode.id,
          progressMetrics: {
            confidence: aiDiagnosis.confidence,
            reasoningChain: aiDiagnosis.reasoningChain
          }
        }
      });
      console.log(`[TRACE] Diagnosis saved/updated: id=${created.id}`);

      diagnosis = await prisma.diagnosisResult.findUnique({
        where: { id: created.id },
        include: {
          primaryWeakness: true,
          recommendations: { include: { strategy: true } },
        },
      });

      for (const rec of aiDiagnosis.learningRecommendations) {
        const strategy = await prisma.learningStrategy.create({
          data: {
            weaknessId: primaryWeaknessNode.id,
            name: rec.name,
            description: rec.description,
            estimatedTime: rec.estimatedTime,
            priority: rec.priority,
            practiceProblems: rec.practiceProblems.map(p => p.problemSlug)
          }
        });

        await prisma.learningRecommendation.create({
          data: {
            diagnosisId: created.id,
            strategyId: strategy.id,
            completed: false
          }
        });

        responseRecs.push({
          strategyId: strategy.id,
          name: rec.name,
          description: rec.description,
          estimatedTime: Math.round((rec.estimatedTime / 60) * 10) / 10, // convert minutes to hours for API spec
          priority: rec.priority,
          practiceProblems: rec.practiceProblems.map(p => ({
            problemSlug: p.problemSlug,
            title: p.title,
            difficulty: p.difficulty,
            reasoning: `Recommended to practice the pattern: ${rec.name}`
          }))
        });
      }
    }

    // 7. Calculate Progress Metrics
    const totalFailures = await prisma.submissionEvent.count({
      where: {
        userId,
        NOT: { status: 'Accepted' }
      }
    });

    const totalAccepted = await prisma.submissionEvent.count({
      where: {
        userId,
        status: 'Accepted'
      }
    });

    const totalSubmissions = totalFailures + totalAccepted;
    const improvementRate = totalSubmissions > 0 ? (totalAccepted / totalSubmissions) * 100 : 0.0;

    // Calculate accepted streaks
    const allSubs = await prisma.submissionEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'asc' }
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let totalStreaks = 0;
    let streakCount = 0;

    for (const sub of allSubs) {
      if (sub.status === 'Accepted') {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else {
        if (currentStreak > 0) {
          totalStreaks += currentStreak;
          streakCount++;
        }
        currentStreak = 0;
      }
    }
    if (currentStreak > 0) {
      totalStreaks += currentStreak;
      streakCount++;
    }
    const averageStreak = streakCount > 0 ? totalStreaks / streakCount : 0.0;

    if (!diagnosis) {
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Diagnosis record missing after generation' } },
        { status: 500 }
      );
    }

    const similarForUi = await Promise.all(
      similarFailures.map(async (sf) => {
        const sub = await prisma.submissionEvent.findUnique({
          where: { eventId: sf.submissionId },
          include: { problem: true },
        });
        return {
          eventId: sf.submissionId,
          problemTitle: sf.problemTitle,
          problemDifficulty: sub?.problem.difficulty ?? 'Unknown',
          status: sf.submissionStatus,
          similarity: sf.similarityScore,
          timestamp: sub?.timestamp.toISOString() ?? new Date().toISOString(),
        };
      })
    );

    const reasoningRaw = (diagnosis.progressMetrics as { reasoningChain?: string | string[] })?.reasoningChain
      ?? aiDiagnosisReasoning;
    const reasoningChain = Array.isArray(reasoningRaw)
      ? reasoningRaw.map(String)
      : typeof reasoningRaw === 'string'
        ? reasoningRaw.split('\n').map((s) => s.trim()).filter(Boolean)
        : ['Identified gap area from historical failure patterns.'];

    // Use Groq's reasoning chain directly — it already addresses the user's query
    const analysis = typeof aiDiagnosisReasoning === 'string'
      ? aiDiagnosisReasoning
      : `Primary weakness: ${aiDiagnosisPrimaryName}. Confidence ${aiDiagnosisConfidence}/100.`;

    const uiRecommendations = responseRecs.map((r) => ({
      name: r.name,
      description: r.description,
      priority: typeof r.priority === 'number' ? r.priority : 1,
    }));

    // 8. Compile and return response
    const secondaryWeaknesses = pageRankScores.slice(1).map(ws => ({
      name: ws.name,
      confidence: ws.pageRankScore,
      frequency: ws.frequency
    }));

    console.log("[TRACE] Returning diagnosis response");
    return NextResponse.json({
      success: true,
      data: {
        analysis,
        confidence: aiDiagnosisConfidence,
        primaryWeaknessId: aiDiagnosisPrimaryName,
        reasoningChain,
        similarFailures: similarForUi,
        recommendations: uiRecommendations,
        // Used by the UI to trigger FailureExplanation generation
        latestSubmissionId: latestFailure.eventId,
      },
      diagnosis: {
        diagnosisId: diagnosis.id,
        generatedAt: diagnosis.createdAt.toISOString(),
        analysisScope: 'recent',
        primaryWeakness: {
          name: aiDiagnosisPrimaryName,
          description: `Identified gap area: ${aiDiagnosisPrimaryName}.`,
          confidence: aiDiagnosisConfidence,
          impactScore: pageRankScores[0]?.pageRankScore ?? 0.0
        },
        secondaryWeaknesses,
        learningRecommendations: responseRecs,
        progressMetrics: {
          totalFailures,
          improvementRate,
          streakAnalysis: {
            currentStreak,
            longestStreak,
            averageStreak
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ POST generate diagnosis error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate diagnosis report' } },
      { status: 500 }
    );
  }
}
