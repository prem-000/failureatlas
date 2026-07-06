'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useSubmissionsList } from '@/hooks/usePhase3Queries';
import { apiFetch } from '@/lib/api/client';
import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BehaviorInsightPanel } from '@/components/intelligence/BehaviorInsightPanel';
import { SuccessInsightPanel } from '@/components/intelligence/SuccessInsightPanel';
import { MobileBottomSheet } from '@/components/ui/MobileBottomSheet';
import {
  ChevronRight,
  Menu,
  Clock,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Trophy,
  ExternalLink,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SubmissionDetail {
  id: string;
  eventId: string;
  status: string;
  language: string;
  code: string;
  runtime: number | null;
  memory: number | null;
  testCasesPassed: number | null;
  totalTestCases: number | null;
  failedTestCase: string | null;
  attemptNumber: number;
  timeSpent: number;
  timestamp: string;
  problem: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    topics: string[];
    url: string | null;
  };
}

interface Hypothesis {
  id: string;
  rootCauseType: string;
  name: string;
  confidence: number;
}

interface DiffOp {
  type: string;
  content: string;
}

interface SubmissionData {
  submission: SubmissionDetail;
  previousSubmission: { eventId: string; status: string; code: string; timestamp: string; attemptNumber: number } | null;
  codeDiff: DiffOp[];
  evidences: Array<{ id: string; type: string; description: string; confidence: number; source: string; extractedAt: string }>;
  rootCauseHypotheses: Hypothesis[];
  diagnosis: {
    id: string;
    primaryWeakness: { id: string; name: string; type: string; severity: string; confidence: number } | null;
    progressMetrics: any;
    recommendations: Array<{
      id: string;
      completed: boolean;
      strategy: { id: string; name: string; description: string; estimatedTime: string; priority: number; practiceProblems: string[] } | null;
    }>;
  } | null;
}

// ─── Colors ────────────────────────────────────────────────────────────────────
const DIFFICULTY_COLORS: Record<string, string> = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Accepted:              { bg: '#052e16', text: '#22c55e', border: '#166534' },
  'Wrong Answer':        { bg: '#450a0a', text: '#ef4444', border: '#991b1b' },
  'Time Limit Exceeded': { bg: '#431407', text: '#f97316', border: '#9a3412' },
  'Runtime Error':       { bg: '#3b0764', text: '#a855f7', border: '#6b21a8' },
};
const EVIDENCE_TYPE_COLORS: Record<string, string> = {
  code_diff: '#3b82f6',
  behavioral: '#f59e0b',
  test_failure: '#ef4444',
};

