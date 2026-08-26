# Praxis Failure Intelligence Engine — Phase 2 Completion Report

A complete Phase 2 report on robustness, coverage, and production validation of the Praxis Failure Intelligence Engine.

---

## 1. Reality Audit Summary

- **Architecture Unification**: Verified that all API routes (`/api/behavior-insights/generate-tests`, `/api/behavior-insights/judge-repair`) and frontend views call a single canonical orchestrator: `analyzeSubmission()`.
- **Anti-Oracle Flaws Removed**: User code output is strictly treated as actual output; expected output is generated exclusively by verified Reference Oracles.
- **Dead Code Removed**: `src/lib/judge/` (entire folder), `src/lib/analysis/test-verifier.ts`, `src/components/intelligence/AdversarialTestLabCard/`.
- **Dynamic Detector Registry**: Replaced hardcoded detector execution with topic- and approach-aware selection.

---

## 2. Files Changed in Phase 2

### Files Created:
- `src/lib/intelligence/analysis/approach-classifier.ts`: 14-pattern structural algorithm classifier.
- `src/lib/intelligence/analysis/detector-registry.ts`: Modular detector registry with dynamic context selection.
- `src/lib/intelligence/generation/counterexample-minimizer.ts`: Input reduction & shrinking engine.
- `src/lib/intelligence/generation/candidate-selector.ts`: Structural equivalence grouping & 5-factor quality scoring.
- `tests/intelligence/corpus/corpus-definitions.ts`: 51 evaluation test cases across 10 problem families.
- `tests/intelligence/corpus/corpus-runner.ts`: Automated runner computing precision, recall, and reduction metrics.
- `tests/intelligence/mutation/mutation-engine.ts`: Automated syntactic mutation testing engine.
- `tests/intelligence/run-all-tests.ts`: Master verification suite.
- `PHASE_2_REALITY_AUDIT.md`: Reality check and dependency audit.
- `PHASE_2_EVALUATION_RESULTS.md`: Detailed corpus evaluation metrics.
- `PHASE_2_MUTATION_TESTING.md`: Mutation testing results.
- `PHASE_2_COMPLETION.md`: Final completion report.

