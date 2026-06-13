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
  query: string
): { nodes: Node[]; edges: Edge[] } {
  if (!data) return { nodes: [], edges: [] };

  const q = query.toLowerCase().trim();
  const hasQuery = !!q;

  const nodes: Node[] = (data.nodes || []).map(n => {
    const matches = hasQuery && (
      n.label.toLowerCase().includes(q) ||
      (n.description || '').toLowerCase().includes(q) ||
      n.kind.toLowerCase().includes(q)
    );
    return {
      id: n.id,
      type: 'knowledgeNode',
      position: { x: n.x, y: n.y },
      data: {
        label: n.label,
        kind: n.kind,
        description: n.description,
        isFaded: hasQuery && !matches,
        isHighlighted: hasQuery && matches,
      },
    };
  });

  const edges: Edge[] = (data.edges || []).map(e => ({
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
  const { nodes, edges } = buildGraph(data, searchInput);

  return (
    <ReactFlowProvider>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <style>{`
          .kg-toolbar { display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; background: rgba(13,13,15,0.8); }
          .legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; color: #52525b; }
          .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
        `}</style>

        {/* Toolbar */}
        <div className="kg-toolbar">
          <div style={{ flex: 1 }}>
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search any concept (e.g., Dijkstra, DP)..." />
          </div>
          {isLoading && <Loader2 size={16} style={{ color: '#a855f7', animation: 'spin 1s linear infinite' }} />}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0, overflowX: 'auto' }}>
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
        <div style={{ flex: 1, position: 'relative' }}>
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
