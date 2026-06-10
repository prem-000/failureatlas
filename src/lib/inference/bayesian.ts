import type { CodeSignal, BehavioralSignal, RootCauseType, RootCauseHypothesis, SubmissionStatus } from '@/types';

export interface BayesianEvidence {
  hasBoundaryDiff: boolean;
  hasStructuralBoundaryChange: boolean;
  hasAlgorithmRewrite: boolean;
  hasDataStructureChange: boolean;
  hasImplementationDetailChange: boolean;
  hasRapidResubmission: boolean;
  hasLongGap: boolean;
  hasManyMinorChanges: boolean;
  verdict: SubmissionStatus;
  failedTestCase?: string;
}

export interface UserInferenceHistory {
  boundaryRate: number;
  algorithmRate: number;
  patternRate: number;
  timeComplexityRate: number;
  spaceComplexityRate: number;
  dataStructureRate: number;
  implementationRate: number;
  ioRate: number;
}

const DEFAULT_PRIORS: Record<RootCauseType, number> = {
  'boundary-condition-error': 0.20,
  'algorithm-selection-mistake': 0.15,
  'pattern-recognition-gap': 0.12,
  'time-complexity-oversight': 0.18,
  'space-complexity-oversight': 0.05,
  'data-structure-mismatch': 0.10,
  'implementation-detail-error': 0.15,
  'input-output-handling-error': 0.05,
};

// Likelihood mapping: P(Evidence_i | RootCause_j)
// Key layout: [evidenceKey][rootCause] -> probability
const LIKELIHOODS: Record<string, Record<RootCauseType, number>> = {
  hasBoundaryDiff: {
    'boundary-condition-error': 0.85,
    'algorithm-selection-mistake': 0.10,
    'pattern-recognition-gap': 0.15,
    'time-complexity-oversight': 0.10,
    'space-complexity-oversight': 0.10,
    'data-structure-mismatch': 0.10,
    'implementation-detail-error': 0.30,
    'input-output-handling-error': 0.20,
  },
  hasStructuralBoundaryChange: {
    'boundary-condition-error': 0.90,
    'algorithm-selection-mistake': 0.05,
    'pattern-recognition-gap': 0.10,
    'time-complexity-oversight': 0.05,
    'space-complexity-oversight': 0.05,
    'data-structure-mismatch': 0.05,
    'implementation-detail-error': 0.25,
    'input-output-handling-error': 0.10,
  },
  hasAlgorithmRewrite: {
    'boundary-condition-error': 0.05,
    'algorithm-selection-mistake': 0.90,
    'pattern-recognition-gap': 0.85,
    'time-complexity-oversight': 0.60,
    'space-complexity-oversight': 0.30,
    'data-structure-mismatch': 0.40,
    'implementation-detail-error': 0.10,
    'input-output-handling-error': 0.10,
  },
  hasDataStructureChange: {
    'boundary-condition-error': 0.05,
    'algorithm-selection-mistake': 0.30,
    'pattern-recognition-gap': 0.25,
    'time-complexity-oversight': 0.50,
    'space-complexity-oversight': 0.40,
    'data-structure-mismatch': 0.90,
    'implementation-detail-error': 0.10,
    'input-output-handling-error': 0.05,
  },
  hasImplementationDetailChange: {
    'boundary-condition-error': 0.25,
    'algorithm-selection-mistake': 0.10,
    'pattern-recognition-gap': 0.15,
    'time-complexity-oversight': 0.10,
    'space-complexity-oversight': 0.10,
    'data-structure-mismatch': 0.10,
    'implementation-detail-error': 0.85,
    'input-output-handling-error': 0.30,
  },
  hasRapidResubmission: {
    'boundary-condition-error': 0.60,
    'algorithm-selection-mistake': 0.15,
    'pattern-recognition-gap': 0.20,
    'time-complexity-oversight': 0.15,
    'space-complexity-oversight': 0.10,
    'data-structure-mismatch': 0.15,
    'implementation-detail-error': 0.70,
    'input-output-handling-error': 0.40,
  },
  hasLongGap: {
    'boundary-condition-error': 0.15,
    'algorithm-selection-mistake': 0.75,
    'pattern-recognition-gap': 0.80,
    'time-complexity-oversight': 0.65,
    'space-complexity-oversight': 0.50,
    'data-structure-mismatch': 0.60,
    'implementation-detail-error': 0.20,
    'input-output-handling-error': 0.15,
  },
  hasManyMinorChanges: {
    'boundary-condition-error': 0.70,
    'algorithm-selection-mistake': 0.20,
    'pattern-recognition-gap': 0.25,
    'time-complexity-oversight': 0.20,
    'space-complexity-oversight': 0.15,
    'data-structure-mismatch': 0.20,
    'implementation-detail-error': 0.75,
    'input-output-handling-error': 0.35,
  },
  verdictTLE: {
    'boundary-condition-error': 0.05,
    'algorithm-selection-mistake': 0.70,
    'pattern-recognition-gap': 0.50,
    'time-complexity-oversight': 0.95,
    'space-complexity-oversight': 0.20,
    'data-structure-mismatch': 0.40,
    'implementation-detail-error': 0.10,
    'input-output-handling-error': 0.05,
  },
  verdictMLE: {
    'boundary-condition-error': 0.02,
    'algorithm-selection-mistake': 0.40,
    'pattern-recognition-gap': 0.30,
    'time-complexity-oversight': 0.20,
    'space-complexity-oversight': 0.95,
    'data-structure-mismatch': 0.50,
    'implementation-detail-error': 0.05,
    'input-output-handling-error': 0.02,
  },
  verdictWA: {
    'boundary-condition-error': 0.75,
    'algorithm-selection-mistake': 0.40,
    'pattern-recognition-gap': 0.40,
    'time-complexity-oversight': 0.15,
    'space-complexity-oversight': 0.10,
    'data-structure-mismatch': 0.35,
    'implementation-detail-error': 0.70,
    'input-output-handling-error': 0.60,
  },
  verdictRE: {
    'boundary-condition-error': 0.45,
    'algorithm-selection-mistake': 0.30,
    'pattern-recognition-gap': 0.20,
    'time-complexity-oversight': 0.10,
    'space-complexity-oversight': 0.60,
    'data-structure-mismatch': 0.30,
    'implementation-detail-error': 0.65,
    'input-output-handling-error': 0.15,
  }
};

