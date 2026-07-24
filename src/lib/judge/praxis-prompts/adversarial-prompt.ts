/**
 * src/lib/judge/praxis-prompts/adversarial-prompt.ts
 *
 * Tier 4 prompt: Rating > 2400 or stage ≥ 4 or Codeforces persona
 * Focus: algorithm destruction, pathological inputs, complexity traps, anti-hash.
 * Token budget: ~2000 tokens.
 */

import type { JudgeProfile, JudgePersona } from '@/types';
import type { DifficultyTarget } from '../difficulty-engine';
import type { BugTemplate } from '../bug-mining-agent';
import type { StructuralEvidence } from '@/lib/analysis/structural-analyzer';

export function buildAdversarialPrompt(
  evidence: StructuralEvidence,
  profile: JudgeProfile,
  bugs: BugTemplate[],
  diffTarget: DifficultyTarget,
  persona: JudgePersona,
  personaInstruction: string,
  fingerprintJson: string,
): string {
  const allBugsText = bugs.map((b) =>
    `[${b.bugId}] ${b.description}\n  Code: \`${b.typicalCode}\` | Mechanism: ${b.mechanism} | Likelihood: ${Math.round(b.likelihood * 100)}%`
  ).join('\n');

  const topWeaknesses = Object.entries(profile.weaknessDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([k, v]) => `${k}(${v})`)
    .join(' | ');

  return `You are the Chief Judge of a world-class competitive programming platform.
Your mission: create the most ADVERSARIAL judge test suite possible for this submission.
You are NOT generating edge cases. You are DESTROYING incorrect implementations.

Think like the problem setters of Codeforces Div 1 E / ICPC World Finals problems.
Every test must have a SPECIFIC REASON to exist. No filler. No random arrays.

ALGORITHM & IMPLEMENTATION:
Type: ${evidence.algorithm.type}
Time Complexity: ${evidence.timeComplexity} | Space: ${evidence.spaceComplexity}
Constraints: ${evidence.problem.constraints}
Input: ${evidence.problem.inputFormat}
Output: ${evidence.problem.outputFormat}
Summary: ${evidence.problem.summary}

IMPLEMENTATION FINGERPRINT (structural evidence):
${fingerprintJson}

Critical Code Snippets: ${evidence.criticalSnippets?.join(' || ') || 'none extracted'}
Structural Weaknesses: ${evidence.knownWeaknesses?.join('; ') || 'none detected'}

JUDGE PERSONA: ${persona} — ADVERSARIAL MODE
${personaInstruction}

USER JUDGE PROFILE (shape the attack around this):
Rating: ${profile.judgeRating} | Tier: ${profile.judgeTier}
Confidence: ${profile.overallConfidence}% | Growth: ${profile.growthVelocity > 0 ? '+' : ''}${profile.growthVelocity} | Streak: ${profile.currentStreak}d
Weakness Distribution: ${topWeaknesses}
Repeated Mistakes: ${profile.repeatedMistakes.join(', ') || 'none'}
Recent Failures: ${profile.recentFailures.join(', ') || 'none'}

WRONG IMPLEMENTATIONS TO DESTROY (${bugs.length} patterns):
${allBugsText}

ADVERSARIAL TARGET CALIBRATION:
Rating Band: ${diffTarget.ratingBand} | Stage: ${diffTarget.stageOverride}/5
Test Count: ${diffTarget.testCountTarget}

ADVERSARIAL GENERATION STAGES:

Stage 1 — Algorithm Recovery Agent:
  Determine the EXACT algorithm the user implemented from the fingerprint.
  State all invariants. Identify all ASSUMPTIONS the implementation makes.

Stage 2 — Bug Mining Analysis:
  For each recovered bug pattern:
    a. What exactly does this implementation assume?
    b. What is the SMALLEST input that violates this assumption?
    c. What is the correct output for that input?

Stage 3 — Counterexample Synthesis:
  Generate minimal legal counterexamples for each bug.
  Prefer inputs that LOOK correct but are subtly adversarial.

Stage 4 — Complexity Destruction:
  Generate 3-5 tests that cause O(n²) or worse behavior in naive implementations:
    - Worst-case input orderings for greedy
    - Maximum recursion depth inputs for DFS/backtracking
    - Anti-hash test inputs (if hash maps detected in fingerprint)
    - Degenerate tree/graph structures (linear chains)

Stage 5 — Mutation & Stress:
  Apply these adversarial mutations to existing tests:
    - Adversarial Ordering: reverse, descending
    - Overflow Mutation: INT_MAX, INT_MIN, Long.MAX_VALUE
    - Dense Distribution: all-same-value arrays
    - Alternating Pattern: [MAX, MIN, MAX, MIN, ...]

Stage 6 — Invariant Verification:
  For each test, explicitly state which invariant the WRONG implementation violates.
  Only include the test if it UNIQUELY covers that invariant.

Stage 7 — Coverage Curation:
  Remove any test that duplicates the category+bug of another test.
  Every surviving test must eliminate at least one wrong implementation.

Stage 8 — Difficulty Progression:
  Order: Easy (boundary) → Medium (implementation traps) → Hard (algorithm assumptions)
         → Adversarial (complexity destruction) → Judge Killer (permanent hidden test)

CRITICAL RULES:
- Every test MUST satisfy all declared problem constraints
- No two tests may have the same (bugPatternId, constraintCategory) pair
- Expected output MUST be mathematically correct — you will be verified by a VM executor
- Minimum 20% of tests must be "Adversarial" category
- Identify 1-2 tests as permanentHiddenTest: true (these are permanently hidden)

Generate exactly ${diffTarget.testCountTarget} judge test cases.

Return ONLY valid raw JSON with NO markdown wrapper:
{
  "judgeSuite": [
    {
      "judgeId": "TC-1",
      "judgeRating": "${diffTarget.targetRating}",
      "difficulty": "Easy|Medium|Hard|Adversarial|Judge Killer",
      "targetLevel": "Expert|Research",
      "bugPatternId": "BS-07",
      "implementationAssumption": "concrete and specific wrong assumption",
      "reason": "judge-level precision explanation of why this test exists",
      "input": "realistic adversarial input satisfying all constraints",
      "expectedOutput": "verified correct output",
      "referenceOutput": "",
      "explanation": "technical deep-dive on why implementations fail here",
      "whyIncorrectSolutionsFail": "exact mechanism of failure",
      "minimalCounterexample": true,
      "mutation": "Adversarial Ordering|Overflow Mutation|None|Alternating Pattern|Duplicate Values|Reverse",
      "algorithmicProperty": "specific algorithmic property violated",
      "invariant": "invariant that wrong implementation breaks",
      "constraintCategory": "Boundary|Constraint|Overflow|Duplicate|Binary Search|Greedy|DP|Graph|Tree|Hashing|Sliding Window|Two Pointer|Adversarial|Judge Killer|Maximum",
      "complexityCategory": "O(log n)|O(n)|O(n log n)|O(n²)|O(2ⁿ)",
      "concepts": ["primary concept", "secondary concept"],
      "weakConcepts": ["user's weak concept explicitly targeted"],
      "historicalFrequency": "High|Medium|Low|Rare",
      "coverageGain": "15",
      "confidence": "96",
      "permanentHiddenTest": false
    }
  ],
  "coverageSummary": {
    "implementationCoverage": "98%",
    "conceptCoverage": "92%",
    "constraintCoverage": "90%",
    "mutationCoverage": "45%",
    "difficultyDistribution": "Easy: 10%, Medium: 30%, Hard: 35%, Adversarial: 20%, Judge Killer: 5%",
    "overallJudgeScore": "96"
  }
}`;
}
