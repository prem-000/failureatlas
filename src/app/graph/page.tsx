'use client';
import { AppShell } from '@/components/layout/AppShell';
import { useGraphSubgraph } from '@/hooks/usePhase3Queries';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ─── Type Colors ───────────────────────────────────────────────────────────────
const NODE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Problem:          { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', dot: '#3b82f6' },
  FailureEvent:     { bg: '#3d1f00', border: '#f97316', text: '#fdba74', dot: '#f97316' },
  Evidence:         { bg: '#1c1c1e', border: '#71717a', text: '#a1a1aa', dot: '#71717a' },
  RootCause:        { bg: '#2d1f00', border: '#f59e0b', text: '#fcd34d', dot: '#f59e0b' },
  Weakness:         { bg: '#2e1065', border: '#a855f7', text: '#d8b4fe', dot: '#a855f7' },
  LearningStrategy: { bg: '#052e16', border: '#22c55e', text: '#86efac', dot: '#22c55e' },
};

// ─── Custom Node Component ─────────────────────────────────────────────────────
function CustomNode({ data }: NodeProps) {
  const colors = NODE_COLORS[data.nodeType] || NODE_COLORS.Evidence;
  const label = data.label?.length > 28 ? data.label.slice(0, 26) + '…' : data.label;

  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: '10px',
        padding: '10px 14px',
        minWidth: '140px',
        maxWidth: '200px',
        boxShadow: `0 0 12px ${colors.border}33`,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: colors.border, border: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.dot, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: '9px', color: colors.text, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {data.nodeType}
        </span>
      </div>
      <div style={{ fontSize: '12px', color: '#f4f4f5', fontWeight: 500, lineHeight: 1.3 }}>{label}</div>
      <Handle type="source" position={Position.Right} style={{ background: colors.border, border: 'none' }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode };

// ─── Detail Panel ──────────────────────────────────────────────────────────────
function NodeDetail({ node, onClose }: { node: Node | null; onClose: () => void }) {
  if (!node) return null;
  const colors = NODE_COLORS[node.data?.nodeType] || NODE_COLORS.Evidence;
  const props = node.data?.properties || {};

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, height: '100%', width: '320px',
      background: '#191919', borderLeft: '1px solid #2a2a2a', zIndex: 50,
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: '10px', color: colors.text, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {node.data.nodeType}
          </span>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', marginTop: 4, lineHeight: 1.3 }}>
            {node.data.label}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '0 0 0 12px', flexShrink: 0 }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(props).map(([key, val]) => {
          if (val === null || val === undefined || val === '') return null;
          const displayVal = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
          if (displayVal.length > 300) return null;
          return (
            <div key={key}>
              <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{key}</div>
              <div style={{
                fontSize: '12px', color: '#d4d4d8', wordBreak: 'break-word',
                background: '#111111', borderRadius: 6, padding: '6px 10px',
                fontFamily: key === 'code' ? 'monospace' : 'inherit',
              }}>
                {displayVal}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Filter Sidebar ────────────────────────────────────────────────────────────
const ALL_TYPES = ['Problem', 'FailureEvent', 'Evidence', 'RootCause', 'Weakness', 'LearningStrategy'];

function FilterSidebar({
  activeTypes, onToggle, nodeCount,
  dateFrom, dateTo, onDateFrom, onDateTo,
  topicFilter, onTopicFilter,
  confidenceMin, onConfidenceMin,
}: {
  activeTypes: Set<string>;
  onToggle: (t: string) => void;
  nodeCount: number;
  dateFrom: string;
  dateTo: string;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  topicFilter: string;
  onTopicFilter: (v: string) => void;
  confidenceMin: number;
  onConfidenceMin: (v: number) => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#111111', border: '1px solid #2a2a2a',
    borderRadius: 6, padding: '6px 8px', color: '#a1a1aa', fontSize: 11, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, height: '100%', width: '220px',
      background: '#191919', borderRight: '1px solid #2a2a2a', zIndex: 50,
      padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px',
      overflowY: 'auto',
    }}>
      <div>
        <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Node Types
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ALL_TYPES.map(t => {
            const colors = NODE_COLORS[t];
            const active = activeTypes.has(t);
            return (
              <button
                key={t}
                onClick={() => onToggle(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: active ? `${colors.bg}` : 'transparent',
                  border: `1px solid ${active ? colors.border : '#2a2a2a'}`,
                  borderRadius: 7, padding: '6px 10px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? colors.dot : '#3f3f46', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: '12px', color: active ? colors.text : '#71717a', fontWeight: 500 }}>{t}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Date Range
        </div>
        <input type="date" value={dateFrom} onChange={e => onDateFrom(e.target.value)} style={{ ...inputStyle, marginBottom: 6 }} />
        <input type="date" value={dateTo} onChange={e => onDateTo(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Topic
        </div>
        <input
          value={topicFilter}
          onChange={e => onTopicFilter(e.target.value)}
          placeholder="e.g. dynamic-programming"
          style={inputStyle}
        />
      </div>
      <div>
        <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Min Confidence ({Math.round(confidenceMin * 100)}%)
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(confidenceMin * 100)}
          onChange={e => onConfidenceMin(Number(e.target.value) / 100)}
          style={{ width: '100%', accentColor: '#ff5f52' }}
        />
      </div>
      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 14 }}>
        <div style={{ fontSize: '11px', color: '#52525b' }}>Showing</div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#ff5f52' }}>{nodeCount}</div>
        <div style={{ fontSize: '11px', color: '#52525b' }}>nodes</div>
      </div>
    </div>
  );
}

function expandConnectedNodes(
  seedIds: Set<string>,
  edges: Edge[]
): Set<string> {
  const connected = new Set(seedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edges) {
      if (connected.has(e.source) && !connected.has(e.target)) {
        connected.add(e.target);
        changed = true;
      }
      if (connected.has(e.target) && !connected.has(e.source)) {
        connected.add(e.source);
        changed = true;
      }
    }
  }
  return connected;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function GraphPage() {
  const { data: graphData, isLoading: loading, error: queryError } = useGraphSubgraph(300);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const error = queryError ? (queryError as Error).message : null;
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(ALL_TYPES));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [confidenceMin, setConfidenceMin] = useState(0);
  const stats = graphData?.stats ?? null;
  const rawNodes = useRef<Node[]>([]);
  const rawEdges = useRef<Edge[]>([]);

  useEffect(() => {
    if (!graphData) return;
    rawNodes.current = graphData.nodes as Node[];
    rawEdges.current = graphData.edges as Edge[];
  }, [graphData]);

  useEffect(() => {
    const passesNode = (n: Node): boolean => {
      if (!activeTypes.has(n.data?.nodeType)) return false;
      const props = (n.data?.properties || {}) as Record<string, unknown>;
      const type = n.data?.nodeType as string;

      if (dateFrom || dateTo) {
        if (type === 'FailureEvent' && props.timestamp) {
          const t = new Date(String(props.timestamp)).getTime();
          if (dateFrom && t < new Date(dateFrom).getTime()) return false;
          if (dateTo && t > new Date(dateTo).getTime() + 86400000 - 1) return false;
        }
      }

      if (confidenceMin > 0 && (type === 'Evidence' || type === 'RootCause')) {
        const conf = Number(props.confidence);
        if (!Number.isNaN(conf) && conf < confidenceMin) return false;
      }

      if (topicFilter.trim() && type === 'Problem') {
        const topics = (props.topics as string[]) || [];
        const q = topicFilter.toLowerCase();
        const name = String(props.name || n.data?.label || '').toLowerCase();
        if (!topics.some(t => t.toLowerCase().includes(q)) && !name.includes(q)) return false;
      }

      return true;
    };

    let filteredNodes = rawNodes.current.filter(passesNode);

    if (topicFilter.trim()) {
      const problemIds = new Set(
        filteredNodes.filter(n => n.data?.nodeType === 'Problem').map(n => n.id)
      );
      if (problemIds.size > 0) {
        const connected = expandConnectedNodes(problemIds, rawEdges.current);
        filteredNodes = rawNodes.current.filter(
          n => connected.has(n.id) && activeTypes.has(n.data?.nodeType) && passesNode(n)
        );
      }
    }

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = rawEdges.current.filter(
      e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );
    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [activeTypes, dateFrom, dateTo, topicFilter, confidenceMin, graphData]);

  const toggleType = useCallback((type: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const visibleCount = nodes.length;

  return (
    <AppShell fullscreen>
    <div style={{ width: '100%', height: '100vh', background: '#131313', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid #1f1f1f',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#161616', zIndex: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f52', boxShadow: '0 0 8px #ff5f52' }} />
          <span style={{ fontSize: '17px', fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
            Failure Graph Explorer
          </span>
        </div>
        {stats && (
          <div style={{ display: 'flex', gap: 20 }}>
            {Object.entries(stats.nodesByType ?? {}).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: NODE_COLORS[type]?.dot || '#71717a', display: 'inline-block' }} />
                <span style={{ fontSize: '11px', color: '#71717a' }}>{type}: </span>
                <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #2a2a2a', borderTopColor: '#ff5f52', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#52525b', fontSize: 14 }}>Loading knowledge graph…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 32 }}>⚠️</span>
            <span style={{ color: '#ef4444', fontSize: 14 }}>{error}</span>
            <span style={{ color: '#52525b', fontSize: 12 }}>Make sure the database is running and you have submitted problems first.</span>
          </div>
        ) : nodes.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 48 }}>🔭</span>
            <span style={{ color: '#71717a', fontSize: 16, fontWeight: 600 }}>No graph data yet</span>
            <span style={{ color: '#52525b', fontSize: 13 }}>Submit a problem attempt to begin building your failure graph.</span>
          </div>
        ) : (
          <>
            <FilterSidebar
              activeTypes={activeTypes}
              onToggle={toggleType}
              nodeCount={visibleCount}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFrom={setDateFrom}
              onDateTo={setDateTo}
              topicFilter={topicFilter}
              onTopicFilter={setTopicFilter}
              confidenceMin={confidenceMin}
              onConfidenceMin={setConfidenceMin}
            />
            <div style={{ marginLeft: 220, marginRight: selectedNode ? 320 : 0, height: '100%' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                fitView
                minZoom={0.1}
                maxZoom={2}
                style={{ background: '#131313' }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  color="#1f1f1f"
                  gap={24}
                  size={1}
                />
                <Controls
                  style={{ background: '#191919', border: '1px solid #2a2a2a', borderRadius: 8 }}
                />
                <MiniMap
                  style={{ background: '#161616', border: '1px solid #2a2a2a' }}
                  nodeColor={n => NODE_COLORS[n.data?.nodeType]?.dot || '#3f3f46'}
                  maskColor="rgba(0,0,0,0.6)"
                />
              </ReactFlow>
            </div>
            {selectedNode && (
              <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
            )}
          </>
        )}
      </div>
    </div>
    </AppShell>
  );
}
