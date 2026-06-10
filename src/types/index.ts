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
  name: string;
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