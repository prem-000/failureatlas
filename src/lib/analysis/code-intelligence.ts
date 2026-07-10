/**
 * src/lib/analysis/code-intelligence.ts
 * Pure rule-based + regex static code analyzer.
 * NO LLM calls here — all facts derived from code structure.
 * Groq is used only AFTER this module to explain the facts.
 */

import type { OptimizationItem, MLFeatures } from '@/types';

// ─── Pattern Detection ────────────────────────────────────────────────────────

export interface PatternDetectionResult {
  pattern: string;
  patternSlug: string;
  confidence: number;
  relatedPatterns: string[];
  evidence: string[];
}

interface PatternSignature {
  slug: string;
  label: string;
  related: string[];
  signals: Array<{ regex: RegExp; weight: number; evidence: string }>;
}

const PATTERN_SIGNATURES: PatternSignature[] = [
  {
    slug: 'two_pointer',
    label: 'Two Pointer',
    related: ['Sliding Window', 'Binary Search'],
    signals: [
      { regex: /\bleft\s*=\s*0\b/, weight: 0.35, evidence: 'Uses left/right pointer initialization' },
      { regex: /\bl\s*=\s*0\b/, weight: 0.30, evidence: 'Uses l/r pointer pattern' },
      { regex: /while\s*\(\s*(left|l)\s*<\s*(right|r)/i, weight: 0.30, evidence: 'Two-pointer while loop convergence' },
      { regex: /\b(left|right)\+\+|\+\+(left|right)|\b(left|right)--|-(left|right)/, weight: 0.20, evidence: 'Pointer increment/decrement pattern' },
    ],
  },
  {
    slug: 'sliding_window',
    label: 'Sliding Window',
    related: ['Two Pointer', 'Hash Map'],
    signals: [
      { regex: /\bwindow\b/i, weight: 0.25, evidence: 'Explicit window variable' },
      { regex: /window_start|window_end|start\s*=|end\s*=/i, weight: 0.25, evidence: 'Window boundary variables' },
      { regex: /while.*shrink|while.*left.*<=.*right/i, weight: 0.20, evidence: 'Window shrink loop' },
      { regex: /max(Len|Length|Window)|min(Len|Window)/i, weight: 0.20, evidence: 'Max/min window tracking' },
    ],
  },
  {
    slug: 'binary_search',
    label: 'Binary Search',
    related: ['Two Pointer', 'Array Traversal'],
    signals: [
      { regex: /\bmid\s*=\s*\(?(left|lo|low)\s*\+\s*(right|hi|high)\s*\)?\s*\/\/?\s*2/i, weight: 0.50, evidence: 'Midpoint calculation pattern' },
      { regex: /while\s*\(\s*(left|lo|low)\s*<=\s*(right|hi|high)/i, weight: 0.35, evidence: 'Binary search while loop condition' },
      { regex: /\(left\s*\+\s*right\)\s*>>\s*1/i, weight: 0.30, evidence: 'Midpoint via bit shift' },
    ],
  },
  {
    slug: 'hash_map',
    label: 'Hash Map',
    related: ['Prefix Sum', 'Sliding Window'],
    signals: [
      { regex: /\b(HashMap|dict|Map|{}|defaultdict|Counter)\b/, weight: 0.30, evidence: 'Hash map data structure used' },
      { regex: /\.\bget\b\(|\.has\(|in\s+\w+dict|\.containsKey/i, weight: 0.25, evidence: 'Hash map lookup pattern' },
      { regex: /seen|freq|count|memo\s*=\s*\{|=\s*{}/i, weight: 0.20, evidence: 'Frequency/memo dictionary' },
    ],
  },
  {
    slug: 'dynamic_programming',
    label: 'Dynamic Programming',
    related: ['Recursion', 'Memoization'],
    signals: [
      { regex: /\bdp\s*=\s*\[|\bdp\s*=\s*\{/i, weight: 0.40, evidence: 'dp array/dict initialization' },
      { regex: /\bdp\[i\]|\bdp\[j\]/i, weight: 0.35, evidence: 'dp table access by index' },
      { regex: /@lru_cache|@cache|functools\.cache/i, weight: 0.35, evidence: 'Memoization decorator' },
      { regex: /memo\s*=\s*{}/, weight: 0.25, evidence: 'Memo dictionary pattern' },
    ],
  },
  {
    slug: 'prefix_sum',
    label: 'Prefix Sum',
    related: ['Hash Map', 'Array Traversal'],
    signals: [
      { regex: /prefix|presum|cumsum|running_sum/i, weight: 0.35, evidence: 'Prefix sum variable' },
      { regex: /\bsum\[i\]\s*=\s*sum\[i-1\]/i, weight: 0.40, evidence: 'Prefix sum recurrence' },
      { regex: /for.*cumsum|numpy.*cumsum/i, weight: 0.25, evidence: 'Cumulative sum usage' },
    ],
  },
  {
    slug: 'simulation',
    label: 'Simulation',
    related: ['Array Traversal', 'Array Interleaving'],
    signals: [
      { regex: /for\s+i\s+in\s+range\(len\(|for\s*\(int\s+i\s*=\s*0.*i\s*<.*length/i, weight: 0.20, evidence: 'Index-based traversal' },
      { regex: /swap\(|temp\s*=\s*\w+;?\s*\w+\s*=\s*\w+/i, weight: 0.25, evidence: 'Element swap pattern' },
      { regex: /result\.append|result\.push|ans\.append/i, weight: 0.15, evidence: 'Result accumulation' },
    ],
  },
  {
    slug: 'graph_bfs',
    label: 'BFS (Graph)',
    related: ['DFS', 'Topological Sort'],
    signals: [
      { regex: /from\s+collections\s+import\s+deque|new\s+LinkedList|Queue\b/i, weight: 0.25, evidence: 'Queue data structure for BFS' },
      { regex: /\.popleft\(\)|\.poll\(\)/i, weight: 0.40, evidence: 'Queue pop-left (BFS pattern)' },
      { regex: /\bvisited\b|\bseen\b/i, weight: 0.15, evidence: 'Visited tracking' },
    ],
  },
  {
    slug: 'graph_dfs',
    label: 'DFS (Graph)',
    related: ['BFS', 'Backtracking'],
    signals: [
      { regex: /def\s+dfs\b|function\s+dfs\b|void\s+dfs\b/i, weight: 0.50, evidence: 'Explicit DFS function' },
      { regex: /\bstack\b.*\bappend\b|\bstack\.push/i, weight: 0.25, evidence: 'Stack-based DFS' },
      { regex: /\brecursive\b|\bdef.*self.*dfs/i, weight: 0.20, evidence: 'Recursive DFS pattern' },
    ],
  },
  {
    slug: 'backtracking',
    label: 'Backtracking',
    related: ['DFS', 'Recursion'],
    signals: [
      { regex: /backtrack|def\s+bt\b/i, weight: 0.45, evidence: 'Backtracking function name' },
      { regex: /path\.pop\(\)|path\.remove\(|undo|\.pop\(\)\s*#.*backtrack/i, weight: 0.30, evidence: 'State undo/pop on backtrack' },
      { regex: /for.*choices|for.*candidates/i, weight: 0.15, evidence: 'Iterating over choices' },
    ],
  },
  {
    slug: 'greedy',
    label: 'Greedy',
    related: ['Sorting', 'Priority Queue'],
    signals: [
      { regex: /\.sort\(\)|sorted\(|Arrays\.sort/i, weight: 0.20, evidence: 'Sorting step (common in greedy)' },
      { regex: /heapq|PriorityQueue|heappush|heappop/i, weight: 0.30, evidence: 'Priority queue (greedy selection)' },
      { regex: /max\s*=|min\s*=|best\s*=|optimal/i, weight: 0.15, evidence: 'Local optimum tracking' },
    ],
  },
];

export function detectPattern(code: string): PatternDetectionResult {
  const scores: Map<string, { score: number; sig: PatternSignature; evidence: string[] }> = new Map();

  for (const sig of PATTERN_SIGNATURES) {
    let score = 0;
    const matchedEvidence: string[] = [];
    for (const signal of sig.signals) {
      if (signal.regex.test(code)) {
        score += signal.weight;
        matchedEvidence.push(signal.evidence);
      }
    }
    if (score > 0) {
      scores.set(sig.slug, { score, sig, evidence: matchedEvidence });
    }
  }

  if (scores.size === 0) {
    return {
      pattern: 'Array Traversal',
      patternSlug: 'array_traversal',
      confidence: 0.40,
      relatedPatterns: ['Simulation', 'Hash Map'],
      evidence: ['No specific pattern detected — defaulting to array traversal'],
    };
  }

  const [bestSlug, best] = [...scores.entries()].sort((a, b) => b[1].score - a[1].score)[0];
  const confidence = Math.min(0.97, best.score);

  return {
    pattern: best.sig.label,
    patternSlug: bestSlug,
    confidence,
    relatedPatterns: best.sig.related,
    evidence: best.evidence,
  };
}

// ─── Complexity Estimation ────────────────────────────────────────────────────

export interface ComplexityResult {
  time: string;
  space: string;
  confidence: number;
  timeReasoning: string;
  spaceReasoning: string;
  isOptimal: boolean; // for L2 success level classification
}

export function estimateComplexity(code: string, patternSlug: string): ComplexityResult {
  const lines = code.split('\n');

  // Count nesting depth of loops
  let maxLoopDepth = 0;
  let currentDepth = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(for|while)\b/.test(trimmed)) currentDepth++;
    // rough dedent heuristic
    if (trimmed === '' || /^(return|break|continue)\b/.test(trimmed)) currentDepth = Math.max(0, currentDepth - 1);
    maxLoopDepth = Math.max(maxLoopDepth, currentDepth);
  }

  // Detect recursion
  const fnMatch = code.match(/def\s+(\w+)\s*\(/);
  const hasRecursion = fnMatch ? new RegExp(`\\b${fnMatch[1]}\\s*\\(`).test(code.replace(fnMatch[0], '')) : false;
  const hasMemo = /@lru_cache|@cache|memo\s*=\s*{}/.test(code);
  const hasSorting = /\.sort\(|sorted\(|Arrays\.sort/.test(code);
  const hasSet = /\bSet\b|\bset\(\)/.test(code);
  const hasDict = /\bdict\(\)|\b{}\b|\bMap\b/.test(code);

  // Time complexity
  let time = 'O(n)';
  let timeReasoning = 'Single-pass traversal detected';
  let timeConfidence = 0.70;

  if (patternSlug === 'binary_search') {
    time = 'O(log n)';
    timeReasoning = 'Binary search halves the search space each iteration';
    timeConfidence = 0.90;
  } else if (patternSlug === 'dynamic_programming' && hasMemo) {
    time = 'O(n²)';
    timeReasoning = 'Memoized recursion covers O(n²) subproblems';
    timeConfidence = 0.75;
  } else if (maxLoopDepth >= 2) {
    time = 'O(n²)';
    timeReasoning = `Nested loops detected (depth ${maxLoopDepth})`;
    timeConfidence = 0.80;
  } else if (hasRecursion && !hasMemo) {
    time = 'O(2ⁿ)';
    timeReasoning = 'Unmemoized recursion — exponential branching factor';
    timeConfidence = 0.70;
  } else if (hasSorting) {
    time = 'O(n log n)';
    timeReasoning = 'Sorting dominates — O(n log n)';
    timeConfidence = 0.85;
  } else if (patternSlug === 'hash_map' || patternSlug === 'prefix_sum') {
    time = 'O(n)';
    timeReasoning = 'Single-pass with O(1) hash map lookups';
    timeConfidence = 0.88;
  }

  // Space complexity
  let space = 'O(1)';
  let spaceReasoning = 'Constant extra space';
  let spaceConfidence = 0.65;

  if (hasDict || hasSet) {
    space = 'O(n)';
    spaceReasoning = 'Hash map / set stores up to n elements';
    spaceConfidence = 0.82;
  } else if (hasMemo || patternSlug === 'dynamic_programming') {
    space = 'O(n)';
    spaceReasoning = 'DP table / memo cache stores n states';
    spaceConfidence = 0.80;
  } else if (hasRecursion) {
    space = 'O(n)';
    spaceReasoning = 'Recursion stack depth up to O(n)';
    spaceConfidence = 0.72;
  }

  // Is the solution optimal for its pattern?
  const optimalPatterns: Record<string, string> = {
    binary_search: 'O(log n)',
    two_pointer: 'O(n)',
    sliding_window: 'O(n)',
    hash_map: 'O(n)',
    prefix_sum: 'O(n)',
    simulation: 'O(n)',
    greedy: 'O(n log n)',
  };
  const isOptimal = optimalPatterns[patternSlug] === time;

  return {
    time,
    space,
    confidence: (timeConfidence + spaceConfidence) / 2,
    timeReasoning,
    spaceReasoning,
    isOptimal,
  };
}

// ─── Code Quality Scoring ─────────────────────────────────────────────────────

export interface CodeQualityResult {
  score: number;
  strengths: string[];
  improvements: string[];
}

export function scoreCodeQuality(code: string): CodeQualityResult {
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Variables
  const lines = code.split('\n').filter(l => l.trim().length > 0);
  const avgLineLen = lines.reduce((s, l) => s + l.length, 0) / Math.max(lines.length, 1);
  const maxNesting = lines.reduce((max, l) => Math.max(max, (l.match(/^\s+/)?.[0].length ?? 0) / 4), 0);

  // Check naming conventions
  const singleLetterVars = (code.match(/\b[a-z]\s*=/g) || []).length;
  const descriptiveNames = /\b(result|answer|current|previous|count|total|found|visited|index)\b/i.test(code);

  // Single pass
  const loopCount = (code.match(/\b(for|while)\b/g) || []).length;
  const isSinglePass = loopCount <= 1;

  // Nesting
  const hasDeepNesting = maxNesting > 3;

  // Early return
  const hasEarlyReturn = /if.*len.*==\s*0|if not\s+\w|if\s+\w+\s+is\s+None/.test(code);

  // Scoring
  let score = 0.50;

  if (descriptiveNames) { score += 0.10; strengths.push('Descriptive variable names used'); }
  if (isSinglePass) { score += 0.15; strengths.push('Single-pass solution'); }
  if (hasEarlyReturn) { score += 0.08; strengths.push('Early return for edge cases'); }
  if (avgLineLen < 80) { score += 0.05; strengths.push('Concise line lengths'); }

  if (singleLetterVars > 5) { score -= 0.08; improvements.push('Reduce single-letter variable names for clarity'); }
  if (hasDeepNesting) { score -= 0.10; improvements.push('Reduce nesting depth — consider early returns or helper functions'); }
  if (loopCount > 2) { score -= 0.05; improvements.push('Consider consolidating multiple loops into one pass'); }
  if (avgLineLen > 100) { score -= 0.05; improvements.push('Break long lines for readability'); }

  // Default strengths if none
  if (strengths.length === 0) strengths.push('Functional solution within constraints');
  if (improvements.length === 0) improvements.push('Consider adding inline comments for clarity');

  return {
    score: Math.max(0.20, Math.min(1.0, score)),
    strengths,
    improvements,
  };
}

// ─── Edge Case Coverage (Removed in favor of Adversarial Test Lab) ───────────────────────────

// ─── Optimization Review ──────────────────────────────────────────────────────

export function scoreOptimization(code: string, patternSlug: string): {
  score: number;
  items: OptimizationItem[];
} {
  const items: OptimizationItem[] = [];
  let score = 0.80; // start assuming decent

  // Nested loops → prefix sum or hash map
  if (/for[\s\S]*?for/.test(code) && !/dp\[/.test(code)) {
    items.push({
      current: 'Nested loops (O(n²))',
      alternative: 'Prefix Sum or Hash Map',
      benefit: 'Reduce time complexity from O(n²) to O(n)',
      estimatedImpact: 'High',
    });
    score -= 0.25;
  }

  // HashMap where two-pointer could work
  if (patternSlug === 'hash_map' && /sorted\(|\.sort\(/.test(code)) {
    items.push({
      current: 'HashMap approach',
      alternative: 'Two Pointer (after sorting)',
      benefit: 'Reduce memory from O(n) to O(1)',
      estimatedImpact: 'Medium',
    });
    score -= 0.10;
  }

  // Unoptimized sorting where not needed
  if (/\.sort\(/.test(code) && (patternSlug === 'simulation' || patternSlug === 'hash_map')) {
    items.push({
      current: 'Unnecessary sort',
      alternative: 'Direct traversal without sorting',
      benefit: 'Remove O(n log n) overhead',
      estimatedImpact: 'Medium',
    });
    score -= 0.12;
  }

  // Multiple passes where one would do
  const forCount = (code.match(/\bfor\b/g) || []).length;
  if (forCount >= 3 && !/dp\[/.test(code)) {
    items.push({
      current: `${forCount} separate loops`,
      alternative: 'Single-pass combined logic',
      benefit: 'Improve constant factor and cache locality',
      estimatedImpact: 'Low',
    });
    score -= 0.08;
  }

  return { score: Math.max(0.30, Math.min(1.0, score)), items };
}

// ─── Success Level Classification ─────────────────────────────────────────────

export function classifySuccessLevel(opts: {
  attemptCount: number;
  isOptimalComplexity: boolean;
  patternConfidence: number;
  edgeCaseScore: number; // average coverage confidence
  codeQualityScore: number;
}): { level: 1 | 2 | 3 | 4; label: string } {
  const { attemptCount, isOptimalComplexity, patternConfidence, edgeCaseScore, codeQualityScore } = opts;

  // L4: Transferable — first attempt, optimal, high pattern confidence, all edges covered
  if (attemptCount === 1 && isOptimalComplexity && patternConfidence >= 0.70 && edgeCaseScore >= 0.75) {
    return { level: 4, label: 'Transferable Skill' };
  }
  // L3: Pattern Mastery — optimal complexity + recognized pattern
  if (isOptimalComplexity && patternConfidence >= 0.60 && codeQualityScore >= 0.60) {
    return { level: 3, label: 'Pattern Mastery' };
  }
  // L2: Accepted + Optimal — correct complexity even if pattern not recognized
  if (isOptimalComplexity && codeQualityScore >= 0.45) {
    return { level: 2, label: 'Accepted + Optimal' };
  }
  // L1: Just accepted
  return { level: 1, label: 'Accepted' };
}

// ─── Future Risk Prediction ───────────────────────────────────────────────────

import type { FutureRisk } from '@/types';

export function predictFutureRisks(
  patternSlug: string,
  complexity: ComplexityResult,
  robustnessScore: number
): FutureRisk[] {
  const risks: FutureRisk[] = [];

  if (robustnessScore < 80) {
    risks.push({
      risk: `Potential edge cases vulnerable`,
      reason: 'Harder variants of this problem often use boundary conditions to differentiate solutions',
      severity: robustnessScore < 60 ? 'High' : 'Medium',
    });
  }

  if (patternSlug === 'simulation') {
    risks.push({
      risk: 'In-place transformation variants',
      reason: 'Simulation solutions often need to be adapted to O(1) space for harder follow-up problems',
      severity: 'Medium',
    });
  }

  if (!complexity.isOptimal) {
    risks.push({
      risk: 'Performance at maximum constraints',
      reason: `Current complexity ${complexity.time} may TLE on n=10⁵ or n=10⁶ inputs in harder variants`,
      severity: 'High',
    });
  }

  if (patternSlug === 'hash_map') {
    risks.push({
      risk: 'Memory-constrained variants',
      reason: 'Follow-up problems often ask for O(1) space — requiring a Two Pointer or Prefix Sum reformulation',
      severity: 'Low',
    });
  }

  if (risks.length === 0) {
    risks.push({
      risk: 'Pattern transfer to harder problem classes',
      reason: 'This solution handles the current problem well — the next step is applying this pattern under additional constraints',
      severity: 'Low',
    });
  }

  return risks;
}

// ─── ML Features Aggregation ──────────────────────────────────────────────────

export function buildMLFeatures(opts: {
  patternSlug: string;
  complexity: ComplexityResult;
  edgeCaseScore: number;
  quality: CodeQualityResult;
  optimization: { score: number };
  successLevel: number;
}): MLFeatures {
  return {
    pattern_detected: opts.patternSlug,
    time_complexity: opts.complexity.time,
    space_complexity: opts.complexity.space,
    edge_case_score: opts.edgeCaseScore,
    code_quality_score: Math.round(opts.quality.score * 100) / 100,
    optimization_score: Math.round(opts.optimization.score * 100) / 100,
    success_level: opts.successLevel,
  };
}
