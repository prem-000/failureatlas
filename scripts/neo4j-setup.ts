#!/usr/bin/env ts-node
/**
 * scripts/neo4j-setup.ts
 * Initialize Neo4j database with schema, constraints, indexes, and ontology data
 * 
 * Usage: ts-node scripts/neo4j-setup.ts
 */

import { initNeo4j, executeQuery, executeWriteQuery, closeNeo4j } from '@/lib/db/neo4j';
import { logger } from '@/lib/logger';

const CYPHER_CONSTRAINTS = [
  // Unique constraints
  'CREATE CONSTRAINT problem_id_unique IF NOT EXISTS FOR (p:Problem) REQUIRE p.problemId IS UNIQUE',
  'CREATE CONSTRAINT failure_event_id_unique IF NOT EXISTS FOR (f:FailureEvent) REQUIRE f.eventId IS UNIQUE',
  'CREATE CONSTRAINT evidence_id_unique IF NOT EXISTS FOR (e:Evidence) REQUIRE e.evidenceId IS UNIQUE',
  'CREATE CONSTRAINT root_cause_id_unique IF NOT EXISTS FOR (r:RootCause) REQUIRE r.causeId IS UNIQUE',
  'CREATE CONSTRAINT weakness_id_unique IF NOT EXISTS FOR (w:Weakness) REQUIRE w.weaknessId IS UNIQUE',
  'CREATE CONSTRAINT strategy_id_unique IF NOT EXISTS FOR (l:LearningStrategy) REQUIRE l.strategyId IS UNIQUE'
];

const CYPHER_INDEXES = [
  // Performance indexes
  'CREATE INDEX failure_user_idx IF NOT EXISTS FOR (f:FailureEvent) ON (f.userId)',
  'CREATE INDEX failure_timestamp_idx IF NOT EXISTS FOR (f:FailureEvent) ON (f.timestamp)',
  'CREATE INDEX weakness_pagerank_idx IF NOT EXISTS FOR (w:Weakness) ON (w.pageRankScore)',
  'CREATE INDEX problem_difficulty_idx IF NOT EXISTS FOR (p:Problem) ON (p.difficulty)',
  'CREATE INDEX evidence_confidence_idx IF NOT EXISTS FOR (e:Evidence) ON (e.confidence)'
];

const ONTOLOGY_ROOT_CAUSES = [
  {
    causeId: 'boundary-condition-error',
    name: 'Boundary Condition Error',
    category: 'Logic Error',
    description: 'Incorrect handling of edge cases and boundary conditions',
    commonPatterns: ['off-by-one', '< vs <=', 'array bounds'],
    detectionSignals: ['single_element_failure', 'boundary_change', 'edge_case_test']
  },
  {
    causeId: 'algorithm-selection-mistake',
    name: 'Algorithm Selection Mistake',
    category: 'Strategic Error',
    description: 'Choosing inappropriate algorithm for given constraints',
    commonPatterns: ['O(n²) when O(n log n) needed', 'brute force', 'suboptimal approach'],
    detectionSignals: ['time_limit_exceeded', 'algorithm_rewrite', 'efficiency_issue']
  },
  {
    causeId: 'pattern-recognition-gap',
    name: 'Pattern Recognition Gap',
    category: 'Cognitive Error',
    description: 'Failure to recognize algorithmic pattern or category',
    commonPatterns: ['missing sliding window', 'no DP recognition', 'graph pattern'],
    detectionSignals: ['multiple_approaches', 'complex_solution', 'pattern_not_found']
  },
  {
    causeId: 'time-complexity-oversight',
    name: 'Time Complexity Oversight',
    category: 'Performance Error',
    description: 'Implementing solution with suboptimal time complexity',
    commonPatterns: ['nested loops', 'repeated computation', 'no caching'],
    detectionSignals: ['time_limit_exceeded', 'large_input_timeout', 'optimization_possible']
  },
  {
    causeId: 'space-complexity-oversight',
    name: 'Space Complexity Oversight',
    category: 'Performance Error',
    description: 'Using excessive memory or failing to optimize space',
    commonPatterns: ['large_auxiliary_structures', 'no_in_place_operations'],
    detectionSignals: ['memory_limit_exceeded', 'large_data_structure', 'space_optimization']
  },
  {
    causeId: 'data-structure-mismatch',
    name: 'Data Structure Mismatch',
    category: 'Implementation Error',
    description: 'Using inappropriate data structure for required operations',
    commonPatterns: ['list_instead_of_set', 'array_instead_of_heap', 'wrong_tree_type'],
    detectionSignals: ['inefficient_operations', 'linear_searches', 'data_structure_change']
  },
  {
    causeId: 'implementation-detail-error',
    name: 'Implementation Detail Error',
    category: 'Coding Error',
    description: 'Correct algorithm but flawed implementation',
    commonPatterns: ['variable_initialization', 'loop_increment', 'conditional_logic'],
    detectionSignals: ['rapid_resubmission', 'small_code_changes', 'logic_error']
  },
  {
    causeId: 'input-output-handling-error',
    name: 'Input/Output Handling Error',
    category: 'Interface Error',
    description: 'Misunderstanding of input format or output requirements',
    commonPatterns: ['wrong_input_parsing', 'wrong_output_format', 'data_type_mismatch'],
    detectionSignals: ['format_failure', 'parse_error', 'type_mismatch']
  }
];

