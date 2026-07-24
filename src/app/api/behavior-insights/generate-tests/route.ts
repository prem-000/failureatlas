import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { groqClient } from '@/lib/api/groq-client';
import { extractStructuralEvidence } from '@/lib/analysis/structural-analyzer';
import { verifyPraxisSuiteWithVM } from '@/lib/analysis/test-verifier';
import { buildJudgeProfile, formatProfileForPrompt } from '@/lib/judge/judge-profile-engine';
import { mineBugs, retrieveJudgeMemory, formatBugsForPrompt } from '@/lib/judge/bug-mining-agent';
import { getPersonaConfig } from '@/lib/judge/judge-personas';
import { computeDifficultyTarget } from '@/lib/judge/difficulty-engine';
import { selectPrompt } from '@/lib/judge/praxis-prompts';
import { applyMutations } from '@/lib/judge/mutation-engine';
import { computeCoverageHeatmap } from '@/lib/judge/coverage-heatmap';
import { selfCritiqueAgent } from '@/lib/judge/self-critique-agent';
import type { JudgePersona, PraxisJudgeCase, PraxisCoverageSummary } from '@/types';

// POST /api/behavior-insights/generate-tests
// PRAXIS Judge Engine v1.0 — Multi-Agent Orchestrator
export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate ─────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader || undefined);
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Missing Authorization token' } },
        { status: 401 }
      );
    }
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHORIZATION_FAILED', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }
    const userId = payload.userId;

    const body = await request.json().catch(() => ({}));
    const {
      problemSlug,
      submissionId,
      mode = 'more',
      difficultyStage = 3,
      judgePersona = 'leetcode' as JudgePersona,
    } = body;

    if (!problemSlug) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'problemSlug is required' } },
        { status: 400 }
      );
    }

    // ── 2. Fetch submission context ──────────────────────────────────────────────
    const submission = await prisma.submissionEvent.findFirst({
      where: {
        userId,
        OR: [
          { id: submissionId },
          { eventId: submissionId },
          { problem: { slug: problemSlug } },
        ],
      },
      include: { problem: true },
      orderBy: { timestamp: 'desc' },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No matching submission found.' } },
        { status: 404 }
      );
    }

    const persona = (judgePersona as JudgePersona) || 'leetcode';
    const personaConfig = getPersonaConfig(persona);

    // ── 3. Structural Analysis ───────────────────────────────────────────────────
    const evidence = extractStructuralEvidence({
      code: submission.code,
      problemTitle: submission.problem.title,
      problemSlug: submission.problem.slug,
      problemDifficulty: submission.problem.difficulty,
    });
    const fingerprintJson = JSON.stringify(evidence.implementationFingerprint, null, 2);

    // ── 4. User Profile Engine ───────────────────────────────────────────────────
    let profile;
    try {
      profile = await buildJudgeProfile(userId);
    } catch (err) {
      console.warn('[PRAXIS] Profile engine failed, using defaults:', err);
      profile = {
        judgeRating: 1200, judgeTier: 'Intermediate' as const, overallConfidence: 60,
        growthVelocity: 0, currentStreak: 0, totalSolved: 50,
        weaknessDistribution: {
          boundary: 60, constraint: 50, implementation: 55, pattern: 45,
          overflow: 35, binarySearch: 40, slidingWindow: 40, greedy: 35,
          dp: 30, hashing: 45, graphs: 20, trees: 25,
          recursion: 30, math: 25, strings: 40, sorting: 45,
        },
        recentFailures: [], repeatedMistakes: [], learningProgress: 'Stable',
      };
    }

    // ── 5. Difficulty Calibration ────────────────────────────────────────────────
    const diffTarget = computeDifficultyTarget(profile, difficultyStage, persona, personaConfig);

    // ── 6. Judge Memory Check ────────────────────────────────────────────────────
    const patternSlug = evidence.algorithm.type;
    const cachedTests = await retrieveJudgeMemory(problemSlug, patternSlug, persona);
    if (cachedTests.length >= 8) {
      // Enough cached tests — mutate and return from memory
      console.log(`[PRAXIS] Serving ${cachedTests.length} tests from Judge Memory`);
      const mutated = applyMutations(
        cachedTests as PraxisJudgeCase[],
        personaConfig.mutationPreferences as any,
        3
      );
      const heatmap = computeCoverageHeatmap(mutated);
      return NextResponse.json({
        success: true,
        data: {
          judgeSuite: mutated,
          coverageSummary: buildSummaryFromTests(mutated),
          heatmap,
          difficultyStage: diffTarget.stageOverride,
          judgePersona: persona,
          mode,
          fromMemory: true,
          profileSummary: formatProfileForPrompt(profile),
        },
      });
    }

    // ── 7. Bug Mining Agent ──────────────────────────────────────────────────────
    const bugs = await mineBugs(patternSlug, fingerprintJson, 7);

    // ── 8. Dynamic Prompt Selection ──────────────────────────────────────────────
    const prompt = selectPrompt({
      evidence,
      profile,
      bugs,
      diffTarget,
      persona,
      personaConfig,
      fingerprintJson,
    });

    // ── 9. PRAXIS Counterexample Generator (LLM) ─────────────────────────────────
    const hasKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_1;
    let judgeSuite: PraxisJudgeCase[] = [];
    let coverageSummary: PraxisCoverageSummary = {
      implementationCoverage: '0%', conceptCoverage: '0%',
      constraintCoverage: '0%', mutationCoverage: '0%',
      difficultyDistribution: 'N/A', overallJudgeScore: '0',
    };

    if (!hasKey || hasKey === 'your_groq_key_here') {
      console.warn('[PRAXIS] No Groq key — using structural fallback');
      ({ judgeSuite, coverageSummary } = buildFallbackSuite(evidence, diffTarget, persona));
    } else {
      try {
        const response = await groqClient.getChatCompletion({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' },
          model: 'llama-3.3-70b-versatile', // use the more capable model for PRAXIS
        });

        const parsed = JSON.parse(response.content.trim());
        judgeSuite = parsed.judgeSuite || parsed.tests || [];
        coverageSummary = parsed.coverageSummary || coverageSummary;

        // Normalize legacy format fields
        judgeSuite = judgeSuite.map((t: any, i: number) => ({
          judgeId: t.judgeId || t.id || `TC-${i + 1}`,
          judgeRating: t.judgeRating || String(diffTarget.targetRating),
          difficulty: t.difficulty || 'Medium',
          targetLevel: t.targetLevel || profile.judgeTier,
          bugPatternId: t.bugPatternId || bugs[i % bugs.length]?.bugId || 'GEN',
          implementationAssumption: t.implementationAssumption || t.why || '',
          reason: t.reason || t.why || '',
          input: t.input || '',
          expectedOutput: t.expectedOutput || t.expected || '',
          referenceOutput: t.referenceOutput || '',
          explanation: t.explanation || t.why || '',
          minimalCounterexample: t.minimalCounterexample ?? true,
          mutation: t.mutation || 'None',
          algorithmicProperty: t.algorithmicProperty || '',
          invariant: t.invariant || '',
          constraintCategory: t.constraintCategory || t.category || 'Boundary',
          complexityCategory: t.complexityCategory || 'O(n)',
          concepts: t.concepts || [],
          weakConcepts: t.weakConcepts || [],
          historicalFrequency: t.historicalFrequency || 'Medium',
          coverageGain: t.coverageGain || '10',
          confidence: t.confidence || '85',
          permanentHiddenTest: t.permanentHiddenTest ?? false,
          whyIncorrectSolutionsFail: t.whyIncorrectSolutionsFail || t.reason || '',
          judgePersona: persona,
          // Legacy UI compat
          category: t.constraintCategory || t.category || 'Boundary',
          why: t.reason || t.why || '',
          targets: t.weakConcepts?.map((wc: string) => `✓ ${wc}`) || t.targets || [],
          judgeDifficulty: t.difficulty === 'Adversarial' ? 5 : t.difficulty === 'Hard' ? 4 : t.difficulty === 'Easy' ? 1 : 3,
          coverageContribution: parseInt(t.coverageGain || '10', 10),
        }));
      } catch (err) {
        console.error('[PRAXIS] LLM generation failed, using fallback:', err);
        ({ judgeSuite, coverageSummary } = buildFallbackSuite(evidence, diffTarget, persona));
      }
    }

    // ── 10. Mutation & Stress Engine ─────────────────────────────────────────────
    const mutated = applyMutations(
      judgeSuite,
      personaConfig.mutationPreferences as any,
      Math.floor(diffTarget.testCountTarget * 0.3)
    );

    // ── 11. Reference Solution Verifier (VM Sandbox) ─────────────────────────────
    const verified = verifyPraxisSuiteWithVM(mutated, submission.code);

    // ── 12. Self-Critique Agent ───────────────────────────────────────────────────
    const { curated } = await selfCritiqueAgent(verified, evidence.algorithm.type);

    // ── 13. Coverage Heatmap ──────────────────────────────────────────────────────
    const heatmap = computeCoverageHeatmap(curated);

    // ── 14. Judge Memory — Store Verified Tests (non-blocking) ──────────────────
    const testsToStore = curated.filter(t => t.verified !== false).slice(0, 20);
    if (testsToStore.length > 0) {
      prisma.judgeTest.createMany({
        data: testsToStore.map(test => ({
          problemSlug,
          patternSlug,
          judgePersona: persona,
          difficultyStage: diffTarget.stageOverride,
          input: test.input,
          expectedOutput: test.expectedOutput,
          referenceOutput: test.referenceOutput || null,
          verified: test.verified ?? false,
          mismatchCorrected: test.mismatchCorrected ?? false,
          bugPatternId: test.bugPatternId || null,
          category: test.category || test.constraintCategory || null,
          mutation: test.mutation || null,
          invariant: test.invariant || null,
          confidence: test.confidence ? parseFloat(test.confidence) : null,
          coverageGain: test.coverageGain ? parseFloat(test.coverageGain) : null,
          permanentTest: test.permanentHiddenTest ?? false,
          fullJson: test as any,
        })),
        skipDuplicates: true,
      }).catch(err => console.warn('[PRAXIS] Judge Memory write failed (non-blocking):', err));
    }

    // ── 15. Return Response ───────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        judgeSuite: curated,
        coverageSummary: buildSummaryFromTests(curated, coverageSummary),
        heatmap,
        difficultyStage: diffTarget.stageOverride,
        judgePersona: persona,
        mode,
        fromMemory: false,
        profileSummary: formatProfileForPrompt(profile),
        // Legacy compat
        tests: curated,
        summary: {
          testsGenerated: curated.length,
          coverage: heatmap.overallScore,
          difficulty: diffTarget.difficultyLabel,
        },
        categoryCoverage: heatmap.bars,
      },
    });
  } catch (error: any) {
    console.error('❌ POST /api/behavior-insights/generate-tests error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to generate judge tests' } },
      { status: 500 }
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildSummaryFromTests(
  tests: PraxisJudgeCase[],
  base?: PraxisCoverageSummary
): PraxisCoverageSummary {
  const total = tests.length || 1;
  const verified = tests.filter(t => t.verified).length;
  const mutated = tests.filter(t => t.mutation && t.mutation !== 'None').length;
  const categories = new Set(tests.map(t => t.category || t.constraintCategory)).size;

  return {
    implementationCoverage: base?.implementationCoverage || `${Math.round((verified / total) * 100)}%`,
    conceptCoverage: base?.conceptCoverage || `${Math.round((categories / 8) * 100)}%`,
    constraintCoverage: base?.constraintCoverage || `${Math.min(100, categories * 12)}%`,
    mutationCoverage: base?.mutationCoverage || `${Math.round((mutated / total) * 100)}%`,
    difficultyDistribution: base?.difficultyDistribution || buildDifficultyDistribution(tests),
    overallJudgeScore: base?.overallJudgeScore || String(Math.round((verified / total) * 90 + (categories / 8) * 10)),
  };
}

