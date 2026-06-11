'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useGraphSubgraph } from '@/hooks/usePhase3Queries';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListChecks,
  GitFork,
  Stethoscope,
  Settings,
  LogOut,
  Search,
  SlidersHorizontal,
  Sliders,
  Download,
  Map,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';

// ─── Type Colors ───────────────────────────────────────────────────────────────
const NODE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  Problem:          { bg: 'rgba(30, 58, 95, 0.65)', border: '#3b82f6', text: '#93c5fd', dot: '#3b82f6', glow: 'rgba(59, 130, 246, 0.35)' },
  FailureEvent:     { bg: 'rgba(61, 31, 0, 0.65)', border: '#f97316', text: '#fdba74', dot: '#f97316', glow: 'rgba(249, 115, 22, 0.35)' },
  Evidence:         { bg: 'rgba(28, 28, 30, 0.65)', border: '#71717a', text: '#a1a1aa', dot: '#71717a', glow: 'rgba(113, 113, 122, 0.25)' },
  RootCause:        { bg: 'rgba(45, 31, 0, 0.65)', border: '#f59e0b', text: '#fcd34d', dot: '#f59e0b', glow: 'rgba(245, 158, 11, 0.35)' },
  Weakness:         { bg: 'rgba(46, 16, 101, 0.65)', border: '#a855f7', text: '#d8b4fe', dot: '#a855f7', glow: 'rgba(168, 85, 247, 0.35)' },
  LearningStrategy: { bg: 'rgba(5, 46, 22, 0.65)', border: '#22c55e', text: '#86efac', dot: '#22c55e', glow: 'rgba(34, 197, 94, 0.35)' },
};

