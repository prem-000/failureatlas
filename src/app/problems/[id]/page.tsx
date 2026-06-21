'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useSubmissionsList } from '@/hooks/usePhase3Queries';
import { apiFetch } from '@/lib/api/client';
import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BehaviorInsightPanel } from '@/components/intelligence/BehaviorInsightPanel';
import { SuccessInsightPanel } from '@/components/intelligence/SuccessInsightPanel';

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

// Weakness ID → display name mapping
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
    <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, overflowX: 'auto' }}>
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
    <div style={{ background: '#191919', border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 16, background: accent, borderRadius: 2 }} />
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ProblemDetailPage() {
  const params = useParams();
  const slug = params?.id as string;

  // Behavior insight drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerWeaknessId, setDrawerWeaknessId] = useState('');
  const [drawerWeaknessName, setDrawerWeaknessName] = useState('');

  const openDrawer = (weaknessId: string, name: string) => {
    setDrawerWeaknessId(weaknessId);
    setDrawerWeaknessName(name);
    setDrawerOpen(true);
  };

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

  // Determine if the latest submission is accepted
  const isLatestAccepted = latest.submission.status === 'Accepted';
  const latestEventId = latest.submission.eventId;

  return (
    <AppShell>
    <style>{`
      .problem-grid {
        display: grid;
        grid-template-columns: 1fr 360px;
        gap: 24px;
        padding: 24px 32px;
        align-items: start;
      }
      @media (max-width: 991px) {
        .problem-grid {
          grid-template-columns: 1fr !important;
          padding: 16px 20px !important;
        }
      }
    `}</style>
    <div style={{ width: '100%', minHeight: '100vh', background: '#131313' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid #1f1f1f', background: '#161616' }}>
        <Link href="/problems" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#71717a', textDecoration: 'none', marginBottom: 14 }}>
          ← Problem Tracker
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.03em' }}>
                {problem.title}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                color: diffColor, background: `${diffColor}22`,
              }}>
                {problem.difficulty}
              </span>
              {/* Accepted badge */}
              {isLatestAccepted && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  color: '#22c55e', background: '#052e16', border: '1px solid #166534',
                }}>
                  ✓ Accepted
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(problem.topics || []).map(t => (
                <span key={t} style={{ fontSize: 10, color: '#71717a', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 8px' }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: '#71717a' }}>{allData.length} attempt{allData.length !== 1 ? 's' : ''}</span>
            {problem.url && (
              <a href={problem.url} target="_blank" rel="noreferrer" style={{
                fontSize: 12, color: '#ff5f52', textDecoration: 'none', background: '#ff5f5215',
                border: '1px solid #ff5f5230', borderRadius: 7, padding: '6px 14px', fontWeight: 600,
              }}>
                Open Problem ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Body — 2 columns */}
      <div className="problem-grid">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── SUCCESS INTELLIGENCE (Accepted submissions) ── */}
          {isLatestAccepted && (
            <SuccessInsightPanel
              submissionId={latestEventId}
              problemTitle={problem.title}
            />
          )}

          {/* Attempt Timeline */}
          <SectionCard title="Attempt Timeline" accent="#3b82f6">
            <AttemptTimeline submissions={allData} />
          </SectionCard>

          {/* Evidences (only show for failed submissions) */}
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
          {/* Learning Insight Breakdown — clickable hypotheses open behavior drawer */}
          {topHypotheses.length > 0 && !isLatestAccepted && (
            <SectionCard title="Root Cause Analysis" accent="#ff5f52">
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Helper hint */}
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

          {/* Primary Growth Area */}
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

                {/* Quick action: open behavior drawer for primary weakness */}
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

          {/* Practice Recommendations */}
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
    </div>

    {/* Behavior Insight Drawer — rendered outside grid to overlay correctly */}
    <BehaviorInsightPanel
      weaknessId={drawerWeaknessId}
      weaknessName={drawerWeaknessName}
      isOpen={drawerOpen}
      onClose={() => setDrawerOpen(false)}
    />
    </AppShell>
  );
}
