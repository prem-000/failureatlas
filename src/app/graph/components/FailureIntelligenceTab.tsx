'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background, Controls, Node, Edge,
  useNodesState, useEdgesState, BackgroundVariant,
  NodeTypes, ReactFlowProvider, useReactFlow,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { BrainCircuit, Layers, GitFork, Loader2 } from 'lucide-react';
import { FailureNode } from './FailureNode';
import { WeaknessDrawer } from './WeaknessDrawer';
import { SearchBar } from './SearchBar';
import { useGraphSubgraph, useGraphFailures, useGraphWeaknesses } from '@/hooks/usePhase3Queries';
import type { SubgraphData } from '@/hooks/usePhase3Queries';

const nodeTypes: NodeTypes = { failure: FailureNode };

const TYPE_STAGES: Record<string, number> = {
  Weakness: 1, RootCause: 2, Evidence: 3, FailureEvent: 4, Problem: 5, LearningStrategy: 0,
};

const LAYOUT_X: Record<string, number> = {
  Weakness: 0, RootCause: 280, Evidence: 560, FailureEvent: 840, Problem: 1120, LearningStrategy: -240,
};

const EDGE_COLORS: Record<string, string> = {
  INDICATES:    '#f59e0b',
  SUGGESTS:     '#a855f7',
  HAS_EVIDENCE: '#f97316',
  TRIGGERED:    '#ef4444',
  ADDRESSED_BY: '#22c55e',
};

type FilterType = 'all' | 'Weakness' | 'RootCause' | 'Evidence' | 'FailureEvent' | 'Problem' | 'LearningStrategy';

const FILTER_OPTIONS: { id: FilterType; label: string; color: string }[] = [
  { id: 'all',              label: 'All',              color: '#71717a' },
  { id: 'Weakness',         label: 'Growth Areas',     color: '#a855f7' },
  { id: 'RootCause',        label: 'Learning Insights',color: '#f59e0b' },
  { id: 'Evidence',         label: 'Evidence',         color: '#71717a' },
  { id: 'FailureEvent',     label: 'Sessions',         color: '#f97316' },
  { id: 'Problem',          label: 'Problems',         color: '#3b82f6' },
  { id: 'LearningStrategy', label: 'Improvement Plans',color: '#22c55e' },
];

function buildGraph(
  graphData: SubgraphData | undefined,
  filter: FilterType,
  query: string
): { nodes: Node[]; edges: Edge[] } {
  if (!graphData) return { nodes: [], edges: [] };

  const hasQuery = !!query.trim();
  const q = query.toLowerCase();

  const filteredNodes = graphData.nodes
    .filter(n => filter === 'all' || n.data.nodeType === filter)
    .map(n => {
      const type: string = n.data.nodeType;
      const stageX = LAYOUT_X[type] ?? 0;
      const sameType = graphData.nodes.filter(x => x.data.nodeType === type);
      const idx = sameType.indexOf(n);
      const y = idx * 130 + 60;

      const matchesQuery = hasQuery && (
        String(n.data.label).toLowerCase().includes(q) ||
        Object.values(n.data.properties || {}).some(v => String(v).toLowerCase().includes(q))
      );

      return {
        id: n.id,
        type: 'failure',
        position: { x: stageX, y },
        data: {
          ...n.data,
          isFaded: hasQuery && !matchesQuery,
          isHighlighted: hasQuery && matchesQuery,
        },
      };
    });

  const nodeIds = new Set(filteredNodes.map(n => n.id));
  const edges: Edge[] = graphData.edges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: e.type === 'TRIGGERED' || e.type === 'HAS_EVIDENCE',
      style: {
        stroke: EDGE_COLORS[e.type || ''] || '#27272a',
        strokeWidth: 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: EDGE_COLORS[e.type || ''] || '#27272a',
      },
    }));

  return { nodes: filteredNodes, edges };
}

