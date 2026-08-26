# Praxis Failure Intelligence Engine — Phase 2 Mutation Testing Report

Results from automated syntactic mutation testing on known correct reference algorithms.

---

## 1. Mutation Testing Methodology

Mutations were systematically injected into known correct implementations of `binary-search`, `move-zeroes`, `two-sum`, and `sort-colors`.

The pipeline was executed against each mutant. A mutant is classified as **MUTANT_KILLED** if and only if Praxis generates an empirical failing test case that exposes a defect against the independent Reference Oracle.

---

## 2. Injected Mutants and Results

| Target Problem | Injected Mutation Type | Original Source Code | Mutated Source Code | Verdict |
|---|---|---|---|---|
| `binary-search` | `INVERT_LESS_EQUAL_TO_LESS` | `while (left <= right)` | `while (left < right)` | **MUTANT_KILLED** |
| `binary-search` | `OMIT_POINTER_INCREMENT` | `left = mid + 1` | `left = mid` | **MUTANT_KILLED** |
| `binary-search` | `OMIT_POINTER_DECREMENT` | `right = mid - 1` | `right = mid` | **MUTANT_KILLED** |
| `move-zeroes` | `OFF_BY_ONE_LOOP_BOUND` | `i < nums.length` | `i < nums.length - 1` | **MUTANT_KILLED** |
| `two-sum` | `ARITHMETIC_POLARITY_INVERSION` | `target - nums[i]` | `target + nums[i]` | **MUTANT_KILLED** |
| `sort-colors` | `STRICT_PARTITION_BOUNDARY` | `mid <= high` | `mid < high` | **MUTANT_KILLED** |
| `sort-colors` | `POINTER_ADVANCE_MUTATION` | `low++; mid++;` | `low++;` | **MUTANT_KILLED** |

---

## 3. Summary Mutation Score

- **Total Injected Mutants**: `7`
- **Mutants Detected (Killed)**: `7`
- **Mutants Survived**: `0`
- **Mutation Score**: **100.0%**
