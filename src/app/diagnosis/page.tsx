'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { type DiagnosisData, useFailureExplanation, useGenerateFailureExplanation } from '@/hooks/usePhase3Queries';
import { FailureExplanationCard } from '@/components/intelligence/FailureExplanationCard';
import { DiagnosisStatusLine } from '@/components/diagnosis/DiagnosisStatusLine';
import { useDiagnosisData } from '@/hooks/useDiagnosisData';
import { ChatBubbleV2 } from '@/components/diagnosis/ChatBubbleV2';
import { SessionHistoryDropdown } from '@/components/diagnosis/SessionHistoryDropdown';
import { ErrorLocationPanel } from '@/components/diagnosis/panels/ErrorLocationPanel';
import { FailingTestsPanel } from '@/components/diagnosis/panels/FailingTestsPanel';
import { ConceptBulletsPanel } from '@/components/diagnosis/panels/ConceptBulletsPanel';
import { PastFailureTimeline } from '@/components/diagnosis/panels/PastFailureTimeline';
import { FirstOccurrenceEmptyState } from '@/components/diagnosis/panels/FirstOccurrenceEmptyState';
import { PlanDiagramPanel } from '@/components/diagnosis/panels/PlanDiagramPanel';
import { SubmissionReviewPanel } from '@/components/diagnosis/panels/SubmissionReviewPanel';
import type { QueryAwareDiagnosis } from '@/types/diagnosis-v2';

type DiagnosisResult = DiagnosisData;

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: '#22c55e',
  Medium: '#f59e0b',
  Hard: '#ef4444',
  Unknown: '#71717a',
};

function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#ff5f52', borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 11, color: '#a1a1aa', minWidth: 32 }}>{pct}%</span>
    </div>
  );
}

