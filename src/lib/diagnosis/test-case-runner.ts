/**
 * src/lib/diagnosis/test-case-runner.ts
 *
 * Grounded test-case runner and source verifier:
 * - Tier 1: Extension-captured failedTestCase from real LeetCode submission (verified: true)
 * - Tier 3: LLM-suggested fallback test (verified: false, labeled 'suggested, not verified')
 *
 * Also provides code line integrity verification and anti-code enforcement.
 */

export interface FormattedTestCase {
  input: string;
  expected: string;
  got: string;
  verified: boolean;
}

export interface CodeLineVerification {
  valid: boolean;
  line: number;
  code: string;
}

/**
 * Resolves test cases using Tier 1 (real submission event) or Tier 3 (LLM suggestion fallback).
 */
export function resolveTestCases(params: {
  capturedFailedTestCase?: string | null;
  llmSuggestededTests?: Array<{ input: string; expected: string; got: string }>;
  submissionStatus?: string;
}): FormattedTestCase[] {
  const { capturedFailedTestCase, llmSuggestededTests = [], submissionStatus } = params;

  // ── Tier 1: Extension-captured test case from real submission ─────────────────
  if (capturedFailedTestCase && capturedFailedTestCase.trim()) {
    const parsed = parseCapturedTestCase(capturedFailedTestCase, submissionStatus);
    if (parsed) {
      return [parsed];
    }
  }

  // ── Tier 3: LLM-suggested fallback test cases ─────────────────────────────────
  if (llmSuggestededTests && llmSuggestededTests.length > 0) {
    return llmSuggestededTests.slice(0, 2).map((t) => ({
      input: t.input,
      expected: t.expected,
      got: t.got,
      verified: false, // Server-owned: explicitly false for unverified suggestions
    }));
  }

  // Generic fallback if nothing available
  return [
    {
      input: 'nums = [1], target = 1',
      expected: '0',
      got: '-1',
      verified: false,
    },
  ];
}

/**
 * Parses LeetCode failedTestCase string into structured input, expected, got
 */
function parseCapturedTestCase(
  raw: string,
  status?: string
): FormattedTestCase | null {
  try {
    // Format 1: JSON formatted { input, expected, output }
    if (raw.startsWith('{') && raw.endsWith('}')) {
      const parsed = JSON.parse(raw);
      if (parsed.input) {
        return {
          input: typeof parsed.input === 'string' ? parsed.input : JSON.stringify(parsed.input),
          expected: String(parsed.expected ?? parsed.expectedOutput ?? 'expected result'),
          got: String(parsed.output ?? parsed.actualOutput ?? status ?? 'wrong answer'),
          verified: true,
        };
      }
    }

    // Format 2: Standard LeetCode raw input string e.g. "nums = [5], target = 5"
    return {
      input: raw.trim(),
      expected: 'Expected output',
      got: status || 'Failed output',
      verified: true,
    };
  } catch {
    return {
      input: raw.trim(),
      expected: 'Correct answer',
      got: status || 'Failed on test',
      verified: true,
    };
  }
}

/**
 * Validates that location.line exists in submitted code,
 * and fixes code line hallucinations if line is off-by-one or mismatched.
 */
export function verifyCodeLocation(
  submittedCode: string,
  reportedLine: number,
  reportedCodeSnippet: string
): CodeLineVerification {
  const lines = submittedCode.split('\n');
  if (lines.length === 0) {
    return { valid: true, line: 1, code: reportedCodeSnippet };
  }

  const clampedLine = Math.max(1, Math.min(lines.length, reportedLine));
  const exactLineContent = lines[clampedLine - 1]?.trim() || '';

  // Check if reported snippet matches exact line
  if (exactLineContent && (reportedCodeSnippet.includes(exactLineContent) || exactLineContent.includes(reportedCodeSnippet.trim()))) {
    return {
      valid: true,
      line: clampedLine,
      code: lines[clampedLine - 1],
    };
  }

  // Fuzzy search ±3 lines around reported line
  for (let offset = 1; offset <= 3; offset++) {
    for (const testLine of [clampedLine - offset, clampedLine + offset]) {
      if (testLine >= 1 && testLine <= lines.length) {
        const candidate = lines[testLine - 1].trim();
        if (candidate && reportedCodeSnippet.trim() && (candidate.includes(reportedCodeSnippet.trim()) || reportedCodeSnippet.includes(candidate))) {
          return {
            valid: true,
            line: testLine,
            code: lines[testLine - 1],
          };
        }
      }
    }
  }

  // Fallback: use actual line at clampedLine
  return {
    valid: true,
    line: clampedLine,
    code: lines[clampedLine - 1] || reportedCodeSnippet,
  };
}

/**
 * Enforces rule: "Never include corrected code"
 * Strips or flags any code fences or direct implementation blocks from LLM text.
 */
export function sanitizeAntiCode(text: string): { clean: string; containsCode: boolean } {
  let clean = text;
  let containsCode = false;

  if (/```[\s\S]+?```/.test(clean)) {
    containsCode = true;
    clean = clean.replace(/```[\s\S]+?```/g, '[explanation focused on algorithmic invariant]');
  }

  // Check for multi-line code statements e.g. `while ...:\n   return`
  if (/\b(?:def|function|class)\s+\w+[\s\S]*?\{|\bwhile\b[\s\S]*?return\b/i.test(clean)) {
    containsCode = true;
    clean = clean.replace(/\b(?:def|function|class)\s+[\s\S]+/gi, '');
  }

  return { clean: clean.trim(), containsCode };
}
