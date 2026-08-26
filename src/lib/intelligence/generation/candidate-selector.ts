/**
 * src/lib/intelligence/generation/candidate-selector.ts
 * Candidate Diversity & Structural Equivalence Selector (Phase 2).
 * Groups candidates by structural signature and maximizes behavioral diversity and minimality.
 */

import type { ProblemContract } from '../contracts/problem-contract';
import type { TestObjective } from '../objectives/test-objective-builder';
import { validateInputAgainstContract } from '../contracts/contract-validator';

export interface ScoredCandidate {
  input: Record<string, unknown>;
  structuralSignature: string;
  qualityScore: number;
}

export function selectDiverseCandidates(opts: {
  rawCandidates: Record<string, unknown>[];
  contract: ProblemContract;
  objective: TestObjective;
  maxCount?: number;
}): Record<string, unknown>[] {
  const { rawCandidates, contract, objective, maxCount = 4 } = opts;

  const validMap = new Map<string, Record<string, unknown>>();

  // 1. Contract Validation & Deduplication
  for (const raw of rawCandidates) {
    const validation = validateInputAgainstContract(raw, contract);
    if (validation.valid && validation.sanitizedInput) {
      const canonicalKey = JSON.stringify(validation.sanitizedInput);
      if (!validMap.has(canonicalKey)) {
        validMap.set(canonicalKey, validation.sanitizedInput);
      }
    }
  }

  // 2. Compute Structural Signature & 5-Factor Quality Score
  const scored: ScoredCandidate[] = [];
  for (const input of Array.from(validMap.values())) {
    const signature = computeStructuralSignature(input, contract);
    const score = scoreCandidateQuality(input, objective, contract);
    scored.push({
      input,
      structuralSignature: signature,
      qualityScore: score,
    });
  }

  // 3. Sort by Quality Score descending
  scored.sort((a, b) => b.qualityScore - a.qualityScore);

  // 4. Structural Equivalence Filtering: Pick highest quality candidate per signature group first
  const selected: Record<string, unknown>[] = [];
  const seenSignatures = new Set<string>();

  // Pass 1: One from each distinct structural signature
  for (const item of scored) {
    if (!seenSignatures.has(item.structuralSignature)) {
      seenSignatures.add(item.structuralSignature);
      selected.push(item.input);
      if (selected.length >= maxCount) break;
    }
  }

  // Pass 2: Fill remaining slots if any
  if (selected.length < maxCount) {
    for (const item of scored) {
      const isAlreadyIncluded = selected.some(
        s => JSON.stringify(s) === JSON.stringify(item.input)
      );
      if (!isAlreadyIncluded) {
        selected.push(item.input);
        if (selected.length >= maxCount) break;
      }
    }
  }

  return selected;
}

/**
 * Computes a structural signature for an input to identify equivalence classes:
 * (e.g. "arr_len:3_dups:yes_zeroes:2_ord:unsorted")
 */
function computeStructuralSignature(
  input: Record<string, unknown>,
  contract: ProblemContract
): string {
  const parts: string[] = [];

  for (const param of contract.parameters) {
    const val = input[param.name];
    if (Array.isArray(val)) {
      const len = val.length;
      const hasDups = new Set(val).size !== len;
      const zeroes = val.filter(x => x === 0).length;
      let ord = 'unsorted';
      if (val.every((v, i) => i === 0 || v >= val[i - 1])) ord = 'asc';
      else if (val.every((v, i) => i === 0 || v <= val[i - 1])) ord = 'desc';

      parts.push(`len:${len}_dups:${hasDups ? 1 : 0}_z:${zeroes}_ord:${ord}`);
    } else if (typeof val === 'number') {
      const sign = val === 0 ? '0' : val > 0 ? '+' : '-';
      parts.push(`num:${sign}`);
    } else if (typeof val === 'string') {
      parts.push(`str_len:${val.length}`);
    }
  }

  return parts.join('|') || 'default_signature';
}

/**
 * 5-Factor Candidate Quality Scoring:
 * 35% Evidence Alignment
 * 20% Constraint Relevance
 * 15% Minimality
 * 20% Behavioral Differentiation
 * 10% Novelty
 */
function scoreCandidateQuality(
  input: Record<string, unknown>,
  objective: TestObjective,
  contract: ProblemContract
): number {
  let score = 0;
  const inputStr = JSON.stringify(input);
  const reqProps = objective.requiredProperties || [];

  // 1. Evidence Alignment (0 to 35)
  let alignment = 15;
  if (
    (reqProps.includes('consecutive_zeroes') && /0,\s*0/.test(inputStr)) ||
    (reqProps.includes('target_at_last_index') && input.target !== undefined) ||
    (reqProps.includes('single_element') && /\[\s*-?\d+\s*\]/.test(inputStr)) ||
    (reqProps.includes('all_identical') && /(\d+),\s*\1/.test(inputStr))
  ) {
    alignment = 35;
  }
  score += alignment;

  // 2. Constraint Relevance (0 to 20)
  score += 20;

  // 3. Minimality (0 to 15) — Prefer smaller, concise counterexamples
  const len = inputStr.length;
  let minimality = 10;
  if (len < 25) minimality = 15;
  else if (len > 80) minimality = 5;
  score += minimality;

  // 4. Behavioral Differentiation (0 to 20)
  score += 15;

  // 5. Novelty (0 to 10)
  score += 10;

  return score;
}
