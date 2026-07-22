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
import { AiJudgeRepairPanel } from '@/components/intelligence/AiJudgeRepairPanel';
import { MobileBottomSheet } from '@/components/ui/MobileBottomSheet';
import {
  Menu,
  ExternalLink,
} from 'lucide-react';

// Imported modular components
import { SectionCard } from '@/components/ui/SectionCard';
import { type DiffOp } from './components/DiffViewer';
import { ConfidenceBar } from './components/ConfidenceBar';
import { AttemptTimeline } from './components/AttemptTimeline';
import { useScrollSpy } from './hooks/useScrollSpy';

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


// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ProblemDetailPage() {
  const params = useParams();
  const slug = params?.id as string;

  // Behavior insight drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerWeaknessId, setDrawerWeaknessId] = useState('');
  const [drawerWeaknessName, setDrawerWeaknessName] = useState('');
  const [drawerSubmissionId, setDrawerSubmissionId] = useState('');

  // Mobile UI state
  const [scrolled, setScrolled] = useState(false);          // > 0 → shadow on tab bar
  const [showFloating, setShowFloating] = useState(false);  // > 300px → show floating menu btn
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);

  const openDrawer = (weaknessId: string, name: string, submissionId?: string) => {
    setDrawerWeaknessId(weaknessId);
    setDrawerWeaknessName(name);
    setDrawerSubmissionId(submissionId || submissions[0]?.eventId || '');
    setDrawerOpen(true);
  };

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
    const isWrongAnswer = allData[0].submission.status === 'Wrong Answer';
    const ids: string[] = [];
    if (isAccepted) {
      ids.push('success', 'timeline');
      return ids;
    }
    if (isWrongAnswer) {
      ids.push('repair');
      const evidences = allData.flatMap(d => d.evidences);
      if (evidences.length > 0) ids.push('evidence');
      ids.push('timeline');
      return ids;
    }
    ids.push('timeline');
    const evidences = allData.flatMap(d => d.evidences);
    if (evidences.length > 0) ids.push('evidence');
    const hypotheses = allData.flatMap(d => d.rootCauseHypotheses);
    if (hypotheses.length > 0) ids.push('root-cause');
    const diag = allData.find(d => d.diagnosis)?.diagnosis;
    if (diag?.primaryWeakness) ids.push('growth');
    if (diag?.recommendations?.length) ids.push('practice');
    return ids;
  }, [allData]);

  // ── Compute section navigation references eagerly (Rules of Hooks) ─────────
  const sectionRefs = useMemo(() => {
    if (!allData.length) return [];
    const latest = allData[0];
    const isLatestAccepted = latest.submission.status === 'Accepted';
    const isLatestWrongAnswer = latest.submission.status === 'Wrong Answer';
    const latestDiagnosis = allData.find(d => d.diagnosis)?.diagnosis;
    const allHypotheses = allData.flatMap(d => d.rootCauseHypotheses);
    const allEvidences = allData.flatMap(d => d.evidences);

    if (isLatestAccepted) {
      return [
        { id: 'success', label: 'Success Intelligence', accent: '#22c55e' },
        { id: 'timeline', label: 'Attempt Timeline', accent: '#3b82f6' }
      ];
    }

    if (isLatestWrongAnswer) {
      return [
        { id: 'repair', label: 'AI Judge Repair', accent: '#ef4444' },
        ...(allEvidences.length > 0 ? [{ id: 'evidence', label: 'Evidence Collected', accent: '#f59e0b' }] : []),
        { id: 'timeline', label: 'Attempt Timeline', accent: '#3b82f6' }
      ];
    }

    const hypothesisMap = new Map<string, Hypothesis>();
    for (const h of allHypotheses) {
      const existing = hypothesisMap.get(h.rootCauseType);
      if (!existing || h.confidence > existing.confidence) hypothesisMap.set(h.rootCauseType, h);
    }
    const topHypotheses = Array.from(hypothesisMap.values()).sort((a, b) => b.confidence - a.confidence).slice(0, 6);

    return [
      ...(latestDiagnosis?.primaryWeakness ? [{ id: 'growth', label: 'Primary Growth Area', accent: '#a855f7' }] : []),
      ...(topHypotheses.length > 0 ? [{ id: 'root-cause', label: 'Root Cause Analysis', accent: '#ff5f52' }] : []),
      ...(allEvidences.length > 0 ? [{ id: 'evidence', label: 'Evidence Collected', accent: '#f59e0b' }] : []),
      ...(latestDiagnosis?.recommendations?.length ? [{ id: 'practice', label: 'Targeted Practice', accent: '#22c55e' }] : []),
      { id: 'timeline', label: 'Attempt Timeline', accent: '#3b82f6' }
    ];
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
  const isLatestWrongAnswer = latest.submission.status === 'Wrong Answer';
  const latestEventId = latest.submission.eventId;

  // ── Bottom sheet nav content ──────────────────────────────────────────────────
  const menuSheetContent = (
    <div style={{ padding: '16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Jump to Section
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sectionRefs.map(sec => (
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
        .body-container {
          padding-top: 24px;
          padding-bottom: 24px;
        }
        @media (max-width: 767px) {
          .body-container {
            padding-top: 12px;
            /* Extra bottom padding: floating CTA (~52px) + menu btn (~44px) + tab bar bottom nav (~64px) + safe area + spacing */
            padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 130px) !important;
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
        <div style={{ borderBottom: '1px solid #1f1f1f', background: '#161616' }}>
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-5 min-w-0 overflow-x-hidden">
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
                  {isLatestWrongAnswer && (
                    <span className="compact" style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                      color: '#ef4444', background: '#450a0a', border: '1px solid #991b1b', flexShrink: 0,
                    }}>
                      ✖ Wrong Answer
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(problem.topics || []).map(t => (
                    <span key={t} className="compact" style={{ fontSize: 10, color: '#71717a', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 8px' }}>{t}</span>
                  ))}
                </div>
              </div>
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
        </div>

        {/* ── Sticky Section Tab Bar (mobile-only) ─────────────────────────── */}
        <nav
          className={`analysis-sticky-nav${scrolled ? ' scrolled' : ''}`}
          aria-label="Analysis sections"
        >
          {sectionRefs.map(sec => (
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
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 min-w-0 overflow-x-hidden flex flex-col gap-6 body-container">
          {isLatestAccepted ? (
            <>
              {/* Success Intelligence Panel */}
              <div id={`section-success`} className="analysis-section-anchor w-full min-w-0">
                <SuccessInsightPanel submissionId={latestEventId} problemTitle={problem.title} problemSlug={slug} />
              </div>

              {/* Attempt Timeline */}
              <div id={`section-timeline`} className="analysis-section-anchor w-full min-w-0">
                <SectionCard title="Attempt Timeline" accent="#3b82f6">
                  <AttemptTimeline submissions={allData} />
                </SectionCard>
              </div>
            </>
          ) : isLatestWrongAnswer ? (
            <>
              {/* AI Judge Repair Panel for Wrong Answer Submissions */}
              <div id={`section-repair`} className="analysis-section-anchor w-full min-w-0">
                <AiJudgeRepairPanel submissionId={latestEventId} problemSlug={slug} problemTitle={problem.title} />
              </div>

              {allEvidences.length > 0 && (
                <div id={`section-evidence`} className="analysis-section-anchor w-full min-w-0">
                  <SectionCard title="Evidence Collected" accent="#f59e0b">
                    <div className="p-4 sm:p-5 flex flex-col gap-3">
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
                </div>
              )}

              {/* Attempt Timeline */}
              <div id={`section-timeline`} className="analysis-section-anchor w-full min-w-0">
                <SectionCard title="Attempt Timeline" accent="#3b82f6">
                  <AttemptTimeline submissions={allData} />
                </SectionCard>
              </div>
            </>
          ) : (
            <>
              {/* Other Failed Solution Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
                <div className="flex flex-col gap-6 w-full min-w-0">
                  {latestDiagnosis?.primaryWeakness && (
                    <div id={`section-growth`} className="analysis-section-anchor w-full min-w-0">
                      <SectionCard title="Primary Growth Area" accent="#a855f7">
                        <div className="p-4 sm:p-5">
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
                    </div>
                  )}

                  {latestDiagnosis?.recommendations && latestDiagnosis.recommendations.length > 0 && (
                    <div id={`section-practice`} className="analysis-section-anchor w-full min-w-0">
                      <SectionCard title="Targeted Practice" accent="#22c55e">
                        <div className="p-4 sm:p-5 flex flex-col gap-3">
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
                                <div className="mt-2 flex flex-wrap gap-1">
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
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-6 w-full min-w-0">
                  {topHypotheses.length > 0 && (
                    <div id={`section-root-cause`} className="analysis-section-anchor w-full min-w-0">
                      <SectionCard title="Root Cause Analysis" accent="#ff5f52">
                        <div className="p-4 sm:p-5 flex flex-col gap-3">
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
                    </div>
                  )}

                  {allEvidences.length > 0 && (
                    <div id={`section-evidence`} className="analysis-section-anchor w-full min-w-0">
                      <SectionCard title="Evidence Collected" accent="#f59e0b">
                        <div className="p-4 sm:p-5 flex flex-col gap-3">
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
                    </div>
                  )}
                </div>
              </div>

              {/* Attempt Timeline */}
              <div id={`section-timeline`} className="analysis-section-anchor w-full min-w-0">
                <SectionCard title="Attempt Timeline" accent="#3b82f6">
                  <AttemptTimeline submissions={allData} />
                </SectionCard>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Floating "Analysis Menu" button (mobile-only, appears after 300px scroll) ── */}
      {showFloating && (
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
      {problem.url && (
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
        submissionId={drawerSubmissionId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </AppShell>
  );
}