function FailureIntelligenceInner() {
  const reactFlow = useReactFlow();

  const { data: graphData, isLoading } = useGraphSubgraph(300);
  const { data: failures } = useGraphFailures(50, 60);
  const { data: weaknesses } = useGraphWeaknesses(10);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(graphData, filter, query);
    setNodes(n);
    setEdges(e);
  }, [graphData, filter, query]);

  useEffect(() => {
    if (!reactFlow || !query) return;
    const highlighted = nodes.filter(n => n.data?.isHighlighted);
    if (highlighted.length > 0) {
      setTimeout(() => reactFlow.fitView({ nodes: highlighted, duration: 400, padding: 0.3 }), 50);
    }
  }, [query, nodes, reactFlow]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const stats = useMemo(() => ({
    weaknesses: graphData?.stats.weaknesses || 0,
    failures: graphData?.stats.failures || 0,
    problems: graphData?.stats.problems || 0,
    strategies: graphData?.stats.strategies || 0,
  }), [graphData]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`
        .fi-toolbar { display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; background: rgba(13,13,15,0.8); backdrop-filter: blur(12px); flex-wrap: wrap; }
        .fi-filter-chip { padding: 5px 11px; border-radius: 20px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 150ms; white-space: nowrap; }
        .fi-stat { display: flex; flex-direction: column; align-items: center; padding: 6px 14px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); }
        .legend-row { display: flex; align-items: center; gap: 6px; }
        .legend-dot2 { width: 8px; height: 8px; borderRadius: 50%; }
      `}</style>

      {/* Signature header banner */}
      <div style={{
        padding: '10px 20px',
        background: 'linear-gradient(90deg, rgba(168,85,247,0.08), rgba(239,68,68,0.04))',
        borderBottom: '1px solid rgba(168,85,247,0.12)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <BrainCircuit size={16} style={{ color: '#a855f7' }} />
        <div>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#d8b4fe' }}>Learning Intelligence</span>
          <span style={{ fontSize: '11px', color: '#71717a', marginLeft: 10 }}>
            Your learning story — Problem → Practice Session → Evidence → Learning Insight → Growth Area → Improvement Plan
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
          {[
            { label: 'Growth Areas', value: stats.weaknesses, color: '#a855f7' },
            { label: 'Sessions', value: stats.failures, color: '#f97316' },
            { label: 'Problems', value: stats.problems, color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} className="fi-stat">
              <span style={{ fontSize: '16px', fontWeight: 900, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: '9px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="fi-toolbar">
        {/* Type filters */}
        <div style={{ display: 'flex', gap: 5, flex: 1, flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.id}
              className="fi-filter-chip"
              style={{
                background: filter === f.id ? `${f.color}18` : 'rgba(255,255,255,0.03)',
                color: filter === f.id ? f.color : '#52525b',
                border: `1px solid ${filter === f.id ? `${f.color}35` : 'rgba(255,255,255,0.05)'}`,
              }}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <SearchBar value={query} onChange={setQuery} placeholder="Search graph..." />

        <button
          onClick={() => setLayout(l => l === 'horizontal' ? 'vertical' : 'horizontal')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.04)', color: '#71717a', fontSize: '11px',
            fontWeight: 700, cursor: 'pointer', transition: 'all 150ms',
          }}
          title="Toggle layout direction"
        >
          <Layers size={13} />
          {layout === 'horizontal' ? 'Horizontal' : 'Vertical'}
        </button>
      </div>

      {/* Canvas */}
      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
          <Loader2 size={26} style={{ color: '#a855f7', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#71717a', fontSize: 13 }}>Loading learning map...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : nodes.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 40 }}>🔭</div>
          <span style={{ color: '#a1a1aa', fontSize: 15, fontWeight: 700 }}>No graph data</span>
          <span style={{ color: '#52525b', fontSize: 12 }}>Submit some practice sessions to build your learning map.</span>
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.05}
            maxZoom={2.5}
            style={{ background: '#0a0a0c' }}
          >
            <Background variant={BackgroundVariant.Dots} color="#1c1c1e" gap={22} size={1} />
            <Controls
              showInteractive={false}
              style={{ background: 'rgba(15,15,18,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}
            />
          </ReactFlow>

          {/* Edge legend */}
          <div style={{
            position: 'absolute', bottom: 16, left: 16, background: 'rgba(12,12,14,0.9)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 5, backdropFilter: 'blur(10px)',
          }}>
            <span style={{ fontSize: '9px', color: '#3f3f46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Edge Types</span>
            {Object.entries(EDGE_COLORS).map(([type, color]) => (
              <div key={type} className="legend-row">
                <div style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
                <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600 }}>{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weakness / Node Drawer */}
      <WeaknessDrawer
        node={selectedNode}
        nodes={nodes}
        edges={edges}
        failures={failures || []}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}

export function FailureIntelligenceTab() {
  return (
    <ReactFlowProvider>
      <FailureIntelligenceInner />
    </ReactFlowProvider>
  );
}
