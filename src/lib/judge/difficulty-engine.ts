/**
 * src/lib/judge/difficulty-engine.ts
 *
 * Deterministic difficulty calibration engine.
 * NO LLM — pure math from user profile data.
 *
 * Formula:
 *   judgeRating = 800 + (solved * 2) + (streak * 10), capped 800–3500
 *   targetRating = judgeRating ± 100  (keeps tests in the learning zone)
 *   stageOverride = clamp(floor(judgeRating / 700), 1, 5)
 *
 * Weak concepts from weaknessDistribution get 2× weight in concept targeting.
 */

import type { JudgeProfile, WeaknessDistribution, JudgePersona } from '@/types';
import type { PersonaConfig } from './judge-personas';

export interface DifficultyTarget {
  targetRating: number;
  ratingBand: string;           // e.g. "1300–1500"
  stageOverride: number;        // 1–5
  conceptWeights: Record<string, number>;  // heavier weight for weak concepts
  testCountTarget: number;      // how many tests to generate
  includeAdversarial: boolean;  // whether to include adversarial cases
  difficultyLabel: string;      // "Beginner" | "Intermediate" | "Expert" | "Adversarial"
}

// ─── Concept → weight mapping ─────────────────────────────────────────────────

const ALL_CONCEPTS = [
  'boundary', 'constraint', 'implementation', 'pattern',
  'overflow', 'binarySearch', 'slidingWindow', 'greedy',
  'dp', 'hashing', 'graphs', 'trees', 'recursion', 'math', 'strings', 'sorting',
] as const;

type ConceptKey = keyof WeaknessDistribution;

function computeConceptWeights(
  weaknessDistribution: WeaknessDistribution,
): Record<string, number> {
  const weights: Record<string, number> = {};
  const maxWeakness = Math.max(...Object.values(weaknessDistribution));

  for (const concept of ALL_CONCEPTS) {
    const score = weaknessDistribution[concept as ConceptKey] || 0;
    // Normalize to 0–2 range: weak (high score) → more tests (higher weight)
    // Weak concepts get up to 2× weight, strong concepts get 0.5× weight
    const normalized = maxWeakness > 0 ? score / maxWeakness : 0.5;
    weights[concept] = 0.5 + normalized * 1.5;
  }
  return weights;
}

// ─── Rating band computation ──────────────────────────────────────────────────

function computeRatingBand(rating: number): string {
  const lower = Math.floor(rating / 100) * 100;
  return `${lower}–${lower + 200}`;
}

function stageFromRating(rating: number): number {
  return Math.max(1, Math.min(5, Math.floor(rating / 700)));
}

// ─── Test count by stage ──────────────────────────────────────────────────────

const STAGE_TEST_COUNT: Record<number, number> = {
  1: 10,  // Beginner: fewer, more educational
  2: 12,
  3: 15,  // Standard
  4: 15,  // Expert
  5: 18,  // Adversarial: more stress tests
};

// ─── Persona bias application ─────────────────────────────────────────────────

function applyPersonaBias(
  stageOverride: number,
  persona: JudgePersona,
  personaConfig: PersonaConfig
): number {
  const biased = stageOverride * personaConfig.difficultyBias;
  return Math.max(1, Math.min(5, Math.round(biased)));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeDifficultyTarget(
  profile: JudgeProfile,
  requestedStage: number,
  persona: JudgePersona,
  personaConfig: PersonaConfig,
): DifficultyTarget {
  const { judgeRating, weaknessDistribution } = profile;

  // Compute natural stage from rating
  const naturalStage = stageFromRating(judgeRating);

  // Use requested stage if provided and reasonable, otherwise use natural
  const baseStage = requestedStage > 0
    ? Math.max(naturalStage - 1, Math.min(naturalStage + 2, requestedStage))
    : naturalStage;

  // Apply persona bias
  const finalStage = applyPersonaBias(baseStage, persona, personaConfig);

  // Target rating: center on user's current level ± 150
  const targetRating = Math.min(3500, judgeRating + (finalStage - naturalStage) * 150);

  const conceptWeights = computeConceptWeights(weaknessDistribution);
  const testCountTarget = STAGE_TEST_COUNT[finalStage] || 15;
  const includeAdversarial = finalStage >= 4 || persona === 'codeforces';

  const difficultyLabel =
    finalStage === 1 ? 'Beginner' :
    finalStage === 2 ? 'Intermediate' :
    finalStage === 3 ? 'Standard' :
    finalStage === 4 ? 'Expert' : 'Adversarial';

  return {
    targetRating,
    ratingBand: computeRatingBand(targetRating),
    stageOverride: finalStage,
    conceptWeights,
    testCountTarget,
    includeAdversarial,
    difficultyLabel,
  };
}

/**
 * Formats difficulty target for PRAXIS prompt injection.
 */
export function formatDifficultyForPrompt(target: DifficultyTarget): string {
  const topWeakConcepts = Object.entries(target.conceptWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([k, v]) => `${k}(×${v.toFixed(1)})`)
    .join(', ');

  return `Target Rating: ${target.targetRating} | Rating Band: ${target.ratingBand} | Stage: ${target.stageOverride} (${target.difficultyLabel}) | Test Count: ${target.testCountTarget} | Include Adversarial: ${target.includeAdversarial} | Priority Concepts: ${topWeakConcepts}`;
}
