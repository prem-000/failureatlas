/**
 * src/lib/adversarial/types.ts
 * Core data contracts for Evidence-Driven Competitive Programming Intelligence.
 */

// ─── Evidence Provenance Layer ────────────────────────────────────────────────

export type EvidenceSource =
  | 'problem_statement'
  | 'constraint'
  | 'source_code'
  | 'static_analysis'
  | 'execution'
  | 'oracle'
  | 'llm_inference';

export interface EvidenceItem {
  source: EvidenceSource;
  description: string;
  codeLocation?: {
    lineStart?: number;
    lineEnd?: number;
    snippet?: string;
  };
  confidence: number; // 0.0 to 1.0
}

// ─── Language-Aware Code Facts ────────────────────────────────────────────────

export interface NormalizedCodeFacts {
  language: string;
  functions: Array<{
    name: string;
    params: string[];
    isRecursive: boolean;
    lineStart?: number;
    lineEnd?: number;
  }>;
  loops: Array<{
    type: 'for' | 'while' | 'for-in' | 'for-of' | 'recursion';
    depth: number;
    bounds: string;
    variable?: string;
    hasEarlyExit?: boolean;
  }>;
  conditions: Array<{
    condition: string;
    isBoundaryCheck: boolean;
    operators: string[];
  }>;
  variables: Array<{
    name: string;
    isAccumulator: boolean;
    isPointer: boolean;
    initialValue?: string;
  }>;
  dataStructures: Array<{
    type: 'array' | 'map' | 'set' | 'heap' | 'queue' | 'stack' | 'custom';
    name: string;
    operations: string[];
  }>;
  stateMutations: Array<{
    target: string;
    operation: string;
    lineHint?: string;
  }>;
  boundaryChecks: string[];
  earlyReturns: Array<{
    condition: string;
    returnValue?: string;
  }>;
  rawSnippets: {
    init?: string;
    loop?: string;
    eval?: string;
    update?: string;
    ret?: string;
  };
}

export interface SourceAnalyzer {
  supports(language: string): boolean;
  analyze(source: string): NormalizedCodeFacts;
}

// ─── Algorithm & Complexity Detection ─────────────────────────────────────────

export type AlgorithmPattern =
  | 'Sliding Window'
  | 'Two Pointer'
  | 'Binary Search'
  | 'DFS'
  | 'BFS'
  | 'Dynamic Programming'
  | 'Greedy'
  | 'Prefix Sum'
  | 'Hashing'
  | 'Union Find'
  | 'Backtracking'
  | 'Graph Traversal'
  | 'Sorting + Search'
  | 'Simulation'
  | 'Custom / Unknown';

export interface AlgorithmDetectionResult {
  algorithm: AlgorithmPattern;
  patternSlug: string;
  confidence: number; // 0.0 to 1.0
  evidence: EvidenceItem[];
  supportingSignals: string[];
}

export interface ComplexityExpectation {
  acceptableTime: string[];   // e.g. ["O(n)", "O(n log n)"]
  preferredTime?: string;     // e.g. "O(n)"
  optimalTime?: string;       // e.g. "O(n)"
  optimalTechnique?: string;  // e.g. "Two Pointer Convergence"
  acceptableSpace: string[];  // e.g. ["O(1)", "O(n)"]
  optimalSpace?: string;      // e.g. "O(1)"
  confidence: number;
  evidence: EvidenceItem[];
}

export interface ComplexityAnalysisResult {
  detectedTime: string;
  detectedSpace: string;
  expectation: ComplexityExpectation;
  loopNestingDepth: number;
  recursiveDepth: number;
  dataStructuresUsed: string[];
  isOptimal: boolean;
  confidence: number;
  evidence: EvidenceItem[];
}

// ─── Invariants & Assumptions ─────────────────────────────────────────────────

export interface ExtractedInvariant {
  id: string;
  condition: string;
  type: 'window_size' | 'running_sum' | 'search_space' | 'visited_state' | 'monotonic' | 'termination' | 'state_balance';
  importance: number; // 0.0 to 1.0
  evidence: EvidenceItem[];
}

export interface ExtractedAssumption {
  id: string;
  assumption: string;
  constraintConflict: boolean;
  conflictEvidence?: EvidenceItem;
  riskSeverity: 'High' | 'Medium' | 'Low';
  evidence: EvidenceItem[];
}

// ─── Stress Targets & Ranking ─────────────────────────────────────────────────

export type StressTargetKind =
  | 'confirmed_failure'
  | 'root_cause_attack'
  | 'boundary'
  | 'invariant'
  | 'complexity'
  | 'semantic_regression';

export interface RiskSignals {
  constraintConflict: number;   // 0.0 - 1.0
  mutationSensitivity: number;  // 0.0 - 1.0
  invariantImportance: number;  // 0.0 - 1.0
  complexityPressure: number;   // 0.0 - 1.0
  evidenceStrength: number;     // 0.0 - 1.0
}

