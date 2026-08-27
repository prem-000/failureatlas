import type {
  ComplexityAnalysisResult,
  ComplexityExpectation,
  EvidenceItem,
  NormalizedCodeFacts,
} from '@/lib/adversarial/types';

export function analyzeComplexity(
  code: string,
  facts: NormalizedCodeFacts,
  patternSlug: string,
  constraints: string[] = [],
  difficulty: string = 'Medium'
): ComplexityAnalysisResult {
  const evidences: EvidenceItem[] = [];
  const lowerCode = code.toLowerCase();

  // Helper to record evidence
  const addEvidence = (desc: string, snippet?: string, conf: number = 0.9) => {
    evidences.push({
      source: 'static_analysis',
      description: desc,
      codeLocation: snippet ? { snippet } : undefined,
      confidence: conf,
    });
  };

  // 1. Loop nesting depth & recursive depth
  const maxNesting = facts.loops.reduce((max, l) => Math.max(max, l.depth), 0);
  const recursiveFns = facts.functions.filter(f => f.isRecursive);
  const hasSorting = lowerCode.includes('.sort') || lowerCode.includes('sorted(') || lowerCode.includes('sort(');
  const hasNestedTraversal = maxNesting >= 2;
  const hasThreeLoops = maxNesting >= 3;

  // 2. Derive Detected Time Complexity
  let detectedTime = 'O(n)';
  if (recursiveFns.length > 0) {
    if (patternSlug === 'backtracking') {
      detectedTime = 'O(2^n)';
      addEvidence('Recursive branch exploration exhibits exponential branching factor', undefined, 0.88);
    } else if (patternSlug === 'graph_dfs' || patternSlug === 'graph_bfs') {
      detectedTime = 'O(V + E)';
      addEvidence('Graph traversal visits vertices and edges proportionally once', undefined, 0.92);
    } else {
      detectedTime = 'O(n)';
      addEvidence('Linear recursive call chain across input structure', undefined, 0.85);
    }
  } else if (hasThreeLoops) {
    detectedTime = 'O(n³)';
    addEvidence(`Nested loop depth of ${maxNesting} detected in traversal flow`, facts.rawSnippets.loop, 0.95);
  } else if (hasNestedTraversal) {
    detectedTime = 'O(n²)';
    addEvidence(`Inner loop executes within outer iteration yielding quadratic operations`, facts.rawSnippets.loop, 0.95);
  } else if (hasSorting) {
    detectedTime = 'O(n log n)';
    addEvidence('Comparison-based array sort requires O(n log n) comparisons', undefined, 0.94);
  } else if (patternSlug === 'binary_search') {
    detectedTime = 'O(log n)';
    addEvidence('Search interval halved on each iteration step', facts.rawSnippets.loop, 0.96);
  } else if (facts.loops.length === 1) {
    detectedTime = 'O(n)';
    addEvidence('Single linear pass over the input collection', facts.rawSnippets.loop, 0.94);
  } else if (facts.loops.length === 0) {
    detectedTime = 'O(1)';
    addEvidence('Direct arithmetic / branch execution with no iteration loops', undefined, 0.90);
  }

  // 3. Derive Detected Space Complexity
  let detectedSpace = 'O(1)';
  const dataStructuresUsed: string[] = [];

  const hasDp = facts.dataStructures.some(ds => ds.name.includes('dp')) || /dp\s*\[/.test(code);
  const hasMapOrSet = facts.dataStructures.some(ds => ds.type === 'map' || ds.type === 'set');
  const hasQueue = facts.dataStructures.some(ds => ds.type === 'queue');

  if (hasDp) {
    if (/dp\[i\]\[j\]|vector<vector/.test(code)) {
      detectedSpace = 'O(n²)';
      dataStructuresUsed.push('2D DP Table');
      addEvidence('Allocates 2D matrix storing subproblem state', facts.rawSnippets.init, 0.92);
    } else {
      detectedSpace = 'O(n)';
      dataStructuresUsed.push('1D DP Array');
      addEvidence('Allocates linear DP table for memoization', facts.rawSnippets.init, 0.92);
    }
  } else if (hasMapOrSet || hasQueue) {
    detectedSpace = 'O(n)';
    if (hasMapOrSet) dataStructuresUsed.push('Hash Map / Set');
    if (hasQueue) dataStructuresUsed.push('BFS Queue');
    addEvidence('Auxiliary data structures scale with input cardinality', facts.rawSnippets.init, 0.90);
  } else if (recursiveFns.length > 0) {
    detectedSpace = 'O(n)';
    dataStructuresUsed.push('Call Stack');
    addEvidence('Recursive call stack requires O(n) auxiliary frame space', undefined, 0.88);
  } else {
    detectedSpace = 'O(1)';
    addEvidence('Constant auxiliary memory maintained using pointer variables', facts.rawSnippets.init, 0.95);
  }

  // 4. Determine Complexity Expectation Range based on problem context
  const expectation = computeComplexityExpectation(constraints, difficulty, patternSlug);

  const isOptimal = expectation.optimalTime ? detectedTime === expectation.optimalTime : expectation.acceptableTime.includes(detectedTime);

  return {
    detectedTime,
    detectedSpace,
    expectation,
    loopNestingDepth: maxNesting,
    recursiveDepth: recursiveFns.length,
    dataStructuresUsed,
    isOptimal,
    confidence: 0.93,
    evidence: evidences,
  };
}

function computeComplexityExpectation(
  constraints: string[] = [],
  difficulty: string = 'Medium',
  patternSlug: string
): ComplexityExpectation {
  const constraintText = constraints.join(' ');
  const expectationEvidences: EvidenceItem[] = [];

  // Parse max input size N from constraints if available
  let maxN = 100000;
  if (/10\^5|100000|100,000/i.test(constraintText)) {
    maxN = 100000;
  } else if (/10\^6|1000000|1,000,000/i.test(constraintText)) {
    maxN = 1000000;
  } else if (/10\^4|10000|10,000/i.test(constraintText)) {
    maxN = 10000;
  } else if (/10\^3|1000|2000|5000/i.test(constraintText)) {
    maxN = 1000;
  } else if (/10\^9|1000000000/i.test(constraintText)) {
    maxN = 1000000000;
  } else if (/n\s*<=\s*20|n\s*<=\s*15|n\s*<=\s*12/i.test(constraintText)) {
    maxN = 20;
  }

  let acceptableTime = ['O(n)', 'O(n log n)'];
  let preferredTime = 'O(n)';
  let optimalTime = 'O(n)';
  let acceptableSpace = ['O(1)', 'O(n)'];
  let optimalSpace = 'O(1)';

  if (maxN >= 100000000) {
    // N = 10^8 or 10^9 => O(log n) or O(sqrt(n)) or O(1)
    acceptableTime = ['O(log n)', 'O(1)'];
    preferredTime = 'O(log n)';
    optimalTime = 'O(log n)';
    expectationEvidences.push({
      source: 'constraint',
      description: `Constraint scale N ≈ 10^9 permits O(log n) or O(1) algorithms within 1.0s runtime budget`,
      confidence: 0.95,
    });
  } else if (maxN >= 50000) {
    // N = 10^5 => O(n) or O(n log n)
    acceptableTime = ['O(n)', 'O(n log n)'];
    preferredTime = patternSlug === 'binary_search' ? 'O(log n)' : (patternSlug === 'sliding_window' || patternSlug === 'two_pointer' ? 'O(n)' : 'O(n log n)');
    optimalTime = preferredTime;
    expectationEvidences.push({
      source: 'constraint',
      description: `Constraint scale N ≈ 10^5 mandates O(n) or O(n log n) to safely pass standard CP judge time limits (10^7-10^8 operations)`,
      confidence: 0.94,
    });
  } else if (maxN <= 20) {
    // N <= 20 => O(2^n) or O(n!)
    acceptableTime = ['O(2^n)', 'O(n!)', 'O(n^2)'];
    preferredTime = 'O(2^n)';
    optimalTime = 'O(2^n)';
    expectationEvidences.push({
      source: 'constraint',
      description: `Small constraint bounds (N ≤ 20) support exponential backtracking or bitmask states`,
      confidence: 0.92,
    });
  } else if (maxN <= 1000) {
    // N <= 1000 => O(n^2) or O(n)
    acceptableTime = ['O(n)', 'O(n log n)', 'O(n²)'];
    preferredTime = 'O(n²)';
    optimalTime = 'O(n)';
    expectationEvidences.push({
      source: 'constraint',
      description: `Constraint scale N ≤ 1000 tolerates O(n²) operations but optimal approaches achieve linear or linearithmic time`,
      confidence: 0.90,
    });
  }

  return {
    acceptableTime,
    preferredTime,
    optimalTime,
    acceptableSpace,
    optimalSpace,
    confidence: 0.92,
    evidence: expectationEvidences,
  };
}
