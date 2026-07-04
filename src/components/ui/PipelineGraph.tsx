'use client';
/**
 * src/components/ui/PipelineGraph.tsx
 *
 * Interactive Knowledge Graph Explorer utilizing ReactFlow.
 * Includes pan, zoom, custom styled nodes, and an interactive side inspector panel.
 */

import React, { useState, useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Position,
  Handle,
  Background,
  Controls,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { X, Award, AlertCircle, FileCode, CheckCircle2 } from 'lucide-react';

// ─── Custom Interactive Node ─────────────────────────────────────────────────
function KnowledgeNode({ data }: { data: { label: string; topic: string; level: number; status: 'mastered' | 'warning' | 'critical' } }) {
  const statusColors = {
    mastered: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5',
    warning: 'border-amber-500/40 text-amber-400 bg-amber-500/5',
    critical: 'border-red-500/40 text-red-400 bg-red-500/5',
  };

  const statusIcons = {
    mastered: <CheckCircle2 size={13} />,
    warning: <AlertCircle size={13} />,
    critical: <AlertCircle size={13} />,
  };

  return (
    <div className={`px-4 py-3 rounded-xl border bg-surface/90 backdrop-blur-md shadow-lg select-none text-left w-[200px] transition-all duration-200 hover:scale-[1.03] ${statusColors[data.status]}`}>
      <Handle type="target" position={Position.Left} className="w-1.5 h-1.5 !bg-zinc-700" />
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-0.5">{data.topic}</span>
        <h4 className="font-bold text-sm text-white mb-1.5">{data.label}</h4>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px]">
          <span className="flex items-center gap-1">
            {statusIcons[data.status]}
            {data.status === 'mastered' ? 'Mastered' : data.status === 'warning' ? 'Warning' : 'Critical'}
          </span>
          <span className="opacity-60">Lvl {data.level}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-1.5 h-1.5 !bg-zinc-700" />
    </div>
  );
}

const nodeTypes = {
  knowledge: KnowledgeNode,
};

// ─── Inspector Details Mock Data ──────────────────────────────────────────────
interface NodeDetail {
  id: string;
  title: string;
  topic: string;
  status: string;
  description: string;
  problems: string[];
  weaknesses: string[];
}

