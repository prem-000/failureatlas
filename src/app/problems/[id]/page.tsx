'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useSubmissionsList } from '@/hooks/usePhase3Queries';
import { apiFetch } from '@/lib/api/client';
import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FailureIntelligenceView } from '@/components/intelligence/FailureIntelligenceView';
import { SectionCard } from '@/components/ui/SectionCard';
import { AttemptTimeline } from './components/AttemptTimeline';

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

interface SubmissionData {
  submission: SubmissionDetail;
  previousSubmission: { eventId: string; status: string; code: string; timestamp: string; attemptNumber: number } | null;
  codeDiff: any[];
  evidences: Array<{ id: string; type: string; description: string; confidence: number; source: string; extractedAt: string }>;
  rootCauseHypotheses: any[];
  diagnosis: any | null;
}

// ─── Colors ────────────────────────────────────────────────────────────────────
const DIFFICULTY_COLORS: Record<string, string> = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };

export default function ProblemDetailPage() {
  const params = useParams();
  const slug = params?.id as string;

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

  const allData = detailQueries
    .map((q) => q.data)
    .filter((d): d is SubmissionData => Boolean(d));

  const latest = allData[0];
  const problem = latest?.submission.problem || {
    id: slug,
    slug,
    title: slug ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Problem Analysis',
    difficulty: 'Medium',
    topics: [],
    url: `https://leetcode.com/problems/${slug}/`,
  };

  const isLatestAccepted = latest?.submission.status === 'Accepted';
  const isLatestWrongAnswer = latest?.submission.status === 'Wrong Answer';
  const latestEventId = latest?.submission.eventId || latest?.submission.id || submissions[0]?.eventId || slug;
  const diffColor = DIFFICULTY_COLORS[problem.difficulty] || '#f59e0b';

  return (
    <AppShell>
      <div style={{
        width: '100%',
        maxWidth: '100%',
        minHeight: '100vh',
        background: '#0d1117',
        overflowX: 'clip',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ borderBottom: '1px solid #232733', background: '#12141a' }}>
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-5 min-w-0 overflow-x-hidden">
            <Link href="/problems" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8b949e', textDecoration: 'none', marginBottom: 12 }}>
              ← Problem Tracker
            </Link>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'clamp(17px, 4vw, 22px)', fontWeight: 800, color: '#e6edf3', letterSpacing: '-0.03em', wordBreak: 'break-word' }}>
                    {problem.title}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                    color: diffColor, background: `${diffColor}18`, border: `1px solid ${diffColor}33`, flexShrink: 0,
                  }}>
                    {problem.difficulty}
                  </span>
                  {isLatestAccepted && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                      color: '#22c55e', background: '#052e16', border: '1px solid #166534', flexShrink: 0,
                    }}>
                      ✓ Accepted
                    </span>
                  )}
                  {isLatestWrongAnswer && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                      color: '#ef4444', background: '#450a0a', border: '1px solid #991b1b', flexShrink: 0,
                    }}>
                      ✖ Wrong Answer
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(problem.topics || []).map(t => (
                    <span key={t} style={{ fontSize: 10, color: '#8b949e', background: '#161b22', border: '1px solid #232733', borderRadius: 4, padding: '2px 8px' }}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#8b949e' }}>{allData.length} attempt{allData.length !== 1 ? 's' : ''}</span>
                {problem.url && (
                  <a href={problem.url} target="_blank" rel="noreferrer" className="hidden md:inline-flex" style={{
                    fontSize: 12, color: '#38bdf8', textDecoration: 'none', background: '#0284c715',
                    border: '1px solid #0284c730', borderRadius: 7, padding: '7px 14px', fontWeight: 600,
                  }}>
                    Open Problem ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body: Failure Intelligence View ───────────────────────────────── */}
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 min-w-0 overflow-x-hidden flex flex-col gap-6">
          <FailureIntelligenceView
            submissionId={latestEventId}
            problemSlug={slug}
            problemTitle={problem.title}
            status={latest?.submission.status}
          />

          {/* Attempt Timeline */}
          {allData.length > 0 && (
            <SectionCard title="Attempt Timeline" accent="#38bdf8">
              <AttemptTimeline submissions={allData} />
            </SectionCard>
          )}
        </div>
      </div>
    </AppShell>
  );
}
