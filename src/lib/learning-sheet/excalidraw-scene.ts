/**
 * Excalidraw Scene Builder
 *
 * Converts structured visualization JSON (nodes + edges) into a valid
 * Excalidraw scene object that can be rendered directly.
 *
 * Safety limits:
 *   - MAX_NODES: 50 nodes maximum to prevent huge canvas layouts
 *   - MAX_EDGES: 80 edges maximum
 *   - Max layer width capped so startX never goes below −4 000 px
 */

const IS_DEV = process.env.NODE_ENV === 'development';

/** Hard cap on nodes to prevent unbounded canvas dimensions. */
const MAX_NODES = 50;
/** Hard cap on edges. */
const MAX_EDGES = 80;
/** Per-node box dimensions. */
const NODE_W = 180;
const NODE_H =  50;
/** Horizontal gap between nodes in the same layer. */
const H_GAP  =  40;
/** Vertical gap between layers. */
const V_GAP  =  80;
/**
 * Maximum pixels allowed for a single layer's total width before the H_GAP
 * is reduced proportionally. Keeps startX above −4 000.
 */
const MAX_LAYER_WIDTH = 7000;

interface GraphNode {
  id: string;
  label: string;
}

interface GraphEdge {
  from: string;
  to: string;
}

interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: string;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  angle: number;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: Array<{ id: string; type: string }> | null;
  groupIds: string[];
  frameId: null;
  roundness: { type: number } | null;
  [key: string]: any;
}

function makeId(prefix: string, idx: number): string {
  return `${prefix}_${idx}`;
}

function getSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000);
}

/**
 * Builds an Excalidraw scene from a structured node/edge graph.
 *
 * Layout: top-down layered (Sugiyama-style BFS assignment).
 */