const INSPECTOR_DETAILS: Record<string, NodeDetail> = {
  '1': {
    id: '1',
    title: 'Two Pointers',
    topic: 'Array & Strings',
    status: 'Mastered',
    description: 'Pointer loop convergence algorithms, sliding windows, and list partitioning.',
    problems: ['15. 3Sum', '11. Container With Most Water', '26. Remove Duplicates'],
    weaknesses: ['Loop Boundaries', 'Duplicate subsets'],
  },
  '2': {
    id: '2',
    title: 'Binary Search',
    topic: 'Searching',
    status: 'Warning (Early Termination)',
    description: 'Logarithmic search space pruning, boundary checks, and mid calculations.',
    problems: ['33. Search in Rotated Sorted Array', '704. Binary Search', '153. Find Min in Rotated Array'],
    weaknesses: ['Overflow in mid calculation', 'Index bounds convergence'],
  },
  '3': {
    id: '3',
    title: 'Prefix Sums',
    topic: 'Precomputation',
    status: 'Critical (Index Out of Bounds)',
    description: 'Incremental prefix accumulators for linear query operations.',
    problems: ['560. Subarray Sum Equals K', '238. Product of Array Except Self'],
    weaknesses: ['Off-by-One array lookup bounds', 'Negative modulo math'],
  },
  '4': {
    id: '4',
    title: 'HashMap Lookup',
    topic: 'Data Structures',
    status: 'Mastered',
    description: 'O(1) value mapping, frequency counts, and memoized lookup tables.',
    problems: ['1. Two Sum', '49. Group Anagrams', '3. Longest Substring Without Repeating'],
    weaknesses: ['Key presence check omission'],
  },
  '5': {
    id: '5',
    title: 'Sliding Window',
    topic: 'Array & Strings',
    status: 'Warning (Index Range)',
    description: 'Contiguous element window resizing and bounds check optimizations.',
    problems: ['76. Minimum Window Substring', '438. Find All Anagrams'],
    weaknesses: ['Off-by-one window expansion'],
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PipelineGraph() {
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);

  const initialNodes: Node[] = useMemo(() => [
    {
      id: '1',
      type: 'knowledge',
      position: { x: 50, y: 100 },
      data: { label: 'Two Pointers', topic: 'Arrays', level: 4, status: 'mastered' },
    },
    {
      id: '2',
      type: 'knowledge',
      position: { x: 320, y: 30 },
      data: { label: 'Binary Search', topic: 'Algorithms', level: 2, status: 'warning' },
    },
    {
      id: '3',
      type: 'knowledge',
      position: { x: 320, y: 220 },
      data: { label: 'Prefix Sums', topic: 'Arrays', level: 1, status: 'critical' },
    },
    {
      id: '4',
      type: 'knowledge',
      position: { x: 590, y: 100 },
      data: { label: 'HashMap Lookup', topic: 'Hashing', level: 5, status: 'mastered' },
    },
    {
      id: '5',
      type: 'knowledge',
      position: { x: 590, y: 240 },
      data: { label: 'Sliding Window', topic: 'Arrays', level: 3, status: 'warning' },
    },
  ], []);

  const initialEdges: Edge[] = useMemo(() => [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      animated: true,
      style: { stroke: 'rgba(255, 95, 82, 0.4)' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255, 95, 82, 0.4)' },
    },
    {
      id: 'e1-3',
      source: '1',
      target: '3',
      style: { stroke: 'rgba(63, 63, 70, 0.5)' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(63, 63, 70, 0.5)' },
    },
    {
      id: 'e2-4',
      source: '2',
      target: '4',
      style: { stroke: 'rgba(63, 63, 70, 0.5)' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(63, 63, 70, 0.5)' },
    },
    {
      id: 'e3-5',
      source: '3',
      target: '5',
      animated: true,
      style: { stroke: 'rgba(239, 68, 68, 0.4)' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(239, 68, 68, 0.4)' },
    },
    {
      id: 'e4-5',
      source: '4',
      target: '5',
      style: { stroke: 'rgba(63, 63, 70, 0.5)' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(63, 63, 70, 0.5)' },
    },
  ], []);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const detail = INSPECTOR_DETAILS[node.id];
    if (detail) {
      setSelectedNode(detail);
    }
  }, []);

  return (
    <div className="w-full h-full min-h-[420px] md:min-h-[550px] bg-background border border-white/5 rounded-2xl overflow-hidden relative flex flex-col md:flex-row">
      
      {/* ReactFlow Canvas */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          zoomOnScroll={false}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          panOnScroll={false}
          panOnDrag={true}
          className="react-flow-custom select-none"
        >
          <Background gap={16} size={1} color="#27272a" />
          <Controls showInteractive={false} position="bottom-left" className="!bg-surface !border !border-border" />
        </ReactFlow>

        {/* Legend Overlay */}
        <div className="absolute top-4 left-4 bg-surface/85 backdrop-blur-sm border border-border/40 p-2.5 rounded-lg pointer-events-none text-[10px] space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Mastered Concepts</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>Active Weaknesses</span>
          </div>
        </div>
      </div>

      {/* Inspector Panel */}
      {selectedNode ? (
        <div className="w-full md:w-[320px] border-t md:border-t-0 md:border-l border-white/5 bg-[#141414] p-5 flex flex-col justify-between z-10 animate-fade-in">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-primary">{selectedNode.topic}</span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedNode.title}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="w-8 h-8 rounded-lg border border-border/30 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                style={{ minHeight: 'unset', minWidth: 'unset' }}
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              {selectedNode.description}
            </p>

            {/* Core Weaknesses */}
            <div className="mb-6">
              <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 block mb-2">Identified Weaknesses</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedNode.weaknesses.map((w) => (
                  <span key={w} className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-mono">
                    {w}
                  </span>
                ))}
              </div>
            </div>

            {/* Practice Problems */}
            <div>
              <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 block mb-2">Active Recommendations</span>
              <ul className="space-y-1.5">
                {selectedNode.problems.map((p) => (
                  <li key={p} className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-zinc-600" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5 text-[10px] text-zinc-500">
            Click another node to explore concepts.
          </div>
        </div>
      ) : (
        <div className="w-full md:w-[320px] border-t md:border-t-0 md:border-l border-white/5 bg-[#141414] p-5 flex flex-col justify-center items-center text-center z-10 select-none">
          <Award size={28} className="text-zinc-600 mb-3" />
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Knowledge Inspector</h4>
          <p className="text-[10px] text-zinc-600 max-w-[200px] leading-relaxed">
            Click any concept node in the network to inspect weaknesses, levels, and learning tasks.
          </p>
        </div>
      )}

    </div>
  );
}
