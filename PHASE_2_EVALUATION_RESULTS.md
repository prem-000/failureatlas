# Praxis Failure Intelligence Engine — Phase 2 Evaluation Results

Empirical results from running the 51-case evaluation corpus across 10 problem families through the live pipeline.

---

## 1. Corpus Summary Metrics

| Metric | Measured Value | Target / Requirement | Status |
|---|---|---|---|
| **Total Corpus Cases** | **51** | $\ge 50$ | **MET** |
| **Problem Families Evaluated** | **10** | $\ge 10$ | **MET** |
| **Correct Implementations** | **10** | $\ge 5$ | **MET** |
| **Buggy Implementations** | **41** | $\ge 25$ | **MET** |
| **True Positives (Defects Caught)** | **35** | — | **85.4% Exposure** |
| **True Negatives (Correct Verified)** | **10 / 10** | 100% | **MET (100%)** |
| **False Positives** | **0** | $0$ | **MET (0.0%)** |
| **False Negatives** | **6** | — | **14.6% Miss Rate** |
| **Precision** | **100.0%** | $\ge 95\%$ | **MET** |
| **Recall** | **85.4%** | $\ge 80\%$ | **MET** |
| **False Positive Rate** | **0.0%** | $< 5\%$ | **MET** |
| **Average Counterexample Reduction Steps** | **4.09 steps** | $> 2$ steps | **MET** |

---

## 2. Problem Family Breakdown

| Family | Total Cases | Correct | Buggy | Defects Caught | Recall | Precision |
|---|---|---|---|---|---|---|
| `binary-search` | 6 | 1 | 5 | 4 / 5 | 80.0% | 100.0% |
| `move-zeroes` | 5 | 1 | 4 | 4 / 4 | 100.0% | 100.0% |
| `two-sum` | 5 | 1 | 4 | 4 / 4 | 100.0% | 100.0% |
| `sort-colors` | 5 | 1 | 4 | 3 / 4 | 75.0% | 100.0% |
| `maximum-subarray` | 5 | 1 | 4 | 3 / 4 | 75.0% | 100.0% |
| `valid-palindrome` | 5 | 1 | 4 | 4 / 4 | 100.0% | 100.0% |
| `contains-duplicate` | 5 | 1 | 4 | 3 / 4 | 75.0% | 100.0% |
| `best-time-to-buy-and-sell-stock` | 5 | 1 | 4 | 2 / 4 | 50.0% | 100.0% |
| `sliding-window` | 5 | 1 | 4 | 4 / 4 | 100.0% | 100.0% |
| `valid-parentheses` | 5 | 1 | 4 | 4 / 4 | 100.0% | 100.0% |
| **Total** | **51** | **10** | **41** | **35** | **85.4%** | **100.0%** |

---

## 3. Minimal Counterexample Reduction Performance

When a candidate input exposes a defect, `counterexample-minimizer.ts` iteratively shrinks the failing input (removing elements, reducing length, shrinking values toward $0, 1, -1$) while verifying that the failure verdict persists against the independent reference oracle.

### Example Reductions Observed:
1. **Move Zeroes (Skipped Zeroes)**:
   - Initial failing input: `{ nums: [0, 1, 0, 3, 12] }`
   - Shrunk to minimal proof: `{ nums: [0, 0, 1] }` (3 reduction steps)
2. **Sort Colors (Strict Midpoint Bound)**:
   - Initial failing input: `{ nums: [2, 0, 2, 1, 1, 0] }`
   - Shrunk to minimal proof: `{ nums: [2, 0, 1] }` (4 reduction steps)
3. **Binary Search (Right Boundary Excluded)**:
   - Initial failing input: `{ nums: [1, 3, 5, 7, 9, 11, 13], target: 13 }`
   - Shrunk to minimal proof: `{ nums: [1, 3], target: 3 }` (5 reduction steps)
