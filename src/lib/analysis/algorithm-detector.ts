import type {
  AlgorithmDetectionResult,
  AlgorithmPattern,
  EvidenceItem,
  NormalizedCodeFacts,
} from '@/lib/adversarial/types';

export function detectAlgorithmApproach(
  code: string,
  facts: NormalizedCodeFacts,
  problemTopics: string[] = []
): AlgorithmDetectionResult {
  const lowerCode = code.toLowerCase();
  const evidences: EvidenceItem[] = [];
  const signals: string[] = [];

  // Helper to push evidence
  const addEvidence = (desc: string, snippet?: string, conf: number = 0.9) => {
    evidences.push({
      source: 'static_analysis',
      description: desc,
      codeLocation: snippet ? { snippet } : undefined,
      confidence: conf,
    });
    signals.push(desc);
  };

  // 1. Sliding Window Detection
  const hasWindowPointers = facts.variables.some(v => ['left', 'right', 'windowstart', 'windowend', 'l', 'r'].includes(v.name.toLowerCase()));
  const hasWindowSum = facts.variables.some(v => ['windowsum', 'currsum', 'cur_sum', 'curr_sum', 'sum', 'running_sum'].includes(v.name.toLowerCase()));
  const hasSlideSubtract = facts.stateMutations.some(m => m.operation.includes('-') && (m.operation.includes('left') || m.operation.includes('i - k') || m.operation.includes('i-k')));
  const hasExpandShrink = (facts.loops.some(l => l.type === 'while' || l.type === 'for') && hasSlideSubtract) || (hasWindowPointers && hasSlideSubtract);

  if (hasWindowPointers && (hasSlideSubtract || hasWindowSum || hasExpandShrink)) {
    addEvidence('Maintains distinct window boundary pointers (e.g. left, right, i - k)', facts.rawSnippets.loop);
    if (hasSlideSubtract) addEvidence('Updates running state incrementally by subtracting the outgoing element', facts.rawSnippets.update);
    if (hasWindowSum) addEvidence('Preserves running window accumulator rather than recomputing each range', facts.rawSnippets.init);
    return {
      algorithm: 'Sliding Window',
      patternSlug: 'sliding_window',
      confidence: hasSlideSubtract ? 0.96 : 0.88,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 2. Binary Search Detection
  const hasLowHighMid = facts.variables.some(v => ['low', 'high', 'mid', 'left', 'right'].includes(v.name.toLowerCase()));
  const hasMidCalc = /mid\s*=\s*(?:Math\.floor\(|\()?\s*(?:low|left|l)\s*\+\s*(?:high|right|r|h)\s*(?:-|>>|\/)/i.test(code) || /mid\s*=\s*\(?(?:low|left)\s*\+\s*(?:high|right)\)?\s*(?:\/\/|\/|>>)\s*2/i.test(code);
  const hasSearchBounds = facts.stateMutations.some(m => /low\s*=\s*mid\s*\+\s*1|high\s*=\s*mid\s*-\s*1|left\s*=\s*mid\s*\+\s*1|right\s*=\s*mid\s*-\s*1/i.test(m.operation)) || /low\s*=\s*mid|high\s*=\s*mid/i.test(code);

  if (hasMidCalc || (hasLowHighMid && hasSearchBounds)) {
    addEvidence('Calculates midpoint division to eliminate half of remaining candidates each step', undefined, 0.95);
    addEvidence('Updates search space boundaries (e.g. low = mid + 1, high = mid - 1)', facts.rawSnippets.update, 0.92);
    return {
      algorithm: 'Binary Search',
      patternSlug: 'binary_search',
      confidence: 0.97,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 3. Two Pointer (Converging / Opposing direction)
  const hasTwoPointers = (facts.variables.filter(v => v.isPointer).length >= 2 || /left|right|ptr1|ptr2|low|high|i\s*<\s*j/i.test(code));
  const hasConvergingUpdate = (code.includes('left++') || code.includes('l++') || code.includes('left += 1')) && (code.includes('right--') || code.includes('r--') || code.includes('right -= 1'));

  if (hasTwoPointers && hasConvergingUpdate) {
    addEvidence('Maintains two converging pointers starting at opposite boundaries', facts.rawSnippets.init, 0.94);
    addEvidence('Steps left and right pointers towards each other based on comparison conditions', facts.rawSnippets.update, 0.92);
    return {
      algorithm: 'Two Pointer',
      patternSlug: 'two_pointer',
      confidence: 0.95,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 4. Dynamic Programming (Table or Memoization)
  const hasDpTable = facts.dataStructures.some(ds => ds.name.toLowerCase().includes('dp')) || /dp\s*\[\s*[a-zA-Z0-9_$]+\s*\]/i.test(code) || /memo\s*\[|@lru_cache|@cache/.test(code);
  const hasTransition = /dp\[i\]\s*=\s*|dp\[i\]\[j\]\s*=|memo\[key\]\s*=/i.test(code) || /Math\.(?:max|min)\(dp\[/i.test(code) || /max\(dp\[|min\(dp\[/i.test(code);

  if (hasDpTable && (hasTransition || facts.loops.length >= 1)) {
    addEvidence('Decomposes problem into overlapping subproblems using memoization table', facts.rawSnippets.init, 0.93);
    addEvidence('Computes optimal substructure transitions iteratively or with cached recursion', facts.rawSnippets.update, 0.91);
    return {
      algorithm: 'Dynamic Programming',
      patternSlug: 'dynamic_programming',
      confidence: 0.94,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 5. BFS (Queue level traversal)
  const hasQueue = facts.dataStructures.some(ds => ds.type === 'queue') || /queue\s*=\s*\[|deque\(|q\.pop\(0\)|q\.popleft\(\)|queue\.shift\(\)/i.test(code);
  if (hasQueue && facts.loops.length >= 1) {
    addEvidence('Uses FIFO queue data structure for breadth-first level order traversal', facts.rawSnippets.loop, 0.93);
    addEvidence('Explores immediate neighbors before deeper layers to guarantee shortest path/layer discovery', undefined, 0.90);
    return {
      algorithm: 'BFS',
      patternSlug: 'graph_bfs',
      confidence: 0.94,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 6. DFS / Backtracking / Recursion
  const hasRecursion = facts.functions.some(f => f.isRecursive);
  const hasBacktrackState = /visited\.add|visited\.remove|\.pop\(\)|swap\(|visited\[/i.test(code);

  if (hasRecursion) {
    if (hasBacktrackState) {
      addEvidence('Recursively explores decision tree states with explicit state reversion/backtracking', undefined, 0.92);
      return {
        algorithm: 'Backtracking',
        patternSlug: 'backtracking',
        confidence: 0.93,
        evidence: evidences,
        supportingSignals: signals,
      };
    }
    addEvidence('Explores paths deeply to base cases using recursive call stack', facts.rawSnippets.eval, 0.91);
    return {
      algorithm: 'DFS',
      patternSlug: 'graph_dfs',
      confidence: 0.92,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 7. Prefix Sum
  const hasPrefixArray = /prefix|pref|accsum|accumulate/i.test(code) || (hasWindowSum && /prefix\[i\]\s*=\s*prefix\[i\s*-\s*1\]/i.test(code));
  if (hasPrefixArray) {
    addEvidence('Precomputes cumulative running values into prefix array for O(1) subarray query resolution', facts.rawSnippets.update, 0.94);
    return {
      algorithm: 'Prefix Sum',
      patternSlug: 'prefix_sum',
      confidence: 0.93,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 8. Hashing (Hash Map / Frequency Counting)
  const hasHashMap = facts.dataStructures.some(ds => ds.type === 'map' || ds.type === 'set') || /frequency|freq|count_map|seen/i.test(code);
  if (hasHashMap && facts.loops.length >= 1) {
    addEvidence('Employs hash table lookup to achieve constant-time key/frequency checking', facts.rawSnippets.update, 0.91);
    return {
      algorithm: 'Hashing',
      patternSlug: 'hash_map',
      confidence: 0.90,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 9. Union Find / Disjoint Set
  if (/find\s*\(|union\s*\(|parent\[|rank\[/i.test(code)) {
    addEvidence('Maintains disjoint-set forest with parent/rank pointers for connected component queries', undefined, 0.96);
    return {
      algorithm: 'Union Find',
      patternSlug: 'union_find',
      confidence: 0.96,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 10. Greedy Approach
  const hasSorting = lowerCode.includes('.sort') || lowerCode.includes('sorted(') || lowerCode.includes('sort(');
  if (hasSorting && facts.loops.length === 1 && !hasDpTable) {
    addEvidence('Orders inputs and executes locally optimal choices across single linear traversal', facts.rawSnippets.loop, 0.85);
    return {
      algorithm: 'Greedy',
      patternSlug: 'greedy',
      confidence: 0.86,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 11. Simulation / Custom
  if (facts.loops.length >= 1) {
    addEvidence('Directly executes deterministic step-by-step state simulation across input elements', facts.rawSnippets.loop, 0.80);
    return {
      algorithm: 'Simulation',
      patternSlug: 'simulation',
      confidence: 0.82,
      evidence: evidences,
      supportingSignals: signals,
    };
  }

  // 12. Fallback
  addEvidence('Custom implementation structure with procedural logic', undefined, 0.70);
  return {
    algorithm: 'Custom / Unknown',
    patternSlug: 'custom',
    confidence: 0.70,
    evidence: evidences,
    supportingSignals: signals,
  };
}
