/**
 * src/lib/intelligence/analysis/core-analyzer.ts
 * Coordinates approach classification and dynamic detector registry execution.
 */

import type { ProblemContract } from '../contracts/problem-contract';
import type { AnalysisEvidence } from './evidence-engine';
import { classifyApproach, type DetectedApproach } from './approach-classifier';
import { globalDetectorRegistry, type AnalysisContext } from './detector-registry';
import { estimateComplexity } from '../../analysis/code-intelligence';

export interface StaticAnalysisSummary {
  detectedApproach: DetectedApproach;
  estimatedComplexity: string;
  evidence: AnalysisEvidence[];
  activeDetectorsCount: number;
  totalRegisteredDetectorsCount: number;
}

export function analyzeSourceCode(
  code: string,
  contract: ProblemContract,
  language: string = 'javascript'
): StaticAnalysisSummary {
  // 1. Classify algorithmic approach with concrete evidence
  const detectedApproach = classifyApproach(code, contract);
  const complexityResult = estimateComplexity(code, detectedApproach.name.toLowerCase().replace(/\s+/g, '_'));

  const context: AnalysisContext = {
    code,
    contract,
    approach: detectedApproach,
    language,
  };

  // 2. Dynamically select relevant detectors from registry
  const relevantDetectors = globalDetectorRegistry.selectRelevant(context);
  const evidence: AnalysisEvidence[] = [];

  for (const detector of relevantDetectors) {
    const findings = detector.analyze(context);
    evidence.push(...findings);
  }

  return {
    detectedApproach,
    estimatedComplexity: complexityResult.time,
    evidence,
    activeDetectorsCount: relevantDetectors.length,
    totalRegisteredDetectorsCount: globalDetectorRegistry.getAll().length,
  };
}
