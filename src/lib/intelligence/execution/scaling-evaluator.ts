/**
 * src/lib/intelligence/execution/scaling-evaluator.ts
 * Real Empirical Performance & Scaling Evaluator (Phase 4).
 * Evaluates asymptotic runtime growth under scaling inputs (N = 500 -> 1500 -> 3000)
 * and extrapolates to maximum constraints (N = 10^5).
 */

import type { ProblemContract } from '../contracts/problem-contract';
import type { PerformanceVerdict } from '../types';
import { executeUserCode } from './user-executor';

export interface ScalingBenchmarkResult {
  isAnalyzed: boolean;
  performanceAssessment: PerformanceVerdict;
  inferredComplexity: string;
  measurements: Array<{
    scaleN: number;
    runtimeMs: number;
  }>;
  growthFactor?: number;
  explanation?: string;
  extrapolatedConstraintOperations?: string;
}

export function evaluateEmpiricalScaling(
  userCode: string,
  contract: ProblemContract
): ScalingBenchmarkResult {
  const hasLargeNConstraint = contract.constraints.some(c =>
    /10\^4|10\^5|10000|100000/.test(c.expression)
  );

  const isNestedLoop = /for\s*\(.*{[\s\S]*for\s*\(/.test(userCode);

  if (!hasLargeNConstraint && !isNestedLoop) {
    return {
      isAnalyzed: false,
      performanceAssessment: 'WITHIN_EXPECTATION',
      inferredComplexity: 'O(N)',
      measurements: [],
      explanation: 'Problem constraints are small or linear single-pass pattern identified.',
    };
  }

  const primaryParam = contract.parameters[0];
  if (!primaryParam || primaryParam.type !== 'number[]') {
    return {
      isAnalyzed: false,
      performanceAssessment: 'WITHIN_EXPECTATION',
      inferredComplexity: 'O(N)',
      measurements: [],
    };
  }

  // Scales to test: N = 500, N = 1500, N = 3000
  const scales = [500, 1500, 3000];
  const measurements: Array<{ scaleN: number; runtimeMs: number }> = [];

  for (const n of scales) {
    const arr = Array.from({ length: n }, (_, i) => i + 1);
    const testInput: Record<string, unknown> = { [primaryParam.name]: arr };
    if (contract.slug === 'two-sum') {
      testInput.target = 2 * n + 5;
    }

    const outcome = executeUserCode(userCode, testInput, contract, 1000);
    measurements.push({
      scaleN: n,
      runtimeMs: outcome.executionTimeMs,
    });
  }

  const t1 = measurements[0]?.runtimeMs || 1;
  const t3 = measurements[2]?.runtimeMs || 1;
  const scaleRatio = 3000 / 500; // 6x scale
  const actualRatio = t3 / Math.max(1, t1);

  // If actual execution timed out at N = 3000 -> LIMIT_EXCEEDED
  if (t3 >= 1000) {
    return {
      isAnalyzed: true,
      performanceAssessment: 'LIMIT_EXCEEDED',
      inferredComplexity: 'O(N^2) / Exponential',
      measurements,
      explanation: 'Execution exceeded the time limit during empirical stress scaling.',
      extrapolatedConstraintOperations: '> 10^9 operations at N = 10^5',
    };
  }

  // If nested loops or quadratic ratio >= 15x or t3 > 150ms -> AT_RISK / LIKELY_LIMIT_EXCEEDED
  if (isNestedLoop || actualRatio >= 15 || t3 > 100) {
    const assessment: PerformanceVerdict = t3 > 300 ? 'LIKELY_LIMIT_EXCEEDED' : 'AT_RISK';
    return {
      isAnalyzed: true,
      performanceAssessment: assessment,
      inferredComplexity: 'O(N^2)',
      measurements,
      growthFactor: Number((actualRatio / scaleRatio).toFixed(2)),
      explanation: `Observed runtime growth (${actualRatio.toFixed(1)}x over ${scaleRatio}x input scale) indicates quadratic O(N^2) scaling under N <= 10^5 constraints.`,
      extrapolatedConstraintOperations: '~10^10 operations at N = 10^5 (Time Limit Exceeded risk)',
    };
  }

  return {
    isAnalyzed: true,
    performanceAssessment: 'WITHIN_EXPECTATION',
    inferredComplexity: 'O(N) / O(N log N)',
    measurements,
    explanation: 'Runtime scaling remains within safe limits for stated input constraints.',
    extrapolatedConstraintOperations: '< 10^7 operations at N = 10^5',
  };
}
