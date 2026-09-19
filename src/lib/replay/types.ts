/**
 * src/lib/replay/types.ts
 *
 * Unified types for Failure Replay: strictly user-scoped,
 * evidence-grounded interactive debugging workspace.
 */

export type FailureVerdict =
  | 'Wrong Answer'
  | 'Runtime Error'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Compilation Error';

export type TestCategory =
  | 'Normal'
  | 'Boundary'
  | 'Constraint Boundary'
  | 'Degenerate'
  | 'Adversarial'
  | 'Structural';

export interface FirstFailurePoint {
  line?: number;
  variable?: string;
  value?: string | number | boolean;
  description?: string;
}

export interface RelevantCodeLocation {
  line?: number;
  snippet?: string;
  variable?: string;
}

export interface FailureEvidence {
  input: string;
  expected: string;
  actual: string;
  error?: string;
  firstFailurePoint?: FirstFailurePoint;
  relevantCodeLocation?: RelevantCodeLocation;
  rootCauseSummary?: string;
}

export interface TargetedTestCase {
  id: string;
  level: number; // 1 to 5
  category: TestCategory;
  input: string;
  expected: string;
  userOutput?: string;
  whyThisCaseExists: string;
  status: 'passed' | 'failed' | 'locked' | 'untested';
  verified: boolean;
  mismatchCorrected?: boolean;
}

export interface ReasoningQuestion {
  id: string;
  prompt: string;
  format: 'predict' | 'trace' | 'condition' | 'explain' | 'identify';
  expectedConcept: string;
  options?: string[]; // for interactive multiple-choice checkpoints
  correctOptionIndex?: number;
}

export interface ConditionBranch {
  label: string; // e.g. "YES" | "NO"
  action: string; // concise description of the invariant/transition
  nextNodeId?: string;
}

export interface ConditionNode {
  id: string;
  order: number;
  conditionText: string;
  branches: {
    yes: ConditionBranch;
    no: ConditionBranch;
  };
  checkpointQuestion?: ReasoningQuestion;
  status: 'locked' | 'unlocked' | 'completed';
  userAnswer?: string;
  evaluationResult?: 'pass' | 'partial' | 'fail';
  feedback?: string;
}

export interface ProgressiveHint {
  level: number; // 1 to 5
  tierName: 'Observation' | 'Condition' | 'Relevant Code Location' | 'Structural Guidance' | 'Strong Guidance';
  title: string;
  text: string;
  unlocked: boolean;
}

export interface ReplayProblemInfo {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  topics: string[];
  statement: string;
  constraints: string[];
  inputFormat: string;
  outputFormat: string;
}

export interface ReplaySubmissionSnapshot {
  id: string;
  status: string;
  language: string;
  code: string;
  passedTests: number;
  totalTests: number;
  timestamp: string;
  attemptNumber: number;
  runtime?: number | null;
  memory?: number | null;
  isResolved?: boolean;
  resolvedAt?: string;
}

export interface ReplaySessionData {
  id: string;
  userId: string;
  submissionId: string;
  problemId: string;
  status: 'active' | 'resolved';
  currentLevel: number;
  hintLevel: number;
  analysisVersion: string;
  problem: ReplayProblemInfo;
  submission: ReplaySubmissionSnapshot;
  failureEvidence: FailureEvidence;
  targetedTests: TargetedTestCase[];
  conditionFlow: ConditionNode[];
  hints: ProgressiveHint[];
  traceData?: any;
  reasoningState?: Record<string, { answer: string; result: 'pass' | 'partial' | 'fail'; feedback: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface ReasoningEvaluationResult {
  result: 'pass' | 'partial' | 'fail';
  feedback: string;
  nextAction: 'advance_node' | 'show_hint' | 'retry_node';
  suggestedHintLevel?: number;
  unlockedNodeId?: string;
}
