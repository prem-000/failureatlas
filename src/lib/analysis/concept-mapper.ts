/**
 * Concept Mapper
 *
 * Maps weaknesses to higher-level concepts, and concepts to sections.
 * A single weakness can belong to more than one concept, and a concept
 * can appear under multiple sections.
 *
 * Example chain:
 *   BoundaryConditionError (weakness) → Off-by-One Reasoning (concept) → Binary Search (section)
 *
 * The same "off-by-one" concept might also surface under Two Pointers or
 * Sliding Window — modeling it as a distinct layer avoids duplicating
 * weakness records per section.
 */

import type { EvidenceType } from '@/types';

// ─── Static Mappings ──────────────────────────────────────────────────────────

export interface ConceptDefinition {
  slug: string;
  name: string;
  description: string;
  sections: string[];  // section slugs this concept belongs to
}

export interface SectionDefinition {
  slug: string;
  name: string;
  description: string;
}

/**
 * Weakness-type → Concept mappings.
 * A weakness type can map to multiple concepts.
 */
export const WEAKNESS_TO_CONCEPTS: Record<EvidenceType, string[]> = {
  BoundaryError:      ['off-by-one-reasoning', 'loop-invariant-reasoning'],
  MissingNullCheck:   ['null-safety', 'edge-case-handling'],
  WrongComparator:    ['comparator-reasoning', 'off-by-one-reasoning'],
  InfiniteLoop:       ['loop-termination', 'loop-invariant-reasoning'],
  Overflow:           ['integer-overflow', 'constraint-awareness'],
  OffByOne:           ['off-by-one-reasoning', 'index-arithmetic'],
  MissingBaseCase:    ['recursion-base-case', 'recursive-thinking'],
  WrongVariable:      ['variable-scoping', 'state-tracking'],
  MissingReturn:      ['control-flow', 'edge-case-handling'],
  AlgorithmRewrite:   ['algorithm-selection', 'pattern-recognition'],
  DataStructureChange:['data-structure-selection', 'pattern-recognition'],
  ImplementationDetail:['implementation-precision', 'code-translation'],
};

/**
 * All concepts and their section memberships.
 */
export const CONCEPTS: Record<string, ConceptDefinition> = {
  'off-by-one-reasoning': {
    slug: 'off-by-one-reasoning',
    name: 'Off-by-One Reasoning',
    description: 'Understanding inclusive vs. exclusive bounds, +1/-1 adjustments',
    sections: ['binary-search', 'two-pointers', 'sliding-window', 'arrays'],
  },
  'loop-invariant-reasoning': {
    slug: 'loop-invariant-reasoning',
    name: 'Loop Invariant Reasoning',
    description: 'Maintaining correct state across loop iterations',
    sections: ['binary-search', 'two-pointers', 'arrays', 'sorting'],
  },
  'loop-termination': {
    slug: 'loop-termination',
    name: 'Loop Termination',
    description: 'Ensuring loops terminate under all inputs',
    sections: ['binary-search', 'graphs', 'simulation'],
  },
  'null-safety': {
    slug: 'null-safety',
    name: 'Null Safety',
    description: 'Handling null/undefined/empty inputs correctly',
    sections: ['linked-lists', 'trees', 'strings'],
  },
  'edge-case-handling': {
    slug: 'edge-case-handling',
    name: 'Edge Case Handling',
    description: 'Handling empty inputs, single elements, and boundary values',
    sections: ['arrays', 'strings', 'trees', 'linked-lists'],
  },
  'comparator-reasoning': {
    slug: 'comparator-reasoning',
    name: 'Comparator Reasoning',
    description: 'Choosing correct comparison operators for the problem',
    sections: ['binary-search', 'sorting', 'two-pointers'],
  },
  'integer-overflow': {
    slug: 'integer-overflow',
    name: 'Integer Overflow',
    description: 'Preventing numeric overflow at constraint limits',
    sections: ['math', 'dynamic-programming', 'bit-manipulation'],
  },
  'constraint-awareness': {
    slug: 'constraint-awareness',
    name: 'Constraint Awareness',
    description: 'Understanding how input constraints affect algorithm choice',
    sections: ['dynamic-programming', 'greedy', 'math'],
  },
  'index-arithmetic': {
    slug: 'index-arithmetic',
    name: 'Index Arithmetic',
    description: 'Correct index calculations in array/string manipulation',
    sections: ['arrays', 'strings', 'sliding-window'],
  },
  'recursion-base-case': {
    slug: 'recursion-base-case',
    name: 'Recursion Base Case',
    description: 'Defining correct termination conditions for recursion',
    sections: ['trees', 'dynamic-programming', 'backtracking', 'divide-and-conquer'],
  },
  'recursive-thinking': {
    slug: 'recursive-thinking',
    name: 'Recursive Thinking',
    description: 'Breaking problems into subproblems correctly',
    sections: ['trees', 'dynamic-programming', 'backtracking'],
  },
  'variable-scoping': {
    slug: 'variable-scoping',
    name: 'Variable Scoping',
    description: 'Correct variable scope and lifetime management',
    sections: ['arrays', 'strings', 'simulation'],
  },
  'state-tracking': {
    slug: 'state-tracking',
    name: 'State Tracking',
    description: 'Maintaining correct state across complex logic',
    sections: ['dynamic-programming', 'graphs', 'simulation'],
  },
  'control-flow': {
    slug: 'control-flow',
    name: 'Control Flow',
    description: 'Correct branching, early returns, and flow management',
    sections: ['arrays', 'strings', 'simulation'],
  },
  'algorithm-selection': {
    slug: 'algorithm-selection',
    name: 'Algorithm Selection',
    description: 'Choosing the right algorithm class for a problem',
    sections: ['greedy', 'dynamic-programming', 'graphs', 'binary-search'],
  },
  'pattern-recognition': {
    slug: 'pattern-recognition',
    name: 'Pattern Recognition',
    description: 'Identifying which algorithm pattern applies to a problem',
    sections: ['two-pointers', 'sliding-window', 'binary-search', 'dynamic-programming'],
  },
  'data-structure-selection': {
    slug: 'data-structure-selection',
    name: 'Data Structure Selection',
    description: 'Choosing the right data structure for the problem',
    sections: ['hash-map', 'heap', 'trees', 'stacks-queues'],
  },
  'implementation-precision': {
    slug: 'implementation-precision',
    name: 'Implementation Precision',
    description: 'Translating algorithm ideas into correct code',
    sections: ['arrays', 'strings', 'simulation'],
  },
  'code-translation': {
    slug: 'code-translation',
    name: 'Code Translation',
    description: 'Accurately converting pseudocode or ideas into working code',
    sections: ['arrays', 'strings', 'simulation'],
  },
};

