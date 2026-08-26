# Praxis Failure Intelligence Engine — Phase 4 Reality Audit

Live verification of every stage along the real user execution path (`User UI → API → Engine → UI`).

---

## 1. End-to-End Execution Trace

```text
1. USER SUBMISSION (UI)
   │  User submits code in IDE/Problem view
   ▼
2. API ROUTE (/api/behavior-insights/generate-tests & /api/submissions/analyze)
   │  Extracts code, problemSlug, language
   │  Directly calls analyzeSubmission()
   ▼
3. CANONICAL PROBLEM CONTRACT RESOLUTION (contracts/contract-extractor.ts)
   │  Extracts function signature, types, executionMode ('in_place' vs 'return_value')
   ▼
4. ORACLE SUPPORT CLASSIFICATION (oracles/oracle-support.ts)
   │  Categorizes ground truth reliability:
   │  FULL_ORACLE_SUPPORT | PARTIAL_ORACLE_SUPPORT | PROPERTY_BASED_SUPPORT | NO_RELIABLE_ORACLE
   ▼
5. APPROACH CLASSIFICATION (analysis/approach-classifier.ts)
   │  Classifies algorithmic strategy (Two Pointers, Sliding Window, DP, Stack, Hash Map, etc.)
   ▼
6. DYNAMIC DETECTOR REGISTRY FILTERING (analysis/detector-registry.ts)
   │  Selects relevant static detectors based on contract, topics, and classified approach
   │  Emits AnalysisEvidence[] (tagged as POTENTIAL with staticConfidence)
   ▼
7. FAILURE-DRIVEN TEST OBJECTIVES (objectives/test-objective-builder.ts)
   │  Builds concrete failure objectives with requiredProperties and failureMechanism
   ▼
8. HYBRID CANDIDATE POOL GENERATION (generation/candidate-generator.ts)
   │  Deterministic edge generators + 14-rule constrained Groq synthesis
   │  Contract validation + structural equivalence diversity selection
   ▼
9. DUAL VM EXECUTION SANDBOX (execution/oracle-executor.ts & user-executor.ts)
   │  Independent Reference Oracle computes expected output
   │  User code executes in Node.js VM context with deep cloned arguments
   │  ResultComparator classifies distinct ExecutionVerdict (PASSED, WRONG_ANSWER, TIME_LIMIT, RUNTIME_ERROR)
   ▼
10. 3X REPRODUCIBILITY VALIDATION & MINIMIZATION (execution/reproducibility-validator.ts & minimizer.ts)
    │  If failing: reruns 3x to ensure non-flaky deterministic failure
    │  Iteratively shrinks failing inputs while preserving failure verdict
    ▼
11. EMPIRICAL SCALING & COMPLEXITY BENCHMARK (execution/scaling-evaluator.ts)
    │  Executes controlled input scaling (N = 500 → 1500 → 3000)
    │  Estimates extrapolated constraint scale (N = 10^5)
    ▼
12. FAILURE MECHANISM COVERAGE (analysis/failure-mechanisms.ts)
    │  Calculates explored vs unexplored canonical domain failure mechanisms
    ▼
13. VERDICT INTERPRETATION & ASSESSMENT TRIPLET (intelligence-pipeline.ts)
    │  Correctness: DEFECT_CONFIRMED | NO_DEFECT_FOUND | INCONCLUSIVE
    │  Performance: WITHIN_EXPECTATION | AT_RISK | LIKELY_LIMIT_EXCEEDED | LIMIT_EXCEEDED
    │  Coverage: %
    ▼
14. FAILURE INTELLIGENCE UI (components/intelligence/)
    │  Displays truthful observation, health score, 3/3 reproducible counterexample, scaling notices
```

---

## 2. Component Production Audit

| Component | File Path | Production Status | Consumed by UI |
|---|---|---|---|
| Contract Extractor | `src/lib/intelligence/contracts/contract-extractor.ts` | **Active & Live** | Yes (parameters, mode) |
| Oracle Support | `src/lib/intelligence/oracles/oracle-support.ts` | **Active & Live** | Yes (Oracle support badge) |
| Approach Classifier | `src/lib/intelligence/analysis/approach-classifier.ts` | **Active & Live** | Yes (Approach name, proof) |
| Detector Registry | `src/lib/intelligence/analysis/detector-registry.ts` | **Active & Live** | Yes (Filtered evidence) |
| Test Objective Builder | `src/lib/intelligence/objectives/test-objective-builder.ts` | **Active & Live** | Yes (Objectives tab) |
| Candidate Selector | `src/lib/intelligence/generation/candidate-selector.ts` | **Active & Live** | Yes (Diverse candidate suite) |
| User Executor (VM) | `src/lib/intelligence/execution/user-executor.ts` | **Active & Live** | Yes (User output, runtime) |
| Oracle Executor | `src/lib/intelligence/execution/oracle-executor.ts` | **Active & Live** | Yes (Expected output) |
| Reproducibility Validator | `src/lib/intelligence/execution/reproducibility-validator.ts` | **Active & Live** | Yes (3/3 badge) |
| Counterexample Minimizer | `src/lib/intelligence/generation/counterexample-minimizer.ts` | **Active & Live** | Yes (Minimal proof display) |
| Scaling Evaluator | `src/lib/intelligence/execution/scaling-evaluator.ts` | **Active & Live** | Yes (Scaling warning card) |
| Failure Mechanism Engine | `src/lib/intelligence/analysis/failure-mechanisms.ts` | **Active & Live** | Yes (Tested mechanisms) |
