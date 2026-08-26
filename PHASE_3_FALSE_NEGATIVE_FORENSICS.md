# Praxis Failure Intelligence Engine — Phase 3 False Negative Forensics

Detailed forensic investigation of the 6 false negatives from the Phase 2 Evaluation Corpus.

---

## 1. Forensics Summary Table

| Case ID | Problem | Claimed Bug Description | Actual Pipeline Status | Root Cause Classification | Remediation Plan |
|---|---|---|---|---|---|
| **`BS-BUGGY-4`** | `binary-search` | `right = nums.length` (out of bounds initial index) | In JS runtime, `nums[length]` returns `undefined`, which safely evaluated to `false` on `<` and accidentally returned `-1`. | **ENVIRONMENT / BOUNDARY MASKING** | Test single-element absent targets and strict index bounds. |
| **`SC-BUGGY-2`** | `sort-colors` | Increments `mid` after swapping with `high` | Did not fail on `[2, 0, 1]` because second swap compensated. | **GENERATOR_GAP** | Input `{ nums: [1, 2, 0] }` or `{ nums: [2, 2, 0] }` directly exposes skipped unexamined elements. |
| **`MS-BUGGY-2`** | `maximum-subarray` | `cur` reset to `0` when negative | Mathematical equivalence: resetting `cur` to 0 after `max` comparison is functionally identical to Kadane's algorithm on all non-empty arrays. | **NOT A DEFECT (EQUIVALENT ALGORITHM)** | Update corpus with genuine Kadane bug (resetting `cur = 0` *before* `max` update). |
| **`CD-BUGGY-1`** | `contains-duplicate` | Loop goes to `nums.length` accessing `nums[i + 1]` | In JS, `nums[length - 1] === undefined` is false, so it produced correct boolean answers for all numerical arrays. | **NOT A DEFECT IN JS (INDEX SAFE)** | Update corpus with genuine sorting bug (lexicographical default `.sort()`). |
| **`BS-STOCK-BUGGY-3`** | `best-time-to-buy-and-sell-stock` | `maxP` initialized to `-Infinity` | Loop starts at `i = 1`. For arrays of length 1 (`prices = [5]`), loop never executes and function returns `-Infinity` instead of `0`. | **GENERATOR_GAP (SINGLE ELEMENT BOUNDARY)** | Ensure single-element boundary inputs `{ prices: [5] }` are executed. |
| **`BS-STOCK-BUGGY-4`** | `best-time-to-buy-and-sell-stock` | Nested loop $O(N^2)$ brute force | Logically correct on all small inputs; fails asymptotic time limit under constraints ($N \le 10^5$). | **PERFORMANCE / COMPLEXITY DEFECT (NOT WRONG ANSWER)** | Separate Correctness (`VERIFIED`) from Performance (`AT_RISK` / `TIME_LIMIT_EXCEEDED`). |

---

## 2. Deep-Dive Forensic Profiles

### Case 1: `BS-BUGGY-4` (Binary Search Initial Right Pointer `length` vs `length - 1`)
- **Submitted Code**:
  ```javascript
  function search(nums, target) {
    let left = 0, right = nums.length;
    while (left <= right) {
      let mid = Math.floor((left + right) / 2);
      if (nums[mid] === target) return mid;
      if (nums[mid] < target) left = mid + 1;
      else right = mid - 1;
    }
    return -1;
  }
  ```
- **Why it Passed**: In JavaScript, accessing `nums[nums.length]` yields `undefined`. The comparisons `undefined === target` and `undefined < target` both evaluate to `false`, branching into `else { right = mid - 1; }`. This happened to converge to `-1`, masking the out-of-bounds access.
- **Root Cause**: `ENVIRONMENT / BOUNDARY MASKING`.

---

### Case 2: `SC-BUGGY-2` (Sort Colors `mid++` after High Swap)
- **Submitted Code**:
  ```javascript
  function sortColors(nums) {
    let low = 0, mid = 0, high = nums.length - 1;
    while (mid <= high) {
      if (nums[mid] === 0) {
        [nums[low], nums[mid]] = [nums[mid], nums[low]];
        low++; mid++;
      } else if (nums[mid] === 1) {
        mid++;
      } else {
        [nums[mid], nums[high]] = [nums[high], nums[mid]];
        high--;
        mid++; // Bug: unexamined swapped element skipped
      }
    }
  }
  ```
