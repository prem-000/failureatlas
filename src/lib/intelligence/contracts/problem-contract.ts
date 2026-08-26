/**
 * src/lib/intelligence/contracts/problem-contract.ts
 * Canonical Problem Contract Definition for Praxis Failure Intelligence.
 */

export interface ProblemParameter {
  name: string;
  type: string; // 'number[]' | 'number' | 'string' | 'string[]' | 'number[][]' | 'boolean'
}

export type ExecutionMode = 'return_value' | 'in_place' | 'stdout';

export interface ProblemConstraint {
  expression: string;
  variable: string;
  min?: number;
  max?: number;
}

export interface ProblemContract {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  functionName: string;
  parameters: ProblemParameter[];
  returnType: string;
  executionMode: ExecutionMode;
  inPlaceTargetParam?: string; // e.g. 'nums' for in_place mutation
  constraints: ProblemConstraint[];
  invariants: string[];
  oracleType: 'reference_solution' | 'property_based' | 'custom';
  topics?: string[];
}
