# Praxis Failure Intelligence Engine — Phase 2 Reality Audit

Audit performed on the actual codebase to verify real vs mock/fallback logic before Phase 2 implementation.

---

## 1. Component Audit Table

| Planned Component | Actual File | Actually Used? | Consumers | Status |
|---|---|---|---|---|
| **Problem Contract Types** | `src/lib/intelligence/contracts/problem-contract.ts` | **YES** | `contract-registry.ts`, `contract-extractor.ts`, `contract-validator.ts`, pipeline | **REAL** — Pure TypeScript interface defining parameters, types, invariants, and execution mode. |
| **Contract Registry** | `src/lib/intelligence/contracts/contract-registry.ts` | **YES** | `contract-extractor.ts` | **REAL** — Contains seeded canonical contracts for standard problems (`move-zeroes`, `two-sum`, `binary-search`, etc.). |
| **Contract Extractor** | `src/lib/intelligence/contracts/contract-extractor.ts` | **YES** | `intelligence-pipeline.ts` | **REAL** — Checks registry then parses AST/code signature dynamically. |
| **Contract Validator** | `src/lib/intelligence/contracts/contract-validator.ts` | **YES** | `candidate-generator.ts` | **REAL** — Enforces parameter names/types and rejects hallucinated parameters. |
| **Reference Oracles** | `src/lib/intelligence/oracles/reference-oracles.ts` | **YES** | `oracle-executor.ts` | **REAL** — Pure deterministic reference algorithms for return-value and in-place problems. |
| **User Code VM Sandbox** | `src/lib/intelligence/execution/user-executor.ts` | **YES** | `intelligence-pipeline.ts` | **REAL** — Node.js `vm` sandbox executing user code with in-place mutation cloning. |
| **Oracle VM Executor** | `src/lib/intelligence/execution/oracle-executor.ts` | **YES** | `intelligence-pipeline.ts` | **REAL** — Executes reference oracles to compute ground truth expected output. |
| **Result Comparator** | `src/lib/intelligence/execution/result-comparator.ts` | **YES** | `intelligence-pipeline.ts` | **REAL** — Deep equality comparison. *Needs enhancement in Phase 2 for separate TLE / Runtime / Wrong Answer verdicts.* |
| **Execution Normalizer** | `src/lib/intelligence/execution/execution-normalizer.ts` | **YES** | `intelligence-pipeline.ts`, UI | **REAL** — String formatting for inputs and outputs. |
| **Static Analyzers** | `src/lib/intelligence/analysis/core-analyzer.ts` | **YES** | `intelligence-pipeline.ts` | **PARTIAL** — Currently runs hardcoded list of 7 detectors. *Needs dynamic Detector Registry and Approach Classifier.* |
| **Individual Detectors** | `src/lib/intelligence/analysis/detectors/*` | **YES** | `core-analyzer.ts` | **REAL** — Concrete rule detectors (`binary-search.ts`, `boundary.ts`, `mutation.ts`, etc.). |
| **Test Objective Builder** | `src/lib/intelligence/objectives/test-objective-builder.ts` | **YES** | `intelligence-pipeline.ts` | **PARTIAL** — Converts evidence to objectives. *Needs failure-mechanism, requiredProperties, and forbiddenProperties.* |
| **Candidate Generator** | `src/lib/intelligence/generation/candidate-generator.ts` | **YES** | `intelligence-pipeline.ts` | **REAL** — Merges deterministic pools and Groq candidates with quality scoring. |
| **Deterministic Generators** | `src/lib/intelligence/generation/deterministic/*` | **YES** | `candidate-generator.ts` | **REAL** — Boundary, duplicate, ordering, and target generators. |
| **Groq Synthesizer** | `src/lib/intelligence/generation/groq-synthesizer.ts` | **YES** | `candidate-generator.ts` | **REAL** — Calls Groq with structured prompt and deterministic deduplication. |
| **Evidence Lifecycle** | `src/lib/intelligence/interpretation/evidence-lifecycle.ts` | **YES** | `intelligence-pipeline.ts` | **REAL** — State transitions: `POTENTIAL` $\rightarrow$ `CONFIRMED` / `REJECTED` / `INCONCLUSIVE`. |
| **Health Scorer** | `src/lib/intelligence/interpretation/health-scorer.ts` | **YES** | `intelligence-pipeline.ts` | **PARTIAL** — Real 2-layer scoring. *Needs separate Analysis Coverage metric and calibrated confidence.* |
| **Result Interpreter** | `src/lib/intelligence/interpretation/result-interpreter.ts` | **YES** | `intelligence-pipeline.ts` | **REAL** — Generates Primary Observation. |
| **Single Pipeline** | `src/lib/intelligence/intelligence-pipeline.ts` | **YES** | API routes (`generate-tests`, `judge-repair`) | **REAL** — Primary orchestrator `analyzeSubmission()`. |
| **Master UI View** | `src/components/intelligence/FailureIntelligenceView.tsx` | **YES** | `src/app/problems/[id]/page.tsx` | **REAL** — Renders Header cards and 4 navigation tabs (`Overview`, `Evidence`, `Test Cases`, `Insights`). |

---

## 2. Identified Deficiencies & Phase 2 Requirements

1. **Static Analysis is Hardcoded**: `core-analyzer.ts` runs all detectors sequentially regardless of problem domain or detected algorithmic strategy.
2. **Missing Approach Classification**: Approaches (Two Pointers, Sliding Window, DP, Stack, etc.) are detected only via simple regex instead of a multi-signal approach classifier.
3. **No Minimal Counterexample Search**: When a large input fails, the full failing input is shown rather than reducing it to a minimal counterexample.
4. **Verdict Mixing**: Time Limit Exceeded (performance) and Wrong Answer (correctness) are currently merged into `EXPOSED_ISSUE`.
5. **No Independent Coverage Score**: Code health is displayed out of 100, but Analysis Coverage (% of domain/constraint space analyzed) is not tracked separately.
6. **Limited Validation Corpus**: Engine was verified against a 5-case test script rather than a comprehensive 50+ problem corpus with mutation testing.
