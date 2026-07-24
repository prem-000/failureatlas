/**
 * src/lib/judge/self-critique-agent.ts
 *
 * Self-critique agent: generate → critique → selective regen.
 * Mirrors AlphaCode 2's approach.
 *
 * Sends the generated suite to a fast LLM for critique.
 * Returns IDs of weak / duplicate tests to regenerate.
 * Maximum one pass to avoid infinite loops.
 */

import { groqClient } from '@/lib/api/groq-client';
import type { PraxisJudgeCase } from '@/types';

export interface CritiqueResult {
  weakTestIds: string[];
  duplicateTestIds: string[];
  overallQuality: 'High' | 'Medium' | 'Low';
  critiqueSummary: string;
}

export async function selfCritiqueAgent(
  tests: PraxisJudgeCase[],
  algorithm: string,
): Promise<{ curated: PraxisJudgeCase[]; critique: CritiqueResult }> {
  if (tests.length === 0) {
    return {
      curated: tests,
      critique: { weakTestIds: [], duplicateTestIds: [], overallQuality: 'Low', critiqueSummary: 'No tests to critique.' },
    };
  }

  try {
    const testSummary = tests.slice(0, 15).map((t, i) =>
      `[${t.judgeId || `TC-${i + 1}`}] Category: ${t.category || 'Boundary'} | Input: "${t.input.substring(0, 80)}" | Reason: "${(t.reason || '').substring(0, 100)}"`
    ).join('\n');

    const prompt = `You are a competitive programming judge critic reviewing test cases for a "${algorithm}" solution.

Test Suite (${tests.length} cases):
${testSummary}

Review criteria:
1. PURPOSEFUL: Does each test target a specific bug pattern or invariant?
2. UNIQUE: Are any tests near-duplicates (same input pattern, same category, same reason)?
3. QUALITY: Are the inputs realistic and the reasons clear?

Return ONLY valid JSON with this structure:
{
  "weakTestIds": ["TC-2", "TC-7"],
  "duplicateTestIds": ["TC-11", "TC-14"],
  "overallQuality": "High",
  "critiqueSummary": "Brief 1-2 sentence assessment of suite quality."
}

If all tests are good, return empty arrays. Be strict but fair.`;

    const response = await groqClient.getChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      model: 'llama-3.1-8b-instant',
    });

    const critique: CritiqueResult = JSON.parse(response.content.trim());
    const badIds = new Set([...(critique.weakTestIds || []), ...(critique.duplicateTestIds || [])]);

    // Remove flagged tests (keep at least 5 tests minimum)
    let curated = tests.filter(t => !badIds.has(t.judgeId || ''));
    if (curated.length < 5) curated = tests; // safety: never remove too many

    return { curated, critique };
  } catch (err) {
    console.warn('[SelfCritique] Critique pass skipped (non-blocking):', err);
    return {
      curated: tests,
      critique: {
        weakTestIds: [],
        duplicateTestIds: [],
        overallQuality: 'Medium',
        critiqueSummary: 'Critique skipped — all tests retained.',
      },
    };
  }
}
