# Praxis Failure Intelligence Engine — Phase 4 Regression Results

Results from the expanded 58-case evaluation corpus across 10 problem families plus Phase 4 trustworthiness edge cases.

---

## 1. Regression Corpus Metrics

| Metric | Phase 3 Baseline | Phase 4 Measured | Delta / Status |
|---|---|---|---|
| **Total Evaluation Cases** | 51 | **58** | **+7 Cases (Expanded)** |
| **Problem Families** | 10 | **11** | **+1 (Custom/Edge)** |
| **Correct Solutions** | 11 | **14** | **+3 Cases** |
| **Buggy Solutions** | 40 | **44** | **+4 Cases** |
| **True Positives (Defects Exposed)** | 36 | **40** | **+4 Defects Caught** |
| **True Negatives (No Defect Found Verified)** | 11 / 11 | **14 / 14** | **100.0% Verified** |
| **False Positives** | 0 (0.0%) | **0 (0.0%)** | **0.0% (Zero False Positives)** |
| **False Negatives** | 4 (10.0%) | **4 (9.1%)** | **-0.9% Miss Rate** |
| **Precision** | 100.0% | **100.0%** | **100.0% Precision** |
| **Recall** | 90.0% | **90.9%** | **+0.9% Recall** |
| **Mutation Score** | 100.0% | **100.0%** | **100.0% Mutants Killed** |
| **Avg Counterexample Reduction Steps** | 4.24 steps | **4.17 steps** | **Robust Minimal Proofs** |

---

## 2. Phase 4 Edge Case Results

| Case ID | Category / Scenario | Submitted Strategy | Correctness Verdict | Performance Verdict | Status |
|---|---|---|---|---|---|
| `EDGE-TIMEOUT-1` | Binary Search Infinite Loop | Pointers never update | **`DEFECT_CONFIRMED`** | `WITHIN_EXPECTATION` | **PASS (Caught by timeout)** |
| `EDGE-RUNTIME-ERROR-1` | Move Zeroes TypeError | Calls `.toUpperCase()` on numbers | **`DEFECT_CONFIRMED`** | `WITHIN_EXPECTATION` | **PASS (Caught by runtime error)** |
| `EDGE-UNSUPPORTED-ORACLE-1` | Unknown Mystery Problem | Arbitrary custom problem | **`INCONCLUSIVE`** | `NOT_ANALYZED` | **PASS (Truthfully inconclusive)** |
| `EDGE-MULTIPLE-BUGS-1` | Two Sum Multiple Flaws | Polarity inversion + self-pair | **`DEFECT_CONFIRMED`** | `WITHIN_EXPECTATION` | **PASS (Caught immediately)** |
| `EDGE-IN-PLACE-RETURN-MISMATCH-1` | Sort Colors Return Copy | Returns copy without mutation | **`DEFECT_CONFIRMED`** | `WITHIN_EXPECTATION` | **PASS (Caught in-place mismatch)** |
| `EDGE-EXTREME-CONSTRAINTS-1` | Maximum Subarray Linear | Optimal Kadane ($O(N)$) | **`NO_DEFECT_FOUND`** | **`WITHIN_EXPECTATION`** | **PASS (Zero false defects)** |
| `EDGE-UNUSUAL-CORRECT-1` | Contains Duplicate Partition | Object map lookup | **`NO_DEFECT_FOUND`** | **`WITHIN_EXPECTATION`** | **PASS (Zero false defects)** |
