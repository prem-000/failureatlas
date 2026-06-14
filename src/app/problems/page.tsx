'use client';
import { AppShell } from '@/components/layout/AppShell';
import { useSubmissionDetail, useSubmissionsList, type SubmissionListItem } from '@/hooks/usePhase3Queries';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Submission = SubmissionListItem;

interface ProblemGroup {
  slug: string;
  title: string;
  submissions: Submission[];
  lastStatus: string;
  totalAttempts: number;
  difficulty?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Accepted:               { bg: '#052e16', text: '#22c55e' },
  'Wrong Answer':         { bg: '#450a0a', text: '#ef4444' },
  'Time Limit Exceeded':  { bg: '#431407', text: '#f97316' },
  'Runtime Error':        { bg: '#3b0764', text: '#a855f7' },
  'Memory Limit Exceeded':{ bg: '#1c1917', text: '#78716c' },
  'Compilation Error':    { bg: '#1c1917', text: '#78716c' },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || { bg: '#1a1a1a', text: '#71717a' };
  const short = status === 'Time Limit Exceeded' ? 'TLE'
    : status === 'Memory Limit Exceeded' ? 'MLE'
    : status === 'Wrong Answer' ? 'WA'
    : status === 'Runtime Error' ? 'RE'
    : status === 'Compilation Error' ? 'CE'
    : status;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
      background: colors.bg, color: colors.text, letterSpacing: '0.04em',
    }}>
      {short}
    </span>
  );
}

