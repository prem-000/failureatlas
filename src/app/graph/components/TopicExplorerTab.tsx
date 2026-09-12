'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ROOT_NODE,
  MAIN_TOPICS,
  SUBTOPICS,
  getTopicById,
  getSubtopicsForTopic,
  filterMainTopics,
  type TopicNode,
  type PracticeProblem,
} from '@/lib/dsa-roadmap/topic-data';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  BookOpen,
  Layers,
  GitCommit,
  Layers2,
  Binary,
  Zap,
  Undo2,
  Network,
  Cpu,
  BarChart2,
  FolderTree,
  X,
  Compass,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

const TOPIC_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  arrays: Layers,
  'binary-search': Search,
  strings: BookOpen,
  'linked-list': GitCommit,
  'stack-queue': Layers2,
  trees: FolderTree,
  'heap-priority-queue': BarChart2,
  greedy: Zap,
  backtracking: Undo2,
  graphs: Network,
  'dynamic-programming': Cpu,
  'bit-manipulation': Binary,
};

const DIFFICULTY_CONFIG = {
  Easy: { bg: 'rgba(34, 197, 94, 0.12)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.25)' },
  Medium: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)' },
  Hard: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.25)' },
};

const TIER_COLORS = {
  basic: { text: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.2)' },
  intermediate: { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.2)' },
  advanced: { text: '#c084fc', bg: 'rgba(192, 132, 252, 0.1)', border: 'rgba(192, 132, 252, 0.2)' },
};

