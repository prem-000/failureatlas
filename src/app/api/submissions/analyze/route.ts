import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { myersDiff, computeDiffConfidence } from '@/lib/analysis/myers-diff';
import { structuralCodePatternAnalysis } from '@/lib/analysis/ast-diff';
import { parseBehavioralSignals } from '@/lib/analysis/behavioral';
import { runBayesianInference, BayesianEvidence } from '@/lib/inference/bayesian';
import { recordFailureEventInGraph } from '@/lib/graph/operations';
import { computeWeaknessPageRank } from '@/lib/graph/pagerank';
import { saveTextEmbedding, buildFailureEmbeddingContent } from '@/lib/embeddings/pipeline';
import { retrieveSimilarFailures } from '@/lib/rag/retrieval';
import { generateAIDiagnosis, DIAGNOSIS_MODEL_VERSION } from '@/lib/diagnosis/generator';
import { createFingerprint } from '@/lib/fingerprint/fingerprint';
import type { SubmissionEvent, Evidence } from '@/types';
import { getAnalysisCache, setAnalysisCache } from '@/lib/cache/analysis';
import { acquireLock, releaseLock } from '@/lib/lock';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
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

    // Rate limiting: 10 requests per hour per user
    const rateLimitResult = await rateLimit(userId, 10, 3600);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Analysis rate limit exceeded. Try again later.' } },
        { status: 429 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'submissionId is required' } },
        { status: 400 }
      );
    }

    // 3. Retrieve submission event details from Prisma
    const submission = await prisma.submissionEvent.findFirst({
      where: {
        OR: [
          { id: submissionId },
          { eventId: submissionId }
        ],
        userId
      },
      include: {
        problem: true
      }
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Submission not found' } },
        { status: 404 }
      );
    }

    // Map database submission to SubmissionEvent type
    const mappedSubmission: SubmissionEvent = {
      eventId: submission.eventId,
      sessionId: submission.sessionId,
      timestamp: submission.timestamp,
      problemSlug: submission.problem.slug,
      problemTitle: submission.problem.title,
      problemDifficulty: submission.problem.difficulty as any,
      problemTopics: submission.problem.topics,
      problemUrl: submission.problem.url || '',
      submissionStatus: submission.status as any,
      submissionLanguage: submission.language,
      submissionCode: submission.code,
      runtime: submission.runtime ?? undefined,
      memory: submission.memory ?? undefined,
      testCasesPassed: submission.testCasesPassed ?? undefined,
      totalTestCases: submission.totalTestCases ?? undefined,
      failedTestCase: submission.failedTestCase ?? undefined,
      timeSpent: submission.timeSpent,
      attemptNumber: submission.attemptNumber,
      rapidSubmission: submission.rapidSubmission
    };

    // 4. Retrieve previous attempts to perform diffing
    const previousSubmissions = await prisma.submissionEvent.findMany({
      where: {
        userId,
        problemId: submission.problemId,
        timestamp: {
          lt: submission.timestamp
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    const mappedPrevious: SubmissionEvent[] = previousSubmissions.map(prev => ({
      eventId: prev.eventId,
      sessionId: prev.sessionId,
      timestamp: prev.timestamp,
      problemSlug: submission.problem.slug,
      problemTitle: submission.problem.title,
      problemDifficulty: submission.problem.difficulty as any,
      problemTopics: submission.problem.topics,
      problemUrl: submission.problem.url || '',
      submissionStatus: prev.status as any,
      submissionLanguage: prev.language,
      submissionCode: prev.code,
      runtime: prev.runtime ?? undefined,
      memory: prev.memory ?? undefined,
      testCasesPassed: prev.testCasesPassed ?? undefined,
      totalTestCases: prev.totalTestCases ?? undefined,
      failedTestCase: prev.failedTestCase ?? undefined,
      timeSpent: prev.timeSpent,
      attemptNumber: prev.attemptNumber,
      rapidSubmission: prev.rapidSubmission
    }));

    const lastAttempt = mappedPrevious[0];

    // 5. Run Myers, AST, and Behavioral analysis
    let diffConfidence = 0.0;
    let hasBoundaryDiff = false;
    let hasStructuralBoundaryChange = false;
    let hasAlgorithmRewrite = false;
    let hasDataStructureChange = false;
    let hasImplementationDetailChange = false;

    const evidencesToCreate: Array<{
      type: 'code_diff' | 'behavioral' | 'test_failure';
      description: string;
      confidence: number;
      source: string;
      rawData: any;
    }> = [];

    if (lastAttempt) {
      const diffOps = myersDiff(lastAttempt.submissionCode, mappedSubmission.submissionCode);
      diffConfidence = computeDiffConfidence(diffOps);

      // Check for operators
      const changesCount = diffOps.filter(o => o.type !== 'EQUAL').length;
      hasBoundaryDiff = diffOps.some(o => o.type !== 'EQUAL' && /[<>=!+-]/.test(o.content));

      if (changesCount > 0) {
        evidencesToCreate.push({
          type: 'code_diff',
          description: `Line changes in code edits (confidence: ${diffConfidence.toFixed(2)})`,
          confidence: diffConfidence,
          source: 'myers-diff',
          rawData: { changesCount }
        });
      }

      // Structural Code Pattern Analysis
      const astChanges = structuralCodePatternAnalysis(lastAttempt.submissionCode, mappedSubmission.submissionCode);
      for (const ch of astChanges) {
        if (ch.type === 'BOUNDARY_CONDITION_CHANGE') hasStructuralBoundaryChange = true;
        if (ch.type === 'ALGORITHM_REWRITE') hasAlgorithmRewrite = true;
        if (ch.type === 'DATA_STRUCTURE_CHANGE') hasDataStructureChange = true;
        if (ch.type === 'IMPLEMENTATION_DETAIL') hasImplementationDetailChange = true;

        evidencesToCreate.push({
          type: 'code_diff',
          description: ch.description,
          confidence: ch.confidence,
          source: 'structural-pattern',
          rawData: ch
        });
      }
    }

    // Behavioral Signals
    const behSignals = parseBehavioralSignals(mappedSubmission, mappedPrevious);
    let hasRapidResubmission = false;
    let hasLongGap = false;
    let hasManyMinorChanges = false;

    for (const sig of behSignals) {
      if (sig.type === 'rapid_resubmission') hasRapidResubmission = true;
      if (sig.type === 'long_gap') hasLongGap = true;
      if (sig.type === 'many_minor_changes') hasManyMinorChanges = true;

      evidencesToCreate.push({
        type: 'behavioral',
        description: `Behavior signal: ${sig.type} (confidence: ${sig.confidence.toFixed(2)})`,
        confidence: sig.confidence,
        source: 'behavioral-parser',
        rawData: sig
      });
    }

    // Test Failure Evidence
    if (mappedSubmission.submissionStatus !== 'Accepted') {
      evidencesToCreate.push({
        type: 'test_failure',
        description: `Submission result: ${mappedSubmission.submissionStatus}. Passed ${mappedSubmission.testCasesPassed ?? 0}/${mappedSubmission.totalTestCases ?? 0} test cases.`,
        confidence: 0.95,
        source: 'leetcode-verdict',
        rawData: {
          verdict: mappedSubmission.submissionStatus,
          passed: mappedSubmission.testCasesPassed,
          total: mappedSubmission.totalTestCases,
          failedCase: mappedSubmission.failedTestCase
        }
      });
    }

    // Save evidence to PostgreSQL database
    const createdEvidences: Evidence[] = [];
    for (const ev of evidencesToCreate) {
      const dbEv = await prisma.evidence.create({
        data: {
          submissionId: submission.id,
          type: ev.type,
          description: ev.description,
          confidence: ev.confidence,
          source: ev.source,
          rawData: ev.rawData
        }
      });
      createdEvidences.push({
        evidenceId: dbEv.id,
        type: dbEv.type as any,
        description: dbEv.description,
        confidence: dbEv.confidence,
        source: dbEv.source,
        rawData: dbEv.rawData as any,
        extractedAt: dbEv.extractedAt
      });
    }

    // 6. Run Bayesian Root Cause Inference
    const bayesEvidence: BayesianEvidence = {
      hasBoundaryDiff,
      hasStructuralBoundaryChange,
      hasAlgorithmRewrite,
      hasDataStructureChange,
      hasImplementationDetailChange,
      hasRapidResubmission,
      hasLongGap,
      hasManyMinorChanges,
      verdict: mappedSubmission.submissionStatus,
      failedTestCase: mappedSubmission.failedTestCase
    };

    const hypotheses = runBayesianInference(bayesEvidence);

    // Save hypotheses to PostgreSQL database
    for (const hyp of hypotheses) {
      await prisma.rootCauseHypothesis.create({
        data: {
          evidenceId: createdEvidences[0]?.evidenceId || null,
          rootCauseType: hyp.rootCause,
          name: hyp.name,
          confidence: hyp.confidence
        }
      });
    }

    // 7. Update database graph
    await recordFailureEventInGraph(userId, mappedSubmission, hypotheses, createdEvidences);

    // 8. Recompute user PageRank weaknesses
    const pageRankScores = await computeWeaknessPageRank(userId);

    // 9. Generate semantic embedding and store in PostgreSQL
    const embText = buildFailureEmbeddingContent(
      mappedSubmission.problemTitle,
      mappedSubmission.problemDifficulty,
      mappedSubmission.problemTopics,
      mappedSubmission.submissionStatus,
      mappedSubmission.submissionCode,
      mappedSubmission.failedTestCase
    );
    await saveTextEmbedding(embText, 'SubmissionEvent', submission.id);

    // 10. Perform Hybrid Retrieval for similar failures
    const similarFailures = await retrieveSimilarFailures(
      userId,
      submission.eventId,
      mappedSubmission.problemTitle,
      mappedSubmission.problemDifficulty,
      mappedSubmission.problemTopics,
      mappedSubmission.submissionStatus,
      mappedSubmission.submissionCode,
      mappedSubmission.failedTestCase
    );

    // Generate deterministic fingerprint
    const { fingerprint, codeHash } = createFingerprint({
      userId,
      problemSlug: submission.problem.slug,
      language: submission.language,
      status: submission.status,
      code: submission.code
    });

    // Check Redis Cache first
    let cachedDiagnosis: any = await getAnalysisCache(fingerprint);
    if (!cachedDiagnosis) {
      cachedDiagnosis = await prisma.diagnosisResult.findUnique({
        where: { fingerprint },
        include: {
          primaryWeakness: true,
          recommendations: { include: { strategy: true } }
        }
      });
      if (cachedDiagnosis) {
        await setAnalysisCache(fingerprint, cachedDiagnosis);
      }
    }

    let diagnosis: any;
    let aiDiagnosis: any;

    if (cachedDiagnosis && cachedDiagnosis.modelVersion === DIAGNOSIS_MODEL_VERSION) {
      diagnosis = cachedDiagnosis;
      // If linked to a different submission, link to this one
      if (diagnosis.submissionId !== submission.id) {
        diagnosis = await prisma.diagnosisResult.update({
          where: { id: diagnosis.id },
          data: { submissionId: submission.id },
          include: {
            primaryWeakness: true,
            recommendations: { include: { strategy: true } }
          }
        });
        await setAnalysisCache(fingerprint, diagnosis);
      }

      const savedJson = diagnosis.diagnosisJson as any;
      if (savedJson) {
        aiDiagnosis = savedJson;
      } else {
        // Fallback reconstruction
        aiDiagnosis = {
          primaryWeaknessId: diagnosis.primaryWeakness.type,
          primaryWeaknessName: diagnosis.primaryWeakness.name,
          confidence: (diagnosis.progressMetrics as any)?.confidence ?? 85,
          reasoningChain: (diagnosis.progressMetrics as any)?.reasoningChain ?? '',
          learningRecommendations: diagnosis.recommendations.map((r: any) => ({
            name: r.strategy?.name ?? '',
            description: r.strategy?.description ?? '',
            estimatedTime: r.strategy?.estimatedTime ?? 0,
            priority: r.strategy?.priority ?? 'medium',
            practiceProblems: r.strategy?.practiceProblems.map((slug: string) => ({
              problemSlug: slug,
              title: slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              difficulty: 'Medium'
            })) ?? []
          }))
        };
      }
    } else {
      // Concurrency locking: acquire lock on fingerprint
      const lockKey = `analysis:${fingerprint}`;
      const acquired = await acquireLock(lockKey, 35000);
      if (!acquired) {
        // Lock not acquired, another request is generating AI for this fingerprint.
        // Wait and check the database again.
        let retries = 5;
        while (retries > 0 && !cachedDiagnosis) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          cachedDiagnosis = await prisma.diagnosisResult.findUnique({
            where: { fingerprint },
            include: {
              primaryWeakness: true,
              recommendations: { include: { strategy: true } }
            }
          });
          retries--;
        }
        if (cachedDiagnosis) {
          diagnosis = cachedDiagnosis;
          const savedJson = diagnosis.diagnosisJson as any;
          aiDiagnosis = savedJson;
        } else {
          console.warn(`[Redis Lock] Lock acquisition timed out for fingerprint ${fingerprint}. Generating AI anyway.`);
        }
      }

      if (!diagnosis) {
        try {
          // 11. Generate AI Diagnosis using structured diagnosis generator
          aiDiagnosis = await generateAIDiagnosis(mappedSubmission, similarFailures, pageRankScores);

          // 12. Save DiagnosisResult in PostgreSQL
          // Query/Upsert primary weakness node in postgres
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

          if (cachedDiagnosis) {
            diagnosis = await prisma.diagnosisResult.update({
              where: { fingerprint },
              data: {
                submissionId: submission.id,
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
            diagnosis = await prisma.diagnosisResult.create({
              data: {
                userId,
                submissionId: submission.id,
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

          // Delete old recommendations if they exist (in case of overwrite)
          await prisma.learningRecommendation.deleteMany({
            where: { diagnosisId: diagnosis.id }
          });

          // Save recommendations and strategies
          for (const rec of aiDiagnosis.learningRecommendations) {
            // Find or create learning strategy in db
            const strategy = await prisma.learningStrategy.create({
              data: {
                weaknessId: primaryWeaknessNode.id,
                name: rec.name,
                description: rec.description,
                estimatedTime: rec.estimatedTime,
                priority: rec.priority,
                practiceProblems: rec.practiceProblems.map((p: any) => p.problemSlug)
              }
            });

            await prisma.learningRecommendation.create({
              data: {
                diagnosisId: diagnosis.id,
                strategyId: strategy.id,
                completed: false
              }
            });
          }

          // Cache the complete diagnosis result
          const fullDiagnosis = await prisma.diagnosisResult.findUnique({
            where: { id: diagnosis.id },
            include: {
              primaryWeakness: true,
              recommendations: { include: { strategy: true } }
            }
          });
          if (fullDiagnosis) {
            await setAnalysisCache(fingerprint, fullDiagnosis);
          }
        } finally {
          await releaseLock(lockKey);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        diagnosisId: diagnosis.id,
        primaryWeakness: aiDiagnosis.primaryWeaknessName,
        confidence: aiDiagnosis.confidence,
        hypotheses,
        recommendations: aiDiagnosis.learningRecommendations,
        similarFailuresCount: similarFailures.length
      }
    });

  } catch (error) {
    console.error('❌ Ingestion/Analysis error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to complete failure analysis ingestion pipeline' } },
      { status: 500 }
    );
  }
}