// ─── Custom Node Component ─────────────────────────────────────────────────────
function CustomNode({ data }: NodeProps) {
  const colors = NODE_COLORS[data.nodeType] || NODE_COLORS.Evidence;
  const label = data.label?.length > 28 ? data.label.slice(0, 26) + '…' : data.label;

  const targetPosition = data.targetPosition || Position.Left;
  const sourcePosition = data.sourcePosition || Position.Right;

  return (
    <div
      className="custom-node-card group"
      style={{
        '--node-glow': colors.glow,
        '--node-border': colors.border,
        '--node-bg-hover': colors.bg.replace('0.65', '0.85'),
        background: colors.bg,
        border: `1px solid ${colors.border}4D`,
        borderRadius: '14px',
        padding: '12px 16px',
        minWidth: '160px',
        maxWidth: '220px',
        boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      } as React.CSSProperties}
    >
      <Handle
        type="target"
        position={targetPosition}
        style={{
          background: colors.border,
          border: '2px solid #09090b',
          width: 8,
          height: 8,
          transition: 'transform 200ms',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span
          className="animate-pulse"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: colors.dot,
            flexShrink: 0,
            display: 'inline-block',
            boxShadow: `0 0 8px ${colors.border}`,
          }}
        />
        <span style={{ fontSize: '9px', color: colors.text, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {data.nodeType}
        </span>
      </div>
      <div style={{ fontSize: '12.5px', color: '#f4f4f5', fontWeight: 500, lineHeight: 1.35 }}>{label}</div>
      <Handle
        type="source"
        position={sourcePosition}
        style={{
          background: colors.border,
          border: '2px solid #09090b',
          width: 8,
          height: 8,
          transition: 'transform 200ms',
        }}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode };

// ─── Constants ─────────────────────────────────────────────────────────────────
const ALL_TYPES = ['Problem', 'FailureEvent', 'Evidence', 'RootCause', 'Weakness', 'LearningStrategy'];
const TYPE_STAGES: Record<string, number> = {
  Problem: 1,
  FailureEvent: 2,
  Evidence: 3,
  RootCause: 4,
  Weakness: 5,
  LearningStrategy: 6,
};

// Helper: Find neighbors of a node
function getConnectedNeighbors(nodeId: string, edges: Edge[], nodes: Node[]): Node[] {
  const neighborIds = new Set<string>();
  for (const edge of edges) {
    if (edge.source === nodeId) neighborIds.add(edge.target);
    if (edge.target === nodeId) neighborIds.add(edge.source);
  }
  return nodes.filter(n => neighborIds.has(n.id));
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function GraphPage() {
  const pathname = usePathname();
  const { data: graphData, isLoading: loading, error: queryError } = useGraphSubgraph(300);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const error = queryError ? (queryError as Error).message : null;

  // Interactivity States
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(ALL_TYPES));
  const [showFilters, setShowFilters] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Filter States
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [weaknessSearchQuery, setWeaknessSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confidenceMin, setConfidenceMin] = useState(0);

  // Layout & Animation States
  const [layoutMode, setLayoutMode] = useState<'column' | 'vertical'>('column');
  const [revealStage, setRevealStage] = useState(0);

  const rawNodes = useRef<Node[]>([]);
  const rawEdges = useRef<Edge[]>([]);

  // User States
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Sync loaded data
  useEffect(() => {
    if (!graphData) return;
    rawNodes.current = graphData.nodes as Node[];
    rawEdges.current = graphData.edges as Edge[];
  }, [graphData]);

  // Staggered reveal animation triggers on load or data reset
  useEffect(() => {
    if (!graphData) return;
    setRevealStage(0);
    const timers = [
      setTimeout(() => setRevealStage(1), 100),
      setTimeout(() => setRevealStage(2), 250),
      setTimeout(() => setRevealStage(3), 400),
      setTimeout(() => setRevealStage(4), 550),
      setTimeout(() => setRevealStage(5), 700),
      setTimeout(() => setRevealStage(6), 850),
    ];
    return () => timers.forEach(clearTimeout);
  }, [graphData]);

  // Re-layout and filter execution
  useEffect(() => {
    const isVertical = layoutMode === 'vertical';

    const passesNode = (n: Node): boolean => {
      const type = n.data?.nodeType as string;
      const stage = TYPE_STAGES[type] || 1;
      if (stage > revealStage) return false;

      if (!activeTypes.has(type)) return false;

      const props = (n.data?.properties || {}) as Record<string, any>;

      // Node text search
      if (nodeSearchQuery.trim()) {
        const q = nodeSearchQuery.toLowerCase();
        const label = String(n.data?.label || '').toLowerCase();
        if (!label.includes(q)) return false;
      }

      // Weakness text search
      if (weaknessSearchQuery.trim() && type === 'Weakness') {
        const q = weaknessSearchQuery.toLowerCase();
        const name = String(props.name || n.data?.label || '').toLowerCase();
        if (!name.includes(q)) return false;
      }

      // Topic/Problem search
      if (topicFilter.trim() && type === 'Problem') {
        const topics = (props.topics as string[]) || [];
        const q = topicFilter.toLowerCase();
        const label = String(n.data?.label || '').toLowerCase();
        if (!topics.some(t => t.toLowerCase().includes(q)) && !label.includes(q)) return false;
      }

      // Date range filters
      if (dateFrom || dateTo) {
        if (type === 'FailureEvent' && props.timestamp) {
          const t = new Date(String(props.timestamp)).getTime();
          if (dateFrom && t < new Date(dateFrom).getTime()) return false;
          if (dateTo && t > new Date(dateTo).getTime() + 86400000 - 1) return false;
        }
      }

      // Confidence filters
      if (confidenceMin > 0 && (type === 'Evidence' || type === 'RootCause')) {
        const conf = Number(props.confidence);
        if (!Number.isNaN(conf) && conf < confidenceMin) return false;
      }

      return true;
    };

    let filteredNodes = rawNodes.current.filter(passesNode);

    // If topic/problem filtering is active, expand connections
    if (topicFilter.trim()) {
      const problemIds = new Set(
        filteredNodes.filter(n => n.data?.nodeType === 'Problem').map(n => n.id)
      );
      if (problemIds.size > 0) {
        let connected = new Set(problemIds);
        let changed = true;
        while (changed) {
          changed = false;
          for (const e of rawEdges.current) {
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
        filteredNodes = rawNodes.current.filter(
          n => connected.has(n.id) && activeTypes.has(n.data?.nodeType) && passesNode(n)
        );
      }
    }

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = rawEdges.current
      .filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target))
      .map(e => ({
        ...e,
        animated: e.type === 'TRIGGERED' || e.type === 'HAS_EVIDENCE',
        style: e.type === 'TRIGGERED' ? { stroke: '#ff5f52', strokeWidth: 1.5 } : undefined,
      }));

    // Apply layout positions (Column vs Vertical Flow)
    const mappedNodes = filteredNodes.map(node => {
      const type = node.data?.nodeType as string;
      const stage = TYPE_STAGES[type] || 1;

      // Original left-to-right positions from operations.ts
      let originalX = node.position.x;
      let originalY = node.position.y;

      // Dynamic calculation for Vertical Flow (Top-To-Bottom)
      if (isVertical) {
        // Group by stage depth
        const sameStageNodes = filteredNodes.filter(fn => (TYPE_STAGES[fn.data?.nodeType] || 1) === stage);
        const indexInStage = sameStageNodes.findIndex(fn => fn.id === node.id);
        const countInStage = sameStageNodes.length;

        // Space out horizontally
        const horizontalGap = 240;
        const totalWidth = (countInStage - 1) * horizontalGap;
        originalX = indexInStage * horizontalGap - totalWidth / 2 + 650;
        // Space out vertically
        originalY = (stage - 1) * 260 + 50;
      }

      return {
        ...node,
        position: { x: originalX, y: originalY },
        data: {
          ...node.data,
          targetPosition: isVertical ? Position.Top : Position.Left,
          sourcePosition: isVertical ? Position.Bottom : Position.Right,
        },
      };
    });

    setNodes(mappedNodes);
    setEdges(filteredEdges);
  }, [
    activeTypes,
    dateFrom,
    dateTo,
    topicFilter,
    nodeSearchQuery,
    weaknessSearchQuery,
    confidenceMin,
    layoutMode,
    revealStage,
    graphData
  ]);

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

  // Compute stats based on loaded graph
  const visibleCount = nodes.length;
  const stats = graphData?.stats ?? null;

  // Selected node neighbors for Right Inspector
  const neighborNodes = useMemo(() => {
    if (!selectedNode) return [];
    return getConnectedNeighbors(selectedNode.id, edges, nodes);
  }, [selectedNode, edges, nodes]);

  // Export current graph data to JSON
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "failure_graph_subgraph.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <AppShell fullscreen hideSidebar>
      <div
        style={{
          width: '100%',
          height: '100vh',
          background: '#09090b',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        {/* CSS Particle edge animation and custom React Flow style overrides */}
        <style>{`
          .react-flow__edge.animated path.react-flow__edge-path {
            stroke-dasharray: 8;
            animation: flowParticles 1.5s linear infinite;
            stroke-width: 1.5px;
          }
          @keyframes flowParticles {
            from { stroke-dashoffset: 24; }
            to { stroke-dashoffset: 0; }
          }
          .custom-node-card:hover {
            transform: scale(1.05);
            box-shadow: 0 0 24px var(--node-glow) !important;
            border-color: var(--node-border) !important;
            background: var(--node-bg-hover) !important;
          }
          /* Scrollbar styling */
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
          /* Backdrop blurs styling */
          .glassmorphism-panel {
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.45);
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(15, 15, 18, 0.85);
            backdrop-filter: blur(16px);
          }
        `}</style>

        {/* ─── 1. REACT FLOW CANVAS (Occupies 100% full background) ──────────────── */}
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
              <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.05)', borderTopColor: '#ff5f52', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: '#71717a', fontSize: 13, letterSpacing: '0.05em' }}>COMPILING ONTOLOGY GRAPH...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <span style={{ color: '#ef4444', fontSize: 14 }}>{error}</span>
              <span style={{ color: '#52525b', fontSize: 12 }}>Verify database connection or run standard seed script.</span>
            </div>
          ) : nodes.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 48 }}>🔭</span>
              <span style={{ color: '#a1a1aa', fontSize: 15, fontWeight: 600 }}>No matching graph nodes found</span>
              <span style={{ color: '#52525b', fontSize: 12 }}>Adjust your search queries or filter criteria.</span>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              fitView
              minZoom={0.05}
              maxZoom={2.5}
              style={{ background: '#09090b' }}
            >
              <Background variant={BackgroundVariant.Dots} color="#18181b" gap={20} size={1} />
              <Controls
                showInteractive={false}
                position="bottom-right"
                style={{
                  background: 'rgba(15,15,18,0.85)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(10px)',
                  marginBottom: 16,
                  marginRight: 16,
                }}
              />
            </ReactFlow>
          )}
        </div>

        {/* ─── 2. FLOATING LEFT NAVIGATION RAIL ──────────────────────────────────── */}
        <aside
          className="glassmorphism-panel"
          onMouseEnter={() => setIsNavExpanded(true)}
          onMouseLeave={() => setIsNavExpanded(false)}
          style={{
            position: 'absolute',
            left: '16px',
            top: '16px',
            bottom: '16px',
            width: isNavExpanded ? '88px' : '72px',
            zIndex: 100,
            borderRadius: '32px',
            transition: 'width 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px 0',
          }}
        >
          {/* Brand Logo */}
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-2xl flex items-center justify-center mb-10 transition-transform select-none"
            style={{
              background: 'linear-gradient(135deg, #ff5f52 0%, #d32f2f 100%)',
              boxShadow: '0 4px 14px rgba(255, 95, 82, 0.4)'
            }}
            title="FailureAtlas"
          >
            <span className="text-white font-black text-lg">F</span>
          </Link>

          {/* Navigation Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, width: '100%', alignItems: 'center' }}>
            {[
              { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { href: '/problems', icon: ListChecks, label: 'Problems' },
              { href: '/graph', icon: GitFork, label: 'Graph Explorer' },
              { href: '/diagnosis', icon: Stethoscope, label: 'AI Diagnosis' },
            ].map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className="group relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
                  style={{
                    color: active ? '#ff5f52' : '#71717a',
                    transform: 'scale(1)',
                    boxShadow: active ? '0 0 12px rgba(255,95,82,0.2)' : 'none',
                    background: active ? 'rgba(255,95,82,0.1)' : 'transparent',
                  }}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} style={{ transition: 'transform 200ms' }} className="group-hover:scale-110" />
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        width: '3px',
                        height: '16px',
                        borderRadius: '0 4px 4px 0',
                        background: '#ff5f52',
                        boxShadow: '0 0 8px #ff5f52',
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Rail Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <Link
              href="/settings"
              title="Settings"
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors hover:bg-white/5"
            >
              <Settings size={20} strokeWidth={1.8} />
            </Link>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut size={18} strokeWidth={1.8} />
            </button>

            {/* Profile Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs select-none border border-white/10"
              style={{
                background: 'linear-gradient(135deg, #27272a 0%, #09090b 100%)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              }}
              title={user?.email}
            >
              {user?.name?.[0].toUpperCase() || user?.email?.[0].toUpperCase() || 'U'}
            </div>
          </div>
        </aside>

        {/* ─── 3. TOP TOOLBAR ────────────────────────────────────────────────────── */}
        <header
          className="glassmorphism-panel"
          style={{
            position: 'absolute',
            top: '16px',
            left: isNavExpanded ? '120px' : '104px',
            right: '16px',
            height: '64px',
            zIndex: 90,
            borderRadius: '20px',
            transition: 'left 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}
        >
          {/* Left: Title & Live Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '15.5px', fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitFork size={18} className="text-[#ff5f52]" />
              Graph Explorer
            </span>
            {stats && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  color: '#71717a',
                  fontWeight: 600,
                  gap: 8,
                }}
              >
                <span>Nodes: <strong style={{ color: '#d4d4d8' }}>{visibleCount}</strong></span>
                <span style={{ width: 1, height: 10, background: '#27272a' }} />
                <span>Edges: <strong style={{ color: '#d4d4d8' }}>{edges.length}</strong></span>
              </div>
            )}
          </div>

          {/* Center: Triple Search inputs (Nodes, Problems, Weaknesses) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '560px', margin: '0 20px' }}>
            {/* Search Nodes */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
              <input
                value={nodeSearchQuery}
                onChange={e => setNodeSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  padding: '7px 10px 7px 28px',
                  color: '#e4e4e7',
                  fontSize: '11.5px',
                  outline: 'none',
                  transition: 'border-color 200ms',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.05)')}
              />
            </div>

            {/* Search Topics/Problems */}
            <div style={{ position: 'relative', flex: 1 }}>
              <ListChecks size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
              <input
                value={topicFilter}
                onChange={e => setTopicFilter(e.target.value)}
                placeholder="Search problems/topics..."
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  padding: '7px 10px 7px 28px',
                  color: '#e4e4e7',
                  fontSize: '11.5px',
                  outline: 'none',
                  transition: 'border-color 200ms',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.05)')}
              />
            </div>

            {/* Search Weaknesses */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Sliders size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
              <input
                value={weaknessSearchQuery}
                onChange={e => setWeaknessSearchQuery(e.target.value)}
                placeholder="Search weaknesses..."
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  padding: '7px 10px 7px 28px',
                  color: '#e4e4e7',
                  fontSize: '11.5px',
                  outline: 'none',
                  transition: 'border-color 200ms',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.05)')}
              />
            </div>
          </div>

          {/* Right: Actions Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Layout selector */}
            <button
              onClick={() => setLayoutMode(prev => prev === 'column' ? 'vertical' : 'column')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Toggle graph layout flow direction"
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              <Layers size={13} />
              {layoutMode === 'column' ? 'Horizontal Flow' : 'Vertical Flow'}
            </button>

            {/* Filters Toggler */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-lg border transition-colors"
              style={{
                background: showFilters ? 'rgba(255,95,82,0.15)' : 'rgba(255,255,255,0.05)',
                borderColor: showFilters ? '#ff5f52' : 'rgba(255,255,255,0.05)',
                color: showFilters ? '#ff5f52' : '#a1a1aa'
              }}
              title="Advanced filters panel"
            >
              <SlidersHorizontal size={15} />
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              className="p-2 rounded-lg bg-white/5 border border-white/5 text-[#a1a1aa] hover:text-white transition-colors"
              title="Export current graph to JSON file"
            >
              <Download size={15} />
            </button>
          </div>
        </header>

        {/* ─── 4. FLOATING FILTER CHIPS ( sit below toolbar) ────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: '92px',
            left: isNavExpanded ? '120px' : '104px',
            zIndex: 90,
            display: 'flex',
            gap: '8px',
            transition: 'left 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {ALL_TYPES.map(type => {
            const colors = NODE_COLORS[type];
            const active = activeTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: active ? colors.bg : 'rgba(15,15,18,0.4)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${active ? colors.border : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '20px',
                  padding: '5px 12px',
                  cursor: 'pointer',
                  transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: active ? `0 2px 10px ${colors.border}22` : 'none',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: active ? colors.dot : '#52525b',
                    display: 'inline-block',
                    boxShadow: active ? `0 0 6px ${colors.border}` : 'none'
                  }}
                />
                <span style={{ fontSize: '11px', color: active ? '#f4f4f5' : '#71717a', fontWeight: 600 }}>{type}</span>
              </button>
            );
          })}
        </div>

        {/* ─── 5. FLOATING ADVANCED FILTERS PANEL ────────────────────────────────── */}
        {showFilters && (
          <div
            className="glassmorphism-panel"
            style={{
              position: 'absolute',
              top: '92px',
              right: '16px',
              width: '280px',
              zIndex: 95,
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Advanced Filters</span>
              <button onClick={() => setShowFilters(false)} style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer' }}><X size={15} /></button>
            </div>

            {/* Min Confidence */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                <span>Min Confidence</span>
                <span style={{ color: '#ff5f52' }}>{Math.round(confidenceMin * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(confidenceMin * 100)}
                onChange={e => setConfidenceMin(Number(e.target.value) / 100)}
                style={{ width: '100%', accentColor: '#ff5f52', background: '#27272a', height: '4px', borderRadius: '2px', outline: 'none' }}
              />
            </div>

            {/* Date Range */}
            <div>
              <div style={{ fontSize: '10.5px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Date Range</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '5px 8px',
                    color: '#d4d4d8',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '5px 8px',
                    color: '#d4d4d8',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => {
                setNodeSearchQuery('');
                setTopicFilter('');
                setWeaknessSearchQuery('');
                setDateFrom('');
                setDateTo('');
                setConfidenceMin(0);
                setActiveTypes(new Set(ALL_TYPES));
              }}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '8px',
                color: '#a1a1aa',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 200ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* ─── 6. FLOATING RIGHT INSPECTOR PANEL (Slide-over container) ─────────── */}
        <section
          className="custom-scrollbar"
          style={{
            position: 'absolute',
            right: '16px',
            top: '16px',
            bottom: '16px',
            width: '360px',
            zIndex: 100,
            background: 'rgba(12, 12, 14, 0.93)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            borderRadius: '24px',
            transform: selectedNode ? 'translate3d(0, 0, 0)' : 'translate3d(120%, 0, 0)',
            transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {selectedNode && (
            <>
              {/* Header */}
              <div
                style={{
                  padding: '24px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '9px',
                      background: NODE_COLORS[selectedNode.data?.nodeType]?.bg,
                      color: NODE_COLORS[selectedNode.data?.nodeType]?.text,
                      border: `1.5px solid ${NODE_COLORS[selectedNode.data?.nodeType]?.border}55`,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedNode.data.nodeType}
                  </span>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f4f4f5', marginTop: 12, lineHeight: 1.35 }}>
                    {selectedNode.data.label}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    color: '#71717a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#71717a')}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Inspector Content Scroll Area */}
              <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {/* Confidence score meter */}
                {selectedNode.data.properties?.confidence !== undefined && (
                  <div style={{ marginBottom: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                      <span>Confidence Score</span>
                      <span style={{ color: NODE_COLORS[selectedNode.data.nodeType]?.text }}>
                        {Math.round(selectedNode.data.properties.confidence * 100)}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${selectedNode.data.properties.confidence * 100}%`,
                          height: '100%',
                          background: NODE_COLORS[selectedNode.data.nodeType]?.border,
                          borderRadius: 3,
                          boxShadow: `0 0 8px ${NODE_COLORS[selectedNode.data.nodeType]?.border}`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Metadata Properties */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(selectedNode.data.properties || {}).map(([key, val]) => {
                    if (val === null || val === undefined || val === '') return null;
                    if (key === 'confidence') return null; // rendered separately

                    // Custom rendering for code diffs
                    if (key === 'code' || key === 'diff') {
                      return (
                        <div key={key}>
                          <span style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{key}</span>
                          <pre
                            className="custom-scrollbar"
                            style={{
                              fontSize: '11px',
                              color: '#a1a1aa',
                              background: '#040405',
                              border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '12px',
                              padding: '12px',
                              overflowX: 'auto',
                              fontFamily: 'SFMono-Regular, Consolas, monospace',
                              margin: 0,
                            }}
                          >
                            <code>{String(val)}</code>
                          </pre>
                        </div>
                      );
                    }

                    // Render arrays (e.g. topics or problems) as chips
                    if (Array.isArray(val)) {
                      return (
                        <div key={key}>
                          <span style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{key}</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {val.map((item, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '10px',
                                  color: '#e4e4e7',
                                  background: 'rgba(255,255,255,0.04)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                }}
                              >
                                {String(item)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={key}>
                        <span style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{key}</span>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#d4d4d8',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            wordBreak: 'break-word',
                            lineHeight: 1.4,
                          }}
                        >
                          {String(val)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Connected Neighbor Nodes Explorer */}
                  {neighborNodes.length > 0 && (
                    <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                      <span style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                        Connected Entities
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {neighborNodes.map(neighbor => {
                          const nColors = NODE_COLORS[neighbor.data?.nodeType] || NODE_COLORS.Evidence;
                          return (
                            <button
                              key={neighbor.id}
                              onClick={() => setSelectedNode(neighbor)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.04)',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                width: '100%',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 200ms',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = nColors.border;
                                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: nColors.dot, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '11px', fontWeight: 500, color: '#f4f4f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {neighbor.data?.label}
                                </div>
                                <div style={{ fontSize: '8.5px', color: nColors.text, textTransform: 'uppercase', fontWeight: 700, marginTop: 1 }}>
                                  {neighbor.data?.nodeType}
                                </div>
                              </div>
                              <ChevronRight size={13} style={{ color: '#52525b' }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* ─── 7. COLLAPSIBLE FLOATING MINIMAP (Bottom-left) ──────────────────────── */}
        <div
          onMouseEnter={() => setIsMapExpanded(true)}
          onMouseLeave={() => setIsMapExpanded(false)}
          style={{
            position: 'absolute',
            left: isNavExpanded ? '120px' : '104px',
            bottom: '16px',
            zIndex: 90,
            transition: 'left 300ms cubic-bezier(0.16, 1, 0.3, 1), width 300ms, height 300ms, border-radius 300ms',
            width: isMapExpanded ? '200px' : '44px',
            height: isMapExpanded ? '150px' : '44px',
            background: 'rgba(15, 15, 18, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            borderRadius: isMapExpanded ? '16px' : '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!isMapExpanded ? (
            <Map size={16} style={{ color: '#a1a1aa' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <MiniMap
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  margin: 0,
                  background: 'transparent',
                }}
                nodeColor={n => NODE_COLORS[n.data?.nodeType]?.dot || '#3f3f46'}
                maskColor="rgba(9, 9, 11, 0.75)"
                nodeBorderRadius={6}
              />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
