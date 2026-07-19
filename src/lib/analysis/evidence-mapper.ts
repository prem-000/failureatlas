/**
 * Evidence Mapper
 *
 * A distinct stage from AST analysis: takes raw AST Changes (StructuralChange[])
 * and translates them into typed Evidence Objects.
 *
 * The same structural change can map to different evidence depending on context
 * (a comparator change inside a loop bound vs. inside an unrelated condition),
 * so this mapping logic has its own dedicated stage.
 *
 * Evidence Objects are what gets stored, aggregated, and shown to the user —
 * not the raw AST diff.
 */

import type { StructuralChange } from '@/lib/analysis/ast-diff';
import type { EditOperation } from '@/lib/analysis/myers-diff';
import type { EvidenceType, EvidenceObject } from '@/types';

// ─── AST Change → Evidence Mapping Rules ──────────────────────────────────────

/**
 * Map a single AST structural change to an evidence object.
 */
function mapStructuralChange(change: StructuralChange): EvidenceObject {
  switch (change.type) {
    case 'BOUNDARY_CONDITION_CHANGE':
      return mapBoundaryChange(change);
    case 'ALGORITHM_REWRITE':
      return {
        type: 'AlgorithmRewrite',
        description: change.description,
        confidence: change.confidence,
        source: 'ast_diff',
        rawChange: {
          oldCode: change.oldStructure,
          newCode: change.newStructure,
        },
      };
    case 'DATA_STRUCTURE_CHANGE':
      return {
        type: 'DataStructureChange',
        description: change.description,
        confidence: change.confidence,
        source: 'ast_diff',
        rawChange: {
          oldCode: change.oldStructure,
          newCode: change.newStructure,
        },
      };
    case 'OPTIMIZATION':
      return {
        type: 'ImplementationDetail',
        description: change.description,
        confidence: change.confidence,
        source: 'ast_diff',
        rawChange: {
          oldCode: change.oldStructure,
          newCode: change.newStructure,
        },
      };
    case 'IMPLEMENTATION_DETAIL':
      return mapImplementationDetail(change);
    default:
      return {
        type: 'ImplementationDetail',
        description: change.description,
        confidence: change.confidence * 0.5,
        source: 'ast_diff',
      };
  }
}

/**
 * Boundary condition changes get further classified based on content.
 */
function mapBoundaryChange(change: StructuralChange): EvidenceObject {
  const desc = change.description.toLowerCase();
  const oldStruct = change.oldStructure.toLowerCase();
  const newStruct = change.newStructure.toLowerCase();

  // Off-by-one: < became <=, > became >=, or +1/-1 adjustments
  const offByOnePatterns = [
    /< .*became.*<=/,
    /> .*became.*>=/,
    /<= .*became.*</,
    />= .*became.*>/,
    /\+ ?1/,
    /- ?1/,
  ];
  const isOffByOne = offByOnePatterns.some(p => p.test(desc));

  if (isOffByOne) {
    return {
      type: 'OffByOne',
      description: `Off-by-one: ${change.description}`,
      confidence: change.confidence,
      source: 'ast_diff',
      rawChange: {
        oldCode: change.oldStructure,
        newCode: change.newStructure,
      },
    };
  }

  // Check for null/undefined boundary
  if (desc.includes('null') || desc.includes('undefined') || desc.includes('none')) {
    return {
      type: 'MissingNullCheck',
      description: `Null boundary: ${change.description}`,
      confidence: change.confidence,
      source: 'ast_diff',
      rawChange: {
        oldCode: change.oldStructure,
        newCode: change.newStructure,
      },
    };
  }

  // Check for comparator changes
  const comparators = ['<', '>', '<=', '>=', '==', '!='];
  const hasComparatorChange = comparators.some(
    c => (oldStruct.includes(c) || newStruct.includes(c))
  );
  if (hasComparatorChange) {
    return {
      type: 'WrongComparator',
      description: `Comparator change: ${change.description}`,
      confidence: change.confidence,
      source: 'ast_diff',
      rawChange: {
        oldCode: change.oldStructure,
        newCode: change.newStructure,
      },
    };
  }

  // Default boundary error
  return {
    type: 'BoundaryError',
    description: change.description,
    confidence: change.confidence,
    source: 'ast_diff',
    rawChange: {
      oldCode: change.oldStructure,
      newCode: change.newStructure,
    },
  };
}

/**
 * Implementation details get further classified.
 */
