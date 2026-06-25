// Submission types
export type SubmissionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Runtime Error'
  | 'Compilation Error';

export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface SubmissionEvent {
  eventId: string;
  sessionId: string;
  timestamp: Date;
  problemSlug: string;
  problemTitle: string;
  problemDifficulty: ProblemDifficulty;
  problemTopics: string[];
  problemUrl: string;
  submissionStatus: SubmissionStatus;
  submissionLanguage: string;
  submissionCode: string;
  runtime?: number;
  memory?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  failedTestCase?: string;
  timeSpent: number;
  attemptNumber: number;
  rapidSubmission: boolean;
}

// Analysis types
export interface CodeSignal {
  type: 'boundary_change' | 'algorithm_rewrite' | 'data_structure_change' | 'optimization';
  diff: string;
  confidence: number;
}

export interface BehavioralSignal {
  type: 'rapid_resubmission' | 'long_gap' | 'many_minor_changes';
  interval?: number;
  confidence: number;
}

export interface Evidence {
  evidenceId: string;
  type: 'code_diff' | 'behavioral' | 'test_failure';
  description: string;
  confidence: number;
  source: string;
  rawData: Record<string, unknown>;
  extractedAt: Date;
}

// Root cause types
export type RootCauseType =
  | 'boundary-condition-error'
  | 'algorithm-selection-mistake'
  | 'pattern-recognition-gap'
  | 'time-complexity-oversight'
  | 'space-complexity-oversight'
  | 'data-structure-mismatch'
  | 'implementation-detail-error'
  | 'input-output-handling-error';

export interface RootCauseHypothesis {
  rootCause: RootCauseType;
  name: string;
  confidence: number;
  evidence: string[];
  alternativeHypotheses?: Array<{
    rootCause: RootCauseType;
    confidence: number;
  }>;
}

// Weakness types
export type WeaknessType =
  | 'edge-case-reasoning'
  | 'algorithmic-pattern-recognition'
  | 'performance-analysis'
  | 'implementation-precision';

export interface SystemicWeakness {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  frequency: number;
  lastOccurrence: Date;
  riskIndex: number;
  pageRankScore: number;
}

// Graph types
export type NodeType =
  | 'Problem'
  | 'FailureEvent'
  | 'Evidence'
  | 'RootCause'
  | 'Weakness'
  | 'LearningStrategy';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties?: Record<string, unknown>;
}

export interface GraphFilters {
  topics: string[];
  rootCauseTypes: RootCauseType[];
  dateRange: { start: Date; end: Date };
  confidenceThreshold: number;
}

// Diagnosis types
export interface DiagnosisResult {
  diagnosisId: string;
  generatedAt: Date;
  primaryWeakness: SystemicWeakness;
  secondaryWeaknesses: SystemicWeakness[];
  learningRecommendations: LearningRecommendation[];
  progressMetrics: Record<string, unknown>;
}

export interface LearningRecommendation {
  strategyId: string;
  name: string;
  description: string;
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
  practiceProblems?: PracticeProblem[];
}

export interface PracticeProblem {
  problemSlug: string;
  problemTitle: string;
  difficulty: ProblemDifficulty;
  topicsTested: string[];
}

