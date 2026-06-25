'use client';

import { useState, useEffect } from 'react';
import {
  Bug, Zap, RefreshCw, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, Terminal, Brain,
  Lightbulb, Activity, Target, Shuffle, Clock, Code2
} from 'lucide-react';
import { useFailureReplay } from '@/hooks/useFailureReplay';
import { ReplayBottomSheet } from './ReplayBottomSheet';
import type { FailureReplay, CounterExample, ExecutionStep } from '@/types';

// ─── Submission Picker ────────────────────────────────────────────────────────

interface FailureSubmission {
  id: string;
  eventId: string;
  problemTitle: string;
  problemSlug: string;
  status: string;
  language: string;
  timestamp: string;
}

function useRecentFailures() {
  const [failures, setFailures] = useState<FailureSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('praxis_token') || sessionStorage.getItem('praxis_token');
    fetch('/api/submissions?status=Wrong Answer&limit=10', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((json: { submissions?: { eventId: string; problemSlug: string; problemTitle: string; submissionStatus: string; timestamp: number }[] }) => {
        const subs = json.submissions ?? [];
        setFailures(
          subs
            .filter((s) => ['Wrong Answer', 'Runtime Error', 'Time Limit Exceeded'].includes(s.submissionStatus))
            .slice(0, 8)
            .map((s) => ({
              id: s.eventId,
              eventId: s.eventId,
              problemTitle: s.problemTitle ?? s.problemSlug,
              problemSlug: s.problemSlug,
              status: s.submissionStatus,
              language: 'javascript',
              timestamp: new Date(s.timestamp).toLocaleDateString(),
            }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { failures, loading };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    'Wrong Answer': { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
    'Runtime Error': { bg: 'rgba(249,115,22,0.12)', color: '#fb923c' },
    'Time Limit Exceeded': { bg: 'rgba(234,179,8,0.12)', color: '#facc15' },
  };
  const style = colors[verdict] ?? { bg: 'rgba(113,113,122,0.12)', color: '#71717a' };
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: '2px 8px', borderRadius: 6,
      fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
      border: `1px solid ${style.color}33`,
    }}>
      {verdict}
    </span>
  );
}

function TraceStep({ step, index }: { step: ExecutionStep; index: number }) {
  const colors = {
    normal: { border: 'rgba(255,255,255,0.06)', icon: '#52525b', bg: 'transparent' },
    critical: { border: 'rgba(251,191,36,0.3)', icon: '#fbbf24', bg: 'rgba(251,191,36,0.04)' },
    bug: { border: 'rgba(239,68,68,0.3)', icon: '#ef4444', bg: 'rgba(239,68,68,0.06)' },
  };
  const s = colors[step.significance];

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 12px',
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 10, marginBottom: 6,
      animation: `fadeSlideIn ${150 + index * 60}ms ease both`,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: `${s.icon}22`, border: `1px solid ${s.icon}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 10, fontWeight: 800, color: s.icon,
      }}>
        {step.step}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>
          {step.description.replace(/\*\*(.+?)\*\*/g, '$1')}
        </p>
        {step.codeSnippet && (
          <code style={{
            display: 'block', marginTop: 5,
            background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '4px 8px',
            fontSize: 11, color: '#a78bfa', fontFamily: "'Fira Code', monospace",
            overflowX: 'auto',
          }}>
            {step.codeSnippet}
          </code>
        )}
        {step.variableState && Object.keys(step.variableState).length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
            {Object.entries(step.variableState).map(([k, v]) => (
              <span key={k} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                padding: '2px 7px', borderRadius: 5, fontSize: 10, color: '#71717a',
                fontFamily: 'monospace',
              }}>
                <span style={{ color: '#e4e4e7' }}>{k}</span> = <span style={{ color: '#86efac' }}>{v}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CounterExampleCard({ ce, onViewTrace }: { ce: CounterExample; onViewTrace: () => void }) {
  return (
    <div>
      {/* Hero: Candidate count */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(168,85,247,0.08))',
        border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Target size={18} style={{ color: '#ef4444' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#71717a', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Found after testing
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#e4e4e7', letterSpacing: '-0.03em' }}>
            {ce.candidatesTestedCount.toLocaleString()} candidate inputs
          </div>
        </div>
      </div>

      {/* Input / Expected / Actual */}
      <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Minimal Failing Input', value: ce.input, color: '#a78bfa', icon: '→' },
          { label: 'Expected Output', value: ce.expected, color: '#22c55e', icon: '✓' },
          { label: 'Your Output', value: ce.actual, color: '#ef4444', icon: '✗' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              <span style={{ color, marginRight: 5 }}>{icon}</span>{label}
            </div>
            <code style={{ fontFamily: "'Fira Code', monospace", fontSize: 13, color, wordBreak: 'break-all' }}>
              {value || '(empty)'}
            </code>
          </div>
        ))}
      </div>

      {/* Root Cause Badge */}
      <div style={{
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
        borderRadius: 12, padding: '12px 14px', marginBottom: 16,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 3 }}>
            {ce.rootCause.label}
            <span style={{ marginLeft: 6, fontSize: 10, color: '#a16207', fontWeight: 600 }}>
              {ce.rootCause.confidence}% confidence
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#78716c', lineHeight: 1.5 }}>
            {ce.rootCause.evidenceSummary}
          </div>
        </div>
      </div>

      {/* AI Explanation */}
      <div style={{
        background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Brain size={14} style={{ color: '#a78bfa' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', letterSpacing: '-0.01em' }}>AI Explanation</span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#a1a1aa', lineHeight: 1.6 }}>
          {ce.aiExplanation.whyItFails}
        </p>
        <div style={{
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
          borderRadius: 8, padding: '8px 12px',
        }}>
          <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginBottom: 3, letterSpacing: '0.04em' }}>
            💡 SUGGESTED FIX
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#86efac', lineHeight: 1.5 }}>
            {ce.aiExplanation.fixSuggestion}
          </p>
        </div>
      </div>

      {/* View Trace Button */}
      <button
        onClick={onViewTrace}
        style={{
          width: '100%', padding: '11px 0',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, color: '#a1a1aa', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 150ms',
        }}
      >
        <Terminal size={13} /> View Execution Trace
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function FailureReplayTab() {
  const { failures, loading: failuresLoading } = useRecentFailures();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Auto-select first failure on load
  useEffect(() => {
    if (failures.length > 0 && !selectedId) {
      setSelectedId(failures[0].id);
    }
  }, [failures, selectedId]);

  const { status, data, error, isLoading, run, regenerate } = useFailureReplay(selectedId);
  const selected = failures.find(f => f.id === selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setTraceOpen(false);
  };

  const replay = data as FailureReplay | null;
  const ce = replay?.counterExample ?? null;

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#0d0d0f' }}>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .replay-spin { animation: spin 0.8s linear infinite; }
        .replay-sub-btn { transition: all 150ms ease; }
        .replay-sub-btn:hover { background: rgba(255,255,255,0.05) !important; }
        .replay-sub-btn.active { background: rgba(239,68,68,0.1) !important; border-color: rgba(239,68,68,0.25) !important; }
        .regen-btn { transition: all 150ms ease; }
        .regen-btn:hover:not(:disabled) { background: rgba(168,85,247,0.15) !important; border-color: rgba(168,85,247,0.4) !important; }
        .regen-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .run-btn { transition: all 150ms ease; }
        .run-btn:hover:not(:disabled) { background: rgba(239,68,68,0.2) !important; }
        .run-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        @media (max-width: 767px) {
          .replay-layout { flex-direction: column !important; }
          .replay-sidebar { width: 100% !important; max-height: 180px !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; }
          .replay-main { overflow-y: auto !important; }
        }
      `}</style>

      {/* ── Left sidebar: submission picker ── */}
      <div className="replay-sidebar" style={{
        width: 240, borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '12px 14px 8px',
          fontSize: 10, fontWeight: 800, color: '#3f3f46',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          Recent Failures
        </div>

        {failuresLoading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#3f3f46', fontSize: 12 }}>
            <RefreshCw size={14} className="replay-spin" style={{ display: 'inline-block', marginBottom: 6 }} />
            <br />Loading...
          </div>
        ) : failures.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#3f3f46', fontSize: 12, lineHeight: 1.6 }}>
            No failed submissions found.<br />Submit a problem to start.
          </div>
        ) : (
          <div style={{ padding: 8 }}>
            {failures.map(f => (
              <button
                key={f.id}
                className={`replay-sub-btn ${selectedId === f.id ? 'active' : ''}`}
                onClick={() => handleSelect(f.id)}
                style={{
                  width: '100%', padding: '10px 10px',
                  background: 'transparent', border: '1px solid transparent',
                  borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                  marginBottom: 3,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e4e4e7', marginBottom: 3, lineHeight: 1.3 }}>
                  {f.problemTitle}
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <VerdictBadge verdict={f.status} />
                  <span style={{ fontSize: 10, color: '#3f3f46' }}>{f.timestamp}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="replay-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bug size={16} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e4e4e7', letterSpacing: '-0.02em' }}>
                Failure Replay
              </div>
              {selected && (
                <div style={{ fontSize: 11, color: '#52525b' }}>
                  {selected.problemTitle} · <VerdictBadge verdict={selected.status} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Generate Another */}
            {status === 'success' && ce && (
              <button
                className="regen-btn"
                onClick={regenerate}
                disabled={isLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 13px',
                  background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: 9, color: '#a78bfa', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                }}
              >
                <Shuffle size={12} />
                Generate Another
              </button>
            )}
            {/* Run / Rerun */}
            {selectedId && (
              <button
                className="run-btn"
                onClick={() => run()}
                disabled={isLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 13px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 9, color: '#f87171', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isLoading
                  ? <><RefreshCw size={12} className="replay-spin" /> Searching...</>
                  : status === 'success'
                  ? <><RefreshCw size={12} /> Rerun</>
                  : <><Zap size={12} /> Find Failure</>
                }
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

          {/* Idle state */}
          {status === 'idle' && (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Bug size={28} style={{ color: '#ef4444', opacity: 0.7 }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e4e4e7', marginBottom: 8 }}>
                Find the exact input that breaks your code
              </div>
              <p style={{ fontSize: 13, color: '#52525b', maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
                Praxis will generate thousands of candidate inputs, find the first failure,
                minimize it to the smallest form, and explain exactly why it breaks.
              </p>
              {selectedId ? (
                <button
                  className="run-btn"
                  onClick={() => run()}
                  style={{
                    padding: '12px 28px',
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 12, color: '#f87171', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <Zap size={15} />
                  Start Failure Discovery
                </button>
              ) : (
                <p style={{ fontSize: 12, color: '#3f3f46' }}>← Select a failed submission to begin</p>
              )}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                <Activity size={20} className="replay-spin" style={{ color: '#ef4444' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e4e4e7' }}>Discovering failure...</span>
              </div>
              <div style={{ maxWidth: 320, margin: '0 auto' }}>
                {['Generating candidate inputs', 'Running differential tests', 'Minimizing failing input', 'Building execution trace'].map((step, i) => (
                  <div key={step} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                    animation: `fadeSlideIn ${300 + i * 200}ms ease both`,
                  }}>
                    <RefreshCw size={11} className="replay-spin" style={{ color: '#ef4444', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#52525b' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div style={{
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12, padding: 20, textAlign: 'center',
            }}>
              <XCircle size={24} style={{ color: '#ef4444', marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>Replay Failed</div>
              <p style={{ fontSize: 12, color: '#7f1d1d', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Not applicable */}
          {status === 'not-applicable' && (
            <div style={{
              background: 'rgba(113,113,122,0.06)', border: '1px solid rgba(113,113,122,0.2)',
              borderRadius: 12, padding: 20, textAlign: 'center',
            }}>
              <CheckCircle size={24} style={{ color: '#22c55e', marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a1a1aa' }}>Replay Not Applicable</div>
              <p style={{ fontSize: 12, color: '#52525b', marginTop: 6, margin: 0 }}>
                Failure Replay only works for Wrong Answer, Runtime Error, and TLE submissions.
              </p>
            </div>
          )}

          {/* No failure found */}
          {status === 'success' && replay?.noFailureFound && (
            <div style={{
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 14, padding: '24px 20px', textAlign: 'center',
              animation: 'fadeSlideIn 300ms ease',
            }}>
              <CheckCircle size={32} style={{ color: '#22c55e', marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e4e4e7', marginBottom: 8 }}>
                No Failure Discovered
              </div>
              <p style={{ fontSize: 12, color: '#52525b', maxWidth: 320, margin: '0 auto 16px', lineHeight: 1.6 }}>
                Praxis tested 3,000 candidate inputs against the reference solution and all passed.
                The failure may be input-specific or constraint-related.
              </p>
              <button
                className="regen-btn"
                onClick={regenerate}
                style={{
                  padding: '9px 20px',
                  background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: 10, color: '#a78bfa', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Shuffle size={12} /> Try Different Seed
              </button>
            </div>
          )}

          {/* ── Success: Counter Example Found ── */}
          {status === 'success' && ce && (
            <div style={{ animation: 'fadeSlideIn 300ms ease' }}>
              {isMobile ? (
                // Mobile: show card, trace in bottom sheet
                <>
                  <CounterExampleCard ce={ce} onViewTrace={() => setTraceOpen(true)} />
                  <ReplayBottomSheet
                    isOpen={traceOpen}
                    onClose={() => setTraceOpen(false)}
                    title="Execution Trace"
                  >
                    {ce.executionTrace.map((step, i) => (
                      <TraceStep key={step.step} step={step} index={i} />
                    ))}
                  </ReplayBottomSheet>
                </>
              ) : (
                // Desktop: side-by-side
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                  <CounterExampleCard ce={ce} onViewTrace={() => {}} />

                  {/* Execution Trace panel */}
                  <div>
                    <div style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14, overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', gap: 7,
                      }}>
                        <Terminal size={13} style={{ color: '#52525b' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#71717a', letterSpacing: '-0.01em' }}>
                          Execution Trace
                        </span>
                      </div>
                      <div style={{ padding: 12 }}>
                        {ce.executionTrace.map((step, i) => (
                          <TraceStep key={step.step} step={step} index={i} />
                        ))}
                      </div>
                    </div>

                    {/* Key insight */}
                    <div style={{
                      marginTop: 12,
                      background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)',
                      borderRadius: 12, padding: '12px 14px',
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}>
                      <Lightbulb size={14} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <div style={{ fontSize: 10, color: '#a16207', fontWeight: 700, marginBottom: 3, letterSpacing: '0.04em' }}>
                          KEY INSIGHT
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
                          {ce.aiExplanation.keyInsight}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div style={{
                marginTop: 16, display: 'flex', alignItems: 'center', gap: 5,
                color: '#3f3f46', fontSize: 10,
              }}>
                <Clock size={10} />
                Replay generated at {replay?.generatedAt ? new Date(replay.generatedAt).toLocaleTimeString() : '—'} · Seed #{replay?.seed}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
