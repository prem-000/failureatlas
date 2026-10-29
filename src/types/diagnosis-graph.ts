/**
 * src/types/diagnosis-graph.ts
 *
 * Validated structured diagram specification schema for:
 * 1. Radial Graphs (Central concept with peripheral topic branches)
 * 2. Tree Graphs (Hierarchical prerequisite & topic taxonomy)
 * 3. Flowcharts (Directed execution steps, decisions, and cycle paths)
 * 4. Architecture Graphs (System components and data-flow integration)
 */

import { z } from 'zod';

export type DiagramType =
  | 'radial_graph'
  | 'tree_graph'
  | 'algorithm_flowchart'
  | 'architecture_graph'
  | 'concept_graph'
  | 'execution_trace'
  | 'decision_tree';

export type DiagramLayoutMode = 'radial' | 'tree' | 'flowchart' | 'architecture' | 'dagre';

export type DiagramNodeType =
  | 'central_topic'
  | 'concept'
  | 'prerequisite'
  | 'example_problem'
  | 'resource'
  | 'weakness'
  | 'component'
  | 'storage'
  | 'service'
  | 'start_end'
  | 'process'
  | 'decision'
  | 'algorithm'
  | 'datastructure'
  | 'state_unvisited'
  | 'state_active'
  | 'state_visited'
  | 'state_completed';

export type DiagramEdgeRelation =
  | 'leads_to'
  | 'prerequisite'
  | 'depends_on'
  | 'branch_yes'
  | 'branch_no'
  | 'cycles_to'
  | 'radial_branch'
  | 'data_flow'
  | 'solves'
  | 'subproblem';

export interface SimulationStep {
  stepNumber: number;
  activeNodeId: string;
  activeEdgeId?: string;
  title: string;
  description: string;
  stateSnapshot?: Record<string, any>;
}

export const diagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(120),
  type: z.enum([
    'central_topic',
    'concept',
    'prerequisite',
    'example_problem',
    'resource',
    'weakness',
    'component',
    'storage',
    'service',
    'start_end',
    'process',
    'decision',
    'algorithm',
    'datastructure',
    'state_unvisited',
    'state_active',
    'state_visited',
    'state_completed',
  ]),
  explanation: z.string().max(800),
  evidenceRefId: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  codeSnippet: z.string().optional(),
  relatedProblems: z.array(z.string()).optional(),
  childGraphQuery: z.string().optional(),
  stepIndex: z.number().int().optional(),
  isHighlighted: z.boolean().optional().default(false),
  complexity: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const diagramEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().max(80).optional(),
  relationType: z
    .enum([
      'leads_to',
      'prerequisite',
      'depends_on',
      'branch_yes',
      'branch_no',
      'cycles_to',
      'radial_branch',
      'data_flow',
      'solves',
      'subproblem',
    ])
    .optional()
    .default('leads_to'),
  isHighlighted: z.boolean().optional().default(false),
});

export const simulationStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  activeNodeId: z.string().min(1),
  activeEdgeId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  stateSnapshot: z.record(z.string(), z.any()).optional(),
});

export const structuredDiagramSchema = z.object({
  diagramType: z.enum([
    'radial_graph',
    'tree_graph',
    'algorithm_flowchart',
    'architecture_graph',
    'concept_graph',
    'execution_trace',
    'decision_tree',
  ]),
  title: z.string().min(1).max(140),
  description: z.string().max(600),
  layoutMode: z.enum(['radial', 'tree', 'flowchart', 'architecture', 'dagre']).optional().default('radial'),
  layoutDirection: z.enum(['TB', 'LR']).optional().default('TB'),
  centralNodeId: z.string().optional(),
  supportsSimulation: z.boolean().optional().default(false),
  simulationSteps: z.array(simulationStepSchema).optional(),
  nodes: z.array(diagramNodeSchema).min(2).max(40),
  edges: z.array(diagramEdgeSchema).min(1).max(60),
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
  sourceUrl?: string;
  codeSnippet?: string;
  relatedProblems?: string[];
  childGraphQuery?: string;
  stepIndex?: number;
  isHighlighted?: boolean;
  complexity?: string;
  position?: { x: number; y: number };
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  relationType?: DiagramEdgeRelation;
  isHighlighted?: boolean;
}

export interface StructuredDiagram {
  diagramType: DiagramType;
  title: string;
  description: string;
  layoutMode?: DiagramLayoutMode;
  layoutDirection?: 'TB' | 'LR';
  centralNodeId?: string;
  supportsSimulation?: boolean;
  simulationSteps?: SimulationStep[];
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
 * - Validates safe URLs (must start with https://, http://, or /)
 * - Verifies simulation steps point to existing nodes
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

  const diagram = parsed.data as StructuredDiagram;
  const nodeIds = new Set<string>();

  for (const node of diagram.nodes) {
    if (nodeIds.has(node.id)) {
      return { isValid: false, error: `Duplicate node ID detected: ${node.id}` };
    }
    nodeIds.add(node.id);

    // Validate safe URL if present
    if (node.sourceUrl) {
      if (!/^https?:\/\//i.test(node.sourceUrl) && !node.sourceUrl.startsWith('/')) {
        return { isValid: false, error: `Invalid external URL protocol in node ${node.id}: ${node.sourceUrl}` };
      }
    }
  }

  for (const edge of diagram.edges) {
    if (!nodeIds.has(edge.source)) {
      return { isValid: false, error: `Edge ${edge.id} references non-existent source node: ${edge.source}` };
    }
    if (!nodeIds.has(edge.target)) {
      return { isValid: false, error: `Edge ${edge.id} references non-existent target node: ${edge.target}` };
    }
  }

  // Validate simulation steps if simulation is supported
  if (diagram.supportsSimulation && diagram.simulationSteps) {
    for (const step of diagram.simulationSteps) {
      if (!nodeIds.has(step.activeNodeId)) {
        return {
          isValid: false,
          error: `Simulation step ${step.stepNumber} references non-existent node: ${step.activeNodeId}`,
        };
      }
    }
  }

  return { isValid: true, diagram };
}
