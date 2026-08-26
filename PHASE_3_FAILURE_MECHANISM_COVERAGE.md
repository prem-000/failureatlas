# Praxis Failure Intelligence Engine — Phase 3 Failure Mechanism Coverage

Specification and breakdown of formal Failure Mechanisms across competitive programming problem domains.

---

## 1. Motivation: Beyond Generic Analysis Coverage

In competitive programming, a solution should be assessed against the space of known domain failure mechanisms.

Rather than claiming a generic coverage percentage, Praxis decomposes each canonical problem domain into specific failure mechanisms and reports:
$$\text{Failure Mechanisms Tested: } M_{\text{tested}} / M_{\text{total}} \quad (\text{Coverage: } \%)$$

---

## 2. Canonical Problem Mechanism Catalogs

### 1. Binary Search (`binary-search`)
1. **Empty input collection handling**: Empty array `[]` boundary validation.
2. **Single-element array evaluation**: Arrays with $N=1$ where target matches or is absent.
3. **Target at leftmost index boundary**: Target located at index $0$.
4. **Target at rightmost index boundary**: Target located at index $N-1$.
5. **Target absent below minimum bound**: Target $< \text{nums}[0]$.
6. **Target absent above maximum bound**: Target $> \text{nums}[N-1]$.
7. **Target absent between array values**: Target within range but not present.
8. **Loop convergence termination condition**: Inclusive `<=` vs strict `<` loop condition.
9. **Midpoint index arithmetic overflow**: Direct `(left + right) / 2` overflow.

### 2. Move Zeroes (`move-zeroes`)
1. **Single-element array base case**: $N=1$ arrays (`[0]` or `[1]`).
2. **All-zero array preservation**: Arrays containing exclusively zeroes (`[0, 0, 0]`).
3. **No-zero array preservation**: Arrays containing no zeroes (`[1, 2, 3]`).
4. **Consecutive zero pointer advancement**: Adjacent zeroes (`[0, 0, 1]`) testing in-place splice pointer shifts.
5. **Trailing zeroes placement**: Trailing zeroes remaining untouched at the end.
6. **Non-zero relative ordering preservation**: Non-zero elements remain in original order.

### 3. Two Sum (`two-sum`)
1. **Minimum collection size 2 boundary**: $N=2$ base cases.
2. **Duplicate value same-index reuse**: Self-pairing prevention when $\text{target} = 2 \times \text{nums}[i]$.
3. **Distinct identical values matching target**: Pairs formed by duplicate numbers (`[3, 3]`, $\text{target} = 6$).
4. **Negative values and zero complement**: Signed arithmetic with zero sums (`[-3, 3]`, $\text{target} = 0$).
5. **Unsorted array index preservation**: Return original un-sorted indices.

### 4. Sort Colors (`sort-colors`)
1. **Single-element array base case**: $N=1$ arrays (`[0]`, `[1]`, `[2]`).
2. **All identical colors partition**: Homogeneous arrays (`[0, 0]`, `[1, 1]`, `[2, 2]`).
3. **Three-way partition convergence**: Dutch National Flag pointer invariants.
4. **Unexamined swapped element inspection**: Skipping `mid++` when swapping with `high`.
5. **Reverse sorted partition**: Reverse sorted arrays (`[2, 1, 0]`).

### 5. Maximum Subarray (`maximum-subarray`)
1. **Single-element array base case**: $N=1$ negative values (`[-1]`).
2. **All-negative collection maximum**: Arrays where all values $< 0$ (`[-3, -2, -1]`).
3. **Mixed positive and negative segments**: Standard Kadane peak segments.
4. **Subarray sum reset order**: Resetting current sum after comparing against global maximum.
5. **Maximum sum at right boundary**: Max subarray extending to the final index.

---

## 3. UI Display & Reporting

The failure mechanism coverage metric is integrated into the Assessment Triplet on the header and Overview tab:

```
┌──────────────────────────────────────────────┐
│ FAILURE MECHANISM COVERAGE                   │
│                                              │
│ Binary Search Mechanisms: 8 / 9 Tested (89%) │
│                                              │
│ ✓ Left boundary target                       │
│ ✓ Right boundary target                      │
│ ✓ Target absent (between elements)           │
│ ✓ Convergence condition                      │
│ ✓ Single-element base case                   │
│ ...                                          │
└──────────────────────────────────────────────┘
```
