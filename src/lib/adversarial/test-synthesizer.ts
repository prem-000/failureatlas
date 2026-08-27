import type {
  EvidenceBasedHiddenTest,
  EvidencePack,
  StressTarget,
} from './types';
import { groqClient } from '@/lib/api/groq-client';
import { evaluateProblemOracle } from './problem-oracle';
import { validateAndDeduplicateTests } from './test-validator';

export async function synthesizeHiddenTests(
  pack: EvidencePack
): Promise<EvidenceBasedHiddenTest[]> {
  const { problem, submission, stressTargets } = pack;

  const prompt = `You are an expert competitive programming intelligence engine.
Analyze the user's submitted problem and their actual submitted source code.
Generate EXACTLY 5 evidence-based hidden test cases specifically for this problem and this implementation.

## PROBLEM SPECIFICATION
- Title: ${problem.title}
- Slug: ${problem.slug}
- Difficulty: ${problem.difficulty}
- Constraints: ${problem.constraints.join('; ') || 'Standard competitive programming bounds'}
- Statement: ${problem.statement || problem.title}

## SUBMITTED SOURCE CODE
Language: ${submission.language}
Detected Strategy: ${submission.detectedApproach.algorithm} (Confidence: ${Math.round(submission.detectedApproach.confidence * 100)}%)
Time Complexity: ${submission.complexity.detectedTime}
Space Complexity: ${submission.complexity.detectedSpace}

Source Code:
\`\`\`${submission.language}
${submission.sourceCode}
\`\`\`

## 5 TARGET STRESS HYPOTHESES (Construct exactly 1 test for each target)
${stressTargets.map((st, i) => `${i + 1}. [${st.id}] (${st.kind}) ${st.title}
   Hypothesis: ${st.hypothesis}
   Attacks: ${st.whatItAttacks}
   Evidence: ${st.sourceEvidence.map(e => e.description).join('; ')}`).join('\n\n')}

## RULES
1. The input must match the exact parameter signature of this problem (e.g. if the problem is Palindrome Number, input must be like "x = 121" or "x = -121", NEVER "arr = [...], k = 3").
2. The expected output must be the mathematically/algorithmically correct answer for this exact problem and input.
3. Every test must explain why it exists and what specific failure mode, invariant, or constraint boundary it stresses.
4. If the solution is correct and robust, do NOT invent fake bugs — stress legitimate problem-specific edge cases and invariants.
5. Do NOT use generic terms like "sliding window" or "running window" unless the submitted code or problem actually uses that technique.

## JSON OUTPUT FORMAT
Return a valid JSON object with key "tests" containing an array of EXACTLY 5 objects:
{
  "tests": [
    {
      "targetId": "ST-01",
      "riskTitle": "Specific edge case or invariant title",
      "input": "Exact valid input (e.g. x = 121 or s = \\"abcabcbb\\" or nums = [2,7,11,15], target = 9)",
      "expectedOutput": "Exact expected return value (e.g. true or 3 or [0, 1])",
      "whyExists": "Why this specific input tests the problem constraints or code logic",
      "whatItAttacks": "The specific boundary, invariant, assumption, or complexity pressure being tested",
      "constraintRelevance": "The problem constraint boundary being exercised",
      "confidence": "High"
    }
  ]
}`;

  const validationContext = {
    problemTitle: problem.title,
    problemSlug: problem.slug || problem.title,
    constraints: problem.constraints,
    sourceCode: submission.sourceCode,
    detectedApproach: submission.detectedApproach.algorithm,
    parameters: submission.normalizedFacts.functions[0]?.params || [],
  };

  try {
    const res = await groqClient.getChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are a strict, highly accurate competitive programming test synthesizer. Output valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(res.content);
    const rawTests: any[] = Array.isArray(parsed.tests) ? parsed.tests : Array.isArray(parsed) ? parsed : [];

    if (rawTests.length >= 5) {
      const formattedTests: EvidenceBasedHiddenTest[] = rawTests.slice(0, 5).map((t, idx) => {
        const matchingTarget = stressTargets[idx] || stressTargets[0];
        const oracleResult = evaluateProblemOracle(problem.slug || problem.title, t.input, t.expectedOutput);

        return {
          id: `HT-0${idx + 1}`,
          targetId: matchingTarget.id,
          kind: matchingTarget.kind,
          riskTitle: t.riskTitle || matchingTarget.title,
          confidence: (t.confidence === 'High' || t.confidence === 'Medium' || t.confidence === 'Low') ? t.confidence : 'High',
          confidenceScore: matchingTarget.confidence,
          verificationStatus: oracleResult.verificationStatus,
          verificationBadgeText: oracleResult.verificationBadgeText,
          evidence: matchingTarget.sourceEvidence.concat(matchingTarget.constraintEvidence),
          input: t.input || 'Sample valid input',
          expectedOutput: oracleResult.expectedOutput || t.expectedOutput || 'Expected output',
          whyExists: t.whyExists || 'Validates critical boundary condition derived from source evidence.',
          whatItAttacks: t.whatItAttacks || matchingTarget.whatItAttacks,
          constraintRelevance: t.constraintRelevance || 'Problem requirement + submitted source code.',
        };
      });

      const validated = validateAndDeduplicateTests(formattedTests, validationContext);
      if (validated.length === 5) {
        return validated;
      }
    }
  } catch (err) {
    console.warn('[SSM] Groq test synthesis failed or returned invalid JSON. Generating dynamic deterministic fallback:', err);
  }

  // Dynamic deterministic synthesizer grounded in actual parameter signature & problem type
  const fallback = generateDynamicFallbackTests(pack);
  return validateAndDeduplicateTests(fallback, validationContext);
}

