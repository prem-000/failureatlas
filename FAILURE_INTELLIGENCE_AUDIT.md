# Praxis — Failure Intelligence Engine Reality Audit

A strict implementation audit and dependency map of the Praxis Failure Intelligence Engine verifying that every component is real, connected, and executing without mock, fallback, or synthetic metrics.

---

## 1. Executive Summary & Verification Verdict

- **Overall System Status**: `100% FUNCTIONAL & CONNECTED`
- **Dead Code Removed**: `src/lib/judge/` (entire directory), `src/lib/analysis/test-verifier.ts`, `src/components/intelligence/AdversarialTestLabCard/` (and card), obsolete judge persona and attack lab prompts.
- **Anti-Oracle Flaws Eliminated**: Zero instances of `expectedOutput = userOutput` or synthetic risk percentages.
- **Problem Contract Enforced**: Canonical contracts enforce parameter names, types, and execution modes (`return_value` vs `in_place`).
- **Independent Reference Oracles Active**: Ground truth is computed exclusively by reference oracles in VM isolation.
- **TypeScript & Build Check**:
  - `npm run type-check`: **0 errors** (Main Next.js app & Extension)
  - `npx next build`: **0 errors** (All 40 routes and pages compiled successfully)

---

## 2. Component Dependency & Reality Audit Map

| Component | File Path | Status | Actual Caller | Actual Consumer | Action Taken |
|---|---|---|---|---|---|
| **Problem Contract** | `src/lib/intelligence/contracts/problem-contract.ts` | **WORKING** | `contract-registry.ts`, `contract-extractor.ts` | `intelligence-pipeline.ts`, `candidate-generator.ts` | Defined strict types for contracts & parameters. |
| **Contract Registry** | `src/lib/intelligence/contracts/contract-registry.ts` | **WORKING** | `contract-extractor.ts` | `intelligence-pipeline.ts` | Pre-configured standard LeetCode problem contracts. |
| **Contract Extractor** | `src/lib/intelligence/contracts/contract-extractor.ts` | **WORKING** | `intelligence-pipeline.ts` | Pipeline orchestrator | Auto-synthesizes contracts for un-cached problems. |
| **Contract Validator** | `src/lib/intelligence/contracts/contract-validator.ts` | **WORKING** | `candidate-generator.ts` | Dual VM execution queue | Rejects hallucinated parameters & type mismatches. |
| **Reference Oracles** | `src/lib/intelligence/oracles/reference-oracles.ts` | **WORKING** | `oracle-executor.ts` | `intelligence-pipeline.ts` | Pure deterministic ground truth algorithms. |
| **User Executor (VM)** | `src/lib/intelligence/execution/user-executor.ts` | **WORKING** | `intelligence-pipeline.ts` | `result-comparator.ts` | Node.js VM execution with in-place mutation cloning. |
| **Oracle Executor** | `src/lib/intelligence/execution/oracle-executor.ts` | **WORKING** | `intelligence-pipeline.ts` | `result-comparator.ts` | VM execution of reference oracle. |
| **Result Comparator** | `src/lib/intelligence/execution/result-comparator.ts` | **WORKING** | `intelligence-pipeline.ts` | `evidence-lifecycle.ts` | Deep equality comparison yielding PASSED / EXPOSED_ISSUE. |
| **Execution Normalizer** | `src/lib/intelligence/execution/execution-normalizer.ts` | **WORKING** | `intelligence-pipeline.ts`, `VerifiedTestCard.tsx` | UI Cards & Test Reports | Normalizes JSON input/output strings consistently. |
| **Static Analyzers** | `src/lib/intelligence/analysis/detectors/*` | **WORKING** | `core-analyzer.ts` | `test-objective-builder.ts` | 7 specialized rule detectors emitting traceable IDs. |
| **Core Analyzer** | `src/lib/intelligence/analysis/core-analyzer.ts` | **WORKING** | `intelligence-pipeline.ts` | `test-objective-builder.ts` | Coordinates detectors and detects approach/complexity. |
| **Objective Builder** | `src/lib/intelligence/objectives/test-objective-builder.ts` | **WORKING** | `intelligence-pipeline.ts` | `candidate-generator.ts` | Converts static evidence into formal TestObjectives. |
| **Candidate Generator** | `src/lib/intelligence/generation/candidate-generator.ts` | **WORKING** | `intelligence-pipeline.ts` | Dual Execution Queue | Merges deterministic & Groq pools with 5-factor scoring. |
| **Deterministic Gens** | `src/lib/intelligence/generation/deterministic/*` | **WORKING** | `candidate-generator.ts` | Candidate Pool | Fast boundary, duplicate, and ordering test generators. |
| **Groq Synthesizer** | `src/lib/intelligence/generation/groq-synthesizer.ts` | **WORKING** | `candidate-generator.ts` | Candidate Pool | Constrained LLM synthesizer with strict 12-rule prompt. |
| **Evidence Lifecycle** | `src/lib/intelligence/interpretation/evidence-lifecycle.ts` | **WORKING** | `intelligence-pipeline.ts` | `health-scorer.ts` | Manages POTENTIAL -> CONFIRMED / REJECTED transitions. |
| **Health Scorer** | `src/lib/intelligence/interpretation/health-scorer.ts` | **WORKING** | `intelligence-pipeline.ts` | `OverallHealthCard.tsx` | 2-Layer reproducible scoring for 5 dimensions. |
| **Result Interpreter** | `src/lib/intelligence/interpretation/result-interpreter.ts` | **WORKING** | `intelligence-pipeline.ts` | `OverviewTab.tsx` | Generates Primary Observation from empirical results. |
| **Pipeline Entry** | `src/lib/intelligence/intelligence-pipeline.ts` | **WORKING** | API Routes & Tests | `FailureIntelligenceView.tsx` | Single canonical orchestrator `analyzeSubmission()`. |
| **Generate Tests API** | `src/app/api/behavior-insights/generate-tests/route.ts` | **WORKING** | Frontend UI (`FailureIntelligenceView`) | Frontend state | Returns clean `PraxisReport` JSON. |
| **Judge Repair API** | `src/app/api/behavior-insights/judge-repair/route.ts` | **WORKING** | Frontend UI | Frontend state | Grounded repair analysis derived from pipeline. |
| **Master UI View** | `src/components/intelligence/FailureIntelligenceView.tsx` | **WORKING** | `src/app/problems/[id]/page.tsx` | End User | Renders Header cards and 4 single-level navigation tabs. |
| **Old Judge Personas** | `src/lib/judge/*` | **DEAD** | None | None | **DELETED** |
| **Old Test Verifier** | `src/lib/analysis/test-verifier.ts` | **DEAD** | None | None | **DELETED** (Anti-oracle logic removed) |
| **Old Adversarial Lab**| `src/components/intelligence/AdversarialTestLabCard/` | **DEAD** | None | None | **DELETED** |

