/**
 * src/lib/adversarial/stress-target-pool.ts
 *
 * Failure Hypothesis Discovery — Problem-Specific Stress Target Generation
 *
 * Generates concrete failure hypotheses by analyzing the relationship between
 * what the problem requires (ProblemSemanticModel) and what the submitted code
 * actually does (NormalizedCodeFacts + algorithm + complexity + assumptions + mutations).
 *
 * Each hypothesis answers: "Where can THIS implementation violate THIS problem's requirements?"
 *
 * Produces 10–30 candidates, then deduplicates and selects the top 5 most diagnostic targets.
 */

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
import type { ProblemSemanticModel } from './problem-semantic-model';

export interface FailureHypothesisInput {
  semantic: ProblemSemanticModel;
  facts: NormalizedCodeFacts;
  algorithm: AlgorithmDetectionResult;
  complexity: ComplexityAnalysisResult;
  invariants: ExtractedInvariant[];
  assumptions: ExtractedAssumption[];
  mutations: MutationCandidate[];
  knownWeakness?: { description: string; confirmed: boolean };
}

export function generateFailureHypotheses(input: FailureHypothesisInput): StressTarget[] {
  const { semantic, facts, algorithm, complexity, invariants, assumptions, mutations, knownWeakness } = input;
  const candidates: StressTarget[] = [];
  let idCounter = 1;

  const addCandidate = (
    kind: StressTargetKind,
    title: string,
    hypothesis: string,
    whatItAttacks: string,
    distinctKey: string,
    priority: number,
    sourceEvidence: EvidenceItem[],
    constraintEvidence: EvidenceItem[],
    signals: Partial<RiskSignals> = {}
  ) => {
    const riskSignals: RiskSignals = {
      evidenceStrength: signals.evidenceStrength ?? 0.8,
      mutationSensitivity: signals.mutationSensitivity ?? 0.5,
      invariantImportance: signals.invariantImportance ?? 0.5,
      constraintConflict: signals.constraintConflict ?? 0.3,
      complexityPressure: signals.complexityPressure ?? 0.3,
    };

    const confidence = Math.min(99, Math.max(50, Math.round(priority)));

    candidates.push({
      id: `CAND-${idCounter++}`,
      kind,
      title,
      hypothesis,
      whatItAttacks,
      distinctnessKey: distinctKey,
      riskSignals,
      confidence,
      priority,
      sourceEvidence,
      constraintEvidence,
    });
  };

  // ── 1. Confirmed Weakness (highest priority) ──────────────────────────────
  if (knownWeakness) {
    addCandidate(
      knownWeakness.confirmed ? 'confirmed_failure' : 'root_cause_attack',
      knownWeakness.confirmed ? 'Confirmed Execution Failure' : 'Suspected Logic Vulnerability',
      knownWeakness.description,
      knownWeakness.description,
      'known_weakness',
      knownWeakness.confirmed ? 100 : 92,
      [{ source: knownWeakness.confirmed ? 'execution' : 'static_analysis', description: knownWeakness.description, confidence: 0.95 }],
      [],
      { evidenceStrength: 1.0, mutationSensitivity: 0.95, constraintConflict: 0.9 }
    );
  }

  // ── 2. Constraint-Boundary Hypotheses (from problem semantic model) ───────
  for (const boundary of semantic.boundaries) {
    // Minimum boundary
    if (boundary.min) {
      const minTitle = `${boundary.parameter} at minimum (${boundary.min})`;
      addCandidate(
        'boundary',
        minTitle,
        `When ${boundary.parameter} equals its minimum allowed value (${boundary.min}), the implementation must still produce a correct result.`,
        `Tests whether the code handles the smallest valid ${boundary.parameter}`,
        `boundary_min_${boundary.parameter}`,
        82,
        findCodeEvidenceForParam(boundary.parameter, facts),
        [{ source: 'constraint', description: `${boundary.parameter} >= ${boundary.min}`, confidence: 0.95 }],
        { constraintConflict: 0.85, evidenceStrength: 0.88 }
      );
    }

    // Maximum boundary
    if (boundary.max && boundary.max !== 'unspecified') {
      const maxTitle = `${boundary.parameter} at maximum (${boundary.max})`;
      addCandidate(
        'boundary',
        maxTitle,
        `When ${boundary.parameter} equals its maximum allowed value (${boundary.max}), the implementation must handle scale and produce correct output.`,
        `Tests correctness and performance at maximum ${boundary.parameter}`,
        `boundary_max_${boundary.parameter}`,
        78,
        findCodeEvidenceForParam(boundary.parameter, facts),
        [{ source: 'constraint', description: `${boundary.parameter} <= ${boundary.max}`, confidence: 0.95 }],
        { constraintConflict: 0.8, complexityPressure: 0.7, evidenceStrength: 0.85 }
      );
    }
  }

  // ── 3. Assumption-Based Hypotheses (code assumptions vs problem constraints) ──
  for (const assumption of assumptions) {
    const title = assumption.constraintConflict
      ? `Constraint Violation: ${summarize(assumption.assumption, 50)}`
      : `Unchecked Assumption: ${summarize(assumption.assumption, 50)}`;

    addCandidate(
      assumption.constraintConflict ? 'root_cause_attack' : 'boundary',
      title,
      assumption.assumption,
      `The code assumes "${summarize(assumption.assumption, 60)}" which may not hold for all valid inputs`,
      `assumption_${assumption.id}`,
      assumption.constraintConflict ? 90 : 72,
      assumption.evidence,
      assumption.conflictEvidence ? [assumption.conflictEvidence] : [],
      {
        constraintConflict: assumption.constraintConflict ? 0.95 : 0.4,
        evidenceStrength: assumption.riskSeverity === 'High' ? 0.92 : 0.75,
      }
    );
  }

  // ── 4. Mutation-Derived Hypotheses (code sensitivity to small changes) ────
  for (const mutation of mutations) {
    // Skip the generic "scale stress mutation" entry
    if (mutation.id === 'mut_scale_1') continue;

    addCandidate(
      'boundary',
      `Code Sensitivity: ${summarize(mutation.originalSnippet, 40)}`,
      mutation.targetHypothesis,
      `Changing "${mutation.originalSnippet}" to "${mutation.mutatedSnippet}" could cause: ${mutation.description}`,
      `mutation_${mutation.id}`,
      Math.round(mutation.sensitivityScore * 85),
      mutation.evidence,
      [],
      { mutationSensitivity: mutation.sensitivityScore, evidenceStrength: 0.85 }
    );
  }

  // ── 5. Code-Structure Hypotheses (from actual code patterns) ──────────────

  // 5a. Loop termination: does the last iteration get processed?
  for (const loop of facts.loops) {
    if (loop.bounds && loop.type !== 'recursion') {
      addCandidate(
        'boundary',
        `Loop Termination: ${summarize(loop.bounds, 40)}`,
        `The loop "${loop.bounds}" must process all required elements including the final valid state.`,
        `Tests whether the final iteration of "${loop.bounds}" produces the correct state update`,
        `loop_term_${loop.variable || loop.bounds.slice(0, 20)}`,
        75,
        [{ source: 'source_code', description: `Loop: ${loop.bounds}`, codeLocation: { snippet: loop.bounds }, confidence: 0.88 }],
        [],
        { mutationSensitivity: 0.8, invariantImportance: 0.7 }
      );
    }
  }

  // 5b. Early returns: inputs that bypass the main logic
  for (const er of facts.earlyReturns) {
    addCandidate(
      'boundary',
      `Early Return Guard: ${summarize(er.condition, 40)}`,
      `The early return on condition "${er.condition}" must correctly handle the boundary case it guards.`,
      `Tests the exact boundary where the early return condition "${er.condition}" activates`,
      `early_return_${er.condition.slice(0, 20)}`,
      73,
      [{ source: 'source_code', description: `Early return: if (${er.condition}) return ${er.returnValue || '...'}`, confidence: 0.85 }],
      [],
      { evidenceStrength: 0.85, constraintConflict: 0.5 }
    );
  }

  // 5c. Data structure interactions
  for (const ds of facts.dataStructures) {
    if (ds.type === 'map' || ds.type === 'set') {
      addCandidate(
        'semantic_regression',
        `${ds.type === 'map' ? 'Map' : 'Set'} Lookup: ${ds.name}`,
        `The ${ds.type} "${ds.name}" must handle key collisions, duplicate insertions, and missing lookups correctly.`,
        `Tests whether ${ds.name} (${ds.type}) handles duplicate keys, missing entries, or overwritten values`,
        `ds_${ds.type}_${ds.name}`,
        70,
        [{ source: 'source_code', description: `Data structure: ${ds.name} (${ds.type}) with operations: ${ds.operations.join(', ')}`, confidence: 0.85 }],
        [],
        { invariantImportance: 0.8, evidenceStrength: 0.82 }
      );
    }
  }

  // 5d. Accumulator / state initialization
  for (const v of facts.variables) {
    if (v.isAccumulator && v.initialValue !== undefined) {
      addCandidate(
        'boundary',
        `Initialization: ${v.name} = ${v.initialValue}`,
        `The variable "${v.name}" is initialized to ${v.initialValue}. This initialization must be valid for all constraint-valid inputs.`,
        `Tests inputs where initializing ${v.name} to ${v.initialValue} could produce an incorrect result (e.g., all-negative inputs when initialized to 0)`,
        `init_${v.name}`,
        68,
        [{ source: 'source_code', description: `Variable ${v.name} initialized to ${v.initialValue}`, confidence: 0.82 }],
        [],
        { constraintConflict: 0.6, evidenceStrength: 0.8 }
      );
    }
  }

  // ── 6. Problem-Specific Semantic Hypotheses (from testable edges) ──────────
  for (const edge of semantic.testableEdgeBehaviors.slice(0, 8)) {
    addCandidate(
      'semantic_regression',
      edge,
      `The implementation must correctly handle: ${edge}`,
      `Tests the semantic edge behavior: ${edge}`,
      `semantic_${edge.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}`,
      65,
      algorithm.evidence.slice(0, 1),
      [],
      { invariantImportance: 0.7, evidenceStrength: 0.78 }
    );
  }

  // ── 7. Complexity Pressure (only if suboptimal) ───────────────────────────
  if (!complexity.isOptimal) {
    const optTarget = complexity.expectation.optimalTime || complexity.expectation.preferredTime || 'O(n)';
    addCandidate(
      'complexity',
      `Performance at Scale: ${complexity.detectedTime} vs ${optTarget}`,
      `The detected complexity ${complexity.detectedTime} is suboptimal. At maximum constraint values, the solution may exceed time limits.`,
      `Tests whether the ${complexity.detectedTime} implementation executes within time limits at maximum input scale`,
      'complexity_scale',
      complexity.isOptimal ? 50 : 80,
      complexity.evidence,
      semantic.boundaries.filter(b => b.max && b.max !== 'unspecified').map(b => ({
        source: 'constraint' as const, description: `${b.parameter} up to ${b.max}`, confidence: 0.9,
      })),
      { complexityPressure: 0.95, evidenceStrength: 0.88 }
    );
  }

  // ── Deduplication, Diversity & Selection ───────────────────────────────────
  return selectBest5(candidates);
}

