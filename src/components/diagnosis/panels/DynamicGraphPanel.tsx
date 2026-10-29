'use client';

/**
 * src/components/diagnosis/panels/DynamicGraphPanel.tsx
 *
 * Query-Aware Connected Graph Visualizer.
 * Primary Mode: Radial connected graph with central topic node and branching peripheral nodes.
 * Also supports: Hierarchical Tree, Directed Flowchart, and Architecture Graphs.
 * Features:
 * - ReactFlow interactive canvas (drag, zoom, pan, fit-to-view)
 * - Deterministic Run/Step simulation controls for algorithmic flowcharts
 * - Detail inspection drawer for grounded citations, code, links, and child-graph drill-down
 * - Layout mode switcher (Radial / Tree / Flowchart / Mermaid)
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  type Node,
  type Edge,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type {
  StructuredDiagram,
  DiagramNode,
  DiagramEdge,
  DiagramLayoutMode,
  SimulationStep,
} from '@/types/diagnosis-graph';
import { GraphLayoutEngine } from '@/lib/diagnosis/graph-layout';
import {
  GitFork,
  CheckCircle2,
  HelpCircle,
  Zap,
  Layers,
  ArrowRight,
  Maximize2,
  Code,
  Info,
  ExternalLink,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sparkles,
  Compass,
  Network,
  Share2,
} from 'lucide-react';

export interface DynamicGraphPanelProps {
  diagram: StructuredDiagram;
  onSelectEvidence?: (evidenceId: string) => void;
  onDrillDown?: (childQuery: string) => void;
}

// Visual tokens and color treatments adhering to Praxis Dark Aesthetic
const NODE_PALETTE: Record<
  string,
  { bg: string; border: string; text: string; label: string; glow?: string }
> = {
  central_topic: {
    bg: '#271010',
    border: '#ff5f52',
    text: '#ffffff',
    label: 'Central Concept',
    glow: '0 0 16px rgba(255, 95, 82, 0.45)',
  },
  concept: {
    bg: '#24103a',
    border: '#a855f7',
    text: '#f3e8ff',
    label: 'DSA Paradigm',
    glow: '0 0 10px rgba(168, 85, 247, 0.3)',
  },
  prerequisite: {
    bg: '#2b1b04',
    border: '#f59e0b',
    text: '#fef3c7',
    label: 'Prerequisite',
  },
  algorithm: {
    bg: '#082f49',
    border: '#38bdf8',
    text: '#e0f2fe',
    label: 'Technique / Invariant',
  },
  example_problem: {
    bg: '#042f2e',
    border: '#10b981',
    text: '#d1fae5',
    label: 'Interview Problem',
  },
  weakness: {
    bg: '#370b14',
    border: '#f43f5e',
    text: '#ffe4e6',
    label: 'Pitfall / WA Mode',
  },
  resource: {
    bg: '#172554',
    border: '#60a5fa',
    text: '#dbeafe',
    label: 'Verified Resource',
  },
  component: {
    bg: '#1e1b4b',
    border: '#818cf8',
    text: '#e0e7ff',
    label: 'System Component',
  },
  storage: {
    bg: '#0f172a',
    border: '#64748b',
    text: '#f1f5f9',
    label: 'Storage / Cache',
  },
  service: {
    bg: '#14271f',
    border: '#2dd4bf',
    text: '#ccfbf1',
    label: 'Service Engine',
  },
  start_end: {
    bg: '#064e3b',
    border: '#059669',
    text: '#a7f3d0',
    label: 'Boundary State',
  },
  process: {
    bg: '#1e293b',
    border: '#38bdf8',
    text: '#e0f2fe',
    label: 'Execution Step',
  },
  decision: {
    bg: '#451a03',
    border: '#f59e0b',
    text: '#fef3c7',
    label: 'Condition Check',
  },
  state_active: {
    bg: '#0f172a',
    border: '#38bdf8',
    text: '#7dd3fc',
    label: 'Active Step',
    glow: '0 0 14px rgba(56, 189, 248, 0.5)',
  },
};

/**
 * Custom ReactFlow Node for Rich Connected Graph
 */
