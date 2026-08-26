# Praxis Failure Intelligence Engine — Phase 4 Oracle Support & Invariants

Specification of Oracle Support Levels and independent ground truth verification.

---

## 1. Oracle Support Levels

```typescript
type OracleSupportLevel =
  | 'FULL_ORACLE_SUPPORT'
  | 'PARTIAL_ORACLE_SUPPORT'
  | 'PROPERTY_BASED_SUPPORT'
  | 'NO_RELIABLE_ORACLE';
```

| Level | Description | Ground Truth Source | Action on Execution |
|---|---|---|---|
| **`FULL_ORACLE_SUPPORT`** | Standard LeetCode problem with canonical reference implementation in registry. | [`reference-oracles.ts`](file:///c:/Users/ADMIN/python/failureatlas/src/lib/intelligence/oracles/reference-oracles.ts) | Computes ground truth expected output for all valid inputs. |
| **`PARTIAL_ORACLE_SUPPORT`** | Known problem parameters with synthetic contract extraction. | Property validators & invariant checkers. | Executes structural validation. |
| **`PROPERTY_BASED_SUPPORT`** | Formal invariants (e.g. sorted order, partition order, valid parentheses matching). | Algorithmic invariant assertors. | Validates property compliance. |
| **`NO_RELIABLE_ORACLE`** | Unknown custom problem with no reference solution or invariants. | None. | **Never fabricates output; returns `INCONCLUSIVE`.** |

---

## 2. Anti-Oracle Inversion Rules

1. **User Code Never Acts as Oracle**: The output of the user's submitted code is strictly consumed as `actualOutput`. It is never mirrored or used to generate `expectedOutput`.
2. **Deterministic Ground Truth**: All expected outputs for canonical problems are computed dynamically by executing proven reference algorithms inside the isolated execution sandbox.
3. **Graceful Inconclusive Fallbacks**: If a problem has no reliable oracle, Praxis returns `INCONCLUSIVE` rather than fabricating synthetic expectations.
