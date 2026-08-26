# Praxis — Failure Intelligence Engine Implementation & Architecture Report

An evidence-driven competitive programming analysis engine that explains what in submitted code is weak, why it is weak, and generates targeted test cases via an independent reference oracle to verify or reject hypotheses.

---

## 1. Executive Summary & Core Principle

$$\text{SUBMITTED CODE} \longrightarrow \text{CONTRACT} \longrightarrow \text{STATIC SIGNALS} \longrightarrow \text{POTENTIAL EVIDENCE} \longrightarrow \text{HYPOTHESES} \longrightarrow \text{TEST OBJECTIVES} \longrightarrow \text{DUAL EXECUTION} \longrightarrow \text{CONFIRMED DEFECT / REJECTED}$$

### Non-Negotiable Core Rules Implemented:
1. **User code is NEVER the oracle**: Ground truth `expectedOutput` is derived exclusively from independent reference oracles and property-based evaluators. User code output is strictly `userOutput` (Actual).
2. **Zero Hallucinated Parameters**: All candidate inputs must strictly conform to the `ProblemContract` parameter list and types (e.g. `moveZeroes` contract enforces `nums: number[]` with `in_place` mutation and rejects extraneous parameters like `target`).
3. **Static Analysis is Not Proof**: Static findings are tagged as `POTENTIAL`. They only become `CONFIRMED` if a reproducible counterexample fails against the oracle during VM execution.
4. **Groq Synthesizes Candidates, Never Decides Correctness**: Groq is fed structured context (Contract, Evidence, Objectives) to synthesize candidate edge cases. Groq never decides correctness, expected output, or score metrics.

---

## 2. Completed Architecture Blueprint

```
src/lib/intelligence/
│
├── contracts/
│   ├── problem-contract.ts          # ProblemContract, ProblemParameter, ExecutionMode
│   ├── contract-registry.ts         # Pre-configured canonical contracts
│   ├── contract-extractor.ts        # Dynamic contract synthesizer for un-cached problems
│   └── contract-validator.ts        # Enforces parameter names, types, and constraints
│
├── oracles/
│   └── reference-oracles.ts         # Independent ground truth algorithms (return & in-place)
│
├── execution/
│   ├── user-executor.ts             # VM sandbox execution with in-place mutation cloning
│   ├── oracle-executor.ts           # Reference oracle execution
│   ├── execution-normalizer.ts      # Input/output formatting & normalization
│   └── result-comparator.ts         # Deep equality comparator & verdict generator
│
├── analysis/
│   ├── core-analyzer.ts             # Static code analysis coordinator
│   ├── evidence-engine.ts           # AnalysisEvidence model and categories
│   └── detectors/
│       ├── binary-search.ts         # BINARY_SEARCH_TERMINATION_RULE
│       ├── boundary.ts              # EMPTY_INPUT_GUARD_RULE, SINGLE_ELEMENT_INDEX_RULE
│       ├── sliding-window.ts        # SLIDING_WINDOW_RECOMPUTE_RULE
│       ├── complexity.ts            # QUADRATIC_OVER_LARGE_N_RULE
│       ├── map.ts                   # MAP_KEY_COLLISION_RULE
│       ├── mutation.ts              # IN_PLACE_MUTATION_INDEX_RULE
│       └── overflow.ts              # INTEGER_OVERFLOW_RULE
│
├── objectives/
│   └── test-objective-builder.ts    # Transforms Evidence into TestObjective[]
│
├── generation/
│   ├── candidate-generator.ts       # Coordinates deterministic pools & Groq synthesis
│   ├── deterministic/
│   │   ├── boundary-generators.ts   # Empty, single-element, min/max bounds
│   │   ├── duplicate-generators.ts  # All-same, adjacent duplicates, alternating
│   │   ├── ordering-generators.ts   # Ascending, descending, partitioned
│   │   └── target-generators.ts     # Target first, target last, target absent
│   └── groq-synthesizer.ts          # Constrained LLM synthesizer for multi-condition cases
│
├── interpretation/
│   ├── evidence-lifecycle.ts        # Manages POTENTIAL -> CONFIRMED / REJECTED / INCONCLUSIVE
│   ├── health-scorer.ts             # 2-layer scoring: Verified Defect Impact + Residual Risk
│   └── result-interpreter.ts        # Synthesizes Primary Observation and report
│
├── types.ts                         # Core TypeScript interfaces for reports & test cases
└── intelligence-pipeline.ts         # Single unified entry point: analyzeSubmission()
```