export interface StressTarget {
  id: string; // ST-01 .. ST-05
  kind: StressTargetKind;
  title: string;
  hypothesis: string;
  sourceEvidence: EvidenceItem[];
  constraintEvidence: EvidenceItem[];
  riskSignals: RiskSignals;
  confidence: number; // 0 - 100
  distinctnessKey: string;
  priority: number;
  whatItAttacks: string;
}

// ─── Mutation Analysis ────────────────────────────────────────────────────────

export interface MutationCandidate {
  id: string;
  family: 'comparison' | 'loop' | 'index' | 'state_update' | 'initialization' | 'scale';
  originalSnippet: string;
  mutatedSnippet: string;
  description: string;
  targetHypothesis: string;
  sensitivityScore: number;
  evidence: EvidenceItem[];
}


// ─── Break Solution ───────────────────────────────────────────────────────────

export interface SourceCodeBlock {
  step: number;
  title: string;
  code: string;
  startLine?: number;
  endLine?: number;
  explanation: string;
  variables?: Array<{
    name: string;
    role: string;
    change?: string;
  }>;
  controlFlow?: {
    type: 'branch' | 'loop' | 'return' | 'call' | 'mutation';
    description: string;
  };
  contribution: string;
}

export interface CodeWalkthroughStep {
  stepNumber: string; // "01", "02", "03", "04"
  stepTitle: string;  // Dynamic title derived from actual code
  explanation: string;
  codeSnippet?: string;
  variablesReferenced?: string[];
  variables?: Array<{
    name: string;
    role: string;
    change?: string;
  }>;
  controlFlow?: {
    type: 'branch' | 'loop' | 'return' | 'call' | 'mutation';
    description: string;
  };
  contribution?: string;
}

export interface ProgressiveHint {
  level: number; // 1 to 4
  title: string; // "Hint 1 — Observation", "Hint 2 — Key Insight", "Hint 3 — Strategy", "Hint 4 — Complexity Direction"
  hint: string;
}

export interface BreakSolutionData {
  approach: {
    detected: string;
    confidence: number;
    evidence: EvidenceItem[];
  };
  yourComplexity: {
    time: string;
    space: string;
  };
  expectedComplexity: {
    time: string;
    space: string;
    acceptableRange: string[];
    preferredTime?: string;
    optimalTechnique?: string;
  };
  codeWalkthrough: CodeWalkthroughStep[];
  sourceCodeBlocks: SourceCodeBlock[];
  weaknessOrRisk: {
    hasWeakness: boolean;
    potentialIssue?: string;
    evidence?: string;
    impact?: string;
    expectedDirection?: string;
    evidenceChain: EvidenceItem[];
  };
  optimalPath: {
    hints: ProgressiveHint[];
    targetComplexity: {
      time: string;
      space: string;
    };
  };
}

// ─── Problem-Aware Code Quality (5 Dimensions) ────────────────────────────────

export interface QualityDimensionScore {
  score: number;
  maxScore: number;
  evidence: EvidenceItem[];
  context?: string;
}

export interface EvidenceCodeQuality {
  overallScore: number; // 0 - 100
  dimensions: {
    correctnessAlignment: QualityDimensionScore; // max 35
    algorithmicEfficiency: QualityDimensionScore; // max 25
    robustness: QualityDimensionScore;            // max 20
    implementationClarity: QualityDimensionScore; // max 10
    problemPrecision: QualityDimensionScore;      // max 10
  };
  strengths: string[];
  improvements: string[];
}

// ─── Evidence Pack (Input for Groq Generation) ────────────────────────────────

export interface EvidencePack {
  problem: {
    id?: string;
    title: string;
    slug?: string;
    difficulty?: string;
    statement?: string;
    constraints: string[];
    topics?: string[];
    inputFormat?: string;
    outputFormat?: string;
  };
  submission: {
    language: string;
    sourceCode: string;
    normalizedFacts: NormalizedCodeFacts;
    detectedApproach: AlgorithmDetectionResult;
    complexity: ComplexityAnalysisResult;
    invariants: ExtractedInvariant[];
    assumptions: ExtractedAssumption[];
    mutations: MutationCandidate[];
  };
  stressTargets: StressTarget[];
  generationRequirements: {
    count: number;
    distinct: boolean;
    validConstraints: boolean;
    noGenericCases: boolean;
  };
}

// ─── Unified SSM Output ───────────────────────────────────────────────────────

export interface SolutionStressModelResult {
  algorithm: AlgorithmDetectionResult;
  complexity: ComplexityAnalysisResult;
  invariants: ExtractedInvariant[];
  assumptions: ExtractedAssumption[];
  mutations: MutationCandidate[];
  stressTargets: StressTarget[];
  breakSolution: BreakSolutionData;
  codeQuality: EvidenceCodeQuality;
  evidencePack: EvidencePack;
}
