import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { computeWeaknessPageRank } from '@/lib/graph/pagerank';
import { retrieveSimilarFailures } from '@/lib/rag/retrieval';
import { generateAIDiagnosis, DIAGNOSIS_MODEL_VERSION, resolveRootCauseType } from '@/lib/diagnosis/generator';
import { resolveUserIntent } from '@/lib/diagnosis/intent-resolver';
import { resolveProblemTarget } from '@/lib/diagnosis/problem-resolver';
import { createFingerprint } from '@/lib/fingerprint/fingerprint';
import type { SubmissionEvent, DiagnosisStage } from '@/types';
import { getAnalysisCache, setAnalysisCache, delAnalysisCache } from '@/lib/cache/analysis';
import { createDiagnosisCacheKey, getCachedDiagnosis, setCachedDiagnosis, isNonCacheableQuery } from '@/lib/cache/redis';
import { ROOT_CAUSE_RESOURCES } from '@/lib/resources/catalog';
import { deduplicateRecommendations } from '@/lib/recommendations/dedup';
import { acquireLock, releaseLock } from '@/lib/lock';
import { rateLimit } from '@/lib/rate-limit';
import { delRoadmapCache } from '@/lib/cache/roadmap';
import { generateDiagnosisV2 } from '@/lib/diagnosis/generator-v2';


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
    let streamRequested = request.headers.get('accept')?.includes('text/event-stream') || false;
    try {
      const body = await request.json();
      userQuery = typeof body?.query === 'string' ? body.query.trim() : '';
      forceRegenerate = Boolean(body?.force || body?.regenerate);
      if (body?.stream === true) streamRequested = true;
    } catch {
      // empty body is fine
    }

    const requestId = `diag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    let currentStage = 'routing';

    if (streamRequested) {
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();

      const sendSse = async (eventName: string, data: any) => {
        try {
          const payload = typeof data === 'object' && data !== null ? { type: eventName, ...data } : { data };
          await writer.write(
            encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          // stream closed
        }
      };

      const onStage = async (stage: DiagnosisStage) => {
        currentStage = stage;
        await sendSse('stage', { stage });
      };

      (async () => {
        try {
          const v2Result = await generateDiagnosisV2({
            userId,
            userQuery,
            onStage: onStage as any,
          });

          await sendSse('result', {
            type: 'answer',
            content: v2Result.kind === 'code_review' ? v2Result.verdict : 'Analysis complete',
            diagnosisV2: v2Result,
            evidence: {
              analysis: 'Analysis complete',
              confidence: 90,
              diagnosisV2: v2Result,
            },
            data: {
              analysis: 'Analysis complete',
              confidence: 90,
              diagnosisV2: v2Result,
            },
          });
        } catch (pipelineErr) {
          console.error('[diagnosis]', requestId, 'failed at', currentStage, pipelineErr);
          await sendSse('error', {
            requestId,
            stage: currentStage,
            message: pipelineErr instanceof Error ? pipelineErr.message : 'Failed to generate diagnosis',
            retryable: true,
          });
        } finally {
          try {
            await sendSse('done', { requestId });
          } catch {
            // ignore
          }
          try {
            await writer.close();
          } catch {
            // ignore
          }
        }
      })();

      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }

    const v2Result = await generateDiagnosisV2({
      userId,
      userQuery,
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis: 'Analysis complete',
        confidence: 90,
        diagnosisV2: v2Result,
      },
      diagnosisV2: v2Result,
    });

  } catch (error) {
    console.error('❌ POST generate diagnosis error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate diagnosis report' } },
      { status: 500 }
    );
  }
}

export interface DiagnosisPipelineParams {
  userId: string;
  userQuery: string;
  forceRegenerate: boolean;
  onStage?: (stage: DiagnosisStage) => Promise<void> | void;
}

export async function executeDiagnosisPipeline({
  userId,
  userQuery,
  forceRegenerate,
  onStage,
}: DiagnosisPipelineParams) {
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
    return {
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
    };
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
        mappedCurrent.failedTestCase,
        3,
        undefined,
        onStage
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
  let aiDiagnosisPrimaryName = '';
  let aiDiagnosisConfidence = 85;
  let aiDiagnosisReasoning = 'Identified gap area.';

  const isFallbackReasoning = (raw: any): boolean => {
    if (!raw) return false;
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return str.includes('Static rule-based heuristic fallback');
  };

  // Check Upstash Redis Cache first if applicable
  const redisCacheKey = targetSubmission ? createDiagnosisCacheKey({
    problemSlug: targetSubmission.problem.slug,
    submissionStatus: targetSubmission.status,
    codeDiffFingerprint: targetSubmission.code,
    failedTestCase: targetSubmission.failedTestCase,
  }) : null;

  const isBypassCache = forceRegenerate || isNonCacheableQuery(userQuery);

  if (!isBypassCache && redisCacheKey) {
    const cachedDiagnosis = await getCachedDiagnosis(redisCacheKey);
    if (cachedDiagnosis) {
      return {
        success: true,
        data: {
          analysis: (cachedDiagnosis.progressMetrics as any)?.reasoningChain || 'Analysis complete.',
          confidence: cachedDiagnosis.confidence,
          primaryWeaknessId: cachedDiagnosis.primaryWeakness.name,
          reasoningChain: Array.isArray((cachedDiagnosis.progressMetrics as any)?.reasoningChain)
            ? (cachedDiagnosis.progressMetrics as any)?.reasoningChain
            : [(cachedDiagnosis.progressMetrics as any)?.reasoningChain || 'Identified gap area.'],
          similarFailures: [],
          recommendations: (cachedDiagnosis.learningRecommendations || []).map((r: any) => ({
            name: r.name,
            description: r.description,
            priority: r.priority || 1,
          })),
          resources: cachedDiagnosis.resources,
          latestSubmissionId: targetSubmission?.eventId,
        },
        diagnosis: cachedDiagnosis,
      };
    }
  }

  if (forceRegenerate || Boolean(userQuery)) {
    await delAnalysisCache(fingerprint);
  } else {
    // Check legacy Redis Cache
    const cached = await getAnalysisCache(fingerprint);
    if (cached && !isFallbackReasoning(cached)) {
      return cached;
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

  // Lookup existing diagnosis for this target submission to maintain grounding consistency across follow-ups
  const existingDiag = targetSubmission
    ? await prisma.diagnosisResult.findFirst({
        where: { submissionId: targetSubmission.id },
        include: { primaryWeakness: true, recommendations: { include: { strategy: true } } },
      })
    : null;

  const existingExpl = (!existingDiag && targetSubmission)
    ? await prisma.failureExplanation.findUnique({
        where: { submissionId: targetSubmission.id },
      })
    : null;

  const existingDiagnosisContext = existingDiag
    ? {
        primaryWeaknessId: existingDiag.primaryWeakness.name,
        primaryWeaknessName: existingDiag.primaryWeakness.name,
        confidence: (existingDiag.progressMetrics as any)?.confidence ?? 85,
        reasoningChain: (existingDiag.progressMetrics as any)?.reasoningChain,
      }
    : existingExpl
    ? {
        primaryWeaknessId: existingExpl.rootCause,
        primaryWeaknessName: existingExpl.rootCause,
        confidence: Math.round(existingExpl.confidence),
        reasoningChain: existingExpl.reason,
      }
    : undefined;

  // If still no diagnosis, acquire a lock and check DB again/generate AI
  if (!diagnosis) {
    const lockKey = `analysis:${fingerprint}`;
    const acquired = await acquireLock(lockKey, 35000);
    if (!acquired) {
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
        // 5. Generate AI Diagnosis (grounded with existingDiagnosis context if available)
        const aiDiagnosis = await generateAIDiagnosis(mappedCurrent, similarFailures, pageRankScores, {
          userQuery: userQuery || undefined,
          intent: intentResult,
          problemResolution: problemResult,
          existingDiagnosis: existingDiagnosisContext,
          onStage,
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

        if (created) {
          diagnosis = await prisma.diagnosisResult.findUnique({
            where: { id: created.id },
            include: {
              primaryWeakness: true,
              recommendations: { include: { strategy: true } }
            }
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
    aiDiagnosisReasoning = (diagnosis.progressMetrics as any)?.reasoningChain ?? 'Identified gap area.';

    // Only populate from stored recommendations if not already populated from fresh generation
    if (responseRecs.length === 0) {
      for (const rec of diagnosis.recommendations) {
        responseRecs.push({
          strategyId: rec.strategy.id,
          name: rec.strategy.name,
          description: rec.strategy.description,
          estimatedTime: Math.round((rec.strategy.estimatedTime / 60) * 10) / 10,
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
    throw new Error('Diagnosis record missing after generation');
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

  const dedupedRecs = deduplicateRecommendations(responseRecs);

  const uiRecommendations = dedupedRecs.map((r) => ({
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

  const rootCauseType = resolveRootCauseType(aiDiagnosisPrimaryName);
  const resources = ROOT_CAUSE_RESOURCES[rootCauseType] || [];

  const responsePayload = {
    success: true,
    data: {
      analysis,
      confidence: aiDiagnosisConfidence,
      primaryWeaknessId: aiDiagnosisPrimaryName,
      reasoningChain,
      similarFailures: similarForUi,
      recommendations: uiRecommendations,
      resources,
      latestSubmissionId: targetSubmission ? targetSubmission.eventId : undefined,
    },
    diagnosis: {
      diagnosisId: diagnosis?.id || 'generated-diagnosis-id',
      generatedAt: diagnosis?.createdAt ? diagnosis.createdAt.toISOString() : new Date().toISOString(),
      analysisScope: 'recent',
      rootCause: rootCauseType,
      confidence: aiDiagnosisConfidence,
      resources,
      primaryWeakness: {
        name: aiDiagnosisPrimaryName,
        description: `Identified gap area: ${aiDiagnosisPrimaryName}.`,
        confidence: aiDiagnosisConfidence,
        impactScore: pageRankScores[0]?.pageRankScore ?? 0.0
      },
      secondaryWeaknesses,
      learningRecommendations: dedupedRecs,
      progressMetrics: {
        confidence: aiDiagnosisConfidence,
        reasoningChain,
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

  // Save to Upstash Redis Cache (7 days TTL) if valid structured submission
  if (!isBypassCache && redisCacheKey) {
    await setCachedDiagnosis(redisCacheKey, responsePayload.diagnosis as any);
  }

  // Also persist FailureExplanation in PostgreSQL so /explain endpoint returns identical root cause and confidence
  if (targetSubmission) {
    try {
      await prisma.failureExplanation.upsert({
        where: { submissionId: targetSubmission.id },
        update: {
          rootCause: aiDiagnosisPrimaryName,
          confidence: aiDiagnosisConfidence,
          reason: analysis,
        },
        create: {
          submissionId: targetSubmission.id,
          rootCause: aiDiagnosisPrimaryName,
          rootCauseCategory: aiDiagnosisPrimaryName,
          confidence: aiDiagnosisConfidence,
          reason: analysis,
          logicBreakdown: analysis,
          learningConcept: aiDiagnosisPrimaryName,
          recommendation: uiRecommendations[0]?.name || 'Targeted Practice',
          estimatedLearningTimeMinutes: 20,
          generatedAt: new Date(),
        },
      });
    } catch (err) {
      console.warn('Non-fatal failureExplanation upsert sync warning:', err);
    }
  }

  // Save to legacy Redis Cache
  await setAnalysisCache(fingerprint, responsePayload);
  // Invalidate roadmap cache due to weakness graph changes
  await delRoadmapCache(userId);

  return responsePayload;
}
