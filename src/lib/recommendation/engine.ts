/**
 * Recommendation Engine
 *
 * Multi-signal recommendation engine that combines four inputs:
 * - Weakness pattern match
 * - Current mastery score per section
 * - Difficulty appropriateness
 * - Similarity to past failures
 *
 * Output: SelectedProblem[] — concrete problem IDs with rationale.
 * These feed directly into the SM2 scheduling queue.
 *
 * Similarity-only recommendations tend toward generic suggestions.
 * Folding in the user's actual weakness pattern, current mastery,
 * and appropriate difficulty makes recommendations personalized
 * and appropriately challenging.
 */

import type { PrismaClient } from '@prisma/client';
import type { RetrievedFailure } from '@/lib/rag/retrieval';
import type { SectionMastery } from '@/lib/analysis/section-rollup';
import type { AggregatedEvidence, EvidenceType } from '@/types';
import { getSectionsForWeakness, SECTIONS } from '@/lib/analysis/concept-mapper';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectedProblem {
  problemId: string;
  problemSlug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  platform: string;
  /** Why this problem was recommended */
  rationale: string;
  /** Composite recommendation score (0–1, higher = more recommended) */
  score: number;
  /** Which signal contributed most */
  primarySignal: 'weakness' | 'mastery' | 'difficulty' | 'similarity';
  /** Section this problem targets */
  targetSection?: string;
}

