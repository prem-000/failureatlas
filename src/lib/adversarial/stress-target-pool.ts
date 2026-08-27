import type {
  AlgorithmDetectionResult,
  ComplexityAnalysisResult,
  EvidenceItem,
  ExtractedAssumption,
  ExtractedInvariant,
  MutationCandidate,
  NormalizedCodeFacts,
  RiskSignals,
  StressTarget,
  StressTargetKind,
} from './types';

export function generateAndRankStressTargets(params: {
  problemTitle: string;
  constraints: string[];
  facts: NormalizedCodeFacts;
  algorithm: AlgorithmDetectionResult;
  complexity: ComplexityAnalysisResult;
  invariants: ExtractedInvariant[];
  assumptions: ExtractedAssumption[];
  mutations: MutationCandidate[];
  knownWeakness?: { description: string; confirmed: boolean };
}): StressTarget[] {
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
  } = params;

  const candidatePool: StressTarget[] = [];
  let idCounter = 1;

  // Helper to construct candidate targets
  const addCandidate = (
    kind: StressTargetKind,
    title: string,
    hypothesis: string,
    whatItAttacks: string,
    distinctnessKey: string,
    signals: RiskSignals,
    sourceEv: EvidenceItem[],
    constraintEv: EvidenceItem[]
  ) => {
    // Priority calculation: Evidence Strength + Risk Importance + Constraint Relevance
    const priority =
      signals.evidenceStrength * 0.35 +
      signals.mutationSensitivity * 0.25 +
      signals.invariantImportance * 0.20 +
      signals.constraintConflict * 0.15 +
      signals.complexityPressure * 0.05;

    const confidence = Math.min(99, Math.max(50, Math.round(priority * 100)));

    candidatePool.push({
      id: `CAND-${idCounter++}`,
      kind,
      title,
      hypothesis,
      whatItAttacks,
      distinctnessKey,
      riskSignals: signals,
      confidence,
      priority,
      sourceEvidence: sourceEv,
      constraintEvidence: constraintEv,
    });
  };

  // 1. Confirmed Weakness or Root Cause Attack Candidates
  if (knownWeakness && knownWeakness.confirmed) {
    addCandidate(
      'confirmed_failure',
      'Execution Root-Cause Failure',
      knownWeakness.description,
      'Exposes confirmed incorrect behavior observed during execution',
      'weakness:confirmed_execution_failure',
      {
        constraintConflict: 0.9,
        mutationSensitivity: 0.95,
        invariantImportance: 0.9,
        complexityPressure: 0.5,
        evidenceStrength: 1.0,
      },
      [{ source: 'execution', description: knownWeakness.description, confidence: 1.0 }],
      []
    );
  } else if (knownWeakness) {
    addCandidate(
      'root_cause_attack',
      'Hypothesized Root-Cause Vulnerability',
      knownWeakness.description,
      'Stresses the hypothesized logic omission or state update ordering',
      'weakness:inferred_root_cause',
      {
        constraintConflict: 0.7,
        mutationSensitivity: 0.85,
        invariantImportance: 0.8,
        complexityPressure: 0.4,
        evidenceStrength: 0.85,
      },
      [{ source: 'static_analysis', description: knownWeakness.description, confidence: 0.85 }],
      []
    );
  }

  // 2. Invariant Stress Candidates
  for (const inv of invariants) {
    addCandidate(
      'invariant',
      `Invariant Stress: ${inv.condition.slice(0, 40)}`,
      `The implementation must strictly preserve: "${inv.condition}" across boundary state updates`,
      `Invariant violation in ${inv.type} maintenance`,
      `invariant:${inv.type}`,
      {
        constraintConflict: 0.4,
        mutationSensitivity: 0.75,
        invariantImportance: inv.importance,
        complexityPressure: 0.3,
        evidenceStrength: 0.88,
      },
      inv.evidence,
      []
    );
  }

  // 3. Assumption / Constraint Boundary Candidates
  for (const asmp of assumptions) {
    addCandidate(
      asmp.constraintConflict ? 'root_cause_attack' : 'boundary',
      `Boundary Risk: ${asmp.assumption.slice(0, 40)}`,
      asmp.assumption,
      `Unchecked assumption under extreme constraints`,
      `assumption:${asmp.id}`,
      {
        constraintConflict: asmp.constraintConflict ? 0.95 : 0.4,
        mutationSensitivity: 0.7,
        invariantImportance: 0.6,
        complexityPressure: 0.3,
        evidenceStrength: asmp.riskSeverity === 'High' ? 0.92 : 0.75,
      },
      asmp.evidence,
      asmp.conflictEvidence ? [asmp.conflictEvidence] : []
    );
  }

  // 4. Mutation Sensitivity Candidates
  for (const mut of mutations) {
    addCandidate(
      'boundary',
      `Mutation Sensitivity: ${mut.family.toUpperCase()} Boundary`,
      mut.targetHypothesis,
      `Equality boundary or off-by-one condition in ${mut.originalSnippet}`,
      `mutation:${mut.family}:${mut.id}`,
      {
        constraintConflict: 0.3,
        mutationSensitivity: mut.sensitivityScore,
        invariantImportance: 0.7,
        complexityPressure: 0.2,
        evidenceStrength: 0.85,
      },
      mut.evidence,
      []
    );
  }

  // 5. Complexity / Scale Pressure Candidate
  const isComplexityRisky = !complexity.isOptimal;
  addCandidate(
    'complexity',
    `Complexity Pressure: Worst-Case Scale`,
    `Evaluates execution scaling on maximum constraint input (${complexity.detectedTime} vs optimal ${complexity.expectation.optimalTime || complexity.expectation.preferredTime})`,
    'Time or memory limit exceeded under maximal load',
    'complexity:scale_pressure',
    {
      constraintConflict: isComplexityRisky ? 0.85 : 0.2,
      mutationSensitivity: 0.5,
      invariantImportance: 0.5,
      complexityPressure: isComplexityRisky ? 0.95 : 0.4,
      evidenceStrength: isComplexityRisky ? 0.9 : 0.7,
    },
    complexity.evidence,
    complexity.expectation.evidence
  );

  // 6. Semantic Regression / Correctness Candidate
  addCandidate(
    'semantic_regression',
    'Semantic Correctness & Property Preservation',
    'Validates that structural edge cases preserve correct problem output semantics',
    'Validates foundational correctness on non-trivial valid input',
    'semantic:core_property',
    {
      constraintConflict: 0.1,
      mutationSensitivity: 0.6,
      invariantImportance: 0.85,
      complexityPressure: 0.2,
      evidenceStrength: 0.80,
    },
    algorithm.evidence,
    []
  );

  // ─── Deduplication & Diversity Clustering ─────────────────────────────────────
  // Sort pool by priority descending
  candidatePool.sort((a, b) => b.priority - a.priority);

  const selectedTargets: StressTarget[] = [];
  const seenClusters = new Set<string>();

  // Ensure dynamic priority logic:
  // IF confirmed weakness -> select it first
  // ELSE IF root cause hypothesis -> select it first
  // ELSE -> select highest priority boundary/invariant
  for (const cand of candidatePool) {
    if (selectedTargets.length >= 5) break;

    // Check cluster key (prefix before colon, or distinct key)
    const clusterPrefix = cand.distinctnessKey.split(':')[0];
    const key = cand.distinctnessKey;

    // Allow multiple boundaries only if distinct specific keys
    if (seenClusters.has(key)) continue;

    selectedTargets.push(cand);
    seenClusters.add(key);
    seenClusters.add(clusterPrefix);
  }

  // If we still need to fill up to exactly 5 targets, relax cluster restriction
  if (selectedTargets.length < 5) {
    for (const cand of candidatePool) {
      if (selectedTargets.length >= 5) break;
      if (!selectedTargets.some(t => t.id === cand.id)) {
        selectedTargets.push(cand);
      }
    }
  }

  // Normalize IDs to ST-01 .. ST-05
  return selectedTargets.slice(0, 5).map((t, idx) => ({
    ...t,
    id: `ST-0${idx + 1}`,
  }));
}