function weaknessName(id: string): string {
  return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function DiffViewer({ ops }: { ops: DiffOp[] }) {
  const significant = ops.filter(o => o.type !== 'EQUAL');
  if (significant.length === 0) return (
    <div style={{ padding: '20px', color: '#52525b', fontSize: 13, textAlign: 'center' }}>
      No code changes — same code as previous attempt.
    </div>
  );
  return (
    <div className="diff-scroll-wrapper">
      <div style={{ fontFamily: 'monospace', fontSize: 'clamp(10px,2.5vw,12px)', lineHeight: 1.7 }}>
        {ops.map((op, i) => {
          const isInsert = op.type === 'INSERT';
          const isDelete = op.type === 'DELETE';
          if (op.type === 'EQUAL') {
            return (
              <div key={i} style={{ padding: '1px 14px', color: '#3f3f46' }}>
                <span style={{ color: '#52525b', marginRight: 10, userSelect: 'none' }}>&nbsp;</span>
                {op.content}
              </div>
            );
          }
          return (
            <div key={i} style={{
              display: 'flex', gap: 10,
              background: isInsert ? '#052e1630' : '#450a0a30',
              borderLeft: `3px solid ${isInsert ? '#22c55e' : '#ef4444'}`,
              padding: '2px 14px',
            }}>
              <span style={{ color: isInsert ? '#22c55e' : '#ef4444', userSelect: 'none', minWidth: 14, fontWeight: 700 }}>
                {isInsert ? '+' : '−'}
              </span>
              <span style={{ color: isInsert ? '#86efac' : '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {op.content}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfidenceBar({ value, color = '#ff5f52' }: { value: number; color?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 11, color: '#71717a', minWidth: 34 }}>{pct}%</span>
    </div>
  );
}

function SectionCard({ title, accent = '#ff5f52', children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#191919', border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 16, background: accent, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', letterSpacing: '-0.01em' }}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Attempt Timeline ──────────────────────────────────────────────────────────
function AttemptTimeline({ submissions }: { submissions: SubmissionData[] }) {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`
        .timeline-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .timeline-spine {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        .timeline-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }
        .timeline-connector {
          width: 2px;
          flex: 1;
          background: #1f1f1f;
          margin: 4px 0;
          min-height: 20px;
        }
        .timeline-card {
          flex: 1;
          background: #141414;
          border-radius: 10px;
          border: 1px solid #1f1f1f;
          padding: 12px 16px;
          margin-bottom: 12px;
        }
        .timeline-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .timeline-card-metrics {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        @media (max-width: 767px) {
          .timeline-item {
            flex-direction: column !important;
            gap: 8px !important;
            margin-bottom: 16px;
          }
          .timeline-spine {
            flex-direction: row !important;
            width: 100% !important;
            gap: 8px !important;
          }
          .timeline-connector {
            width: 100% !important;
            height: 2px !important;
            min-height: auto !important;
            flex: 1 !important;
            margin: 0 !important;
          }
          .timeline-circle {
            width: 24px !important;
            height: 24px !important;
            font-size: 9px !important;
          }
          .timeline-card {
            width: 100% !important;
            margin-bottom: 0 !important;
            padding: 8px 12px !important;
          }
          .timeline-card-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 4px !important;
          }
          .timeline-card-metrics {
            flex-direction: column !important;
            gap: 6px !important;
          }
        }
      `}</style>
      {submissions.map((sd, i) => {
        const colors = STATUS_COLORS[sd.submission.status] || { bg: '#1a1a1a', text: '#71717a', border: '#2a2a2a' };
        const isLast = i === submissions.length - 1;
        return (
          <div key={sd.submission.eventId} className="timeline-item">
            {/* Timeline spine */}
            <div className="timeline-spine">
              <div className="timeline-circle" style={{
                background: colors.bg, border: `2px solid ${colors.border}`,
                color: colors.text,
              }}>
                {sd.submission.attemptNumber}
              </div>
              {!isLast && <div className="timeline-connector" />}
            </div>

            {/* Card */}
            <div className="timeline-card">
              <div className="timeline-card-header">
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{sd.submission.status}</span>
                <span style={{ fontSize: 11, color: '#52525b' }}>
                  {new Date(sd.submission.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="timeline-card-metrics">
                {sd.submission.runtime != null && (
                  <span style={{ fontSize: 11, color: '#71717a' }}>⚡ {sd.submission.runtime} ms</span>
                )}
                {sd.submission.memory != null && (
                  <span style={{ fontSize: 11, color: '#71717a' }}>💾 {sd.submission.memory} MB</span>
                )}
                {sd.submission.testCasesPassed != null && (
                  <span style={{ fontSize: 11, color: '#71717a' }}>
                    ✅ {sd.submission.testCasesPassed}/{sd.submission.totalTestCases} tests
                  </span>
                )}
                {sd.submission.timeSpent > 0 && (
                  <span style={{ fontSize: 11, color: '#71717a' }}>⏱ {Math.round(sd.submission.timeSpent / 60)} min</span>
                )}
              </div>
              {/* Diff toggle inline */}
              {sd.codeDiff && sd.codeDiff.filter(o => o.type !== 'EQUAL').length > 0 && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ fontSize: 11, color: '#ff5f52', cursor: 'pointer', userSelect: 'none' }}>
                    View code diff ({sd.codeDiff.filter(o => o.type !== 'EQUAL').length} changes)
                  </summary>
                  <div style={{ marginTop: 8, borderRadius: 8, border: '1px solid #1f1f1f', overflow: 'hidden' }}>
                    <DiffViewer ops={sd.codeDiff} />
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ShowMore collapse ─────────────────────────────────────────────────────────
function ShowMoreText({ text, lines = 3 }: { text: string; lines?: number }) {
  const [expanded, setExpanded] = useState(false);
  // Only show toggle on mobile (CSS handles the clamp, we detect if needed via chars)
  const needsTruncation = text.length > 120;
  return (
    <div>
      <p className={needsTruncation && !expanded ? 'show-more-text' : ''} style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>
        {text}
      </p>
      {needsTruncation && (
        <button
          className="show-more-btn compact"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? 'Show Less ▲' : 'Show More ▼'}
        </button>
      )}
    </div>
  );
}

// ─── Mobile Accordion ──────────────────────────────────────────────────────────
interface AccordionSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  content: React.ReactNode;
}

function MobileAccordionList({ sections, defaultOpen }: { sections: AccordionSection[]; defaultOpen?: string }) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen ?? sections[0]?.id ?? null);
  // Track which sections have been mounted (lazy-load content)
  const [mounted, setMounted] = useState<Set<string>>(() => new Set(defaultOpen ? [defaultOpen] : sections[0]?.id ? [sections[0].id] : []));

  const toggle = useCallback((id: string) => {
    setOpenId(prev => {
      const next = prev === id ? null : id;
      if (next) setMounted(m => new Set([...m, next]));
      return next;
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sections.map(sec => {
        const isOpen = openId === sec.id;
        return (
          <div key={sec.id} id={`section-${sec.id}`} className="analysis-accordion-card analysis-section-anchor">
            {/* Trigger */}
            <button
              className="analysis-accordion-trigger compact"
              onClick={() => toggle(sec.id)}
              aria-expanded={isOpen}
              aria-controls={`acc-body-${sec.id}`}
            >
              <div style={{ width: 3, height: 18, background: sec.accent, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', flex: 1, letterSpacing: '-0.01em' }}>
                {sec.icon && <span style={{ marginRight: 6 }}>{sec.icon}</span>}
                {sec.label}
              </span>
              <span style={{ color: '#52525b', transition: 'transform 0.25s', transform: isOpen ? 'rotate(90deg)' : 'none', display: 'flex' }}>
                <ChevronRight size={16} />
              </span>
            </button>

            {/* Body — lazy mount */}
            {isOpen && (
              <div
                id={`acc-body-${sec.id}`}
                className="analysis-accordion-body open"
                role="region"
              >
                {/* Sticky mini-header */}
                <div className="analysis-section-sticky-header">
                  <div style={{ width: 3, height: 14, background: sec.accent, borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: sec.accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {sec.label}
                  </span>
                </div>
                {/* Content — only render after first open */}
                {mounted.has(sec.id) ? sec.content : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Scroll Spy Hook ───────────────────────────────────────────────────────────
function useScrollSpy(ids: string[], rootMargin = '-48px 0px -60% 0px') {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) return;
    const elements = ids.map(id => document.getElementById(`section-${id}`)).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        // Find the topmost visible entry
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          // Pick entry closest to top of viewport
          const top = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          const id = top.target.id.replace('section-', '');
          setActiveId(id);
        }
      },
      { rootMargin, threshold: 0 }
    );

    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [ids.join(','), rootMargin]);

  return activeId;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ProblemDetailPage() {
  const params = useParams();
  const slug = params?.id as string;

  // Behavior insight drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerWeaknessId, setDrawerWeaknessId] = useState('');
  const [drawerWeaknessName, setDrawerWeaknessName] = useState('');

  // Mobile UI state
  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);          // > 0 → shadow on tab bar
  const [showFloating, setShowFloating] = useState(false);  // > 300px → show floating menu btn
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);

  const openDrawer = (weaknessId: string, name: string) => {
    setDrawerWeaknessId(weaknessId);
    setDrawerWeaknessName(name);
    setDrawerOpen(true);
  };

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // Scroll listener for shadow + floating button
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 0);
      setShowFloating(y > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: submissions = [], isLoading: listLoading, error: listError } = useSubmissionsList({
    limit: 50,
    problemSlug: slug,
  });

  const detailQueries = useQueries({
    queries: submissions.slice(0, 5).map((s) => ({
      queryKey: ['submissions', 'detail', s.eventId],
      queryFn: () =>
        apiFetch<{ success: boolean; data: SubmissionData }>(`/api/submissions/${s.eventId}`).then(
          (r) => r.data
        ),
    })),
  });

  const loading = listLoading || detailQueries.some((q) => q.isLoading);
  const error = listError
    ? (listError as Error).message
    : detailQueries.find((q) => q.error)?.error
      ? (detailQueries.find((q) => q.error)!.error as Error).message
      : null;

  const allData = detailQueries.map((q) => q.data).filter(Boolean) as SubmissionData[];

  // ── Compute section IDs eagerly so hooks always run in the same order ──────
  // (Must be before any early returns — Rules of Hooks)
  const sectionIds = useMemo(() => {
    if (!allData.length) return [];
    const isAccepted = allData[0].submission.status === 'Accepted';
    const ids: string[] = [];
    if (isAccepted) ids.push('success');
    ids.push('timeline');
    const evidences = allData.flatMap(d => d.evidences);
    if (!isAccepted && evidences.length > 0) ids.push('evidence');
    const hypotheses = allData.flatMap(d => d.rootCauseHypotheses);
    if (hypotheses.length > 0 && !isAccepted) ids.push('root-cause');
    const diag = allData.find(d => d.diagnosis)?.diagnosis;
    if (diag?.primaryWeakness && !isAccepted) ids.push('growth');
    if (diag?.recommendations?.length && !isAccepted) ids.push('practice');
    return ids;
  }, [allData]);

  // ── Hooks that must run unconditionally (before any early returns) ──────────
  const activeSection = useScrollSpy(sectionIds);

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    if (activeSection && tabRefs.current[activeSection]) {
      tabRefs.current[activeSection]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeSection]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuSheetOpen(false);
  }, []);

  // ── Early returns (all hooks already called above) ──────────────────────────
  if (loading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', height: '100vh', background: '#131313', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #2a2a2a', borderTopColor: '#ff5f52', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#52525b', fontSize: 14 }}>Loading problem analysis…</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AppShell>
    );
  }

  if (error || allData.length === 0) {
    return (
      <AppShell>
        <div style={{ display: 'flex', height: '100vh', background: '#131313', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 40 }}>⚠️</span>
          <span style={{ color: '#ef4444', fontSize: 15 }}>{error || 'No practice sessions found for this problem.'}</span>
          <Link href="/problems" style={{ color: '#ff5f52', fontSize: 13, textDecoration: 'none', marginTop: 8 }}>← Back to Problems</Link>
        </div>
      </AppShell>
    );
  }

  const latest = allData[0];
  const problem = latest.submission.problem;
  const latestDiagnosis = allData.find(d => d.diagnosis)?.diagnosis;
  const allHypotheses = allData.flatMap(d => d.rootCauseHypotheses);
  const allEvidences = allData.flatMap(d => d.evidences);
  const diffColor = DIFFICULTY_COLORS[problem.difficulty] || '#71717a';

  // Deduplicate hypotheses by rootCauseType, keep highest confidence
  const hypothesisMap = new Map<string, Hypothesis>();
  for (const h of allHypotheses) {
    const existing = hypothesisMap.get(h.rootCauseType);
    if (!existing || h.confidence > existing.confidence) hypothesisMap.set(h.rootCauseType, h);
  }
  const topHypotheses = Array.from(hypothesisMap.values()).sort((a, b) => b.confidence - a.confidence).slice(0, 6);

  const isLatestAccepted = latest.submission.status === 'Accepted';
  const latestEventId = latest.submission.eventId;

  // ── Build sections (mobile) ────────────────────────────────────────
  const mobileSections: AccordionSection[] = [];

  // 1. Success Intelligence (accepted only)
  if (isLatestAccepted) {
    mobileSections.push({
      id: 'success',
      label: 'Success Intelligence',
      icon: <Trophy size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />,
      accent: '#22c55e',
      content: (
        <div style={{ padding: '0 0 4px' }}>
          <SuccessInsightPanel submissionId={latestEventId} problemTitle={problem.title} />
        </div>
      ),
    });
  }

  // 2. Primary Growth Area (failed only)
  if (latestDiagnosis?.primaryWeakness && !isLatestAccepted) {
    mobileSections.push({
      id: 'growth',
      label: 'Primary Growth Area',
      icon: <TrendingUp size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />,
      accent: '#a855f7',
      content: (
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#d8b4fe', marginBottom: 6 }}>
            {latestDiagnosis.primaryWeakness.name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: '#ef4444', background: '#450a0a', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
              {latestDiagnosis.primaryWeakness.severity?.toUpperCase()}
            </span>
          </div>
          <ConfidenceBar value={latestDiagnosis.primaryWeakness.confidence} color="#a855f7" />
          <button
            onClick={() => openDrawer(
              latestDiagnosis!.primaryWeakness!.type || latestDiagnosis!.primaryWeakness!.name,
              latestDiagnosis!.primaryWeakness!.name
            )}
            style={{
              marginTop: 14, width: '100%', padding: '10px 0',
              background: '#a855f720', border: '1px solid #a855f740',
              borderRadius: 10, color: '#d8b4fe', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            🧠 View Behavior Analysis →
          </button>
        </div>
      ),
    });
  }

  // 3. Root Cause Analysis (failed only)
  if (topHypotheses.length > 0 && !isLatestAccepted) {
    mobileSections.push({
      id: 'root-cause',
      label: 'Root Cause Analysis',
      icon: <AlertTriangle size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />,
      accent: '#ff5f52',
      content: (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            fontSize: 10, color: '#52525b', background: '#1a1a1a',
            border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', marginBottom: 2,
          }}>
            💡 Tap any root cause to open Behavior Intelligence
          </div>
          {topHypotheses.map(h => (
            <button
              key={h.id}
              onClick={() => openDrawer(h.rootCauseType, h.name)}
              style={{
                width: '100%', textAlign: 'left', background: '#141414',
                border: '1px solid #1f1f1f', borderRadius: 10, padding: '12px 14px',
                cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
              }}
              onTouchStart={e => { (e.currentTarget as HTMLElement).style.borderColor = '#ff5f5260'; }}
              onTouchEnd={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1f1f1f'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 600 }}>{h.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#71717a' }}>{Math.round(h.confidence * 100)}%</span>
                  <span style={{ fontSize: 10, color: '#ff5f5280' }}>→</span>
                </div>
              </div>
              <ConfidenceBar value={h.confidence} color="#ff5f52" />
              <div style={{ fontSize: 10, color: '#52525b', marginTop: 4 }}>{h.rootCauseType}</div>
            </button>
          ))}
        </div>
      ),
    });
  }

  // 4. Evidence (failed only)
  if (!isLatestAccepted && allEvidences.length > 0) {
    mobileSections.push({
      id: 'evidence',
      label: 'Evidence Collected',
      icon: <BookOpen size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />,
      accent: '#f59e0b',
      content: (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allEvidences.slice(0, 8).map(ev => (
            <div key={ev.id} style={{ background: '#141414', borderRadius: 10, padding: '10px 14px', border: '1px solid #1f1f1f' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  color: EVIDENCE_TYPE_COLORS[ev.type] || '#71717a',
                  background: `${EVIDENCE_TYPE_COLORS[ev.type] || '#71717a'}22`,
                  letterSpacing: '0.06em',
                }}>
                  {ev.type.replace('_', ' ').toUpperCase()}
                </span>
                <span style={{ fontSize: 10, color: '#52525b' }}>{ev.source}</span>
              </div>
              <ShowMoreText text={ev.description} />
              <div style={{ marginTop: 6 }}>
                <ConfidenceBar value={ev.confidence} color={EVIDENCE_TYPE_COLORS[ev.type] || '#71717a'} />
              </div>
            </div>
          ))}
        </div>
      ),
    });
  }

  // 5. Practice Recommendations (failed only)
  if (latestDiagnosis?.recommendations && latestDiagnosis.recommendations.length > 0 && !isLatestAccepted) {
    mobileSections.push({
      id: 'practice',
      label: 'Targeted Practice',
      icon: <BookOpen size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />,
      accent: '#22c55e',
      content: (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {latestDiagnosis.recommendations.map(r => r.strategy && (
            <div key={r.id} style={{ background: '#052e1615', border: '1px solid #166534', borderRadius: 10, padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#86efac' }}>{r.strategy.name}</span>
                <span style={{ fontSize: 10, color: '#22c55e', background: '#052e16', borderRadius: 4, padding: '2px 6px' }}>
                  P{r.strategy.priority}
                </span>
              </div>
              <ShowMoreText text={r.strategy.description} />
              {r.strategy.estimatedTime && (
                <div style={{ fontSize: 10, color: '#166534', marginTop: 6 }}>⏱ {r.strategy.estimatedTime}</div>
              )}
              {r.strategy.practiceProblems?.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {r.strategy.practiceProblems.slice(0, 4).map(p => (
                    <span key={p} style={{ fontSize: 10, color: '#71717a', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 7px' }}>
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ),
    });
  }

  // 6. Attempt Timeline (always, at the bottom)
  mobileSections.push({
    id: 'timeline',
    label: 'Attempt Timeline',
    icon: <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />,
    accent: '#3b82f6',
    content: <AttemptTimeline submissions={allData} />,
  });

  // (sectionIds, activeSection, tabRefs, scrollToSection are all computed before early returns above)

  // ── Bottom sheet nav content ──────────────────────────────────────────────────
  const menuSheetContent = (
    <div style={{ padding: '16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Jump to Section
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {mobileSections.map(sec => (
          <button
            key={sec.id}
            onClick={() => scrollToSection(sec.id)}
            style={{
              width: '100%', textAlign: 'left', background: activeSection === sec.id ? `${sec.accent}15` : '#141414',
              border: `1px solid ${activeSection === sec.id ? sec.accent + '40' : '#1f1f1f'}`,
              borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
            }}
          >
            <div style={{ width: 3, height: 18, background: sec.accent, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: activeSection === sec.id ? sec.accent : '#e4e4e7' }}>
              {sec.label}
            </span>
            {activeSection === sec.id && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: sec.accent, fontWeight: 700 }}>← HERE</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AppShell>
      <style>{`
        .problem-grid {
          display: grid;
          grid-template-columns: 1fr clamp(280px, 26vw, 380px);
          gap: 24px;
          padding: 24px 28px;
          align-items: start;
        }
        @media (max-width: 767px) {
          .problem-grid {
            grid-template-columns: 1fr !important;
            padding: 12px !important;
            gap: 0 !important;
            /* Extra bottom padding: floating CTA (~52px) + menu btn (~44px) + tab bar bottom nav (~64px) + safe area + spacing */
            padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 130px) !important;
          }
        }
        @media (max-width: 1023px) and (min-width: 768px) {
          .problem-grid {
            grid-template-columns: 1fr !important;
            padding: 16px 20px !important;
            gap: 16px !important;
          }
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '100%',
        minHeight: '100vh',
        background: '#131313',
        overflowX: 'clip',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ padding: 'clamp(14px, 4vw, 20px) clamp(14px, 4vw, 28px)', borderBottom: '1px solid #1f1f1f', background: '#161616' }}>
          <Link href="/problems" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#71717a', textDecoration: 'none', marginBottom: 12 }}>
            ← Problem Tracker
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'clamp(17px, 4vw, 22px)', fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.03em', wordBreak: 'break-word' }}>
                  {problem.title}
                </span>
                <span className="compact" style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  color: diffColor, background: `${diffColor}22`, flexShrink: 0,
                }}>
                  {problem.difficulty}
                </span>
                {isLatestAccepted && (
                  <span className="compact" style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                    color: '#22c55e', background: '#052e16', border: '1px solid #166534', flexShrink: 0,
                  }}>
                    ✓ Accepted
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(problem.topics || []).map(t => (
                  <span key={t} className="compact" style={{ fontSize: 10, color: '#71717a', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 8px' }}>{t}</span>
                ))}
              </div>
            </div>
            {/* Desktop: Open Problem button stays in header */}
            <div className="problem-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#71717a' }}>{allData.length} attempt{allData.length !== 1 ? 's' : ''}</span>
              {problem.url && (
                <a href={problem.url} target="_blank" rel="noreferrer" className="hidden md:inline-flex" style={{
                  fontSize: 12, color: '#ff5f52', textDecoration: 'none', background: '#ff5f5215',
                  border: '1px solid #ff5f5230', borderRadius: 7, padding: '7px 14px', fontWeight: 600,
                }}>
                  Open Problem ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Sticky Section Tab Bar (mobile-only) ─────────────────────────── */}
        <nav
          className={`analysis-sticky-nav${scrolled ? ' scrolled' : ''}`}
          aria-label="Analysis sections"
        >
          {mobileSections.map(sec => (
            <button
              key={sec.id}
              ref={el => { tabRefs.current[sec.id] = el; }}
              className={`analysis-nav-tab compact${activeSection === sec.id ? ' active' : ''}`}
              onClick={() => scrollToSection(sec.id)}
            >
              {sec.label}
            </button>
          ))}
        </nav>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        {isMobile ? (
          /* ── MOBILE: Flat single-column layout ── */
          <div className="problem-grid flex flex-col gap-4 w-full max-w-full">
            {mobileSections.map((sec) => (
              <div
                key={sec.id}
                id={`section-${sec.id}`}
                className="analysis-section-anchor w-full max-w-full"
              >
                <SectionCard title={sec.label} accent={sec.accent}>
                  <div style={{ padding: '0px' }}>{sec.content}</div>
                </SectionCard>
              </div>
            ))}
          </div>
        ) : (          /* ── DESKTOP: Original 2-column grid ──────────────────────────── */
          <div className="problem-grid">
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {isLatestAccepted && (
                <SuccessInsightPanel submissionId={latestEventId} problemTitle={problem.title} />
              )}
              <SectionCard title="Attempt Timeline" accent="#3b82f6">
                <AttemptTimeline submissions={allData} />
              </SectionCard>
              {!isLatestAccepted && allEvidences.length > 0 && (
                <SectionCard title="Evidence Collected" accent="#f59e0b">
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {allEvidences.slice(0, 8).map(ev => (
                      <div key={ev.id} style={{ background: '#141414', borderRadius: 8, padding: '10px 14px', border: '1px solid #1f1f1f' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                            color: EVIDENCE_TYPE_COLORS[ev.type] || '#71717a',
                            background: `${EVIDENCE_TYPE_COLORS[ev.type] || '#71717a'}22`,
                            letterSpacing: '0.06em',
                          }}>
                            {ev.type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span style={{ fontSize: 10, color: '#52525b' }}>{ev.source}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5, marginBottom: 6 }}>{ev.description}</div>
                        <ConfidenceBar value={ev.confidence} color={EVIDENCE_TYPE_COLORS[ev.type] || '#71717a'} />
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {topHypotheses.length > 0 && !isLatestAccepted && (
                <SectionCard title="Root Cause Analysis" accent="#ff5f52">
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{
                      fontSize: 10, color: '#52525b', background: '#1a1a1a',
                      border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', marginBottom: 2,
                    }}>
                      💡 Click any root cause to open Behavior Intelligence
                    </div>
                    {topHypotheses.map(h => (
                      <button
                        key={h.id}
                        onClick={() => openDrawer(h.rootCauseType, h.name)}
                        style={{
                          width: '100%', textAlign: 'left', background: '#141414',
                          border: '1px solid #1f1f1f', borderRadius: 8, padding: '10px 12px',
                          cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = '#ff5f5260';
                          (e.currentTarget as HTMLElement).style.background = '#1f1212';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = '#1f1f1f';
                          (e.currentTarget as HTMLElement).style.background = '#141414';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: '#e4e4e7', fontWeight: 500 }}>{h.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#71717a' }}>{Math.round(h.confidence * 100)}%</span>
                            <span style={{ fontSize: 10, color: '#ff5f5280' }}>→</span>
                          </div>
                        </div>
                        <ConfidenceBar value={h.confidence} color="#ff5f52" />
                        <div style={{ fontSize: 10, color: '#52525b', marginTop: 4 }}>{h.rootCauseType}</div>
                      </button>
                    ))}
                  </div>
                </SectionCard>
              )}

              {latestDiagnosis?.primaryWeakness && !isLatestAccepted && (
                <SectionCard title="Primary Growth Area" accent="#a855f7">
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#d8b4fe', marginBottom: 6 }}>
                      {latestDiagnosis.primaryWeakness.name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 10, color: '#ef4444', background: '#450a0a', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                        {latestDiagnosis.primaryWeakness.severity?.toUpperCase()}
                      </span>
                    </div>
                    <ConfidenceBar value={latestDiagnosis.primaryWeakness.confidence} color="#a855f7" />
                    <button
                      onClick={() => openDrawer(
                        latestDiagnosis!.primaryWeakness!.type || latestDiagnosis!.primaryWeakness!.name,
                        latestDiagnosis!.primaryWeakness!.name
                      )}
                      style={{
                        marginTop: 12, width: '100%', padding: '8px 0',
                        background: '#a855f720', border: '1px solid #a855f740',
                        borderRadius: 7, color: '#d8b4fe', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#a855f730')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#a855f720')}
                    >
                      🧠 View Behavior Analysis →
                    </button>
                  </div>
                </SectionCard>
              )}

              {latestDiagnosis?.recommendations && latestDiagnosis.recommendations.length > 0 && !isLatestAccepted && (
                <SectionCard title="Targeted Practice" accent="#22c55e">
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {latestDiagnosis.recommendations.map(r => r.strategy && (
                      <div key={r.id} style={{ background: '#052e1615', border: '1px solid #166534', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#86efac' }}>{r.strategy.name}</span>
                          <span style={{ fontSize: 10, color: '#22c55e', background: '#052e16', borderRadius: 4, padding: '2px 6px' }}>
                            P{r.strategy.priority}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 8, lineHeight: 1.4 }}>{r.strategy.description}</div>
                        {r.strategy.estimatedTime && (
                          <div style={{ fontSize: 10, color: '#166534' }}>⏱ {r.strategy.estimatedTime}</div>
                        )}
                        {r.strategy.practiceProblems?.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {r.strategy.practiceProblems.slice(0, 4).map(p => (
                              <span key={p} style={{ fontSize: 10, color: '#71717a', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 7px' }}>
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Floating "Analysis Menu" button (mobile-only, appears after 300px scroll) ── */}
      {isMobile && showFloating && (
        <button
          className="floating-menu-btn compact"
          onClick={() => setMenuSheetOpen(true)}
          aria-label="Open analysis menu"
        >
          <Menu size={14} />
          Analysis Menu
        </button>
      )}

      {/* ── Floating "Open Problem" CTA (mobile-only) ──────────────────────── */}
      {isMobile && problem.url && (
        <div className="floating-open-problem">
          <a href={problem.url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Open Problem
          </a>
        </div>
      )}

      {/* ── Bottom Sheet: Section Navigation ───────────────────────────────── */}
      <MobileBottomSheet
        isOpen={menuSheetOpen}
        onClose={() => setMenuSheetOpen(false)}
        defaultHeight="half"
        title="Analysis Navigation"
      >
        {menuSheetContent}
      </MobileBottomSheet>

      {/* ── Behavior Insight Drawer ─────────────────────────────────────────── */}
      <BehaviorInsightPanel
        weaknessId={drawerWeaknessId}
        weaknessName={drawerWeaknessName}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </AppShell>
  );
}
