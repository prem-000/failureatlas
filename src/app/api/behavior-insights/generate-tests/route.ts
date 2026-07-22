import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth/jwt';
import { groqClient } from '@/lib/api/groq-client';
import { extractStructuralEvidence } from '@/lib/analysis/structural-analyzer';
import { computeCategoryCoverage } from '@/lib/analysis/code-intelligence';
import { verifyTestSuite } from '@/lib/analysis/test-verifier';

// POST /api/behavior-insights/generate-tests
// Judge-Driven Hidden Test Synthesizer based on structural evidence & implementation fingerprints
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
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHORIZATION_FAILED', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }
    const userId = payload.userId;

    const body = await request.json().catch(() => ({}));
    const { problemSlug, submissionId, mode = 'more', difficultyStage = 3 } = body;

    if (!problemSlug) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'problemSlug is required' } },
        { status: 400 }
      );
    }

    // 2. Fetch the submission context
    const submission = await prisma.submissionEvent.findFirst({
      where: {
        userId,
        OR: [
          { id: submissionId },
          { eventId: submissionId },
          { problem: { slug: problemSlug } }
        ]
      },
      include: { problem: true },
      orderBy: { timestamp: 'desc' }
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No matching submission event found.' } },
        { status: 404 }
      );
    }

    // 3. Extract structural evidence with concise Problem Context (100-200 tokens) & Fingerprint Confidence Scores
    const evidence = extractStructuralEvidence({
      code: submission.code,
      problemTitle: submission.problem.title,
      problemSlug: submission.problem.slug,
      problemDifficulty: submission.problem.difficulty,
    });

    const isAdversarial = mode === 'harder' || difficultyStage >= 4;

    // 4. Construct Judge Prompt with explicit Problem Summary, Constraints, Fingerprint Confidence & Concept Targets
    const prompt = `You are the hidden test generation engine of an online programming judge (LeetCode / Codeforces / AtCoder).
The submitted solution has already been Accepted. Your task is NOT to solve the problem.
Instead: Analyze the problem context and structural implementation evidence. Infer fragile implementation decisions and generate hidden judge test cases specifically targeted to attack this implementation.

Problem Summary & Constraints (100–200 tokens context):
- Summary: ${evidence.problem.summary}
- Input Format: ${evidence.problem.inputFormat}
- Output Format: ${evidence.problem.outputFormat}
- Constraints: ${evidence.problem.constraints}

Structural Fingerprint & Confidence Scores:
${JSON.stringify(evidence.implementationFingerprint, null, 2)}

Target Logic Concepts to Stressed:
${JSON.stringify(evidence.criticalSnippets)}

Mode: ${isAdversarial ? 'ADVERSARIAL_JUDGE_KILLER' : 'HIDDEN_JUDGE_SYNTHESIS'}

Target Instructions:
${
  isAdversarial
    ? `Generate 10 to 15 adversarial "judge killer" tests focused on worst-case runtime/memory, integer overflow, maximum constraints, degenerate trees/graphs, adversarial hash collisions, binary search traps, sliding window traps, DP transition traps, recursion depth/stack overflow, and greedy counterexamples.`
    : `Generate 15 to 20 realistic hidden judge tests covering normal cases, boundary values, off-by-one conditions, duplicate values, maximum/minimum constraints, empty inputs, and pointer movement from Easy to Hard.`
}

Category Badges to Use:
Use ONLY these category badges for "category":
["Boundary", "Constraint", "Overflow", "Duplicate", "Binary Search", "Greedy", "DP", "Graph", "Tree", "Hashing", "Sliding Window", "Two Pointer", "Adversarial", "Judge Killer"]

IMPORTANT REGARDING TARGETS:
For "targets", use concise human-understandable concept statements with checkmarks (e.g. ["✓ Boundary comparison", "✓ Right pointer update", "✓ Duplicate handling", "✓ Early exit"]) instead of raw code snippets.

Return ONLY a valid raw JSON object matching this exact schema (no markdown formatting, no text wrapper):
{
  "summary": {
    "testsGenerated": number,
    "coverage": number,
    "difficulty": "${isAdversarial ? 'Hard' : 'Medium'}"
  },
  "tests": [
    {
      "id": number,
      "category": "Boundary | Constraint | Overflow | Duplicate | Binary Search | Greedy | DP | Graph | Tree | Hashing | Sliding Window | Two Pointer | Adversarial | Judge Killer",
      "difficulty": "Easy | Medium | Hard | Adversarial",
      "input": "formatted test input string",
      "expectedOutput": "expected result string",
      "why": "concise explanation of why this test exists and how it breaks fragile logic",
      "targets": ["✓ Concept statement 1", "✓ Concept statement 2"],
      "coverageContribution": number
    }
  ]
}`;

    const hasKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_1;
    let tests = [];
    let summary = {
      testsGenerated: isAdversarial ? 12 : 20,
      coverage: isAdversarial ? 98 : 94,
      difficulty: isAdversarial ? 'Adversarial' : 'Medium'
    };

    if (!hasKey || hasKey === 'your_groq_key_here') {
      console.warn('⚠️ No Groq API key available. Generating structural judge fallback tests.');
      const fallbackData = getFallbackJudgeTests(evidence, isAdversarial, difficultyStage);
      tests = fallbackData.tests;
      summary = fallbackData.summary;
    } else {
      const response = await groqClient.getChatCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      try {
        const parsed = JSON.parse(response.content.trim());
        tests = parsed.tests || [];
        if (parsed.summary) {
          summary = parsed.summary;
        }
      } catch (parseErr) {
        console.error('Failed to parse Groq response JSON, falling back to structured fallback:', parseErr);
        const fallbackData = getFallbackJudgeTests(evidence, isAdversarial, difficultyStage);
        tests = fallbackData.tests;
        summary = fallbackData.summary;
      }
    }

    // 5. Expected Output Verification: Verify generated test cases against reference execution logic
    tests = verifyTestSuite(tests, submission.code, evidence.algorithm.type);

    // 4. Computed Category Coverage: Compute deterministic category coverage
    const computedCov = computeCategoryCoverage(tests as any[]);
    summary.coverage = computedCov.coveragePercent;

    return NextResponse.json({
      success: true,
      data: {
        tests,
        summary,
        categoryCoverage: computedCov.categories,
        difficultyStage,
        mode
      }
    });

  } catch (error: any) {
    console.error('❌ POST /api/behavior-insights/generate-tests error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to generate judge tests' } },
      { status: 500 }
    );
  }
}

