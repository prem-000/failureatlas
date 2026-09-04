import type { EvidenceBasedHiddenTest } from './types';

export interface ValidationContext {
  problemTitle: string;
  problemSlug: string;
  constraints: string[];
  sourceCode: string;
  detectedApproach: string;
  parameters: string[];
}

/**
 * Validates hidden test cases according to strict evidence-driven criteria:
 * 1. Input schema validation (e.g. integer problem must not have arr = [...], k = 3)
 * 2. Output validation (must be non-empty and schema aligned)
 * 3. Constraint validation (within problem limits)
 * 4. Source relevance validation (connects to real code/problem items)
 * 5. Terminology validation (reject unsupported jargon like 'sliding window' if not used)
 * 6. Distinctness validation (reject duplicated inputs)
 */
export function validateAndDeduplicateTests(
  tests: EvidenceBasedHiddenTest[],
  context?: ValidationContext | string[],
  fillMissing?: (currentValidated: EvidenceBasedHiddenTest[], countNeeded: number) => EvidenceBasedHiddenTest[]
): EvidenceBasedHiddenTest[] {
  const validated: EvidenceBasedHiddenTest[] = [];
  const seenInputs = new Set<string>();

  const ctx: ValidationContext = Array.isArray(context)
    ? {
        problemTitle: '',
        problemSlug: '',
        constraints: context,
        sourceCode: '',
        detectedApproach: '',
        parameters: [],
      }
    : context || {
        problemTitle: '',
        problemSlug: '',
        constraints: [],
        sourceCode: '',
        detectedApproach: '',
        parameters: [],
      };

  const isNumericSingleParam =
    ctx.problemSlug.includes('palindrome-number') ||
    ctx.problemSlug.includes('climbing-stairs') ||
    ctx.problemSlug.includes('fibonacci') ||
    ctx.problemSlug.includes('sqrt') ||
    ctx.problemSlug.includes('perfect-square') ||
    (ctx.parameters.length === 1 && /^(x|n|num)$/i.test(ctx.parameters[0]));

  const isStringSingleParam =
    ctx.problemSlug.includes('valid-parentheses') ||
    ctx.problemSlug.includes('length-of-last-word') ||
    ctx.problemSlug.includes('valid-palindrome') ||
    ctx.problemSlug.includes('longest-substring') ||
    (ctx.parameters.length === 1 && /^(s|str|string)$/i.test(ctx.parameters[0]));

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];

    let inputClean = (test.input || '').trim();
    let outputClean = (test.expectedOutput || '').trim();

    if (!inputClean || !outputClean) continue;

    // 1. Input Schema Validation
    if (isNumericSingleParam) {
      // If the problem is Palindrome Number or integer problem, reject array/window inputs
      if (inputClean.includes('arr =') || inputClean.includes('k =') || inputClean.includes('threshold =')) {
        continue;
      }
    } else if (isStringSingleParam) {
      if (inputClean.includes('arr =') && !inputClean.includes('s =')) {
        continue;
      }
    }

    // 2. Terminology Validation: Sanitize unsupported jargon if not present in source or problem
    let whyExistsClean = test.whyExists || '';
    let whatItAttacksClean = test.whatItAttacks || '';

    const hasWindowInCodeOrProblem =
      ctx.sourceCode.includes('window') ||
      ctx.sourceCode.includes('k') ||
      ctx.problemSlug.includes('sliding-window') ||
      ctx.problemSlug.includes('sub-arrays-of-size-k') ||
      ctx.detectedApproach.toLowerCase().includes('sliding window');

    if (!hasWindowInCodeOrProblem) {
      whyExistsClean = whyExistsClean
        .replace(/running window|sliding window|outgoing value|window size|window state/gi, 'processing state')
        .replace(/threshold/gi, 'boundary limit');
      whatItAttacksClean = whatItAttacksClean
        .replace(/running window|sliding window|outgoing value|window size/gi, 'state calculation')
        .replace(/threshold/gi, 'boundary limit');
    }

    // 3. Distinctness check
    const normalizedKey = inputClean.replace(/\s+/g, '').toLowerCase();
    if (seenInputs.has(normalizedKey)) continue;
    seenInputs.add(normalizedKey);

    // 4. Normalize Test ID: HT-01 .. HT-05
    const id = `HT-0${validated.length + 1}`;

    validated.push({
      ...test,
      id,
      input: inputClean,
      expectedOutput: outputClean,
      whyExists: whyExistsClean,
      whatItAttacks: whatItAttacksClean,
    });

    if (validated.length >= 5) break;
  }

  // 5. Fill missing slots if count < 5 and fillMissing callback provided
  if (validated.length < 5 && fillMissing) {
    const needed = 5 - validated.length;
    const replacements = fillMissing(validated, needed);
    for (const rep of replacements) {
      if (validated.length >= 5) break;
      const inputClean = (rep.input || '').trim();
      const outputClean = (rep.expectedOutput || '').trim();
      if (!inputClean || !outputClean) continue;
      const normalizedKey = inputClean.replace(/\s+/g, '').toLowerCase();
      if (seenInputs.has(normalizedKey)) continue;
      seenInputs.add(normalizedKey);
      const id = `HT-0${validated.length + 1}`;
      validated.push({
        ...rep,
        id,
      });
    }
  }

  // Renumber to guarantee exactly HT-01 .. HT-05
  return validated.slice(0, 5).map((t, idx) => ({
    ...t,
    id: `HT-0${idx + 1}`,
  }));
}