// ─── Diff Viewer ───────────────────────────────────────────────────────────────
function DiffViewer({ ops }: { ops: Array<{ type: string; content: string }> }) {
  if (!ops || ops.length === 0) return (
    <div style={{ fontSize: 12, color: '#52525b', padding: '12px 16px' }}>No diff available for this submission.</div>
  );

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6, overflowX: 'auto' }}>
      {ops.filter(op => op.type !== 'EQUAL').map((op, i) => {
        const isAdd = op.type === 'INSERT';
        return (
          <div key={i} style={{
            display: 'flex', gap: 8,
            background: isAdd ? '#052e1622' : '#450a0a22',
            borderLeft: `3px solid ${isAdd ? '#22c55e' : '#ef4444'}`,
            padding: '2px 10px',
          }}>
            <span style={{ color: isAdd ? '#22c55e' : '#ef4444', userSelect: 'none', minWidth: 12 }}>
              {isAdd ? '+' : '−'}
            </span>
            <span style={{ color: isAdd ? '#86efac' : '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {op.content}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Expanded Problem Row ──────────────────────────────────────────────────────
function ExpandedRow({ slug, submissions }: { slug: string; submissions: Submission[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detail, isLoading: loading } = useSubmissionDetail(selectedId);

  const loadDetail = useCallback((eventId: string) => {
    if (selectedId === eventId) {
      setSelectedId(null);
      return;
    }
    setSelectedId(eventId);
  }, [selectedId]);

  return (
    <div style={{ padding: '16px 24px 20px', background: '#111111', borderTop: '1px solid #1a1a1a' }}>
      <div style={{ fontSize: 11, color: '#52525b', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Attempt History
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {submissions.map(sub => (
          <div key={sub.eventId}>
            <button
              onClick={() => loadDetail(sub.eventId)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                background: selectedId === sub.eventId ? '#1a1a1a' : 'transparent',
                border: `1px solid ${selectedId === sub.eventId ? '#2a2a2a' : 'transparent'}`,
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <StatusBadge status={sub.submissionStatus} />
              <span style={{ fontSize: 12, color: '#a1a1aa' }}>
                Attempt #{sub.attemptNumber}
              </span>
              <span style={{ fontSize: 11, color: '#52525b', marginLeft: 'auto' }}>
                {new Date(sub.timestamp).toLocaleString()}
              </span>
              <span style={{ color: '#52525b', fontSize: 12 }}>
                {selectedId === sub.eventId ? '▲' : '▼'}
              </span>
            </button>

            {selectedId === sub.eventId && (
              <div style={{ marginTop: 8, background: '#161616', borderRadius: 8, border: '1px solid #1f1f1f', overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#52525b', fontSize: 13 }}>Loading diff…</div>
                ) : detail ? (
                  <>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid #1f1f1f', display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#71717a' }}>
                        vs Attempt #{(detail as { previousSubmission?: { attemptNumber?: number } }).previousSubmission?.attemptNumber ?? '—'}
                      </span>
                      <span style={{ fontSize: 11, color: '#52525b' }}>
                        {((detail as { codeDiff?: Array<{ type: string }> }).codeDiff?.filter((o) => o.type !== 'EQUAL').length) ?? 0} changes
                      </span>
                      <Link href={`/problems/${slug}`} style={{ marginLeft: 'auto', fontSize: 11, color: '#ff5f52', textDecoration: 'none' }}>
                        Full Analysis →
                      </Link>
                    </div>
                    <DiffViewer ops={(detail as { codeDiff?: Array<{ type: string; content: string }> }).codeDiff || []} />
                  </>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>Failed to load detail.</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ProblemsPage() {
  const { data: submissions = [], isLoading: loading, error: queryError } = useSubmissionsList({ limit: 500 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'attempts' | 'alpha'>('recent');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const error = queryError ? (queryError as Error).message : null;

  const groups = useMemo(() => {
    const map = new Map<string, ProblemGroup>();
    for (const sub of submissions) {
      if (!map.has(sub.problemSlug)) {
        map.set(sub.problemSlug, {
          slug: sub.problemSlug,
          title: sub.problemTitle,
          submissions: [],
          lastStatus: sub.submissionStatus,
          totalAttempts: 0,
        });
      }
      const g = map.get(sub.problemSlug)!;
      g.submissions.push(sub);
      g.totalAttempts++;
      if (sub.timestamp > (g.submissions[0]?.timestamp ?? 0)) {
        g.lastStatus = sub.submissionStatus;
      }
    }
    return Array.from(map.values());
  }, [submissions]);

  const filtered = useMemo(() => {
    let arr = [...groups];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(g => g.title.toLowerCase().includes(q) || g.slug.includes(q));
    }
    if (statusFilter !== 'all') {
      arr = arr.filter(g => {
        if (statusFilter === 'solved') return g.lastStatus === 'Accepted';
        if (statusFilter === 'unsolved') return g.lastStatus !== 'Accepted';
        return true;
      });
    }
    if (sortBy === 'recent') {
      arr.sort((a, b) => (b.submissions[0]?.timestamp ?? 0) - (a.submissions[0]?.timestamp ?? 0));
    } else if (sortBy === 'attempts') {
      arr.sort((a, b) => b.totalAttempts - a.totalAttempts);
    } else {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    }
    return arr;
  }, [groups, search, statusFilter, sortBy]);

  const toggleExpanded = (slug: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <AppShell>
      <style>{`
        @media (max-width: 768px) {
          .problems-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 8px; }
          .problems-table-inner { min-width: 700px; }
        }
      `}</style>
    <div style={{ width: '100%', minHeight: '100vh', background: '#131313', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid #1f1f1f', background: '#161616' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f52', boxShadow: '0 0 8px #ff5f52' }} />
          <span style={{ fontSize: '17px', fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
            Problem Tracker
          </span>
          <span style={{ fontSize: 12, color: '#52525b', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20, padding: '2px 10px' }}>
            {filtered.length} problems
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search problems…"
            style={{
              flex: '1 1 240px', background: '#1a1a1a', border: '1px solid #2a2a2a',
              borderRadius: 8, padding: '8px 14px', color: '#f4f4f5', fontSize: 13, outline: 'none',
            }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#a1a1aa', fontSize: 13, outline: 'none' }}
          >
            <option value="all">All Status</option>
            <option value="solved">Solved</option>
            <option value="unsolved">Unsolved</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#a1a1aa', fontSize: 13, outline: 'none' }}
          >
            <option value="recent">Most Recent</option>
            <option value="attempts">Most Attempts</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, padding: '20px 28px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, gap: 12 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #2a2a2a', borderTopColor: '#ff5f52', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#52525b', fontSize: 14 }}>Loading submissions…</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#ef4444' }}>{error}</div>
        ) : paged.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ color: '#71717a', fontSize: 16, fontWeight: 600 }}>No problems found</div>
            <div style={{ color: '#52525b', fontSize: 13, marginTop: 6 }}>
              {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Submit a problem attempt to start tracking.'}
            </div>
          </div>
        ) : (
          <>
            <div className="problems-table-wrapper">
              <div className="problems-table-inner">
            {/* Column Headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 90px 100px 120px 48px',
              gap: 12, padding: '8px 16px', marginBottom: 6,
            }}>
              {['Problem', 'Status', 'Attempts', 'Last Seen', 'Analysis', ''].map(h => (
                <span key={h} style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {paged.map(g => (
                <div key={g.slug} style={{ background: '#191919', borderRadius: 10, border: '1px solid #1f1f1f', overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleExpanded(g.slug)}
                    style={{
                      width: '100%', display: 'grid', gridTemplateColumns: '1fr 100px 90px 100px 120px 48px',
                      gap: 12, padding: '14px 16px', background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'left', alignItems: 'center',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 13, color: '#f4f4f5', fontWeight: 500 }}>{g.title}</span>
                    <div><StatusBadge status={g.lastStatus} /></div>
                    <span style={{ fontSize: 13, color: '#a1a1aa' }}>{g.totalAttempts}</span>
                    <span style={{ fontSize: 12, color: '#52525b' }}>
                      {new Date(g.submissions[0]?.timestamp ?? 0).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/problems/${g.slug}`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        fontSize: 11, color: '#ff5f52', textDecoration: 'none', fontWeight: 600,
                        background: '#ff5f5215', border: '1px solid #ff5f5230', borderRadius: 6,
                        padding: '4px 10px',
                      }}
                    >
                      Full Analysis
                    </Link>
                    <span style={{ color: '#52525b', fontSize: 14, textAlign: 'center' }}>
                      {expanded.has(g.slug) ? '▲' : '▼'}
                    </span>
                  </button>
                  {expanded.has(g.slug) && (
                    <ExpandedRow slug={g.slug} submissions={g.submissions} />
                  )}
                </div>
              ))}
            </div>
            </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7, padding: '7px 14px', color: page === 0 ? '#3f3f46' : '#a1a1aa', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: 13, color: '#52525b' }}>Page {page + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7, padding: '7px 14px', color: page >= totalPages - 1 ? '#3f3f46' : '#a1a1aa', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </AppShell>
  );
}