function getFallbackJudgeTests(
  evidence: ReturnType<typeof extractStructuralEvidence>,
  isAdversarial: boolean,
  stage: number
) {
  const categories = isAdversarial
    ? ['Judge Killer', 'Adversarial', 'Overflow', 'Constraint', 'Sliding Window', 'Binary Search', 'DP', 'Greedy']
    : ['Boundary', 'Duplicate', 'Constraint', 'Two Pointer', 'Hashing', 'Overflow', 'Tree', 'Graph'];

  const count = isAdversarial ? 12 : 20;
  const tests = [];

  for (let i = 1; i <= count; i++) {
    const category = categories[(i - 1) % categories.length];
    const difficulty = isAdversarial
      ? (i % 3 === 0 ? 'Adversarial' : 'Hard')
      : (i <= 5 ? 'Easy' : i <= 14 ? 'Medium' : 'Hard');

    const targetSnippets = evidence.criticalSnippets.slice(0, 2);
    if (targetSnippets.length === 0) {
      targetSnippets.push(evidence.implementationFingerprint.terminationCondition?.type || 'loop termination');
    }

    tests.push({
      id: i,
      category,
      difficulty,
      input: isAdversarial
        ? `N = 10^5, arr = [${Array.from({ length: 8 }, (_, idx) => (idx % 2 === 0 ? 1000000 : -1000000)).join(', ')}, ... x10000]`
        : `nums = [${Array.from({ length: Math.min(6, i) }, (_, idx) => idx * (i % 2 === 0 ? 1 : -1)).join(', ')}]`,
      expectedOutput: isAdversarial ? '1000000000' : `${i * 2}`,
      why: isAdversarial
        ? `Adversarial stress test targeting ${evidence.knownWeaknesses[0] || 'worst-case runtime bounds'}.`
        : `Verifies structural boundary logic for ${evidence.algorithm} under ${category.toLowerCase()} input.`,
      targets: targetSnippets,
      judgeDifficulty: isAdversarial ? 5 : Math.min(5, Math.max(1, Math.ceil(i / 4))),
      whyIncorrectSolutionsFail: `Implementations assuming non-negative bounds or non-duplicate arrays fail under ${category} conditions.`,
      coverageContribution: Math.round(5 + (i * 4) % 15),
    });
  }

  return {
    summary: {
      testsGenerated: count,
      coverage: isAdversarial ? 98 : 94,
      difficulty: isAdversarial ? 'Adversarial' : 'Hard',
    },
    tests,
  };
}
