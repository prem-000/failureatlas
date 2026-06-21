import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

export interface DailyMissionResult {
  primaryProblem: {
    slug: string;
    title: string;
    difficulty: string;
    stage: string;
  };
  secondaryProblem: {
    slug: string;
    title: string;
    difficulty: string;
    targetedWeakness: string;
  } | null;
  failureRisk: number;
  successProbability: number;
  aiHint: string;
  expectedLearningGain: string[];
}

const ROADMAP_STAGES = [
  'Arrays',
  'Prefix Sum',
  'Sliding Window',
  'Two Pointers',
  'Binary Search',
  'Trees',
  'Graphs',
  'Dynamic Programming'
];

/**
 * Maps topics and patterns of a LeetcodeProblem to one of the 8 roadmap stages.
 */
export function getProblemStage(topics: string[], patterns: string[]): string {
  const tList = topics.map(t => t.toLowerCase());
  const pList = patterns.map(p => p.toLowerCase());

  if (pList.some(p => p.startsWith('dp')) || tList.includes('dynamic programming')) {
    return 'Dynamic Programming';
  }
  if (
    tList.includes('graph') ||
    tList.includes('topological sort') ||
    tList.includes('union find') ||
    tList.includes('shortest path') ||
    pList.includes('union-find') ||
    pList.includes('dijkstra') ||
    pList.includes('topological-sort')
  ) {
    return 'Graphs';
  }
  if (
    tList.includes('tree') ||
    tList.includes('bst') ||
    pList.includes('tree') ||
    pList.includes('bst') ||
    tList.includes('binary tree')
  ) {
    return 'Trees';
  }
  if (pList.some(p => p.includes('binary-search'))) {
    return 'Binary Search';
  }
  if (pList.includes('two-pointers')) {
    return 'Two Pointers';
  }
  if (pList.includes('sliding-window')) {
    return 'Sliding Window';
  }
  if (pList.includes('prefix-sum')) {
    return 'Prefix Sum';
  }
  if (pList.includes('hash-map') || tList.includes('array') || tList.includes('hash table')) {
    return 'Arrays';
  }
  return 'Arrays'; // Fallback
}

/**
 * Maps a user's ranked weakness category to candidate patterns/topics for reinforcement.
 */
function getPatternsForWeakness(weaknessName: string): string[] {
  const w = weaknessName.toLowerCase();
  if (w.includes('boundary') || w.includes('edge') || w.includes('off-by-one')) {
    return ['binary-search', 'binary-search-on-answer', 'sliding-window', 'two-pointers'];
  }
  if (w.includes('pattern') || w.includes('recognition')) {
    return ['two-pointers', 'sliding-window', 'hash-map', 'prefix-sum'];
  }
  if (w.includes('complexity') || w.includes('time') || w.includes('performance') || w.includes('space')) {
    return ['binary-search', 'binary-search-on-answer', 'dp-1d', 'dp-2d', 'greedy'];
  }
  if (w.includes('structure') || w.includes('data') || w.includes('mismatch')) {
    return ['hash-map', 'stack', 'monotonic-stack', 'heap'];
  }
  return ['binary-search', 'sliding-window', 'two-pointers'];
}

