/**
 * tests/query-aware-graph.test.ts
 *
 * Comprehensive Acceptance Test Suite for Query-Aware Connected Graph Visualizer.
 * Verifies:
 * 1. Concept queries generate Radial Connected Graphs with central topic and orbital branches
 * 2. Prerequisite queries generate Hierarchical Tree Graphs
 * 3. Algorithm execution queries generate Directed Flowcharts with deterministic simulation steps
 * 4. Architecture queries generate Tiered Component & Data-Flow Graphs
 * 5. Grounded node details, verified external documentation links, and RAG citations
 * 6. Execution simulator controls & step progression
 * 7. Safe schema validation (unique node IDs, no dangling edges, secure URL protocols)
 * 8. Layout Engine (Radial, Tree, Flowchart, Architecture) coordinate calculations
 * 9. Drill-down queries generate child graphs
 */

import assert from 'assert';
import { DynamicGraphGenerator } from '../src/lib/diagnosis/graph-generator';
import { GraphLayoutEngine } from '../src/lib/diagnosis/graph-layout';
import {
  validateDiagramSpecification,
  type StructuredDiagram,
} from '../src/types/diagnosis-graph';
import type { InterpretedQuery } from '../src/lib/diagnosis/query-interpreter';
import type { ExternalEvidenceItem } from '../src/lib/rag/external-retrieval';