- **Why it Passed on `[2, 0, 1]`**: On `[2, 0, 1]`, swapping `nums[0]` with `nums[2]` creates `[1, 0, 2]`. Then `nums[1] = 0` was swapped with `nums[0]`, accidentally yielding `[0, 1, 2]`.
- **Failing Counterexample**: `nums = [1, 2, 0]`. On `[1, 2, 0]`, `nums[1]` (2) swaps with `nums[2]` (0) $\rightarrow$ `[1, 0, 2]`. `high` becomes 1, `mid` increments to 2 $\rightarrow$ loop terminates leaving `[1, 0, 2]`!
- **Root Cause**: `GENERATOR_GAP`.

---

### Case 3: `MS-BUGGY-2` (Maximum Subarray Order of Reset)
- **Submitted Code**:
  ```javascript
  function maxSubArray(nums) {
    let max = -Infinity, cur = 0;
    for (let i = 0; i < nums.length; i++) {
      cur += nums[i];
      if (cur > max) max = cur;
      if (cur < 0) cur = 0;
    }
    return max === -Infinity ? 0 : max;
  }
  ```
- **Why it Passed**: For all non-empty arrays, `cur += nums[i]` followed by `if (cur > max) max = cur; if (cur < 0) cur = 0;` is mathematically equivalent to standard Kadane's algorithm.
- **Root Cause**: `NOT A DEFECT (EQUIVALENT ALGORITHM)`.
- **Fix**: Replace with genuine Kadane bug where `if (cur < 0) cur = 0` occurs *before* `if (cur > max) max = cur`.

---

### Case 4: `CD-BUGGY-1` (Contains Duplicate Loop Range)
- **Submitted Code**:
  ```javascript
  function containsDuplicate(nums) {
    nums.sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] === nums[i + 1]) return true;
    }
    return false;
  }
  ```
- **Why it Passed**: On `i = nums.length - 1`, `nums[i + 1]` is `undefined`. Since `nums[i] === undefined` is false, it returns `false` correctly for unique arrays.
- **Root Cause**: `NOT A DEFECT IN JS`.
- **Fix**: Replace with genuine sorting flaw (e.g. `nums.sort()` without comparator, which sorts `[1, 2, 10]` as `[1, 10, 2]`).

---

### Case 5: `BS-STOCK-BUGGY-3` (Stock Profit Negative Initializer)
- **Submitted Code**:
  ```javascript
  function maxProfit(prices) {
    let minPrice = prices[0], maxP = -Infinity;
    for (let i = 1; i < prices.length; i++) {
      minPrice = Math.min(minPrice, prices[i]);
      maxP = Math.max(maxP, prices[i] - minPrice);
    }
    return maxP;
  }
  ```
- **Why it Passed**: On decreasing arrays `[5, 4, 3]`, `maxP` is updated to `0` at `i = 1`.
- **Failing Counterexample**: Single element `prices = [5]`. Loop does not execute and function returns `-Infinity` instead of `0`.
- **Root Cause**: `GENERATOR_GAP (SINGLE ELEMENT BOUNDARY)`.

---

### Case 6: `BS-STOCK-BUGGY-4` (Stock Nested Loop Brute Force)
- **Submitted Code**:
  ```javascript
  function maxProfit(prices) {
    let maxP = 0;
    for (let i = 0; i < prices.length; i++) {
      for (let j = i; j < prices.length; j++) {
        if (prices[j] - prices[i] > maxP) maxP = prices[j] - prices[i];
      }
    }
    return maxP;
  }
  ```
- **Why it Passed**: Produces correct output on small arrays. It is an asymptotic performance failure ($O(N^2)$), not a logical wrong answer.
- **Root Cause**: `PERFORMANCE / COMPLEXITY DEFECT`.
- **Fix**: Separate Correctness (`VERIFIED`) from Performance (`AT_RISK` / `TIME_LIMIT_EXCEEDED`).