export function buildExcalidrawScene(graph: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}): {
  type: string;
  version: number;
  elements: ExcalidrawElement[];
} {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    return { type: 'excalidraw', version: 2, elements: [] };
  }

  // ── Safety caps ──
  let nodes = graph.nodes;
  let edges = graph.edges || [];

  if (nodes.length > MAX_NODES) {
    if (IS_DEV) {
      console.warn(
        `[ExcalidrawScene] Node count (${nodes.length}) exceeds MAX_NODES (${MAX_NODES}). ` +
        `Truncating to first ${MAX_NODES} nodes.`
      );
    }
    nodes = nodes.slice(0, MAX_NODES);
  }

  if (edges.length > MAX_EDGES) {
    if (IS_DEV) {
      console.warn(
        `[ExcalidrawScene] Edge count (${edges.length}) exceeds MAX_EDGES (${MAX_EDGES}). ` +
        `Truncating to first ${MAX_EDGES} edges.`
      );
    }
    edges = edges.slice(0, MAX_EDGES);
  }

  // ── Build adjacency maps ──
  const childrenMap = new Map<string, string[]>();
  const parentMap   = new Map<string, string[]>();
  const nodeSet     = new Set(nodes.map((n) => n.id));

  for (const e of edges) {
    if (!nodeSet.has(e.from) || !nodeSet.has(e.to)) continue;
    if (!childrenMap.has(e.from)) childrenMap.set(e.from, []);
    childrenMap.get(e.from)!.push(e.to);
    if (!parentMap.has(e.to)) parentMap.set(e.to, []);
    parentMap.get(e.to)!.push(e.from);
  }

  // ── BFS layer assignment ──
  const roots = nodes.filter(
    (n) => !parentMap.has(n.id) || parentMap.get(n.id)!.length === 0
  );
  if (roots.length === 0) roots.push(nodes[0]);

  const layerMap = new Map<string, number>();
  const queue: string[] = [];

  for (const r of roots) {
    layerMap.set(r.id, 0);
    queue.push(r.id);
  }

  // Cycle-safe BFS: track visited set to prevent infinite loops on circular graphs
  const visitedBFS = new Set<string>(roots.map((r) => r.id));

  while (queue.length > 0) {
    const current      = queue.shift()!;
    const currentLayer = layerMap.get(current)!;
    const children     = childrenMap.get(current) || [];

    for (const child of children) {
      const existingLayer = layerMap.get(child);
      const newLayer = currentLayer + 1;

      if (existingLayer === undefined || existingLayer < newLayer) {
        layerMap.set(child, newLayer);
      }

      // Only enqueue if not yet visited (prevents cycles from causing infinite loops)
      if (!visitedBFS.has(child)) {
        visitedBFS.add(child);
        queue.push(child);
      }
    }
  }

  // Assign unvisited nodes to layer 0
  for (const n of nodes) {
    if (!layerMap.has(n.id)) layerMap.set(n.id, 0);
  }

  // ── Group nodes by layer ──
  const layers = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    const layer = layerMap.get(n.id)!;
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(n);
  }

  // ── Compute positions with safe H_GAP per layer ──
  const positions = new Map<string, { x: number; y: number }>();
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

  for (const layerIdx of sortedLayers) {
    const layerNodes  = layers.get(layerIdx)!;
    const count       = layerNodes.length;

    // Dynamically reduce h_gap if the layer would be too wide
    let hGap = H_GAP;
    const naturalWidth = count * NODE_W + (count - 1) * H_GAP;
    if (naturalWidth > MAX_LAYER_WIDTH) {
      // Solve: count * NODE_W + (count - 1) * hGap = MAX_LAYER_WIDTH
      hGap = Math.max(4, Math.floor((MAX_LAYER_WIDTH - count * NODE_W) / Math.max(1, count - 1)));
    }

    const totalWidth = count * NODE_W + (count - 1) * hGap;
    const startX     = -totalWidth / 2;   // centred; never below −3 500 with the gap cap
    const y          = layerIdx * (NODE_H + V_GAP);

    layerNodes.forEach((n, i) => {
      positions.set(n.id, { x: startX + i * (NODE_W + hGap), y });
    });
  }

  // ── Build Excalidraw elements ──
  const elements: ExcalidrawElement[]       = [];
  const nodeIdToElementId = new Map<string, string>();

  // Rectangle + text for each node
  nodes.forEach((n, idx) => {
    const pos    = positions.get(n.id) || { x: 0, y: 0 };
    const rectId = makeId('rect', idx);
    const textId = makeId('text', idx);
    nodeIdToElementId.set(n.id, rectId);

    elements.push({
      id: rectId,
      type: 'rectangle',
      x: pos.x,
      y: pos.y,
      width:  NODE_W,
      height: NODE_H,
      strokeColor:     '#ff5f52',
      backgroundColor: 'rgba(255,95,82,0.08)',
      fillStyle:   'solid',
      strokeWidth: 1,
      roughness:   0,
      opacity:     100,
      angle:       0,
      seed:          getSeed(),
      version:       1,
      versionNonce:  getSeed(),
      isDeleted:     false,
      boundElements: [{ id: textId, type: 'text' }],
      groupIds:  [],
      frameId:   null,
      roundness: { type: 3 },
    });

    elements.push({
      id: textId,
      type: 'text',
      x: pos.x + 10,
      y: pos.y + NODE_H / 2 - 8,
      width:  NODE_W - 20,
      height: 16,
      strokeColor:     '#f4f4f5',
      backgroundColor: 'transparent',
      fillStyle:   'solid',
      strokeWidth: 1,
      roughness:   0,
      opacity:     100,
      angle:       0,
      seed:         getSeed(),
      version:      1,
      versionNonce: getSeed(),
      isDeleted:    false,
      boundElements: null,
      groupIds:  [],
      frameId:   null,
      roundness: null,
      text:           n.label,
      fontSize:       14,
      fontFamily:     1,
      textAlign:      'center',
      verticalAlign:  'middle',
      containerId:    rectId,
      originalText:   n.label,
    } as any);
  });

  // Arrow for each edge
  edges.forEach((e, idx) => {
    const fromElId = nodeIdToElementId.get(e.from);
    const toElId   = nodeIdToElementId.get(e.to);
    if (!fromElId || !toElId) return;

    const fromPos = positions.get(e.from);
    const toPos   = positions.get(e.to);
    if (!fromPos || !toPos) return;

    const arrowId = makeId('arrow', idx);

    // Arrow origin at the bottom-centre of the source node
    const startX = fromPos.x + NODE_W / 2;
    const startY = fromPos.y + NODE_H;
    // Target: top-centre of destination node
    const endX   = toPos.x + NODE_W / 2;
    const endY   = toPos.y;

    const dx = endX - startX;
    const dy = endY - startY;

    elements.push({
      id: arrowId,
      type: 'arrow',
      x: startX,
      y: startY,
      // For arrows Excalidraw ignores width/height in favour of points —
      // set them to 0 to avoid inflating the canvas bounding-box calculation.
      width:  0,
      height: 0,
      strokeColor:     '#52525b',
      backgroundColor: 'transparent',
      fillStyle:   'solid',
      strokeWidth: 1,
      roughness:   0,
      opacity:     100,
      angle:       0,
      seed:         getSeed(),
      version:      1,
      versionNonce: getSeed(),
      isDeleted:    false,
      boundElements: null,
      groupIds:  [],
      frameId:   null,
      roundness: { type: 2 },
      points: [
        [0, 0],
        [dx, dy],
      ],
      startBinding: { elementId: fromElId, focus: 0, gap: 1 },
      endBinding:   { elementId: toElId,   focus: 0, gap: 1 },
      startArrowhead: null,
      endArrowhead:   'arrow',
    } as any);
  });

  if (IS_DEV) {
    console.log(
      `[ExcalidrawScene] Built scene: ${nodes.length} nodes, ${edges.length} edges, ` +
      `${elements.length} elements`
    );
  }

  return { type: 'excalidraw', version: 2, elements };
}

/**
 * Builds an Excalidraw scene from nodes/edges with a set of highlighted node IDs.
 * Used by TreePlayer to show step-by-step traversal.
 */
export function buildExcalidrawSceneWithHighlights(
  graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  highlightedIds: string[]
): { type: string; version: number; elements: ExcalidrawElement[] } {
  const scene = buildExcalidrawScene(graph);
  if (highlightedIds.length === 0) return scene;

  const highlightSet = new Set(highlightedIds);

  for (const el of scene.elements) {
    if (el.type === 'rectangle') {
      const idx  = parseInt(el.id.split('_')[1], 10);
      if (!isNaN(idx)) {
        const node = graph.nodes[idx];
        if (node && highlightSet.has(node.id)) {
          el.strokeColor     = '#ff5f52';
          el.backgroundColor = 'rgba(255,95,82,0.25)';
          el.strokeWidth     = 2;
        }
      }
    }
  }

  return scene;
}
