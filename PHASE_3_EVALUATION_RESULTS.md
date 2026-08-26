# Praxis Failure Intelligence Engine — Phase 3 Evaluation Results

Results from the 51-case evaluation corpus across 10 problem families with Failure Mechanism Coverage and Performance Assessment.

---

## 1. Corpus Summary Metrics

| Metric | Phase 2 Baseline | Phase 3 Measured | Delta / Improvement | Status |
|---|---|---|---|---|
| **Total Corpus Cases** | 51 | **51** | — | **MET** |
| **Problem Families** | 10 | **10** | — | **MET** |
| **Correct Solutions** | 10 | **11** | +1 (Brute force separated) | **MET** |
| **Buggy Solutions** | 41 | **40** | — | **MET** |
| **True Positives (Defects Exposed)** | 35 | **36** | +1 | **90.0% Recall** |
| **True Negatives (Correct Verified)** | 10 / 10 | **11 / 11** | +1 | **100.0%** |
| **False Positives** | 0 (0.0%) | **0 (0.0%)** | 0.0% | **MET (Zero False Positives)** |
| **False Negatives** | 6 (14.6%) | **4 (10.0%)** | -2 | **MET** |
| **Precision** | 100.0% | **100.0%** | 0.0% | **MET (100.0%)** |
| **Recall** | 85.4% | **90.0%** | **+4.6%** | **MET (90.0%)** |
| **Mutation Score** | 100.0% | **100.0%** | 0.0% | **MET (100.0%)** |
| **Avg Counterexample Reduction Steps** | 4.09 steps | **4.24 steps** | +0.15 | **MET** |

---

## 2. Problem Family Breakdown

| Family | Total Cases | Correct | Buggy | Defects Caught | Recall | Precision | Mechanism Coverage |
|---|---|---|---|---|---|---|---|
| `binary-search` | 6 | 1 | 5 | 5 / 5 | 100.0% | 100.0% | 89% |
| `move-zeroes` | 5 | 1 | 4 | 4 / 4 | 100.0% | 100.0% | 83% |
| `two-sum` | 5 | 2 | 3 | 3 / 3 | 100.0% | 100.0% | 80% |
| `sort-colors` | 5 | 1 | 4 | 3 / 4 | 75.0% | 100.0% | 80% |
| `maximum-subarray` | 5 | 1 | 4 | 4 / 4 | 100.0% | 100.0% | 80% |
| `valid-palindrome` | 5 | 1 | 4 | 4 / 4 | 100.0% | 100.0% | 80% |
| `contains-duplicate` | 5 | 1 | 4 | 3 / 4 | 75.0% | 100.0% | 80% |
| `best-time-to-buy-and-sell-stock` | 5 | 1 | 4 | 2 / 4 | 50.0% | 100.0% | 80% |
| `sliding-window` | 5 | 1 | 4 | 4 / 4 | 100.0% | 100.0% | 80% |
| `valid-parentheses` | 5 | 1 | 4 | 4 / 4 | 100.0% | 100.0% | 80% |
| **Total** | **51** | **11** | **40** | **36** | **90.0%** | **100.0%** | **82% Average** |
