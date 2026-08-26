/**
 * src/lib/intelligence/generation/groq-synthesizer.ts
 * Constrained LLM Synthesizer for synthesizing targeted edge counterexamples.
 * Strictly adheres to the Problem Contract. Never decides correctness or expected outputs.
 */

import type { ProblemContract } from '../contracts/problem-contract';
import type { AnalysisEvidence } from '../analysis/evidence-engine';
import type { TestObjective } from '../objectives/test-objective-builder';

export interface GroqSynthesizedCandidate {
  input: Record<string, unknown>;
  reason: string;
}

export async function synthesizeGroqCandidates(opts: {
  contract: ProblemContract;
  evidence: AnalysisEvidence;
  objective: TestObjective;
  userCode: string;
  deterministicTestsAlreadyGenerated?: Record<string, unknown>[];
}): Promise<GroqSynthesizedCandidate[]> {
  const {
    contract,
    evidence,
    objective,
    userCode,
    deterministicTestsAlreadyGenerated = [],
  } = opts;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return [];
  }

  const systemPrompt = `You are a constrained test-case synthesizer.

Your task is to generate candidate inputs designed to verify a specific hypothesis about submitted algorithmic code.

You must follow the provided Problem Contract exactly.

Rules:
1. Never invent parameters.
2. Never change parameter names.
3. Never violate parameter types.
4. Never violate stated constraints.
5. Generate inputs only, not explanations or markdown.
6. Do not generate generic/random test cases.
7. Each test must target the provided hypothesis.
8. Prefer minimal counterexamples.
9. Prefer combinations of conditions that deterministic generators may not naturally produce.
10. Do not assume the submitted code is correct.
11. Do not use the submitted code as the source of expected output.
12. Return strict JSON matching the required schema:

{
  "candidates": [
    {
      "input": { ... },
      "reason": "explanation of how this input specifically tests the objective"
    }
  ]
}`;

  const userContext = {
    problemContract: {
      functionName: contract.functionName,
      parameters: contract.parameters,
      returnType: contract.returnType,
      executionMode: contract.executionMode,
      constraints: contract.constraints.map(c => c.expression),
      invariants: contract.invariants,
    },
    evidence: {
      detector: evidence.detector,
      sourceLineStart: evidence.source.lineStart,
      sourceSnippet: evidence.source.snippet,
      finding: evidence.finding,
      hypothesis: evidence.hypothesis,
    },
    testObjective: {
      objective: objective.objective,
      requiredProperties: objective.requiredProperties,
      failureMechanism: objective.failureMechanism,
      priority: objective.priority,
    },
    deterministicTestsAlreadyGenerated: deterministicTestsAlreadyGenerated.slice(0, 5),
    submittedCodeSnippet: userCode.substring(0, 800),
  };

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userContext, null, 2) },
        ],
      }),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const rawContent = data.choices?.[0]?.message?.content?.trim();
    if (!rawContent) return [];

    const parsed = JSON.parse(rawContent) as { candidates?: GroqSynthesizedCandidate[] };
    return parsed.candidates || [];
  } catch (err) {
    console.warn('[GroqSynthesizer] Synthesis fallback or network error:', err);
    return [];
  }
}
