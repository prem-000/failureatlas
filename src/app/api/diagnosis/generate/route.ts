import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { computeWeaknessPageRank } from '@/lib/graph/pagerank';
import { retrieveSimilarFailures } from '@/lib/rag/retrieval';
import { generateAIDiagnosis, DIAGNOSIS_MODEL_VERSION } from '@/lib/diagnosis/generator';
import { resolveUserIntent } from '@/lib/diagnosis/intent-resolver';
import { resolveProblemTarget } from '@/lib/diagnosis/problem-resolver';
import { createFingerprint } from '@/lib/fingerprint/fingerprint';
import type { SubmissionEvent } from '@/types';
import { getAnalysisCache, setAnalysisCache, delAnalysisCache } from '@/lib/cache/analysis';
import { acquireLock, releaseLock } from '@/lib/lock';
import { rateLimit } from '@/lib/rate-limit';
import { delRoadmapCache } from '@/lib/cache/roadmap';


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
  try {
    console.log('[DIAGNOSIS] request received');

    // 1. Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || undefined);
    if (!token) {
      console.log('[DIAGNOSIS] authenticated user: failure');
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Missing Authorization token' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      console.log('[DIAGNOSIS] authenticated user: failure');
      return NextResponse.json(
        { success: false, error: { code: 'AUTHORIZATION_FAILED', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }
    const userId = payload.userId;
    console.log('[DIAGNOSIS] authenticated user: success');

    // Rate limiting: 10 requests per hour per user
    const rateLimitResult = await rateLimit(userId, 10, 3600);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Analysis rate limit exceeded. Try again later.' } },
        { status: 429 }
      );
    }

    let userQuery = '';
    let forceRegenerate = false;
    try {
      const body = await request.json();
      userQuery = typeof body?.query === 'string' ? body.query.trim() : '';
      forceRegenerate = Boolean(body?.force || body?.regenerate);
    } catch {
      // empty body is fine
    }

    // 2. Resolve user intent and problem entity
    const intentResult = await resolveUserIntent(userQuery);
    const problemResult = await resolveProblemTarget(userQuery, userId);

    console.log('[DIAGNOSIS] resolved intent:', intentResult.intent, 'confidence:', intentResult.confidence);
    if (problemResult.problemMentioned) {
      console.log(
        '[DIAGNOSIS] resolved problem:',
        problemResult.targetProblem?.title,
        'attempted:',
        problemResult.userHasAttempted
      );
    }

    // Select target submission based on intent and resolved problem
    let targetSubmission: any = null;

    if (problemResult.problemMentioned && problemResult.targetProblem) {
      if (problemResult.latestFailedAttempt) {
        targetSubmission = problemResult.latestFailedAttempt;
      } else if (problemResult.latestAttempt) {
        targetSubmission = problemResult.latestAttempt;
      }
    }

    // If no problem-specific submission, fallback to latest non-Accepted submission
    if (!targetSubmission) {
      targetSubmission = await prisma.submissionEvent.findFirst({
        where: {
          userId,
          NOT: { status: 'Accepted' },
        },
        orderBy: { timestamp: 'desc' },
        include: { problem: true },
      });
    }

    // If still no failure, check if user has any submission at all
    if (!targetSubmission) {
      targetSubmission = await prisma.submissionEvent.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        include: { problem: true },
      });
    }

    if (!targetSubmission && !problemResult.problemMentioned && intentResult.intent !== 'GENERAL_DSA_QUESTION' && intentResult.intent !== 'WEEKLY_PRACTICE') {
      console.log('[DIAGNOSIS] evidence retrieval: failure (no submissions found)');
      const emptyAnalysis = userQuery
        ? `No submission history found to answer: "${userQuery}". Submit an attempt first.`
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
            impactScore: 0.0,
          },
          secondaryWeaknesses: [],
          learningRecommendations: [],
          progressMetrics: {
            totalFailures: 0,
            improvementRate: 100,
            streakAnalysis: {
              currentStreak: 0,
              longestStreak: 0,
              averageStreak: 0.0,
            },
          },
        },
      });
    }

    console.log('[DIAGNOSIS] evidence retrieval: success');

    // Map target submission to type SubmissionEvent (or null if unattempted problem)
    const mappedCurrent: SubmissionEvent | null = targetSubmission
      ? {
          eventId: targetSubmission.eventId,
          sessionId: targetSubmission.sessionId,
          timestamp: targetSubmission.timestamp,
          problemSlug: targetSubmission.problem.slug,
          problemTitle: targetSubmission.problem.title,
          problemDifficulty: targetSubmission.problem.difficulty as any,
          problemTopics: targetSubmission.problem.topics,
          problemUrl: targetSubmission.problem.url || '',
          submissionStatus: targetSubmission.status as any,
          submissionLanguage: targetSubmission.language,
          submissionCode: targetSubmission.code,
          runtime: targetSubmission.runtime ?? undefined,
          memory: targetSubmission.memory ?? undefined,
          testCasesPassed: targetSubmission.testCasesPassed ?? undefined,
          totalTestCases: targetSubmission.totalTestCases ?? undefined,
          failedTestCase: targetSubmission.failedTestCase ?? undefined,
          timeSpent: targetSubmission.timeSpent,
          attemptNumber: targetSubmission.attemptNumber,
          rapidSubmission: targetSubmission.rapidSubmission,
        }
      : null;

    // 3. Compute PageRank weakness scores
    const pageRankScores = await computeWeaknessPageRank(userId);

    // 4. Retrieve similar failures using Hybrid RAG search
    const similarFailures = targetSubmission && mappedCurrent
      ? await retrieveSimilarFailures(
          userId,
          targetSubmission.eventId,
          mappedCurrent.problemTitle,
          mappedCurrent.problemDifficulty,
          mappedCurrent.problemTopics,
          mappedCurrent.submissionStatus,
          mappedCurrent.submissionCode,
          mappedCurrent.failedTestCase
        )
      : [];
    console.log('[DIAGNOSIS] RAG context: success');

    // Generate deterministic fingerprint
    const { fingerprint, codeHash } = targetSubmission
      ? createFingerprint({
          userId,
          problemSlug: targetSubmission.problem.slug,
          language: targetSubmission.language,
          status: targetSubmission.status,
          code: targetSubmission.code,
        })
      : { fingerprint: `user-${userId}-intent-${intentResult.intent}`, codeHash: '' };

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

    const isFallbackReasoning = (raw: any): boolean => {
      if (!raw) return false;
      const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
      return str.includes('Static rule-based heuristic fallback');
    };

    if (forceRegenerate || Boolean(userQuery)) {
      await delAnalysisCache(fingerprint);
    } else {
      // Check Redis Cache first
      const cached = await getAnalysisCache(fingerprint);
      if (cached && !isFallbackReasoning(cached)) {
        return NextResponse.json(cached);
      } else if (cached) {
        await delAnalysisCache(fingerprint);
      }

      diagnosis = await prisma.diagnosisResult.findUnique({
        where: { fingerprint },
        include: {
          primaryWeakness: true,
          recommendations: { include: { strategy: true } }
        }
      });

      if (diagnosis && (diagnosis.modelVersion !== DIAGNOSIS_MODEL_VERSION || isFallbackReasoning(diagnosis.progressMetrics))) {
        diagnosis = null;
      }
    }

    // If still no diagnosis, acquire a lock and check DB again/generate AI
    if (!diagnosis) {
      const lockKey = `analysis:${fingerprint}`;
      const acquired = await acquireLock(lockKey, 35000);
      if (!acquired) {
        // Lock not acquired, another request is generating AI for this fingerprint.
        // Wait and check the database again.
        let retries = 5;
        while (retries > 0 && !diagnosis) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          diagnosis = await prisma.diagnosisResult.findUnique({
            where: { fingerprint },
            include: {
              primaryWeakness: true,
              recommendations: { include: { strategy: true } }
            }
          });
          retries--;
        }
        if (diagnosis && (diagnosis.modelVersion !== DIAGNOSIS_MODEL_VERSION || isFallbackReasoning(diagnosis.progressMetrics))) {
          diagnosis = null;
        }
      }

      if (!diagnosis) {
        try {
          // 5. Generate AI Diagnosis (pass userQuery, intent, and problem resolution options)
          const aiDiagnosis = await generateAIDiagnosis(mappedCurrent, similarFailures, pageRankScores, {
            userQuery: userQuery || undefined,
            intent: intentResult,
            problemResolution: problemResult,
          });
          aiDiagnosisPrimaryName = aiDiagnosis.primaryWeaknessName;
          aiDiagnosisConfidence = aiDiagnosis.confidence;
          aiDiagnosisReasoning = aiDiagnosis.reasoningChain;

          // 6. Save primary weakness in Prisma PostgreSQL
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

          let created: any = null;
          if (targetSubmission) {
            const existingByFingerprint = await prisma.diagnosisResult.findUnique({
              where: { fingerprint }
            });

            if (existingByFingerprint) {
              created = await prisma.diagnosisResult.update({
                where: { fingerprint },
                data: {
                  submissionId: targetSubmission.id,
                  primaryWeaknessId: primaryWeaknessNode.id,
                  modelVersion: DIAGNOSIS_MODEL_VERSION,
                  diagnosisJson: aiDiagnosis as any,
                  progressMetrics: {
                    confidence: aiDiagnosis.confidence,
                    reasoningChain: aiDiagnosis.reasoningChain
                  }
                }
              });
            } else {
              created = await prisma.diagnosisResult.upsert({
                where: { submissionId: targetSubmission.id },
                update: {
                  primaryWeaknessId: primaryWeaknessNode.id,
                  fingerprint,
                  codeHash,
                  modelVersion: DIAGNOSIS_MODEL_VERSION,
                  diagnosisJson: aiDiagnosis as any,
                  progressMetrics: {
                    confidence: aiDiagnosis.confidence,
                    reasoningChain: aiDiagnosis.reasoningChain
                  }
                },
                create: {
                  userId,
                  submissionId: targetSubmission.id,
                  primaryWeaknessId: primaryWeaknessNode.id,
                  fingerprint,
                  codeHash,
                  modelVersion: DIAGNOSIS_MODEL_VERSION,
                  diagnosisJson: aiDiagnosis as any,
                  progressMetrics: {
                    confidence: aiDiagnosis.confidence,
                    reasoningChain: aiDiagnosis.reasoningChain
                  }
                }
              });
            }

            diagnosis = await prisma.diagnosisResult.findUnique({
              where: { id: created.id },
              include: {
                primaryWeakness: true,
                recommendations: { include: { strategy: true } },
              },
            });

            // Clear existing recommendations in case of overwrite
            await prisma.learningRecommendation.deleteMany({
              where: { diagnosisId: diagnosis.id }
            });
          }

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

            if (created) {
              await prisma.learningRecommendation.create({
                data: {
                  diagnosisId: created.id,
                  strategyId: strategy.id,
                  completed: false
                }
              });
            }

            responseRecs.push({
              strategyId: strategy.id,
              name: rec.name,
              description: rec.description,
              estimatedTime: Math.round((rec.estimatedTime / 60) * 10) / 10,
              priority: rec.priority,
              practiceProblems: rec.practiceProblems.map(p => ({
                problemSlug: p.problemSlug,
                title: p.title,
                difficulty: p.difficulty,
                reasoning: `Recommended to practice the pattern: ${rec.name}`
              }))
            });
          }
        } finally {
          await releaseLock(lockKey);
        }
      }
    }

    // Cache hit: link to current submission if different, then skip LLM generation
    if (diagnosis && targetSubmission) {
      if (diagnosis.submissionId !== targetSubmission.id) {
        diagnosis = await prisma.diagnosisResult.update({
          where: { id: diagnosis.id },
          data: { submissionId: targetSubmission.id },
          include: {
            primaryWeakness: true,
            recommendations: { include: { strategy: true } }
          }
        });
      }
    }



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

    const responsePayload = {
      success: true,
      data: {
        analysis,
        confidence: aiDiagnosisConfidence,
        primaryWeaknessId: aiDiagnosisPrimaryName,
        reasoningChain,
        similarFailures: similarForUi,
        recommendations: uiRecommendations,
        latestSubmissionId: targetSubmission ? targetSubmission.eventId : undefined,
      },
      diagnosis: {
        diagnosisId: diagnosis?.id || 'generated-diagnosis-id',
        generatedAt: diagnosis?.createdAt ? diagnosis.createdAt.toISOString() : new Date().toISOString(),
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
    };

    // Save to Redis Cache
    await setAnalysisCache(fingerprint, responsePayload);
    // Invalidate roadmap cache due to weakness graph changes
    await delRoadmapCache(userId);

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('❌ POST generate diagnosis error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate diagnosis report' } },
      { status: 500 }
    );
  }
}
