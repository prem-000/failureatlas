'use client';

/**
 * src/components/diagnosis/panels/DynamicGraphPanel.tsx
 *
 * Interactive, type-adaptive structured diagram renderer for DSA algorithms,
 * concept dependency maps, execution flowcharts, and decision trees.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { StructuredDiagram, DiagramNode, DiagramEdge } from '@/types/diagnosis-graph';
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
} from 'lucide-react';

export interface DynamicGraphPanelProps {
  diagram: StructuredDiagram;
  onSelectEvidence?: (evidenceId: string) => void;
}

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  start_end: {
    bg: '#064e3b',
    border: '#059669',
    text: '#a7f3d0',
    label: 'Control Boundary',
  },
  process: {
    bg: '#1e293b',
    border: '#38bdf8',
    text: '#e0f2fe',
    label: 'Processing Step',
  },
  decision: {
    bg: '#451a03',
    border: '#f59e0b',
    text: '#fef3c7',
    label: 'Invariant Decision',
  },
  concept: {
    bg: '#3b0764',
    border: '#a855f7',
    text: '#f3e8ff',
    label: 'DSA Concept',
  },
  algorithm: {
    bg: '#0c4a6e',
    border: '#0284c7',
    text: '#e0f2fe',
    label: 'Core Algorithm',
  },
  datastructure: {
    bg: '#1e1b4b',
    border: '#6366f1',
    text: '#e0e7ff',
    label: 'Data Structure',
  },
  state_active: {
    bg: '#0f172a',
    border: '#38bdf8',
    text: '#7dd3fc',
    label: 'Active Pointer / State',
  },
  state_visited: {
    bg: '#2e1065',
    border: '#c084fc',
    text: '#f5d0fe',
    label: 'Visited Queue State',
  },
  state_completed: {
    bg: '#064e3b',
    border: '#10b981',
    text: '#d1fae5',
    label: 'Completed Subproblem',
  },
};

export const DynamicGraphPanel: React.FC<DynamicGraphPanelProps> = ({
  diagram,
  onSelectEvidence,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(diagram.nodes[0]?.id || '');
  const [viewMode, setViewMode] = useState<'interactive' | 'mermaid'>('interactive');
  const [mermaidSvg, setMermaidSvg] = useState<string>('');
  const [mermaidLoading, setMermaidLoading] = useState(false);

  const selectedNode = useMemo(
    () => diagram.nodes.find((n) => n.id === selectedNodeId) || diagram.nodes[0],
    [diagram.nodes, selectedNodeId]
  );

  // Render Mermaid code if user toggles to Mermaid tab
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
    <div className="bg-[#141416] border border-[#27272a] rounded-xl overflow-hidden flex flex-col shadow-lg">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="p-3.5 bg-[#18181c] border-b border-[#222226] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <GitFork className="w-4 h-4 text-[#ff5f52]" />
          <div>
            <h4 className="text-xs font-bold text-[#f4f4f5] leading-tight">{diagram.title}</h4>
            <span className="text-[10px] text-[#71717a]">{diagram.description}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#27272a] text-[#38bdf8] border border-[#38bdf8]/30 uppercase font-semibold">
            {diagram.diagramType.replace('_', ' ')}
          </span>
          <div className="flex bg-[#121214] p-0.5 rounded-lg border border-[#27272a]">
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                viewMode === 'interactive'
                  ? 'bg-[#27272a] text-[#f4f4f5]'
                  : 'text-[#71717a] hover:text-[#d4d4d8]'
              }`}
            >
              Interactive
            </button>
            <button
              onClick={() => setViewMode('mermaid')}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded flex items-center gap-1 ${
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

      {/* ── Main Interactive Canvas & Grid ───────────────────────────────────── */}
      {viewMode === 'interactive' && (
        <div className="p-4 flex flex-col gap-4">
          {/* Nodes Sequence Grid / Flow Layout */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] uppercase font-bold text-[#71717a] tracking-wider">
              Execution Path & Invariant Steps (Click to Inspect)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto p-1">
              {diagram.nodes.map((node, idx) => {
                const style = TYPE_STYLES[node.type] || TYPE_STYLES.process;
                const isSelected = selectedNode?.id === node.id;

                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'ring-2 ring-[#ff5f52] shadow-[0_0_12px_rgba(255,95,82,0.25)]'
                        : 'hover:border-[#52525b]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? '#1c1c22' : '#16161a',
                      borderColor: isSelected ? '#ff5f52' : style.border + '66',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                        style={{ color: style.text, backgroundColor: style.bg }}
                      >
                        {style.label}
                      </span>
                      {node.complexity && (
                        <span className="text-[10px] font-mono text-[#a1a1aa]">
                          {node.complexity}
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-xs text-[#f4f4f5] leading-snug">
                      {node.label}
                    </div>

                    <p className="text-[11px] text-[#a1a1aa] line-clamp-1 m-0">
                      {node.explanation}
                    </p>

                    {node.isHighlighted && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#ff5f52] shadow-[0_0_6px_#ff5f52]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connected Edges & Transition Rules */}
          {diagram.edges.length > 0 && (
            <div className="p-3 bg-[#111113] rounded-lg border border-[#222226] flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-[#71717a] tracking-wider">
                State Transitions & Branch Conditions ({diagram.edges.length})
              </span>
              <div className="flex flex-wrap gap-2 max-h-[85px] overflow-y-auto">
                {diagram.edges.map((edge) => (
                  <div
                    key={edge.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#18181c] border border-[#27272a] rounded text-[11px] text-[#d4d4d8]"
                  >
                    <span className="font-mono text-[#38bdf8]">{edge.source}</span>
                    <ArrowRight className="w-3 h-3 text-[#71717a]" />
                    <span className="font-mono text-[#a855f7]">{edge.target}</span>
                    {edge.label && (
                      <span className="ml-1 text-[10px] text-[#eab308] font-semibold bg-[#eab308]/10 px-1 rounded">
                        [{edge.label}]
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Node Inspector Drawer / Card */}
          {selectedNode && (
            <div className="p-4 bg-[#18181d] border border-[#2e2e38] rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-[#ff5f52]" />
                  <span className="text-xs font-bold text-[#f4f4f5]">
                    Selected Node: {selectedNode.label}
                  </span>
                </div>
                {selectedNode.complexity && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0f172a] text-[#38bdf8] border border-[#1e293b]">
                    {selectedNode.complexity}
                  </span>
                )}
              </div>

              <p className="text-xs text-[#d4d4d8] leading-relaxed m-0">
                {selectedNode.explanation}
              </p>

              {selectedNode.evidenceRefId && (
                <div className="mt-1 pt-2 border-t border-[#222228] flex items-center justify-between">
                  <span className="text-[11px] text-[#a1a1aa] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Backed by verified RAG evidence</span>
                  </span>
                  {onSelectEvidence && (
                    <button
                      onClick={() => onSelectEvidence(selectedNode.evidenceRefId!)}
                      className="text-[11px] text-[#38bdf8] font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer flex items-center gap-1"
                    >
                      <span>Inspect cited evidence</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          {diagram.legend && diagram.legend.length > 0 && (
            <div className="flex items-center gap-3 pt-1 border-t border-[#1f1f23] text-[10px] text-[#71717a]">
              <span className="font-bold uppercase tracking-wider">Legend:</span>
              <div className="flex items-center gap-3 flex-wrap">
                {diagram.legend.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mermaid View Mode ────────────────────────────────────────────────── */}
      {viewMode === 'mermaid' && (
        <div className="p-4 flex flex-col gap-3 min-h-[220px]">
          {mermaidLoading ? (
            <div className="flex items-center justify-center p-8 text-xs text-[#71717a]">
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