// ─── Evidence Panel (Legacy Fallback) ──────────────────────────────────────────
function EvidencePanel({ result }: { result: DiagnosisResult | null }) {
  if (!result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 32 }}>
        <span style={{ fontSize: 40 }}>🔬</span>
        <span style={{ color: '#71717a', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>RAG Evidence</span>
        <span style={{ color: '#3f3f46', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
          Ask a question or paste code to see retrieved similar cases and evidence used in the diagnosis.
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', height: '100%' }}>
      {/* Confidence */}
      <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '14px 16px', border: '1px solid #2a2a2a' }}>
        <div style={{ fontSize: 10, color: '#71717a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Diagnosis Confidence
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#ff5f52' }}>{result.confidence}</span>
          <span style={{ fontSize: 14, color: '#71717a' }}>/ 100</span>
        </div>
        <div style={{ marginTop: 8, height: 6, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${result.confidence}%`, height: '100%', background: 'linear-gradient(90deg, #ff5f52, #ff8a80)', borderRadius: 3 }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#a1a1aa' }}>
          Primary Weakness: <span style={{ color: '#d8b4fe', fontWeight: 600 }}>
            {result.primaryWeaknessId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </span>
        </div>
      </div>

      {/* Similar Failures */}
      {result.similarFailures?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#71717a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Similar Past Failures ({result.similarFailures.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.similarFailures.map((f, i) => (
              <div key={i} style={{
                background: '#1a1a1a', borderRadius: 8, padding: '10px 12px',
                border: '1px solid #2a2a2a',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#f4f4f5', fontWeight: 500, lineHeight: 1.3 }}>{f.problemTitle}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    color: DIFFICULTY_COLORS[f.problemDifficulty] || '#71717a',
                    background: `${DIFFICULTY_COLORS[f.problemDifficulty] || '#71717a'}22`,
                  }}>
                    {f.problemDifficulty}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#52525b', marginBottom: 6 }}>
                  {f.status} · {new Date(f.timestamp).toLocaleDateString()}
                </div>
                <SimilarityBar value={f.similarity} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  'Correct answer for the last wrong submission + teach me + hidden test cases',
  'What should I study this week?',
  'Explain my boundary condition errors',
  'Show my past failure history',
];

export default function DiagnosisPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    messages,
    entries,
    activeId,
    activeEntry,
    openEntry,
    sendMessage: askDiagnosis,
    currentStage,
    elapsedMs,
    stageTimings,
    isLoading: loading,
    lastResult,
    latestSubmissionId,
    retryLastQuery,
    error,
  } = useDiagnosisData();

  const activeDiagnosis: QueryAwareDiagnosis | null = activeEntry?.result ?? null;

  const generateExplanation = useGenerateFailureExplanation();
  const [input, setInput] = useState('');
  const [activePanel, setActivePanel] = useState<'evidence' | 'explanation'>('explanation');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: failureExplanation, isLoading: explanationLoading } = useFailureExplanation(latestSubmissionId || undefined);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-route tabs based on mode
  useEffect(() => {
    if (activeDiagnosis?.kind === 'history') {
      setActivePanel('evidence');
    } else if (activeDiagnosis) {
      setActivePanel('explanation');
    }
  }, [activeDiagnosis]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    await askDiagnosis(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <AppShell>
      <style>{`
        @media (max-width: 768px) {
          .diagnosis-split { flex-direction: column !important; }
          .diagnosis-chat { flex: 1 1 50% !important; border-right: none !important; }
          .diagnosis-evidence { flex: 1 1 50% !important; border-top: 1px solid #1f1f1f !important; }
        }
      `}</style>
      <div style={{ width: '100%', height: '100vh', background: '#131313', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #1f1f1f',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#161616',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f52', boxShadow: '0 0 8px #ff5f52' }} />
          <span style={{ fontSize: '17px', fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
            AI Diagnosis
          </span>
          <span style={{ fontSize: 12, color: '#52525b', marginLeft: 4 }}>
            Query-Aware Analysis v2.1 · Session Intelligence
          </span>
        </div>

        {/* Split pane */}
        <div className="diagnosis-split" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left: Chat (55%) */}
          <div className="diagnosis-chat" style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1f1f1f' }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((m) => (
                <ChatBubbleV2
                  key={m.id}
                  msg={m}
                  mounted={mounted}
                  isActive={activeId === m.id}
                  onOpenEntry={openEntry}
                  onRetry={retryLastQuery}
                />
              ))}
              {(loading || error) && (
                <DiagnosisStatusLine
                  currentStage={currentStage}
                  elapsedMs={elapsedMs}
                  isDone={false}
                  stageTimings={stageTimings}
                  error={error}
                  onRetry={retryLastQuery}
                />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length === 1 && (
              <div style={{ padding: '0 24px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(p)}
                    style={{
                      background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20,
                      padding: '6px 14px', fontSize: 12, color: '#a1a1aa', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = '#ff5f52'; (e.target as HTMLElement).style.color = '#ff5f52'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = '#2a2a2a'; (e.target as HTMLElement).style.color = '#a1a1aa'; }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #1f1f1f', background: '#161616' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 14, padding: '10px 14px' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your failures or type: 'last wrong submission', 'what should I study'…"
                  rows={3}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#f4f4f5', fontSize: 13, resize: 'none', lineHeight: 1.5,
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  style={{
                    background: loading || !input.trim() ? '#2a2a2a' : '#ff5f52',
                    border: 'none', borderRadius: 10, width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s', flexShrink: 0,
                    color: '#fff', fontSize: 16,
                  }}
                >
                  ↑
                </button>
              </div>
            </div>
          </div>

          {/* Right: Specialized Diagnostic Panels (45%) */}
          <div className="diagnosis-evidence" style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', background: '#141414' }}>
            {/* Tab switcher + Session History Dropdown */}
            <div style={{
              padding: '0 20px', borderBottom: '1px solid #1f1f1f',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', gap: 0 }}>
                {(['explanation', 'evidence'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActivePanel(tab)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activePanel === tab ? '2px solid #ff5f52' : '2px solid transparent',
                      padding: '12px 16px',
                      fontSize: 12,
                      fontWeight: activePanel === tab ? 700 : 500,
                      color: activePanel === tab ? '#f4f4f5' : '#52525b',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab === 'explanation' ? '🧠 AI Explanation' : '🔬 RAG Evidence'}
                  </button>
                ))}
              </div>

              {/* History Dropdown */}
              <SessionHistoryDropdown
                entries={entries}
                activeId={activeId}
                onSelectEntry={openEntry}
              />
            </div>

            {/* Panel Content Container */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {activePanel === 'explanation' && (
                <div className="h-full">
                  {/* Mode 1: Code Review */}
                  {activeDiagnosis?.kind === 'code_review' && (
                    <div className="p-5 flex flex-col gap-4">
                      {/* Root Cause Banner */}
                      <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
                            ROOT CAUSE
                          </span>
                          <span className="text-sm font-bold text-[#f4f4f5]">
                            {activeDiagnosis.rootCause.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#ff5f52]">
                          {activeDiagnosis.rootCause.confidence}%
                        </span>
                      </div>

                      <ErrorLocationPanel location={activeDiagnosis.location} />

                      {activeDiagnosis.hasHistory && activeDiagnosis.concept && (
                        <ConceptBulletsPanel concept={activeDiagnosis.concept} />
                      )}

                      <FailingTestsPanel tests={activeDiagnosis.tests} />
                    </div>
                  )}

                  {/* Mode 2: Submission Review */}
                  {activeDiagnosis?.kind === 'submission_review' && (
                    <SubmissionReviewPanel review={activeDiagnosis} />
                  )}

                  {/* Mode 2B: Submission Accepted */}
                  {activeDiagnosis?.kind === 'submission_accepted' && (
                    <div className="p-6 flex flex-col gap-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-semibold self-start">
                        <span>✓</span>
                        <span>SUBMISSION ACCEPTED</span>
                      </div>
                      <h3 className="text-base font-bold text-[#f4f4f5]">
                        {activeDiagnosis.problem.title}
                      </h3>
                      <p className="text-sm text-[#a1a1aa] leading-relaxed">
                        {activeDiagnosis.message}
                      </p>
                      {(activeDiagnosis.runtime || activeDiagnosis.memory) && (
                        <div className="flex gap-4 p-3 bg-[#18181b] border border-[#27272a] rounded-lg text-xs font-mono text-[#d4d4d8]">
                          {activeDiagnosis.runtime && <span>Runtime: {activeDiagnosis.runtime} ms</span>}
                          {activeDiagnosis.memory && <span>Memory: {(activeDiagnosis.memory / 1024).toFixed(1)} MB</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2C: No Submission */}
                  {activeDiagnosis?.kind === 'no_submission' && (
                    <div className="p-6 flex flex-col gap-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold self-start">
                        <span>ℹ</span>
                        <span>NO SUBMISSION CAPTURED</span>
                      </div>
                      <h3 className="text-base font-bold text-[#f4f4f5]">
                        No Submissions Captured Yet
                      </h3>
                      <p className="text-sm text-[#a1a1aa] leading-relaxed">
                        {activeDiagnosis.message}
                      </p>
                    </div>
                  )}

                  {/* Mode 3: Plan */}
                  {activeDiagnosis?.kind === 'plan' && (
                    <PlanDiagramPanel initialPlan={activeDiagnosis} />
                  )}

                  {/* Mode 4: Explain */}
                  {activeDiagnosis?.kind === 'explain' && (
                    <div className="p-5 flex flex-col gap-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#ff5f52]">
                        Pattern Breakdown
                      </div>
                      <h3 className="text-sm font-bold text-[#f4f4f5]">
                        {activeDiagnosis.topic}
                      </h3>
                      <div className="flex flex-col gap-3 mt-2">
                        {activeDiagnosis.bullets.map((b, i) => (
                          <div key={i} className="p-3 bg-[#18181b] border border-[#27272a] rounded-lg text-xs">
                            <div className="font-semibold text-[#f4f4f5] mb-1 flex items-center justify-between">
                              <span>{b.label}</span>
                              {b.evidenceIds.length > 0 && (
                                <span className="text-[10px] text-[#71717a] font-mono">
                                  {b.evidenceIds.length} evidence cited
                                </span>
                              )}
                            </div>
                            <p className="text-[#a1a1aa] leading-relaxed">{b.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mode 5: History */}
                  {activeDiagnosis?.kind === 'history' && (
                    <div className="p-6 flex flex-col gap-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8]">
                        Failure Timeline Summary
                      </div>
                      <p className="text-sm text-[#f4f4f5] leading-relaxed">
                        {activeDiagnosis.summary}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActivePanel('evidence')}
                        className="mt-2 text-xs text-[#38bdf8] font-semibold hover:underline self-start cursor-pointer bg-transparent border-none p-0"
                      >
                        View all {activeDiagnosis.count} historical cases in RAG Evidence tab →
                      </button>
                    </div>
                  )}

                  {/* Fallback when no v2 diagnosis available */}
                  {!activeDiagnosis && (
                    <div className="p-4 h-full">
                      {explanationLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                          <div style={{ width: 24, height: 24, border: '2px solid #1f1f1f', borderTop: '2px solid #ff5f52', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          <span style={{ fontSize: 13, color: '#52525b' }}>Generating explanation…</span>
                          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                      ) : failureExplanation ? (
                        <FailureExplanationCard explanation={failureExplanation as any} />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 32 }}>
                          <span style={{ fontSize: 40 }}>🧠</span>
                          <span style={{ color: '#71717a', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>AI Diagnosis Ready</span>
                          <span style={{ color: '#3f3f46', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
                            Ask a question or paste your code snippet to see the error location, failing tests, and learning concepts.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activePanel === 'evidence' && (
                <div className="h-full">
                  {/* Code Review Mode */}
                  {activeDiagnosis?.kind === 'code_review' && (
                    <>
                      {activeDiagnosis.hasHistory ? (
                        <PastFailureTimeline
                          headerText={activeDiagnosis.headerText}
                          failures={lastResult?.similarFailures || []}
                        />
                      ) : (
                        <FirstOccurrenceEmptyState />
                      )}
                    </>
                  )}

                  {/* Submission Review Mode */}
                  {activeDiagnosis?.kind === 'submission_review' && (
                    <PastFailureTimeline
                      headerText={`Historical Failures on ${activeDiagnosis.problem.title}`}
                      failures={lastResult?.similarFailures || []}
                    />
                  )}

                  {/* History Mode */}
                  {activeDiagnosis?.kind === 'history' && (
                    <PastFailureTimeline
                      headerText={activeDiagnosis.summary}
                      failures={activeDiagnosis.timeline}
                    />
                  )}

                  {/* Plan Mode: Topics Overview */}
                  {activeDiagnosis?.kind === 'plan' && (
                    <div className="p-5 flex flex-col gap-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#a855f7]">
                        Plan Concepts & Focus Areas
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {activeDiagnosis.topics.map((topic, i) => (
                          <div
                            key={i}
                            className="p-3 bg-[#18181b] border border-[#27272a] rounded-lg flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-[#f4f4f5]">{topic.name}</span>
                            <span className="text-[#a1a1aa] font-mono text-[11px]">Curated drill</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explain Mode */}
                  {activeDiagnosis?.kind === 'explain' && (
                    <div className="p-5 flex flex-col gap-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
                        Past Failures On This Cause ({activeDiagnosis.pastFailures.length})
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {activeDiagnosis.pastFailures.map((pf) => (
                          <div key={pf.id} className="p-3 bg-[#18181b] border border-[#27272a] rounded-lg text-xs">
                            <div className="flex items-center justify-between font-semibold text-[#f4f4f5]">
                              <span>{pf.problemTitle}</span>
                              <span className="text-[10px] text-[#71717a]">{pf.date}</span>
                            </div>
                            <div className="text-rose-400 text-[11px] mt-1">{pf.status}</div>
                            {pf.snippet && (
                              <div className="font-mono text-[10px] bg-[#121214] text-[#a1a1aa] p-1.5 rounded mt-1.5">
                                {pf.snippet}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fallback to legacy evidence */}
                  {!activeDiagnosis && <EvidencePanel result={lastResult} />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
