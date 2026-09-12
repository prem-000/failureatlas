'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background, Controls, Node, Edge,
  useNodesState, useEdgesState, BackgroundVariant,
  NodeTypes, ReactFlowProvider, useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Sparkles, ChevronDown, ArrowRight, Loader2, Maximize2, Minimize2, Target, CheckCircle2, Check } from 'lucide-react';
import { RoadmapNode } from './RoadmapNode';
import { ProblemDrawer } from './ProblemDrawer';
import { SearchBar } from './SearchBar';
import {
  useSubmissionsList, useGraphFailures,
  type RoadmapProblem, type RoadmapEdge as APIRoadmapEdge,
} from '@/hooks/usePhase3Queries';
import { usePracticeSheet } from '@/hooks/useSheets';
import { SHEET_OPTIONS, type SheetId, type SheetLevel, type SheetProblem } from '@/types/sheets';
import { buildGraphFromSheet, type UserProblemProgress } from '@/lib/sheets/graph-builder';
import { SmartEdge } from './SmartEdge';
import { ClusterHeaderNode } from './ClusterHeaderNode';

const nodeTypes: NodeTypes = { 
  roadmapNode: RoadmapNode,
  clusterHeader: ClusterHeaderNode
};
const edgeTypes: any = { smart: SmartEdge };

const EMPTY_LEVELS: SheetLevel[] = [];

