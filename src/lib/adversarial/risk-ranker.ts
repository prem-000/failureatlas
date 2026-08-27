import type {
  EvidenceItem,
  StressTarget,
  StressTargetKind,
  RiskSignals,
  NormalizedCodeFacts,
  AlgorithmDetectionResult,
  ComplexityAnalysisResult,
  ExtractedInvariant,
  ExtractedAssumption,
  MutationCandidate,
} from './types';

export interface RankerInput {
  problemTitle: string;
  constraints: string[];
  facts: NormalizedCodeFacts;
  algorithm: AlgorithmDetectionResult;
  complexity: ComplexityAnalysisResult;
  invariants: ExtractedInvariant[];
  assumptions: ExtractedAssumption[];
  mutations: MutationCandidate[];
  knownWeakness?: { description: string; confirmed: boolean };
}

/**
 * Generates and ranks 5 distinct stress targets for evidence-based hidden test generation.
 * HT-01 — strongest confirmed / source-grounded failure hypothesis
 * HT-02 — boundary or extreme constraint risk
 * HT-03 — invariant or state-transition stress
 * HT-04 — complexity or scale pressure
 * HT-05 — regression / semantic correctness
 */
export function rankStressTargets(input: RankerInput): StressTarget[] {
  const {
    problemTitle,
    constraints,
    facts,
    algorithm,
    complexity,
    invariants,
    assumptions,
    mutations,
    knownWeakness,
  } = input;

  const targets: StressTarget[] = [];

  // 1. HT-01: Confirmed or Primary Failure / Risk Hypothesis
  if (knownWeakness) {
    targets.push({
      id: 'ST-01',
      kind: 'confirmed_failure',
      title: 'Observed Execution Failure Target',
      hypothesis: `Targets the failure mode: ${knownWeakness.description}`,
      sourceEvidence: [
        {
          source: knownWeakness.confirmed ? 'execution' : 'static_analysis',
          description: knownWeakness.description,
          confidence: 0.95,
        },
      ],
      constraintEvidence: [],
      riskSignals: {
        constraintConflict: 0.9,
        mutationSensitivity: 0.9,
        invariantImportance: 0.8,
        complexityPressure: 0.5,
        evidenceStrength: 0.95,
      },
      confidence: 96,
      distinctnessKey: 'confirmed_failure_mode',
      priority: 100,
      whatItAttacks: knownWeakness.description,
    });
  } else if (mutations.length > 0) {
    const topMutation = mutations[0];
    targets.push({
      id: 'ST-01',
      kind: 'root_cause_attack',
      title: `Logic Sensitivity (${topMutation.family})`,
      hypothesis: topMutation.targetHypothesis,
      sourceEvidence: topMutation.evidence,
      constraintEvidence: [],
      riskSignals: {
        constraintConflict: 0.7,
        mutationSensitivity: topMutation.sensitivityScore,
        invariantImportance: 0.8,
        complexityPressure: 0.4,
        evidenceStrength: 0.85,
      },
      confidence: Math.round(topMutation.sensitivityScore * 100),
      distinctnessKey: `mutation_${topMutation.family}`,
      priority: 90,
      whatItAttacks: topMutation.description,
    });
  } else {
    targets.push({
      id: 'ST-01',
      kind: 'root_cause_attack',
      title: 'Primary Logic & Guard Verification',
      hypothesis: 'Tests correctness of initial guard conditions and branching execution.',
      sourceEvidence: algorithm.evidence,
      constraintEvidence: [],
      riskSignals: {
        constraintConflict: 0.5,
        mutationSensitivity: 0.6,
        invariantImportance: 0.7,
        complexityPressure: 0.4,
        evidenceStrength: 0.8,
      },
      confidence: 88,
      distinctnessKey: 'primary_logic_target',
      priority: 85,
      whatItAttacks: 'Control-flow branching and guard predicates',
    });
  }

  // 2. HT-02: Boundary & Extreme Constraint Risk
  const conflictAssumption = assumptions.find(a => a.constraintConflict) || assumptions[0];
  const boundaryEvidence: EvidenceItem[] = conflictAssumption
    ? conflictAssumption.evidence
    : [{ source: 'constraint', description: constraints[0] || 'Extreme value bounds', confidence: 0.9 }];

  targets.push({
    id: 'ST-02',
    kind: 'boundary',
    title: 'Boundary & Extreme Constraint Threshold',
    hypothesis: conflictAssumption
      ? `Stresses assumption: "${conflictAssumption.assumption}" against problem boundaries.`
      : 'Stresses minimum / maximum inputs permissible by problem constraints.',
    sourceEvidence: boundaryEvidence,
    constraintEvidence: constraints.slice(0, 2).map(c => ({ source: 'constraint', description: c, confidence: 0.95 })),
    riskSignals: {
      constraintConflict: 0.95,
      mutationSensitivity: 0.6,
      invariantImportance: 0.7,
      complexityPressure: 0.5,
      evidenceStrength: 0.9,
    },
    confidence: 94,
    distinctnessKey: 'boundary_limits',
    priority: 80,
    whatItAttacks: 'Empty input, minimum/maximum values, single element boundaries, or negative signs',
  });

  // 3. HT-03: Invariant & State Transition Stress
  const primaryInvariant = invariants[0] || {
    id: 'INV-01',
    condition: 'State consistency across iterations',
    type: 'state_balance',
    importance: 0.8,
    evidence: [{ source: 'source_code', description: 'Internal accumulator invariants', confidence: 0.85 }],
  };

  targets.push({
    id: 'ST-03',
    kind: 'invariant',
    title: 'Invariant & State Mutation Stress',
    hypothesis: `Stresses internal invariant: "${primaryInvariant.condition}" across state transitions.`,
    sourceEvidence: primaryInvariant.evidence,
    constraintEvidence: [],
    riskSignals: {
      constraintConflict: 0.6,
      mutationSensitivity: 0.8,
      invariantImportance: primaryInvariant.importance,
      complexityPressure: 0.6,
      evidenceStrength: 0.85,
    },
    confidence: 90,
    distinctnessKey: `invariant_${primaryInvariant.type}`,
    priority: 75,
    whatItAttacks: 'Accumulator precision, duplicate elements, sliding window contraction, or pointer collisions',
  });

  // 4. HT-04: Complexity & Scale Pressure
  targets.push({
    id: 'ST-04',
    kind: 'complexity',
    title: 'Scale & Asymptotic Complexity Pressure',
    hypothesis: `Evaluates execution time and auxiliary space scaling under upper bound constraints (${complexity.detectedTime}).`,
    sourceEvidence: complexity.evidence,
    constraintEvidence: constraints.filter(c => /10\^|length|<=/i.test(c)).map(c => ({ source: 'constraint', description: c, confidence: 0.9 })),
    riskSignals: {
      constraintConflict: complexity.isOptimal ? 0.3 : 0.9,
      mutationSensitivity: 0.5,
      invariantImportance: 0.6,
      complexityPressure: complexity.isOptimal ? 0.5 : 0.95,
      evidenceStrength: 0.88,
    },
    confidence: 92,
    distinctnessKey: 'scale_complexity',
    priority: 70,
    whatItAttacks: 'Time Limit Exceeded (TLE), memory overhead, and deep nesting recursion depth',
  });

  // 5. HT-05: Semantic Regression & General Correctness
  targets.push({
    id: 'ST-05',
    kind: 'semantic_regression',
    title: 'Semantic Equivalence & Output Precision',
    hypothesis: 'Verifies multi-element permutations and non-trivial edge patterns for exact return values.',
    sourceEvidence: facts.variables.slice(0, 2).map(v => ({
      source: 'source_code',
      description: `Variable ${v.name} output stability`,
      confidence: 0.8,
    })),
    constraintEvidence: [],
    riskSignals: {
      constraintConflict: 0.4,
      mutationSensitivity: 0.6,
      invariantImportance: 0.7,
      complexityPressure: 0.4,
      evidenceStrength: 0.82,
    },
    confidence: 89,
    distinctnessKey: 'semantic_equivalence',
    priority: 65,
    whatItAttacks: 'Off-by-one return values, type conversions, and asymmetric multi-branch outputs',
  });

  return targets;
}