export function TopicExplorerTab() {
  // Search query & Tier filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<'all' | 'basic' | 'intermediate' | 'advanced'>('all');

  // Currently expanded Level 1 main topic (Accordion: max 1 open at once)
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  // Currently selected node for practice problems (Level 0, 1, or 2)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Mobile bottom sheet / drawer visibility
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const selectedNode = useMemo(() => {
    return selectedNodeId ? getTopicById(selectedNodeId) : null;
  }, [selectedNodeId]);

  // Filtered Level 1 topics
  const visibleMainTopics = useMemo(() => {
    return filterMainTopics(searchQuery, selectedTier);
  }, [searchQuery, selectedTier]);

  // Subtopics for the currently expanded topic
  const currentSubtopics = useMemo(() => {
    return expandedTopicId ? getSubtopicsForTopic(expandedTopicId) : [];
  }, [expandedTopicId]);

  // Handler for clicking a main topic:
  // - Sets sidebar / drawer to that topic's 5 problems
  // - Toggles accordion expansion
  const handleMainTopicClick = (topicId: string) => {
    setSelectedNodeId(topicId);
    setMobileDrawerOpen(true);
    if (expandedTopicId === topicId) {
      setExpandedTopicId(null);
    } else {
      setExpandedTopicId(topicId);
    }
  };

  // Handler for clicking a subtopic:
  // - Sets sidebar / drawer to that subtopic's 5 problems
  // - Keeps parent accordion open
  const handleSubtopicClick = (subtopicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(subtopicId);
    setMobileDrawerOpen(true);
  };

  // Reusable Problem List Renderer (used in Desktop Sidebar and Mobile Bottom Sheet)
  const renderProblemsContent = (isMobile = false) => {
    if (!selectedNode) {
      return (
        <div style={{
          padding: isMobile ? '24px 16px' : '36px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 16,
          marginTop: isMobile ? 0 : 'auto',
          marginBottom: isMobile ? 0 : 'auto',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
          }}>
            <Compass size={22} />
          </div>

          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f4f4f5', margin: '0 0 6px 0' }}>
              Select a Topic
            </h3>
            <p style={{ fontSize: 12, color: '#71717a', margin: 0, lineHeight: 1.5 }}>
              Click any main topic or subtopic on the roadmap to immediately view 5 targeted practice problems.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedNodeId('dsa-roadmap');
              if (isMobile) setMobileDrawerOpen(true);
            }}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 8,
              padding: '8px 14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sparkles size={12} /> Explore Overall Starter Set
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: isMobile ? '16px 18px 28px 18px' : '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Header: Selected Node Info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 4,
              background: selectedNode.level === 0 ? 'rgba(16, 185, 129, 0.15)' : selectedNode.level === 1 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
              color: selectedNode.level === 0 ? '#34d399' : selectedNode.level === 1 ? '#38bdf8' : '#c084fc',
              border: `1px solid ${selectedNode.level === 0 ? 'rgba(16, 185, 129, 0.3)' : selectedNode.level === 1 ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
            }}>
              {selectedNode.level === 0 ? 'Curriculum Root' : selectedNode.level === 1 ? 'Main Topic' : 'Pattern / Subtopic'}
            </span>

            <button
              onClick={() => {
                if (isMobile) {
                  setMobileDrawerOpen(false);
                } else {
                  setSelectedNodeId(null);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#71717a',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              title={isMobile ? 'Close drawer' : 'Clear selection'}
            >
              <X size={15} />
            </button>
          </div>

          <h2 style={{ fontSize: isMobile ? 17 : 18, fontWeight: 700, color: '#f4f4f5', margin: '0 0 6px 0', lineHeight: 1.3 }}>
            {selectedNode.name}
          </h2>

          {selectedNode.summary && (
            <p style={{ fontSize: 12, color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
              {selectedNode.summary}
            </p>
          )}
        </div>

        {/* Suggested Practice Problems Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#71717a', textTransform: 'uppercase' }}>
              Suggested Practice ({selectedNode.problems.length})
            </span>
            <span style={{ fontSize: 10, color: '#52525b', fontFamily: 'monospace' }}>
              Easy → Hard
            </span>
          </div>

          {/* 5 Problem Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {selectedNode.problems.map((prob, idx) => {
              const diff = DIFFICULTY_CONFIG[prob.difficulty] || DIFFICULTY_CONFIG.Medium;
              return (
                <div
                  key={prob.slug || prob.title}
                  className="problem-card"
                  style={{
                    background: '#111116',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#52525b',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                      }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', lineHeight: 1.4 }}>
                        {prob.title}
                      </span>
                    </div>

                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: diff.bg,
                      color: diff.text,
                      border: `1px solid ${diff.border}`,
                      flexShrink: 0,
                    }}>
                      {prob.difficulty}
                    </span>
                  </div>

                  {/* Shared With cross-pattern badges */}
                  {prob.sharedWith && prob.sharedWith.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, color: '#52525b', fontWeight: 600 }}>CROSS-PATTERN:</span>
                      {prob.sharedWith.map(sw => {
                        const related = getTopicById(sw);
                        return (
                          <span
                            key={sw}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNodeId(sw);
                            }}
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: 'rgba(168, 85, 247, 0.1)',
                              color: '#c084fc',
                              border: '1px solid rgba(168, 85, 247, 0.2)',
                              cursor: 'pointer',
                            }}
                            title={`Jump to ${related?.name || sw}`}
                          >
                            {related?.name || sw}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Links */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 2, alignItems: 'center' }}>
                    {prob.slug && (
                      <Link
                        href={`/problems/${prob.slug}`}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#10b981',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        Solve in FailureAtlas <ArrowUpRight size={11} />
                      </Link>
                    )}
                    {prob.url && (
                      <a
                        href={prob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11,
                          color: '#71717a',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          marginLeft: 'auto',
                        }}
                      >
                        LeetCode <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      height: '100%',
      background: '#0a0a0c',
      color: '#e4e4e7',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        /* ─── Desktop Layout ─── */
        .explorer-sidebar {
          width: 380px;
          flex-shrink: 0;
          background: #0e0e12;
          border-right: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          transition: width 0.2s ease;
        }

        .main-canvas {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          background: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.03) 0%, transparent 60%), #0a0a0c;
        }

        .top-control-bar {
          padding: 16px 28px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: rgba(10, 10, 12, 0.85);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .dag-visual-container {
          padding: 36px 32px 64px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }

        .topic-pill-container {
          width: 100%;
          max-width: 1100px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          padding: 4px 0;
        }

        .topic-pill {
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .topic-pill:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.18) !important;
        }

        .subtopic-card {
          transition: all 0.16s ease;
        }
        .subtopic-card:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }

        .problem-card {
          transition: all 0.16s ease;
        }
        .problem-card:hover {
          background: #15151c !important;
          border-color: rgba(255, 255, 255, 0.14) !important;
          transform: translateX(2px);
        }

        .tier-btn {
          transition: all 0.15s ease;
        }
        .tier-btn:hover {
          color: #f4f4f5;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.22s ease-out forwards;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* ─── Mobile Drawer & Floating Trigger ─── */
        .mobile-drawer-backdrop {
          display: none;
        }
        .mobile-drawer-sheet {
          display: none;
        }
        .mobile-floating-pill {
          display: none;
        }

        /* ─── Responsive Media Queries (Mobile & Small Screens < 900px) ─── */
        @media (max-width: 899px) {
          /* Hide fixed side-by-side sidebar so canvas takes 100% width without merging */
          .explorer-sidebar {
            display: none !important;
          }

          .main-canvas {
            width: 100% !important;
            flex: 1 1 100% !important;
          }

          .top-control-bar {
            padding: 12px 14px !important;
            gap: 12px !important;
          }

          .search-input-wrapper {
            max-width: 100% !important;
            width: 100% !important;
          }

          .tier-switcher-wrapper {
            width: 100% !important;
            overflow-x: auto !important;
            padding-bottom: 2px !important;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .tier-switcher-wrapper::-webkit-scrollbar {
            display: none;
          }

          .topic-counter-text {
            width: 100% !important;
            text-align: right !important;
          }

          .dag-visual-container {
            padding: 18px 12px 88px 12px !important;
          }

          .topic-pill-container {
            gap: 8px !important;
          }

          .topic-pill {
            flex: 1 1 100% !important;
            max-width: 100% !important;
            padding: 10px 12px !important;
          }

          .subtopic-accordion-box {
            padding: 14px 12px !important;
            border-radius: 12px !important;
          }

          .subtopic-pill-row {
            gap: 6px !important;
          }

          .subtopic-card {
            flex: 1 1 100% !important;
            justify-content: space-between !important;
            padding: 8px 12px !important;
          }

          /* Mobile Bottom Sheet Drawer */
          .mobile-drawer-backdrop {
            display: block !important;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            z-index: 10000;
          }

          .mobile-drawer-sheet {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            max-height: 82vh;
            background: #0e0e13;
            border-top: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 20px 20px 0 0;
            z-index: 10001;
            flex-direction: column;
            box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.85);
            overflow: hidden;
          }

          /* Mobile Floating Pill Trigger */
          .mobile-floating-pill {
            display: flex !important;
            position: fixed;
            bottom: calc(76px + env(safe-area-inset-bottom, 0px) + 12px);
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            white-space: nowrap;
          }
        }
      `}</style>

      {/* ─── DESKTOP SIDEBAR: Practice Problems ─── */}
      <aside className="explorer-sidebar custom-scrollbar">
        {renderProblemsContent(false)}
      </aside>

      {/* ─── MAIN CANVAS: Horizontal Flow DAG ─── */}
      <main className="main-canvas custom-scrollbar">
        {/* Top Control Bar: Search & Tier Filter */}
        <div className="top-control-bar">
          {/* Live Search Input */}
          <div className="search-input-wrapper" style={{
            position: 'relative',
            width: '100%',
            maxWidth: 320,
          }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#71717a' }}
            />
            <input
              type="text"
              placeholder="Search main topics (e.g. Binary Search, Stack)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#141419',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: 8,
                padding: '8px 12px 8px 34px',
                fontSize: 12,
                color: '#f4f4f5',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Tier Switcher Buttons */}
          <div className="tier-switcher-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#52525b', fontWeight: 600, marginRight: 4, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Filter size={11} /> TIER:
            </span>
            {(['all', 'basic', 'intermediate', 'advanced'] as const).map(tier => {
              const isActive = selectedTier === tier;
              return (
                <button
                  key={tier}
                  className="tier-btn"
                  onClick={() => setSelectedTier(tier)}
                  style={{
                    background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.16)' : 'transparent'}`,
                    color: isActive ? '#f4f4f5' : '#71717a',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {tier}
                </button>
              );
            })}
          </div>

          {/* Topic Count Indicator */}
          <div className="topic-counter-text" style={{ fontSize: 11, color: '#71717a', fontFamily: 'monospace' }}>
            {visibleMainTopics.length} of {MAIN_TOPICS.length} Topics Shown
          </div>
        </div>

        {/* ─── DAG Visual Container ─── */}
        <div className="dag-visual-container">
          
          {/* ── Level 0: Root Node ("DSA Roadmap") ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={() => {
                setSelectedNodeId('dsa-roadmap');
                setMobileDrawerOpen(true);
              }}
              className="topic-pill"
              style={{
                background: selectedNodeId === 'dsa-roadmap' ? '#064e3b' : '#121217',
                border: `1.5px solid ${selectedNodeId === 'dsa-roadmap' ? '#10b981' : 'rgba(16, 185, 129, 0.35)'}`,
                boxShadow: selectedNodeId === 'dsa-roadmap' ? '0 0 20px rgba(16, 185, 129, 0.25)' : 'none',
                borderRadius: 24,
                padding: '10px 22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                color: '#f4f4f5',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }} />
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.02em' }}>
                DSA Roadmap
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.15)',
                padding: '2px 7px',
                borderRadius: 12,
              }}>
                12 Domains
              </span>
            </button>

            {/* Vertical Connector Stem */}
            <div style={{
              width: 2,
              height: 32,
              background: 'linear-gradient(to bottom, rgba(16, 185, 129, 0.4), rgba(255, 255, 255, 0.15))',
            }} />
          </div>

          {/* ── Level 1: Main Topics Row (Wrapped Horizontal Row) ── */}
          <div className="topic-pill-container">
            {visibleMainTopics.map(topic => {
              const IconComponent = TOPIC_ICONS[topic.id] || BookOpen;
              const isSelected = selectedNodeId === topic.id;
              const isExpanded = expandedTopicId === topic.id;
              const subCount = getSubtopicsForTopic(topic.id).length;
              const tierInfo = TIER_COLORS[topic.tier || 'basic'];

              return (
                <button
                  key={topic.id}
                  onClick={() => handleMainTopicClick(topic.id)}
                  className="topic-pill"
                  style={{
                    background: isSelected ? '#1c1c24' : isExpanded ? '#17171f' : '#121217',
                    border: `1.5px solid ${isSelected ? '#38bdf8' : isExpanded ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                    boxShadow: isSelected ? '0 0 16px rgba(56, 189, 248, 0.2)' : 'none',
                    borderRadius: 14,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    color: '#f4f4f5',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? '#38bdf8' : '#a1a1aa',
                    flexShrink: 0,
                  }}>
                    <IconComponent size={15} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {topic.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: '#71717a' }}>
                        {subCount} patterns
                      </span>
                      {topic.tier && (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: tierInfo.text,
                          background: tierInfo.bg,
                          padding: '0 4px',
                          borderRadius: 3,
                        }}>
                          {topic.tier[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    color: isExpanded ? '#38bdf8' : '#52525b',
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: 'auto',
                    flexShrink: 0,
                  }}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Level 2: Subtopics Accordion Panel ── */}
          {expandedTopicId && (
            <div
              className="animate-fade-in"
              style={{
                width: '100%',
                maxWidth: 1050,
                marginTop: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Connector from Level 1 to Level 2 */}
              <div style={{
                width: 2,
                height: 20,
                background: 'linear-gradient(to bottom, rgba(56, 189, 248, 0.5), rgba(168, 85, 247, 0.5))',
              }} />

              {/* Subtopics Container Box */}
              <div className="subtopic-accordion-box" style={{
                width: '100%',
                background: '#0e0e14',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: 16,
                padding: '20px 24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#c084fc',
                    }}>
                      Subtopics & Patterns
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5' }}>
                      {getTopicById(expandedTopicId)?.name}
                    </span>
                  </div>

                  <span style={{ fontSize: 11, color: '#71717a' }}>
                    Click any pattern to view 5 practice problems
                  </span>
                </div>

                {/* Subtopic Pill Row */}
                <div className="subtopic-pill-row" style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                }}>
                  {currentSubtopics.map(sub => {
                    const isSelected = selectedNodeId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={(e) => handleSubtopicClick(sub.id, e)}
                        className="subtopic-card"
                        style={{
                          background: isSelected ? 'rgba(168, 85, 247, 0.15)' : '#14141b',
                          border: `1.5px solid ${isSelected ? '#a855f7' : 'rgba(255, 255, 255, 0.08)'}`,
                          boxShadow: isSelected ? '0 0 12px rgba(168, 85, 247, 0.3)' : 'none',
                          borderRadius: 10,
                          padding: '9px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          cursor: 'pointer',
                          color: isSelected ? '#f4f4f5' : '#d4d4d8',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isSelected ? '#c084fc' : '#52525b',
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>
                          {sub.name}
                        </span>
                        <span style={{
                          fontSize: 10,
                          color: '#71717a',
                          background: 'rgba(255, 255, 255, 0.04)',
                          padding: '1px 5px',
                          borderRadius: 4,
                          flexShrink: 0,
                          marginLeft: 'auto',
                        }}>
                          5 Qs
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Empty search state */}
          {visibleMainTopics.length === 0 && (
            <div style={{
              padding: '48px 0',
              textAlign: 'center',
              color: '#71717a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}>
              <Search size={24} style={{ color: '#52525b' }} />
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: 14, color: '#e4e4e7', fontWeight: 600 }}>
                  No topics matching &ldquo;{searchQuery}&rdquo;
                </p>
                <p style={{ margin: 0, fontSize: 12 }}>
                  Try a broader term or reset the tier filter.
                </p>
              </div>
              <button
                onClick={() => { setSearchQuery(''); setSelectedTier('all'); }}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 6,
                  color: '#f4f4f5',
                  padding: '6px 14px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear Filters
              </button>
            </div>
          )}

        </div>
      </main>

      {/* ─── MOBILE ONLY: Floating Action Pill to Open Problems Drawer ─── */}
      {selectedNode && !mobileDrawerOpen && (
        <div className="mobile-floating-pill">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #18181f 0%, #1c1926 100%)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6), 0 0 14px rgba(168, 85, 247, 0.25)',
              borderRadius: 24,
              padding: '10px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: '#f4f4f5',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Sparkles size={13} style={{ color: '#c084fc' }} />
            <span>Practice Problems: <strong style={{ color: '#38bdf8' }}>{selectedNode.name}</strong></span>
            <ChevronUp size={14} style={{ color: '#a1a1aa' }} />
          </button>
        </div>
      )}

      {/* ─── MOBILE ONLY: Slide-Up Bottom Sheet Drawer ─── */}
      {mobileDrawerOpen && (
        <>
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="mobile-drawer-sheet animate-slide-up">
            {/* Grab Handle */}
            <div style={{
              width: 36,
              height: 4,
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              margin: '10px auto 0 auto',
            }} />
            
            {/* Scrollable Drawer Content */}
            <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
              {renderProblemsContent(true)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