export interface RecommendationInput {
  /** User's current weakness evidence */
  evidence: AggregatedEvidence;
  /** Section mastery scores */
  sectionMastery: SectionMastery[];
  /** Similar past failures from RAG */
  similarFailures: RetrievedFailure[];
  /** Current problem's difficulty */
  currentDifficulty: 'Easy' | 'Medium' | 'Hard';
  /** Current problem's topics */
  currentTopics: string[];
  /** User ID for querying their problem history */
  userId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RECOMMENDATIONS = 10;
const DIFFICULTY_ORDER: Record<string, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

/** Signal weights for the composite score */
const WEIGHTS = {
  weakness: 0.35,
  mastery: 0.25,
  difficulty: 0.20,
  similarity: 0.20,
};

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Generate personalized problem recommendations.
 *
 * @param prisma  Prisma client for querying the problem database
 * @param input   Multi-signal recommendation inputs
 * @returns Array of SelectedProblem, scored and sorted
 */
export async function generateRecommendations(
  prisma: PrismaClient,
  input: RecommendationInput
): Promise<SelectedProblem[]> {
  const {
    evidence,
    sectionMastery,
    similarFailures,
    currentDifficulty,
    currentTopics,
    userId,
  } = input;

  const candidates: SelectedProblem[] = [];

  // ─── Signal 1: Weakness-driven recommendations ─────────────────────────────
  // Find problems in sections affected by the dominant weakness

  const weakSections = getSectionsForWeakness(evidence.dominant);
  const weakSectionSlugs = weakSections.map(s => s.slug);

  if (weakSectionSlugs.length > 0) {
    // Query problems matching the weak sections' topics
    const weaknessTopics = weakSections.map(s => s.name);
    const weaknessProblems = await prisma.problem.findMany({
      where: {
        topics: {
          hasSome: weaknessTopics,
        },
        // Exclude problems the user has already solved
        submissions: {
          none: {
            userId,
            status: 'Accepted',
          },
        },
      },
      take: 5,
      orderBy: {
        difficulty: 'asc', // Start with easier problems for weak areas
      },
    });

    for (const problem of weaknessProblems) {
      candidates.push({
        problemId: problem.id,
        problemSlug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty as 'Easy' | 'Medium' | 'Hard',
        platform: 'leetcode',
        rationale: `Targets your ${evidence.dominant} weakness in ${weakSections[0]?.name ?? 'this topic'}`,
        score: 0,
        primarySignal: 'weakness',
        targetSection: weakSections[0]?.slug,
      });
    }
  }

  // ─── Signal 2: Mastery-driven recommendations ──────────────────────────────
  // Recommend problems from weak sections (low mastery)

  const weakMasterySections = sectionMastery
    .filter(s => s.isWeak)
    .slice(0, 3);

  for (const section of weakMasterySections) {
    const sectionDef = SECTIONS[section.sectionSlug];
    if (!sectionDef) continue;

    const masteryProblems = await prisma.problem.findMany({
      where: {
        topics: {
          has: sectionDef.name,
        },
        submissions: {
          none: {
            userId,
            status: 'Accepted',
          },
        },
      },
      take: 2,
      orderBy: {
        difficulty: 'asc',
      },
    });

    for (const problem of masteryProblems) {
      candidates.push({
        problemId: problem.id,
        problemSlug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty as 'Easy' | 'Medium' | 'Hard',
        platform: 'leetcode',
        rationale: `Build mastery in ${sectionDef.name} (currently ${Math.round(section.masteryScore * 100)}%)`,
        score: 0,
        primarySignal: 'mastery',
        targetSection: section.sectionSlug,
      });
    }
  }

  // ─── Signal 3: Difficulty-appropriate recommendations ──────────────────────
  // Suggest easier prerequisites if the current problem was too hard

  const currentDiffLevel = DIFFICULTY_ORDER[currentDifficulty] ?? 2;
  if (currentDiffLevel >= 2) {
    const targetDifficulty = currentDiffLevel === 3 ? 'Medium' : 'Easy';
    const difficultyProblems = await prisma.problem.findMany({
      where: {
        difficulty: targetDifficulty,
        topics: {
          hasSome: currentTopics,
        },
        submissions: {
          none: {
            userId,
            status: 'Accepted',
          },
        },
      },
      take: 3,
    });

    for (const problem of difficultyProblems) {
      candidates.push({
        problemId: problem.id,
        problemSlug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty as 'Easy' | 'Medium' | 'Hard',
        platform: 'leetcode',
        rationale: `Easier prerequisite for ${currentTopics[0] ?? 'this topic'}`,
        score: 0,
        primarySignal: 'difficulty',
      });
    }
  }

  // ─── Signal 4: Similarity-driven recommendations ───────────────────────────
  // Suggest problems similar to past failures (from RAG)

  for (const failure of similarFailures.slice(0, 3)) {
    if (!failure.problemSlug) continue;

    const similarProblem = await prisma.problem.findUnique({
      where: { slug: failure.problemSlug },
    });

    if (similarProblem) {
      candidates.push({
        problemId: similarProblem.id,
        problemSlug: similarProblem.slug,
        title: similarProblem.title,
        difficulty: similarProblem.difficulty as 'Easy' | 'Medium' | 'Hard',
        platform: 'leetcode',
        rationale: `Similar pattern to past failure (${Math.round(failure.similarityScore * 100)}% match)`,
        score: 0,
        primarySignal: 'similarity',
      });
    }
  }

  // ─── Score and rank ────────────────────────────────────────────────────────

  const scored = scoreCandidates(candidates, {
    evidence,
    sectionMastery,
    currentDifficulty,
  });

  // Deduplicate by problem slug
  const seen = new Set<string>();
  const deduped = scored.filter(p => {
    if (seen.has(p.problemSlug)) return false;
    seen.add(p.problemSlug);
    return true;
  });

  return deduped.slice(0, MAX_RECOMMENDATIONS);
}

/**
 * Score candidates with composite signal weights.
 */
function scoreCandidates(
  candidates: SelectedProblem[],
  context: {
    evidence: AggregatedEvidence;
    sectionMastery: SectionMastery[];
    currentDifficulty: string;
  }
): SelectedProblem[] {
  const masteryMap = new Map(
    context.sectionMastery.map(s => [s.sectionSlug, s.masteryScore])
  );

  return candidates
    .map(candidate => {
      let score = 0;

      // Weakness signal: higher score if candidate targets the dominant weakness
      if (candidate.primarySignal === 'weakness') {
        score += WEIGHTS.weakness * 1.0;
      }

      // Mastery signal: higher score if candidate targets a weak section
      if (candidate.targetSection) {
        const mastery = masteryMap.get(candidate.targetSection) ?? 1.0;
        score += WEIGHTS.mastery * (1 - mastery); // Lower mastery = higher score
      }

      // Difficulty signal: prefer appropriate difficulty
      const candidateDiff = DIFFICULTY_ORDER[candidate.difficulty] ?? 2;
      const currentDiff = DIFFICULTY_ORDER[context.currentDifficulty] ?? 2;
      const diffMatch = candidateDiff <= currentDiff ? 1.0 : 0.5;
      score += WEIGHTS.difficulty * diffMatch;

      // Similarity signal
      if (candidate.primarySignal === 'similarity') {
        score += WEIGHTS.similarity * 0.8;
      }

      return { ...candidate, score: Math.round(score * 1000) / 1000 };
    })
    .sort((a, b) => b.score - a.score);
}
