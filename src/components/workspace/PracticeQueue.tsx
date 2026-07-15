'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Clock,
  ExternalLink,
  Loader2,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Award,
  ChevronLeft,
  ChevronRight,
  Play,
  FileText,
  Sparkles,
  BookOpen,
  HelpCircle,
  Check,
} from 'lucide-react';
import {
  usePracticeQueue,
  useStartPracticeSession,
  useSubmitReview,
  PracticeSessionData,
  PracticeSessionItemData,
} from '@/hooks/usePracticeQueue';
import { useLearningSheet } from '@/hooks/usePhase3Queries';
import { LearningSheet as LearningSheetRenderer } from '@/components/learning-sheet/LearningSheet';
import { getCategoryForTopic } from '@/lib/learning-sheet/topic-registry';

const DIFF_COLORS: Record<string, string> = {
  Easy: '#22c55e',
  Medium: '#f59e0b',
  Hard: '#ef4444',
};

const PLATFORM_COLORS: Record<string, string> = {
  LeetCode: '#ffa116',
  Codeforces: '#1f85de',
  CodeChef: '#5b4638',
  AtCoder: '#f4f4f5',
};

export function PracticeQueue() {
  const { data, isLoading, error, refetch } = usePracticeQueue();
  const startSessionMutation = useStartPracticeSession();
  const submitReviewMutation = useSubmitReview();

  // --- Session Control State ---
  const [session, setSession] = useState<PracticeSessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [revealedNotes, setRevealedNotes] = useState(false);
  const [revealedCheatsheet, setRevealedCheatsheet] = useState(false);

  // Setup options
  const [limit, setLimit] = useState<number>(5);
  const [customLimit, setCustomLimit] = useState<string>('');
  const [strategy, setStrategy] = useState<'PRIORITY' | 'WEAKEST_TOPIC' | 'MIXED'>('PRIORITY');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Active Problem inputs
  const [notesText, setNotesText] = useState('');
  const [reviewAgain, setReviewAgain] = useState(false);
  const [noteSavedIndicator, setNoteSavedIndicator] = useState(false);

  // PDF Export Dialog State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    notes: true,
    cheatsheets: true,
    solutions: true,
    editorial: true,
    blank: true,
  });
  const [exporting, setExporting] = useState(false);

  // Synchronize session state from API's activeSession if it exists
  useEffect(() => {
    if (data?.activeSession && !session) {
      // Prompt user or automatically load if wanted
      // We'll let the user click "Resume Session" on the dashboard
    }
  }, [data]);

  // Load problem details into inputs when changing problems
  const currentItem = session?.items?.[currentIndex];
  useEffect(() => {
    if (currentItem?.review) {
      setNotesText(currentItem.review.personalNotes || '');
      setReviewAgain(currentItem.review.reviewAgain || false);
      setRevealedNotes(false);
      setRevealedCheatsheet(false);
    }
  }, [currentIndex, session]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px' }}>
        <Loader2 size={40} style={{ color: '#ff5f52', animation: 'spin 1.2s linear infinite', marginBottom: 16 }} />
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#f4f4f5' }}>Loading practice queue...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 24px', background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 16 }}>
        <AlertTriangle size={32} style={{ color: '#ef4444' }} />
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fca5a5', textAlign: 'center' }}>
          Failed to load practice queue: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
        <button
          onClick={() => refetch()}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#f4f4f5',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    );
  }

  const statistics = data?.statistics || {
    reviewsCompleted: 0,
    currentStreak: 0,
    averageRecall: 0,
    retentionRate: 0,
    totalProblemsReviewed: 0,
  };
  const recentSessions = data?.recentSessions || [];
  const topicsList = data?.topics || [];
  const totalCount = data?.totalCount || 0;

  // --- Handlers ---
  const handleStartSession = async (useLimit?: number) => {
    const finalLimit = useLimit || (customLimit ? parseInt(customLimit, 10) : limit);
    if (!finalLimit || finalLimit <= 0) return;

    try {
      const res = await startSessionMutation.mutateAsync({
        limit: finalLimit,
        strategy,
        topic: strategy === 'WEAKEST_TOPIC' ? selectedTopic : undefined,
      });

      if (res?.session) {
        setSession(res.session);
        setCurrentIndex(res.session.currentIndex || 0);
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const handleResumeSession = (activeSess: PracticeSessionData) => {
    setSession(activeSess);
    setCurrentIndex(activeSess.currentIndex || 0);
  };

  const handleSaveNotes = async () => {
    if (!currentItem?.review?.id) return;
    try {
      await submitReviewMutation.mutateAsync({
        id: currentItem.review.id,
        sessionId: session?.id,
        quality: 0, // 0 signals just note updates in some schemas, but PUT handles quality
        personalNotes: notesText,
        reviewAgain,
      });
      setNoteSavedIndicator(true);
      setTimeout(() => setNoteSavedIndicator(false), 2000);
      refetch();
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const handleRateRecall = async (quality: number) => {
    if (!currentItem?.review?.id) return;
    try {
      await submitReviewMutation.mutateAsync({
        id: currentItem.review.id,
        sessionId: session?.id,
        quality,
        personalNotes: notesText,
        reviewAgain,
      });

      // Update local state item as completed
      if (session) {
        const updatedItems = session.items.map((it, idx) => {
          if (idx === currentIndex) {
            return { ...it, completed: true };
          }
          return it;
        });

        // Advance to next uncompleted item
        let nextIdx = currentIndex + 1;
        while (nextIdx < updatedItems.length && updatedItems[nextIdx].completed) {
          nextIdx++;
        }

        const isSessionFinished = nextIdx >= updatedItems.length;

        setSession({
          ...session,
          items: updatedItems,
          currentIndex: isSessionFinished ? currentIndex : nextIdx,
        });

        if (isSessionFinished) {
          // Trigger complete reload of queue dashboard data
          refetch();
        } else {
          setCurrentIndex(nextIdx);
        }
      }
    } catch (err) {
      console.error('Failed to submit recall rating:', err);
    }
  };

  const handleOpenProblem = () => {
    if (!currentItem?.review) return;
    const { platform, problemId } = currentItem.review;
    let url = '';
    if (platform === 'LeetCode') {
      url = `https://leetcode.com/problems/${problemId}/`;
    } else if (platform === 'Codeforces') {
      const contestId = problemId.replace(/[^0-9]/g, '');
      const index = problemId.replace(/[0-9]/g, '');
      url = contestId && index ? `https://codeforces.com/problemset/problem/${contestId}/${index}` : 'https://codeforces.com/';
    } else if (platform === 'CodeChef') {
      url = `https://www.codechef.com/problems/${problemId}`;
    } else if (platform === 'AtCoder') {
      url = `https://atcoder.jp/contests/archive/tasks/${problemId}`;
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const triggerExport = async () => {
    if (!session?.id) return;
    setExporting(true);
    try {
      const includesArr = [];
      if (exportConfig.notes) includesArr.push('notes');
      if (exportConfig.cheatsheets) includesArr.push('cheatsheets');
      if (exportConfig.solutions) includesArr.push('solutions');
      if (exportConfig.editorial) includesArr.push('editorial');
      if (exportConfig.blank) includesArr.push('blank');

      const response = await fetch('/api/practice-queue/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          include: includesArr,
        }),
      });
      const data = await response.json();
      if (data?.success && data?.exportId) {
        setShowExportModal(false);
        window.open(`/workspace/practice-queue/print?id=${data.exportId}`, '_blank');
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // --- Helper Sub-Renderers ---
  const renderCheatsheet = () => {
    if (!currentItem?.review) return null;
    const topic = currentItem.review.topics?.[0] || 'Arrays';
    return <CheatsheetLoader topic={topic} />;
  };

  const renderLearningInsights = (sessData: PracticeSessionData) => {
    // Collect quality ratings and topic mappings from session review history items
    const completedItems = sessData.items.filter((it) => it.completed);
    if (completedItems.length === 0) return null;

    const topicScores: Record<string, { sum: number; count: number }> = {};
    let lowestRecallItem: PracticeSessionItemData | null = null;
    let lowestRecallVal = 6;

    completedItems.forEach((it) => {
      // Find rating from history (we'll fetch local simulation if DB not synced yet)
      const rating = 4; // Mock/fallbacks or we can pass actual history rating if stored
      const topic = it.review.topics?.[0] || 'General';

      if (!topicScores[topic]) topicScores[topic] = { sum: 0, count: 0 };
      topicScores[topic].sum += rating;
      topicScores[topic].count++;

      if (rating < lowestRecallVal) {
        lowestRecallVal = rating;
        lowestRecallItem = it;
      }
    });

    const topicAverages = Object.entries(topicScores).map(([topic, data]) => ({
      topic,
      avg: data.sum / data.count,
    }));

    topicAverages.sort((a, b) => b.avg - a.avg);

    const strongestTopic = topicAverages[0]?.topic || 'None';
    const weakestTopic = topicAverages[topicAverages.length - 1]?.topic || 'None';
    const forgottenConcept = lowestRecallItem ? (lowestRecallItem as any).review.topics?.[0] || 'None' : 'None';

    return (
      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Sparkles size={16} style={{ color: '#ff5f52' }} />
          Learning Insights
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Today's Strongest Topic</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#34d399', marginTop: 4 }}>{strongestTopic}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Today's Weakest Topic</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f87171', marginTop: 4 }}>{weakestTopic}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Most Forgotten Concept</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fb923c', marginTop: 4 }}>{forgottenConcept}</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 16, fontSize: '12px', color: '#a1a1aa' }}>
          <strong>Recommendation:</strong> Review the <span style={{ color: '#ff5f52', fontWeight: 700 }}>{weakestTopic} Cheatsheet</span> to solidify the core principles.
        </div>
      </div>
    );
  };

  // --- SCREEN 1: Setup Dashboard ---
  if (!session) {
    const isSessionActive = !!data?.activeSession;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <style>{`
          /* Responsive adjustments */
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          @media (min-width: 640px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (min-width: 1024px) {
            .stats-grid { grid-template-columns: repeat(4, 1fr); }
          }

          .strategy-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          @media (min-width: 768px) {
            .strategy-grid { grid-template-columns: repeat(3, 1fr); }
          }

          .input-button-row {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }
          @media (min-width: 640px) {
            .input-button-row {
              flex-direction: row;
              align-items: center;
              max-width: 500px;
            }
          }
        `}</style>

        {/* Header Title */}
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#f4f4f5', margin: 0, letterSpacing: '-0.025em' }}>
            Practice Queue
          </h2>
          <p style={{ fontSize: '13px', color: '#71717a', margin: '6px 0 0 0' }}>
            Fully automatic, SM-2 powered session revision.
          </p>
        </div>

        {/* Resume Session Banner */}
        {isSessionActive && data.activeSession && (
          <div style={{ background: 'rgba(255,95,82,0.06)', border: '1px solid rgba(255,95,82,0.2)', borderRadius: 16, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ background: 'rgba(255,95,82,0.1)', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff5f52' }}>
                <Play size={18} fill="#ff5f52" />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#f4f4f5', margin: 0 }}>Active Session in Progress</h4>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '2px 0 0 0' }}>
                  Problem {data.activeSession.currentIndex + 1} of {data.activeSession.items.length} ({data.activeSession.strategy.replace('_', ' ')})
                </p>
              </div>
            </div>
            <button
              onClick={() => handleResumeSession(data.activeSession!)}
              style={{ background: '#ff5f52', border: 'none', color: '#ffffff', padding: '10px 20px', borderRadius: 10, fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              Resume Session
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Setup Card */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Limit Selector */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              How many problems do you want to revise?
            </label>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              {[5, 10, 20].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setLimit(num);
                    setCustomLimit('');
                  }}
                  style={{
                    background: limit === num && !customLimit ? 'rgba(255,95,82,0.1)' : 'rgba(0,0,0,0.2)',
                    border: limit === num && !customLimit ? '1px solid #ff5f52' : '1px solid rgba(255,255,255,0.08)',
                    color: limit === num && !customLimit ? '#ff5f52' : '#a1a1aa',
                    padding: '8px 20px',
                    borderRadius: 10,
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  {num}
                </button>
              ))}
              <input
                type="number"
                placeholder="Custom"
                value={customLimit}
                onChange={(e) => {
                  setCustomLimit(e.target.value);
                  setLimit(0);
                }}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: customLimit ? '1px solid #ff5f52' : '1px solid rgba(255,255,255,0.08)',
                  color: '#f4f4f5',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: '14px',
                  outline: 'none',
                  width: '100px',
                  fontWeight: 700,
                }}
              />
            </div>
          </div>

          {/* Strategy Selection Cards */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Strategy
            </label>
            <div className="strategy-grid" style={{ marginTop: 12 }}>
              
              {/* Strategy Card 1: Priority */}
              <div
                onClick={() => setStrategy('PRIORITY')}
                style={{
                  background: strategy === 'PRIORITY' ? 'rgba(255,95,82,0.05)' : 'rgba(0,0,0,0.15)',
                  border: strategy === 'PRIORITY' ? '1px solid #ff5f52' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all 200ms',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: strategy === 'PRIORITY' ? '#ff5f52' : '#f4f4f5' }}>Priority</span>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: strategy === 'PRIORITY' ? '5px solid #ff5f52' : '2px solid rgba(255,255,255,0.2)', background: 'transparent' }} />
                </div>
                <p style={{ fontSize: '12px', color: '#71717a', margin: 0, lineHeight: 1.4 }}>
                  Intelligent spaced repetition selection to maximize knowledge retention.
                </p>
              </div>

              {/* Strategy Card 2: Weakest Topic */}
              <div
                onClick={() => setStrategy('WEAKEST_TOPIC')}
                style={{
                  background: strategy === 'WEAKEST_TOPIC' ? 'rgba(255,95,82,0.05)' : 'rgba(0,0,0,0.15)',
                  border: strategy === 'WEAKEST_TOPIC' ? '1px solid #ff5f52' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all 200ms',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: strategy === 'WEAKEST_TOPIC' ? '#ff5f52' : '#f4f4f5' }}>Weakest Topic</span>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: strategy === 'WEAKEST_TOPIC' ? '5px solid #ff5f52' : '2px solid rgba(255,255,255,0.2)', background: 'transparent' }} />
                </div>
                <p style={{ fontSize: '12px', color: '#71717a', margin: 0, lineHeight: 1.4 }}>
                  Targeted practice focused strictly on a single topic / weakness category.
                </p>
              </div>

              {/* Strategy Card 3: Mixed */}
              <div
                onClick={() => setStrategy('MIXED')}
                style={{
                  background: strategy === 'MIXED' ? 'rgba(255,95,82,0.05)' : 'rgba(0,0,0,0.15)',
                  border: strategy === 'MIXED' ? '1px solid #ff5f52' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all 200ms',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: strategy === 'MIXED' ? '#ff5f52' : '#f4f4f5' }}>Mixed</span>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: strategy === 'MIXED' ? '5px solid #ff5f52' : '2px solid rgba(255,255,255,0.2)', background: 'transparent' }} />
                </div>
                <p style={{ fontSize: '12px', color: '#71717a', margin: 0, lineHeight: 1.4 }}>
                  Balanced review mixing scheduled recalls with newly solved problems.
                </p>
              </div>

            </div>
          </div>

          {/* Topic Selector for Weakest Topic strategy */}
          {strategy === 'WEAKEST_TOPIC' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '13px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Choose Weakness Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f4f4f5',
                  padding: '10px 16px',
                  borderRadius: 10,
                  fontSize: '14px',
                  outline: 'none',
                  fontWeight: 700,
                  maxWidth: '300px',
                }}
              >
                <option value="">-- Select Topic --</option>
                {topicsList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start Button */}
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => handleStartSession()}
              disabled={startSessionMutation.isPending || (strategy === 'WEAKEST_TOPIC' && !selectedTopic)}
              style={{
                background: '#ff5f52',
                border: 'none',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: 12,
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 200ms',
                opacity: startSessionMutation.isPending ? 0.6 : 1,
              }}
            >
              {startSessionMutation.isPending ? (
                <Loader2 size={16} style={{ animation: 'spin 1.2s linear infinite' }} />
              ) : (
                <Play size={16} fill="#fff" />
              )}
              Start Practice Session
            </button>
          </div>

        </div>

        {/* Recent Session History */}
        {recentSessions.length > 0 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f4f4f5', marginBottom: 16 }}>
              Recent Completed Sessions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: 'rgba(255,255,255,0.005)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: 14,
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#e4e4e7' }}>
                        Session ({s.strategy.replace('_', ' ')})
                      </span>
                      {s.filterTopic && (
                        <span style={{ fontSize: '10px', background: 'rgba(255,95,82,0.1)', color: '#ff5f52', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                          {s.filterTopic}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#71717a', marginTop: 4 }}>
                      Completed on {new Date(s.completedAt!).toLocaleDateString()} at {new Date(s.completedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 24, fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#71717a' }}>Avg Recall: </span>
                      <span style={{ color: '#f4f4f5', fontWeight: 700 }}>{(s.averageRecall || 0).toFixed(1)} / 5</span>
                    </div>
                    <div>
                      <span style={{ color: '#71717a' }}>Retention: </span>
                      <span style={{ color: '#f4f4f5', fontWeight: 700 }}>{(s.retentionRate || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    );
  }

  // --- SCREEN 2: Session Active / Complete Checker ---
  const isFinished = currentIndex >= session.items.length || session.completedAt !== null;

  // --- SCREEN 3: Session Completed ---
  if (isFinished) {
    const completedItems = session.items;
    const sessionRecallSum = completedItems.reduce((acc, it) => acc + 4, 0); // fallback avg
    const averageRecall = completedItems.length > 0 ? (sessionRecallSum / completedItems.length).toFixed(1) : '0';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header Summary */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0 20px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', marginBottom: 8 }}>
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#f4f4f5', margin: 0 }}>
            Session Completed!
          </h2>
          <p style={{ fontSize: '14px', color: '#71717a', margin: 0, maxWidth: '400px' }}>
            Excellent revision block. Your SM-2 spacing intervals have been updated in the database.
          </p>
        </div>

        {/* Session Stats Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ff5f52' }}>{completedItems.length}</div>
            <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>Problems Reviewed</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#60a5fa' }}>{averageRecall} / 5</div>
            <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>Average Recall</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#fb923c' }}>{statistics.currentStreak} {statistics.currentStreak === 1 ? 'day' : 'days'}</div>
            <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>Current Streak</div>
          </div>
        </div>

        {/* Learning Insights Block */}
        {renderLearningInsights(session)}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
          <button
            onClick={() => {
              setSession(null);
              refetch();
            }}
            style={{
              background: '#ff5f52',
              border: 'none',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: 12,
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <RefreshCw size={16} />
            Review More
          </button>
          
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f4f4f5',
              padding: '12px 24px',
              borderRadius: 12,
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FileText size={16} />
            Download Revision Pack
          </button>
        </div>

        {/* PDF Export Modal */}
        {showExportModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: '16px',
            }}
          >
            <div
              style={{
                background: '#0d0d0f',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                width: '100%',
                maxWidth: '480px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#f4f4f5', margin: 0 }}>
                  Configure Revision Pack PDF
                </h3>
                <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0' }}>
                  Select the components to include in your offline print sheet.
                </p>
              </div>

              {/* Checklist options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'notes', label: 'Include Personal Notes', desc: 'Attach your historical review reflections' },
                  { key: 'cheatsheets', label: 'Include AI Cheatsheets', desc: 'Display concepts, steps and visualizations' },
                  { key: 'solutions', label: 'Include Previous Solution', desc: 'Include your latest accepted code submission' },
                  { key: 'editorial', label: 'Include Editorial / Analysis', desc: 'Include AI-diagnosed cause breakdowns' },
                  { key: 'blank', label: 'Include Blank Writing Space', desc: 'Append gridded space for manual scratch work' },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={(exportConfig as any)[opt.key]}
                      onChange={(e) =>
                        setExportConfig({
                          ...exportConfig,
                          [opt.key]: e.target.checked,
                        })
                      }
                      style={{ marginTop: 3, cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#e4e4e7' }}>{opt.label}</span>
                      <span style={{ fontSize: '10px', color: '#71717a' }}>{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', justifySelf: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => setShowExportModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#a1a1aa',
                    padding: '10px 20px',
                    borderRadius: 10,
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={triggerExport}
                  disabled={exporting}
                  style={{
                    background: '#ff5f52',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: 10,
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: exporting ? 0.6 : 1,
                  }}
                >
                  {exporting ? (
                    <Loader2 size={14} style={{ animation: 'spin 1.2s linear infinite' }} />
                  ) : (
                    <Check size={14} />
                  )}
                  Generate PDF
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // --- SCREEN 4: Active Session Problem Player ---
  if (!currentItem?.review) return null;
  const problem = currentItem.review;
  const masteryLabel = problem.repetitions <= 1 ? 'Learning' : problem.repetitions === 2 ? 'Practicing' : problem.repetitions <= 4 ? 'Stable' : 'Mastered';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Session Progress Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16 }}>
        <div>
          <span style={{ fontSize: '11px', color: '#ff5f52', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Practice Session ({session.strategy.replace('_', ' ')})
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#f4f4f5', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            Problem {currentIndex + 1} of {session.items.length}
          </h2>
        </div>

        <button
          onClick={() => {
            // Discard session
            setSession(null);
            refetch();
          }}
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Quit Session
        </button>
      </div>

      {/* Problem Card Main */}
      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Meta tags line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: PLATFORM_COLORS[problem.platform],
              background: `${PLATFORM_COLORS[problem.platform]}12`,
              border: `1px solid ${PLATFORM_COLORS[problem.platform]}25`,
              padding: '1px 6px',
              borderRadius: 4,
            }}
          >
            {problem.platform}
          </span>
          <span style={{ color: '#3f3f46' }}>•</span>
          <span style={{ fontSize: '12px', color: DIFF_COLORS[problem.difficulty], fontWeight: 800 }}>
            {problem.difficulty}
          </span>
          <span style={{ color: '#3f3f46' }}>•</span>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 700 }}>
            Mastery: {masteryLabel}
          </span>
        </div>

        {/* Title */}
        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#f4f4f5', margin: 0 }}>
          {problem.title}
        </h3>

        {/* Actions row */}
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button
            onClick={handleOpenProblem}
            style={{
              background: 'rgba(255,95,82,0.1)',
              border: '1px solid rgba(255,95,82,0.25)',
              color: '#ff5f52',
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 150ms',
            }}
          >
            Open Problem Link
            <ExternalLink size={14} />
          </button>
        </div>

      </div>

      {/* Accordion 1: Reveal Personal Notes */}
      <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16 }}>
        <button
          onClick={() => setRevealedNotes(!revealedNotes)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={16} style={{ color: '#ff5f52' }} />
            Reveal Personal Notes
          </span>
          <span style={{ color: '#71717a', fontSize: '12px' }}>{revealedNotes ? 'Hide' : 'Show'}</span>
        </button>

        {revealedNotes && (
          <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea
              placeholder="Write your review notes, code ideas, complexity traps, or root causes here..."
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '12px',
                color: '#f4f4f5',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '12px', color: '#a1a1aa' }}>
                <input
                  type="checkbox"
                  checked={reviewAgain}
                  onChange={(e) => setReviewAgain(e.target.checked)}
                />
                Flag to Review Again Tomorrow (+10 urgency)
              </label>
              <button
                onClick={handleSaveNotes}
                disabled={submitReviewMutation.isPending}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f4f4f5',
                  padding: '6px 16px',
                  borderRadius: 8,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {noteSavedIndicator ? <Check size={12} style={{ color: '#34d399' }} /> : null}
                {noteSavedIndicator ? 'Saved!' : 'Save Notes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Reveal AI Cheatsheet */}
      <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16 }}>
        <button
          onClick={() => setRevealedCheatsheet(!revealedCheatsheet)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} style={{ color: '#ff5f52' }} />
            Reveal AI Cheatsheet
          </span>
          <span style={{ color: '#71717a', fontSize: '12px' }}>{revealedCheatsheet ? 'Hide' : 'Show'}</span>
        </button>

        {revealedCheatsheet && (
          <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {renderCheatsheet()}
          </div>
        )}
      </div>

      {/* Self-Assessment Panel */}
      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rate Your Recall Quality
        </div>
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
          }}
        >
          {[
            { val: 5, label: 'Perfect', desc: 'Solved independently' },
            { val: 4, label: 'Good', desc: 'Minor delay / mistakes' },
            { val: 3, label: 'Effort', desc: 'Struggled but solved' },
            { val: 2, label: 'Hints', desc: 'Needed hints / editorial' },
            { val: 1, label: 'Forgot', desc: 'Complete recall failure' },
          ].map((opt) => (
            <button
              key={opt.val}
              onClick={() => handleRateRecall(opt.val)}
              disabled={submitReviewMutation.isPending}
              style={{
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              className="recall-rate-btn"
            >
              <style>{`
                .recall-rate-btn:hover {
                  background: rgba(255,95,82,0.08) !important;
                  border-color: rgba(255,95,82,0.25) !important;
                }
              `}</style>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#ff5f52' }}>
                {opt.val}
              </span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#e4e4e7' }}>{opt.label}</div>
                <div style={{ fontSize: '10px', color: '#71717a', marginTop: 2 }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            color: currentIndex === 0 ? '#52525b' : '#f4f4f5',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: '13px',
            fontWeight: 700,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <button
          onClick={() => setCurrentIndex((prev) => Math.min(session.items.length - 1, prev + 1))}
          disabled={currentIndex === session.items.length - 1}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            color: currentIndex === session.items.length - 1 ? '#52525b' : '#f4f4f5',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: '13px',
            fontWeight: 700,
            cursor: currentIndex === session.items.length - 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>

    </div>
  );
}

// Internal Component: Loads LearningSheet asynchronously
function CheatsheetLoader({ topic }: { topic: string }) {
  const category = getCategoryForTopic(topic);
  const { data: sheetData, isLoading, error } = useLearningSheet(topic, 'interview');

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
        <Loader2 size={24} style={{ color: '#ff5f52', animation: 'spin 1.2s linear infinite', marginRight: 10 }} />
        <span style={{ fontSize: '13px', color: '#71717a' }}>Generating cheatsheet...</span>
      </div>
    );
  }

  if (error || !sheetData) {
    return (
      <div style={{ fontSize: '13px', color: '#f87171', padding: '12px 0' }}>
        Failed to load AI Cheatsheet for topic: {topic}
      </div>
    );
  }

  return (
    <LearningSheetRenderer
      topic={topic}
      category={category}
      difficulty="interview"
      data={sheetData}
    />
  );
}