export function runBayesianInference(
  evidence: BayesianEvidence,
  userHistory?: UserInferenceHistory
): RootCauseHypothesis[] {
  // 1. Determine priors
  const priors = { ...DEFAULT_PRIORS };
  if (userHistory) {
    priors['boundary-condition-error'] = userHistory.boundaryRate || priors['boundary-condition-error'];
    priors['algorithm-selection-mistake'] = userHistory.algorithmRate || priors['algorithm-selection-mistake'];
    priors['pattern-recognition-gap'] = userHistory.patternRate || priors['pattern-recognition-gap'];
    priors['time-complexity-oversight'] = userHistory.timeComplexityRate || priors['time-complexity-oversight'];
    priors['space-complexity-oversight'] = userHistory.spaceComplexityRate || priors['space-complexity-oversight'];
    priors['data-structure-mismatch'] = userHistory.dataStructureRate || priors['data-structure-mismatch'];
    priors['implementation-detail-error'] = userHistory.implementationRate || priors['implementation-detail-error'];
    priors['input-output-handling-error'] = userHistory.ioRate || priors['input-output-handling-error'];

    // Normalize priors to sum to 1.0
    const priorSum = Object.values(priors).reduce((sum, v) => sum + v, 0);
    if (priorSum > 0) {
      for (const key of Object.keys(priors) as RootCauseType[]) {
        priors[key] /= priorSum;
      }
    }
  }

  // 2. Identify active evidence items
  const activeEvidence: string[] = [];
  if (evidence.hasBoundaryDiff) activeEvidence.push('hasBoundaryDiff');
  if (evidence.hasStructuralBoundaryChange) activeEvidence.push('hasStructuralBoundaryChange');
  if (evidence.hasAlgorithmRewrite) activeEvidence.push('hasAlgorithmRewrite');
  if (evidence.hasDataStructureChange) activeEvidence.push('hasDataStructureChange');
  if (evidence.hasImplementationDetailChange) activeEvidence.push('hasImplementationDetailChange');
  if (evidence.hasRapidResubmission) activeEvidence.push('hasRapidResubmission');
  if (evidence.hasLongGap) activeEvidence.push('hasLongGap');
  if (evidence.hasManyMinorChanges) activeEvidence.push('hasManyMinorChanges');

  if (evidence.verdict === 'Time Limit Exceeded') activeEvidence.push('verdictTLE');
  else if (evidence.verdict === 'Memory Limit Exceeded') activeEvidence.push('verdictMLE');
  else if (evidence.verdict === 'Wrong Answer') activeEvidence.push('verdictWA');
  else if (evidence.verdict === 'Runtime Error') activeEvidence.push('verdictRE');

  // 3. Compute joint probabilities / posteriors
  // Posterior(rc) = Prior(rc) * Product_i( P(Evidence_i | rc) )
  const posteriors: Record<RootCauseType, number> = { ...priors };

  // Calculate default product likelihoods
  for (const rc of Object.keys(priors) as RootCauseType[]) {
    let likelihoodProduct = 1.0;
    
    for (const evKey of activeEvidence) {
      const pEvGivenRc = LIKELIHOODS[evKey]?.[rc] ?? 0.1; // fallback
      likelihoodProduct *= pEvGivenRc;
    }
    
    // If there is a failed test case context, add small custom factors
    if (evidence.failedTestCase) {
      const lowerTest = evidence.failedTestCase.toLowerCase();
      if (rc === 'boundary-condition-error' && (lowerTest.includes('empty') || lowerTest.includes('single') || lowerTest.includes('null') || lowerTest.includes('bound'))) {
        likelihoodProduct *= 1.3;
      }
      if (rc === 'input-output-handling-error' && (lowerTest.includes('format') || lowerTest.includes('print') || lowerTest.includes('stdout'))) {
        likelihoodProduct *= 1.4;
      }
    }
    
    posteriors[rc] *= likelihoodProduct;
  }

  // Normalize posteriors
  const posteriorSum = Object.values(posteriors).reduce((sum, v) => sum + v, 0);
  if (posteriorSum > 0) {
    for (const key of Object.keys(posteriors) as RootCauseType[]) {
      posteriors[key] /= posteriorSum;
    }
  } else {
    // If all product to 0, fallback to priors
    Object.assign(posteriors, priors);
  }

  // 4. Map to RootCauseHypothesis array
  const rcNames: Record<RootCauseType, string> = {
    'boundary-condition-error': 'Boundary Condition Error',
    'algorithm-selection-mistake': 'Algorithm Selection Mistake',
    'pattern-recognition-gap': 'Pattern Recognition Gap',
    'time-complexity-oversight': 'Time Complexity Oversight',
    'space-complexity-oversight': 'Space Complexity Oversight',
    'data-structure-mismatch': 'Data Structure Mismatch',
    'implementation-detail-error': 'Implementation Detail Error',
    'input-output-handling-error': 'Input/Output Handling Error',
  };

  const results: RootCauseHypothesis[] = (Object.keys(posteriors) as RootCauseType[]).map(rc => {
    // Map active evidence strings to description list
    const evidenceList: string[] = [];
    if (evidence.hasBoundaryDiff && rc === 'boundary-condition-error') evidenceList.push('Boundary operators changed in code diff');
    if (evidence.hasStructuralBoundaryChange && rc === 'boundary-condition-error') evidenceList.push('Structural off-by-one changes identified in condition expressions');
    if (evidence.hasAlgorithmRewrite && rc === 'algorithm-selection-mistake') evidenceList.push('Complete restructuring of control flow in code diff');
    if (evidence.hasDataStructureChange && rc === 'data-structure-mismatch') evidenceList.push('New data structure introduced in attempt');
    if (evidence.verdict === 'Time Limit Exceeded' && rc === 'time-complexity-oversight') evidenceList.push('TLE verdict on target test cases');
    if (evidence.verdict === 'Memory Limit Exceeded' && rc === 'space-complexity-oversight') evidenceList.push('MLE verdict on target test cases');

    return {
      rootCause: rc,
      name: rcNames[rc],
      confidence: Math.round(posteriors[rc] * 100) / 100, // round to 2 decimals
      evidence: evidenceList.length > 0 ? evidenceList : ['Statistical inference based on behavioral and test case signals']
    };
  });

  // Sort descending by confidence
  return results.sort((a, b) => b.confidence - a.confidence);
}
