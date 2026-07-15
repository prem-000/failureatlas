'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import {
  BookOpen,
  Clock,
  Bookmark,
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText,
  Layers,
} from 'lucide-react';
import {
  useGraphFailures,
  useLearningSheet,
  useBookmarkedLearningSheets,
  useToggleBookmark,
} from '@/hooks/usePhase3Queries';
import { searchTopics, getLevelsForTopic } from '@/lib/learning-sheet/topic-registry';
import { LearningSheet as LearningSheetRenderer } from '@/components/learning-sheet/LearningSheet';
import { PracticeQueue } from '@/components/workspace/PracticeQueue';
import type { Difficulty, SheetCategory } from '@/types/learning-sheet';

// ─── Sub-types & Constants ───────────────────────────────────────────────────

type WorkspaceSection = 'practice-queue' | 'journal' | 'cheatsheets' | 'bookmarks';

const DIFFICULTIES: Array<{ id: Difficulty; label: string; desc: string }> = [
  { id: 'fundamentals', label: 'Fundamentals', desc: 'Core concepts' },
  { id: 'interview', label: 'Interview', desc: 'Optimal patterns' },
  { id: 'expert', label: 'Expert', desc: 'Deep optimizations' },
];



const DIFF_COLORS: Record<string, string> = {
  Easy: '#22c55e',
  Medium: '#f59e0b',
  Hard: '#ef4444',
};

// ─── Main Workspace Page ──────────────────────────────────────────────────────