// Auth types
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface AuthToken {
  token: string;
  expiresIn: number;
  user: User;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ... existing types ...

// Sidebar Navigation Types
export interface SidebarNavItem {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  label: string;
  badge?: number;
}

export interface SidebarState {
  isOpen: boolean;
  activeItemPath: string | null;
}

// ─── Behavior + Success Intelligence Types ────────────────────────────────────

export type ImpactLevel = 'High' | 'Medium' | 'Low';
export type SuccessLevel = 1 | 2 | 3 | 4;

export interface HistoricalFailure {
  problemTitle: string;
  problemSlug: string;
  status: string;
  rootCauseType: string;
  rootCauseName: string;
  timestamp: string;
}

export interface LearningStep {
  step: number;
  action: string;
  targetEdgeCase?: string;
}

export interface BehaviorInsight {
  weaknessId: string;
  weaknessName: string;
  confidence: number;            // 0-1, from weighted Bayesian score
  evidence: string[];            // what triggered this classification
  behavioralPatterns: string[];  // observed patterns in plain language
  historicalFailures: HistoricalFailure[];
  recentFailureRate: number;     // 0-1, from last 50/90d window
  historicalFailureRate: number; // 0-1, all-time
  weightedScore: number;         // 0.7*recent + 0.3*historical
  rootBehaviorCause: string;     // concise behavioral diagnosis
  learningPrescription: LearningStep[];
  estimatedImpact: ImpactLevel;  // High/Medium/Low — never a percentage
}

export interface AdversarialTestCase {
  input: string;
  expectedOutput: string;
  purpose: string;
  failureMode: string;
  whyPassed?: string;
  confidence: number;
  riskScore: number;
  noveltyScore?: number;
  coverageScore?: number;
  
  // Tab-specific details
  buggyVersion?: string;
  buggyOutput?: string;
  reason?: string;
  failureProbability?: number;
  impactScore?: 'High' | 'Medium' | 'Low';
  bugSeverity?: 'Critical' | 'High' | 'Medium' | 'Low';
  constraint?: string;
  checks?: string;
  result?: 'PASSED' | 'FAILED' | 'WARNING';
}

export interface ConstraintMetrics {
  cpuImpact: string;
  memoryImpact: string;
  complexitySafety: string;
}

export interface CoverageIntelligence {
  hiddenTestsSurvived: number;
  potentialFailureModesAvoided: number;
  constraintCoverage: number;
  robustnessScore: number;
  confidenceScore: number;
}

export interface AdversarialTestLab {
  hiddenTests: AdversarialTestCase[];
  breakMySolution: AdversarialTestCase[];
  constraintExtremes: {
    tests: AdversarialTestCase[];
    metrics: ConstraintMetrics;
  };
  aiGeneratedCases: AdversarialTestCase[];
  coverageIntelligence: CoverageIntelligence;
}

export interface OptimizationItem {
  current: string;
  alternative: string;
  benefit: string;
  estimatedImpact: ImpactLevel;
}

export interface PatternIntelligence {
  pattern: string;
  patternSlug: string;
  relatedPatterns: string[];
  masteryCount: number;      // problems solved with this pattern
  masteryTarget: number;
  nextRecommendation: string;
}

export interface FutureRisk {
  risk: string;
  reason: string;
  severity: ImpactLevel;
}

export interface CodeQuality {
  strengths: string[];
  improvements: string[];
  overallScore: number;  // 0-1 heuristic score
}

export interface MLFeatures {
  pattern_detected: string;
  time_complexity: string;
  space_complexity: string;
  edge_case_score: number;
  code_quality_score: number;
  optimization_score: number;
  success_level: number;
}

export interface ConstraintIntelligence {
  problemConstraints: string[];
  maxInputSize: number;
  inputSizeVariable: string;
  complexityBudget: {
    complexity: string;
    operations: number;
    reasoning: string;
  }[];
  solutionAnalysis: {
    detectedComplexity: string;
    estimatedOperations: number;
    safetyMargin: number;
    verdict: 'Safe' | 'Borderline' | 'Dangerous';
  };
  variantSimulator: {
    inputSize: number;
    status: '✅' | '⚠' | '❌';
  }[];
  patternRecommendations: {
    pattern: string;
    confidence: number;
    reason: string;
  }[];
  learningOpportunity: {
    currentComplexity: string;
    optimalComplexity: string;
    improvement: string;
    technique: string;
  };
}

export interface SuccessInsight {
  successLevel: SuccessLevel;            // L1-L4
  successLevelLabel: string;             // 'Accepted' | 'Accepted + Optimal' | 'Pattern Mastery' | 'Transferable Skill'
  patternDetected: string;
  patternSlug: string;
  patternConfidence: number;             // 0-1, from detection heuristic
  timeComplexity: string;
  spaceComplexity: string;
  complexityConfidence: number;          // 0-1
  algorithmicInsight: string;            // Groq-generated explanation (or rule-based fallback)
  reasonForSuccess: string;              // Groq-generated explanation
  strength: string;
  adversarialTestLab: AdversarialTestLab;
  optimizationReview: OptimizationItem[];
  patternIntelligence: PatternIntelligence;
  futureRisks: FutureRisk[];
  codeQuality: CodeQuality;
  mlFeatures: MLFeatures;                // stored in progressMetrics for training data
  constraintIntelligence?: ConstraintIntelligence;
}

// ─── Failure Replay Intelligence ──────────────────────────────────────────────

export interface ExecutionStep {
  step: number;
  description: string;          // human-readable explanation of what happened
  codeSnippet?: string;         // relevant line(s) of code
  variableState?: Record<string, string>; // variable name → value at this step
  significance: 'normal' | 'critical' | 'bug'; // highlight bug-triggering steps
}

export interface ReplayRootCause {
  type: string;                 // e.g. 'boundary-condition-error'
  label: string;                // human-readable, e.g. 'Off-by-one in loop bound'
  confidence: number;           // 0–100
  evidenceSummary: string;      // one sentence of proof
}

export interface ReplayAIExplanation {
  whyItFails: string;           // Groq explanation of why this input breaks the code
  fixSuggestion: string;        // actionable fix recommendation
  keyInsight: string;           // one-liner core insight
}

export interface CounterExample {
  input: string;                // e.g. "[1]" or "nums=[1], target=0"
  inputLabel: string;           // e.g. "nums" or "s"
  expected: string;             // expected output
  actual: string;               // user's output
  errorType?: string;           // 'wrong_answer' | 'runtime_error' | 'timeout'
  candidatesTestedCount: number; // how many inputs were tried before finding this
  executionTrace: ExecutionStep[];
  rootCause: ReplayRootCause;
  aiExplanation: ReplayAIExplanation;
}

export interface FailureReplay {
  submissionId: string;
  problemTitle: string;
  problemSlug: string;
  verdict: string;
  language: string;
  seed: number;                 // random seed used (for "generate another")
  counterExample: CounterExample | null;
  noFailureFound: boolean;      // true if 5000 candidates all passed (surprising!)
  generatedAt: string;          // ISO timestamp
}