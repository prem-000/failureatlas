/**
 * src/lib/diagnosis/graph-generator.ts
 *
 * Generates structured diagram specifications (ReactFlow + Mermaid fallback)
 * for DSA algorithms, concept prerequisite graphs, execution traces, and decision flowcharts.
 */

import {
  type StructuredDiagram,
  type DiagramType,
  validateDiagramSpecification,
} from '@/types/diagnosis-graph';
import type { InterpretedQuery } from './query-interpreter';
import type { ExternalEvidenceItem } from '@/lib/rag/external-retrieval';

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
      'trace',
      'steps',
      'execution',
      'tree',
      'bfs',
      'dfs',
      'traversal',
      'state',
      'decision',
      'sliding window',
      'binary search',
      'flow',
    ];

    if (diagramKeywords.some((k) => q.includes(k))) return true;
    if (interpreted.requestedTasks.some((t) => t === 'concept_explanation' || t === 'debugging')) {
      const topic = interpreted.mainTopic.toLowerCase();
      return ['graph', 'tree', 'bfs', 'dfs', 'sorting', 'binary search', 'two pointers'].some((t) =>
        topic.includes(t)
      );
    }
    return false;
  }

  /**
   * Generate structured diagram tailored to the query, algorithm, and retrieved evidence
   */
  static generateDiagram(
    queryText: string,
    interpreted: InterpretedQuery,
    evidenceItems: ExternalEvidenceItem[] = []
  ): StructuredDiagram | null {
    const q = queryText.toLowerCase();
    const topic = interpreted.mainTopic.toLowerCase();

    // 1. Breadth-First Search (BFS) Execution / Flowchart
    if (q.includes('bfs') || topic.includes('bfs') || topic.includes('breadth')) {
      return this.generateBFSFlowchart(evidenceItems);
    }

    // 2. Sliding Window Invariant / Algorithm Flowchart
    if (q.includes('sliding window') || topic.includes('sliding') || topic.includes('window')) {
      return this.generateSlidingWindowFlowchart(evidenceItems);
    }

    // 3. Binary Search Decision Flowchart
    if (q.includes('binary search') || topic.includes('binary search')) {
      return this.generateBinarySearchFlowchart(evidenceItems);
    }

    // 4. Graph Cycle Detection / Course Schedule
    if (q.includes('cycle') || q.includes('topological') || topic.includes('graph')) {
      return this.generateGraphConceptGraph(evidenceItems);
    }

    // 5. Generic Algorithm Flowchart for the topic
    return this.generateGenericAlgorithmFlowchart(interpreted.mainTopic, evidenceItems);
  }

  private static generateBFSFlowchart(evidence: ExternalEvidenceItem[]): StructuredDiagram | null {
    const topEvidenceId = evidence[0]?.id;

    const diagram: StructuredDiagram = {
      diagramType: 'algorithm_flowchart',
      title: 'Breadth-First Search (BFS) Traversal Flowchart',
      description: 'Level-by-level queue execution with cycle prevention and visited set invariants.',
      layoutDirection: 'TB',
      nodes: [
        {
          id: 'start',
          label: 'Start: Root / Source Node',
          type: 'start_end',
          explanation: 'Initialize the search from starting vertex or root.',
          isHighlighted: false,
        },
        {
          id: 'init_queue',
          label: 'Enqueue Source & Mark Visited',
          type: 'process',
          explanation: 'Push root into FIFO Queue; add root to Visited set to eliminate redundant cycles.',
          evidenceRefId: topEvidenceId,
          complexity: 'O(1) initialization',
          isHighlighted: true,
        },
        {
          id: 'check_queue',
          label: 'Is Queue Empty?',
          type: 'decision',
          explanation: 'Loop invariant: Continue traversing as long as unexpanded nodes remain in queue.',
          isHighlighted: false,
        },
        {
          id: 'dequeue',
          label: 'Dequeue Front Node (u)',
          type: 'state_active',
          explanation: 'Pop front element. Process node value or record level depth.',
          complexity: 'O(1) pop',
          isHighlighted: true,
        },
        {
          id: 'explore_neighbors',
          label: 'For Each Neighbor v of u',
          type: 'process',
          explanation: 'Iterate over all directed or undirected edges adjacent to u.',
          isHighlighted: false,
        },
        {
          id: 'check_visited',
          label: 'Is Neighbor v Unvisited?',
          type: 'decision',
          explanation: 'Check if v is in the Visited Set.',
          isHighlighted: false,
        },
        {
          id: 'enqueue_neighbor',
          label: 'Mark v Visited & Enqueue v',
          type: 'state_visited',
          explanation: 'Add v to visited set immediately upon enqueuing to prevent duplicate entries.',
          isHighlighted: true,
        },
        {
          id: 'end',
          label: 'End / Return Result',
          type: 'start_end',
          explanation: 'Queue exhausted. Traversal complete or shortest path found.',
          complexity: 'Total: O(V + E) time, O(V) space',
          isHighlighted: false,
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'init_queue', relationType: 'leads_to' },
        { id: 'e2', source: 'init_queue', target: 'check_queue', relationType: 'leads_to' },
        { id: 'e3', source: 'check_queue', target: 'dequeue', label: 'No (items exist)', relationType: 'branch_no' },
        { id: 'e4', source: 'check_queue', target: 'end', label: 'Yes (empty)', relationType: 'branch_yes' },
        { id: 'e5', source: 'dequeue', target: 'explore_neighbors', relationType: 'leads_to' },
        { id: 'e6', source: 'explore_neighbors', target: 'check_visited', relationType: 'leads_to' },
        { id: 'e7', source: 'check_visited', target: 'enqueue_neighbor', label: 'Yes (new)', relationType: 'branch_yes' },
        { id: 'e8', source: 'check_visited', target: 'check_queue', label: 'No (visited)', relationType: 'branch_no' },
        { id: 'e9', source: 'enqueue_neighbor', target: 'check_queue', relationType: 'cycles_to' },
      ],
      legend: [
        { label: 'Start / End', color: '#10b981' },
        { label: 'Decision Invariant', color: '#f59e0b' },
        { label: 'Active Execution', color: '#38bdf8' },
        { label: 'Visited State', color: '#a855f7' },
      ],
      mermaidFallback: `graph TD
  start([Start: Source Node]) --> init_queue[Enqueue Source & Mark Visited]
  init_queue --> check_queue{Is Queue Empty?}
  check_queue -- No --> dequeue[Dequeue Front Node u]
  check_queue -- Yes --> end_node([End Traversal])
  dequeue --> explore[For each neighbor v]
  explore --> check_v{Is v Unvisited?}
  check_v -- Yes --> enqueue[Mark v Visited & Enqueue v]
  check_v -- No --> check_queue
  enqueue --> check_queue`,
    };

    const valid = validateDiagramSpecification(diagram);
    return valid.isValid ? diagram : null;
  }

  private static generateSlidingWindowFlowchart(evidence: ExternalEvidenceItem[]): StructuredDiagram | null {
    const topEvidenceId = evidence[0]?.id;

    const diagram: StructuredDiagram = {
      diagramType: 'algorithm_flowchart',
      title: 'Sliding Window Two-Pointers Flowchart',
      description: 'Dynamic window expansion with right pointer and bounded contraction with left pointer.',
      layoutDirection: 'TB',
      nodes: [
        {
          id: 'start',
          label: 'Initialize: left = 0, right = 0',
          type: 'start_end',
          explanation: 'Set boundary pointers at beginning of string or array.',
          isHighlighted: false,
        },
        {
          id: 'expand_window',
          label: 'Expand Right Pointer (right++)',
          type: 'state_active',
          explanation: 'Consume element nums[right], update state / frequency hash map.',
          evidenceRefId: topEvidenceId,
          isHighlighted: true,
        },
        {
          id: 'check_valid',
          label: 'Is Window Condition Violated?',
          type: 'decision',
          explanation: 'Evaluate invariant: e.g. duplicate element detected, or sum exceeds threshold.',
          isHighlighted: false,
        },
        {
          id: 'contract_left',
          label: 'Contract Left Pointer (left++)',
          type: 'process',
          explanation: 'Shrink window from left; decrement frequency of nums[left] until valid.',
          isHighlighted: true,
        },
        {
          id: 'update_answer',
          label: 'Update Global Optimum (max/min len)',
          type: 'state_completed',
          explanation: 'Record valid window length: maxLen = max(maxLen, right - left + 1).',
          isHighlighted: false,
        },
        {
          id: 'check_end',
          label: 'right < array.length?',
          type: 'decision',
          explanation: 'Check if right pointer reached array boundary.',
          isHighlighted: false,
        },
        {
          id: 'finish',
          label: 'Return Optimal Answer',
          type: 'start_end',
          explanation: 'Single pass completed in O(n) amortized time.',
          complexity: 'Time: O(n), Space: O(k)',
          isHighlighted: false,
        },
      ],
      edges: [
        { id: 'sw1', source: 'start', target: 'expand_window', relationType: 'leads_to' },
        { id: 'sw2', source: 'expand_window', target: 'check_valid', relationType: 'leads_to' },
        { id: 'sw3', source: 'check_valid', target: 'contract_left', label: 'Yes (violated)', relationType: 'branch_yes' },
        { id: 'sw4', source: 'contract_left', target: 'check_valid', label: 'Recheck', relationType: 'cycles_to' },
        { id: 'sw5', source: 'check_valid', target: 'update_answer', label: 'No (valid)', relationType: 'branch_no' },
        { id: 'sw6', source: 'update_answer', target: 'check_end', relationType: 'leads_to' },
        { id: 'sw7', source: 'check_end', target: 'expand_window', label: 'Yes (continue)', relationType: 'branch_yes' },
        { id: 'sw8', source: 'check_end', target: 'finish', label: 'No (done)', relationType: 'branch_no' },
      ],
      legend: [
        { label: 'Control Boundary', color: '#10b981' },
        { label: 'Active Pointer', color: '#38bdf8' },
        { label: 'Invariant Check', color: '#f59e0b' },
      ],
      mermaidFallback: `graph TD
  start([Initialize left=0, right=0]) --> expand[Expand: right++]
  expand --> check_inv{Invariant Violated?}
  check_inv -- Yes --> contract[Contract: left++]
  contract --> check_inv
  check_inv -- No --> update[Update Max/Min Answer]
  update --> check_bound{right < n?}
  check_bound -- Yes --> expand
  check_bound -- No --> finish([Return Result])`,
    };

    const valid = validateDiagramSpecification(diagram);
    return valid.isValid ? diagram : null;
  }

  private static generateBinarySearchFlowchart(evidence: ExternalEvidenceItem[]): StructuredDiagram | null {
    const diagram: StructuredDiagram = {
      diagramType: 'algorithm_flowchart',
      title: 'Binary Search Boundary Flowchart',
      description: 'Logarithmic search space reduction avoiding overflow and infinite loops.',
      layoutDirection: 'TB',
      nodes: [
        { id: 'bs_start', label: 'low = 0, high = n - 1', type: 'start_end', explanation: 'Define search interval [low, high].' },
        { id: 'bs_loop', label: 'while low <= high', type: 'decision', explanation: 'Termination condition: search space nonempty.' },
        { id: 'bs_mid', label: 'mid = low + (high - low) / 2', type: 'process', explanation: 'Prevents 32-bit integer overflow.', complexity: 'O(1)' },
        { id: 'bs_check_target', label: 'nums[mid] == target?', type: 'decision', explanation: 'Direct equality match check.' },
        { id: 'bs_found', label: 'Return mid index', type: 'start_end', explanation: 'Target discovered.', isHighlighted: true },
        { id: 'bs_compare', label: 'nums[mid] < target?', type: 'decision', explanation: 'Determine whether target lies in right or left half.' },
        { id: 'bs_move_right', label: 'low = mid + 1', type: 'process', explanation: 'Discard left half.' },
        { id: 'bs_move_left', label: 'high = mid - 1', type: 'process', explanation: 'Discard right half.' },
        { id: 'bs_not_found', label: 'Return -1 (Not Found)', type: 'start_end', explanation: 'Target does not exist in array.', complexity: 'Time: O(log n), Space: O(1)' },
      ],
      edges: [
        { id: 'b1', source: 'bs_start', target: 'bs_loop', relationType: 'leads_to' },
        { id: 'b2', source: 'bs_loop', target: 'bs_mid', label: 'low <= high', relationType: 'branch_yes' },
        { id: 'b3', source: 'bs_loop', target: 'bs_not_found', label: 'low > high', relationType: 'branch_no' },
        { id: 'b4', source: 'bs_mid', target: 'bs_check_target', relationType: 'leads_to' },
        { id: 'b5', source: 'bs_check_target', target: 'bs_found', label: 'Equal', relationType: 'branch_yes' },
        { id: 'b6', source: 'bs_check_target', target: 'bs_compare', label: 'Not Equal', relationType: 'branch_no' },
        { id: 'b7', source: 'bs_compare', target: 'bs_move_right', label: 'Less (Go Right)', relationType: 'branch_yes' },
        { id: 'b8', source: 'bs_compare', target: 'bs_move_left', label: 'Greater (Go Left)', relationType: 'branch_no' },
        { id: 'b9', source: 'bs_move_right', target: 'bs_loop', relationType: 'cycles_to' },
        { id: 'b10', source: 'bs_move_left', target: 'bs_loop', relationType: 'cycles_to' },
      ],
      legend: [
        { label: 'Boundary States', color: '#10b981' },
        { label: 'Condition Splits', color: '#f59e0b' },
      ],
      mermaidFallback: `graph TD
  bs_start([low=0, high=n-1]) --> bs_loop{low <= high?}
  bs_loop -- Yes --> bs_mid[mid = low + high-low/2]
  bs_loop -- No --> bs_not_found([Return -1])
  bs_mid --> bs_eq{nums[mid] == target?}
  bs_eq -- Yes --> bs_found([Return mid])
  bs_eq -- No --> bs_comp{nums[mid] < target?}
  bs_comp -- Yes --> bs_r[low = mid + 1] --> bs_loop
  bs_comp -- No --> bs_l[high = mid - 1] --> bs_loop`,
    };

    const valid = validateDiagramSpecification(diagram);
    return valid.isValid ? diagram : null;
  }

  private static generateGraphConceptGraph(evidence: ExternalEvidenceItem[]): StructuredDiagram | null {
    const topEvidenceId = evidence[0]?.id;

    const diagram: StructuredDiagram = {
      diagramType: 'concept_graph',
      title: 'Graph Algorithmic Dependency & Pattern Map',
      description: 'Foundations and pattern bridges connecting BFS, DFS, and cycle detection.',
      layoutDirection: 'LR',
      nodes: [
        { id: 'adj_list', label: 'Adjacency List', type: 'datastructure', explanation: 'Graph representation using Map<Node, List<Node>> with O(V + E) space.' },
        { id: 'bfs', label: 'Breadth-First Search', type: 'algorithm', explanation: 'Shortest path in unweighted graphs using FIFO queue.', evidenceRefId: topEvidenceId },
        { id: 'dfs', label: 'Depth-First Search', type: 'algorithm', explanation: 'Exhaustive exploration, cycle detection, and backtracking using recursion or stack.' },
        { id: 'topo_sort', label: 'Topological Sort', type: 'algorithm', explanation: 'Linear ordering of DAG vertices using Kahn\'s algorithm or post-order DFS.' },
        { id: 'kahn', label: 'Kahn\'s In-Degree Algorithm', type: 'algorithm', explanation: 'Queue-based indegree reduction. If processed count < V, a directed cycle exists.' },
        { id: 'cycle_detect', label: 'Cycle Detection Invariant', type: 'concept', explanation: 'Identifies mutual dependencies and deadlock conditions.', isHighlighted: true },
      ],
      edges: [
        { id: 'cg1', source: 'adj_list', target: 'bfs', label: 'underlies', relationType: 'prerequisite' },
        { id: 'cg2', source: 'adj_list', target: 'dfs', label: 'underlies', relationType: 'prerequisite' },
        { id: 'cg3', source: 'bfs', target: 'kahn', label: 'queue pattern', relationType: 'leads_to' },
        { id: 'cg4', source: 'dfs', target: 'topo_sort', label: 'post-order', relationType: 'leads_to' },
        { id: 'cg5', source: 'kahn', target: 'cycle_detect', label: 'proves DAG', relationType: 'leads_to', isHighlighted: true },
        { id: 'cg6', source: 'topo_sort', target: 'cycle_detect', label: 'detects cycle', relationType: 'depends_on' },
      ],
      legend: [
        { label: 'Data Structure', color: '#818cf8' },
        { label: 'Core Algorithm', color: '#38bdf8' },
        { label: 'Verification Concept', color: '#fbbf24' },
      ],
      mermaidFallback: `graph LR
  adj[Adjacency List] --> bfs[Breadth-First Search]
  adj --> dfs[Depth-First Search]
  bfs --> kahn[Kahn's Indegree Algo]
  dfs --> topo[Topological Sort]
  kahn --> cycle[Cycle Detection Invariant]
  topo --> cycle`,
    };

    const valid = validateDiagramSpecification(diagram);
    return valid.isValid ? diagram : null;
  }

  private static generateGenericAlgorithmFlowchart(
    topic: string,
    evidence: ExternalEvidenceItem[]
  ): StructuredDiagram | null {
    const topEvidenceId = evidence[0]?.id;

    const diagram: StructuredDiagram = {
      diagramType: 'algorithm_flowchart',
      title: `${topic} Execution Flowchart`,
      description: `Structured algorithmic execution sequence and boundary verification for ${topic}.`,
      layoutDirection: 'TB',
      nodes: [
        { id: 'init', label: '1. Parse & Validate Input', type: 'start_end', explanation: 'Verify empty, null, or minimum constraint boundaries.' },
        { id: 'state', label: '2. Initialize State Invariants', type: 'process', explanation: `Set up data structures or pointers required for ${topic}.`, evidenceRefId: topEvidenceId },
        { id: 'loop_check', label: '3. Are Constraints Satisfied?', type: 'decision', explanation: 'Evaluate boundary conditions and invariant checks.' },
        { id: 'transition', label: '4. Execute State Transition', type: 'state_active', explanation: 'Process current step and update pointers or cache.', isHighlighted: true },
        { id: 'result', label: '5. Return Valid Result', type: 'start_end', explanation: 'Output computed value or verified optimal solution.' },
      ],
      edges: [
        { id: 'g1', source: 'init', target: 'state', relationType: 'leads_to' },
        { id: 'g2', source: 'state', target: 'loop_check', relationType: 'leads_to' },
        { id: 'g3', source: 'loop_check', target: 'transition', label: 'Valid', relationType: 'branch_yes' },
        { id: 'g4', source: 'transition', target: 'loop_check', label: 'Next Step', relationType: 'cycles_to' },
        { id: 'g5', source: 'loop_check', target: 'result', label: 'Done', relationType: 'branch_no' },
      ],
      legend: [
        { label: 'Boundary Conditions', color: '#10b981' },
        { label: 'State Invariants', color: '#38bdf8' },
      ],
      mermaidFallback: `graph TD
  init([Parse & Validate]) --> state[Initialize State]
  state --> loop_check{Constraints Satisfied?}
  loop_check -- Yes --> trans[Execute Transition]
  trans --> loop_check
  loop_check -- No --> res([Return Result])`,
    };

    const valid = validateDiagramSpecification(diagram);
    return valid.isValid ? diagram : null;
  }
}
