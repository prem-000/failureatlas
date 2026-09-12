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

  // Currently selected node for the left sidebar (Level 0, 1, or 2)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
  // - Sets sidebar to that topic's 5 problems
  // - Toggles accordion expansion
  const handleMainTopicClick = (topicId: string) => {
    setSelectedNodeId(topicId);
    if (expandedTopicId === topicId) {
      // Clicking already expanded topic collapses it
      setExpandedTopicId(null);
    } else {
      setExpandedTopicId(topicId);
    }
  };

  // Handler for clicking a subtopic:
  // - Sets sidebar to that subtopic's 5 problems
  // - Keeps parent accordion open
  const handleSubtopicClick = (subtopicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(subtopicId);
  };

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      height: '100%',
      background: '#0a0a0c',
      color: '#e4e4e7',
      overflow: 'hidden',
    }}>
      <style>{`
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
        @media (max-width: 900px) {
          .explorer-sidebar {
            width: 320px;
          }
        }
        .main-canvas {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          background: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.03) 0%, transparent 60%), #0a0a0c;
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
      `}</style>

      {/* ─── LEFT SIDEBAR: Practice Problems ─── */}
      <aside className="explorer-sidebar custom-scrollbar">
        {selectedNode ? (
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                  onClick={() => setSelectedNodeId(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Clear selection"
                >
                  <X size={14} />
                </button>
              </div>

              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f4f4f5', margin: '0 0 6px 0', lineHeight: 1.3 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
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
        ) : (
          /* Neutral Initial State */
          <div style={{
            padding: '36px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 16,
            marginTop: 'auto',
            marginBottom: 'auto',
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
            }}>
              <Compass size={24} />
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
              onClick={() => setSelectedNodeId('dsa-roadmap')}
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
        )}
      </aside>

      {/* ─── MAIN CANVAS: Horizontal Flow DAG ─── */}
      <main className="main-canvas custom-scrollbar">
        {/* Top Control Bar: Search & Tier Filter */}
        <div style={{
          padding: '16px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: 'rgba(10, 10, 12, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}>
          {/* Live Search Input */}
          <div style={{
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#52525b', fontWeight: 600, marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
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
                  }}
                >
                  {tier}
                </button>
              );
            })}
          </div>

          {/* Topic Count Indicator */}
          <div style={{ fontSize: 11, color: '#71717a', fontFamily: 'monospace' }}>
            {visibleMainTopics.length} of {MAIN_TOPICS.length} Topics Shown
          </div>
        </div>

        {/* ─── DAG Visual Container ─── */}
        <div style={{ padding: '36px 32px 64px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          
          {/* ── Level 0: Root Node ("DSA Roadmap") ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={() => setSelectedNodeId('dsa-roadmap')}
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
          <div style={{
            width: '100%',
            maxWidth: 1100,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 12,
            padding: '4px 0',
          }}>
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', whiteSpace: 'nowrap' }}>
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
                    marginLeft: 2,
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
              <div style={{
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    Click any pattern to view its 5 problems
                  </span>
                </div>

                {/* Subtopic Pill Row */}
                <div style={{
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
    </div>
  );
}