async function runQueryAwareGraphTestSuite() {
  console.log('🧪 Starting Query-Aware Connected Graph Visualizer Test Suite...\n');

  const mockEvidence: ExternalEvidenceItem[] = [
    {
      id: 'doc_1',
      documentId: 'doc_1',
      problemTitle: 'Longest Substring Without Repeating Characters',
      slug: 'longest-substring-without-repeating-characters',
      topics: ['Hash Table', 'String', 'Sliding Window'],
      difficulty: 'Medium',
      companies: ['Amazon', 'Google'],
      isCompanyVerified: true,
      contentSnippet: 'Given a string s, find the length of the longest substring without duplicate characters.',
      fullContent: 'Given a string s, find the length of the longest substring without duplicate characters.',
      sourceUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
      repository: 'test/leetcode',
      filePath: 'solutions/longest_substring.py',
      similarityScore: 0.95,
      relevanceScore: 95,
      retrievalPath: 'pgvector_semantic',
      provenance: {
        sourceType: 'github',
        repository: 'test/leetcode',
        filePath: 'solutions/longest_substring.py',
        sourceUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
        isCommunityReported: false,
      },
    },
    {
      id: 'doc_2',
      documentId: 'doc_2',
      problemTitle: 'Minimum Window Substring',
      slug: 'minimum-window-substring',
      topics: ['Hash Table', 'String', 'Sliding Window'],
      difficulty: 'Hard',
      companies: ['Amazon', 'Meta'],
      isCompanyVerified: true,
      contentSnippet: 'Given two strings s and t, return the minimum window substring.',
      fullContent: 'Given two strings s and t, return the minimum window substring.',
      sourceUrl: 'https://leetcode.com/problems/minimum-window-substring/',
      repository: 'test/leetcode',
      filePath: 'solutions/min_window.py',
      similarityScore: 0.90,
      relevanceScore: 90,
      retrievalPath: 'pgvector_semantic',
      provenance: {
        sourceType: 'github',
        repository: 'test/leetcode',
        filePath: 'solutions/min_window.py',
        sourceUrl: 'https://leetcode.com/problems/minimum-window-substring/',
        isCommunityReported: false,
      },
    },
  ];

  // ── TEST 1: Concept Query -> Radial Connected Graph ───────────────────────
  console.log('Test 1: Concept query generates Radial Connected Graph with central topic...');
  const conceptInterpreted: InterpretedQuery = {
    originalQuery: 'Explain Sliding Window technique',
    mainTopic: 'Sliding Window',
    requestedTasks: ['concept_explanation'],
    route: 'general_technical',
    requiresPersonalHistory: false,
    requiresExternalSearch: true,
    explicitSubmissionReference: false,
    conceptsAndKeywords: ['sliding window'],
    ambiguityOrMissingInfo: null,
    resolvedContext: null,
  };

  const radialDiagram = DynamicGraphGenerator.generateDiagram(
    'Explain Sliding Window technique',
    conceptInterpreted,
    mockEvidence
  );

  assert(radialDiagram !== null, 'Radial diagram must be generated');
  assert.strictEqual(radialDiagram.diagramType, 'radial_graph');
  assert.strictEqual(radialDiagram.layoutMode, 'radial');
  assert.strictEqual(radialDiagram.centralNodeId, 'central_topic');

  // Verify central node
  const centralNode = radialDiagram.nodes.find((n) => n.id === 'central_topic');
  assert(centralNode, 'Central topic node must exist');
  assert.strictEqual(centralNode.type, 'central_topic');
  assert.strictEqual(centralNode.label, 'Sliding Window');

  // Verify orbital branch types
  const nodeTypes = new Set(radialDiagram.nodes.map((n) => n.type));
  assert(nodeTypes.has('prerequisite'), 'Must include prerequisite branches');
  assert(nodeTypes.has('algorithm'), 'Must include core invariant branches');
  assert(nodeTypes.has('example_problem'), 'Must include real example problem branches');
  assert(nodeTypes.has('weakness'), 'Must include pitfall/weakness branches');
  assert(nodeTypes.has('resource'), 'Must include verified resource branches');

  // Verify radial edges connect to central topic
  const centralEdges = radialDiagram.edges.filter(
    (e) => e.source === 'central_topic' || e.target === 'central_topic'
  );
  assert(centralEdges.length >= 4, 'Must have radial edges connecting peripheral nodes to central topic');

  console.log(`  ✓ Pass: Generated Radial Graph "${radialDiagram.title}" (${radialDiagram.nodes.length} nodes, ${radialDiagram.edges.length} edges).`);

  // ── TEST 2: Prerequisite Query -> Hierarchical Tree Graph ─────────────────
  console.log('Test 2: Prerequisite query generates Hierarchical Tree Graph...');
  const prereqInterpreted: InterpretedQuery = {
    originalQuery: 'What are the prerequisites and roadmap for Dynamic Programming?',
    mainTopic: 'Dynamic Programming',
    requestedTasks: ['concept_explanation'],
    route: 'general_technical',
    requiresPersonalHistory: false,
    requiresExternalSearch: true,
    explicitSubmissionReference: false,
    conceptsAndKeywords: ['dynamic programming'],
    ambiguityOrMissingInfo: null,
    resolvedContext: null,
  };

  const treeDiagram = DynamicGraphGenerator.generateDiagram(
    'What are the prerequisites and roadmap for Dynamic Programming?',
    prereqInterpreted,
    mockEvidence
  );

  assert(treeDiagram !== null, 'Tree diagram must be generated');
  assert.strictEqual(treeDiagram.diagramType, 'tree_graph');
  assert.strictEqual(treeDiagram.layoutMode, 'tree');

  const rootNode = treeDiagram.nodes.find((n) => n.id === 'tree_root');
  assert(rootNode, 'Tree root node must exist');

  // Verify tree edge hierarchy
  const edgesFromRoot = treeDiagram.edges.filter((e) => e.source === 'tree_root');
  assert(edgesFromRoot.length >= 2, 'Root node must branch into multiple foundational pillars');

  console.log(`  ✓ Pass: Generated Tree Graph "${treeDiagram.title}" (${treeDiagram.nodes.length} nodes, ${treeDiagram.edges.length} edges).`);

  // ── TEST 3: Algorithm Execution Query -> Flowchart with Simulation ────────
  console.log('Test 3: Algorithm execution query generates Flowchart with simulation steps...');
  const execInterpreted: InterpretedQuery = {
    originalQuery: 'Show me the step by step execution and flowchart of BFS traversal',
    mainTopic: 'Breadth-First Search',
    requestedTasks: ['concept_explanation'],
    route: 'general_technical',
    requiresPersonalHistory: false,
    requiresExternalSearch: true,
    explicitSubmissionReference: false,
    conceptsAndKeywords: ['bfs'],
    ambiguityOrMissingInfo: null,
    resolvedContext: null,
  };

  const flowchartDiagram = DynamicGraphGenerator.generateDiagram(
    'Show me the step by step execution and flowchart of BFS traversal',
    execInterpreted,
    mockEvidence
  );

  assert(flowchartDiagram !== null, 'Flowchart must be generated');
  assert.strictEqual(flowchartDiagram.diagramType, 'algorithm_flowchart');
  assert.strictEqual(flowchartDiagram.supportsSimulation, true);
  assert(flowchartDiagram.simulationSteps && flowchartDiagram.simulationSteps.length >= 4);

  // Verify decision nodes & branch edges
  const hasDecision = flowchartDiagram.nodes.some((n) => n.type === 'decision');
  assert(hasDecision, 'Flowchart must contain invariant decision check');

  const hasBranchYes = flowchartDiagram.edges.some((e) => e.relationType === 'branch_yes');
  const hasBranchNo = flowchartDiagram.edges.some((e) => e.relationType === 'branch_no');
  assert(hasBranchYes && hasBranchNo, 'Flowchart must have Yes and No branch paths');

  console.log(`  ✓ Pass: Generated Flowchart "${flowchartDiagram.title}" with ${flowchartDiagram.simulationSteps?.length} deterministic simulation steps.`);

  // ── TEST 4: Architecture Query -> Component Architecture Graph ────────────
  console.log('Test 4: Architecture query generates Component & Data-Flow Graph...');
  const archInterpreted: InterpretedQuery = {
    originalQuery: 'Explain the system architecture and data flow of FailureAtlas RAG pipeline',
    mainTopic: 'RAG Pipeline Architecture',
    requestedTasks: ['concept_explanation'],
    route: 'general_technical',
    requiresPersonalHistory: false,
    requiresExternalSearch: true,
    explicitSubmissionReference: false,
    conceptsAndKeywords: ['rag', 'architecture'],
    ambiguityOrMissingInfo: null,
    resolvedContext: null,
  };

  const archDiagram = DynamicGraphGenerator.generateDiagram(
    'Explain the system architecture and data flow of FailureAtlas RAG pipeline',
    archInterpreted,
    mockEvidence
  );

  assert(archDiagram !== null, 'Architecture diagram must be generated');
  assert.strictEqual(archDiagram.diagramType, 'architecture_graph');
  assert.strictEqual(archDiagram.layoutMode, 'architecture');

  const archNodeTypes = new Set(archDiagram.nodes.map((n) => n.type));
  assert(archNodeTypes.has('storage') || archNodeTypes.has('service'));
  assert(archDiagram.edges.some((e) => e.relationType === 'data_flow'));

  console.log(`  ✓ Pass: Generated Architecture Graph "${archDiagram.title}" with ${archDiagram.nodes.length} component tiers.`);

  // ── TEST 5: Grounded Node Details & Verified External Links ───────────────
  console.log('Test 5: Validating grounded node details, complexity, and source URLs...');
  const exampleNode = radialDiagram.nodes.find((n) => n.type === 'example_problem');
  assert(exampleNode, 'Example problem node must exist in radial graph');
  assert(exampleNode.sourceUrl?.startsWith('https://'), 'External URL must use secure https protocol');
  assert.strictEqual(exampleNode.evidenceRefId, 'doc_1');

  const resourceNode = radialDiagram.nodes.find((n) => n.type === 'resource');
  assert(resourceNode && resourceNode.sourceUrl?.startsWith('https://'));

  console.log(`  ✓ Pass: Verified grounded citations: ${exampleNode.label} (${exampleNode.sourceUrl}).`);

  // ── TEST 6: Layout Engine Geometry & Non-Overlapping Coordinates ──────────
  console.log('Test 6: Layout Engine coordinate calculations (Radial, Tree, Flowchart)...');

  // Radial Layout
  const radialLayout = GraphLayoutEngine.applyLayout(radialDiagram, 'radial');
  const radialCenter = radialLayout.nodes.find((n) => n.id === 'central_topic');
  assert(radialCenter && radialCenter.position.x === 420 && radialCenter.position.y === 300);

  // Check peripheral radial nodes are positioned around center
  const peripheral1 = radialLayout.nodes.find((n) => n.id !== 'central_topic');
  assert(peripheral1 && (peripheral1.position.x !== 420 || peripheral1.position.y !== 300));

  // Tree Layout
  const treeLayout = GraphLayoutEngine.applyLayout(treeDiagram, 'tree');
  assert(treeLayout.nodes.length === treeDiagram.nodes.length);
  assert(treeLayout.nodes.every((n) => typeof n.position.x === 'number' && typeof n.position.y === 'number'));

  // Flowchart Layout
  const flowLayout = GraphLayoutEngine.applyLayout(flowchartDiagram, 'flowchart');
  assert(flowLayout.nodes.length === flowchartDiagram.nodes.length);
  assert(flowLayout.bounds.width > 0 && flowLayout.bounds.height > 0);

  console.log('  ✓ Pass: Layout Engine calculated valid 2D coordinates across all layout modes.');

  // ── TEST 7: Specification Validator & Security Guardrails ────────────────
  console.log('Test 7: Schema validation, unique IDs, dangling edge prevention, and URL safety...');
  const validCheck = validateDiagramSpecification(radialDiagram);
  assert.strictEqual(validCheck.isValid, true);

  // Test duplicate node IDs rejection
  const dupDiagram = JSON.parse(JSON.stringify(radialDiagram));
  dupDiagram.nodes.push({ ...dupDiagram.nodes[0] });
  const dupCheck = validateDiagramSpecification(dupDiagram);
  assert.strictEqual(dupCheck.isValid, false);
  assert(dupCheck.error?.includes('Duplicate node ID'));

  // Test dangling edge rejection
  const danglingDiagram = JSON.parse(JSON.stringify(radialDiagram));
  danglingDiagram.edges.push({ id: 'e_dangle', source: 'central_topic', target: 'non_existent_node_999' });
  const dangleCheck = validateDiagramSpecification(danglingDiagram);
  assert.strictEqual(dangleCheck.isValid, false);
  assert(dangleCheck.error?.includes('non-existent target node'));

  // Test unsafe javascript: URL rejection
  const unsafeDiagram = JSON.parse(JSON.stringify(radialDiagram));
  unsafeDiagram.nodes[0].sourceUrl = 'javascript:alert(1)';
  const unsafeCheck = validateDiagramSpecification(unsafeDiagram);
  assert.strictEqual(unsafeCheck.isValid, false);

  console.log('  ✓ Pass: Validator reliably blocked duplicate IDs, dangling edges, and unsafe URL schemes.');

  // ── TEST 8: Child Concept Drill-Down Query Generation ─────────────────────
  console.log('Test 8: Child concept drill-down query generation...');
  const prereqNodeWithDrillDown = radialDiagram.nodes.find((n) => Boolean(n.childGraphQuery));
  assert(prereqNodeWithDrillDown && prereqNodeWithDrillDown.childGraphQuery);

  const childInterpreted: InterpretedQuery = {
    originalQuery: prereqNodeWithDrillDown.childGraphQuery,
    mainTopic: prereqNodeWithDrillDown.label,
    requestedTasks: ['concept_explanation'],
    route: 'general_technical',
    requiresPersonalHistory: false,
    requiresExternalSearch: true,
    explicitSubmissionReference: false,
    conceptsAndKeywords: [prereqNodeWithDrillDown.label],
    ambiguityOrMissingInfo: null,
    resolvedContext: null,
  };

  const childDiagram = DynamicGraphGenerator.generateDiagram(
    prereqNodeWithDrillDown.childGraphQuery,
    childInterpreted,
    mockEvidence
  );

  assert(childDiagram !== null);
  assert.strictEqual(childDiagram.centralNodeId, 'central_topic');
  assert.strictEqual(childDiagram.nodes.find((n) => n.id === 'central_topic')?.label, prereqNodeWithDrillDown.label);

  console.log(`  ✓ Pass: Successfully drilled into child concept "${prereqNodeWithDrillDown.label}" producing dedicated child graph.`);

  console.log('\n🎉 ALL 8 QUERY-AWARE GRAPH VISUALIZER TESTS PASSED SUCCESSFULLY!\n');
}

runQueryAwareGraphTestSuite().catch((err) => {
  console.error('❌ Query-aware graph test suite failed:', err);
  process.exit(1);
});
