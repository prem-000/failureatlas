/**
 * Step → Graph Converter
 *
 * Converts a legacy step-based flowchart visualization into the
 * graph schema (nodes + edges) accepted by buildExcalidrawScene.
 *
 * Legacy schema:
 *   { steps: [{ step, action, explanation, ... }] }
 *
 * Output schema:
 *   { nodes: [{ id, label, explanation? }], edges: [{ from, to }] }
 */

// ─── Shared primitive types ───────────────────────────────────────────────────

export interface GraphNode {
  id:          string;
  label:       string;
  /** Optional metadata preserved from the source step. */
  explanation?: string;
}

export interface GraphEdge {
  from: string;
  to:   string;
}

// ─── Discriminated schema types ───────────────────────────────────────────────

export interface StepEntry {
  step:        number;
  action:      string;
  explanation: string;
  [key: string]: any;
}

/** A "new" graph-based flowchart with explicit nodes and edges. */
export interface GraphFlowchart {
  type:   string;
  nodes:  GraphNode[];
  edges:  GraphEdge[];
  steps?: never;
}

/** A "legacy" step-based flowchart stored in the database. */
export interface StepFlowchart {
  type:   string;
  steps:  StepEntry[];
  nodes?: never;
  edges?: never;
}

/** Union of both supported flowchart schemas. */
export type FlowchartVisualization = GraphFlowchart | StepFlowchart;

// ─── Type Guards ──────────────────────────────────────────────────────────────

/**
 * Returns true when `vis` is a graph-based flowchart (nodes + edges).
 */
export function isGraphFlowchart(vis: any): vis is GraphFlowchart {
  return (
    vis != null &&
    typeof vis === 'object' &&
    Array.isArray(vis.nodes) &&
    vis.nodes.length > 0
  );
}

/**
 * Returns true when `vis` is a legacy step-based flowchart.
 */
export function isStepFlowchart(vis: any): vis is StepFlowchart {
  return (
    vis != null &&
    typeof vis === 'object' &&
    Array.isArray(vis.steps) &&
    vis.steps.length > 0
  );
}

/**
 * Returns a short human-readable description of what schema properties are
 * actually present on the visualization object (for error diagnostics).
 */
export function describeVisualizationSchema(vis: any): string {
  if (!vis || typeof vis !== 'object') return '(not an object)';
  const keys: string[] = [];
  if ('nodes'  in vis) keys.push(`nodes(${Array.isArray(vis.nodes)  ? vis.nodes.length  : '?'})`);
  if ('edges'  in vis) keys.push(`edges(${Array.isArray(vis.edges)  ? vis.edges.length  : '?'})`);
  if ('steps'  in vis) keys.push(`steps(${Array.isArray(vis.steps)  ? vis.steps.length  : '?'})`);
  if ('array'  in vis) keys.push('array');
  if ('rows'   in vis) keys.push('rows');
  if ('cols'   in vis) keys.push('cols');
  return keys.length > 0 ? `{ ${keys.join(', ')} }` : '{ (empty) }';
}

// ─── Converter ────────────────────────────────────────────────────────────────

/**
 * Converts a legacy step-based flowchart into a graph-schema object
 * compatible with `buildExcalidrawScene`.
 *
 * Each step becomes a node; steps are connected sequentially (step N → step N+1).
 */
export function stepsToGraph(steps: StepEntry[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Sort by step number to ensure correct ordering
  const sorted = [...steps].sort((a, b) => (a.step ?? 0) - (b.step ?? 0));

  const nodes: GraphNode[] = sorted.map((s) => ({
    id:          String(s.step ?? sorted.indexOf(s) + 1),
    label:       typeof s.action === 'string' && s.action.trim()
                   ? s.action.trim()
                   : `Step ${s.step ?? sorted.indexOf(s) + 1}`,
    explanation: typeof s.explanation === 'string' ? s.explanation : undefined,
  }));

  const edges: GraphEdge[] = nodes.slice(0, -1).map((node, i) => ({
    from: node.id,
    to:   nodes[i + 1].id,
  }));

  return { nodes, edges };
}

/**
 * Resolves any flowchart visualization (graph schema OR step schema) into
 * a canonical { nodes, edges } pair ready for `buildExcalidrawScene`.
 *
 * Returns null if neither schema is valid.
 */
export function resolveFlowchartGraph(
  visualization: any
): { nodes: GraphNode[]; edges: GraphEdge[] } | null {
  if (isGraphFlowchart(visualization)) {
    return {
      nodes: visualization.nodes,
      edges: visualization.edges ?? [],
    };
  }

  if (isStepFlowchart(visualization)) {
    return stepsToGraph(visualization.steps);
  }

  return null;
}
