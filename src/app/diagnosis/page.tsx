'use client';
import { AppShell } from '@/components/layout/AppShell';
import { useDiagnosisGenerate, type DiagnosisData } from '@/hooks/usePhase3Queries';

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type DiagnosisResult = DiagnosisData;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: '#22c55e',
  Medium: '#f59e0b',
  Hard: '#ef4444',
  Unknown: '#71717a',
};

// ─── Similarity Badge ──────────────────────────────────────────────────────────
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

// ─── Evidence Panel ────────────────────────────────────────────────────────────
function EvidencePanel({ result }: { result: DiagnosisResult | null }) {
  if (!result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 32 }}>
        <span style={{ fontSize: 40 }}>🔬</span>
        <span style={{ color: '#71717a', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>RAG Evidence</span>
        <span style={{ color: '#3f3f46', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
          Ask a question about your failures to see retrieved similar cases and evidence used in the diagnosis.
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

      {/* Reasoning Chain */}
      {result.reasoningChain?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#71717a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Reasoning Chain
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.reasoningChain.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: '#1f1f1f',
                  border: '1px solid #3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#71717a', flexShrink: 0, marginTop: 1,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Recommendations */}
      {result.recommendations?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#71717a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Recommendations
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.recommendations.map((r, i) => (
              <div key={i} style={{
                background: '#052e16', borderRadius: 8, padding: '10px 12px',
                border: '1px solid #166534',
              }}>
                <div style={{ fontSize: 12, color: '#86efac', fontWeight: 600, marginBottom: 4 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#4ade80', lineHeight: 1.4 }}>{r.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chat Bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: 4,
    }}>
      <div style={{
        maxWidth: '85%', padding: '12px 16px', borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? '#ff5f52' : '#1e1e1e',
        border: isUser ? 'none' : '1px solid #2a2a2a',
        fontSize: 13, color: isUser ? '#fff' : '#e4e4e7', lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
      </div>
      <span style={{ fontSize: 10, color: '#3f3f46', marginLeft: isUser ? 0 : 4, marginRight: isUser ? 4 : 0 }}>
        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

// ─── Quick Prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  'What is my most recurring failure pattern?',
  'Explain my boundary condition errors',
  'What should I practice this week?',
  'Analyze my time complexity mistakes',
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DiagnosisPage() {
  const diagnosisMutation = useDiagnosisGenerate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuid(),
      role: 'assistant',
      content: "Hello! I'm your AI Failure Analyst. Ask me anything about your competitive programming patterns — I'll retrieve your past failures, analyze the evidence, and give you a targeted diagnosis.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const loading = diagnosisMutation.isPending;
  const [lastResult, setLastResult] = useState<DiagnosisResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: uuid(), role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const d = await diagnosisMutation.mutateAsync(text.trim());
      setLastResult(d);

      const assistantMsg: Message = {
        id: uuid(),
        role: 'assistant',
        content: d.analysis || 'Analysis complete. Check the evidence panel for detailed results.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate diagnosis. Please try again.';
      setMessages(prev => [...prev, {
        id: uuid(), role: 'assistant',
        content: `❌ ${message}`,
        timestamp: new Date(),
      }]);
    }
  }, [loading, diagnosisMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <AppShell>
    <div style={{ width: '100%', height: '100vh', background: '#131313', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid #1f1f1f',
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#161616',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f52', boxShadow: '0 0 8px #ff5f52' }} />
        <span style={{ fontSize: '17px', fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
          AI Diagnosis
        </span>
        <span style={{ fontSize: 12, color: '#52525b', marginLeft: 4 }}>Powered by RAG + Claude / GPT-4o</span>
      </div>

      {/* Split pane */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: Chat (60%) */}
        <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1f1f1f' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map(m => <ChatBubble key={m.id} msg={m} />)}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#1e1e1e', borderRadius: '16px 16px 16px 4px', border: '1px solid #2a2a2a', width: 'fit-content' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#ff5f52',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
                <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div style={{ padding: '0 24px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  style={{
                    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20,
                    padding: '6px 14px', fontSize: 12, color: '#a1a1aa', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#ff5f52'; (e.target as HTMLElement).style.color = '#ff5f52'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#2a2a2a'; (e.target as HTMLElement).style.color = '#a1a1aa'; }}
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
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your failure patterns… (Enter to send)"
                rows={2}
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

        {/* Right: Evidence Panel (40%) */}
        <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', background: '#141414' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #1f1f1f' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#71717a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              RAG Evidence & Context
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <EvidencePanel result={lastResult} />
          </div>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
