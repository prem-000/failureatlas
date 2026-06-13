'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background, Controls, Node, Edge,
  useNodesState, useEdgesState, BackgroundVariant,
  NodeTypes, ReactFlowProvider, useReactFlow,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Sparkles, RefreshCw, ChevronDown, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { RoadmapNode } from './RoadmapNode';
import { ProblemDrawer } from './ProblemDrawer';
import { SearchBar } from './SearchBar';
import {
  useRoadmapState, useRoadmapGenerate, useSaveRoadmapState,
  useGraphFailures, useDynamicTopics,
  type RoadmapProblem, type RoadmapLevel, type RoadmapEdge as APIRoadmapEdge,
} from '@/hooks/usePhase3Queries';
import { useQueryClient } from '@tanstack/react-query';
import dagre from 'dagre';

import { SmartEdge } from './SmartEdge';
import { ClusterHeaderNode } from './ClusterHeaderNode';

const nodeTypes: NodeTypes = { 
  roadmapNode: RoadmapNode,
  clusterHeader: ClusterHeaderNode
};
const edgeTypes: any = { smart: SmartEdge };

function buildReactFlowGraph(
  levelData: RoadmapLevel,
  searchQuery: string
): { nodes: Node[]; edges: Edge[] } {
  const hasSearch = !!searchQuery.trim();
  const query = searchQuery.toLowerCase();

  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({ rankdir: 'LR', align: 'UL', ranksep: 100, nodesep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  const clusters = new Set<string>();

  (levelData.nodes || []).forEach(p => {
    if (p.cluster) clusters.add(p.cluster);
  });

  clusters.forEach(c => {
    g.setNode(`cluster-${c}`, { label: c, width: 340, height: 200 });
  });

  (levelData.nodes || []).forEach(p => {
    g.setNode(p.slug, { width: 300, height: 140 });
    if (p.cluster) {
      g.setParent(p.slug, `cluster-${p.cluster}`);
    }
  });

  (levelData.edges || []).forEach(e => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  const reactFlowNodes: Node[] = [];

  (levelData.nodes || []).forEach((p) => {
    const dagreNode = g.node(p.slug);
    const matchesSearch = hasSearch && (
      p.title.toLowerCase().includes(query) ||
      p.slug.toLowerCase().includes(query) ||
      p.topics.some(t => t.toLowerCase().includes(query)) ||
      p.patterns.some(t => t.toLowerCase().includes(query))
    );

    reactFlowNodes.push({
      id: p.slug,
      type: 'roadmapNode',
      position: { x: dagreNode.x - 150, y: dagreNode.y - 70 },
      data: {
        ...p,
        isFaded: hasSearch && !matchesSearch,
        isHighlighted: hasSearch && matchesSearch,
      },
    });
  });

  clusters.forEach(c => {
    const dagreGroup = g.node(`cluster-${c}`);
    if (dagreGroup) {
      reactFlowNodes.push({
        id: `cluster-${c}`,
        type: 'clusterHeader',
        position: { x: dagreGroup.x - 150, y: dagreGroup.y - dagreGroup.height / 2 - 30 },
        data: { label: c },
      });
    }
  });

  const reactFlowEdges: Edge[] = (levelData.edges || []).map(e => ({
    id: `e-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    type: 'smart',
    data: {
      type: e.type,
      confidence: e.confidence,
      reason: e.reason,
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: e.type === 'mastery_path' ? '#60a5fa' : e.type === 'remediation' ? '#fb923c' : '#9ca3af' },
  }));

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

function RoadmapTabInner() {
  const queryClient = useQueryClient();
  const reactFlow = useReactFlow();

  const [selectedTopic, setSelectedTopic] = useState('');
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<RoadmapProblem | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<APIRoadmapEdge | null>(null);
  const [currentLevels, setCurrentLevels] = useState<RoadmapLevel[]>([]);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);

  const { data: dynamicTopics, isLoading: topicsLoading } = useDynamicTopics();
  
  // Auto-select first dynamic topic
  useEffect(() => {
    if (dynamicTopics && dynamicTopics.length > 0 && !selectedTopic) {
      setSelectedTopic(dynamicTopics[0].id);
    }
  }, [dynamicTopics, selectedTopic]);

  const { data: savedState, isLoading: stateLoading } = useRoadmapState(selectedTopic);
  const generateMutation = useRoadmapGenerate();
  const saveMutation = useSaveRoadmapState();
  const { data: failures } = useGraphFailures(50, 60);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load persisted state
  useEffect(() => {
    if (savedState?.levels) {
      const parsed = savedState.levels as unknown as RoadmapLevel[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setCurrentLevels(parsed);
        setCurrentLevelIdx(parsed.length - 1);
      }
    }
  }, [savedState]);

  // Build ReactFlow graph from current level
  const currentLevelData = currentLevels[currentLevelIdx];
  useEffect(() => {
    if (!currentLevelData?.nodes) {
      setNodes([]); setEdges([]); return;
    }
    const { nodes: n, edges: e } = buildReactFlowGraph(currentLevelData, searchQuery);
    setNodes(n);
    setEdges(e);
  }, [currentLevelData, searchQuery]);

  // Auto-fit view when search changes
  useEffect(() => {
    if (!reactFlow || !searchQuery) return;
    const highlighted = nodes.filter(n => n.data?.isHighlighted);
    if (highlighted.length > 0) {
      setTimeout(() => reactFlow.fitView({ nodes: highlighted, duration: 400, padding: 0.3 }), 50);
    }
  }, [searchQuery, nodes, reactFlow]);

  const handleGenerate = useCallback(async () => {
    const existingSlugs = currentLevels.flatMap(l => l.nodes.map(p => p.slug));
    try {
      const result = await generateMutation.mutateAsync({
        topic: selectedTopic,
        level: currentLevels.length + 1,
        excludeSlugs: existingSlugs,
      });

      const newLevel: RoadmapLevel = {
        level: result.level,
        nodes: result.nodes,
        edges: result.edges,
        clusters: result.clusters,
        learningGoal: result.learningGoal,
        weaknessTarget: result.weaknessTarget,
        generatedAt: result.generatedAt,
      };

      const updatedLevels = [...currentLevels, newLevel];
      setCurrentLevels(updatedLevels);
      setCurrentLevelIdx(updatedLevels.length - 1);

      // Persist to DB
      await saveMutation.mutateAsync({
        topic: selectedTopic,
        currentLevel: result.level,
        levels: updatedLevels,
      });

      // Invalidate state query
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'state', selectedTopic] });
    } catch (err) {
      console.error('Generation error:', err);
    }
  }, [generateMutation, saveMutation, selectedTopic, currentLevels, queryClient]);

  const handleNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === 'clusterHeader') return;
    if (node.data?.nodeState === 'locked') return;
    setSelectedProblem(node.data as RoadmapProblem);
    setSelectedEdge(null);
  }, []);

  const handleEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdge(edge.data as APIRoadmapEdge);
    setSelectedProblem(null);
  }, []);

  const isGenerating = generateMutation.isPending;
  const hasData = currentLevels.length > 0;
  const topicLabel = dynamicTopics?.find((t: any) => t.id === selectedTopic)?.label || selectedTopic || 'Loading...';

  const completedCount = currentLevelData?.nodes?.filter(
    p => p.nodeState === 'solved' || p.nodeState === 'previously_solved'
  ).length || 0;
  const totalCount = currentLevelData?.nodes?.length || 0;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        .roadmap-toolbar { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; background: rgba(13,13,15,0.8); backdrop-filter: blur(12px); }
        .topic-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #e4e4e7; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 150ms; }
        .topic-btn:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.07); }
        .generate-btn { display: flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 10px; border: none; background: linear-gradient(135deg, #ff5f52, #d32f2f); color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 150ms; box-shadow: 0 4px 14px rgba(255,95,82,0.35); }
        .generate-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,95,82,0.45); }
        .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .level-tab { padding: 4px 12px; border-radius: 8px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 150ms; }
        .level-tab.active { background: rgba(255,95,82,0.15); color: #ff5f52; border: 1px solid rgba(255,95,82,0.3); }
        .level-tab.inactive { background: rgba(255,255,255,0.03); color: #52525b; border: 1px solid rgba(255,255,255,0.05); }
        .level-tab.inactive:hover { color: #a1a1aa; background: rgba(255,255,255,0.06); }
        .topic-dropdown { position: absolute; top: calc(100% + 6px); left: 0; background: rgba(15,15,18,0.97); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 6px; z-index: 100; min-width: 200px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); backdrop-filter: blur(16px); }
        .topic-option { display: block; width: 100%; text-align: left; padding: 7px 12px; border-radius: 8px; border: none; background: transparent; color: #a1a1aa; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 120ms; }
        .topic-option:hover, .topic-option.selected { background: rgba(255,95,82,0.1); color: #ff5f52; }
      `}</style>

      {/* Toolbar */}
      <div className="roadmap-toolbar">
        {/* Topic selector */}
        <div style={{ position: 'relative' }}>
          <button className="topic-btn" onClick={() => setShowTopicPicker(v => !v)}>
            {topicLabel}
            <ChevronDown size={13} style={{ transform: showTopicPicker ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
          </button>
          {showTopicPicker && dynamicTopics && (
            <div className="topic-dropdown">
              {dynamicTopics.map((t: any) => (
                <button
                  key={t.id}
                  className={`topic-option${t.id === selectedTopic ? ' selected' : ''}`}
                  onClick={() => { setSelectedTopic(t.id); setShowTopicPicker(false); setCurrentLevels([]); }}
                >
                  <div style={{ fontWeight: 800 }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: '#71717a', marginTop: 2 }}>{t.reason}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Level tabs */}
        {currentLevels.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {currentLevels.map((l, i) => (
              <button
                key={l.level}
                className={`level-tab${i === currentLevelIdx ? ' active' : ' inactive'}`}
                onClick={() => setCurrentLevelIdx(i)}
              >
                Level {l.level}
              </button>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {hasData && totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 200 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 2, transition: 'width 600ms ease' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, flexShrink: 0 }}>{completedCount}/{totalCount}</span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search problems..." />

        {/* Generate Button */}
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={isGenerating || stateLoading}
          title={hasData ? `Generate Level ${currentLevels.length + 1}` : 'Generate Level 1'}
        >
          {isGenerating ? (
            <><Loader2 size={13} className="spin-icon" /> Generating...</>
          ) : hasData ? (
            <><ArrowRight size={13} /> Next Level</>
          ) : (
            <><Sparkles size={13} /> Generate Roadmap</>
          )}
        </button>
      </div>

      {/* Canvas or empty state */}
      {stateLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <Loader2 size={28} style={{ color: '#ff5f52', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#71717a', fontSize: 13 }}>Loading roadmap state...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : !hasData ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', marginBottom: 8 }}>
              Generate Your Roadmap
            </h3>
            <p style={{ fontSize: 13, color: '#71717a', lineHeight: 1.6, marginBottom: 24 }}>
              FailureAtlas will analyze your failure history, root causes, and weaknesses to generate a personalized <strong style={{ color: '#a1a1aa' }}>{topicLabel}</strong> roadmap — powered by Groq.
            </p>
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{ margin: '0 auto', display: 'flex' }}
            >
              {isGenerating ? (
                <><Loader2 size={14} className="spin-icon" /> Analyzing failures...</>
              ) : (
                <><Sparkles size={14} /> Generate {topicLabel} Roadmap</>
              )}
            </button>
            {generateMutation.isError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: '#ef4444', fontSize: 12 }}>
                <AlertCircle size={13} />
                {(generateMutation.error as Error)?.message || 'Generation failed. Check your connection.'}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            style={{ background: '#0a0a0c' }}
          >
            <Background variant={BackgroundVariant.Dots} color="#1c1c1e" gap={24} size={1} />
            <Controls
              showInteractive={false}
              style={{ background: 'rgba(15,15,18,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}
            />
          </ReactFlow>

          {/* Generation error overlay */}
          {generateMutation.isError && (
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, color: '#fca5a5', fontSize: 12, fontWeight: 600 }}>
              <AlertCircle size={13} />
              {(generateMutation.error as Error)?.message || 'Failed to generate next level'}
            </div>
          )}
        </div>
      )}

      {/* Problem Drawer */}
      <ProblemDrawer
        problem={selectedProblem}
        relatedFailures={failures || []}
        onClose={() => setSelectedProblem(null)}
      />

      {/* Connection Inspector Drawer */}
      {selectedEdge && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 380,
          background: 'rgba(15,15,18,0.95)', borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', zIndex: 100,
          transform: selectedEdge ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#a1a1aa" /> Connection Inspector
            </h3>
            <button onClick={() => setSelectedEdge(null)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '24px', overflowY: 'auto' }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Why This Connection</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 14, color: '#e4e4e7', margin: 0, lineHeight: 1.6 }}>{selectedEdge.reason || 'AI generated connection between problems.'}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Type</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa', textTransform: 'capitalize' }}>{(selectedEdge.type || 'normal').replace('_', ' ')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Confidence</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2dd4bf' }}>{Math.round((selectedEdge.confidence || 0.9) * 100)}%</div>
              </div>
            </div>
            <div style={{ marginTop: 24, fontSize: 11, color: '#52525b', display: 'flex', justifyContent: 'space-between' }}>
              <span>Generated By: Groq Llama 3.3 70B</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RoadmapTab() {
  return (
    <ReactFlowProvider>
      <RoadmapTabInner />
    </ReactFlowProvider>
  );
}
