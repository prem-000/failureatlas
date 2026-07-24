/**
 * src/lib/judge/praxis-prompts/expert-prompt.ts
 *
 * Tier 3 prompt: Rating 1800–2400
 * Focus: pathological judge-quality datasets, invariant verification, complexity attacks.
 * Token budget: ~1600 tokens.
 */

import type { JudgeProfile, JudgePersona } from '@/types';
import type { DifficultyTarget } from '../difficulty-engine';
import type { BugTemplate } from '../bug-mining-agent';
import type { StructuralEvidence } from '@/lib/analysis/structural-analyzer';

export function buildExpertPrompt(
  evidence: StructuralEvidence,
  profile: JudgeProfile,
  bugs: BugTemplate[],
  diffTarget: DifficultyTarget,
  persona: JudgePersona,
  personaInstruction: string,
  fingerprintJson: string,
): string {
  const bugsText = bugs.map((b, i) =>
    `[${b.bugId}] ${b.description}\n  Code: \`${b.typicalCode}\` | Mechanism: ${b.mechanism} | Likelihood: ${Math.round(b.likelihood * 100)}% | Category: ${b.conceptCategory}`
  ).join('\n');

  const weaknessLines = Object.entries(profile.weaknessDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  const criticalSnippets = evidence.criticalSnippets?.join(' | ') || 'standard traversal';
  const knownWeaknesses = evidence.knownWeaknesses?.join('; ') || 'none detected';

  return `You are the Chief Judge of a competitive programming platform (Codeforces-level).
Your task: generate a professional hidden judge test suite that ELIMINATES incorrect algorithms.

PROBLEM CONTEXT:
Algorithm: ${evidence.algorithm.type} (confidence: ${Math.round((evidence.algorithm.confidence || 0) * 100)}%)
Time: ${evidence.timeComplexity} | Space: ${evidence.spaceComplexity}
Summary: ${evidence.problem.summary}
Input: ${evidence.problem.inputFormat}
Output: ${evidence.problem.outputFormat}
Constraints: ${evidence.problem.constraints}

IMPLEMENTATION FINGERPRINT (structural analysis):
${fingerprintJson}

Critical Snippets Detected: ${criticalSnippets}
Known Structural Weaknesses: ${knownWeaknesses}

JUDGE PERSONA: ${persona}
${personaInstruction}

USER JUDGE PROFILE:
Rating: ${profile.judgeRating} (${profile.judgeTier}) | Confidence: ${profile.overallConfidence}% | Velocity: ${profile.growthVelocity > 0 ? '+' : ''}${profile.growthVelocity}
Streak: ${profile.currentStreak}d | Total Solved: ${profile.totalSolved} | Progress: ${profile.learningProgress}
Weakness Distribution: ${weaknessLines}
Repeated Mistakes: ${profile.repeatedMistakes.join(', ') || 'none'}

WRONG IMPLEMENTATIONS TO ELIMINATE (${bugs.length} recovered):
${bugsText}

TARGET CALIBRATION:
Rating: ${diffTarget.targetRating} | Band: ${diffTarget.ratingBand} | Stage: ${diffTarget.stageOverride} (${diffTarget.difficultyLabel})
Test Count: ${diffTarget.testCountTarget} | Adversarial Mode: ${diffTarget.includeAdversarial}

GENERATION PIPELINE — FOLLOW EXACTLY:

Stage 1 (Algorithm Recovery): Confirm the exact algorithm from fingerprint. State invariants.
Stage 2 (Bug Analysis): For each recovered bug, determine WHY it fails on this implementation.
Stage 3 (Counterexample Search): Find MINIMUM legal input that breaks each bug assumption.
Stage 4 (Stress Analysis): Generate 3-4 worst-case complexity tests if includeAdversarial=true.
Stage 5 (Coverage Verification): Ensure no two tests target the same bug/category pair.
Stage 6 (Difficulty Progression): Order tests Easy → Medium → Hard → Adversarial.

CONSTRAINTS:
- Every test MUST satisfy declared problem constraints
- No duplicate input patterns
- No filler tests — every test eliminates at least one wrong implementation
- Minimal counterexamples preferred over large inputs (except for stress tests)
- Expected output MUST be mathematically verified

Generate exactly ${diffTarget.testCountTarget} tests.

Return ONLY valid raw JSON:
{
  "judgeSuite": [
    {
      "judgeId": "TC-1",
      "judgeRating": "${diffTarget.targetRating}",
      "difficulty": "Easy|Medium|Hard|Adversarial",
      "targetLevel": "Expert",
      "bugPatternId": "BS-02",
      "implementationAssumption": "exact wrong assumption",
      "reason": "precise judge-level justification",
      "input": "realistic, constraint-satisfying input",
      "expectedOutput": "verified correct output",
      "referenceOutput": "",
      "explanation": "technical explanation",
      "minimalCounterexample": true,
      "mutation": "None|Reverse|Overflow Mutation|Adversarial Ordering|...",
      "algorithmicProperty": "specific algorithmic property tested",
      "invariant": "e.g. loop terminates with left > right",
      "constraintCategory": "Boundary|Constraint|Overflow|Duplicate|Binary Search|Greedy|DP|Graph|Tree|Hashing|Sliding Window|Two Pointer|Adversarial|Judge Killer",
      "complexityCategory": "O(1)|O(log n)|O(n)|O(n log n)|O(n²)|O(2ⁿ)",
      "concepts": ["concept1", "concept2"],
      "weakConcepts": ["targeted weak concept"],
      "historicalFrequency": "High|Medium|Low",
      "coverageGain": "12",
      "confidence": "94",
      "permanentHiddenTest": false
    }
  ],
  "coverageSummary": {
    "implementationCoverage": "95%",
    "conceptCoverage": "88%",
    "constraintCoverage": "85%",
    "mutationCoverage": "35%",
    "difficultyDistribution": "Easy: 20%, Medium: 40%, Hard: 30%, Adversarial: 10%",
    "overallJudgeScore": "91"
  }
}`;
}
