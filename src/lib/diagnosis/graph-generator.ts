/**
 * src/lib/diagnosis/graph-generator.ts
 *
 * Query-Aware Dynamic Graph & Flowchart Generator.
 * Automatically chooses the optimal visualization mode:
 * 1. Radial Graph: Central topic node with orbital branches (prerequisites, invariants, examples, weaknesses, resources)
 * 2. Tree Graph: Hierarchical root and descendant concepts
 * 3. Flowchart: Sequential execution steps, decisions, and deterministic simulation
 * 4. Architecture Graph: System components and data-flow integration
 */

import {
  type StructuredDiagram,
  type DiagramType,
  type DiagramNode,
  type DiagramEdge,
  type SimulationStep,
  validateDiagramSpecification,
} from '@/types/diagnosis-graph';
import type { InterpretedQuery } from './query-interpreter';
import type { ExternalEvidenceItem } from '@/lib/rag/external-retrieval';
import type { InferredSkillProfile } from './skill-inference';

export class DynamicGraphGenerator {
  /**
   * Decide whether a query warrants a diagram
   */
  static shouldGenerateDiagram(
    queryText: string,
    interpreted: InterpretedQuery
  ): boolean {
    const q = queryText.toLowerCase();
    const diagramKeywords = [
      'graph',
      'flowchart',
      'diagram',
      'visualize',
      'visualization',
      'trace',
      'steps',
      'execution',
      'tree',
      'hierarchy',
      'prerequisite',
      'architecture',
      'component',
      'data flow',
      'system design',
      'radial',
      'concept',
      'bfs',
      'dfs',
      'traversal',
      'sliding window',
      'binary search',
      'dynamic programming',
      'two pointers',
    ];

    if (diagramKeywords.some((k) => q.includes(k))) return true;

    // Any concept explanation or technical question benefits from a connected graph
    if (interpreted.requestedTasks.some((t) => t === 'concept_explanation' || t === 'debugging')) {
      return true;
    }

    return false;
  }

  /**
   * Visualization Planner:
   * Selects the most effective diagram mode and generates the tailored graph
   */
  static generateDiagram(
    queryText: string,
    interpreted: InterpretedQuery,
    evidenceItems: ExternalEvidenceItem[] = [],
    skillProfile?: InferredSkillProfile
  ): StructuredDiagram | null {
    const q = queryText.toLowerCase();
    const topic = (interpreted.mainTopic || 'DSA Problem Solving').trim();

    // 1. Architecture Graph: System design, components, pipeline, data flow
    if (
      q.includes('architecture') ||
      q.includes('system design') ||
      q.includes('component') ||
      q.includes('data flow') ||
      q.includes('microservice') ||
      q.includes('pipeline')
    ) {
      return this.generateArchitectureGraph(topic, queryText, evidenceItems);
    }

    // 2. Tree Graph: Prerequisites, hierarchy, taxonomy, foundation tree
    if (
      q.includes('prerequisite') ||
      q.includes('hierarchy') ||
      q.includes('roadmap') ||
      q.includes('foundation') ||
      q.includes('tree of') ||
      q.includes('taxonomy')
    ) {
      return this.generateTreeGraph(topic, queryText, evidenceItems, skillProfile);
    }

    // 3. Algorithm Flowchart: Step-by-step execution, simulation trace, decision flow
    if (
      q.includes('execution') ||
      q.includes('trace') ||
      q.includes('flowchart') ||
      q.includes('step by step') ||
      q.includes('how it runs') ||
      q.includes('simulation') ||
      q.includes('bfs') ||
      q.includes('binary search execution') ||
      q.includes('sliding window steps')
    ) {
      return this.generateFlowchartGraph(topic, queryText, evidenceItems);
    }

    // 4. Primary Design: Radial Connected Graph (Central topic with orbital branches)
    // Suitable for concepts, techniques, company interview patterns, and general technical queries
    return this.generateRadialConnectedGraph(topic, queryText, evidenceItems, skillProfile);
  }

  /**
   * Mode 1 (Primary Design): Radial Connected Graph
   * Central concept in center, branching into Prerequisites, Invariants, Examples, Weaknesses, and Resources.
   */
  static generateRadialConnectedGraph(
    topic: string,
    queryText: string,
    evidenceItems: ExternalEvidenceItem[] = [],
    skillProfile?: InferredSkillProfile
  ): StructuredDiagram | null {
    const centralId = 'central_topic';
    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];