// ─── Selection: Deduplicate & Pick 5 Most Diagnostic ─────────────────────────

function selectBest5(candidates: StressTarget[]): StressTarget[] {
  // Sort by priority descending
  candidates.sort((a, b) => b.priority - a.priority);

  const selected: StressTarget[] = [];
  const seenKeys = new Set<string>();
  const seenKinds = new Map<StressTargetKind, number>();

  for (const cand of candidates) {
    if (selected.length >= 5) break;
    if (seenKeys.has(cand.distinctnessKey)) continue;

    // Allow at most 2 of the same kind to ensure diversity
    const kindCount = seenKinds.get(cand.kind) || 0;
    if (kindCount >= 2) continue;

    selected.push(cand);
    seenKeys.add(cand.distinctnessKey);
    seenKinds.set(cand.kind, kindCount + 1);
  }

  // If still need more, relax kind restriction
  if (selected.length < 5) {
    for (const cand of candidates) {
      if (selected.length >= 5) break;
      if (seenKeys.has(cand.distinctnessKey)) continue;
      selected.push(cand);
      seenKeys.add(cand.distinctnessKey);
    }
  }

  // Normalize IDs to ST-01 .. ST-05
  return selected.slice(0, 5).map((t, idx) => ({
    ...t,
    id: `ST-0${idx + 1}`,
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function summarize(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length <= maxLen ? text : text.slice(0, maxLen - 3) + '...';
}

function findCodeEvidenceForParam(paramName: string, facts: NormalizedCodeFacts): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];
  const cleanName = paramName.replace(/\[i\]$/, '');

  // Find loops that reference this parameter
  for (const loop of facts.loops) {
    if (loop.bounds.includes(cleanName)) {
      evidence.push({
        source: 'source_code',
        description: `Loop uses ${cleanName}: ${loop.bounds}`,
        codeLocation: { snippet: loop.bounds },
        confidence: 0.88,
      });
    }
  }

  // Find conditions that reference this parameter
  for (const cond of facts.conditions) {
    if (cond.condition.includes(cleanName)) {
      evidence.push({
        source: 'source_code',
        description: `Condition references ${cleanName}: ${cond.condition}`,
        codeLocation: { snippet: cond.condition },
        confidence: 0.85,
      });
    }
  }

  if (evidence.length === 0) {
    evidence.push({
      source: 'source_code',
      description: `Parameter ${cleanName} is part of the function signature`,
      confidence: 0.75,
    });
  }

  return evidence.slice(0, 2);
}
