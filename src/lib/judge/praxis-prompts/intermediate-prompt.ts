/**
 * src/lib/judge/praxis-prompts/intermediate-prompt.ts
 *
 * Tier 2 prompt: Rating 1200–1800
 * Focus: hidden implementation traps, realistic LeetCode-style tests.
 * Token budget: ~1200 tokens.
 */

import type { JudgeProfile, JudgePersona } from '@/types';
import type { DifficultyTarget } from '../difficulty-engine';
import type { BugTemplate } from '../bug-mining-agent';
import type { StructuralEvidence } from '@/lib/analysis/structural-analyzer';

export function buildIntermediatePrompt(
  evidence: StructuralEvidence,
  profile: JudgeProfile,
  bugs: BugTemplate[],
  diffTarget: DifficultyTarget,
  persona: JudgePersona,
  personaInstruction: string,
  fingerprintJson: string,
): string {
  const bugsText = bugs.slice(0, 6).map((b, i) =>
    `Bug ${i + 1} [${b.bugId}]:\n  Description: ${b.description}\n  Code Pattern: \`${b.typicalCode}\`\n  Mechanism: ${b.mechanism} (likelihood: ${Math.round(b.likelihood * 100)}%)`
  ).join('\n\n');

  const weaknessLines = Object.entries(profile.weaknessDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([k, v]) => `  ${k}: ${v}/100`)
    .join('\n');

  return `You are a competitive programming judge (LeetCode style). Your goal: generate hidden tests that catch intermediate-level implementation mistakes.

PROBLEM CONTEXT:
- Algorithm: ${evidence.algorithm.type} (confidence: ${Math.round((evidence.algorithm.confidence || 0) * 100)}%)
- Time Complexity: ${evidence.timeComplexity}
- Input Format: ${evidence.problem.inputFormat}
- Output Format: ${evidence.problem.outputFormat}
- Constraints: ${evidence.problem.constraints}
- Summary: ${evidence.problem.summary}

IMPLEMENTATION FINGERPRINT:
${fingerprintJson}

JUDGE PERSONA: ${persona} — ${personaInstruction}

USER JUDGE PROFILE:
- Rating: ${profile.judgeRating} | Tier: ${profile.judgeTier}
- Confidence: ${profile.overallConfidence}% | Growth: ${profile.growthVelocity > 0 ? '+' : ''}${profile.growthVelocity}
- Streak: ${profile.currentStreak} days | Progress: ${profile.learningProgress}
- Top Weaknesses:
${weaknessLines}
- Recent Failures: ${profile.recentFailures.slice(0, 5).join(', ') || 'none'}
- Repeated Mistakes: ${profile.repeatedMistakes.slice(0, 3).join(', ') || 'none'}

RECOVERED WRONG IMPLEMENTATIONS TO ATTACK:
${bugsText}

TARGET DIFFICULTY:
- Rating Band: ${diffTarget.ratingBand}
- Stage: ${diffTarget.stageOverride} (${diffTarget.difficultyLabel})
- Include Adversarial: ${diffTarget.includeAdversarial}

GENERATION PIPELINE (follow this order):
1. For each bug above, find the smallest legal input that exposes it
2. Verify the input satisfies the declared constraints
3. Compute the correct expected output
4. Assign the correct category and metadata

Generate exactly ${diffTarget.testCountTarget} judge test cases.
Progress difficulty from Easy → Medium → Hard.
No duplicate test inputs. No filler tests.

Return ONLY valid raw JSON (no markdown):
{
  "judgeSuite": [
    {
      "judgeId": "TC-1",
      "judgeRating": "${diffTarget.targetRating}",
      "difficulty": "Easy|Medium|Hard",
      "targetLevel": "Intermediate",
      "bugPatternId": "TP-01",
      "implementationAssumption": "concrete wrong assumption this test attacks",
      "reason": "judge-level explanation of why this test exists",
      "input": "exact realistic input string",
      "expectedOutput": "verified correct output",
      "referenceOutput": "",
      "explanation": "clear explanation for this test",
      "minimalCounterexample": true,
      "mutation": "None|Reverse|Duplicate Values|...",
      "algorithmicProperty": "which algorithmic property is tested",
      "invariant": "specific invariant being verified",
      "constraintCategory": "Boundary|Constraint|Overflow|Duplicate|Binary Search|Greedy|DP|Graph|Tree|Hashing|Sliding Window|Two Pointer|Adversarial",
      "complexityCategory": "O(1)|O(log n)|O(n)|O(n log n)|O(n²)",
      "concepts": ["concept1", "concept2"],
      "weakConcepts": ["user's weak concept being targeted"],
      "historicalFrequency": "High|Medium|Low",
      "coverageGain": "10",
      "confidence": "88",
      "permanentHiddenTest": false
    }
  ],
  "coverageSummary": {
    "implementationCoverage": "85%",
    "conceptCoverage": "75%",
    "constraintCoverage": "70%",
    "mutationCoverage": "20%",
    "difficultyDistribution": "Easy: 30%, Medium: 50%, Hard: 20%",
    "overallJudgeScore": "78"
  }
}`;
}
