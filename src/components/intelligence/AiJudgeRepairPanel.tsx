'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/client';
import type { JudgeRepairData } from '@/app/api/behavior-insights/judge-repair/route';
import { ShieldAlert, Cpu, Wrench, CheckCircle2, Copy, Check, Terminal, FileCode2, ArrowRight } from 'lucide-react';

interface Props {
  submissionId: string;
  problemSlug?: string;
  problemTitle: string;
}

export function AiJudgeRepairPanel({ submissionId, problemSlug, problemTitle }: Props) {
  const [data, setData] = useState<JudgeRepairData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!submissionId && !problemSlug) return;
    setLoading(true);
    setError(null);

    apiFetch<{ success: boolean; data: JudgeRepairData }>('/api/behavior-insights/judge-repair', {
      method: 'POST',
      body: JSON.stringify({ submissionId, problemSlug }),
    })
      .then(res => {
        if (res.data) setData(res.data);
        else throw new Error('No repair data returned');
      })
      .catch(e => setError(e?.message || 'Failed to generate AI judge repair analysis'))
      .finally(() => setLoading(false));
  }, [submissionId, problemSlug]);

  const copyCode = () => {
    if (!data?.optimizedSolution?.code) return;
    navigator.clipboard.writeText(data.optimizedSolution.code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  if (loading) {
    return (
      <div style={{
        background: '#0d111c',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: 14,
        padding: '36px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.08)',
      }}>
        <div style={{
          width: 34,
          height: 34,
          border: '3px solid #1f293d',
          borderTopColor: '#ef4444',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
          Reconstructing hidden judge failure & synthesizing solution repair for <strong style={{ color: '#f87171' }}>{problemTitle}</strong>…
        </span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        background: '#181013',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 12,
        padding: '24px',
        color: '#fca5a5',
        fontSize: 13,
      }}>
        ⚠️ {error || 'Unable to generate AI Judge Repair data.'}
      </div>
    );
  }

  const { reconstruction, judgeCases = [], failureAnalysis = [], repairSteps = [], optimizedSolution } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #2a0a0e 0%, #150914 100%)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: 14,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 10,
            padding: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShieldAlert size={22} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              AI Judge Repair Mode <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 700, marginLeft: 6 }}>[WRONG ANSWER]</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Structural analysis, reconstructed judge failures, and optimized solution repair.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(168, 85, 247, 0.15)',
            color: '#c084fc',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}>
            🧠 {reconstruction.inferredAlgorithm}
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            ⚡ {reconstruction.complexity}
          </span>
        </div>
      </div>

      {/* 1. AI Judge Reconstruction */}
      <div style={{
        background: '#0a0d18',
        border: '1px solid rgba(168, 85, 247, 0.25)',
        borderRadius: 12,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={18} style={{ color: '#c084fc' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.04em' }}>
            1. AI JUDGE RECONSTRUCTION
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 12,
        }}>
          <div style={{ background: '#111625', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>INFERRED ALGORITHM</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#c084fc', marginTop: 4 }}>{reconstruction.inferredAlgorithm}</div>
          </div>
          <div style={{ background: '#111625', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>IMPLEMENTATION STRATEGY</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginTop: 4 }}>{reconstruction.implementationStrategy}</div>
          </div>
          <div style={{ background: '#111625', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>COMPLEXITY PROFILE</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa', marginTop: 4 }}>{reconstruction.complexity}</div>
          </div>
        </div>

        {reconstruction.weakAssumptions?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', letterSpacing: '0.04em' }}>DETECTED WEAK ASSUMPTIONS:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reconstruction.weakAssumptions.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                  <span style={{ color: '#ef4444', fontWeight: 800 }}>⚠️</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Hidden Judge Test Cases */}
      {judgeCases.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={18} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.04em' }}>
              2. RECONSTRUCTED HIDDEN JUDGE CASES ({judgeCases.length})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 14 }}>
            {judgeCases.map((tc, idx) => (
              <div
                key={idx}
                style={{
                  background: '#070a13',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 10,
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#e4e4e7' }}>
                    Judge Case #{idx + 1}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#fca5a5',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}>
                      {tc.failureMode || 'Wrong Answer'}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}>
                      {tc.difficulty || 'Medium'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>INPUT:</span>
                  <div style={{
                    background: '#04060b',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#f8fafc',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}>
                    {tc.input}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>EXPECTED OUTPUT:</span>
                  <div style={{
                    background: '#04060b',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#34d399',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}>
                    {tc.expectedOutput}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: '#fca5a5',
                }}>
                  <strong style={{ color: '#ef4444', marginRight: 4 }}>WHY IT FAILS:</strong> {tc.whyItFails}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Failure Explanation */}
      {failureAnalysis.length > 0 && (
        <div style={{
          background: '#0d1321',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 12,
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.04em' }}>
              3. FAILURE EXPLANATION
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {failureAnalysis.map((bullet, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12, color: '#e2e8f0', lineHeight: 1.5 }}>
                <span style={{ color: '#ef4444', fontWeight: 800 }}>•</span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Implementation Repair */}
      {repairSteps.length > 0 && (
        <div style={{
          background: '#0d1321',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 12,
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wrench size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.04em' }}>
              4. IMPLEMENTATION REPAIR
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {repairSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  background: '#070a13',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
                  Issue: {step.issue}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 10 }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 6, padding: '8px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: '0.05em' }}>CURRENT CODE:</span>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#fca5a5', marginTop: 4 }}>{step.current}</div>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 6, padding: '8px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', letterSpacing: '0.05em' }}>SUGGESTED FIX:</span>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#34d399', marginTop: 4 }}>{step.suggested}</div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
                  <strong style={{ color: '#f59e0b', marginRight: 4 }}>REASON:</strong> {step.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Optimized Solution */}
      {optimizedSolution && (
        <div style={{
          background: '#0d1321',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 12,
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCode2 size={18} style={{ color: '#10b981' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.04em' }}>
                5. OPTIMIZED SOLUTION
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                {optimizedSolution.timeComplexity}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}>
                {optimizedSolution.spaceComplexity}
              </span>
              <button
                onClick={copyCode}
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 6,
                  color: '#34d399',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                {copiedCode ? 'Copied' : 'Copy Code'}
              </button>
            </div>
          </div>

          <div style={{
            background: '#04060b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '14px 16px',
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.5,
            color: '#f8fafc',
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}>
            {optimizedSolution.code}
          </div>

          {optimizedSolution.robustnessReason && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 12,
              lineHeight: 1.5,
              color: '#a7f3d0',
            }}>
              <strong style={{ color: '#10b981', marginRight: 6 }}>ROBUSTNESS ANALYSIS:</strong>
              {optimizedSolution.robustnessReason}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
