'use client';

import React, { useState } from 'react';
import {
  Layers,
  Clock,
  ExternalLink,
  Loader2,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Award,
  Zap,
  Percent,
} from 'lucide-react';
import {
  usePracticeQueue,
  useSubmitReview,
  PracticeReviewStateData,
} from '@/hooks/usePracticeQueue';

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

const getMasteryStage = (repetitions: number) => {
  if (repetitions <= 1) return { label: 'Learning', icon: '◔', color: '#f87171' };
  if (repetitions === 2) return { label: 'Practicing', icon: '◑', color: '#fb923c' };
  if (repetitions === 3 || repetitions === 4) return { label: 'Stable', icon: '◕', color: '#60a5fa' };
  return { label: 'Mastered', icon: '●', color: '#34d399' };
};

const getDueText = (nextReviewStr: string) => {
  const nextReview = new Date(nextReviewStr);
  nextReview.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = nextReview.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return `Overdue by ${absDays} ${absDays === 1 ? 'day' : 'days'}`;
  }
  if (diffDays === 0) return 'Due Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === 7) return 'In 1 week';
  if (diffDays > 7 && diffDays % 7 === 0) {
    const weeks = diffDays / 7;
    return `In ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  return `In ${diffDays} days`;
};

export function PracticeQueue() {
  const { data, isLoading, error, refetch } = usePracticeQueue();
  const submitReviewMutation = useSubmitReview();
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px' }}>
        <Loader2 size={40} style={{ color: '#ff5f52', animation: 'spin 1.2s linear infinite', marginBottom: 16 }} />
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#f4f4f5' }}>Loading review queue...</div>
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

  const queue = data?.queue || [];
  const upcoming = data?.upcoming || [];
  const totalCount = data?.totalCount || 0;
  const reviewedToday = data?.reviewedToday || 0;
  const statistics = data?.statistics || {
    reviewsCompleted: 0,
    currentStreak: 0,
    averageRecall: 0,
    retentionRate: 0,
  };

  const handleStartReview = (problem: PracticeReviewStateData) => {
    setActiveReviewId(problem.id);
    let url = '';
    if (problem.platform === 'LeetCode') {
      url = `https://leetcode.com/problems/${problem.problemId}/`;
    } else if (problem.platform === 'Codeforces') {
      const contestId = problem.problemId.replace(/[^0-9]/g, '');
      const index = problem.problemId.replace(/[0-9]/g, '');
      url = contestId && index ? `https://codeforces.com/problemset/problem/${contestId}/${index}` : 'https://codeforces.com/';
    } else if (problem.platform === 'CodeChef') {
      url = `https://www.codechef.com/problems/${problem.problemId}`;
    } else if (problem.platform === 'AtCoder') {
      url = `https://atcoder.jp/contests/archive/tasks/${problem.problemId}`;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRateRecall = async (id: string, quality: number) => {
    try {
      await submitReviewMutation.mutateAsync({ id, quality });
      setActiveReviewId(null);
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  const handleReviewAll = () => {
    if (queue.length > 0) {
      handleStartReview(queue[0]);
    }
  };

  // Empty State (No review states scheduled yet)
  if (totalCount === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f4f4f5', margin: 0 }}>
            Practice Queue
          </h2>
          <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0' }}>
            Keep your solved problems fresh using spaced repetition.
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
          <Layers size={40} style={{ color: '#ff5f52', opacity: 0.6 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f4f4f5', margin: 0 }}>No practice scheduled yet.</h3>
            <p style={{ fontSize: '13px', color: '#71717a', maxWidth: 400, margin: 0 }}>
              Solve your first accepted problem to begin building your review queue.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f4f4f5', margin: 0 }}>
            Practice Queue
          </h2>
          <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0' }}>
            Keep your solved problems fresh using spaced repetition.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'rgba(255,95,82,0.06)', border: '1px solid rgba(255,95,82,0.15)', borderRadius: 10, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={13} style={{ color: '#ff5f52' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ff5f52' }}>{queue.length} Due Today</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={13} style={{ color: '#fb923c' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5' }}>{reviewedToday} Done Today</span>
          </div>
        </div>
      </div>

      {/* Due reviews section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f4f4f5', margin: 0 }}>
            Today's Reviews ({queue.length})
          </h3>
          {queue.length > 0 && (
            <button
              onClick={handleReviewAll}
              style={{
                background: '#ff5f52',
                border: 'none',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              className="review-all-btn"
            >
              <style>{`.review-all-btn:hover { background: #e54e41 !important; }`}</style>
              Review All
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '36px 24px', background: 'rgba(52,211,153,0.02)', border: '1px solid rgba(52,211,153,0.08)', borderRadius: 16, textAlign: 'center' }}>
            <CheckCircle2 size={32} style={{ color: '#34d399', opacity: 0.8 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f5' }}>Today's Practice Complete</div>
              <div style={{ fontSize: '12px', color: '#71717a' }}>Excellent recall session! You have cleared all scheduled items from your queue.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {queue.map((item) => {
              const isOverdue = new Date(item.nextReview).getTime() < new Date().setHours(0, 0, 0, 0);
              const isCurrentlyActive = activeReviewId === item.id;
              const mastery = getMasteryStage(item.repetitions);
              const dueText = getDueText(item.nextReview);

              return (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: 16,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    transition: 'all 200ms',
                    boxShadow: isCurrentlyActive ? '0 0 20px rgba(255,95,82,0.05)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: isOverdue ? '#ef4444' : '#ff5f52', fontWeight: 800 }}>
                          {dueText}
                        </span>
                        <span style={{ color: '#3f3f46' }}>•</span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            color: PLATFORM_COLORS[item.platform],
                            background: `${PLATFORM_COLORS[item.platform]}12`,
                            border: `1px solid ${PLATFORM_COLORS[item.platform]}25`,
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {item.platform}
                        </span>
                        <span style={{ color: '#3f3f46' }}>•</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f4f4f5' }}>{item.title}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '11px', color: '#71717a' }}>
                        <span style={{ color: DIFF_COLORS[item.difficulty], fontWeight: 700 }}>
                          {item.difficulty}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: mastery.color, fontWeight: 800 }}>{mastery.icon}</span>
                          <span>{mastery.label}</span>
                        </span>
                        <span>•</span>
                        <span>Interval: {item.interval} {item.interval === 1 ? 'day' : 'days'}</span>
                        <span>•</span>
                        <span>EF: {item.easeFactor.toFixed(2)}</span>
                      </div>
                    </div>

                    {!isCurrentlyActive ? (
                      <button
                        onClick={() => handleStartReview(item)}
                        style={{
                          background: 'rgba(255,95,82,0.1)',
                          border: '1px solid rgba(255,95,82,0.2)',
                          color: '#ff5f52',
                          padding: '8px 16px',
                          borderRadius: 10,
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 150ms',
                        }}
                      >
                        <span>Review</span>
                        <ExternalLink size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveReviewId(null)}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#a1a1aa',
                          padding: '8px 16px',
                          borderRadius: 10,
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Rating Assessment Panel */}
                  {isCurrentlyActive && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Rate Your Recall Quality
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }} className="sm:grid-cols-5">
                        <style>{`
                          @media (min-width: 640px) {
                            .sm\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
                          }
                        `}</style>
                        {[
                          { val: 5, icon: '●', label: 'Solved Independently', desc: 'Flawless recall' },
                          { val: 4, icon: '◕', label: 'Solved After Thinking', desc: 'Minor delay' },
                          { val: 3, icon: '◐', label: 'Solved With Difficulty', desc: 'Struggled to finish' },
                          { val: 2, icon: '◑', label: 'Needed Editorial', desc: 'Read hint/editorial' },
                          { val: 1, icon: '○', label: "Couldn't Solve", desc: 'Full recall failure' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => handleRateRecall(item.id, opt.val)}
                            disabled={submitReviewMutation.isPending}
                            style={{
                              background: 'rgba(0,0,0,0.15)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 12,
                              padding: '12px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              transition: 'all 150ms',
                            }}
                            className="hover-recall-btn"
                          >
                            <style>{`
                              .hover-recall-btn:hover {
                                background: rgba(255,95,82,0.06) !important;
                                border-color: rgba(255,95,82,0.2) !important;
                              }
                            `}</style>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: '#ff5f52' }}>{opt.icon}</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#e4e4e7', whiteSpace: 'nowrap' }}>{opt.label}</span>
                              <span style={{ fontSize: '9px', color: '#71717a' }}>{opt.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming reviews section */}
      {upcoming.length > 0 && (
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f4f4f5', marginBottom: 16 }}>
            Upcoming Reviews ({upcoming.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.slice(0, 10).map((item) => {
              const mastery = getMasteryStage(item.repetitions);
              const dueText = getDueText(item.nextReview);

              return (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(255,255,255,0.005)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    padding: '12px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        color: PLATFORM_COLORS[item.platform],
                        background: `${PLATFORM_COLORS[item.platform]}12`,
                        border: `1px solid ${PLATFORM_COLORS[item.platform]}25`,
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {item.platform}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>{item.title}</span>
                    <span style={{ fontSize: '11px', color: DIFF_COLORS[item.difficulty], fontWeight: 500 }}>
                      {item.difficulty}
                    </span>
                    <span style={{ color: '#27272a', fontSize: '12px' }}>•</span>
                    <span style={{ fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: mastery.color }}>{mastery.icon}</span>
                      <span>{mastery.label}</span>
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#71717a', fontWeight: 600 }}>
                    {dueText}
                  </div>
                </div>
              );
            })}
            {upcoming.length > 10 && (
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#52525b', marginTop: 4 }}>
                And {upcoming.length - 10} more scheduled problems...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Section */}
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f4f4f5', marginBottom: 16 }}>
          Statistics
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          
          {/* Reviews Completed */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,95,82,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={20} style={{ color: '#ff5f52' }} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f4f4f5', lineHeight: 1.1 }}>
                {statistics.reviewsCompleted}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                Reviews Completed
              </div>
            </div>
          </div>

          {/* Current Streak */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(251,146,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} style={{ color: '#fb923c' }} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f4f4f5', lineHeight: 1.1 }}>
                {statistics.currentStreak} {statistics.currentStreak === 1 ? 'day' : 'days'}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                Current Streak
              </div>
            </div>
          </div>

          {/* Average Recall */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(96,165,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f4f4f5', lineHeight: 1.1 }}>
                {statistics.averageRecall.toFixed(1)} / 5.0
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                Average Recall
              </div>
            </div>
          </div>

          {/* Retention Rate */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Percent size={18} style={{ color: '#34d399' }} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f4f4f5', lineHeight: 1.1 }}>
                {statistics.retentionRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                Retention Rate
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
