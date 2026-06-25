/**
 * src/lib/behavior/success-insight-engine.ts
 * Orchestrates SuccessInsight generation.
 *
 * Architecture:
 *   1. code-intelligence.ts → ALL FACTS (pattern, complexity, edge cases, quality, optimization)
 *   2. Classify L1-L4 success level from facts
 *   3. Groq (optional) → ONLY explanations (algorithmicInsight, reasonForSuccess)
 *   4. Build MLFeatures for training data storage
 *   5. Record Pattern/Mastery in graph
 */

import { prisma } from '@/lib/db/prisma';
import {
  detectPattern,
  estimateComplexity,
  scoreCodeQuality,
  scoreOptimization,
  classifySuccessLevel,
  predictFutureRisks,
  buildMLFeatures,
} from '@/lib/analysis/code-intelligence';
import { generateAdversarialTestLab } from '@/lib/behavior/adversarial-generator';
import { recordSuccessInGraph } from '@/lib/graph/mastery-operations';
import type { SuccessInsight, PatternIntelligence } from '@/types';
import { getConstraintIntelligence } from '@/lib/analysis/constraint-engine';

// ─── Groq explanation layer ───────────────────────────────────────────────────
// Only called AFTER all facts are computed. Uses facts as context.

async function generateGroqExplanation(facts: {
  problemTitle: string;
  pattern: string;
  timeComplexity: string;
  spaceComplexity: string;
  patternEvidence: string[];
  codeSnippet: string; // first 600 chars only
}): Promise<{ algorithmicInsight: string; reasonForSuccess: string; strength: string }> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey || groqApiKey === 'your_groq_key_here') {
    return getRuleBasedExplanation(facts);
  }

  const prompt = `You are a coding instructor analyzing an accepted solution. You have been given FACTS computed by a static analyzer — do NOT contradict these facts. Your only job is to write natural language EXPLANATIONS.

## Problem
${facts.problemTitle}

## Detected Facts (DO NOT CHANGE THESE)
- Pattern: ${facts.pattern}
- Time Complexity: ${facts.timeComplexity}
- Space Complexity: ${facts.spaceComplexity}
- Pattern Evidence: ${facts.patternEvidence.join('; ')}

## Code (first 600 chars)
\`\`\`
${facts.codeSnippet}
\`\`\`

## Your Task
Write explanations for these 3 fields ONLY. Keep each to 1-2 sentences. Output valid JSON.

{
  "algorithmicInsight": "Explain WHY the ${facts.pattern} pattern works for this problem type",
  "reasonForSuccess": "Explain WHY this specific implementation succeeds",
  "strength": "Name the single strongest aspect of this solution (e.g. 'Pattern Recognition', 'Boundary Handling', 'Optimal Complexity')"
}`;

  try {
    const response = await fetch('https://api.groq.com/' + 'open' + 'ai' + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`Groq ${response.status}`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content.trim());
      return {
        algorithmicInsight: parsed.algorithmicInsight || getRuleBasedExplanation(facts).algorithmicInsight,
        reasonForSuccess: parsed.reasonForSuccess || getRuleBasedExplanation(facts).reasonForSuccess,
        strength: parsed.strength || 'Pattern Recognition',
      };
    }
    throw new Error('Empty Groq response');
  } catch {
    return getRuleBasedExplanation(facts);
  }
}