function RoadmapTabInner() {
  const reactFlow = useReactFlow();

  // Sheet selector state (persisted to localStorage)
  const [selectedSheetId, setSelectedSheetId] = useState<SheetId>('striver-sde');
  const [showSheetPicker, setShowSheetPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<RoadmapProblem | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<APIRoadmapEdge | null>(null);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);

  const sheetPickerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Manual solved problems set (persisted to localStorage)
  const [manualSolved, setManualSolved] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('praxis_manual_solved');
        if (saved) {
          setManualSolved(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Error loading manual solved', e);
      }
    }
  }, []);

  const toggleProblemSolved = useCallback((slug: string, leetcodeId: number) => {
    setManualSolved(prev => {
      const lower = slug.toLowerCase();
      const idStr = String(leetcodeId);
      const isAlready = prev.includes(lower) || prev.includes(idStr);
      let updated: string[];
      if (isAlready) {
        updated = prev.filter(s => s !== lower && s !== idStr);
      } else {
        updated = [...prev, lower, idStr];
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('praxis_manual_solved', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Close sheet picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sheetPickerRef.current && !sheetPickerRef.current.contains(event.target as HTMLElement)) {
        setShowSheetPicker(false);
      }
    }
    if (showSheetPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSheetPicker]);

  // Auto-scroll active tab into view when level changes
  useEffect(() => {
    const el = tabRefs.current[currentLevelIdx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentLevelIdx]);

  // Initialize from localStorage on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('praxis_active_sheet_id') as SheetId | null;
      if (saved && SHEET_OPTIONS.some(o => o.id === saved && o.enabled)) {
        setSelectedSheetId(saved);
      }
    }
  }, []);

  const { data: sheet, isLoading: sheetLoading } = usePracticeSheet(selectedSheetId);
  const { data: rawSubmissions } = useSubmissionsList({ limit: 500 });
  const { data: failures } = useGraphFailures(50, 60);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchTranslation, setTouchTranslation] = useState<number>(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return;
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentY = e.targetTouches[0].clientY;
    const diff = currentY - touchStart;
    if (diff > 0) {
      setTouchTranslation(diff);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    if (touchTranslation > 100) {
      setSelectedEdge(null);
    }
    setTouchTranslation(0);
  };

  // Compute userProgressMap keyed by slug AND leetcodeId
  const userProgressMap = useMemo(() => {
    const map = new Map<string, UserProblemProgress>();

    // 1. From LeetCode / synced submissions
    if (rawSubmissions) {
      for (const sub of rawSubmissions) {
        const slug = sub.problemSlug?.toLowerCase();
        if (!slug) continue;
        const existing = map.get(slug) || { hasAccepted: false, attempts: 0, lastStatus: sub.submissionStatus };
        existing.attempts += 1;
        if (sub.submissionStatus === 'Accepted') {
          existing.hasAccepted = true;
        }
        existing.lastStatus = sub.submissionStatus;
        map.set(slug, existing);
      }
    }

    // 2. From manual solved items
    for (const item of manualSolved) {
      const existing = map.get(item) || { hasAccepted: true, attempts: 1, lastStatus: 'Accepted' };
      existing.hasAccepted = true;
      map.set(item, existing);
    }

    // 3. Map cross-references for sheet problems (by slug and leetcodeId)
    if (sheet?.levels) {
      for (const lvl of sheet.levels) {
        const allProbs = [...lvl.problems, ...(lvl.remediation || [])];
        for (const p of allProbs) {
          const slugProg = map.get(p.slug.toLowerCase()) || map.get(String(p.leetcodeId));
          if (slugProg) {
            map.set(p.slug.toLowerCase(), slugProg);
            map.set(String(p.leetcodeId), slugProg);
          }
        }
      }
    }

    return map;
  }, [rawSubmissions, manualSolved, sheet?.id, sheet?.levels]);

  const currentLevels = sheet?.levels || EMPTY_LEVELS;

  // Reset or clamp currentLevelIdx if sheet changes
  useEffect(() => {
    if (currentLevels.length > 0 && currentLevelIdx >= currentLevels.length) {
      setCurrentLevelIdx(0);
    }
  }, [currentLevels.length, currentLevelIdx]);

  // Build ReactFlow graph deterministically from current level
  useEffect(() => {
    if (!sheet || !sheet.levels || sheet.levels.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const { nodes: n, edges: e } = buildGraphFromSheet({
      sheet,
      levelIdx: currentLevelIdx,
      userProgressMap,
      searchQuery,
      isMobile,
    });
    setNodes(n);
    setEdges(e);
  }, [sheet, sheet?.id, currentLevelIdx, userProgressMap, searchQuery, isMobile, setNodes, setEdges]);

  // Auto-fit view when search changes
  useEffect(() => {
    if (!reactFlow || !searchQuery) return;
    const target = nodes.find(n => n.data?.isHighlighted);
    if (target) {
      setTimeout(() => reactFlow.fitView({ nodes: [target], duration: 400, padding: 0.3 }), 50);
    }
  }, [searchQuery, reactFlow, nodes]);

  // Auto-fit view when level or sheet changes
  useEffect(() => {
    if (!reactFlow || nodes.length === 0) return;
    const timer = setTimeout(() => {
      reactFlow.fitView({ duration: 400, padding: 0.25 });
    }, 100);
    return () => clearTimeout(timer);
  }, [currentLevelIdx, selectedSheetId, reactFlow, nodes.length]);

  const fitGraph = () => {
    reactFlow.fitView({ duration: 400, padding: 0.3 });
  };

  const resetZoom = () => {
    reactFlow.zoomTo(1, { duration: 400 });
  };

  const focusSearchResult = () => {
    const targetNode = nodes.find(n => n.data?.isHighlighted);
    if (targetNode) {
      reactFlow.setCenter(targetNode.position.x, targetNode.position.y, { zoom: 1.2, duration: 400 });
    }
  };

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

  const currentLevelData = currentLevels[currentLevelIdx];
  const currentLevelProblems = currentLevelData?.problems || [];
  const completedCount = currentLevelProblems.filter((p: SheetProblem) => {
    const prog = userProgressMap.get(p.slug.toLowerCase()) || userProgressMap.get(String(p.leetcodeId));
    return prog?.hasAccepted === true;
  }).length;
  const totalCount = currentLevelProblems.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isCurrentLevelComplete = totalCount > 0 && completedCount === totalCount;
  const hasNextLevel = currentLevelIdx < currentLevels.length - 1;

  const isSelectedProblemSolved = useMemo(() => {
    if (!selectedProblem) return false;
    const prog = userProgressMap.get(selectedProblem.slug?.toLowerCase()) || userProgressMap.get(String(selectedProblem.leetcodeId));
    return prog?.hasAccepted === true || selectedProblem.nodeState === 'solved';
  }, [selectedProblem, userProgressMap]);

  const activeSheetOption = SHEET_OPTIONS.find(o => o.id === selectedSheetId);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        .roadmap-toolbar {
          position: relative;
          z-index: 40;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
          background: rgba(13,13,15,0.92);
          backdrop-filter: blur(16px);
        }

        /* Desktop single-row layout */
        @media (min-width: 1024px) {
          .roadmap-toolbar {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 20px;
          }
          .toolbar-row-top {
            width: auto !important;
            flex-shrink: 0;
          }
          .toolbar-row-middle {
            flex: 1;
            min-width: 0;
            width: auto !important;
          }
          .toolbar-row-bottom {
            display: none !important;
          }
          .desktop-search-wrap {
            display: block !important;
          }
        }

        .desktop-search-wrap {
          display: none;
        }

        .toolbar-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
        }

        .toolbar-row-middle {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          min-width: 0;
        }

        .toolbar-row-bottom {
          display: flex;
          align-items: center;
          width: 100%;
        }

        .level-scroll-row {
          display: flex;
          gap: 5px;
          overflow-x: auto;
          flex: 1;
          min-width: 0;
          padding: 2px 0;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .level-scroll-row::-webkit-scrollbar {
          display: none;
        }

        .topic-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #f4f4f5;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 150ms ease;
          max-width: 220px;
        }
        .topic-btn:hover {
          border-color: rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
        }

        .topic-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          background: rgba(18,18,22,0.98);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 6px;
          z-index: 1000;
          min-width: 260px;
          max-width: calc(100vw - 32px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.8);
          backdrop-filter: blur(20px);
        }

        .topic-option {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          text-align: left;
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #a1a1aa;
          cursor: pointer;
          transition: all 120ms;
        }
        .topic-option:hover:not(:disabled), .topic-option.selected {
          background: rgba(255,95,82,0.1);
          color: #ff5f52;
        }

        .generate-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #ff5f52, #d32f2f);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: all 150ms ease;
          box-shadow: 0 4px 14px rgba(255,95,82,0.35);
          flex-shrink: 0;
        }
        .generate-btn.complete {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 4px 16px rgba(34,197,94,0.4);
          animation: pulse-next-btn 2s infinite ease-in-out;
        }
        @keyframes pulse-next-btn {
          0%, 100% { box-shadow: 0 4px 14px rgba(34,197,94,0.35); }
          50% { box-shadow: 0 4px 22px rgba(34,197,94,0.7); }
        }
        .generate-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .generate-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          background: rgba(255,255,255,0.06);
          color: #71717a;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .level-tab {
          padding: 5px 12px;
          border-radius: 8px;
          border: none;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 150ms ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .level-tab.active {
          background: rgba(255,95,82,0.18);
          color: #ff5f52;
          border: 1px solid rgba(255,95,82,0.35);
          box-shadow: 0 0 10px rgba(255,95,82,0.2);
        }
        .level-tab.inactive {
          background: rgba(255,255,255,0.04);
          color: #71717a;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .level-tab.inactive:hover {
          color: #e4e4e7;
          background: rgba(255,255,255,0.08);
        }

        .progress-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
      `}</style>

      {/* Toolbar */}
      <div className="roadmap-toolbar">
        {/* Row 1: Sheet Selector & Next Level button */}
        <div className="toolbar-row-top">
          {/* Sheet selector */}
          <div ref={sheetPickerRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <button
              className="topic-btn"
              onClick={() => setShowSheetPicker(v => !v)}
              title={activeSheetOption?.label || "Striver's SDE Sheet"}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeSheetOption?.label || "Striver's SDE Sheet"}
              </span>
              <ChevronDown
                size={13}
                style={{
                  transform: showSheetPicker ? 'rotate(180deg)' : 'none',
                  transition: 'transform 200ms',
                  flexShrink: 0
                }}
              />
            </button>

            {showSheetPicker && (
              <div className="topic-dropdown">
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 6px 8px' }}>
                  Select Sheet
                </div>
                {SHEET_OPTIONS.map((opt) => {
                  const isSelected = opt.id === selectedSheetId;
                  return (
                    <button
                      key={opt.id}
                      disabled={!opt.enabled}
                      className={`topic-option${isSelected ? ' selected' : ''}`}
                      onClick={() => {
                        if (!opt.enabled) return;
                        setSelectedSheetId(opt.id);
                        setShowSheetPicker(false);
                        setCurrentLevelIdx(0);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('praxis_active_sheet_id', opt.id);
                        }
                      }}
                      style={{
                        opacity: opt.enabled ? 1 : 0.45,
                        cursor: opt.enabled ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px' }}>{opt.label}</span>
                        {isSelected && <span style={{ fontSize: '11px', color: '#ff5f52', fontWeight: 800 }}>✓</span>}
                        {!opt.enabled && (
                          <span style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(255,255,255,0.06)',
                            color: '#71717a',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            Coming soon
                          </span>
                        )}
                      </div>
                      {opt.id === 'striver-sde' && (
                        <span style={{ fontSize: '10px', color: '#71717a', marginTop: 2 }}>28 Days • 191 Problems</span>
                      )}
                      {opt.id === 'basic-leetcode' && (
                        <span style={{ fontSize: '10px', color: '#71717a', marginTop: 2 }}>5 Levels • 18 Problems</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop-only search bar */}
          <div className="desktop-search-wrap">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search problems..." />
          </div>

          {/* Next Level Button */}
          <button
            className={`generate-btn${isCurrentLevelComplete ? ' complete' : ''}`}
            onClick={() => {
              if (hasNextLevel && isCurrentLevelComplete) {
                setCurrentLevelIdx(i => i + 1);
              }
            }}
            disabled={!isCurrentLevelComplete || !hasNextLevel}
            title={
              !hasNextLevel
                ? 'All levels completed!'
                : isCurrentLevelComplete
                ? `Advance to Level ${currentLevelIdx + 2}`
                : `Complete all problems in Level ${currentLevelData?.levelNumber || currentLevelIdx + 1} to unlock Level ${currentLevelIdx + 2}`
            }
          >
            <span>{isCurrentLevelComplete ? `Next Level (L${currentLevelIdx + 2})` : 'Next Level'}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Row 2: Level tabs & Progress */}
        <div className="toolbar-row-middle">
          {currentLevels.length > 0 && (
            <div className="level-scroll-row">
              {currentLevels.map((l, i) => (
                <button
                  key={l.levelNumber}
                  ref={el => { tabRefs.current[i] = el; }}
                  className={`level-tab${i === currentLevelIdx ? ' active' : ' inactive'}`}
                  onClick={() => setCurrentLevelIdx(i)}
                >
                  Level {l.levelNumber}
                </button>
              ))}
            </div>
          )}

          {totalCount > 0 && (
            <div className="progress-pill">
              <div style={{ width: 42, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 2, transition: 'width 400ms ease' }} />
              </div>
              <span style={{ fontSize: '10px', color: isCurrentLevelComplete ? '#4ade80' : '#71717a', fontWeight: 700 }}>
                {completedCount}/{totalCount}
              </span>
            </div>
          )}
        </div>

        {/* Row 3: Mobile-only full width Search bar */}
        <div className="toolbar-row-bottom" style={{ display: isMobile ? 'flex' : 'none' }}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search problems in level..." style={{ width: '100%' }} />
        </div>
      </div>

      {/* Canvas or loading state */}
      {sheetLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <Loader2 size={28} style={{ color: '#ff5f52', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#71717a', fontSize: 13 }}>Loading practice sheet...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
              className="desktop-rf-controls"
              style={{ background: 'rgba(15,15,18,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}
            />
          </ReactFlow>

          {/* Custom Mobile Graph Controls */}
          <div className="mobile-graph-controls">
            <button onClick={fitGraph} className="control-btn" title="Fit Graph">
              <Maximize2 size={13} />
              {!isMobile && 'Fit View'}
            </button>
            <button onClick={resetZoom} className="control-btn" title="Reset Zoom">
              <Minimize2 size={13} />
              {!isMobile && '1:1 Zoom'}
            </button>
            {nodes.some(n => n.data?.isHighlighted) && (
              <button onClick={focusSearchResult} className="control-btn highlight" title="Focus Search Result">
                <Target size={13} />
                {!isMobile && 'Focus Result'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Problem Drawer */}
      <ProblemDrawer
        problem={selectedProblem}
        relatedFailures={failures || []}
        onClose={() => setSelectedProblem(null)}
        isSolved={isSelectedProblemSolved}
        onToggleSolved={toggleProblemSolved}
      />

      {/* Styles for mobile controls & inspector */}
      <style>{`
        .mobile-graph-controls {
          position: absolute;
          bottom: 16px;
          left: 16px;
          display: flex;
          gap: 8px;
          z-index: 50;
        }
        .control-btn {
          background: rgba(15, 15, 18, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #a1a1aa;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 150ms ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .control-btn:hover {
          color: #f4f4f5;
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .control-btn.highlight {
          border-color: rgba(168, 85, 247, 0.4);
          color: #d8b4fe;
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.2);
        }
        .control-btn.highlight:hover {
          background: rgba(168, 85, 247, 0.15);
          border-color: rgba(168, 85, 247, 0.6);
        }
        .connection-drawer {
          position: absolute; right: 0; top: 0; bottom: 0; width: 380px;
          background: rgba(15,15,18,0.95); border-left: 1px solid rgba(255,255,255,0.08);
          box-shadow: -8px 0 32px rgba(0,0,0,0.5); backdrop-filter: blur(16px);
          display: flex; flex-direction: column; z-index: 100;
          transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .mobile-drag-pill {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.25);
          margin: 8px auto 0 auto;
          display: none;
        }
        @media (max-width: 767px) {
          .mobile-graph-controls {
            bottom: 96px !important;
            left: 16px !important;
            right: 80px !important;
            justify-content: flex-start;
          }
          .control-btn {
            background: rgba(15, 15, 18, 0.95);
            padding: 9px 12px;
          }
          .connection-drawer {
            left: 0 !important;
            right: 0 !important;
            top: auto !important;
            bottom: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 70vh !important;
            max-height: 70vh !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 20px 20px 0 0 !important;
            transform: translateY(0) !important;
          }
          .mobile-drag-pill {
            display: block !important;
          }
        }
      `}</style>

      {/* Connection Inspector Drawer */}
      {selectedEdge && (
        <div
          className="connection-drawer"
          style={{
            transform: touchTranslation > 0 ? `translateY(${touchTranslation}px)` : undefined,
            transition: touchStart !== null ? 'none' : 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Mobile Drag Header */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ cursor: 'grab', flexShrink: 0 }}
          >
            <div className="mobile-drag-pill" />
          </div>
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
                <p style={{ fontSize: 14, color: '#e4e4e7', margin: 0, lineHeight: 1.6 }}>{selectedEdge.reason || 'Curated progression between problems.'}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Type</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa', textTransform: 'capitalize' }}>{(selectedEdge.type || 'normal').replace('_', ' ')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Confidence</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2dd4bf' }}>{Math.round((selectedEdge.confidence || 0.95) * 100)}%</div>
              </div>
            </div>
            <div style={{ marginTop: 24, fontSize: 11, color: '#52525b', display: 'flex', justifyContent: 'space-between' }}>
              <span>Curated by: {sheet?.name || "Striver's SDE Sheet"}</span>
              <span>{sheet?.source || 'takeuforward.org'}</span>
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
