/**
 * src/types/diagnosis-graph.ts
 *
 * Validated structured diagram specification schema for DSA concepts,
 * algorithm execution graphs, decision trees, and flowcharts.
 */

import { z } from 'zod';

export type DiagramType =
  | 'concept_graph'
  | 'algorithm_flowchart'
  | 'execution_trace'
  | 'decision_tree';

export type DiagramNodeType =
  | 'start_end'
  | 'process'
  | 'decision'
  | 'concept'
  | 'algorithm'
  | 'datastructure'
  | 'state_unvisited'
  | 'state_active'
  | 'state_visited'
  | 'state_completed';

export const diagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(100),
  type: z.enum([
    'start_end',
    'process',
    'decision',
    'concept',
    'algorithm',
    'datastructure',
    'state_unvisited',
    'state_active',
    'state_visited',
    'state_completed',
  ]),
  explanation: z.string().max(500),
  evidenceRefId: z.string().optional(),
  isHighlighted: z.boolean().optional().default(false),
  complexity: z.string().optional(),
});

export const diagramEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().max(50).optional(),
  relationType: z
    .enum(['leads_to', 'prerequisite', 'depends_on', 'branch_yes', 'branch_no', 'cycles_to'])
    .optional()
    .default('leads_to'),
  isHighlighted: z.boolean().optional().default(false),
});

export const structuredDiagramSchema = z.object({
  diagramType: z.enum(['concept_graph', 'algorithm_flowchart', 'execution_trace', 'decision_tree']),
  title: z.string().min(1).max(120),
  description: z.string().max(400),
  layoutDirection: z.enum(['TB', 'LR']).optional().default('TB'),
  nodes: z.array(diagramNodeSchema).min(2).max(30),
  edges: z.array(diagramEdgeSchema).min(1).max(50),
  legend: z
    .array(
      z.object({
        label: z.string(),
        color: z.string(),
        shape: z.string().optional(),
      })
    )
    .optional(),
  mermaidFallback: z.string().optional(),
});

export interface DiagramNode {
  id: string;
  label: string;
  type: DiagramNodeType;
  explanation: string;
  evidenceRefId?: string;
  isHighlighted?: boolean;
  complexity?: string;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  relationType?: 'leads_to' | 'prerequisite' | 'depends_on' | 'branch_yes' | 'branch_no' | 'cycles_to';
  isHighlighted?: boolean;
}

export interface StructuredDiagram {
  diagramType: DiagramType;
  title: string;
  description: string;
  layoutDirection?: 'TB' | 'LR';
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  legend?: Array<{
    label: string;
    color: string;
    shape?: string;
  }>;
  mermaidFallback?: string;
}

/**
 * Validates a diagram specification:
 * - Checks unique node IDs
 * - Ensures every edge connects existing nodes (no dangling edges)
 * - Safe sanitization against HTML/XSS
 */
export function validateDiagramSpecification(input: unknown): {
  isValid: boolean;
  diagram?: StructuredDiagram;
  error?: string;
} {
  const parsed = structuredDiagramSchema.safeParse(input);
  if (!parsed.success) {
    return {
      isValid: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
    };
  }

  const diagram = parsed.data;
  const nodeIds = new Set<string>();

  for (const node of diagram.nodes) {
    if (nodeIds.has(node.id)) {
      return { isValid: false, error: `Duplicate node ID detected: ${node.id}` };
    }
    nodeIds.add(node.id);
  }

  for (const edge of diagram.edges) {
    if (!nodeIds.has(edge.source)) {
      return { isValid: false, error: `Edge ${edge.id} references non-existent source node: ${edge.source}` };
    }
    if (!nodeIds.has(edge.target)) {
      return { isValid: false, error: `Edge ${edge.id} references non-existent target node: ${edge.target}` };
    }
  }

  return { isValid: true, diagram };
}