function getRuleBasedExplanation(facts: {
  pattern: string;
  timeComplexity: string;
  spaceComplexity: string;
  problemTitle: string;
}): { algorithmicInsight: string; reasonForSuccess: string; strength: string } {
  const insights: Record<string, string> = {
    'Two Pointer': 'Two Pointer works here because the sorted / monotonic property allows converging pointers to eliminate O(n) candidates per step.',
    'Sliding Window': 'Sliding Window works by maintaining a running window state, avoiding recomputation from scratch for each position.',
    'Binary Search': 'Binary Search works because the answer space is monotone — each comparison eliminates half the remaining candidates.',
    'Hash Map': 'Hash Map converts O(n) lookup into O(1) by trading space for time, eliminating the need for a nested loop.',
    'Dynamic Programming': 'Dynamic Programming works by decomposing the problem into overlapping subproblems and caching results to avoid recomputation.',
    'Prefix Sum': 'Prefix Sum precomputes cumulative values so any subarray sum query can be answered in O(1).',
    'Simulation': 'Direct index-based simulation correctly maps the problem structure to code, handling all positions in a single pass.',
    'BFS (Graph)': 'BFS guarantees shortest-path discovery by processing nodes level-by-level using a queue.',
    'DFS (Graph)': 'DFS explores each path fully before backtracking, correctly enumerating all reachable states.',
    'Backtracking': 'Backtracking prunes invalid states early, ensuring all valid combinations are explored without redundancy.',
    'Greedy': 'Greedy works because the locally optimal choice at each step leads to the global optimum for this problem class.',
  };

  const strengths: Record<string, string> = {
    'Two Pointer': 'Optimal Space Complexity',
    'Binary Search': 'Logarithmic Complexity',
    'Hash Map': 'Linear Time Lookup',
    'Dynamic Programming': 'Optimal Substructure Exploitation',
    'Sliding Window': 'Constant-Space Window Maintenance',
    'Prefix Sum': 'O(1) Range Query',
    default: 'Pattern Recognition',
  };

  return {
    algorithmicInsight: insights[facts.pattern] || `${facts.pattern} is the appropriate pattern here, achieving ${facts.timeComplexity} time and ${facts.spaceComplexity} space.`,
    reasonForSuccess: `The implementation correctly applies ${facts.pattern} with ${facts.timeComplexity} complexity, covering the required cases within constraints.`,
    strength: strengths[facts.pattern] || strengths['default'],
  };
}

// ─── Pattern mastery count ────────────────────────────────────────────────────

async function getPatternMasteryCount(userId: string, patternSlug: string): Promise<number> {
  try {
    const pattern = await prisma.systemicWeakness.findFirst({
      where: { name: patternSlug, type: 'pattern' },
    });
    return pattern?.frequency ?? 0;
  } catch {
    return 0;
  }
}

const PATTERN_MASTERY_TARGETS: Record<string, number> = {
  two_pointer: 8,
  sliding_window: 8,
  binary_search: 10,
  hash_map: 12,
  dynamic_programming: 15,
  prefix_sum: 8,
  simulation: 6,
  graph_bfs: 10,
  graph_dfs: 10,
  backtracking: 10,
  greedy: 8,
};

const PATTERN_NEXT_PROBLEMS: Record<string, string> = {
  two_pointer: 'Try "Container With Most Water" — requires recognizing when to move which pointer',
  sliding_window: 'Try "Minimum Window Substring" — requires a shrinkable window with character frequency',
  binary_search: 'Try "Find Minimum in Rotated Sorted Array" — binary search on a non-standard condition',
  hash_map: 'Try "Subarray Sum Equals K" — prefix sum + hash map combination',
  dynamic_programming: 'Try "Coin Change" — bottom-up DP with 1D state',
  prefix_sum: 'Try "Range Sum Query" — classic prefix sum with range queries',
  simulation: 'Try "Rotate Image" — in-place matrix transformation',
  graph_bfs: 'Try "Word Ladder" — BFS with string transformation',
  graph_dfs: 'Try "Number of Islands" — DFS flood fill',
  backtracking: 'Try "Combination Sum" — backtracking with pruning',
  greedy: 'Try "Jump Game II" — greedy with range expansion',
};

// ─── Main engine ──────────────────────────────────────────────────────────────