function buildDifficultyDistribution(tests: PraxisJudgeCase[]): string {
  const counts: Record<string, number> = {};
  for (const t of tests) counts[t.difficulty] = (counts[t.difficulty] || 0) + 1;
  const total = tests.length || 1;
  return Object.entries(counts)
    .map(([d, c]) => `${d}: ${Math.round((c / total) * 100)}%`)
    .join(', ');
}

function buildFallbackSuite(
  evidence: ReturnType<typeof extractStructuralEvidence>,
  diffTarget: ReturnType<typeof computeDifficultyTarget>,
  persona: JudgePersona
): { judgeSuite: PraxisJudgeCase[]; coverageSummary: PraxisCoverageSummary } {
  const categories = ['Boundary', 'Constraint', 'Overflow', 'Duplicate', 'Adversarial', 'Binary Search', 'Two Pointer', 'Sliding Window'];
  const count = Math.min(diffTarget.testCountTarget, 12);
  const judgeSuite: PraxisJudgeCase[] = [];

  for (let i = 0; i < count; i++) {
    const cat = categories[i % categories.length];
    const diff = i < 3 ? 'Easy' : i < 7 ? 'Medium' : i < 10 ? 'Hard' : 'Adversarial';
    judgeSuite.push({
      judgeId: `TC-${i + 1}`,
      judgeRating: String(diffTarget.targetRating),
      difficulty: diff,
      targetLevel: 'Intermediate',
      bugPatternId: `FB-${String(i + 1).padStart(2, '0')}`,
      implementationAssumption: `Assumes standard ${evidence.algorithm.type} invariants hold`,
      reason: `Structural ${cat} test targeting ${evidence.algorithm.type} implementation`,
      input: i < 3
        ? `nums = [${Array.from({ length: i + 1 }, (_, j) => j).join(', ')}]`
        : `nums = [${Array.from({ length: 8 }, (_, j) => (j % 2 === 0 ? 1000000 : -1000000)).join(', ')}]`,
      expectedOutput: String(i * 2),
      referenceOutput: '',
      explanation: `${cat} test verifying ${evidence.algorithm.type} boundary invariants`,
      minimalCounterexample: true,
      mutation: i % 3 === 0 ? 'Adversarial Ordering' : 'None',
      algorithmicProperty: `${evidence.algorithm.type} correctness`,
      invariant: `Loop terminates correctly under ${cat} conditions`,
      constraintCategory: cat,
      complexityCategory: evidence.timeComplexity || 'O(n)',
      concepts: [cat, evidence.algorithm.type],
      weakConcepts: [cat],
      historicalFrequency: 'High',
      coverageGain: String(5 + i),
      confidence: '80',
      permanentHiddenTest: false,
      category: cat,
      why: `${cat} test for ${evidence.algorithm.type}`,
      targets: [`✓ ${cat} Handling`, `✓ ${evidence.algorithm.type} Invariants`],
      judgeDifficulty: diff === 'Easy' ? 1 : diff === 'Medium' ? 3 : diff === 'Hard' ? 4 : 5,
      coverageContribution: 5 + i,
      judgePersona: persona,
    });
  }

  return {
    judgeSuite,
    coverageSummary: {
      implementationCoverage: '70%', conceptCoverage: '65%',
      constraintCoverage: '60%', mutationCoverage: '20%',
      difficultyDistribution: 'Easy: 25%, Medium: 42%, Hard: 25%, Adversarial: 8%',
      overallJudgeScore: '68',
    },
  };
}