    // 1. Central Topic Node
    nodes.push({
      id: centralId,
      label: topic,
      type: 'central_topic',
      explanation: `Core algorithmic concept: ${topic}. Focus on invariants, optimal time complexity, and edge-case handling.`,
      isHighlighted: true,
      complexity: topic.toLowerCase().includes('sliding') || topic.toLowerCase().includes('two pointers')
        ? 'O(N) Time / O(1) Space'
        : 'O(N log N) or O(V+E)',
    });

    // 2. Branch: Prerequisite Concepts
    const prereqNodes = this.derivePrerequisites(topic);
    prereqNodes.forEach((prereq, idx) => {
      const id = `prereq_${idx + 1}`;
      nodes.push({
        id,
        label: prereq.label,
        type: 'prerequisite',
        explanation: prereq.explanation,
        complexity: prereq.complexity,
        childGraphQuery: `Explain ${prereq.label} in detail`,
      });
      edges.push({
        id: `e_${centralId}_${id}`,
        source: id,
        target: centralId,
        label: 'Prerequisite',
        relationType: 'prerequisite',
      });
    });

    // 3. Branch: Core Invariant / Sub-technique
    const invariantId = 'core_invariant';
    nodes.push({
      id: invariantId,
      label: `${topic} Invariant`,
      type: 'algorithm',
      explanation: `State invariant ensuring window validity, monotonic range, or traversal bounds at each iteration step.`,
      complexity: 'Step Invariant',
    });
    edges.push({
      id: `e_${centralId}_${invariantId}`,
      source: centralId,
      target: invariantId,
      label: 'Maintains',
      relationType: 'leads_to',
    });

    // 4. Branch: Example Problems from Retrieved Evidence
    const topEvidence = evidenceItems.slice(0, 3);
    if (topEvidence.length > 0) {
      topEvidence.forEach((ev, idx) => {
        const id = `example_${idx + 1}`;
        const companyList = (ev.companies || (ev as any).companyTags || []) as string[];
        const companyStr = companyList.slice(0, 2).join(', ') || 'General';
        nodes.push({
          id,
          label: ev.problemTitle,
          type: 'example_problem',
          explanation: `Classic ${ev.difficulty} problem demonstrating ${topic}. Companies: ${companyStr}.`,
          evidenceRefId: ev.id,
          sourceUrl: ev.sourceUrl || `https://leetcode.com/problemset/all/?search=${encodeURIComponent(ev.problemTitle)}`,
          complexity: ev.difficulty,
          relatedProblems: [ev.problemTitle],
        });
        edges.push({
          id: `e_${centralId}_${id}`,
          source: centralId,
          target: id,
          label: 'Applies to',
          relationType: 'radial_branch',
        });
      });
    } else {
      // Fallback example node if evidence is empty
      const id = 'example_1';
      nodes.push({
        id,
        label: `${topic} Standard Problem`,
        type: 'example_problem',
        explanation: `Standard benchmark problem demonstrating optimal application of ${topic}.`,
        complexity: 'Medium',
      });
      edges.push({
        id: `e_${centralId}_${id}`,
        source: centralId,
        target: id,
        label: 'Applies to',
        relationType: 'radial_branch',
      });
    }

    // 5. Branch: User Weakness & Pitfall (Tailored to submission history / skill)
    const weaknessId = 'common_weakness';
    const weaknessLabel = this.deriveWeaknessLabel(topic, skillProfile);
    nodes.push({
      id: weaknessId,
      label: weaknessLabel.title,
      type: 'weakness',
      explanation: weaknessLabel.explanation,
      isHighlighted: true,
      complexity: 'Common WA / TLE',
    });
    edges.push({
      id: `e_${centralId}_${weaknessId}`,
      source: centralId,
      target: weaknessId,
      label: 'Common Failure Mode',
      relationType: 'depends_on',
    });

    // 6. Branch: Verified Learning Resource
    const resourceId = 'verified_resource';
    nodes.push({
      id: resourceId,
      label: `${topic} Guide & Solutions`,
      type: 'resource',
      explanation: `Verified external DSA repository and curated tutorial reference for ${topic}.`,
      sourceUrl: this.deriveResourceUrl(topic),
    });
    edges.push({
      id: `e_${centralId}_${resourceId}`,
      source: centralId,
      target: resourceId,
      label: 'Reference',
      relationType: 'radial_branch',
    });