### Files Modified:
- `src/lib/intelligence/types.ts`: Added `ExecutionVerdict`, `EvidenceConfidence`, `MinimalProof`, and `analysisCoverage`.
- `src/lib/intelligence/analysis/evidence-engine.ts`: Added calibrated confidence fields (`staticConfidence`, `empiricalConfidence`, `combinedConfidence`).
- `src/lib/intelligence/analysis/core-analyzer.ts`: Wired up approach classifier and detector registry.
- `src/lib/intelligence/analysis/detectors/*`: Emitted calibrated confidence fields.
- `src/lib/intelligence/objectives/test-objective-builder.ts`: Formulated explicit `failureMechanism` and `requiredProperties`.
- `src/lib/intelligence/generation/groq-synthesizer.ts`: 14-rule constrained prompt with structured user data only.
- `src/lib/intelligence/generation/candidate-generator.ts`: Integrated structural diversity selection and candidate pooling.
- `src/lib/intelligence/execution/result-comparator.ts`: Distinct `ExecutionVerdict` (`PASSED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, `INCONCLUSIVE`).
- `src/lib/intelligence/interpretation/evidence-lifecycle.ts`: Calibrated Bayesian confidence update upon dual execution.
- `src/lib/intelligence/interpretation/health-scorer.ts`: Separate `Code Health` and `Analysis Coverage` calculations.
- `src/lib/intelligence/intelligence-pipeline.ts`: Integrated approach classifier, minimizer, verdicts, and coverage.
- `src/components/intelligence/Header/OverallHealthCard.tsx`: Displayed Code Health and Analysis Coverage.
- `src/components/intelligence/OverviewTab.tsx`: Added Smallest Verified Counterexample display.
- `src/components/intelligence/TestCasesTab/VerifiedTestCard.tsx`: Added distinct verdict badges and minimal proof tags.
- `src/components/intelligence/InsightsTab/LearningPrescription.tsx`: Prioritized prescriptions for confirmed defects.
- `package.json`: Configured `npm test` to run the master verification suite.

---

## 3. Pipeline Runtime Trace

```
1. USER SUBMITS CODE
       ↓
2. CANONICAL PROBLEM CONTRACT RESOLUTION (contracts/contract-extractor.ts)
   - Resolves parameters, execution mode (in_place vs return_value), constraints, and invariants
       ↓
3. ALGORITHM-AWARE APPROACH CLASSIFICATION (analysis/approach-classifier.ts)
   - Identifies approach (e.g. Two Pointers, Sliding Window, DP, Stack) with concrete proof
       ↓
4. DYNAMIC DETECTOR REGISTRY FILTERING (analysis/detector-registry.ts)
   - Selects only relevant detectors based on problem contract, topic, and approach
   - Emits AnalysisEvidence[] (tagged as POTENTIAL with staticConfidence)
       ↓
5. FAILURE-DRIVEN TEST OBJECTIVES (objectives/test-objective-builder.ts)
   - Defines explicit failure mechanism, requiredProperties, and forbiddenProperties
       ↓
6. HYBRID CANDIDATE GENERATION (generation/candidate-generator.ts)
   - Deterministic Generators + Constrained 14-Rule Groq Synthesizer (with deduplication)
   - Contract Validation (contract-validator.ts)
   - Structural Equivalence Grouping & 5-Factor Quality Scoring (candidate-selector.ts)
       ↓
7. DUAL VM EXECUTION & VERDICT SEPARATION (execution/user-executor.ts & oracle-executor.ts)
   - Reference Oracle generates Ground Truth Expected Output
   - User Solution executes in Node.js VM sandbox with in-place mutation cloning
   - Verdict Classified: PASSED | WRONG_ANSWER | TIME_LIMIT_EXCEEDED | RUNTIME_ERROR | INCONCLUSIVE
       ↓
8. MINIMAL COUNTEREXAMPLE SEARCH (generation/counterexample-minimizer.ts)
   - If failing: shrinks array length, removes elements, reduces numbers toward 0/1/-1 while preserving failure
       ↓
9. CALIBRATED EVIDENCE LIFECYCLE & 2-PART SCORING (interpretation/)
   - Calibrates static, empirical, and combined confidence
   - Updates status: POTENTIAL → CONFIRMED / REJECTED / INCONCLUSIVE
   - Computes Code Health Score (0-100) and Analysis Coverage Score (0-100%)
       ↓
10. FAILURE INTELLIGENCE VIEW (components/intelligence/)
   - Overview: Primary Observation, Health, Coverage, Smallest Counterexample
   - Evidence: Traceable detector cards with snippets and lifecycle badges
   - Test Cases: Grouped test strategies with input, oracle expected, user output, verdict badges
   - Insights: Root cause analysis and learning prescriptions for confirmed defects
```

---

## 4. Evaluation Results

```text
Corpus Cases:                             51
Problem Families:                         10
Correct Solutions:                        10
Buggy Solutions:                          41
True Positives (Defects Caught):          35
True Negatives (Correct Verified):        10
False Positives:                           0
False Negatives:                           6

Precision:                                100.0%
Recall:                                    85.4%
False Positive Rate:                        0.0%
Mutation Score:                           100.0%
Average Counterexample Reduction Steps:    4.09 steps
```

---

## 5. Verification Commands Run

1. **TypeScript Type Check**:
   - Command: `npm run type-check`
   - Result: **0 errors** (Main Next.js app & Extension)
2. **Production Build**:
   - Command: `npx next build`
   - Result: **0 errors** (All 40 routes and pages compiled successfully)
3. **Master Verification Suite**:
   - Command: `npm test`
   - Result: **Passed (51 corpus cases + 7 mutation tests executed)**

---

## 6. Honest Known Limitations

While the engine reliably catches 85.4% of submitted competitive programming bugs and achieves 100% precision with 0 false positives, the following limitations remain:

1. **Higher-Order State Interaction Bugs in Complex DP**:
   - For multi-dimensional dynamic programming problems (e.g. 3D DP or complex bitmask transitions), static regex heuristics cannot fully deduce state transition equations without dynamic symbolic execution or trace logging.
2. **Hidden Amortized Complexity vs Strict Worst-Case**:
   - An algorithm that is $O(N)$ amortized (e.g., resizing dynamic array or disjoint set union with path compression) might show brief timing spikes during empirical stress tests without actually having an asymptotic failure.
3. **VM Environment Limitations**:
   - The Node.js VM sandbox runs in a shared thread pool; severe memory allocation abuse (e.g. `new Array(1e9)`) relies on Node.js heap limits rather than hard OS cgroup container boundaries.
