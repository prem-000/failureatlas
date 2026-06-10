/**
 * Bayesian Inference Engine
 * Computes posterior probabilities for root causes given evidence.
 *
 * Formula: P(RootCause | Evidence) = P(Evidence | RootCause) × P(RootCause) / P(Evidence)
 *
 * Prior probabilities are fetched from Neo4j at runtime based on the failure ontology.
 */

import { RootCauseType } from '../../types';
import { queryRootCausePriors } from '../db/graph-queries';

export interface EvidenceSet {
  codePatterns: string[]; // e.g., ["boundary-condition-change", "loop-modification"]
  errorType: string; // e.g., "index-error", "time-limit"
  errorKeywords: string[];
  behavioralSignals: string[]; // e.g., ["rapid-resubmission", "many-minor-changes"]
}

export interface BayesianResult {
  rootCause: RootCauseType;
  posterior: number; // P(RootCause | Evidence)
  likelihood: number; // P(Evidence | RootCause)
  prior: number; // P(RootCause) from Neo4j
}

/**
 * Likelihood matrices: P(Evidence | RootCause)
 * These are manually tuned based on domain knowledge about CP failures.
 */
const LIKELIHOOD_MATRIX: Record<RootCauseType, Record<string, number>> = {
  'boundary-condition-error': {
    'boundary-condition-change': 0.85,
    'index-error': 0.9,
    'loop-modification': 0.7,
    'condition-inversion': 0.75,
    'boundary': 0.8,
    'edge': 0.75,
    'corner': 0.8,
  },
  'algorithm-selection-mistake': {
    'algorithm-change': 0.8,
    'time-limit': 0.85,
    'wrong-answer': 0.7,
    'algorithm': 0.8,
    'pattern': 0.65,
  },
  'pattern-recognition-gap': {
    'algorithm-change': 0.6,
    'wrong-answer': 0.75,
    'many-minor-changes': 0.65,
    'pattern': 0.8,
    'algorithm': 0.6,
  },
  'time-complexity-oversight': {
    'time-limit': 0.95,
    'algorithm-change': 0.7,
    'performance': 0.9,
    'algorithm-efficiency': 0.85,
  },
  'space-complexity-oversight': {
    'memory-limit': 0.95,
    'data-structure-change': 0.75,
    'space-complexity': 0.9,
    'data-structure': 0.8,
  },
  'data-structure-mismatch': {
    'data-structure-change': 0.85,
    'wrong-answer': 0.65,
    'time-limit': 0.6,
    'data-structure': 0.8,
  },
  'implementation-detail-error': {
    'type-error': 0.85,
    'null-error': 0.8,
    'logic-error': 0.65,
    'loop-modification': 0.6,
    'implementation-detail': 0.9,
  },
  'input-output-handling-error': {
    'wrong-answer': 0.8,
    'type-error': 0.6,
    'runtime-error': 0.7,
    'input': 0.85,
    'output': 0.8,
  },
};

/**
 * Compute likelihood P(Evidence | RootCause) by averaging across all evidence items.
 * Evidence that matches the likelihood matrix increases the score.
 */
function computeLikelihood(evidence: EvidenceSet, rootCause: RootCauseType): number {
  const likelihoods: number[] = [];
  const matrix = LIKELIHOOD_MATRIX[rootCause] || {};

  // Check code patterns
  for (const pattern of evidence.codePatterns) {
    if (pattern in matrix) {
      likelihoods.push(matrix[pattern]);
    } else {
      likelihoods.push(0.3); // Neutral likelihood for unknown patterns
    }
  }

  // Check error type
  if (evidence.errorType in matrix) {
    likelihoods.push(matrix[evidence.errorType]);
  }

  // Check error keywords
  for (const keyword of evidence.errorKeywords) {
    if (keyword in matrix) {
      likelihoods.push(matrix[keyword] * 0.8); // Slightly lower weight than direct matches
    }
  }

  // Check behavioral signals
  for (const signal of evidence.behavioralSignals) {
    if (signal in matrix) {
      likelihoods.push(matrix[signal] * 0.7); // Lower weight for behavioral signals
    }
  }

  // Return average likelihood, or 0.3 if no evidence matched
  if (likelihoods.length === 0) {
    return 0.3;
  }

  return likelihoods.reduce((a, b) => a + b) / likelihoods.length;
}

/**
 * Normalize probabilities to sum to 1.0 using softmax.
 */
function normalize(probs: number[]): number[] {
  const sum = probs.reduce((a, b) => a + b, 0);
  return probs.map((p) => p / sum);
}

/**
 * Run Bayesian inference: compute posterior for each root cause type.
 *
 * Returns all root causes ranked by posterior probability.
 */
export async function inferRootCauses(
  evidence: EvidenceSet,
): Promise<BayesianResult[]> {
  // Fetch priors from Neo4j
  const priors = await queryRootCausePriors();

  // Compute posteriors using Bayes theorem
  const posteriors: BayesianResult[] = [];

  for (const [rootCause, prior] of Object.entries(priors)) {
    const likelihood = computeLikelihood(evidence, rootCause as RootCauseType);

    // P(Evidence | RootCause) × P(RootCause)
    // (We skip normalizing by P(Evidence) since we'll normalize all posteriors anyway)
    const joint = likelihood * prior;

    posteriors.push({
      rootCause: rootCause as RootCauseType,
      likelihood,
      prior,
      posterior: joint, // Unnormalized
    });
  }

  // Normalize posteriors to sum to 1.0
  const unnormalized = posteriors.map((p) => p.posterior);
  const normalized = normalize(unnormalized);

  posteriors.forEach((p, i) => {
    p.posterior = normalized[i];
  });

  // Sort by posterior (descending)
  posteriors.sort((a, b) => b.posterior - a.posterior);

  return posteriors;
}

/**
 * Get top N root causes by posterior probability.
 */
export function getTopCauses(results: BayesianResult[], n = 3): BayesianResult[] {
  return results.slice(0, n);
}

/**
 * Build evidence set from diff, error, and behavioral signals.
 */
export function buildEvidenceSet(
  codePatterns: string[],
  errorMessage: string,
  errorType: string,
  errorKeywords: string[],
  behavioralSignals: string[] = [],
): EvidenceSet {
  return {
    codePatterns,
    errorType,
    errorKeywords,
    behavioralSignals,
  };
}
