/**
 * src/lib/diagnosis/code-detector.ts
 *
 * Multi-signal code detection engine.
 * Computes a weighted score to avoid false positives on normal prose
 * that happens to contain words like 'for', 'if', or 'return'.
 */

export interface CodeDetectionResult {
  hasCode: boolean;
  score: number;
  language?: 'python' | 'javascript' | 'typescript' | 'java' | 'cpp' | 'unknown';
  extractedCode?: string;
  cleanedQuery: string;
}

export function detectCode(input: string): CodeDetectionResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { hasCode: false, score: 0, cleanedQuery: '' };
  }

  // 1. Check for explicit markdown fences
  const fenceMatch = trimmed.match(/```(?:[a-zA-Z0-9_-]*\n)?([\s\S]+?)```/);
  if (fenceMatch) {
    const code = fenceMatch[1].trim();
    const langMatch = trimmed.match(/```([a-zA-Z0-9_-]+)/);
    const lang = normalizeLanguage(langMatch?.[1]) || inferLanguageFromCode(code);
    const cleaned = trimmed.replace(/```[\s\S]+?```/g, '').trim();
    return {
      hasCode: true,
      score: 1.0,
      language: lang,
      extractedCode: code,
      cleanedQuery: cleaned || trimmed,
    };
  }

  // 2. Multi-signal scoring for raw pasted code
  let score = 0;
  const lines = trimmed.split('\n');

  // Signal A: Multi-line indentation patterns (e.g. 2 or 4 spaces, or tabs)
  const indentedLines = lines.filter((l) => /^( {2,}|\t+)\S/.test(l));
  if (lines.length >= 2 && indentedLines.length >= 1) {
    const indentRatio = indentedLines.length / lines.length;
    score += Math.min(0.35, indentRatio * 0.4);
  }

  // Signal B: Control flow & syntax keywords
  const keywordSignals = [
    /\bdef\s+[a-zA-Z_]\w*\s*\(/,
    /\bfunction\s+[a-zA-Z_]\w*\s*\(/,
    /\b(?:const|let|var)\s+[a-zA-Z_]\w*\s*=/,
    /\bpublic\s+(?:static\s+)?(?:void|int|boolean|class)\b/,
    /\bclass\s+[A-Z]\w*(?:\s+extends|\s*\{|:)/,
    /\bwhile\s*\(?[^)]+\)?\s*[:{]/,
    /\bfor\s*\(?[^)]+\)?\s*[:{]/,
    /\bif\s*\(?[^)]+\)?\s*[:{]/,
    /\breturn\s+[a-zA-Z0-9_\[\]\-+*\/]/,
    /#include\s*<[\w.]+>/,
    /\bimport\s+[\w.*]+(?:\s+from|\s*;)/,
  ];

  let matchedKeywords = 0;
  for (const regex of keywordSignals) {
    if (regex.test(trimmed)) {
      matchedKeywords++;
    }
  }
  if (matchedKeywords >= 1) {
    score += Math.min(0.45, matchedKeywords * 0.15);
  }

  // Signal C: Special syntax symbols density: ;, {}, [], (), =>
  const codeChars = (trimmed.match(/[{}();[\]=><!&|+*\/%]/g) || []).length;
  const symbolDensity = codeChars / Math.max(trimmed.length, 1);
  if (symbolDensity >= 0.08) {
    score += Math.min(0.25, symbolDensity * 1.5);
  }

  // Signal D: Python-style colon block terminations (e.g. `while left <= right:`)
  const pythonBlocks = lines.filter((l) => /:\s*$/.test(l.trim()));
  if (pythonBlocks.length >= 1) {
    score += 0.15;
  }

  // Signal E: Negative penalty for pure conversational prose
  const proseIndicators = [
    /\b(?:hello|hi|hey|how\s+are\s+you|what\s+is|explain|can\s+you\s+help|thank\s+you|please|why\s+does)\b/i,
    /\?$/,
  ];
  let proseMatches = 0;
  for (const r of proseIndicators) {
    if (r.test(trimmed)) proseMatches++;
  }
  if (proseMatches >= 1 && lines.length <= 3 && matchedKeywords === 0) {
    score -= 0.35;
  }

  const hasCode = score >= 0.45;
  const lang = hasCode ? inferLanguageFromCode(trimmed) : undefined;

  return {
    hasCode,
    score: Math.max(0, Math.min(1, score)),
    language: lang,
    extractedCode: hasCode ? trimmed : undefined,
    cleanedQuery: trimmed,
  };
}

function inferLanguageFromCode(code: string): CodeDetectionResult['language'] {
  if (/\bdef\s+|:\s*$|\belif\b|\bNone\b|\bTrue\b|\bFalse\b|\bself\./.test(code)) {
    return 'python';
  }
  if (/public\s+(?:static\s+)?(?:void|class|int|String)|System\.out\.println/.test(code)) {
    return 'java';
  }
  if (/#include\s*<|std::|cout\s*<<|vector\s*</.test(code)) {
    return 'cpp';
  }
  if (/\binterface\s+|\btype\s+[A-Z]|\b:\s*(?:string|number|boolean)\b/.test(code)) {
    return 'typescript';
  }
  if (/\bfunction\b|\bconst\b|\blet\b|\bvar\b|=>|console\.log/.test(code)) {
    return 'javascript';
  }
  return 'unknown';
}

function normalizeLanguage(raw?: string): CodeDetectionResult['language'] | undefined {
  if (!raw) return undefined;
  const l = raw.toLowerCase().trim();
  if (l === 'py' || l === 'python') return 'python';
  if (l === 'js' || l === 'javascript') return 'javascript';
  if (l === 'ts' || l === 'typescript') return 'typescript';
  if (l === 'java') return 'java';
  if (l === 'cpp' || l === 'c++') return 'cpp';
  return 'unknown';
}
