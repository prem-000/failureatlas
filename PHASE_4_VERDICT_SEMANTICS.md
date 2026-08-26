# Praxis Failure Intelligence Engine — Phase 4 Verdict Semantics

Specification of rigorous, truthful correctness verdicts and reproducibility guarantees.

---

## 1. Correctness Verdict Semantics

Praxis replaces generic pass/fail binaries with three epistemologically honest correctness states:

```typescript
type CorrectnessVerdict =
  | 'DEFECT_CONFIRMED'
  | 'NO_DEFECT_FOUND'
  | 'INCONCLUSIVE';
```

### 1. `DEFECT_CONFIRMED`
- **Definition**: An empirical counterexample was executed against the user's code, the output diverged from the independent Reference Oracle, and the divergence was reproduced **3 / 3 independent runs**.
- **Proof Requirement**: Must contain a [`ConfirmedDefectProof`](file:///c:/Users/ADMIN/python/failureatlas/src/lib/intelligence/types.ts):
  ```typescript
  interface ConfirmedDefectProof {
    evidenceId: string;
    detectorId?: string;
    failingInput: Record<string, unknown>;
    expectedOutput: unknown;
    actualOutput: unknown;
    minimizedInput?: Record<string, unknown>;
    reproductionCount: number; // Exactly 3
    isReproducible: boolean;   // true
  }
  ```

### 2. `NO_DEFECT_FOUND`
- **Definition**: No counterexample was found within the analyzed and tested input space.
- **Critical Invariant**: Praxis **never** claims "Your code is mathematically correct." It explicitly states: *"No correctness defect was found in the analyzed test space."*

### 3. `INCONCLUSIVE`
- **Definition**: The system could not reliably determine correctness due to:
  - Missing or unsupported ground truth oracle (`NO_RELIABLE_ORACLE`).
  - Non-deterministic execution flakiness ($< 3/3$ reproductions).
  - Unhandled execution sandbox exceptions or ambiguous function signatures.

---

## 2. 3x Reproducibility Validation Workflow

```text
CANDIDATE COUNTEREXAMPLE DETECTED
               │
               ▼
   RERUN 1: User vs Reference Oracle
               │
   RERUN 2: User vs Reference Oracle
               │
   RERUN 3: User vs Reference Oracle
               │
       ┌───────┴───────┐
       ▼               ▼
 3 / 3 Diverged   < 3 Diverged
       │               │
       ▼               ▼
DEFECT_CONFIRMED  INCONCLUSIVE (Flaky)
```