async function callGroq(prompt: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not defined');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

export async function generateDailyMission(userId: string): Promise<DailyMissionResult> {
  logger.info(`🎯 Starting daily mission generation for userId=${userId}`);

  // 1. Fetch user context
  const [successfulSubmissions, recentFailuresDb, allProblems, topWeaknesses] = await Promise.all([
    prisma.submissionEvent.findMany({
      where: { userId, status: 'Accepted' },
      include: { problem: true }
    }),
    prisma.submissionEvent.findMany({
      where: { userId, NOT: { status: 'Accepted' } },
      include: { problem: true, evidence: { include: { rootCauseHypotheses: true } } },
      orderBy: { timestamp: 'desc' },
      take: 10
    }),
    prisma.leetcodeProblem.findMany(),
    prisma.systemicWeakness.findMany({
      where: { diagnoses: { some: { userId } } },
      orderBy: { pageRankScore: 'desc' },
      take: 3
    })
  ]);

  const solvedProblemSlugs = new Set(successfulSubmissions.map(s => s.problem.slug));

  // 2. Query previously recommended problems within last 30 days (Anti-Repetition)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentMissions = await prisma.dailyMission.findMany({
    where: {
      userId,
      createdAt: { gte: thirtyDaysAgo }
    },
    select: {
      primaryProblemSlug: true,
      secondaryProblemSlug: true
    }
  });

  const recentlyRecommendedSlugs = new Set<string>();
  for (const m of recentMissions) {
    recentlyRecommendedSlugs.add(m.primaryProblemSlug);
    if (m.secondaryProblemSlug) {
      recentlyRecommendedSlugs.add(m.secondaryProblemSlug);
    }
  }

  // 3. Selection Logic: Primary Problem (Progression)
  let primaryProblem: any = null;
  let primaryStage = '';

  for (const stage of ROADMAP_STAGES) {
    const stageProblems = allProblems.filter(p => getProblemStage(p.topics, p.patterns) === stage);
    if (stageProblems.length === 0) continue;

    const unsolved = stageProblems.filter(p => !solvedProblemSlugs.has(p.slug));
    if (unsolved.length === 0) {
      // Stage is mastered
      continue;
    }

    // Filter by anti-repetition rule
    const notRecommended = unsolved.filter(p => !recentlyRecommendedSlugs.has(p.slug));
    if (notRecommended.length > 0) {
      primaryProblem = notRecommended[0];
      primaryStage = stage;
      break;
    } else {
      // Relax 30-day rule to ensure progression
      primaryProblem = unsolved[0];
      primaryStage = stage;
      break;
    }
  }

  // Fallback if all stages are mastered
  if (!primaryProblem && allProblems.length > 0) {
    const unsolved = allProblems.filter(p => !solvedProblemSlugs.has(p.slug));
    const pool = unsolved.length > 0 ? unsolved : allProblems;
    const notRecommended = pool.filter(p => !recentlyRecommendedSlugs.has(p.slug));
    primaryProblem = notRecommended.length > 0 ? notRecommended[0] : pool[0];
    primaryStage = getProblemStage(primaryProblem.topics, primaryProblem.patterns);
  }

  if (!primaryProblem) {
    throw new Error('No problems available to generate a mission.');
  }

  // 4. Selection Logic: Secondary Problem (Reinforcement)
  let secondaryProblem: any = null;
  let targetedWeaknessName = 'Boundary Condition Errors'; // default

  if (topWeaknesses.length > 0) {
    targetedWeaknessName = topWeaknesses[0].name;
  }

  const weaknessPatterns = getPatternsForWeakness(targetedWeaknessName);

  // Find candidates that target this weakness
  const reinforcementCandidates = allProblems.filter(p =>
    p.slug !== primaryProblem.slug &&
    p.patterns.some(pat => weaknessPatterns.includes(pat.toLowerCase()))
  );

  if (reinforcementCandidates.length > 0) {
    // Prioritize unsolved and not recently recommended
    const unsolved = reinforcementCandidates.filter(p => !solvedProblemSlugs.has(p.slug));
    const pool = unsolved.length > 0 ? unsolved : reinforcementCandidates;

    const notRecommended = pool.filter(p => !recentlyRecommendedSlugs.has(p.slug));
    secondaryProblem = notRecommended.length > 0 ? notRecommended[0] : pool[0];
  }

  // 5. Predict Failure Risk and Success Probability
  // Formula: Failure Risk = 0.4 × Weakness Score + 0.3 × Historical Failure Rate + 0.2 × Difficulty Gap + 0.1 × Recent Performance Decline

  // A. Weakness Score (0 to 100)
  // Maps to pageRankScore of highest weakness
  let weaknessScore = 20; // default baseline
  if (topWeaknesses.length > 0) {
    weaknessScore = Math.min(100, Math.round(topWeaknesses[0].pageRankScore * 100));
  }

  // B. Historical Failure Rate (0 to 100)
  const totalSubmissionsCount = await prisma.submissionEvent.count({ where: { userId } });
  const failedSubmissionsCount = await prisma.submissionEvent.count({
    where: { userId, NOT: { status: 'Accepted' } }
  });
  const historicalFailureRate = totalSubmissionsCount > 0
    ? Math.round((failedSubmissionsCount / totalSubmissionsCount) * 100)
    : 30; // default baseline

  // C. Difficulty Gap (0 to 100)
  // Easy = 1, Medium = 2, Hard = 3
  const diffMap: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
  const primaryDiffNum = diffMap[primaryProblem.difficulty] || 2;
  const userSolvedDiffs = successfulSubmissions.map(s => diffMap[s.problem.difficulty] || 1);
  const avgSolvedDiff = userSolvedDiffs.length > 0
    ? userSolvedDiffs.reduce((acc, curr) => acc + curr, 0) / userSolvedDiffs.length
    : 1.0;

  const diffGap = Math.max(0, primaryDiffNum - avgSolvedDiff);
  const normalizedDiffGap = Math.min(100, Math.round(diffGap * 50));

  // D. Recent Performance Decline (0 to 100)
  // Compare failure rate of last 10 vs 40 before that
  const last50Subs = await prisma.submissionEvent.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  let recentDecline = 0;
  if (last50Subs.length >= 10) {
    const last10 = last50Subs.slice(0, 10);
    const prev40 = last50Subs.slice(10);

    const last10Failures = last10.filter(s => s.status !== 'Accepted').length;
    const last10Rate = last10Failures / last10.length;

    const prevFailures = prev40.filter(s => s.status !== 'Accepted').length;
    const prevRate = prev40.length > 0 ? prevFailures / prev40.length : 0.3;

    recentDecline = Math.max(0, Math.round((last10Rate - prevRate) * 100));
  }

  // Calculate Failure Risk using the formula
  const calculatedRisk = (0.4 * weaknessScore) + (0.3 * historicalFailureRate) + (0.2 * normalizedDiffGap) + (0.1 * recentDecline);
  const failureRisk = Math.max(5, Math.min(95, Math.round(calculatedRisk)));
  const successProbability = 100 - failureRisk;

  // 6. Generate AI Hint & expected learning gains via Groq (with static fallbacks)
  let aiHint = '';
  let expectedLearningGain: string[] = [];

  const defaultGains = [
    `+14% ${primaryStage} Mastery`,
    `+9% ${targetedWeaknessName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} Handling`,
    `+6% Pattern Recognition`
  ];

  const defaultHint = `Your last submissions on ${primaryStage} suggest minor index boundaries or initialization issues.
Before coding:
1. Define the search space/pointers clearly.
2. Walk through size=0 or size=1 edge cases.
3. Keep track of variables in a loop invariant.`;

  try {
    const prompt = `You are an elite competitive programming and DSA learning coach.
Generate a highly personalized daily learning mission for the user.

USER PROFILE:
- Top Weaknesses:
${topWeaknesses.map(w => `- ${w.name} (freq: ${w.frequency}, score: ${w.pageRankScore.toFixed(3)})`).join('\n') || 'None'}

- Recent Failed Submissions (last 10):
${recentFailuresDb.map(f => `- Problem: ${f.problem.title} | Status: ${f.status} | Reason: ${f.evidence.flatMap(e => e.rootCauseHypotheses)[0]?.name || 'unknown'}`).join('\n') || 'None'}

PRIMARY MISSION PROBLEM (Progression):
- Title: ${primaryProblem.title}
- Slug: ${primaryProblem.slug}
- Difficulty: ${primaryProblem.difficulty}
- Stage/Topic: ${primaryStage}

SECONDARY MISSION PROBLEM (Weakness Reinforcement):
- Title: ${secondaryProblem?.title || 'None'}
- Slug: ${secondaryProblem?.slug || 'none'}
- Difficulty: ${secondaryProblem?.difficulty || 'N/A'}
- Targeted Weakness: ${targetedWeaknessName}

INSTRUCTIONS:
1. Generate a highly personalized AI Hint for this mission.
   - Do NOT generate generic hints like "Use Binary Search."
   - The hint MUST target the user's actual failure history. E.g. if their previous failures on this pattern were caused by off-by-one errors, point that out and suggest a specific verification checklist (e.g. define search interval, loop invariant, test size=1, test left == right).
2. Estimate the Expected Learning Gain for completing this mission. Suggest 3 specific gains:
   - One for the primary problem stage mastery (e.g. "+14% Sliding Window Mastery").
   - One for the main weakness repair (e.g. "+9% Boundary Handling").
   - One for a secondary or supporting skill (e.g. "+6% Pattern Recognition").
3. Keep the tone encouraging, professional, and coach-like.

Return ONLY a valid JSON object in this exact format:
{
  "aiHint": "Your personalized hint text here...",
  "expectedLearningGain": [
    "+14% Sliding Window Mastery",
    "+9% Boundary Handling",
    "+6% Pattern Recognition"
  ]
}
`;
    const responseText = await callGroq(prompt);
    const parsed = JSON.parse(responseText);

    aiHint = parsed.aiHint || defaultHint;
    expectedLearningGain = parsed.expectedLearningGain || defaultGains;
  } catch (error) {
    logger.warn('Groq AI hint generation failed or was bypassed, using static defaults.', { error });
    aiHint = defaultHint;
    expectedLearningGain = defaultGains;
  }

  return {
    primaryProblem: {
      slug: primaryProblem.slug,
      title: primaryProblem.title,
      difficulty: primaryProblem.difficulty,
      stage: primaryStage
    },
    secondaryProblem: secondaryProblem ? {
      slug: secondaryProblem.slug,
      title: secondaryProblem.title,
      difficulty: secondaryProblem.difficulty,
      targetedWeakness: targetedWeaknessName
    } : null,
    failureRisk,
    successProbability,
    aiHint,
    expectedLearningGain
  };
}