export default function WorkspacePage() {
  const searchParams = useSearchParams();

    // ─── Navigation State ───
  const [section, setSection] = useState<WorkspaceSection>('practice-queue');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ─── Bookmarks State ───
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [bookmarkType, setBookmarkType] = useState<'problems' | 'cheatsheets'>('problems');

  // ─── Learning Sheets State ───
  const [topicQuery, setTopicQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ topic: string; category: SheetCategory }>>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('interview');
  const [showSheet, setShowSheet] = useState(false);

  // Dynamic levels list based on selected topic
  const activeLevels = getLevelsForTopic(selectedTopic || topicQuery);

  // Synchronize difficulty state if active levels change
  useEffect(() => {
    if (activeLevels.length > 0 && !activeLevels.includes(difficulty)) {
      setDifficulty(activeLevels[0]);
    }
  }, [selectedTopic, topicQuery, activeLevels, difficulty]);
  const [activeSheetParams, setActiveSheetParams] = useState<{
    topic: string;
    difficulty: Difficulty;
  } | null>(null);

  // ─── Queries ───
  const { data: failures } = useGraphFailures(50, 60);
  const { data: bookmarkedSheets } = useBookmarkedLearningSheets();
  const toggleBookmarkMutation = useToggleBookmark();

  const handleToggleBookmark = (topic: string, diff: Difficulty, bookmarked: boolean) => {
    toggleBookmarkMutation.mutate({ topic, difficulty: diff, bookmarked });
  };

  const [forceRegen, setForceRegen] = useState(false);

  // Triggers sheet generation query only when activeSheetParams is set
  const {
    data: sheetResult,
    isLoading: sheetLoading,
    error: sheetError,
    refetch: refetchSheet,
  } = useLearningSheet(
    activeSheetParams?.topic || '',
    activeSheetParams?.difficulty || 'interview',
    forceRegen
  );

  // Reset forceRegen after query completes
  useEffect(() => {
    if ((sheetResult || sheetError) && forceRegen) {
      setForceRegen(false);
    }
  }, [sheetResult, sheetError, forceRegen]);

  // ─── Effects ───

  // Initialize section from query param if present
  useEffect(() => {
    const sect = searchParams.get('section') as any;
    if (sect) {
      if (sect === 'learning-sheets' || sect === 'cheatsheets') {
        setSection('cheatsheets');
      } else if (['practice-queue', 'journal', 'bookmarks'].includes(sect)) {
        setSection(sect);
      }
    }
    const queryTopic = searchParams.get('topic');
    if (queryTopic) {
      setSelectedTopic(queryTopic);
      setTopicQuery(queryTopic);
      setSection('cheatsheets');
      setActiveSheetParams({
        topic: queryTopic,
        difficulty: 'interview',
      });
      setShowSheet(true);
    }
  }, [searchParams]);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const savedBM = localStorage.getItem('fa_bookmarks');
      if (savedBM) setBookmarks(JSON.parse(savedBM));
    } catch (e) {
      console.error('Failed to load local workspace data', e);
    }
  }, []);

  // Update autocomplete suggestions
  useEffect(() => {
    if (topicQuery.trim().length > 1) {
      const results = searchTopics(topicQuery);
      setSearchSuggestions(results);
    } else {
      setSearchSuggestions([]);
    }
  }, [topicQuery]);

  // ─── Handlers ───



  const handleGenerateSheet = () => {
    const topic = selectedTopic || topicQuery.trim();
    if (!topic) return;

    setActiveSheetParams({
      topic,
      difficulty,
    });
    setShowSheet(true);
  };



  // ─── Format Sub-data ───

  const journalEntries = (failures || []).slice(0, 30).map((f) => ({
    date: new Date(f.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    problem: f.problemTitle,
    difficulty: f.difficulty,
    status: f.status,
    rootCause: f.rootCause || 'Unknown root cause',
    timeAgo: (() => {
      const diff = Date.now() - new Date(f.timestamp).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'just now';
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    })(),
  }));

  return (
    <AppShell>
      {/* Backdrop for Mobile Sidebar Drawer */}
      <div
        className={`workspace-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div
        style={{
          display: 'flex',
          background: '#0d0d0f',
          width: '100%',
          minHeight: '100vh',
        }}
        className="flex-col md:flex-row"
      >
        <style>{`
          .flex-col { flex-direction: column !important; }
          @media (min-width: 768px) {
            .md\\:flex-row { flex-direction: row !important; }
          }
          .custom-sb::-webkit-scrollbar { width: 5px; height: 5px; }
          .custom-sb::-webkit-scrollbar-track { background: transparent; }
          .custom-sb::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }
          .custom-sb::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }

          /* Sidebar responsive layout */
          .workspace-sidebar {
            display: flex;
            flex-direction: column;
            width: 220px;
          }
          .workspace-sidebar-backdrop {
            display: none;
          }
          @media (max-width: 767px) {
            .workspace-sidebar {
              position: fixed !important;
              left: 0;
              top: 0;
              bottom: 0;
              width: 260px !important;
              height: 100vh !important;
              z-index: 1000 !important;
              background: #0f0f12 !important;
              flex-direction: column !important;
              padding: 24px 16px !important;
              transform: translateX(-100%);
              transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1) !important;
              border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
              box-shadow: 10px 0 30px rgba(0, 0, 0, 0.7) !important;
            }
            .workspace-sidebar.open {
              transform: translateX(0) !important;
            }
            .workspace-sidebar-backdrop {
              display: block !important;
              position: fixed !important;
              inset: 0 !important;
              background: rgba(0, 0, 0, 0.6) !important;
              backdrop-filter: blur(4px) !important;
              -webkit-backdrop-filter: blur(4px) !important;
              z-index: 999 !important;
              opacity: 0;
              pointer-events: none;
              transition: opacity 250ms ease !important;
            }
            .workspace-sidebar-backdrop.open {
              opacity: 1 !important;
              pointer-events: auto !important;
            }
            .md\\:hidden-header {
              display: flex !important;
            }
          }
          @media (min-width: 768px) {
            .md\\:hidden-header {
              display: none !important;
            }
          }
        `}</style>

        {/* Left Subsection Sidebar */}
        <aside
          style={{
            borderRight: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(15,15,18,0.4)',
            gap: 6,
          }}
          className="workspace-sidebar"
        >
          <div
            style={{
              fontSize: '10px',
              color: '#52525b',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0 12px 12px 12px',
            }}
            className="hidden md:block"
          >
            Workspace Hub
          </div>
          <style>{`
            .hidden { display: none !important; }
            @media (min-width: 768px) {
              .md\\:block { display: block !important; }
            }
          `}</style>

          {[
            { id: 'practice-queue' as WorkspaceSection, label: 'Practice Queue', desc: 'Revise solved problems', icon: Layers },
            { id: 'journal' as WorkspaceSection, label: 'Practice Journal', desc: 'Analyze failed submissions', icon: BookOpen },
            { id: 'cheatsheets' as WorkspaceSection, label: 'Cheatsheets', desc: 'AI learning sheets', icon: FileText },
            { id: 'bookmarks' as WorkspaceSection, label: 'Bookmarks', desc: 'Bookmarked content', icon: Bookmark },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = section === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setSection(item.id);
                  setSidebarOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: 'none',
                  background: isActive ? 'rgba(255,95,82,0.08)' : 'transparent',
                  color: isActive ? '#ff5f52' : '#71717a',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms',
                  width: '100%',
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} style={{ color: isActive ? '#ff5f52' : '#52525b', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span style={{ fontSize: '13px', fontWeight: isActive ? 800 : 600, color: isActive ? '#ff5f52' : '#e4e4e7', lineHeight: 1 }}>{item.label}</span>
                  <span style={{ fontSize: '10px', color: isActive ? 'rgba(255,95,82,0.7)' : '#52525b', fontWeight: 500, lineHeight: 1 }} className="hidden md:inline">
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Content Pane */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Mobile Header Bar */}
          <div
            style={{
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: '#0f0f12',
              position: 'sticky',
              top: 0,
              zIndex: 40,
            }}
            className="md:hidden-header"
          >
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e4e4e7',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 8,
                marginLeft: -8,
              }}
              aria-label="Open Workspace Navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#f4f4f5', marginLeft: 12 }}>
              {section === 'practice-queue' ? 'Practice Queue' : section === 'journal' ? 'Practice Journal' : section === 'cheatsheets' ? 'Cheatsheets' : 'Bookmarks'}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              padding: 'clamp(16px, 4vw, 32px)',
            }}
          >
            {/* ── SECTION: PRACTICE QUEUE ── */}
            {section === 'practice-queue' && (
              <PracticeQueue />
            )}

          {/* ── SECTION: AI CHEATSHEETS ── */}
          {section === 'cheatsheets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Creator control box */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f5', margin: 0 }}>
                    AI Learning Sheets
                  </h2>
                  <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0' }}>
                    Generate structured study resources tailored to your personal failure history.
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 16,
                  }}
                  className="md:grid-cols-2"
                >
                  <style>{`
                    @media (min-width: 768px) {
                      .md\\:grid-cols-2 {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                      }
                    }
                  `}</style>

                  {/* Topic Autocomplete Search */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase' }}>
                      Topic
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        placeholder="Search or enter topic..."
                        value={topicQuery}
                        onChange={(e) => {
                          setTopicQuery(e.target.value);
                          setSelectedTopic('');
                        }}
                        style={{
                          width: '100%',
                          background: 'rgba(0,0,0,0.15)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: '10px 14px 10px 38px',
                          color: '#f4f4f5',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                      <Search
                        size={15}
                        style={{ position: 'absolute', left: 14, top: 13, color: '#52525b' }}
                      />
                    </div>

                    {/* Autocomplete List */}
                    {searchSuggestions.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#18181b',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          marginTop: 4,
                          zIndex: 50,
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                          maxHeight: 200,
                          overflowY: 'auto',
                        }}
                        className="custom-sb"
                      >
                        {searchSuggestions.map((item) => (
                          <button
                            key={`${item.topic}-${item.category}`}
                            onClick={() => {
                              setSelectedTopic(item.topic);
                              setTopicQuery(item.topic);
                              setSearchSuggestions([]);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              textAlign: 'left',
                              background: 'transparent',
                              border: 'none',
                              color: '#d4d4d8',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                            className="hover:bg-zinc-800"
                          >
                            <span style={{ fontWeight: 600 }}>{item.topic}</span>
                            <span style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase' }}>
                              {item.category}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Difficulty level picker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase' }}>
                      Difficulty Level
                    </label>
                    <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.15)', padding: 4, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                      {activeLevels.map((lvl) => {
                        const isSel = difficulty === lvl;
                        const label = lvl.charAt(0).toUpperCase() + lvl.slice(1);
                        return (
                          <button
                            key={lvl}
                            onClick={() => setDifficulty(lvl)}
                            style={{
                              flex: 1,
                              padding: '8px 4px',
                              borderRadius: 8,
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isSel ? 'rgba(255,255,255,0.06)' : 'transparent',
                              color: isSel ? '#f4f4f5' : '#71717a',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 150ms',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>


                <button
                  onClick={handleGenerateSheet}
                  disabled={!topicQuery.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #ff5f52, #ff8a80)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: 10,
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: !topicQuery.trim() ? 0.5 : 1,
                  }}
                >
                  <Sparkles size={14} />
                  <span>Generate Learning Sheet</span>
                </button>
              </div>

              {/* Rendering Panel */}
              {showSheet && (
                <div style={{ marginTop: 8 }}>
                  {sheetLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
                      <Loader2 size={36} style={{ color: '#ff5f52', animation: 'spin 1.2s linear infinite', marginBottom: 16 }} />
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#f4f4f5' }}>Generating learning content...</div>
                      <div style={{ fontSize: '12px', color: '#71717a', marginTop: 6, textAlign: 'center' }}>
                        Inlining concepts and tailoring common mistakes based on your failure history.
                      </div>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  ) : sheetError ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 24px', background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 16 }}>
                      <AlertCircle size={32} style={{ color: '#ef4444' }} />
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fca5a5', textAlign: 'center' }}>
                        {sheetError.message || 'Failed to retrieve learning content from Gemini.'}
                      </div>
                      <button
                        onClick={() => refetchSheet()}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#f4f4f5',
                          padding: '6px 16px',
                          borderRadius: 8,
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  ) : sheetResult ? (
                    <LearningSheetRenderer
                      topic={sheetResult.topic}
                      category={sheetResult.category}
                      difficulty={sheetResult.difficulty}
                      data={sheetResult.data}
                      createdAt={sheetResult.createdAt}
                      cached={sheetResult.cached}
                      bookmarked={sheetResult.bookmarked}
                      onRegenerate={() => setForceRegen(true)}
                      onToggleBookmark={() => handleToggleBookmark(sheetResult.topic, sheetResult.difficulty, !sheetResult.bookmarked)}
                    />
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* ── SECTION: PRACTICE JOURNAL ── */}
          {section === 'journal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f5', margin: 0 }}>
                  Practice Journal
                </h2>
                <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0' }}>
                  Automated reflection notes extracted from your recent practice failure events.
                </p>
              </div>

              {journalEntries.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#52525b', fontSize: '13px', padding: '60px 24px' }}>
                  No failure submissions registered yet. Install the extension to begin tracing.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {journalEntries.map((e, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: 16,
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: 12,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ minWidth: 60, fontSize: '11px', fontWeight: 700, color: '#52525b', paddingTop: 2 }}>
                        {e.date}
                      </div>
                      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.06)' }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f5' }}>{e.problem}</span>
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              color: DIFF_COLORS[e.difficulty] || '#71717a',
                              background: `${DIFF_COLORS[e.difficulty] || '#71717a'}15`,
                              border: `1px solid ${DIFF_COLORS[e.difficulty] || '#71717a'}30`,
                              padding: '2px 7px',
                              borderRadius: 5,
                            }}
                          >
                            {e.difficulty}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: '12px' }}>
                          <span style={{ color: '#f97316', fontWeight: 700 }}>{e.status}</span>
                          <span style={{ color: '#71717a' }}>{e.rootCause}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#3f3f46' }}>{e.timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SECTION: BOOKMARKS ── */}
          {section === 'bookmarks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f5', margin: 0 }}>
                  Bookmarks
                </h2>
                <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0' }}>
                  Problems and visual cheatsheets you have saved during your practice.
                </p>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10 }}>
                <button
                  onClick={() => setBookmarkType('problems')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '12px',
                    fontWeight: 700,
                    background: bookmarkType === 'problems' ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: bookmarkType === 'problems' ? '#f4f4f5' : '#71717a',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Problems ({bookmarks.length})
                </button>
                <button
                  onClick={() => setBookmarkType('cheatsheets')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '12px',
                    fontWeight: 700,
                    background: bookmarkType === 'cheatsheets' ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: bookmarkType === 'cheatsheets' ? '#f4f4f5' : '#71717a',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cheatsheets ({bookmarkedSheets?.length || 0})
                </button>
              </div>

              {bookmarkType === 'problems' ? (
                bookmarks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#52525b', fontSize: '13px', padding: '60px 24px' }}>
                    No bookmarked problems. Save them inside problem drawers to see them here.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: 12,
                    }}
                    className="sm:grid-cols-2"
                  >
                    <style>{`
                      @media (min-width: 640px) {
                        .sm\\:grid-cols-2 {
                          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        }
                      }
                    `}</style>
                    {bookmarks.map((b) => (
                      <div
                        key={b}
                        style={{
                          padding: '16px 20px',
                          borderRadius: 12,
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#e4e4e7' }}>{b}</span>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => {
                              setSelectedTopic(b);
                              setTopicQuery(b);
                              setSection('cheatsheets');
                              setActiveSheetParams({
                                topic: b,
                                difficulty: 'interview',
                              });
                              setShowSheet(true);
                            }}
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#ff5f52',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Learn
                          </button>
                          <a
                            href={`https://leetcode.com/problems/${b}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#3b82f6',
                              textDecoration: 'none',
                            }}
                          >
                            Solve ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                !bookmarkedSheets || bookmarkedSheets.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#52525b', fontSize: '13px', padding: '60px 24px' }}>
                    No bookmarked cheatsheets. Save sheets using the Star button to see them here.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: 12,
                    }}
                    className="sm:grid-cols-2"
                  >
                    <style>{`
                      @media (min-width: 640px) {
                        .sm\\:grid-cols-2 {
                          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        }
                      }
                    `}</style>
                    {bookmarkedSheets.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          padding: '16px 20px',
                          borderRadius: 12,
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#e4e4e7' }}>{s.topic}</span>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#ff5f52', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {s.difficulty}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedTopic(s.topic);
                            setTopicQuery(s.topic);
                            setDifficulty(s.difficulty);
                            setSection('cheatsheets');
                            setActiveSheetParams({
                              topic: s.topic,
                              difficulty: s.difficulty,
                            });
                            setShowSheet(true);
                          }}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#ff5f52',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Open Sheet
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </AppShell>
  );
}
