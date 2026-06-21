'use client';

import { useState, useEffect } from 'react';
import ReactFlow, {
  Background, Controls, Node, Edge,
  BackgroundVariant, NodeTypes, ReactFlowProvider,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { KnowledgeNode } from './KnowledgeNode';
import { SearchBar } from './SearchBar';
import { useDynamicKnowledgeGraph } from '@/hooks/usePhase3Queries';
import { Loader2 } from 'lucide-react';

const nodeTypes: NodeTypes = { knowledgeNode: KnowledgeNode };

function buildGraph(
  data: { nodes: any[]; edges: any[] } | undefined,
  query: string,
  isMobile: boolean
): { nodes: Node[]; edges: Edge[] } {
  if (!data) return { nodes: [], edges: [] };

  const q = query.toLowerCase().trim();
  const hasQuery = !!q;
  const scale = isMobile ? 0.65 : 1.0;

  // Render fewer graph nodes initially on mobile for performance
  let sourceNodes = data.nodes || [];
  if (isMobile) {
    sourceNodes = sourceNodes.slice(0, 45);
  }

  const nodes: Node[] = sourceNodes.map(n => {
    const matches = hasQuery && (
      n.label.toLowerCase().includes(q) ||
      (n.description || '').toLowerCase().includes(q) ||
      n.kind.toLowerCase().includes(q)
    );
    return {
      id: n.id,
      type: 'knowledgeNode',
      position: { x: n.x * scale, y: n.y * scale },
      data: {
        label: n.label,
        kind: n.kind,
        description: n.description,
        isFaded: hasQuery && !matches,
        isHighlighted: hasQuery && matches,
      },
    };
  });

  const nodeIds = new Set(nodes.map(n => n.id));
  const edges: Edge[] = (data.edges || [])
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map(e => ({
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'smoothstep',
      style: { stroke: '#27272a', strokeWidth: 1.5 },
      labelStyle: { fill: '#52525b', fontSize: 9, fontWeight: 600 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#27272a' },
    }));

  return { nodes, edges };
}

export function KnowledgeGraphTab() {
  const [searchInput, setSearchInput] = useState('Binary Search');
  const [query, setQuery] = useState('Binary Search');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debounce the input for generating the knowledge graph
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput.trim()) {
        setQuery(searchInput.trim());
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data, isLoading } = useDynamicKnowledgeGraph(query);
  const { nodes, edges } = buildGraph(data, searchInput, isMobile);

  return (
    <ReactFlowProvider>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <style>{`
          .kg-toolbar {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            flex-shrink: 0;
            background: rgba(13,13,15,0.85);
            backdrop-filter: blur(12px);
            position: sticky;
            top: 0;
            z-index: 50;
          }
          .kg-legend-container {
            display: flex;
            gap: 10px;
            padding: 8px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            flex-shrink: 0;
            overflow-x: auto;
            white-space: nowrap;
            scrollbar-width: none;
            ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
          }
          .kg-legend-container::-webkit-scrollbar {
            display: none;
          }
          .legend-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            color: #a1a1aa;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            padding: 6px 12px;
            border-radius: 16px;
            min-height: 32px;
          }
          .legend-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .touch-action-graph {
            touch-action: pan-x pan-y !important;
          }
          @media (max-width: 767px) {
            .react-flow__controls {
              position: fixed !important;
              bottom: 96px !important;
              right: 16px !important;
              left: auto !important;
              top: auto !important;
              margin: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              z-index: 60 !important;
            }
            .react-flow__controls button {
              width: 44px !important;
              height: 44px !important;
              min-width: 44px !important;
              min-height: 44px !important;
            }
          }
        `}</style>

        {/* Toolbar */}
        <div className="kg-toolbar">
          <div style={{ flex: 1 }}>
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search any concept (e.g., Dijkstra, DP)..." />
          </div>
          {isLoading && <Loader2 size={16} style={{ color: '#a855f7', animation: 'spin 1s linear infinite' }} />}
        </div>

        {/* Legend */}
        <div className="kg-legend-container">
          {[
            { kind: 'concept', color: '#3b82f6' },
            { kind: 'subconcept', color: '#a855f7' },
            { kind: 'technique', color: '#22c55e' },
            { kind: 'pattern', color: '#f59e0b' },
            { kind: 'pitfall', color: '#ef4444' },
            { kind: 'complexity', color: '#14b8a6' },
          ].map(l => (
            <div key={l.kind} className="legend-item">
              <div className="legend-dot" style={{ background: l.color }} />
              {l.kind}
            </div>
          ))}
        </div>

        {/* Graph */}
        <div className="touch-action-graph" style={{ flex: 1, position: 'relative' }}>
          {isLoading && (!nodes || nodes.length === 0) ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', zIndex: 10 }}>
              <Loader2 size={32} style={{ color: '#a855f7', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
              <div style={{ color: '#d4d4d8', fontSize: 16, fontWeight: 700 }}>Generating Knowledge Graph</div>
              <div style={{ color: '#71717a', fontSize: 12, marginTop: 8 }}>AI is analyzing concepts for "{query}"...</div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.4 }}
              minZoom={0.3}
              maxZoom={2}
              preventScrolling={true}
              zoomOnPinch={true}
              style={{ background: '#0a0a0c' }}
            >
              <Background variant={BackgroundVariant.Dots} color="#1a1a1c" gap={24} size={1} />
              <Controls
                showInteractive={false}
                style={{ background: 'rgba(15,15,18,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}
              />
            </ReactFlow>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