const ONTOLOGY_WEAKNESSES = [
  {
    weaknessId: 'edge-case-reasoning',
    name: 'Edge Case Reasoning',
    domain: 'Algorithmic Thinking',
    description: 'Systematic difficulty with boundary conditions and edge cases',
    learningObjectives: ['boundary analysis', 'loop invariants', 'edge case identification'],
    pageRankScore: 0.0,
    userFrequency: 0,
    lastOccurrence: null
  },
  {
    weaknessId: 'algorithmic-pattern-recognition',
    name: 'Algorithmic Pattern Recognition',
    domain: 'Problem Solving',
    description: 'Difficulty recognizing when problems belong to known patterns',
    learningObjectives: ['sliding window', 'dynamic programming', 'graph patterns'],
    pageRankScore: 0.0,
    userFrequency: 0,
    lastOccurrence: null
  },
  {
    weaknessId: 'performance-analysis',
    name: 'Performance Analysis',
    domain: 'Computational Thinking',
    description: 'Inability to analyze and optimize solution complexity',
    learningObjectives: ['time complexity analysis', 'space optimization', 'algorithm selection'],
    pageRankScore: 0.0,
    userFrequency: 0,
    lastOccurrence: null
  },
  {
    weaknessId: 'implementation-precision',
    name: 'Implementation Precision',
    domain: 'Coding Skills',
    description: 'Difficulty translating algorithmic understanding to correct code',
    learningObjectives: ['careful coding', 'variable management', 'logic testing'],
    pageRankScore: 0.0,
    userFrequency: 0,
    lastOccurrence: null
  }
];

const ONTOLOGY_STRATEGIES = [
  {
    strategyId: 'boundary-practice-plan',
    name: 'Boundary Condition Practice Plan',
    type: 'practice_set',
    description: 'Targeted practice on boundary conditions and edge cases',
    practiceProblems: ['two-sum', 'binary-search', 'merge-intervals'],
    concepts: ['loop bounds', 'array indexing', 'edge cases'],
    techniques: ['off-by-one testing', 'boundary analysis', 'loop invariants'],
    estimatedTime: 4,
    difficultyProgression: ['Easy', 'Medium', 'Hard']
  },
  {
    strategyId: 'pattern-recognition-course',
    name: 'Algorithmic Pattern Recognition Course',
    type: 'concept_review',
    description: 'Structured learning of common algorithmic patterns',
    practiceProblems: ['sliding-window', 'two-pointers', 'dynamic-programming'],
    concepts: ['sliding window', 'two pointers', 'dynamic programming', 'graphs'],
    techniques: ['pattern matching', 'subproblem analysis', 'state definition'],
    estimatedTime: 8,
    difficultyProgression: ['Easy', 'Medium', 'Hard']
  },
  {
    strategyId: 'complexity-optimization-workshop',
    name: 'Complexity Optimization Workshop',
    type: 'technique',
    description: 'Deep dive into time and space complexity optimization',
    practiceProblems: ['merge-sorted-arrays', 'longest-substring', 'median-of-two-arrays'],
    concepts: ['time complexity', 'space complexity', 'optimization techniques'],
    techniques: ['complexity analysis', 'memoization', 'in-place operations'],
    estimatedTime: 6,
    difficultyProgression: ['Medium', 'Hard']
  },
  {
    strategyId: 'implementation-drills',
    name: 'Implementation Precision Drills',
    type: 'practice_set',
    description: 'Focused practice on careful, correct implementation',
    practiceProblems: ['valid-parentheses', 'remove-duplicates', 'reverse-string'],
    concepts: ['variable tracking', 'loop control', 'conditional logic'],
    techniques: ['step-by-step coding', 'test-driven development', 'code review'],
    estimatedTime: 5,
    difficultyProgression: ['Easy', 'Medium']
  }
];

async function createConstraints(): Promise<void> {
  logger.info('📋 Creating Neo4j constraints...');
  
  for (const constraint of CYPHER_CONSTRAINTS) {
    try {
      await executeWriteQuery(constraint);
      logger.info(`✅ Created constraint: ${constraint.substring(0, 50)}...`);
    } catch (error) {
      logger.warn(`⚠️ Constraint creation issue: ${error}`);
      // Continue - constraints may already exist
    }
  }
}

async function createIndexes(): Promise<void> {
  logger.info('📊 Creating Neo4j indexes...');
  
  for (const index of CYPHER_INDEXES) {
    try {
      await executeWriteQuery(index);
      logger.info(`✅ Created index: ${index.substring(0, 50)}...`);
    } catch (error) {
      logger.warn(`⚠️ Index creation issue: ${error}`);
      // Continue - indexes may already exist
    }
  }
}