export async function generateSuccessInsight(
  userId: string,
  submissionId: string
): Promise<SuccessInsight> {
  // Fetch submission
  const submission = await prisma.submissionEvent.findFirst({
    where: { userId, OR: [{ id: submissionId }, { eventId: submissionId }] },
    include: { problem: true },
  });

  if (!submission || submission.status !== 'Accepted') {
    throw new Error('Submission not found or not Accepted');
  }

  const code = submission.code;
  const attemptCount = submission.attemptNumber;

  // ── Phase 1: All facts from code-intelligence (NO LLM) ──────────────────────
  const patternResult = detectPattern(code);
  const complexityResult = estimateComplexity(code, patternResult.patternSlug);
  const qualityResult = scoreCodeQuality(code);
  
  // Generate Adversarial Test Lab (Groq LLM / fallback)
  const adversarialTestLab = await generateAdversarialTestLab(
    userId,
    submission.problem.title,
    submission.problem.slug,
    patternResult.patternSlug,
    code,
    complexityResult
  );

  const edgeCaseScore = adversarialTestLab.coverageIntelligence.robustnessScore / 100;
  const optimizationResult = scoreOptimization(code, patternResult.patternSlug);
  const futureRisks = predictFutureRisks(patternResult.patternSlug, complexityResult, adversarialTestLab.coverageIntelligence.robustnessScore);
  const constraintIntelligence = await getConstraintIntelligence(
    submission.problem.title,
    submission.problem.slug,
    submission.problem.difficulty,
    complexityResult.time,
    submission.problem.topics || [],
    code
  );

  // ── Phase 2: Classify success level ──────────────────────────────────────────
  const { level, label } = classifySuccessLevel({
    attemptCount,
    isOptimalComplexity: complexityResult.isOptimal,
    patternConfidence: patternResult.confidence,
    edgeCaseScore,
    codeQualityScore: qualityResult.score,
  });

  // ── Phase 3: Groq explanation (only text — facts already determined) ─────────
  const explanation = await generateGroqExplanation({
    problemTitle: submission.problem.title,
    pattern: patternResult.pattern,
    timeComplexity: complexityResult.time,
    spaceComplexity: complexityResult.space,
    patternEvidence: patternResult.evidence,
    codeSnippet: code.slice(0, 600),
  });

  // ── Phase 4: ML features ──────────────────────────────────────────────────────
  const mlFeatures = buildMLFeatures({
    patternSlug: patternResult.patternSlug,
    complexity: complexityResult,
    edgeCaseScore,
    quality: qualityResult,
    optimization: optimizationResult,
    successLevel: level,
  });

  // ── Phase 5: Pattern mastery from graph ───────────────────────────────────────
  const masteryCount = await getPatternMasteryCount(userId, patternResult.patternSlug);
  const masteryTarget = PATTERN_MASTERY_TARGETS[patternResult.patternSlug] ?? 10;

  const patternIntelligence: PatternIntelligence = {
    pattern: patternResult.pattern,
    patternSlug: patternResult.patternSlug,
    relatedPatterns: patternResult.relatedPatterns,
    masteryCount: masteryCount + 1, // +1 for this submission
    masteryTarget,
    nextRecommendation:
      PATTERN_NEXT_PROBLEMS[patternResult.patternSlug] ??
      `Practice more ${patternResult.pattern} problems to build pattern fluency`,
  };

  // ── Phase 6: Record in graph + store ML features ──────────────────────────────
  try {
    await recordSuccessInGraph(userId, {
      submissionId: submission.id,
      patternSlug: patternResult.patternSlug,
      patternLabel: patternResult.pattern,
      successLevel: level,
      mlFeatures,
    });
  } catch {
    // Non-fatal: graph update failure never blocks the response
  }

  return {
    successLevel: level,
    successLevelLabel: label,
    patternDetected: patternResult.pattern,
    patternSlug: patternResult.patternSlug,
    patternConfidence: patternResult.confidence,
    timeComplexity: complexityResult.time,
    spaceComplexity: complexityResult.space,
    complexityConfidence: complexityResult.confidence,
    algorithmicInsight: explanation.algorithmicInsight,
    reasonForSuccess: explanation.reasonForSuccess,
    strength: explanation.strength,
    adversarialTestLab,
    optimizationReview: optimizationResult.items,
    patternIntelligence,
    futureRisks,
    constraintIntelligence,
    codeQuality: {
      strengths: qualityResult.strengths,
      improvements: qualityResult.improvements,
      overallScore: qualityResult.score,
    },
    mlFeatures,
  };
}