const PraxisGraphNode: React.FC<NodeProps> = ({ data, selected }) => {
  const node: DiagramNode = data.node;
  const isSimulationActive = data.isSimulationActive;
  const style = NODE_PALETTE[node.type] || NODE_PALETTE.concept;
  const isCentral = node.type === 'central_topic';

  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl border text-left transition-all relative cursor-pointer min-w-[170px] max-w-[240px] select-none ${
        selected || isSimulationActive
          ? 'ring-2 ring-[#ff5f52] shadow-[0_0_18px_rgba(255,95,82,0.4)]'
          : 'hover:border-[#71717a]'
      }`}
      style={{
        backgroundColor: isSimulationActive ? '#2e1215' : style.bg,
        borderColor: isSimulationActive ? '#ff5f52' : selected ? '#ff5f52' : style.border,
        boxShadow: isSimulationActive ? '0 0 16px rgba(255, 95, 82, 0.6)' : style.glow || 'none',
      }}
    >
      {/* Hidden Handles for Directional Edges */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="l" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ opacity: 0 }} />

      {/* Top Type Pill & Complexity */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: style.border + '22',
            color: style.text,
            border: `1px solid ${style.border}44`,
          }}
        >
          {style.label}
        </span>
        {node.complexity && (
          <span className="text-[9px] font-mono text-[#a1a1aa] bg-[#101014] px-1 rounded">
            {node.complexity}
          </span>
        )}
      </div>

      {/* Node Label */}
      <div
        className={`font-bold leading-tight text-[#f4f4f5] ${
          isCentral ? 'text-sm text-[#ff7a6e]' : 'text-xs'
        }`}
      >
        {node.label}
      </div>

      {/* Short Summary */}
      <p className="text-[10px] text-[#a1a1aa] line-clamp-2 mt-1 m-0 leading-normal">
        {node.explanation}
      </p>

      {/* Verified link indicator badge */}
      {node.sourceUrl && (
        <div className="mt-1 flex items-center gap-1 text-[9px] text-[#60a5fa]">
          <ExternalLink className="w-2.5 h-2.5" />
          <span className="truncate">Source Link</span>
        </div>
      )}

      {/* Highlight Pulse Indicator */}
      {(node.isHighlighted || isCentral) && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#ff5f52] shadow-[0_0_8px_#ff5f52]" />
      )}
    </div>
  );
};

const nodeTypes = {
  praxisNode: PraxisGraphNode,
};

export const DynamicGraphPanel: React.FC<DynamicGraphPanelProps> = ({
  diagram,
  onSelectEvidence,
  onDrillDown,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    diagram.centralNodeId || diagram.nodes[0]?.id || ''
  );
  const [viewMode, setViewMode] = useState<'canvas' | 'mermaid'>('canvas');
  const [layoutMode, setLayoutMode] = useState<DiagramLayoutMode>(
    diagram.layoutMode || 'radial'
  );

  // Simulation State
  const [simStepIndex, setSimStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const simSteps: SimulationStep[] = diagram.simulationSteps || [];
  const currentStep = simSteps[simStepIndex] || null;

  // Mermaid Render State
  const [mermaidSvg, setMermaidSvg] = useState<string>('');
  const [mermaidLoading, setMermaidLoading] = useState(false);

  // Derive initial layouted nodes and edges
  const layouted = useMemo(() => {
    return GraphLayoutEngine.applyLayout(diagram, layoutMode);
  }, [diagram, layoutMode]);

  // Convert to ReactFlow format
  const initialNodes: Node[] = useMemo(() => {
    return layouted.nodes.map((node) => ({
      id: node.id,
      type: 'praxisNode',
      position: node.position,
      data: {
        node,
        isSimulationActive: currentStep?.activeNodeId === node.id,
      },
    }));
  }, [layouted.nodes, currentStep?.activeNodeId]);

  const initialEdges: Edge[] = useMemo(() => {
    return layouted.edges.map((edge) => {
      const isSimEdge = currentStep?.activeEdgeId === edge.id;
      const isRadial = edge.relationType === 'radial_branch' || edge.relationType === 'prerequisite';

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: isRadial ? 'straight' : 'smoothstep',
        animated: isSimEdge || edge.relationType === 'data_flow',
        style: {
          stroke: isSimEdge ? '#ff5f52' : edge.isHighlighted ? '#f59e0b' : '#52525b',
          strokeWidth: isSimEdge ? 2.5 : 1.5,
        },
        labelStyle: {
          fill: '#cbd5e1',
          fontSize: 10,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: '#18181c',
          fillOpacity: 0.85,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSimEdge ? '#ff5f52' : '#71717a',
          width: 14,
          height: 14,
        },
      };
    });
  }, [layouted.edges, currentStep]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync ReactFlow nodes when layout or simulation step changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Selected node model
  const selectedNode = useMemo(
    () => diagram.nodes.find((n) => n.id === selectedNodeId) || diagram.nodes[0],
    [diagram.nodes, selectedNodeId]
  );

  // Handle Node Click
  const handleNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Simulation Timer Interval
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && simSteps.length > 0) {
      timer = setInterval(() => {
        setSimStepIndex((prev) => {
          if (prev >= simSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1600);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, simSteps.length]);

  // Update selected node when simulation steps change
  useEffect(() => {
    if (currentStep) {
      setSelectedNodeId(currentStep.activeNodeId);
    }
  }, [currentStep]);

  // Mermaid SVG Renderer
  useEffect(() => {
    let isMounted = true;
    if (viewMode === 'mermaid' && diagram.mermaidFallback) {
      setMermaidLoading(true);
      import('mermaid')
        .then(({ default: mermaid }) => {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'dark',
            themeVariables: {
              background: '#131316',
              primaryColor: '#1e293b',
              primaryTextColor: '#f4f4f5',
              primaryBorderColor: '#38bdf8',
              lineColor: '#94a3b8',
              fontFamily: 'Inter, monospace',
            },
          });
          const id = `diag_svg_${Date.now()}`;
          return mermaid.render(id, diagram.mermaidFallback || '');
        })
        .then(({ svg }) => {
          if (isMounted) {
            setMermaidSvg(svg);
            setMermaidLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setMermaidLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [viewMode, diagram.mermaidFallback]);

  return (
    <div className="bg-[#141416] border border-[#27272a] rounded-xl overflow-hidden flex flex-col shadow-xl">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="p-3.5 bg-[#18181c] border-b border-[#222226] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#271010] border border-[#ff5f52]/40 text-[#ff5f52]">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#f4f4f5] leading-tight flex items-center gap-2">
              <span>{diagram.title}</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[#27272a] text-[#ff7a6e] border border-[#ff5f52]/30 uppercase font-semibold">
                {layoutMode.replace('_', ' ')}
              </span>
            </h4>
            <span className="text-[10px] text-[#71717a] line-clamp-1">{diagram.description}</span>
          </div>
        </div>

        {/* Layout Mode Toggles & Mermaid Switcher */}
        <div className="flex items-center gap-2">
          {viewMode === 'canvas' && (
            <div className="flex bg-[#121214] p-0.5 rounded-lg border border-[#27272a]">
              <button
                onClick={() => setLayoutMode('radial')}
                title="Radial Connected Layout"
                className={`px-2 py-0.5 text-[10px] font-semibold rounded flex items-center gap-1 transition-all ${
                  layoutMode === 'radial'
                    ? 'bg-[#27272a] text-[#ff7a6e]'
                    : 'text-[#71717a] hover:text-[#d4d4d8]'
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>Radial</span>
              </button>
              <button
                onClick={() => setLayoutMode('tree')}
                title="Hierarchical Tree Layout"
                className={`px-2 py-0.5 text-[10px] font-semibold rounded flex items-center gap-1 transition-all ${
                  layoutMode === 'tree'
                    ? 'bg-[#27272a] text-[#ff7a6e]'
                    : 'text-[#71717a] hover:text-[#d4d4d8]'
                }`}
              >
                <GitFork className="w-3 h-3" />
                <span>Tree</span>
              </button>
              <button
                onClick={() => setLayoutMode('flowchart')}
                title="Flowchart Layout"
                className={`px-2 py-0.5 text-[10px] font-semibold rounded flex items-center gap-1 transition-all ${
                  layoutMode === 'flowchart'
                    ? 'bg-[#27272a] text-[#ff7a6e]'
                    : 'text-[#71717a] hover:text-[#d4d4d8]'
                }`}
              >
                <ArrowRight className="w-3 h-3" />
                <span>Flowchart</span>
              </button>
            </div>
          )}

          {/* Canvas / Mermaid Mode Toggle */}
          <div className="flex bg-[#121214] p-0.5 rounded-lg border border-[#27272a]">
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-2.5 py-0.5 text-[10px] font-semibold rounded ${
                viewMode === 'canvas'
                  ? 'bg-[#27272a] text-[#f4f4f5]'
                  : 'text-[#71717a] hover:text-[#d4d4d8]'
              }`}
            >
              Interactive Canvas
            </button>
            <button
              onClick={() => setViewMode('mermaid')}
              className={`px-2.5 py-0.5 text-[10px] font-semibold rounded flex items-center gap-1 ${
                viewMode === 'mermaid'
                  ? 'bg-[#27272a] text-[#f4f4f5]'
                  : 'text-[#71717a] hover:text-[#d4d4d8]'
              }`}
            >
              <Code className="w-3 h-3" />
              <span>Mermaid</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Interactive ReactFlow Canvas ─────────────────────────────────────── */}
      {viewMode === 'canvas' && (
        <div className="flex flex-col">
          {/* Simulation Controls Banner (if supported) */}
          {diagram.supportsSimulation && simSteps.length > 0 && (
            <div className="px-4 py-2 bg-[#121216] border-b border-[#222228] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff7a6e] flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  <span>Execution Simulation:</span>
                </span>
                <span className="text-xs text-[#d4d4d8] font-semibold">
                  Step {simStepIndex + 1} of {simSteps.length}: {currentStep?.title}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setSimStepIndex((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={simStepIndex === 0}
                  className="p-1 rounded bg-[#1e1e24] text-[#d4d4d8] disabled:opacity-40 hover:bg-[#27272e] border border-[#2e2e38]"
                  title="Previous Step"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-2.5 py-1 rounded bg-[#ff5f52] text-white font-bold text-[10px] flex items-center gap-1 shadow-[0_0_8px_rgba(255,95,82,0.4)] hover:brightness-110"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Run</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setSimStepIndex((prev) => Math.min(simSteps.length - 1, prev + 1));
                  }}
                  disabled={simStepIndex >= simSteps.length - 1}
                  className="p-1 rounded bg-[#1e1e24] text-[#d4d4d8] disabled:opacity-40 hover:bg-[#27272e] border border-[#2e2e38]"
                  title="Next Step"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setSimStepIndex(0);
                  }}
                  className="p-1 rounded bg-[#1e1e24] text-[#a1a1aa] hover:text-white hover:bg-[#27272e] border border-[#2e2e38]"
                  title="Reset Simulation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ReactFlow Interactive Graph Container */}
          <div className="h-[360px] w-full bg-[#0e0e11] relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={1.8}
            >
              <Background color="#27272a" gap={20} size={1} />
              <Controls
                showInteractive={false}
                className="bg-[#18181c] border border-[#27272a] rounded-lg text-[#f4f4f5] shadow-lg overflow-hidden [&_button]:border-b [&_button]:border-[#27272a]"
              />
            </ReactFlow>

            {/* Quick Helper Floating Pill */}
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-[#18181c]/80 backdrop-blur border border-[#27272a] text-[9px] text-[#71717a] pointer-events-none">
              Click node to inspect • Drag to rearrange • Scroll to zoom
            </div>
          </div>

          {/* ── Node Detail & Grounding Inspector Drawer ────────────────────────── */}
          {selectedNode && (
            <div className="p-4 bg-[#16161b] border-t border-[#222228] flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#24242c] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        NODE_PALETTE[selectedNode.type]?.border || '#38bdf8',
                    }}
                  />
                  <h5 className="text-xs font-bold text-[#f4f4f5] m-0">
                    {selectedNode.label}
                  </h5>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f1f26] text-[#a1a1aa]">
                    {selectedNode.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedNode.complexity && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0f172a] text-[#38bdf8] border border-[#1e293b]">
                      {selectedNode.complexity}
                    </span>
                  )}
                  {selectedNode.childGraphQuery && onDrillDown && (
                    <button
                      onClick={() => onDrillDown(selectedNode.childGraphQuery!)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#24103a] text-[#d8b4fe] border border-[#a855f7]/40 hover:bg-[#3b0764] cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <Sparkles className="w-3 h-3 text-[#c084fc]" />
                      <span>Drill Into Concept</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Node Explanation */}
              <p className="text-xs text-[#d4d4d8] leading-relaxed m-0">
                {selectedNode.explanation}
              </p>

              {/* Simulation Step Guidance (if currently active) */}
              {currentStep && currentStep.activeNodeId === selectedNode.id && (
                <div className="p-2.5 rounded-lg bg-[#271010] border border-[#ff5f52]/40 text-xs text-[#ffcdd2]">
                  <span className="font-bold">Step Action: </span>
                  {currentStep.description}
                </div>
              )}

              {/* Code Snippet (if available) */}
              {selectedNode.codeSnippet && (
                <pre className="p-2.5 rounded-lg bg-[#0d0d10] border border-[#27272a] text-[11px] font-mono text-[#a5f3fc] overflow-x-auto m-0">
                  {selectedNode.codeSnippet}
                </pre>
              )}

              {/* Bottom Grounding & External Links Bar */}
              <div className="pt-2 border-t border-[#202026] flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-3">
                  {selectedNode.evidenceRefId && (
                    <span className="text-[11px] text-[#34d399] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Backed by RAG Evidence</span>
                    </span>
                  )}
                  {selectedNode.relatedProblems && selectedNode.relatedProblems.length > 0 && (
                    <span className="text-[11px] text-[#a1a1aa]">
                      Problems:{' '}
                      <span className="text-[#f4f4f5] font-semibold">
                        {selectedNode.relatedProblems.join(', ')}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {selectedNode.evidenceRefId && onSelectEvidence && (
                    <button
                      onClick={() => onSelectEvidence(selectedNode.evidenceRefId!)}
                      className="text-[11px] text-[#38bdf8] font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer flex items-center gap-1"
                    >
                      <span>Inspect RAG Evidence</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {selectedNode.sourceUrl && (
                    <a
                      href={selectedNode.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#60a5fa] font-semibold hover:underline flex items-center gap-1 no-underline"
                    >
                      <span>Verified Documentation</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Legend Bar ──────────────────────────────────────────────────────── */}
          {diagram.legend && diagram.legend.length > 0 && (
            <div className="p-3 bg-[#111114] border-t border-[#1e1e24] flex items-center gap-3 text-[10px] text-[#71717a] flex-wrap">
              <span className="font-bold uppercase tracking-wider text-[#a1a1aa]">
                Graph Legend:
              </span>
              {diagram.legend.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[#d4d4d8]">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Mermaid View Mode ────────────────────────────────────────────────── */}
      {viewMode === 'mermaid' && (
        <div className="p-4 flex flex-col gap-3 min-h-[260px]">
          {mermaidLoading ? (
            <div className="flex items-center justify-center p-12 text-xs text-[#71717a]">
              Rendering Mermaid diagram...
            </div>
          ) : mermaidSvg ? (
            <div
              className="overflow-x-auto p-4 bg-[#101012] rounded-lg border border-[#222226] flex justify-center [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: mermaidSvg }}
            />
          ) : (
            <pre className="p-4 bg-[#101012] border border-[#222226] rounded-lg text-xs font-mono text-[#a1a1aa] overflow-x-auto">
              {diagram.mermaidFallback}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