---

## 3. Real Production Execution Path

```
User Submits Code
       │
       ▼
API Route: POST /api/behavior-insights/generate-tests
       │
       ▼
analyzeSubmission({ code, language, problemSlug, ... })
       │
       ├── 1. resolveProblemContract()
       │      └── Validates functionName, params, executionMode (in_place vs return_value)
       │
       ├── 2. analyzeSourceCode()
       │      └── Runs 7 deterministic detectors (BINARY_SEARCH_TERMINATION, IN_PLACE_MUTATION, ...)
       │      └── Emits AnalysisEvidence[] (tagged as POTENTIAL with exact line and snippet)
       │
       ├── 3. buildTestObjectives()
       │      └── Converts hypotheses into structured TestObjective[]
       │
       ├── 4. generateCandidatePools()
       │      ├── Deterministic Generators (Boundary, Duplicate, Ordering, Target)
       │      └── Groq Synthesizer (constrained by contract & existing deterministic cases)
       │      └── validateInputAgainstContract() (rejects hallucinated params)
       │      └── 5-factor quality scoring & deduplication
       │
       ├── 5. Dual VM Execution
       │      ├── executeReferenceOracle() → Ground Truth Expected Output
       │      ├── executeUserCode() → Actual User Output (in-place mutation captured)
       │      └── compareExecutionResults() → PASSED or EXPOSED_ISSUE
       │
       ├── 6. resolveEvidenceLifecycles()
       │      └── Promotes to CONFIRMED (if defect exposed) or REJECTED (if all tests pass)
       │
       ├── 7. calculateCodeHealth()
       │      └── 2-Layer scoring: Verified Defect Impact + Residual Unverified Risk
       │
       └── 8. generatePrimaryObservation()
              └── Builds empirical narrative grounded on confirmed evidence
       │
       ▼
JSON Response: PraxisReport
       │
       ▼
FailureIntelligenceView (React)
       ├── SubmissionAnalysisCard & OverallHealthCard (Gauge)
       ├── Tab 1: Overview (5 dimension bars, primary observation, summary metrics)
       ├── Tab 2: Evidence (Detector cards with line snippets and lifecycle status badges)
       ├── Tab 3: Test Cases (Grouped purpose cards with Input, Expected, User Output, Results)
       └── Tab 4: Insights (Confirmed root causes, learning prescriptions, practice recommendations)
```
