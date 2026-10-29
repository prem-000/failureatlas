/**
 * src/lib/diagnosis/graph-layout.ts
 *
 * Deterministic Layout Engine for Query-Aware Graphs:
 * 1. Radial Layout: Central concept in center, peripheral branches in orbital ellipse.
 * 2. Tree Layout: Hierarchical root and descendant levels.
 * 3. Flowchart / Dagre Layout: Directed sequential execution paths.
 * 4. Architecture Layout: Layered system tiers.
 */

import dagre from 'dagre';
import type { StructuredDiagram, DiagramNode, DiagramEdge, DiagramLayoutMode } from '@/types/diagnosis-graph';

export interface LayoutedDiagram {
  nodes: Array<DiagramNode & { position: { x: number; y: number } }>;
  edges: DiagramEdge[];
  bounds: { width: number; height: number };
}

export class GraphLayoutEngine {
  /**
   * Apply layout algorithm based on diagram's layoutMode or requested override
   */
  static applyLayout(
    diagram: StructuredDiagram,
    overrideMode?: DiagramLayoutMode
  ): LayoutedDiagram {
    const mode = overrideMode || diagram.layoutMode || 'radial';

    switch (mode) {
      case 'radial':
        return this.applyRadialLayout(diagram);
      case 'tree':
        return this.applyTreeLayout(diagram);
      case 'architecture':
        return this.applyArchitectureLayout(diagram);
      case 'flowchart':
      case 'dagre':
      default:
        return this.applyDagreFlowchartLayout(diagram);
    }
  }

  /**
   * 1. Radial Layout: Central topic in the center, surrounding nodes distributed orbitally
   */
  private static applyRadialLayout(diagram: StructuredDiagram): LayoutedDiagram {
    const nodes = [...diagram.nodes];
    if (nodes.length === 0) return { nodes: [], edges: diagram.edges, bounds: { width: 800, height: 600 } };

    // Identify central node
    const centralIndex = nodes.findIndex(
      (n) => n.id === diagram.centralNodeId || n.type === 'central_topic'
    );
    const centralNode = centralIndex >= 0 ? nodes[centralIndex] : nodes[0];
    const peripheralNodes = nodes.filter((n) => n.id !== centralNode.id);

    const centerX = 420;
    const centerY = 300;

    const count = peripheralNodes.length;
    // Scale radius dynamically based on count
    const radiusX = Math.max(300, count * 36);
    const radiusY = Math.max(210, count * 26);

    const layoutedNodes: Array<DiagramNode & { position: { x: number; y: number } }> = [];

    // Central Node Position
    layoutedNodes.push({
      ...centralNode,
      position: { x: centerX, y: centerY },
    });

    // Peripheral Nodes in orbital distribution
    peripheralNodes.forEach((node, i) => {
      // Start from top (-PI / 2) and distribute clockwise
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const x = Math.round(centerX + radiusX * Math.cos(angle));
      const y = Math.round(centerY + radiusY * Math.sin(angle));

      layoutedNodes.push({
        ...node,
        position: { x, y },
      });
    });

    return {
      nodes: layoutedNodes,
      edges: diagram.edges,
      bounds: { width: centerX + radiusX + 180, height: centerY + radiusY + 140 },
    };
  }

