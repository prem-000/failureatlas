/**
 * src/lib/diagnosis/preliminary-classifier.ts
 *
 * Fast (<5ms) deterministic / heuristic preliminary root cause classifier.
 * Breaks the circular dependency between history lookup and root cause diagnosis
 * by determining candidate root causes BEFORE querying history and the knowledge graph.
 */

import type { RootCauseType } from '@/types';

export interface PreliminaryRootCause {
  id: RootCauseType;
  name: string;
  confidence: number;
  signals: string[];
}

export function classifyPreliminaryRootCause(
  code?: string,
  query?: string,
  submissionStatus?: string
): PreliminaryRootCause {
  const cleanCode = (code || '').trim();
  const cleanQuery = (query || '').toLowerCase();
  const signals: string[] = [];

  // 1. Status overrides
  if (submissionStatus === 'Time Limit Exceeded' || cleanQuery.includes('tle') || cleanQuery.includes('time limit')) {
    return {
      id: 'time-complexity-oversight',
      name: 'Time Complexity Oversight',
      confidence: 90,
      signals: ['Submission status: TLE'],
    };
  }

  if (submissionStatus === 'Memory Limit Exceeded' || cleanQuery.includes('mle') || cleanQuery.includes('memory limit')) {
    return {
      id: 'space-complexity-oversight',
      name: 'Space Complexity Oversight',
      confidence: 90,
      signals: ['Submission status: MLE'],
    };
  }

  // 2. Query hints
  if (cleanQuery.includes('boundary') || cleanQuery.includes('off-by-one') || cleanQuery.includes('off by one')) {
    signals.push('Query mentions boundary / off-by-one');
    return {
      id: 'boundary-condition-error',
      name: 'Boundary Condition Error',
      confidence: 88,
      signals,
    };
  }

  if (cleanQuery.includes('complexity') || cleanQuery.includes('time complexity')) {
    signals.push('Query mentions complexity');
    return {
      id: 'time-complexity-oversight',
      name: 'Time Complexity Oversight',
      confidence: 85,
      signals,
    };
  }

  // 3. Code heuristics
  if (cleanCode) {
    // Check loop invariants & boundary conditions:
    // e.g. while left < right or while l < r or i <= len or arr[i+1]
    if (
      /\bwhile\s*\(?\s*(?:left|l|low)\s*<\s*(?:right|r|high)\s*\)?/i.test(cleanCode) ||
      /\bwhile\s*\(?\s*\w+\s*<=\s*(?:nums|arr|s)\.length/i.test(cleanCode) ||
      /\[\s*\w+\s*[+-]\s*1\s*\]/.test(cleanCode)
    ) {
      signals.push('Loop boundary condition pattern (binary search / two-pointer bounds)');
      return {
        id: 'boundary-condition-error',
        name: 'Boundary Condition Error',
        confidence: 88,
        signals,
      };
    }

    // Check nested loops (quadratic / cubic overhead)
    const loopMatches = (cleanCode.match(/\b(for\s+[\w,\s()]+\s+in\b|for\s*\(|while\s+[\w\(!])/g) || []).length;
    if (loopMatches >= 2 && !cleanCode.includes('left') && !cleanCode.includes('right')) {
      signals.push('Nested loop structures without pointer narrowing');
      return {
        id: 'time-complexity-oversight',
        name: 'Time Complexity Oversight',
        confidence: 82,
        signals,
      };
    }

    // Check recursion without memo
    if (/\bdef\s+([a-zA-Z_]\w*)/.test(cleanCode)) {
      const fnName = cleanCode.match(/\bdef\s+([a-zA-Z_]\w*)/)?.[1];
      if (fnName && cleanCode.split(fnName).length > 2 && !cleanCode.includes('memo') && !cleanCode.includes('dp') && !cleanCode.includes('@cache')) {
        signals.push('Recursive calls without memoization');
        return {
          id: 'time-complexity-oversight',
          name: 'Time Complexity Oversight',
          confidence: 85,
          signals,
        };
      }
    }

    // Check data structure mismatches (e.g. array search instead of Set/Map)
    if (
      (/\.includes\(|\.indexOf\(|\bif\s+\w+\s+in\s+(?!range\b)\w+/.test(cleanCode) ||
        /\b\w+\s+in\s+(?!range\b)\w+\s*(?:and|or|:)/.test(cleanCode)) &&
      cleanCode.includes('for ')
    ) {
      signals.push('Linear scan inside iteration (potential hash map lookup candidate)');
      return {
        id: 'data-structure-mismatch',
        name: 'Data Structure Mismatch',
        confidence: 80,
        signals,
      };
    }
  }

  // Default heuristic
  return {
    id: 'boundary-condition-error',
    name: 'Boundary Condition Error',
    confidence: 85,
    signals: ['Defaulted to primary algorithmic failure class'],
  };
}
