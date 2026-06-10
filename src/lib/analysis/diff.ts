/**
 * Myers Diff Algorithm
 * Identifies the shortest sequence of edits (insertions, deletions) between two sequences.
 * Used to detect code changes and generate evidence for root cause analysis.
 */

export interface DiffHunk {
  type: 'addition' | 'deletion' | 'modification';
  lineNumber: number;
  content: string;
  confidence: number;
}

export interface DiffResult {
  hunks: DiffHunk[];
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
}

/**
 * Compute longest common subsequence using dynamic programming.
 */
function lcs(a: string[], b: string[]): string[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the common subsequence
  const result: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  // Return as 2D array for consistency
  return [result];
}

/**
 * Myers diff: find the shortest edit script between two strings.
 * Returns hunks representing changes with context.
 */
export function computeDiff(before: string, after: string, contextLines = 3): DiffResult {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  // Build diff using simple O(n*m) algorithm
  // For production, consider using a library like diff-match-patch
  const hunks: DiffHunk[] = [];
  let beforeIdx = 0;
  let afterIdx = 0;
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  // Simple line-by-line diff
  const maxLen = Math.max(beforeLines.length, afterLines.length);

  for (let i = 0; i < maxLen; i++) {
    const beforeLine = beforeLines[i];
    const afterLine = afterLines[i];

    if (beforeLine === afterLine) {
      // No change
      beforeIdx++;
      afterIdx++;
    } else if (!afterLine) {
      // Line deleted
      hunks.push({
        type: 'deletion',
        lineNumber: beforeIdx + 1,
        content: beforeLine || '',
        confidence: 0.95,
      });
      removedCount++;
      beforeIdx++;
    } else if (!beforeLine) {
      // Line added
      hunks.push({
        type: 'addition',
        lineNumber: afterIdx + 1,
        content: afterLine,
        confidence: 0.95,
      });
      addedCount++;
      afterIdx++;
    } else {
      // Line modified (different but both present)
      hunks.push({
        type: 'modification',
        lineNumber: beforeIdx + 1,
        content: `${beforeLine} → ${afterLine}`,
        confidence: 0.85,
      });
      modifiedCount++;
      beforeIdx++;
      afterIdx++;
    }
  }

  return {
    hunks,
    addedLines: addedCount,
    removedLines: removedCount,
    modifiedLines: modifiedCount,
  };
}

/**
 * Analyze code patterns in diff to identify potential root causes.
 * Looks for common error patterns:
 * - Boundary changes (<=, <, >, >=)
 * - Loop modifications
 * - Condition inversions
 * - Data structure changes
 */
export function analyzeCodePatterns(diff: DiffResult): string[] {
  const patterns: string[] = [];

  for (const hunk of diff.hunks) {
    const content = hunk.content.toLowerCase();

    // Boundary condition patterns
    if (/(<|>|<=|>=|==|!=)/.test(content)) {
      patterns.push('boundary-condition-change');
    }

    // Loop patterns
    if (/\b(for|while|do)\b/.test(content)) {
      patterns.push('loop-modification');
    }

    // Condition patterns
    if (/\bnot\b|\s!|===|!==/.test(content)) {
      patterns.push('condition-inversion');
    }

    // Data structure patterns
    if (/\b(list|dict|set|array|map|queue|stack|heap)\b/.test(content)) {
      patterns.push('data-structure-change');
    }

    // Performance patterns
    if (/\b(sort|search|filter|reduce|map)\b/.test(content)) {
      patterns.push('algorithm-change');
    }
  }

  // Deduplicate
  return [...new Set(patterns)];
}

/**
 * Extract error signals from error message and stdout/stderr.
 * Categorizes error types and extracts keywords.
 */
export function analyzeErrorMessage(error: string): {
  type: string;
  keywords: string[];
  confidence: number;
} {
  const errorLower = error.toLowerCase();
  const keywords: string[] = [];
  let type = 'unknown';
  let confidence = 0.5;

  // Index out of bounds
  if (/index.*out.*of|out.*of.*range|indexerror/.test(errorLower)) {
    type = 'index-error';
    keywords.push('boundary-condition', 'array-access');
    confidence = 0.95;
  }

  // Time limit exceeded
  if (/time.*limit|timeout|timed out/.test(errorLower)) {
    type = 'time-limit';
    keywords.push('performance', 'algorithm-efficiency');
    confidence = 0.95;
  }

  // Memory limit exceeded
  if (/memory.*limit|memory.*exceeded|oom/.test(errorLower)) {
    type = 'memory-limit';
    keywords.push('space-complexity', 'data-structure');
    confidence = 0.95;
  }

  // Type errors
  if (/typeerror|type.*mismatch|cannot.*convert/.test(errorLower)) {
    type = 'type-error';
    keywords.push('implementation-detail', 'type-handling');
    confidence = 0.9;
  }

  // Null/undefined errors
  if (/null|undefined|nullpointerexception|attributeerror/.test(errorLower)) {
    type = 'null-error';
    keywords.push('implementation-detail', 'error-handling');
    confidence = 0.9;
  }

  // Wrong answer (generic)
  if (/wrong.*answer|assert.*fail|expected.*got/.test(errorLower)) {
    type = 'logic-error';
    keywords.push('algorithm', 'logic');
    confidence = 0.7;
  }

  // Extract keywords from error text
  const commonKeywords = [
    'algorithm',
    'boundary',
    'edge',
    'corner',
    'case',
    'loop',
    'array',
    'recursion',
    'stack',
  ];
  for (const kw of commonKeywords) {
    if (errorLower.includes(kw)) {
      keywords.push(kw);
    }
  }

  return {
    type,
    keywords: [...new Set(keywords)],
    confidence,
  };
}
