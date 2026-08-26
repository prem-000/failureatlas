/**
 * src/lib/intelligence/oracles/oracle-support.ts
 * Oracle Support Classification & Reliability Engine (Phase 4).
 * Determines the reliability level of ground truth oracles before execution.
 */

import type { ProblemContract } from '../contracts/problem-contract';
import type { OracleSupportLevel } from '../types';
import { getReferenceOracle } from './reference-oracles';

export function determineOracleSupport(contract: ProblemContract): OracleSupportLevel {
  // 1. Direct Reference Oracle Check
  const oracle = getReferenceOracle(contract);
  if (oracle) {
    return 'FULL_ORACLE_SUPPORT';
  }

  // 2. Property-Based Invariant Check
  if (contract.invariants && contract.invariants.length > 0 && contract.oracleType === 'property_based') {
    return 'PROPERTY_BASED_SUPPORT';
  }

  // 3. Known signature structure
  if (contract.parameters.length > 0 && contract.returnType && contract.functionName !== 'solution') {
    return 'PARTIAL_ORACLE_SUPPORT';
  }

  // 4. No reliable ground truth source
  return 'NO_RELIABLE_ORACLE';
}
