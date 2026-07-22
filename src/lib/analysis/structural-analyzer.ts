import { detectPattern, estimateComplexity } from './code-intelligence';

export interface FingerprintItem {
  type: string;
  confidence: number;
}

export interface StructuralEvidence {
  problem: {
    title: string;
    difficulty: string;
    constraints: string;
    summary: string;
    inputFormat: string;
    outputFormat: string;
  };
  algorithm: {
    type: string;
    confidence: number;
  };
  timeComplexity: string;
  spaceComplexity: string;
  implementationFingerprint: {
    algorithm: FingerprintItem;
    pointerStrategy: FingerprintItem;
    loopType: FingerprintItem;
    comparisonStyle: FingerprintItem;
    terminationCondition: FingerprintItem;
    duplicateHandling: FingerprintItem;
    earlyReturn: FingerprintItem;
    recursion: FingerprintItem;
  };
  criticalSnippets: string[];
  boundaryChecks: string[];
  knownWeaknesses: string[];
}

// In-memory cache for structural evidence by submission fingerprint
const structuralCache = new Map<string, StructuralEvidence>();

export function extractStructuralEvidence(opts: {
  code: string;
  problemTitle: string;
  problemSlug: string;
  problemDifficulty?: string;
  problemConstraints?: string;
  problemSummary?: string;
  inputFormat?: string;
  outputFormat?: string;
}): StructuralEvidence {
  const {
    code,
    problemTitle,
    problemSlug,
    problemDifficulty = 'Medium',
    problemConstraints,
    problemSummary,
    inputFormat,
    outputFormat,
  } = opts;
  const cacheKey = `${problemSlug}:${code.length}:${hashString(code)}`;

  if (structuralCache.has(cacheKey)) {
    return structuralCache.get(cacheKey)!;
  }

  const patternResult = detectPattern(code);
  const complexityResult = estimateComplexity(code, patternResult.patternSlug);

  const loopTypeInfo = detectLoopTypeInfo(code);
  const pointerStrategyInfo = detectPointerStrategyInfo(code);
  const comparisonStyleInfo = detectComparisonStyleInfo(code);
  const terminationConditionInfo = extractTerminationConditionInfo(code);
  const duplicateHandlingInfo = detectDuplicateHandlingInfo(code);
  const earlyReturnInfo = detectEarlyReturnInfo(code);
  const recursionInfo = detectRecursionInfo(code);

  const criticalSnippets = extractConceptualTargets(code, patternResult.patternSlug);
  const boundaryChecks = extractBoundaryChecks(code);
  const knownWeaknesses = inferKnownWeaknesses(code, patternResult.patternSlug, loopTypeInfo.type);

  // Synthesize concise 100-200 token problem summary and domain specifications if not passed in
  const synthesizedConstraints = problemConstraints || '1 <= N <= 10^5, -10^9 <= nums[i] <= 10^9';
  const synthesizedInputFormat = inputFormat || 'nums: number[] (length N), target: number';
  const synthesizedOutputFormat = outputFormat || 'number (index or computed result)';
  const synthesizedSummary =
    problemSummary ||
    `Problem: ${problemTitle} (${problemDifficulty}). Goal: Compute correct output given ${synthesizedInputFormat} adhering to constraints ${synthesizedConstraints}. Implementation utilizes ${patternResult.pattern} approach.`;

  const evidence: StructuralEvidence = {
    problem: {
      title: problemTitle,
      difficulty: problemDifficulty,
      constraints: synthesizedConstraints,
      summary: synthesizedSummary,
      inputFormat: synthesizedInputFormat,
      outputFormat: synthesizedOutputFormat,
    },
    algorithm: {
      type: patternResult.pattern,
      confidence: patternResult.confidence,
    },
    timeComplexity: complexityResult.time,
    spaceComplexity: complexityResult.space,
    implementationFingerprint: {
      algorithm: {
        type: patternResult.pattern,
        confidence: patternResult.confidence,
      },
      pointerStrategy: pointerStrategyInfo,
      loopType: loopTypeInfo,
      comparisonStyle: comparisonStyleInfo,
      terminationCondition: terminationConditionInfo,
      duplicateHandling: duplicateHandlingInfo,
      earlyReturn: earlyReturnInfo,
      recursion: recursionInfo,
    },
    criticalSnippets,
    boundaryChecks,
    knownWeaknesses,
  };

  structuralCache.set(cacheKey, evidence);
  return evidence;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function detectLoopTypeInfo(code: string): FingerprintItem {
  const hasWhile = /while\s*\(/.test(code);
  const hasFor = /for\s*\(|for\s+\w+\s+in/.test(code);
  const loopMatches = code.match(/\b(for|while)\b/g);
  if (loopMatches && loopMatches.length >= 2) return { type: 'Nested Loop', confidence: 0.94 };
  if (hasWhile) return { type: 'While Loop Convergence', confidence: 0.92 };
  if (hasFor) return { type: 'Linear For Loop', confidence: 0.95 };
  if (checkRecursion(code)) return { type: 'Recursive Call Stack', confidence: 0.88 };
  return { type: 'Sequential Execution', confidence: 0.75 };
}

function detectPointerStrategyInfo(code: string): FingerprintItem {
  if (/\b(left|right|lo|hi|l|r)\b/i.test(code) && /while\s*\(/.test(code)) return { type: 'Two Pointer Convergence', confidence: 0.95 };
  if (/\b(slow|fast)\b/i.test(code)) return { type: 'Fast & Slow Pointer', confidence: 0.96 };
  if (/\b(window|window_start|window_end)\b/i.test(code)) return { type: 'Sliding Window Boundary', confidence: 0.92 };
  if (/\b(i|j|k)\b/.test(code) && /for|while/.test(code)) return { type: 'Index Traversal', confidence: 0.85 };
  return { type: 'Single Element Traversal', confidence: 0.60 };
}

function detectComparisonStyleInfo(code: string): FingerprintItem {
  const matches = code.match(/<=|>=|<|>|==|!=/g);
  if (!matches) return { type: 'Equality Check (==)', confidence: 0.80 };
  const unique = Array.from(new Set(matches)).join(', ');
  return { type: `Comparison (${unique})`, confidence: 0.90 };
}

function extractTerminationConditionInfo(code: string): FingerprintItem {
  const whileMatch = code.match(/while\s*\(([^)]+)\)/);
  if (whileMatch) return { type: `while (${whileMatch[1].trim()})`, confidence: 0.95 };
  const forMatch = code.match(/for\s*\([^;]*;([^;]+);/);
  if (forMatch) return { type: `for (; ${forMatch[1].trim()};)`, confidence: 0.92 };
  return { type: 'Implicit Traversal Guard', confidence: 0.70 };
}

function detectDuplicateHandlingInfo(code: string): FingerprintItem {
  const hasDup = /has\(|contains|seen|unique|distinct|freq|dict|Set/i.test(code);
  return {
    type: hasDup ? 'Set / Hash Frequency Tracking' : 'None Detected',
    confidence: hasDup ? 0.92 : 0.80,
  };
}

function detectEarlyReturnInfo(code: string): FingerprintItem {
  const hasEarly = /^[\s\S]*?(if\s*\([^)]*\)\s*return|if\s+not\s+\w+:)/m.test(code);
  return {
    type: hasEarly ? 'Guard Clause Early Exit' : 'Full Traversal Return',
    confidence: hasEarly ? 0.90 : 0.85,
  };
}

function detectRecursionInfo(code: string): FingerprintItem {
  const rec = checkRecursion(code);
  return {
    type: rec ? 'Recursive Subproblem Decomposition' : 'Iterative Execution',
    confidence: rec ? 0.92 : 0.96,
  };
}

function checkRecursion(code: string): boolean {
  const fnNameMatch = code.match(/(?:function|def)\s+([a-zA-Z0-9_]+)/);
  if (fnNameMatch) {
    const name = fnNameMatch[1];
    const regex = new RegExp(`\\b${name}\\s*\\(`, 'g');
    const matches = code.match(regex);
    return (matches ? matches.length : 0) > 1;
  }
  return false;
}

function extractConceptualTargets(code: string, patternSlug: string): string[] {
  const targets: string[] = [];

  if (/left\s*<=\s*right|l\s*<=\s*r|lo\s*<=\s*hi/i.test(code)) {
    targets.push('✓ Inclusive boundary comparison');
  } else if (/left\s*<\s*right|l\s*<\s*r|lo\s*<\s*hi/i.test(code)) {
    targets.push('✓ Exclusive boundary comparison');
  } else {
    targets.push('✓ Loop boundary comparison');
  }

  if (/right--|r--|hi--/i.test(code) || /left\+\+|l\+\+|lo\+\+/i.test(code)) {
    targets.push('✓ Pointer update strategy');
  }

  if (/mid|middle/i.test(code)) {
    targets.push('✓ Midpoint calculation');
  }

  if (/has\(|contains|seen|Set|dict|freq/i.test(code)) {
    targets.push('✓ Duplicate handling');
  }

  if (/return\s+[^;]+;?\s*$/m.test(code) && /if\s*\(.*return/i.test(code)) {
    targets.push('✓ Early exit guard');
  }

  if (/length\s*===\s*0|!nums|len\(.*\)\s*==\s*0/i.test(code)) {
    targets.push('✓ Empty input guard');
  }

  if (targets.length < 4) {
    targets.push('✓ State transition tracking');
  }

  return Array.from(new Set(targets)).slice(0, 5);
}

function extractBoundaryChecks(code: string): string[] {
  const checks: string[] = [];
  if (/length\s*===\s*0|len\(.*\)\s*==\s*0|!head|!root/i.test(code)) {
    checks.push('empty structure / null input');
  }
  if (/length\s*===\s*1|len\(.*\)\s*==\s*1/i.test(code)) {
    checks.push('single element boundary');
  }
  if (/Infinity|MAX_VALUE|sys\.maxsize/i.test(code)) {
    checks.push('infinity / max bound value');
  }
  if (/<= 0|< 0/.test(code)) {
    checks.push('zero and negative value bounds');
  }
  if (checks.length === 0) {
    checks.push('standard array bounds');
  }
  return checks;
}

function inferKnownWeaknesses(code: string, patternSlug: string, loopType: string): string[] {
  const weaknesses: string[] = [];
  if (/\(left\s*\+\s*right\)\s*\/\s*2|\(lo\s*\+\s*hi\)\s*\/\s*2/.test(code)) {
    weaknesses.push('possible integer overflow in midpoint calculation (use left + (right - left) / 2)');
  }
  if (loopType.includes('While') && /<=/.test(code) && !/==/.test(code)) {
    weaknesses.push('inclusive loop boundary without exact match return — off-by-one risk');
  }
  if (patternSlug === 'sliding_window' && !/Math\.max|max_/.test(code)) {
    weaknesses.push('unvalidated window shrink condition');
  }
  if (patternSlug === 'hash_map' && !/has\(|in\b/.test(code)) {
    weaknesses.push('missing key existence check before access');
  }
  if (!/length\s*===\s*0|!nums\.length|len\(.*\)\s*==\s*0/.test(code)) {
    weaknesses.push('unhandled empty input guard');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('duplicate element boundary edge cases', 'extreme input size stress');
  }
  return weaknesses;
}
