import { Node, Edge } from 'reactflow';
import type { GraphNode as BaseGraphNode, GraphEdge as BaseGraphEdge } from './index';

// React Flow specific node types
export type AppNode = Node<
  {
    id: string;
    type: string;
    label: string;
    data: Record<string, unknown>;
    nodeType: string;
  }
>;

export type AppEdge = Edge<{
  type: string;
  properties?: Record<string, unknown>;
}>;

// Node styling
export const nodeStyles = {
  problem: {
    background: '#3b82f6',
    color: '#ffffff',
    border: '2px solid #1e40af',
  },
  failure: {
    background: '#fb923c',
    color: '#ffffff',
    border: '2px solid #d97706',
  },
  rootCause: {
    background: '#f59e0b',
    color: '#ffffff',
    border: '2px solid #d97706',
  },
  weakness: {
    background: '#a855f7',
    color: '#ffffff',
    border: '2px solid #7c3aed',
  },
  strategy: {
    background: '#22c55e',
    color: '#ffffff',
    border: '2px solid #16a34a',
  },
  evidence: {
    background: '#6366f1',
    color: '#ffffff',
    border: '2px solid #4f46e5',
  },
};

export const edgeTypes = {
  caused_by: { stroke: '#ef4444' },
  contributes_to: { stroke: '#f59e0b' },
  similar_to: { stroke: '#8b5cf6' },
  supported_by: { stroke: '#3b82f6' },
  default: { stroke: '#a1a1aa' },
};
