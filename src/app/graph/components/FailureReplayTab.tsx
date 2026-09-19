'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bug, Zap, RefreshCw, ChevronRight, ChevronDown,
  CheckCircle2, XCircle, Terminal, Brain,
  Lightbulb, Activity, Target, Clock,
  Play, Lock, Unlock, Sparkles, ArrowRight, Check,
  Layers, Code2, AlertTriangle, HelpCircle, ShieldCheck,
  RotateCcw, Eye, BookOpen, Menu, X, CheckSquare,
  Flame, ExternalLink, Send
} from 'lucide-react';
import { useFailureReplay } from '@/hooks/useFailureReplay';
import type {
  TargetedTestCase,
  ConditionNode,
  ProgressiveHint,
} from '@/lib/replay/types';

interface FailingSessionSummary {
  id: string;
  submissionId: string;
  problemTitle: string;
  problemSlug: string;
  category: string;
  status: string;
  language: string;
  timestamp: string;
  passedTests: number;
  totalTests: number;
  code: string;
  rootCause: string;
  isResolved?: boolean;
}

function FailureReplayInner() {
  const searchParams = useSearchParams();
  const queryProblem = searchParams.get('problem');
  const querySubmissionId = searchParams.get('submissionId');

  // Sidebar / session state
  const [openFailures, setOpenFailures] = useState<FailingSessionSummary[]>([]);
  const [resolvedFailures, setResolvedFailures] = useState<FailingSessionSummary[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'open' | 'resolved'>('open');

  // Interactive Replay hook
  const {
    session,
    isLoading: sessionLoading,
    error: sessionError,
    startReplay,
    revealHint,
    submitReasoning,
    runTestcase,
    isEvaluatingReasoning,
    isRunningTest,
    regenerate,
  } = useFailureReplay(selectedSubmissionId);

  // In-place retry editor state
  const [retryCode, setRetryCode] = useState<string>('');
  const [activeTestId, setActiveTestId] = useState<string>('t1');
  const [activeReasoningAnswers, setActiveReasoningAnswers] = useState<Record<string, string>>({});
  const [selectedOptionIndices, setSelectedOptionIndices] = useState<Record<string, number>>({});

  // ── 1. Fetch authenticated user's failed submissions ─────────────────────────
  const fetchUserFailingSessions = async () => {
    setLoadingSessions(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token') ||
            localStorage.getItem('praxis_token') ||
            sessionStorage.getItem('praxis_token')
          : null;

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/submissions/failing', { headers });
      if (!res.ok) {
        setLoadingSessions(false);
        return;
      }
      const data = await res.json();

      const open: FailingSessionSummary[] = data.openFailures || [];
      const resolved: FailingSessionSummary[] = data.resolvedFailures || [];

      setOpenFailures(open);
      setResolvedFailures(resolved);

      // Select problem from URL or first open failure
      let defaultSelection: string | null = null;
      if (querySubmissionId) {
        defaultSelection = querySubmissionId;
      } else if (queryProblem) {
        const found = [...open, ...resolved].find(f => f.problemSlug === queryProblem);
        if (found) defaultSelection = found.submissionId;
      }

      if (!defaultSelection && open.length > 0) {
        defaultSelection = open[0].submissionId;
      } else if (!defaultSelection && resolved.length > 0) {
        defaultSelection = resolved[0].submissionId;
        setActiveTabFilter('resolved');
      }

      setSelectedSubmissionId(defaultSelection);
    } catch (err) {
      console.error('Failed to load user failing sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchUserFailingSessions();
  }, [queryProblem, querySubmissionId]);

  // When selected submission changes, initialize replay
  useEffect(() => {
    if (selectedSubmissionId) {
      startReplay(false);
    }
  }, [selectedSubmissionId, startReplay]);

  // Sync retry code when session loads
  useEffect(() => {
    if (session?.submission?.code) {
      setRetryCode(session.submission.code);
    }
    if (session?.targetedTests && session.targetedTests.length > 0) {
      setActiveTestId(session.targetedTests[0].id);
    }
  }, [session?.submission?.code, session?.targetedTests]);

  const activeTest = useMemo(() => {
    return session?.targetedTests?.find(t => t.id === activeTestId) || session?.targetedTests?.[0];
  }, [session?.targetedTests, activeTestId]);

  const selectedItem = useMemo(() => {
    return [...openFailures, ...resolvedFailures].find(f => f.submissionId === selectedSubmissionId);
  }, [openFailures, resolvedFailures, selectedSubmissionId]);

  // Helper for verdict color
  const getVerdictStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('runtime') || s.includes('error')) {
      return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    }
    if (s.includes('time') || s.includes('limit')) {
      return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    }
    if (s.includes('accepted')) {
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    }
    return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  };

  const displayedList = activeTabFilter === 'open' ? openFailures : resolvedFailures;

  // Render session list inside sidebar or drawer
  const renderSessionListContent = () => (
    <>
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
            <Bug size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold tracking-wider uppercase text-zinc-400 truncate">
              Failure Replay
            </h2>
            <p className="text-[11px] text-zinc-500 truncate">
              User-Scoped Debugging
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={fetchUserFailingSessions}
            title="Refresh submissions"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded transition-colors"
          >
            <RefreshCw size={14} className={loadingSessions ? 'animate-spin text-purple-400' : ''} />
          </button>
          {/* Close drawer button for mobile/tablet */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded transition-colors"
            title="Close list"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Filter Tabs: Open vs Resolved */}
      <div className="flex p-2 gap-1 bg-[#0d0d0f]/60 border-b border-zinc-800/60 shrink-0">
        <button
          onClick={() => setActiveTabFilter('open')}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeTabFilter === 'open'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Open</span>
          <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-semibold">
            {openFailures.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTabFilter('resolved')}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeTabFilter === 'resolved'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Resolved</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
            {resolvedFailures.length}
          </span>
        </button>
      </div>

      {/* Sessions List Items */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 sm:p-3 space-y-1.5 min-w-0">
        {loadingSessions ? (
          <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
            <RefreshCw size={18} className="animate-spin text-purple-400" />
            <span>Loading failed submissions...</span>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="py-12 px-4 text-center text-zinc-500 text-xs">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <p className="font-semibold text-zinc-300 mb-1">
              {activeTabFilter === 'open' ? 'Zero Open Failures' : 'No Resolved Sessions'}
            </p>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              {activeTabFilter === 'open'
                ? 'All submissions for this account are passing. Submit a problem via the Praxis browser extension to debug failures here.'
                : 'Problems solved after a failure will appear here as resolved replay history.'}
            </p>
          </div>
        ) : (
          displayedList.map(item => {
            const isSelected = selectedSubmissionId === item.submissionId;
            return (
              <div
                key={item.submissionId}
                onClick={() => {
                  setSelectedSubmissionId(item.submissionId);
                  setDrawerOpen(false);
                }}
                className={`
                  px-3.5 py-2.5 sm:py-3 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden group flex items-center gap-2.5 min-w-0
                  ${
                    isSelected
                      ? 'bg-zinc-800/90 border-purple-500/50 shadow-md shadow-purple-500/10 text-zinc-100'
                      : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700/60 text-zinc-300'
                  }
                `}
              >
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                )}
                <span className="text-purple-400 text-sm shrink-0 select-none">◇</span>
                <h3 className="text-xs font-semibold break-words min-w-0 flex-1 group-hover:text-purple-300 transition-colors leading-snug">
                  {item.problemTitle}
                </h3>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div className="flex w-full h-[calc(100vh-52px)] bg-[#0d0d0f] text-zinc-100 overflow-hidden font-sans relative min-w-0">
      {/* ── 1. DESKTOP & LAPTOP SIDEBAR (>= 992px) ────────────────────────────── */}
      <aside className="hidden lg:flex flex-col lg:w-64 xl:w-80 shrink-0 bg-[#121216] border-r border-zinc-800/80 h-full overflow-hidden min-w-0">
        {renderSessionListContent()}
      </aside>

      {/* ── 2. TABLET & MOBILE DRAWER OVERLAY (< 992px) ──────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-[#121216] border-r border-zinc-800/80 flex flex-col h-full z-10 shadow-2xl overflow-hidden min-w-0">
            {renderSessionListContent()}
          </div>
        </div>
      )}

      {/* ── 3. MAIN REPLAY WORKSPACE (FULL RESPONSIVE) ────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#0d0d0f]">
        {/* ── TABLET / MOBILE TOP SELECTOR BAR (< 992px) ────────────────────── */}
        <div className="lg:hidden shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 bg-[#121216] border-b border-zinc-800/80 flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Failed Problem
            </span>
            <button
              onClick={() => setDrawerOpen(true)}
              className="mt-1 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-left text-xs font-semibold text-zinc-200 hover:border-purple-500/50 hover:bg-zinc-900 transition-all min-w-0"
            >
              <span className="truncate flex items-center gap-2 min-w-0">
                <span className="text-purple-400 shrink-0">◇</span>
                <span className="truncate">{selectedItem?.problemTitle || 'Select Failed Problem'}</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
                <span className="text-[10px] bg-rose-500/20 text-rose-400 font-bold px-1.5 py-0.5 rounded">
                  {openFailures.length}
                </span>
                <ChevronDown size={14} />
              </div>
            </button>
          </div>
        </div>

        {/* Content container with responsive padding */}
        {sessionLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
              <Brain size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-200 mb-1">
              Analyzing Failure Evidence
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm px-4">
              Extracting real constraints, synthesizing targeted test cases, and building your interactive vertical reasoning workflow...
            </p>
          </div>
        ) : sessionError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-200 mb-1">
              Failed to Load Replay
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mb-4 px-4">
              {sessionError}
            </p>
            <button
              onClick={() => startReplay(true)}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
            >
              Retry Replay Generation
            </button>
          </div>
        ) : !session ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center text-zinc-500 min-w-0">
            <ShieldCheck size={36} className="text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-300 mb-1">
              Select a Failed Submission
            </p>
            <p className="text-xs max-w-sm text-zinc-500 px-4">
              Pick an open failure to launch targeted evidence and condition reasoning.
            </p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
            >
              Choose Failed Problem
            </button>
          </div>
        ) : (
          <div className="max-w-5xl w-full mx-auto p-3.5 sm:p-5 md:p-6 lg:p-8 space-y-6 md:space-y-8 min-w-0">
            {/* ── TOP BANNER: TITLE + STATUS + METADATA ─────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start md:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-zinc-800/80 min-w-0">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 shrink-0">
                    {session.problem.difficulty}
                  </span>
                  <span className="text-xs text-zinc-500">•</span>
                  <span className="text-xs text-zinc-400 font-mono shrink-0">
                    {session.submission.language}
                  </span>
                  {session.status === 'resolved' && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                      <CheckCircle2 size={12} /> Resolved
                    </span>
                  )}
                </div>

                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-100 break-words leading-tight">
                  {session.problem.title}
                </h1>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 pt-0.5">
                  <span className="break-all">
                    Submission ID: <code className="font-mono text-zinc-400">{session.submission.id}</code>
                  </span>
                  <span className="hidden sm:inline text-zinc-600">•</span>
                  <span>Captured on {new Date(session.submission.timestamp).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <button
                  onClick={regenerate}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors shadow-sm"
                >
                  <RefreshCw size={13} />
                  <span>Regenerate Analysis</span>
                </button>
              </div>
            </div>

            {/* ── SECTION 1: PROBLEM & REAL CONSTRAINTS ───────────────────────── */}
            <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4 min-w-0">
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider">
                <BookOpen size={15} className="text-purple-400 shrink-0" />
                <span>1. Problem Understanding & Constraints</span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed break-words">
                {session.problem.statement}
              </p>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Real Ground-Truth Constraints
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 min-w-0">
                  {session.problem.constraints.map((c, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-xs font-mono text-amber-300/90 flex items-start gap-2 min-w-0 break-words"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span className="break-words min-w-0 flex-1">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── SECTION 2: USER'S EXACT SUBMITTED CODE ─────────────────────── */}
            <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider min-w-0">
                  <Code2 size={15} className="text-purple-400 shrink-0" />
                  <span className="truncate">2. Your Exact Submitted Solution</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="text-[11px] text-zinc-400">
                    Passed {session.submission.passedTests} of {session.submission.totalTests} tests
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${getVerdictStyle(session.submission.status).bg} ${getVerdictStyle(session.submission.status).text} ${getVerdictStyle(session.submission.status).border}`}
                  >
                    {session.submission.status}
                  </span>
                </div>
              </div>

              {/* Code Container with internal horizontal scroll only */}
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-[#0a0a0c] w-full min-w-0">
                <div className="max-h-72 overflow-y-auto overflow-x-auto custom-scrollbar p-3.5 sm:p-4 text-xs font-mono text-zinc-300 leading-relaxed">
                  <pre className="overflow-x-auto whitespace-pre">{session.submission.code}</pre>
                </div>
              </div>
            </section>

            {/* ── SECTION 3: FAILURE EVIDENCE ─────────────────────────────────── */}
            <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4 min-w-0">
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider">
                <Activity size={15} className="text-rose-400 shrink-0" />
                <span>3. Concrete Failure Evidence</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-w-0">
                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/60 min-w-0">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                    Input That Failed
                  </span>
                  <div className="max-h-24 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <code className="text-xs font-mono text-zinc-200 break-words whitespace-pre-wrap">
                      {session.failureEvidence.input}
                    </code>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/60 min-w-0">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                    Expected Observation / Result
                  </span>
                  <div className="max-h-24 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <code className="text-xs font-mono text-emerald-400 break-words whitespace-pre-wrap">
                      {session.failureEvidence.expected}
                    </code>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/60 min-w-0">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                    Your Code Result / Error
                  </span>
                  <div className="max-h-24 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <code className="text-xs font-mono text-rose-400 break-words whitespace-pre-wrap">
                      {session.failureEvidence.actual || session.failureEvidence.error || 'Diverged'}
                    </code>
                  </div>
                </div>
              </div>

              {session.failureEvidence.firstFailurePoint && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5 min-w-0 break-words">
                  <Target size={15} className="mt-0.5 shrink-0 text-rose-400" />
                  <div className="min-w-0 flex-1 leading-relaxed">
                    <span className="font-semibold text-rose-200">First Failure Point: </span>
                    {session.failureEvidence.firstFailurePoint.description} (Variable:{' '}
                    <code>{session.failureEvidence.firstFailurePoint.variable || 'state'}</code>, Value:{' '}
                    <code>{String(session.failureEvidence.firstFailurePoint.value ?? 'invalid')}</code>)
                  </div>
                </div>
              )}
            </section>

            {/* ── SECTION 4: PROGRESSIVE TARGETED TESTCASE LADDER ─────────────── */}
            <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 min-w-0">
                <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider">
                  <Layers size={15} className="text-purple-400 shrink-0" />
                  <span>4. Targeted Testcase Ladder</span>
                </div>
                <span className="text-[11px] text-zinc-500 truncate">
                  Non-generic tests attacking the faulty assumption
                </span>
              </div>

              {/* Level Selector: flex-wrap */}
              <div className="flex flex-wrap gap-2 min-w-0">
                {session.targetedTests.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTestId(t.id)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all shrink-0
                      ${
                        activeTestId === t.id
                          ? 'bg-purple-600/20 border-purple-500/60 text-purple-300 shadow-sm'
                          : 'bg-zinc-950/60 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }
                    `}
                  >
                    <span>L{t.level}: {t.category}</span>
                    {t.status === 'passed' && (
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    )}
                    {t.status === 'failed' && (
                      <XCircle size={12} className="text-rose-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Active Test Card */}
              {activeTest && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-zinc-200">
                        Level {activeTest.level} — {activeTest.category}
                      </span>
                      <span className="text-xs text-zinc-500 hidden sm:inline">•</span>
                      <span className="text-xs text-zinc-400 italic break-words">
                        {activeTest.whyThisCaseExists}
                      </span>
                    </div>

                    <button
                      onClick={() => runTestcase(activeTest.id, retryCode)}
                      disabled={isRunningTest}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Play size={12} className={isRunningTest ? 'animate-spin' : ''} />
                      <span>{isRunningTest ? 'Testing...' : 'Run Your Code'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono min-w-0">
                    <div className="p-3 rounded-lg bg-[#0d0d0f] border border-zinc-800/60 min-w-0">
                      <span className="text-[10px] text-zinc-500 block mb-1 uppercase">Test Input</span>
                      <div className="max-h-24 overflow-x-auto overflow-y-auto custom-scrollbar">
                        <code className="text-zinc-300 break-words whitespace-pre-wrap">{activeTest.input}</code>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0d0d0f] border border-zinc-800/60 min-w-0">
                      <span className="text-[10px] text-zinc-500 block mb-1 uppercase">Expected Output</span>
                      <div className="max-h-24 overflow-x-auto overflow-y-auto custom-scrollbar">
                        <code className="text-emerald-400 break-words whitespace-pre-wrap">{activeTest.expected}</code>
                      </div>
                    </div>
                  </div>

                  {activeTest.userOutput && (
                    <div className="p-3 rounded-lg bg-[#0d0d0f] border border-zinc-800/60 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 min-w-0">
                      <span className="text-[10px] text-zinc-500 uppercase">Your Output</span>
                      <span className={`break-words ${activeTest.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeTest.userOutput} ({activeTest.status === 'passed' ? 'MATCH' : 'MISMATCH'})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── SECTION 5: VERTICAL CONDITION / REASONING WORKFLOW ──────────── */}
            <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 min-w-0">
                <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider">
                  <Brain size={15} className="text-purple-400 shrink-0" />
                  <span>5. Vertical Condition & Reasoning Flow</span>
                </div>
                <span className="text-[11px] text-zinc-500 truncate">
                  Step-by-step invariant map with reasoning checkpoints
                </span>
              </div>

              {/* Vertical flow map */}
              <div className="space-y-4 pt-2 min-w-0">
                {session.conditionFlow.map((node, idx) => {
                  const isLocked = node.status === 'locked';
                  const isCompleted = node.status === 'completed';
                  const hasOptions =
                    node.checkpointQuestion?.options && node.checkpointQuestion.options.length > 0;

                  return (
                    <div key={node.id} className="relative pl-7 sm:pl-8 min-w-0">
                      {/* Vertical line connector */}
                      {idx < session.conditionFlow.length - 1 && (
                        <div className="absolute left-3 sm:left-3.5 top-8 bottom-0 w-0.5 bg-zinc-800" />
                      )}

                      {/* Node circle marker */}
                      <div
                        className={`
                          absolute left-0.5 sm:left-1 top-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors shrink-0
                          ${
                            isCompleted
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : isLocked
                              ? 'bg-zinc-900 border-zinc-800 text-zinc-600'
                              : 'bg-purple-600/20 border-purple-500 text-purple-300'
                          }
                        `}
                      >
                        {isCompleted ? <Check size={10} /> : isLocked ? <Lock size={10} /> : idx + 1}
                      </div>

                      {/* Node Box */}
                      <div
                        className={`
                          p-3.5 sm:p-4 rounded-xl border transition-all space-y-3 min-w-0
                          ${
                            isLocked
                              ? 'bg-zinc-950/30 border-zinc-800/40 opacity-50'
                              : 'bg-zinc-950/80 border-zinc-800/80'
                          }
                        `}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 min-w-0">
                          <h4 className="text-xs font-bold text-zinc-200 break-words">
                            Condition {node.order}: {node.conditionText}
                          </h4>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">
                            {node.status}
                          </span>
                        </div>

                        {/* Branches: YES / NO (stack on mobile, 2 columns on tablet/desktop) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs min-w-0">
                          <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-300 min-w-0">
                            <span className="font-bold text-[10px] text-emerald-400 block mb-0.5">
                              YES → {node.branches.yes.label}
                            </span>
                            <span className="text-[11px] text-zinc-400 break-words">
                              {node.branches.yes.action}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-300 min-w-0">
                            <span className="font-bold text-[10px] text-rose-400 block mb-0.5">
                              NO → {node.branches.no.label}
                            </span>
                            <span className="text-[11px] text-zinc-400 break-words">
                              {node.branches.no.action}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Reasoning Checkpoint */}
                        {!isLocked && node.checkpointQuestion && (
                          <div className="pt-3 border-t border-zinc-800/60 space-y-3 min-w-0">
                            <div className="flex items-start gap-1.5 text-purple-300 text-xs font-semibold break-words">
                              <HelpCircle size={14} className="mt-0.5 shrink-0" />
                              <span className="break-words leading-snug">
                                Checkpoint: {node.checkpointQuestion.prompt}
                              </span>
                            </div>

                            {/* Options or text input */}
                            {hasOptions ? (
                              <div className="space-y-1.5 min-w-0">
                                {node.checkpointQuestion.options!.map((opt, optIdx) => {
                                  const isSelected = selectedOptionIndices[node.id] === optIdx;
                                  return (
                                    <button
                                      key={optIdx}
                                      onClick={() =>
                                        setSelectedOptionIndices(prev => ({
                                          ...prev,
                                          [node.id]: optIdx,
                                        }))
                                      }
                                      className={`
                                        w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors flex items-start justify-between gap-2 min-w-0
                                        ${
                                          isSelected
                                            ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                                        }
                                      `}
                                    >
                                      <span className="break-words flex-1 leading-snug">{opt}</span>
                                      {isSelected && <Check size={13} className="text-purple-400 shrink-0 mt-0.5" />}
                                    </button>
                                  );
                                })}

                                <button
                                  onClick={async () => {
                                    const optIdx = selectedOptionIndices[node.id];
                                    if (optIdx !== undefined) {
                                      await submitReasoning(node.id, String(optIdx));
                                    }
                                  }}
                                  disabled={selectedOptionIndices[node.id] === undefined || isEvaluatingReasoning}
                                  className="mt-2 w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                  <Send size={12} />
                                  <span>{isEvaluatingReasoning ? 'Evaluating...' : 'Submit Answer'}</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                                <input
                                  type="text"
                                  placeholder="Explain the invariant or consequence here..."
                                  value={activeReasoningAnswers[node.id] || ''}
                                  onChange={e =>
                                    setActiveReasoningAnswers(prev => ({
                                      ...prev,
                                      [node.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full sm:flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 min-w-0"
                                />
                                <button
                                  onClick={async () => {
                                    const ans = activeReasoningAnswers[node.id];
                                    if (ans && ans.trim()) {
                                      await submitReasoning(node.id, ans.trim());
                                    }
                                  }}
                                  disabled={!activeReasoningAnswers[node.id] || isEvaluatingReasoning}
                                  className="w-full sm:w-auto flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                                >
                                  <Send size={12} />
                                  <span>Evaluate</span>
                                </button>
                              </div>
                            )}

                            {/* Evaluation Feedback */}
                            {node.feedback && (
                              <div
                                className={`
                                  p-2.5 rounded-lg text-xs border mt-2 flex items-start gap-2 min-w-0 break-words
                                  ${
                                    node.evaluationResult === 'pass'
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                      : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                  }
                                `}
                              >
                                {node.evaluationResult === 'pass' ? (
                                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                                ) : (
                                  <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-400" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold uppercase tracking-wider text-[10px] block">
                                    Result: {node.evaluationResult}
                                  </span>
                                  <span className="leading-snug break-words">{node.feedback}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── SECTION 6: PROGRESSIVE CODE HINTS (L1 - L5) ────────────────── */}
            <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
                <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider min-w-0">
                  <Lightbulb size={15} className="text-amber-400 shrink-0" />
                  <span className="truncate">6. Progressive Code Hints (No Solution Leakage)</span>
                </div>
                <button
                  onClick={() => revealHint(session.hintLevel + 1)}
                  disabled={session.hintLevel >= 5}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-colors disabled:opacity-40 shrink-0"
                >
                  <Unlock size={12} />
                  <span>Unlock Next Hint ({session.hintLevel}/5)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 min-w-0">
                {session.hints.map(hint => (
                  <div
                    key={hint.level}
                    className={`
                      p-3.5 rounded-xl border transition-all min-w-0
                      ${
                        hint.unlocked
                          ? 'bg-zinc-950/70 border-zinc-800/80'
                          : 'bg-zinc-950/30 border-zinc-800/40 opacity-40'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 shrink-0">
                          Hint {hint.level}: {hint.tierName}
                        </span>
                        <span className="text-xs font-semibold text-zinc-200 truncate">
                          {hint.title}
                        </span>
                      </div>
                      {!hint.unlocked && <Lock size={12} className="text-zinc-600 shrink-0" />}
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed break-words">
                      {hint.unlocked ? hint.text : 'Unlock previous reasoning checkpoints or click "Unlock Next Hint" to reveal.'}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── SECTION 7: ORIGINAL CODE RETRY & IN-PLACE TESTING ───────────── */}
            <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider min-w-0">
                  <Terminal size={15} className="text-purple-400 shrink-0" />
                  <span className="truncate">7. Retry Your Original Solution</span>
                </div>
                <button
                  onClick={() => setRetryCode(session.submission.code)}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 shrink-0"
                >
                  <RotateCcw size={12} />
                  <span>Reset to Original</span>
                </button>
              </div>

              <p className="text-xs text-zinc-400 break-words leading-relaxed">
                Modify your own solution using the invariants you reasoned through above, then test against the targeted counter-examples.
              </p>

              {/* In-place code editor: scrolls internally */}
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-[#0a0a0c] w-full min-w-0">
                <textarea
                  value={retryCode}
                  onChange={e => setRetryCode(e.target.value)}
                  rows={10}
                  className="w-full bg-transparent p-3.5 sm:p-4 font-mono text-xs text-zinc-200 focus:outline-none resize-y leading-relaxed overflow-x-auto whitespace-pre"
                  placeholder="Paste or modify your solution..."
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 min-w-0">
                <button
                  onClick={() => runTestcase(activeTestId, retryCode)}
                  disabled={isRunningTest}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                >
                  <Play size={14} className={isRunningTest ? 'animate-spin' : ''} />
                  <span>Test Against Current Case</span>
                </button>

                <div className="flex items-start sm:items-center gap-2 text-xs text-zinc-400 leading-snug">
                  <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                  <span>When ready, re-submit in LeetCode — Praxis extension captures the new result!</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export function FailureReplayTab() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-zinc-500 text-xs">
          Loading Failure Replay...
        </div>
      }
    >
      <FailureReplayInner />
    </Suspense>
  );
}