```
src/components/intelligence/
│
├── FailureIntelligenceView.tsx       # Main container managing the 4 tabs
│
├── Header/
│   ├── SubmissionAnalysisCard.tsx    # Approach, estimated complexity, status badge
│   └── OverallHealthCard.tsx         # Circular Code Health score gauge (0 to 100)
│
├── OverviewTab.tsx                   # 5 Dimension health bars, Primary Observation, stats
│
├── EvidenceTab/
│   ├── EvidenceTab.tsx               # Evidence list container
│   ├── EvidenceCard.tsx              # Card with detector ID, snippet, hypothesis, lifecycle badge
│   └── SourceSnippet.tsx             # Highlighted code snippet with line numbers
│
├── TestCasesTab/
│   ├── TestCasesTab.tsx              # Test cases grouped by purpose
│   ├── TestGroup.tsx                 # Collapsible group with pass/fail counts
│   └── VerifiedTestCard.tsx          # Input, Expected (Oracle), User Output, Status badge, Evidence link
│
└── InsightsTab/
    ├── InsightsTab.tsx               # Root cause analysis, learning prescription, practice
    ├── RootCauseCard.tsx             # Connects confirmed evidence to systemic concepts
    ├── LearningPrescription.tsx      # Step-by-step remediation guide
    └── PracticeRecommendation.tsx    # Recommended follow-up problems
```

---

## 3. Evidence Lifecycle States

| Status | Meaning | Transition Condition |
|---|---|---|
| `POTENTIAL` | Static signal detected by a rule detector | Initial state before empirical verification. |
| `TESTED` | Targeted tests generated and executed | Awaiting evaluation against the oracle. |
| `CONFIRMED` | **Confirmed Defect** | Targeted test produces output mismatch vs Reference Oracle. |
| `REJECTED` | **Tests Passed / Unproven** | All targeted boundary/duplicate/stress tests pass. |
| `INCONCLUSIVE` | Inconclusive | Execution timed out (>1500ms) or runtime environment unavailable. |

---

## 4. Two-Layer Code Health Scoring Model

$$\text{Category Risk} = \text{Verified Defect Impact} + \text{Residual Unverified Risk}$$

Where:
$$\text{Verified Defect Impact} = \min\left(80, \sum_{e \in \text{CONFIRMED}} (e.\text{severity} \times 35)\right)$$
$$\text{Residual Unverified Risk} = \min\left(20, \sum_{e \in \text{POTENTIAL}} (e.\text{severity} \times e.\text{confidence} \times 8)\right)$$
$$\text{Final Category Health} = \max(0, 100 - \text{Category Risk})$$
$$\text{Overall Code Health} = \sum_{c \in \text{Categories}} W_c \cdot \text{Final Category Health}_c$$

Dimensions evaluated:
1. **Boundary Reasoning** ($W = 0.25$)
2. **Algorithm Correctness** ($W = 0.25$)
3. **Complexity Safety** ($W = 0.15$)
4. **Data Structure Usage** ($W = 0.15$)
5. **Implementation Precision** ($W = 0.20$)

---

## 5. Verification Results

### A. Problem Contract Enforcement
- `moveZeroes` contract enforces `nums: number[]` and `in_place` mutation mode.
- Valid input `{ nums: [0, 1, 0, 3, 12] }` $\rightarrow$ Accepted.
- Invalid input `{ nums: [0, 1], target: 0 }` $\rightarrow$ Rejected (`Hallucinated parameter 'target' not in problem contract [nums]`).

### B. In-Place Execution & Reference Oracle
- Input `{ nums: [0, 1, 0, 3, 12] }` passed into `moveZeroes`.
- Oracle captured mutated array `[1, 3, 12, 0, 0]` and NOT `undefined`.

### C. Oracle Independence with Buggy User Code
- Buggy `moveZeroes` with `.splice(i, 1)` without `i--` executed on `{ nums: [0, 0, 1] }`.
- Reference Oracle Output: `[1, 0, 0]`.
- Buggy User Output: `[0, 1, 0]`.
- Result: `EXPOSED_ISSUE`.
- Ground truth `expectedOutput` remained strictly `[1, 0, 0]` and was not overwritten.

### D. End-to-End Traceability Chain on Buggy Solutions
1. **Move Zeroes (Skipped Consecutive Zeroes)**:
   - Line 5: `IN_PLACE_MUTATION_INDEX_RULE`
   - Initial status: `POTENTIAL` $\rightarrow$ `CONFIRMED`
   - Primary Observation: *"Your overall Array Traversal approach is structurally sound, but a verified defect was confirmed at line 5: In-place `.splice()` alters the array length during iteration without decrementing the loop index. Target test cases confirmed this hypothesis (e.g. input: `nums = [0,0,1]`)."*
2. **Binary Search (Strict Inequality `while (left < right)`)**:
   - Line 4: `BINARY_SEARCH_TERMINATION_RULE`
   - Initial status: `POTENTIAL` $\rightarrow$ `CONFIRMED` on `nums = [1,3,5,7], target = 7` (Oracle expected `3`, user returned `-1`).

### E. Build & Type Checking
- `npm run type-check`: `0 errors` (Next.js app & extension).
- `npx next build`: `0 errors` (All 40 routes and pages compiled successfully).