  /**
   * 2. Tree Layout: Hierarchical root and level-by-level branches
   */
  private static applyTreeLayout(diagram: StructuredDiagram): LayoutedDiagram {
    const nodes = diagram.nodes;
    if (nodes.length === 0) return { nodes: [], edges: diagram.edges, bounds: { width: 800, height: 600 } };

    // Build adjacency list & compute in-degrees
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    nodes.forEach((n) => {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    });

    diagram.edges.forEach((e) => {
      if (adj[e.source]) adj[e.source].push(e.target);
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    });

    // Root nodes (inDegree === 0) or first node
    const roots = nodes.filter((n) => inDegree[n.id] === 0);
    const rootId = roots.length > 0 ? roots[0].id : nodes[0].id;

    // BFS to assign levels
    const levels: Record<number, string[]> = {};
    const visited = new Set<string>();
    const queue: Array<{ id: string; level: number }> = [{ id: rootId, level: 0 }];
    visited.add(rootId);

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (!levels[level]) levels[level] = [];
      levels[level].push(id);

      const neighbors = adj[id] || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push({ id: n, level: level + 1 });
        }
      }
    }

    // Include any disconnected nodes in bottom level
    nodes.forEach((n) => {
      if (!visited.has(n.id)) {
        const maxLevel = Math.max(...Object.keys(levels).map(Number), 0) + 1;
        if (!levels[maxLevel]) levels[maxLevel] = [];
        levels[maxLevel].push(n.id);
        visited.add(n.id);
      }
    });

    const layoutedNodes: Array<DiagramNode & { position: { x: number; y: number } }> = [];
    const levelHeight = 160;
    const canvasWidth = 840;

    Object.entries(levels).forEach(([lvlStr, nodeIds]) => {
      const lvl = Number(lvlStr);
      const y = 60 + lvl * levelHeight;
      const count = nodeIds.length;
      const spacing = count > 1 ? canvasWidth / (count + 1) : canvasWidth / 2;

      nodeIds.forEach((id, idx) => {
        const node = nodes.find((n) => n.id === id);
        if (node) {
          const x = count > 1 ? Math.round((idx + 1) * spacing) : Math.round(canvasWidth / 2);
          layoutedNodes.push({
            ...node,
            position: { x, y },
          });
        }
      });
    });

    return {
      nodes: layoutedNodes,
      edges: diagram.edges,
      bounds: {
        width: canvasWidth + 100,
        height: Math.max(500, (Object.keys(levels).length + 1) * levelHeight),
      },
    };
  }

  /**
   * 3. Architecture Layout: Tiered system components
   */
  private static applyArchitectureLayout(diagram: StructuredDiagram): LayoutedDiagram {
    const nodes = diagram.nodes;
    const tiers: Record<string, string[]> = {
      client: [],
      gateway: [],
      service: [],
      storage: [],
    };

    nodes.forEach((n) => {
      if (n.type === 'start_end' || n.label.toLowerCase().includes('client') || n.label.toLowerCase().includes('user')) {
        tiers.client.push(n.id);
      } else if (n.type === 'decision' || n.label.toLowerCase().includes('gateway') || n.label.toLowerCase().includes('router')) {
        tiers.gateway.push(n.id);
      } else if (n.type === 'storage' || n.label.toLowerCase().includes('database') || n.label.toLowerCase().includes('cache') || n.label.toLowerCase().includes('vector')) {
        tiers.storage.push(n.id);
      } else {
        tiers.service.push(n.id);
      }
    });

    const tierOrder = ['client', 'gateway', 'service', 'storage'];
    const layoutedNodes: Array<DiagramNode & { position: { x: number; y: number } }> = [];
    const canvasWidth = 800;

    tierOrder.forEach((tierName, tierIdx) => {
      const nodeIds = tiers[tierName];
      const y = 60 + tierIdx * 140;
      const count = nodeIds.length;
      const spacing = count > 1 ? canvasWidth / (count + 1) : canvasWidth / 2;

      nodeIds.forEach((id, idx) => {
        const node = nodes.find((n) => n.id === id);
        if (node) {
          const x = count > 1 ? Math.round((idx + 1) * spacing) : Math.round(canvasWidth / 2);
          layoutedNodes.push({
            ...node,
            position: { x, y },
          });
        }
      });
    });

    return {
      nodes: layoutedNodes,
      edges: diagram.edges,
      bounds: { width: canvasWidth + 100, height: 620 },
    };
  }

  /**
   * 4. Flowchart Layout using Dagre algorithm
   */
  private static applyDagreFlowchartLayout(diagram: StructuredDiagram): LayoutedDiagram {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: diagram.layoutDirection || 'TB',
      nodesep: 60,
      ranksep: 80,
      marginx: 40,
      marginy: 40,
    });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes to dagre
    diagram.nodes.forEach((node) => {
      g.setNode(node.id, {
        width: 180,
        height: 70,
        label: node.label,
      });
    });

    // Add edges to dagre
    diagram.edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const layoutedNodes: Array<DiagramNode & { position: { x: number; y: number } }> = [];
    diagram.nodes.forEach((node) => {
      const pos = g.node(node.id);
      layoutedNodes.push({
        ...node,
        position: {
          x: pos ? Math.round(pos.x) : 100,
          y: pos ? Math.round(pos.y) : 100,
        },
      });
    });

    const graphBounds = g.graph();
    return {
      nodes: layoutedNodes,
      edges: diagram.edges,
      bounds: {
        width: Math.max(600, (graphBounds?.width || 600) + 100),
        height: Math.max(400, (graphBounds?.height || 400) + 100),
      },
    };
  }
}