function mapImplementationDetail(change: StructuralChange): EvidenceObject {
  const desc = change.description.toLowerCase();

  // Check for loop-related changes
  if (desc.includes('loop') || desc.includes('while') || desc.includes('for')) {
    // Check for potential infinite loop patterns
    if (desc.includes('removed') || desc.includes('deleted')) {
      return {
        type: 'InfiniteLoop',
        description: `Loop modification: ${change.description}`,
        confidence: change.confidence * 0.7,
        source: 'ast_diff',
        rawChange: {
          oldCode: change.oldStructure,
          newCode: change.newStructure,
        },
      };
    }
  }

  // Check for return statement changes
  if (desc.includes('return')) {
    return {
      type: 'MissingReturn',
      description: `Return change: ${change.description}`,
      confidence: change.confidence * 0.8,
      source: 'ast_diff',
      rawChange: {
        oldCode: change.oldStructure,
        newCode: change.newStructure,
      },
    };
  }

  // Check for base case changes (recursion)
  if (desc.includes('base case') || desc.includes('base_case') || desc.includes('if.*==.*0') || desc.includes('if.*len.*0')) {
    return {
      type: 'MissingBaseCase',
      description: `Base case change: ${change.description}`,
      confidence: change.confidence * 0.8,
      source: 'ast_diff',
      rawChange: {
        oldCode: change.oldStructure,
        newCode: change.newStructure,
      },
    };
  }

  // Check for variable substitution
  if (desc.includes('variable') || desc.includes('renamed')) {
    return {
      type: 'WrongVariable',
      description: change.description,
      confidence: change.confidence * 0.6,
      source: 'ast_diff',
      rawChange: {
        oldCode: change.oldStructure,
        newCode: change.newStructure,
      },
    };
  }

  // Default
  return {
    type: 'ImplementationDetail',
    description: change.description,
    confidence: change.confidence * 0.5,
    source: 'ast_diff',
    rawChange: {
      oldCode: change.oldStructure,
      newCode: change.newStructure,
    },
  };
}

// ─── Myers Diff → Evidence Mapping ────────────────────────────────────────────

/**
 * Extract evidence from Myers diff edit operations.
 * Complements AST-level evidence with line-level diff signals.
 */
function mapDiffOperations(operations: EditOperation[]): EvidenceObject[] {
  const evidence: EvidenceObject[] = [];
  const edits = operations.filter(op => op.type !== 'EQUAL');

  if (edits.length === 0) return evidence;

  // Detect boundary-related edits
  const boundaryKeywords = ['<', '<=', '>', '>=', '==', '!=', '+ 1', '- 1', '+1', '-1', 'length', 'size'];
  const boundaryEdits = edits.filter(op =>
    boundaryKeywords.some(kw => op.content.includes(kw))
  );

  if (boundaryEdits.length > 0) {
    evidence.push({
      type: 'BoundaryError',
      description: `${boundaryEdits.length} boundary-related line change(s) detected in diff`,
      confidence: Math.min(0.9, 0.5 + boundaryEdits.length * 0.1),
      source: 'myers_diff',
    });
  }

  // Detect null/undefined additions
  const nullChecks = edits.filter(
    op => op.type === 'INSERT' &&
    (op.content.includes('null') || op.content.includes('undefined') || op.content.includes('None'))
  );
  if (nullChecks.length > 0) {
    evidence.push({
      type: 'MissingNullCheck',
      description: `${nullChecks.length} null/undefined check(s) added`,
      confidence: 0.75,
      source: 'myers_diff',
    });
  }

  // Detect return statement additions
  const returnAdds = edits.filter(
    op => op.type === 'INSERT' && op.content.trim().startsWith('return')
  );
  if (returnAdds.length > 0) {
    evidence.push({
      type: 'MissingReturn',
      description: `${returnAdds.length} return statement(s) added`,
      confidence: 0.7,
      source: 'myers_diff',
    });
  }

  return evidence;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Map AST structural changes to typed Evidence Objects.
 *
 * @param structuralChanges  Output from ast-diff / structuralCodePatternAnalysis
 * @returns Array of typed EvidenceObject
 */
export function mapASTChangesToEvidence(structuralChanges: StructuralChange[]): EvidenceObject[] {
  return structuralChanges.map(mapStructuralChange);
}

/**
 * Map Myers diff operations to supplementary Evidence Objects.
 *
 * @param operations  Output from myersDiff()
 * @returns Array of typed EvidenceObject (typically fewer than AST-level evidence)
 */
export function mapDiffToEvidence(operations: EditOperation[]): EvidenceObject[] {
  return mapDiffOperations(operations);
}

/**
 * Combine evidence from all sources for a single submission.
 * Deduplicates overlapping evidence from AST and diff sources.
 *
 * @param astEvidence   Evidence from AST structural changes
 * @param diffEvidence  Evidence from Myers diff operations
 * @returns Merged, deduplicated evidence array
 */
export function combineEvidence(
  astEvidence: EvidenceObject[],
  diffEvidence: EvidenceObject[]
): EvidenceObject[] {
  const combined = [...astEvidence];

  // Only add diff evidence if there's no overlapping AST evidence of the same type
  const astTypes = new Set(astEvidence.map(e => e.type));

  for (const de of diffEvidence) {
    if (!astTypes.has(de.type)) {
      combined.push(de);
    }
  }

  return combined;
}