/**
 * All section definitions.
 */
export const SECTIONS: Record<string, SectionDefinition> = {
  'binary-search':        { slug: 'binary-search',        name: 'Binary Search',            description: 'Binary search and its variants' },
  'two-pointers':         { slug: 'two-pointers',         name: 'Two Pointers',             description: 'Two pointer technique' },
  'sliding-window':       { slug: 'sliding-window',       name: 'Sliding Window',           description: 'Sliding window patterns' },
  'arrays':               { slug: 'arrays',               name: 'Arrays',                   description: 'Array manipulation and traversal' },
  'strings':              { slug: 'strings',              name: 'Strings',                  description: 'String manipulation and matching' },
  'linked-lists':         { slug: 'linked-lists',         name: 'Linked Lists',             description: 'Linked list operations' },
  'trees':                { slug: 'trees',                name: 'Trees',                    description: 'Binary trees, BSTs, and tree traversals' },
  'graphs':               { slug: 'graphs',               name: 'Graphs',                   description: 'Graph traversal, BFS, DFS, shortest paths' },
  'dynamic-programming':  { slug: 'dynamic-programming',  name: 'Dynamic Programming',      description: 'DP tabulation and memoization' },
  'greedy':               { slug: 'greedy',               name: 'Greedy',                   description: 'Greedy algorithms' },
  'backtracking':         { slug: 'backtracking',         name: 'Backtracking',             description: 'Backtracking and constraint satisfaction' },
  'sorting':              { slug: 'sorting',              name: 'Sorting',                  description: 'Sorting algorithms and applications' },
  'hash-map':             { slug: 'hash-map',             name: 'Hash Map',                 description: 'Hash table patterns' },
  'heap':                 { slug: 'heap',                 name: 'Heap / Priority Queue',    description: 'Heap-based algorithms' },
  'stacks-queues':        { slug: 'stacks-queues',        name: 'Stacks & Queues',          description: 'Stack and queue patterns' },
  'math':                 { slug: 'math',                 name: 'Math',                     description: 'Mathematical algorithms and number theory' },
  'bit-manipulation':     { slug: 'bit-manipulation',     name: 'Bit Manipulation',         description: 'Bitwise operations' },
  'simulation':           { slug: 'simulation',           name: 'Simulation',               description: 'Direct simulation problems' },
  'divide-and-conquer':   { slug: 'divide-and-conquer',   name: 'Divide & Conquer',         description: 'Divide and conquer strategies' },
};

// ─── Mapping Functions ────────────────────────────────────────────────────────

/**
 * Given an evidence type (weakness), return the concepts it maps to.
 */
export function getConceptsForWeakness(evidenceType: EvidenceType): ConceptDefinition[] {
  const conceptSlugs = WEAKNESS_TO_CONCEPTS[evidenceType] || [];
  return conceptSlugs
    .map(slug => CONCEPTS[slug])
    .filter((c): c is ConceptDefinition => c !== undefined);
}

/**
 * Given a concept slug, return the sections it belongs to.
 */
export function getSectionsForConcept(conceptSlug: string): SectionDefinition[] {
  const concept = CONCEPTS[conceptSlug];
  if (!concept) return [];
  return concept.sections
    .map(slug => SECTIONS[slug])
    .filter((s): s is SectionDefinition => s !== undefined);
}

/**
 * Given an evidence type, return all sections it transitively affects.
 * Follows the chain: weakness → concepts → sections
 */
export function getSectionsForWeakness(evidenceType: EvidenceType): SectionDefinition[] {
  const concepts = getConceptsForWeakness(evidenceType);
  const sectionSlugs = new Set<string>();
  const sections: SectionDefinition[] = [];

  for (const concept of concepts) {
    for (const sectionSlug of concept.sections) {
      if (!sectionSlugs.has(sectionSlug)) {
        sectionSlugs.add(sectionSlug);
        const section = SECTIONS[sectionSlug];
        if (section) sections.push(section);
      }
    }
  }

  return sections;
}

/**
 * Build the full mapping chain for an evidence type.
 * Returns { evidenceType, concepts, sections } for display and storage.
 */
export function buildConceptChain(evidenceType: EvidenceType): {
  evidenceType: EvidenceType;
  concepts: ConceptDefinition[];
  sections: SectionDefinition[];
} {
  const concepts = getConceptsForWeakness(evidenceType);
  const sections = getSectionsForWeakness(evidenceType);

  return {
    evidenceType,
    concepts,
    sections,
  };
}
