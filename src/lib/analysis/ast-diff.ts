/**
 * Structural Pattern Analysis
 * NOTE: This module currently uses regex-based heuristic structural code pattern analysis.
 * True AST (Abstract Syntax Tree) parsing/diffing is a future enhancement.
 */

export interface StructuralChange {
  type: 'BOUNDARY_CONDITION_CHANGE' | 'ALGORITHM_REWRITE' | 'DATA_STRUCTURE_CHANGE' | 'OPTIMIZATION' | 'IMPLEMENTATION_DETAIL';
  description: string;
  oldStructure: string;
  newStructure: string;
  confidence: number;
}

function extractControlStructures(code: string): { type: 'loop' | 'conditional'; content: string; raw: string }[] {
  const lines = code.split('\n');
  const structures: { type: 'loop' | 'conditional'; content: string; raw: string }[] = [];

  // Patterns for loops and conditionals in Python, JS, C++, Java
  const loopRegex = /(?:while|for)\s*\(([^)]+)\)|for\s+(\w+)\s+in\s+([^:]+):|while\s+([^:]+):/;
  const condRegex = /(?:if|else\s+if|elif)\s*\(([^)]+)\)|if\s+([^:]+):|elif\s+([^:]+):/;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check loops
    const loopMatch = trimmed.match(loopRegex);
    if (loopMatch) {
      const condition = loopMatch[1] || loopMatch[3] || loopMatch[4];
      if (condition) {
        structures.push({
          type: 'loop',
          content: condition.trim(),
          raw: trimmed
        });
      }
      continue;
    }

    // Check conditionals
    const condMatch = trimmed.match(condRegex);
    if (condMatch) {
      const condition = condMatch[1] || condMatch[2] || condMatch[3];
      if (condition) {
        structures.push({
          type: 'conditional',
          content: condition.trim(),
          raw: trimmed
        });
      }
    }
  }

  return structures;
}

function isBoundaryConditionChange(oldCond: string, newCond: string): boolean {
  // Check if operators changed
  const ops = ['<=', '>=', '<', '>', '==', '!='];
  const hasOldOp = ops.some(op => oldCond.includes(op));
  const hasNewOp = ops.some(op => newCond.includes(op));
  
  if (hasOldOp && hasNewOp) {
    // Check for off-by-one transitions: < to <=, > to >=, etc.
    const transitions = [
      ['<', '<='],
      ['>', '>='],
      ['<=', '<'],
      ['>=', '>'],
      ['+ 1', ''],
      ['- 1', ''],
      ['+1', ''],
      ['-1', '']
    ];
    
    for (const [from, to] of transitions) {
      if (oldCond.includes(from) && newCond.includes(to)) {
        return true;
      }
    }
  }
  return false;
}

export function structuralCodePatternAnalysis(oldCode: string, newCode: string): StructuralChange[] {
  const oldStructures = extractControlStructures(oldCode);
  const newStructures = extractControlStructures(newCode);
  const changes: StructuralChange[] = [];

  // Align structures by type or similarity
  const maxLen = Math.max(oldStructures.length, newStructures.length);
  for (let i = 0; i < maxLen; i++) {
    const oldStruct = oldStructures[i];
    const newStruct = newStructures[i];

    if (oldStruct && newStruct) {
      if (oldStruct.type === newStruct.type && oldStruct.content !== newStruct.content) {
        if (isBoundaryConditionChange(oldStruct.content, newStruct.content)) {
          changes.push({
            type: 'BOUNDARY_CONDITION_CHANGE',
            description: `Boundary condition modified in ${oldStruct.type}: "${oldStruct.content}" became "${newStruct.content}"`,
            oldStructure: oldStruct.raw,
            newStructure: newStruct.raw,
            confidence: 0.85
          });
        } else {
          changes.push({
            type: 'IMPLEMENTATION_DETAIL',
            description: `Condition updated in ${oldStruct.type}: "${oldStruct.content}" became "${newStruct.content}"`,
            oldStructure: oldStruct.raw,
            newStructure: newStruct.raw,
            confidence: 0.60
          });
        }
      }
    }
  }

  // Detect complete rewrites (huge structural difference)
  const structuralDiffRatio = Math.abs(oldStructures.length - newStructures.length) / Math.max(oldStructures.length, 1);
  if (structuralDiffRatio > 0.6 && oldStructures.length > 2) {
    changes.push({
      type: 'ALGORITHM_REWRITE',
      description: 'Fundamentally rewrote control flow structures, indicating algorithm selection shift.',
      oldStructure: `${oldStructures.length} control statements`,
      newStructure: `${newStructures.length} control statements`,
      confidence: 0.90
    });
  }

  // Detect data structure introduction
  const dsKeywords = [
    { kw: 'Map', name: 'Hash Map' },
    { kw: 'Set', name: 'Set' },
    { kw: 'Queue', name: 'Queue' },
    { kw: 'Stack', name: 'Stack' },
    { kw: 'dict()', name: 'Python Dictionary' },
    { kw: 'set()', name: 'Python Set' },
    { kw: 'deque', name: 'Deque' },
    { kw: 'priority_queue', name: 'Priority Queue' },
    { kw: 'heapq', name: 'Heap' }
  ];

  for (const ds of dsKeywords) {
    const inOld = oldCode.includes(ds.kw);
    const inNew = newCode.includes(ds.kw);
    if (!inOld && inNew) {
      changes.push({
        type: 'DATA_STRUCTURE_CHANGE',
        description: `Introduced new data structure: ${ds.name}`,
        oldStructure: '',
        newStructure: ds.kw,
        confidence: 0.88
      });
    }
  }

  return changes;
}

export const astStructuralDiff = structuralCodePatternAnalysis;
