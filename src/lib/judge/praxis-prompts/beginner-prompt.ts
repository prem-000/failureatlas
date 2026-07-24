/**
 * src/lib/judge/praxis-prompts/beginner-prompt.ts
 *
 * Tier 1 prompt: Rating < 1200
 * Focus: educational minimal counterexamples, clear explanations.
 * Token budget: ~800 tokens.
 */

import type { JudgeProfile, JudgePersona } from '@/types';
import type { DifficultyTarget } from '../difficulty-engine';
import type { BugTemplate } from '../bug-mining-agent';
import type { StructuralEvidence } from '@/lib/analysis/structural-analyzer';

export function buildBeginnerPrompt(
  evidence: StructuralEvidence,
  profile: JudgeProfile,
  bugs: BugTemplate[],
  diffTarget: DifficultyTarget,
  persona: JudgePersona,
  personaInstruction: string,
): string {
  const topBugs = bugs.slice(0, 4).map((b, i) =>
    `Bug ${i + 1} [${b.bugId}]: ${b.description}`
  ).join('\n');

  const topWeaknesses = Object.entries(profile.weaknessDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => k)
    .join(', ');

  return `You are a judge creating EDUCATIONAL hidden tests for a beginner-level programmer.

PROBLEM CONTEXT:
- Algorithm: ${evidence.algorithm.type}
- Constraints: ${evidence.problem.constraints}
- Summary: ${evidence.problem.summary}

JUDGE PERSONA: ${persona}
${personaInstruction}

USER PROFILE:
- Judge Rating: ${profile.judgeRating} (Beginner)
- Weakest concepts: ${topWeaknesses}
- Recent struggles: ${profile.recentFailures.slice(0, 3).join(', ') || 'boundary conditions'}

KNOWN BUGS TO ATTACK:
${topBugs}

TASK: Generate exactly ${diffTarget.testCountTarget} minimal, educational judge test cases.
Each test must:
1. Target ONE specific bug from the list above
2. Use the SMALLEST possible input that exposes the bug
3. Include a clear explanation a beginner can learn from

Return ONLY valid raw JSON (no markdown):
{
  "judgeSuite": [
    {
      "judgeId": "TC-1",
      "judgeRating": "${diffTarget.targetRating}",
      "difficulty": "Easy",
      "targetLevel": "Beginner",
      "bugPatternId": "TP-01",
      "implementationAssumption": "what the wrong code assumes",
      "reason": "why this test exists",
      "input": "exact input string",
      "expectedOutput": "correct output",
      "referenceOutput": "",
      "explanation": "beginner-friendly explanation",
      "minimalCounterexample": true,
      "mutation": "None",
      "algorithmicProperty": "property being tested",
      "invariant": "invariant being verified",
      "constraintCategory": "Boundary",
      "complexityCategory": "O(n)",
      "concepts": ["Boundary"],
      "weakConcepts": ["${topWeaknesses.split(',')[0]?.trim() || 'boundary'}"],
      "historicalFrequency": "High",
      "coverageGain": "15",
      "confidence": "92",
      "permanentHiddenTest": false
    }
  ],
  "coverageSummary": {
    "implementationCoverage": "70%",
    "conceptCoverage": "60%",
    "constraintCoverage": "50%",
    "mutationCoverage": "0%",
    "difficultyDistribution": "Easy: 80%, Medium: 20%",
    "overallJudgeScore": "65"
  }
}`;
}
