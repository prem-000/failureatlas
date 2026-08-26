/**
 * src/lib/intelligence/analysis/approach-classifier.ts
 * Algorithm-Aware Approach Classifier for submitted code.
 * Extracts structural signals and determines algorithmic strategies with concrete proof.
 */

import type { ProblemContract } from '../contracts/problem-contract';

export interface DetectedApproach {
  name: string;
  confidence: number;
  evidence: string[];
}

export function classifyApproach(
  code: string,
  contract: ProblemContract
): DetectedApproach {
  const scores: Array<{
    name: string;
    score: number;
    evidence: string[];
  }> = [];

  // 1. Two Pointers
  const twoPointerEvidence: string[] = [];
  let tpScore = 0;
  if (/while\s*\(\s*(left|l|low|lo|start|i)\s*<\s*(right|r|high|hi|end|j)/i.test(code)) {
    tpScore += 0.45;
    twoPointerEvidence.push('Two convergent index pointers evaluated in while-loop condition');
  }
  if (/(left|l)\+\+|\+\+(left|l)|(right|r)--|--(right|r)/i.test(code)) {
    tpScore += 0.3;
    twoPointerEvidence.push('Pointer increment/decrement progression detected');
  }
  if (/let\s+(left|l|start)\s*=\s*0.*let\s+(right|r|end)\s*=\s*/i.test(code)) {
    tpScore += 0.25;
    twoPointerEvidence.push('Opposite boundary pointer initialization detected');
  }
  if (tpScore > 0) scores.push({ name: 'Two Pointers', score: Math.min(0.98, tpScore), evidence: twoPointerEvidence });

  // 2. Binary Search
  const bsEvidence: string[] = [];
  let bsScore = 0;
  if (/mid\s*=\s*.*(?:\/|>>)\s*2/i.test(code) || /Math\.floor\s*\(\s*\([^)]+\)\s*\/\s*2\s*\)/.test(code)) {
    bsScore += 0.5;
    bsEvidence.push('Midpoint search interval subdivision calculation detected');
  }
  if (/while\s*\(\s*(left|lo|low)\s*<=\s*(right|hi|high)/i.test(code)) {
    bsScore += 0.35;
    bsEvidence.push('Inclusive search space convergence condition detected');
  }
  if (/(mid\s*\+\s*1|mid\s*-\s*1)/i.test(code)) {
    bsScore += 0.25;
    bsEvidence.push('Subproblem search space halving detected');
  }
  if (bsScore > 0) scores.push({ name: 'Binary Search', score: Math.min(0.98, bsScore), evidence: bsEvidence });

  // 3. Sliding Window
  const swEvidence: string[] = [];
  let swScore = 0;
  if (/window|window_start|window_end|k\s*\*\s*threshold/i.test(code)) {
    swScore += 0.35;
    swEvidence.push('Window tracking / aggregation variable naming detected');
  }
  if (/for\s*\(.*{[\s\S]*while\s*\(.*(shrink|count|left)/i.test(code) || /(sum\s*\+=.*sum\s*-=)/i.test(code)) {
    swScore += 0.45;
    swEvidence.push('Incremental window expansion and contraction logic detected');
  }
  if (swScore > 0) scores.push({ name: 'Sliding Window', score: Math.min(0.95, swScore), evidence: swEvidence });

  // 4. Hash Map / Frequency Table
  const mapEvidence: string[] = [];
  let mapScore = 0;
  if (/new\s+Map\(|new\s+Set\(|\bMap<|\bSet</.test(code)) {
    mapScore += 0.4;
    mapEvidence.push('Hash container (Map/Set) initialization detected');
  }
  if (/\.has\(|\.get\(|\.set\(|\.add\(/.test(code)) {
    mapScore += 0.4;
    mapEvidence.push('O(1) dictionary key lookup / mutation methods used');
  }
  if (mapScore > 0) scores.push({ name: 'Hash Map', score: Math.min(0.96, mapScore), evidence: mapEvidence });

  // 5. Prefix Sum
  const psEvidence: string[] = [];
  let psScore = 0;
  if (/prefix|presum|cumsum|running_sum|sum\[i\]\s*=/i.test(code)) {
    psScore += 0.5;
    psEvidence.push('Prefix accumulator state tracking detected');
  }
  if (/sum\s*\+=\s*nums\[i\]/i.test(code) && !/while/.test(code)) {
    psScore += 0.3;
    psEvidence.push('Cumulative array sum recurrence detected');
  }
  if (psScore > 0) scores.push({ name: 'Prefix Sum', score: Math.min(0.92, psScore), evidence: psEvidence });

  // 6. Stack / Monotonic Stack
  const stackEvidence: string[] = [];
  let stackScore = 0;
  if (/stack\s*=\s*\[|stack\.push\(|stack\.pop\(\)/i.test(code)) {
    stackScore += 0.5;
    stackEvidence.push('LIFO Stack container operations (push/pop) detected');
  }
  if (/while\s*\(\s*stack\.length.*stack\[stack\.length\s*-\s*1\]/i.test(code)) {
    stackScore += 0.4;
    stackEvidence.push('Monotonic stack ordering maintenance loop detected');
  }
  if (stackScore > 0) scores.push({ name: 'Stack', score: Math.min(0.96, stackScore), evidence: stackEvidence });

  // 7. Dynamic Programming
  const dpEvidence: string[] = [];
  let dpScore = 0;
  if (/dp\s*=\s*\[|dp\s*=\s*new\s+Array|dp\[i\]/i.test(code)) {
    dpScore += 0.5;
    dpEvidence.push('DP memoization table array allocation & state access detected');
  }
  if (/dp\[i\]\s*=\s*Math\.(max|min)\(dp\[i\s*-\s*1\]/i.test(code) || /memo\[/i.test(code)) {
    dpScore += 0.45;
    dpEvidence.push('Optimal substructure transition recurrence relation detected');
  }
  if (dpScore > 0) scores.push({ name: 'Dynamic Programming', score: Math.min(0.95, dpScore), evidence: dpEvidence });

  // 8. Sorting
  const sortEvidence: string[] = [];
  let sortScore = 0;
  if (/\.sort\(|sorted\(|Arrays\.sort/.test(code)) {
    sortScore += 0.6;
    sortEvidence.push('Explicit collection sorting invocation detected');
  }
  if (sortScore > 0) scores.push({ name: 'Sorting', score: Math.min(0.95, sortScore), evidence: sortEvidence });

  // 9. BFS / DFS Graph Traversal
  const graphEvidence: string[] = [];
  let graphScore = 0;
  if (/queue\s*=\s*\[|queue\.shift\(|queue\.push\(/i.test(code)) {
    graphScore += 0.5;
    graphEvidence.push('FIFO Queue operations matching Breadth-First Search (BFS) detected');
    scores.push({ name: 'BFS', score: Math.min(0.92, graphScore), evidence: graphEvidence });
  } else if (/function\s+dfs|const\s+dfs|function\s+traverse/i.test(code)) {
    graphScore += 0.5;
    graphEvidence.push('Recursive traversal routine matching Depth-First Search (DFS) detected');
    scores.push({ name: 'DFS', score: Math.min(0.92, graphScore), evidence: graphEvidence });
  }

  // 10. Default Fallback: Array Traversal / Brute Force
  if (scores.length === 0) {
    if (/for\s*\(.*{[\s\S]*for\s*\(/.test(code)) {
      return {
        name: 'Brute Force',
        confidence: 0.85,
        evidence: ['Nested loop iteration across input collection detected'],
      };
    }
    return {
      name: 'Array Traversal',
      confidence: 0.75,
      evidence: ['Standard linear collection iteration detected'],
    };
  }

  // Pick highest scoring approach
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  return {
    name: best.name,
    confidence: best.score,
    evidence: best.evidence,
  };
}