async function seedOntology(): Promise<void> {
  logger.info('🌱 Seeding failure ontology...');

  // Create root cause nodes
  logger.info('Creating RootCause nodes...');
  for (const cause of ONTOLOGY_ROOT_CAUSES) {
    const query = `
      CREATE (r:RootCause $props)
      RETURN r
    `;
    try {
      await executeWriteQuery(query, { props: cause });
      logger.info(`✅ Created root cause: ${cause.name}`);
    } catch (error) {
      logger.warn(`⚠️ RootCause creation issue for ${cause.name}: ${error}`);
    }
  }

  // Create weakness nodes
  logger.info('Creating Weakness nodes...');
  for (const weakness of ONTOLOGY_WEAKNESSES) {
    const query = `
      CREATE (w:Weakness $props)
      RETURN w
    `;
    try {
      await executeWriteQuery(query, { props: weakness });
      logger.info(`✅ Created weakness: ${weakness.name}`);
    } catch (error) {
      logger.warn(`⚠️ Weakness creation issue for ${weakness.name}: ${error}`);
    }
  }

  // Create strategy nodes
  logger.info('Creating LearningStrategy nodes...');
  for (const strategy of ONTOLOGY_STRATEGIES) {
    const query = `
      CREATE (l:LearningStrategy $props)
      RETURN l
    `;
    try {
      await executeWriteQuery(query, { props: strategy });
      logger.info(`✅ Created strategy: ${strategy.name}`);
    } catch (error) {
      logger.warn(`⚠️ Strategy creation issue for ${strategy.name}: ${error}`);
    }
  }

  // Create relationships between root causes and weaknesses
  logger.info('Creating root cause → weakness relationships...');
  const relationships = [
    ['boundary-condition-error', 'edge-case-reasoning', 0.9],
    ['input-output-handling-error', 'edge-case-reasoning', 0.7],
    ['pattern-recognition-gap', 'algorithmic-pattern-recognition', 0.85],
    ['algorithm-selection-mistake', 'algorithmic-pattern-recognition', 0.8],
    ['time-complexity-oversight', 'performance-analysis', 0.9],
    ['space-complexity-oversight', 'performance-analysis', 0.85],
    ['implementation-detail-error', 'implementation-precision', 0.88],
    ['data-structure-mismatch', 'performance-analysis', 0.75]
  ];

  for (const [causeId, weaknessId, strength] of relationships) {
    const query = `
      MATCH (r:RootCause {causeId: $causeId})
      MATCH (w:Weakness {weaknessId: $weaknessId})
      CREATE (r)-[:INDICATES {strength: $strength}]->(w)
      RETURN true
    `;
    try {
      await executeWriteQuery(query, { causeId, weaknessId, strength });
      logger.info(`✅ Linked ${causeId} → ${weaknessId}`);
    } catch (error) {
      logger.warn(`⚠️ Relationship creation issue: ${error}`);
    }
  }

  // Create relationships between weaknesses and strategies
  logger.info('Creating weakness → strategy relationships...');
  const strategyMappings = [
    ['edge-case-reasoning', 'boundary-practice-plan'],
    ['algorithmic-pattern-recognition', 'pattern-recognition-course'],
    ['performance-analysis', 'complexity-optimization-workshop'],
    ['implementation-precision', 'implementation-drills']
  ];

  for (const [weaknessId, strategyId] of strategyMappings) {
    const query = `
      MATCH (w:Weakness {weaknessId: $weaknessId})
      MATCH (l:LearningStrategy {strategyId: $strategyId})
      CREATE (w)-[:ADDRESSED_BY {effectiveness: 0.85, timeInvestment: 4}]->(l)
      RETURN true
    `;
    try {
      await executeWriteQuery(query, { weaknessId, strategyId });
      logger.info(`✅ Linked ${weaknessId} → ${strategyId}`);
    } catch (error) {
      logger.warn(`⚠️ Strategy mapping issue: ${error}`);
    }
  }
}

async function main(): Promise<void> {
  logger.info('🚀 Starting Neo4j database setup...');

  try {
    // Initialize connection
    const driver = await initNeo4j();
    if (!driver) {
      logger.error('❌ Failed to initialize Neo4j connection');
      process.exit(1);
    }

    // Run setup operations
    await createConstraints();
    await createIndexes();
    await seedOntology();

    logger.info('✅ Neo4j setup completed successfully!');
    logger.info('📌 Next steps:');
    logger.info('   1. Verify ontology data in Neo4j Browser');
    logger.info('   2. Run your application: npm run dev');
    logger.info('   3. Submit coding failures to populate the graph');

  } catch (error) {
    logger.error('❌ Neo4j setup failed:', error);
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

// Run setup
main().catch(error => {
  logger.error('Fatal error during setup:', error);
  process.exit(1);
});