function generateDynamicFallbackTests(pack: EvidencePack): EvidenceBasedHiddenTest[] {
  const { problem, submission, stressTargets } = pack;
  const slug = (problem.slug || problem.title).toLowerCase().replace(/[^a-z0-9]/g, '-');
  const code = submission.sourceCode;
  const params = submission.normalizedFacts.functions[0]?.params || [];

  const isStringProblem = params.some(p => p.toLowerCase() === 's' || p.toLowerCase().includes('str')) ||
    code.includes('.charAt(') || code.includes('.charCodeAt(') || code.includes('.length') && slug.includes('string');
  const isArrayWithTarget = params.some(p => p.toLowerCase() === 'target' || p.toLowerCase() === 'k' || p.toLowerCase() === 'threshold') ||
    code.includes('target') || code.includes('threshold');
  const isIntegerProblem = params.length === 1 && (params[0] === 'n' || params[0] === 'num' || params[0] === 'x') || slug.includes('palindrome-number') || slug.includes('climbing-stairs');

  const fallbackTests: EvidenceBasedHiddenTest[] = stressTargets.map((st, idx) => {
    let input = '';
    let candidateExpected = '';

    if (slug.includes('palindrome-number') || slug === 'palindrome') {
      const cases = [
        { input: 'x = -121', expected: 'false' },
        { input: 'x = 0', expected: 'true' },
        { input: 'x = 10', expected: 'false' },
        { input: 'x = 121', expected: 'true' },
        { input: 'x = 1234321', expected: 'true' },
      ];
      input = cases[idx % cases.length].input;
      candidateExpected = cases[idx % cases.length].expected;
    } else if (slug.includes('find-the-index-of-the-first-occurrence-in-a-string') || slug.includes('str-str')) {
      const cases = [
        { input: 'haystack = "sadbutsad", needle = "sad"', expected: '0' },
        { input: 'haystack = "leetcode", needle = "leeto"', expected: '-1' },
        { input: 'haystack = "a", needle = "a"', expected: '0' },
        { input: 'haystack = "mississippi", needle = "issip"', expected: '4' },
        { input: 'haystack = "aaa", needle = "aaaa"', expected: '-1' },
      ];
      input = cases[idx % cases.length].input;
      candidateExpected = cases[idx % cases.length].expected;
    } else if (slug.includes('length-of-last-word')) {
      const cases = [
        { input: 's = "Hello World"', expected: '5' },
        { input: 's = "   fly me   to   the moon  "', expected: '4' },
        { input: 's = "luffy is still joyboy"', expected: '6' },
        { input: 's = "a"', expected: '1' },
        { input: 's = "    day    "', expected: '3' },
      ];
      input = cases[idx % cases.length].input;
      candidateExpected = cases[idx % cases.length].expected;
    } else if (slug.includes('valid-palindrome')) {
      const cases = [
        { input: 's = "A man, a plan, a canal: Panama"', expected: 'true' },
        { input: 's = "race a car"', expected: 'false' },
        { input: 's = " "', expected: 'true' },
        { input: 's = "0P"', expected: 'false' },
        { input: 's = "ab_a"', expected: 'true' },
      ];
      input = cases[idx % cases.length].input;
      candidateExpected = cases[idx % cases.length].expected;
    } else if (slug.includes('longest-substring-without-repeating-characters')) {
      const cases = [
        { input: 's = "abcabcbb"', expected: '3' },
        { input: 's = "bbbbb"', expected: '1' },
        { input: 's = "pwwkew"', expected: '3' },
        { input: 's = ""', expected: '0' },
        { input: 's = "abcdefghijklmnopqrstuvwxyz"', expected: '26' },
      ];
      input = cases[idx % cases.length].input;
      candidateExpected = cases[idx % cases.length].expected;
    } else if (slug.includes('two-sum')) {
      const cases = [
        { input: 'nums = [2, 7, 11, 15], target = 9', expected: '[0, 1]' },
        { input: 'nums = [3, 2, 4], target = 6', expected: '[1, 2]' },
        { input: 'nums = [3, 3], target = 6', expected: '[0, 1]' },
        { input: 'nums = [-1, -2, -3, -4, -5], target = -8', expected: '[2, 4]' },
        { input: 'nums = [0, 4, 3, 0], target = 0', expected: '[0, 3]' },
      ];
      input = cases[idx % cases.length].input;
      candidateExpected = cases[idx % cases.length].expected;
    } else if (slug.includes('binary-search')) {
      const cases = [
        { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', expected: '4' },
        { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 2', expected: '-1' },
        { input: 'nums = [5], target = 5', expected: '0' },
        { input: 'nums = [2, 5], target = 2', expected: '0' },
        { input: 'nums = [2, 5], target = 5', expected: '1' },
      ];
      input = cases[idx % cases.length].input;
      candidateExpected = cases[idx % cases.length].expected;
    } else if (slug.includes('climbing-stairs')) {
      const cases = [
        { input: 'n = 1', expected: '1' },
        { input: 'n = 2', expected: '2' },
        { input: 'n = 3', expected: '3' },
        { input: 'n = 10', expected: '89' },
        { input: 'n = 45', expected: '1836311903' },
      ];
      input = cases[idx % cases.length].input;
      candidateExpected = cases[idx % cases.length].expected;
    } else if (isStringProblem) {
      const stringCases = [
        { input: 's = ""', expected: '0' },
        { input: 's = "a"', expected: '1' },
        { input: 's = "aaaaa"', expected: '1' },
        { input: 's = "abacaba"', expected: 'Valid string evaluation' },
        { input: 's = "abcdef123!@#"', expected: 'Valid string evaluation' },
      ];
      input = stringCases[idx % stringCases.length].input;
      candidateExpected = stringCases[idx % stringCases.length].expected;
    } else if (isArrayWithTarget) {
      const arrayTargetCases = [
        { input: 'nums = [1, 2], target = 3', expected: 'Valid output' },
        { input: 'nums = [0, 0, 0], target = 0', expected: 'Valid output' },
        { input: 'nums = [-5, 0, 5], target = 0', expected: 'Valid output' },
        { input: 'nums = [1, 1, 1, 1], target = 2', expected: 'Valid output' },
        { input: 'nums = [1000000, 2000000], target = 3000000', expected: 'Valid output' },
      ];
      input = arrayTargetCases[idx % arrayTargetCases.length].input;
      candidateExpected = arrayTargetCases[idx % arrayTargetCases.length].expected;
    } else if (isIntegerProblem) {
      const intCases = [
        { input: 'x = 0', expected: 'true' },
        { input: 'x = -1', expected: 'false' },
        { input: 'x = 1', expected: 'true' },
        { input: 'x = 121', expected: 'true' },
        { input: 'x = 100000', expected: 'false' },
      ];
      input = intCases[idx % intCases.length].input;
      candidateExpected = intCases[idx % intCases.length].expected;
    } else {
      const generalCases = [
        { input: 'nums = [1]', expected: 'Valid output' },
        { input: 'nums = [1, 2, 3, 4, 5]', expected: 'Valid output' },
        { input: 'nums = [5, 4, 3, 2, 1]', expected: 'Valid output' },
        { input: 'nums = [-1, -2, -3]', expected: 'Valid output' },
        { input: 'nums = [0, 0, 0, 0]', expected: 'Valid output' },
      ];
      input = generalCases[idx % generalCases.length].input;
      candidateExpected = generalCases[idx % generalCases.length].expected;
    }

    const oracleResult = evaluateProblemOracle(problem.slug || problem.title, input, candidateExpected);

    return {
      id: `HT-0${idx + 1}`,
      targetId: st.id,
      kind: st.kind,
      riskTitle: st.title,
      confidence: 'High',
      confidenceScore: st.confidence,
      verificationStatus: oracleResult.verificationStatus,
      verificationBadgeText: oracleResult.verificationBadgeText,
      evidence: st.sourceEvidence.concat(st.constraintEvidence),
      input,
      expectedOutput: oracleResult.expectedOutput,
      whyExists: `Tests ${st.kind} conditions against problem constraints.`,
      whatItAttacks: st.whatItAttacks,
      constraintRelevance: `Exercises constraint boundaries for ${problem.title}.`,
    };
  });

  return fallbackTests;
}