    const diagram: StructuredDiagram = {
      diagramType: 'radial_graph',
      title: `${topic} — Connected Concept Graph`,
      description: `Radial knowledge graph centering on ${topic}, linking foundational prerequisites, real interview examples, potential pitfalls, and authoritative references.`,
      layoutMode: 'radial',
      centralNodeId: centralId,
      nodes,
      edges,
      legend: [
        { label: 'Central Concept', color: '#ff5f52' },
        { label: 'Prerequisite', color: '#f59e0b' },
        { label: 'Core Invariant', color: '#38bdf8' },
        { label: 'Interview Example', color: '#10b981' },
        { label: 'Common Pitfall', color: '#f43f5e' },
        { label: 'Verified Resource', color: '#60a5fa' },
      ],
      mermaidFallback: this.generateMermaidRadial(topic, nodes, edges),
    };

    const validated = validateDiagramSpecification(diagram);
    return validated.isValid && validated.diagram ? validated.diagram : diagram;
  }

  /**
   * Mode 2: Tree Graph (Hierarchical Prerequisite & Concept Taxonomy)
   */
  static generateTreeGraph(
    topic: string,
    queryText: string,
    evidenceItems: ExternalEvidenceItem[] = [],
    skillProfile?: InferredSkillProfile
  ): StructuredDiagram | null {
    const rootId = 'tree_root';
    const nodes: DiagramNode[] = [
      {
        id: rootId,
        label: `${topic} Roadmap`,
        type: 'concept',
        explanation: `Comprehensive hierarchical learning tree for mastering ${topic}.`,
        isHighlighted: true,
        complexity: 'Root Paradigm',
      },
      // Level 1: Foundations
      {
        id: 'found_1',
        label: 'Basic Data Structures',
        type: 'prerequisite',
        explanation: 'Arrays, Pointers, and Continuous Memory Allocation.',
        complexity: 'Foundation Level 1',
        childGraphQuery: 'Explain Array and Pointer basics',
      },
      {
        id: 'found_2',
        label: 'Monotonic & Ordered Properties',
        type: 'prerequisite',
        explanation: 'Sorted sequences, prefix invariants, and two-way bounds.',
        complexity: 'Foundation Level 1',
      },
      // Level 2: Intermediate Techniques
      {
        id: 'inter_1',
        label: `${topic} Fixed Range`,
        type: 'algorithm',
        explanation: 'Fixed window/range patterns with constant-size state shifts.',
        complexity: 'O(N) Time',
      },
      {
        id: 'inter_2',
        label: `${topic} Dynamic Range`,
        type: 'algorithm',
        explanation: 'Dynamically expanding and shrinking windows based on condition satisfaction.',
        complexity: 'O(N) Time',
      },
      // Level 3: Advanced Applications
      {
        id: 'adv_1',
        label: 'Multi-Condition Optimization',
        type: 'datastructure',
        explanation: 'Combining hash frequencies, heaps, or monotonic queues with range traversal.',
        complexity: 'O(N) or O(N log K)',
      },
    ];

    const edges: DiagramEdge[] = [
      { id: 'e_r_f1', source: rootId, target: 'found_1', label: 'Requires', relationType: 'prerequisite' },
      { id: 'e_r_f2', source: rootId, target: 'found_2', label: 'Requires', relationType: 'prerequisite' },
      { id: 'e_f1_i1', source: 'found_1', target: 'inter_1', label: 'Builds into', relationType: 'leads_to' },
      { id: 'e_f2_i2', source: 'found_2', target: 'inter_2', label: 'Builds into', relationType: 'leads_to' },
      { id: 'e_i2_a1', source: 'inter_2', target: 'adv_1', label: 'Specializes', relationType: 'leads_to' },
    ];

    // If external evidence exists, attach real problem as a leaf
    if (evidenceItems.length > 0) {
      const top = evidenceItems[0];
      const leafId = 'leaf_problem';
      nodes.push({
        id: leafId,
        label: top.problemTitle,
        type: 'example_problem',
        explanation: `Target interview problem: ${top.problemTitle} (${top.difficulty}).`,
        sourceUrl: top.sourceUrl || `https://leetcode.com/problemset/all/?search=${encodeURIComponent(top.problemTitle)}`,
        complexity: top.difficulty,
      });
      edges.push({
        id: 'e_a1_leaf',
        source: 'adv_1',
        target: leafId,
        label: 'Applied in',
        relationType: 'solves',
      });
    }

    const diagram: StructuredDiagram = {
      diagramType: 'tree_graph',
      title: `${topic} — Prerequisite & Mastery Tree`,
      description: `Hierarchical dependency tree showing foundational requirements, intermediate patterns, and advanced specializations for ${topic}.`,
      layoutMode: 'tree',
      layoutDirection: 'TB',
      centralNodeId: rootId,
      nodes,
      edges,
      legend: [
        { label: 'Root Topic', color: '#ff5f52' },
        { label: 'Foundation', color: '#f59e0b' },
        { label: 'Pattern', color: '#38bdf8' },
        { label: 'Advanced', color: '#a855f7' },
        { label: 'Interview Problem', color: '#10b981' },
      ],
      mermaidFallback: this.generateMermaidTree(nodes, edges),
    };

    const validated = validateDiagramSpecification(diagram);
    return validated.isValid && validated.diagram ? validated.diagram : diagram;
  }

  /**
   * Mode 3: Algorithm Flowchart with Step-by-Step Simulation
   */
  static generateFlowchartGraph(
    topic: string,
    queryText: string,
    evidenceItems: ExternalEvidenceItem[] = []
  ): StructuredDiagram | null {
    const isBFS = queryText.toLowerCase().includes('bfs') || topic.toLowerCase().includes('bfs');
    const isSliding = queryText.toLowerCase().includes('sliding') || topic.toLowerCase().includes('sliding');

    if (isBFS) {
      return this.generateBFSFlowchart(evidenceItems);
    }

    if (isSliding) {
      return this.generateSlidingWindowFlowchart(evidenceItems);
    }

    // Generic Algorithm Flowchart
    return this.generateGenericFlowchart(topic, evidenceItems);
  }

  /**
   * Mode 4: Architecture Graph (System Components & Data Flow)
   */
  static generateArchitectureGraph(
    topic: string,
    queryText: string,
    evidenceItems: ExternalEvidenceItem[] = []
  ): StructuredDiagram | null {
    const nodes: DiagramNode[] = [
      {
        id: 'client_ui',
        label: 'Client / Web UI',
        type: 'start_end',
        explanation: 'Praxis Next.js Diagnosis Chat & Graph Canvas (ReactFlow / Mermaid).',
        complexity: 'Edge Tier',
      },
      {
        id: 'api_gateway',
        label: 'API Gateway & Intent Router',
        type: 'decision',
        explanation: 'Routes user queries to personal failure intelligence vs external knowledge.',
        complexity: 'Sub-10ms Routing',
      },
      {
        id: 'knowledge_engine',
        label: 'External RAG Engine',
        type: 'service',
        explanation: 'Discovers GitHub datasets, normalizes canonical problems, and extracts 250-word chunks.',
        complexity: 'Async Processing',
      },
      {
        id: 'pgvector_db',
        label: 'PostgreSQL + pgvector',
        type: 'storage',
        explanation: 'Stores 1536-dimensional embeddings with cosine similarity distance search (<=>).',
        complexity: 'Vector Similarity Index',
      },
      {
        id: 'redis_cache',
        label: 'Upstash Redis Queue',
        type: 'storage',
        explanation: 'Durable FIFO ingestion job queue and response caching.',
        complexity: 'In-Memory Sub-ms',
      },
      {
        id: 'llm_synthesizer',
        label: 'Adaptive Explainer & Graph Planner',
        type: 'process',
        explanation: 'Synthesizes grounded explanations, diagrams, and practice recommendations.',
        complexity: 'LLM Generation',
      },
    ];

    const edges: DiagramEdge[] = [
      { id: 'e_client_gw', source: 'client_ui', target: 'api_gateway', label: 'User Query', relationType: 'data_flow' },
      { id: 'e_gw_rag', source: 'api_gateway', target: 'knowledge_engine', label: 'External Query', relationType: 'data_flow' },
      { id: 'e_rag_pgv', source: 'knowledge_engine', target: 'pgvector_db', label: 'Cosine Query', relationType: 'data_flow' },
      { id: 'e_rag_redis', source: 'knowledge_engine', target: 'redis_cache', label: 'Job Enqueue', relationType: 'data_flow' },
      { id: 'e_rag_llm', source: 'knowledge_engine', target: 'llm_synthesizer', label: 'RAG Evidence', relationType: 'data_flow' },
      { id: 'e_llm_client', source: 'llm_synthesizer', target: 'client_ui', label: 'Grounded Answer + Graph', relationType: 'data_flow' },
    ];

    const diagram: StructuredDiagram = {
      diagramType: 'architecture_graph',
      title: `${topic} — System Architecture & Data Flow`,
      description: `Component topology and data-flow pipelines between UI, routing, external retrieval, pgvector semantic indexing, and synthesis.`,
      layoutMode: 'architecture',
      layoutDirection: 'TB',
      nodes,
      edges,
      legend: [
        { label: 'Client / Ingress', color: '#10b981' },
        { label: 'Routing / Decision', color: '#f59e0b' },
        { label: 'Core Service', color: '#38bdf8' },
        { label: 'Storage / Cache', color: '#64748b' },
      ],
      mermaidFallback: this.generateMermaidArchitecture(nodes, edges),
    };

    const validated = validateDiagramSpecification(diagram);
    return validated.isValid && validated.diagram ? validated.diagram : diagram;
  }

  // ── Flowchart Implementations with Simulation Steps ──────────────────────────

  private static generateBFSFlowchart(evidence: ExternalEvidenceItem[]): StructuredDiagram {
    const nodes: DiagramNode[] = [
      { id: 'start', label: 'Start: Source Node', type: 'start_end', explanation: 'Source node chosen for traversal.' },
      { id: 'init_queue', label: 'Initialize Queue & Visited Set', type: 'process', explanation: 'Allocate FIFO queue and visited hash set.', complexity: 'O(V)' },
      { id: 'q_empty', label: 'Is Queue Empty?', type: 'decision', explanation: 'Check if traversal frontier has exhausted all reachable components.' },
      { id: 'dequeue', label: 'Dequeue Current Node', type: 'process', explanation: 'Remove front element (FIFO order) and process current depth level.', complexity: 'O(1)' },
      { id: 'visit_adj', label: 'Inspect Neighbors', type: 'process', explanation: 'Iterate over all directed / undirected outgoing edges of current vertex.' },
      { id: 'is_visited', label: 'Neighbor in Visited Set?', type: 'decision', explanation: 'Prevents infinite cycles in cyclic graphs and redundant state traversal.' },
      { id: 'enqueue', label: 'Mark Visited & Enqueue', type: 'process', explanation: 'Add neighbor to visited hash set and push to rear of queue.', complexity: 'O(1)' },
      { id: 'finish', label: 'End: Traversal Complete', type: 'start_end', explanation: 'Return shortest path distances or level-order node sequence.' },
    ];

    const edges: DiagramEdge[] = [
      { id: 'e0', source: 'start', target: 'init_queue', label: 'Init', relationType: 'leads_to' },
      { id: 'e1', source: 'init_queue', target: 'q_empty', label: 'Begin', relationType: 'leads_to' },
      { id: 'e2', source: 'q_empty', target: 'finish', label: 'Yes (Queue Empty)', relationType: 'branch_yes' },
      { id: 'e3', source: 'q_empty', target: 'dequeue', label: 'No (Has Nodes)', relationType: 'branch_no' },
      { id: 'e4', source: 'dequeue', target: 'visit_adj', label: 'Expand', relationType: 'leads_to' },
      { id: 'e5', source: 'visit_adj', target: 'is_visited', label: 'For each neighbor', relationType: 'leads_to' },
      { id: 'e6', source: 'is_visited', target: 'enqueue', label: 'No (Not Visited)', relationType: 'branch_no' },
      { id: 'e7', source: 'is_visited', target: 'q_empty', label: 'Yes (Skip Cycle)', relationType: 'cycles_to' },
      { id: 'e8', source: 'enqueue', target: 'q_empty', label: 'Next Loop', relationType: 'leads_to' },
    ];

    const simulationSteps: SimulationStep[] = [
      { stepNumber: 1, activeNodeId: 'start', title: 'Initialization', description: 'Source node 0 added to queue [0]; visited set = {0}.' },
      { stepNumber: 2, activeNodeId: 'q_empty', title: 'Frontier Check', description: 'Queue contains [0], not empty. Proceeding to dequeue.' },
      { stepNumber: 3, activeNodeId: 'dequeue', title: 'Dequeue Front', description: 'Dequeued node 0. Examining adjacent neighbors (1, 2).' },
      { stepNumber: 4, activeNodeId: 'is_visited', title: 'Cycle Check', description: 'Neighbor 1 not in visited set. Marking visited and enqueueing.' },
      { stepNumber: 5, activeNodeId: 'enqueue', title: 'Enqueueing', description: 'Queue now holds [1, 2]. Level 1 discovery completed.' },
      { stepNumber: 6, activeNodeId: 'finish', title: 'Termination', description: 'All connected components explored. Shortest paths computed.' },
    ];

    return {
      diagramType: 'algorithm_flowchart',
      title: 'Breadth-First Search (BFS) Traversal Flowchart',
      description: 'Level-by-level queue execution with cycle prevention and visited set invariants.',
      layoutMode: 'flowchart',
      layoutDirection: 'TB',
      supportsSimulation: true,
      simulationSteps,
      nodes,
      edges,
      legend: [
        { label: 'Boundary', color: '#10b981' },
        { label: 'Decision', color: '#f59e0b' },
        { label: 'Operation', color: '#38bdf8' },
      ],
      mermaidFallback: `flowchart TD\n  start([Start]) --> q_empty{Queue Empty?}\n  q_empty -- Yes --> finish([Finish])\n  q_empty -- No --> dequeue[Dequeue Front]\n  dequeue --> visit_adj[Inspect Neighbors]\n  visit_adj --> is_visited{Already Visited?}\n  is_visited -- No --> enqueue[Mark Visited & Enqueue]\n  is_visited -- Yes --> q_empty\n  enqueue --> q_empty`,
    };
  }

  private static generateSlidingWindowFlowchart(evidence: ExternalEvidenceItem[]): StructuredDiagram {
    const nodes: DiagramNode[] = [
      { id: 'init', label: 'Init: left=0, right=0', type: 'start_end', explanation: 'Initialize two pointers at array start with state aggregator (sum, counts).' },
      { id: 'expand', label: 'Expand right pointer', type: 'process', explanation: 'Incorporate nums[right] into window state.', complexity: 'O(1)' },
      { id: 'check_inv', label: 'Is Window Condition Met?', type: 'decision', explanation: 'Validate constraint (e.g. sum <= K, unique chars count <= K).' },
      { id: 'shrink', label: 'Shrink left pointer', type: 'process', explanation: 'Remove nums[left] from state and increment left until condition valid.', complexity: 'Amortized O(1)' },
      { id: 'update_ans', label: 'Update Optimal Result', type: 'process', explanation: 'Update max/min window length (right - left + 1).' },
      { id: 'is_end', label: 'right == N - 1?', type: 'decision', explanation: 'Check whether right pointer reached array boundary.' },
      { id: 'done', label: 'End: Return Best Result', type: 'start_end', explanation: 'Global optimum determined in linear O(N) time.' },
    ];

    const edges: DiagramEdge[] = [
      { id: 'e_i_ex', source: 'init', target: 'expand', label: 'Start', relationType: 'leads_to' },
      { id: 'e_ex_chk', source: 'expand', target: 'check_inv', label: 'Inspect', relationType: 'leads_to' },
      { id: 'e_chk_sh', source: 'check_inv', target: 'shrink', label: 'Violated', relationType: 'branch_no' },
      { id: 'e_sh_chk', source: 'shrink', target: 'check_inv', label: 'Recheck', relationType: 'cycles_to' },
      { id: 'e_chk_ans', source: 'check_inv', target: 'update_ans', label: 'Valid', relationType: 'branch_yes' },
      { id: 'e_ans_end', source: 'update_ans', target: 'is_end', label: 'Advance', relationType: 'leads_to' },
      { id: 'e_end_ex', source: 'is_end', target: 'expand', label: 'right++', relationType: 'branch_no' },
      { id: 'e_end_done', source: 'is_end', target: 'done', label: 'Yes', relationType: 'branch_yes' },
    ];

    const simulationSteps: SimulationStep[] = [
      { stepNumber: 1, activeNodeId: 'init', title: 'Window Initialization', description: 'left = 0, right = 0, currentSum = 0.' },
      { stepNumber: 2, activeNodeId: 'expand', title: 'Right Expansion', description: 'Include nums[0]. Window covers [0..0].' },
      { stepNumber: 3, activeNodeId: 'check_inv', title: 'Invariant Evaluation', description: 'Window constraint satisfied. Record window length.' },
      { stepNumber: 4, activeNodeId: 'update_ans', title: 'Answer Update', description: 'Best window length updated to 1.' },
      { stepNumber: 5, activeNodeId: 'is_end', title: 'Boundary Check', description: 'right < N. Advancing right pointer.' },
      { stepNumber: 6, activeNodeId: 'done', title: 'Optimal Termination', description: 'Array traversal complete in O(N) total time.' },
    ];

    return {
      diagramType: 'algorithm_flowchart',
      title: 'Sliding Window Dynamic Range Flowchart',
      description: 'Two-pointer window expansion and contraction maintaining invariant in linear O(N) time.',
      layoutMode: 'flowchart',
      layoutDirection: 'TB',
      supportsSimulation: true,
      simulationSteps,
      nodes,
      edges,
      legend: [
        { label: 'Start / End', color: '#10b981' },
        { label: 'Decision Invariant', color: '#f59e0b' },
        { label: 'Pointer Step', color: '#38bdf8' },
      ],
      mermaidFallback: `flowchart TD\n  init([Init left=0, right=0]) --> expand[Expand right++]\n  expand --> check_inv{Invariant Valid?}\n  check_inv -- No --> shrink[Shrink left++]\n  shrink --> check_inv\n  check_inv -- Yes --> update_ans[Update Max/Min Answer]\n  update_ans --> is_end{right == N?}\n  is_end -- No --> expand\n  is_end -- Yes --> done([Done])`,
    };
  }

  private static generateGenericFlowchart(topic: string, evidence: ExternalEvidenceItem[]): StructuredDiagram {
    const nodes: DiagramNode[] = [
      { id: 'step_start', label: `Start: Input Data`, type: 'start_end', explanation: `Receive input problem data for ${topic}.` },
      { id: 'step_init', label: 'Initialize Structures', type: 'process', explanation: 'Allocate tracking arrays, pointers, or state containers.', complexity: 'O(1) to O(N)' },
      { id: 'step_decision', label: 'Termination Invariant Met?', type: 'decision', explanation: 'Check bounds, search partition, or cycle termination condition.' },
      { id: 'step_process', label: 'Transform & Transition State', type: 'process', explanation: `Core transition step of ${topic} algorithm.`, complexity: 'O(1)' },
      { id: 'step_done', label: 'Return Solution', type: 'start_end', explanation: 'Return final validated optimal answer.' },
    ];

    const edges: DiagramEdge[] = [
      { id: 'e1', source: 'step_start', target: 'step_init', label: 'Setup', relationType: 'leads_to' },
      { id: 'e2', source: 'step_init', target: 'step_decision', label: 'Loop Check', relationType: 'leads_to' },
      { id: 'e3', source: 'step_decision', target: 'step_process', label: 'Continue', relationType: 'branch_no' },
      { id: 'e4', source: 'step_process', target: 'step_decision', label: 'Next Step', relationType: 'cycles_to' },
      { id: 'e5', source: 'step_decision', target: 'step_done', label: 'Done', relationType: 'branch_yes' },
    ];

    return {
      diagramType: 'algorithm_flowchart',
      title: `${topic} Execution Flowchart`,
      description: `Structured execution steps and decision logic for ${topic}.`,
      layoutMode: 'flowchart',
      layoutDirection: 'TB',
      supportsSimulation: true,
      simulationSteps: [
        { stepNumber: 1, activeNodeId: 'step_start', title: 'Input Received', description: 'Problem parameters loaded.' },
        { stepNumber: 2, activeNodeId: 'step_init', title: 'Data Structures Initialized', description: 'State memory allocated.' },
        { stepNumber: 3, activeNodeId: 'step_decision', title: 'Condition Check', description: 'Evaluating termination invariant.' },
        { stepNumber: 4, activeNodeId: 'step_process', title: 'State Transformation', description: 'Applying algorithmic transition.' },
        { stepNumber: 5, activeNodeId: 'step_done', title: 'Execution Complete', description: 'Result returned.' },
      ],
      nodes,
      edges,
      mermaidFallback: `flowchart TD\n  step_start([Start]) --> step_init[Init Structures]\n  step_init --> step_decision{Terminated?}\n  step_decision -- No --> step_process[State Transition]\n  step_process --> step_decision\n  step_decision -- Yes --> step_done([Result])`,
    };
  }

  // ── Helper Domain Knowledge & Fallbacks ──────────────────────────────────────

  private static derivePrerequisites(topic: string): Array<{ label: string; explanation: string; complexity?: string }> {
    const t = topic.toLowerCase();
    if (t.includes('sliding') || t.includes('two pointers')) {
      return [
        { label: 'Array Indexing & Pointers', explanation: 'Understanding continuous memory bounds and pointer traversal.', complexity: 'Foundation' },
        { label: 'Monotonic Invariants', explanation: 'Understanding when expanding/shrinking guarantees correctness.', complexity: 'Invariant' },
      ];
    }
    if (t.includes('graph') || t.includes('bfs') || t.includes('dfs')) {
      return [
        { label: 'Adjacency Lists', explanation: 'Graph vertex and outgoing edge representation in memory.', complexity: 'O(V+E)' },
        { label: 'Visited State Set', explanation: 'Hash set tracking to avoid infinite cycles in cyclic graphs.', complexity: 'O(V)' },
      ];
    }
    if (t.includes('dynamic') || t.includes('dp')) {
      return [
        { label: 'Recursion & Call Stacks', explanation: 'Understanding subproblems and overlapping substructures.', complexity: 'Foundation' },
        { label: 'Memoization Tables', explanation: 'Caching subproblem results to eliminate redundant branches.', complexity: 'O(N)' },
      ];
    }
    if (t.includes('binary search')) {
      return [
        { label: 'Monotonic Search Space', explanation: 'Predicate function f(x) must be monotonic (false...false, true...true).', complexity: 'Foundation' },
        { label: 'Boundary Partition Rules', explanation: 'Accurate update rules for left = mid + 1 vs right = mid.', complexity: 'O(1)' },
      ];
    }
    return [
      { label: 'Time & Space Complexity', explanation: 'Big-O analysis and space budget estimation.', complexity: 'Foundation' },
      { label: 'Basic Data Structures', explanation: 'Arrays, Hash Maps, Stacks, and Queues.', complexity: 'Foundation' },
    ];
  }

  private static deriveWeaknessLabel(topic: string, skillProfile?: InferredSkillProfile): { title: string; explanation: string } {
    const t = topic.toLowerCase();
    if (t.includes('sliding')) {
      return {
        title: 'Off-By-One Boundary Bug',
        explanation: 'Failing to shrink left pointer until condition is valid, or miscounting window length as (right - left) instead of (right - left + 1).',
      };
    }
    if (t.includes('binary search')) {
      return {
        title: 'Infinite Loop on Mid Bias',
        explanation: 'Using mid = (left + right) / 2 with left = mid instead of left = mid + 1, causing infinite loop when right - left == 1.',
      };
    }
    if (t.includes('graph') || t.includes('bfs')) {
      return {
        title: 'Missing Visited Mark on Enqueue',
        explanation: 'Marking node as visited upon dequeue instead of enqueue, causing the same node to be enqueued multiple times leading to TLE.',
      };
    }
    return {
      title: 'Boundary & Edge Case Slip',
      explanation: 'Handling empty input arrays, single-element collections, or duplicate elements incorrectly.',
    };
  }

  private static deriveResourceUrl(topic: string): string {
    const t = topic.toLowerCase();
    if (t.includes('sliding') || t.includes('two pointers')) {
      return 'https://usaco.guide/silver/two-pointers';
    }
    if (t.includes('graph') || t.includes('bfs') || t.includes('dfs')) {
      return 'https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/';
    }
    if (t.includes('binary search')) {
      return 'https://leetcode.com/discuss/general-discussion/786126/python-powerful-ultimate-binary-search-template';
    }
    return 'https://github.com/azl397985856/leetcode';
  }

  private static generateMermaidRadial(topic: string, nodes: DiagramNode[], edges: DiagramEdge[]): string {
    const lines = ['flowchart TD'];
    nodes.forEach((n) => {
      const sanitized = n.label.replace(/["\(\)\[\]]/g, '');
      lines.push(`  ${n.id}["${sanitized}"]`);
    });
    edges.forEach((e) => {
      lines.push(`  ${e.source} -->|${e.label || ''}| ${e.target}`);
    });
    return lines.join('\n');
  }

  private static generateMermaidTree(nodes: DiagramNode[], edges: DiagramEdge[]): string {
    const lines = ['flowchart TD'];
    nodes.forEach((n) => {
      const sanitized = n.label.replace(/["\(\)\[\]]/g, '');
      lines.push(`  ${n.id}["${sanitized}"]`);
    });
    edges.forEach((e) => {
      lines.push(`  ${e.source} --> ${e.target}`);
    });
    return lines.join('\n');
  }

  private static generateMermaidArchitecture(nodes: DiagramNode[], edges: DiagramEdge[]): string {
    const lines = ['flowchart TD'];
    nodes.forEach((n) => {
      const sanitized = n.label.replace(/["\(\)\[\]]/g, '');
      lines.push(`  ${n.id}["${sanitized}"]`);
    });
    edges.forEach((e) => {
      lines.push(`  ${e.source} ==>|${e.label || ''}| ${e.target}`);
    });
    return lines.join('\n');
  }
}
