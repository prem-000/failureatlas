'use client';
/**
 * src/components/intelligence/FailureExplanationCard.tsx
 *
 * Renders the AI-generated FailureExplanation for a failed submission.
 * Sections: Verdict Banner, Root Cause, Reason, Logic Breakdown,
 *           Test Case, Evidence Checklist, Learning Concept,
 *           Recurring Patterns, Estimated Time.
 */

import { useState } from 'react';
import type {
  FailureExplanation,
  ExplanationEvidenceItem,
  ExplanationTestCase,
  RecurringPattern,
  AIEvidenceNote,
  RAGEvidenceItem,
} from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Boundary Condition': '#f59e0b',
  'Edge Case': '#8b5cf6',
  'Off-by-One': '#f97316',
  'Overflow': '#ef4444',
  'Bit Manipulation': '#06b6d4',
  'Greedy Failure': '#10b981',
  'HashMap Misuse': '#3b82f6',
  'Graph Traversal': '#6366f1',
  'Dynamic Programming State Error': '#d946ef',
  'Binary Search Condition': '#14b8a6',
  'Prefix Sum Error': '#f59e0b',
  'Algorithm Selection': '#a855f7',
  'Implementation Detail': '#64748b',
  'Unknown': '#71717a',
};

const SOURCE_ICONS: Record<string, string> = {
  network: '🌐',
  diff: '📝',
  behavioral: '🧠',
  history: '📚',
};

const VERDICT_COLORS: Record<string, string> = {
  'Wrong Answer': '#ef4444',
  'Time Limit Exceeded': '#f59e0b',
  'Memory Limit Exceeded': '#8b5cf6',
  'Runtime Error': '#f97316',
  'Compilation Error': '#64748b',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 36 }}>{value}%</span>
    </div>
  );
}

function EvidenceChecklist({ items }: { items: ExplanationEvidenceItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>
            {item.confirmed ? '✓' : '⚠'}
          </span>
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: 12,
                color: item.confirmed ? '#a1a1aa' : '#f59e0b',
                lineHeight: 1.5,
              }}
            >
              {SOURCE_ICONS[item.source] ?? '•'} {item.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TestCasePanel({ tc }: { tc: ExplanationTestCase }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(tc.input).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      style={{
        background: '#111',
        border: `1px solid ${tc.isActualFailedCase ? '#3b82f6' : '#8b5cf6'}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          background: tc.isActualFailedCase ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: tc.isActualFailedCase ? '#3b82f6' : '#8b5cf6',
          }}
        >
          {tc.isActualFailedCase ? '🎯 Actual Failing Test Case' : '🤖 AI-Generated Representative Case'}
        </span>
        <button
          onClick={copy}
          style={{
            background: 'transparent',
            border: '1px solid #3f3f46',
            borderRadius: 6,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: 11,
            color: '#71717a',
          }}
        >
          {copied ? '✓ Copied' : 'Copy Input'}
        </button>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Input */}
        <div>
          <div style={{ fontSize: 10, color: '#71717a', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Input
          </div>
          <pre style={{ margin: 0, fontSize: 13, color: '#e4e4e7', background: '#1a1a1a', padding: '10px 12px', borderRadius: 6, overflowX: 'auto', fontFamily: 'monospace' }}>
            {tc.input}
          </pre>
        </div>

        {/* Expected vs Actual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
          <div>
            <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Expected
            </div>
            <pre style={{ margin: 0, fontSize: 13, color: '#22c55e', background: '#0a1a0a', padding: '8px 10px', borderRadius: 6, overflowX: 'auto', fontFamily: 'monospace' }}>
              {tc.expectedOutput}
            </pre>
          </div>
          {tc.userOutput && (
            <div>
              <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Your Output
              </div>
              <pre style={{ margin: 0, fontSize: 13, color: '#ef4444', background: '#1a0a0a', padding: '8px 10px', borderRadius: 6, overflowX: 'auto', fontFamily: 'monospace' }}>
                {tc.userOutput}
              </pre>
            </div>
          )}
        </div>

        {/* Explanation */}
        <div style={{ padding: '10px 12px', background: '#1a1a1a', borderRadius: 8, borderLeft: '3px solid #f59e0b' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#a1a1aa', lineHeight: 1.6 }}>
            {tc.explanation}
          </p>
        </div>

        {/* Failure mode badge */}
        <span
          style={{
            alignSelf: 'flex-start',
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            background: 'rgba(239,68,68,0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          {tc.failureMode}
        </span>
      </div>
    </div>
  );
}

function RecurringPatternsPanel({ patterns }: { patterns: RecurringPattern[] }) {
  if (patterns.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 10, color: '#71717a', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
        Recurring Failure Patterns
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {patterns.map((p, i) => {
          const color = CATEGORY_COLORS[p.category] ?? '#71717a';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: '#111',
                borderRadius: 8,
                border: `1px solid ${color}33`,
              }}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color }}>{p.category}</span>
                <span style={{ fontSize: 11, color: '#52525b', marginLeft: 8 }}>in {p.problemType}</span>
              </div>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: `${color}20`,
                  color,
                  border: `1px solid ${color}40`,
                }}
              >
                {p.count}×
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Evidence Component (No-Link-First Technical Guidance) ──────────────────

function AIEvidencePanel({ notes }: { notes: AIEvidenceNote[] }) {
  if (!notes || notes.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: '#a855f7', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          🧠 AI Evidence · Technical Learning Guidance
        </div>
        <span style={{ fontSize: 11, color: '#71717a', fontFamily: 'monospace' }}>
          SCORE-DRIVEN · NO-LINK-FIRST
        </span>
      </div>

      {notes.map((note, idx) => {
        const qualityColor =
          note.informationQuality === 'high'
            ? '#22c55e'
            : note.informationQuality === 'medium'
            ? '#f59e0b'
            : '#ef4444';

        return (
          <div
            key={idx}
            style={{
              background: '#111113',
              borderRadius: 12,
              border: '1px solid #27272a',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* 1. Topic Title and Meaningful Relevance Label */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#f4f4f5' }}>
                {note.topic}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: `${qualityColor}18`,
                  color: qualityColor,
                  border: `1px solid ${qualityColor}40`,
                  fontWeight: 600,
                }}
              >
                {(note.relevanceScore * 100).toFixed(0)}% Relevance · {note.informationQuality.toUpperCase()}
              </span>
            </div>

            {/* 2. Short Explanation */}
            <p style={{ margin: 0, fontSize: 14, color: '#d4d4d8', lineHeight: 1.6 }}>
              {note.shortExplanation}
            </p>

            {/* 3. Why the Concept Matters */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 4 }}>
                Why This Concept Matters
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
                {note.whyItMatters}
              </p>
            </div>

            {/* 4. Connection to Current Failure */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 4 }}>
                Connection to Current Failure
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#e4e4e7',
                  lineHeight: 1.6,
                  background: '#18181b',
                  padding: '10px 12px',
                  borderRadius: 8,
                  borderLeft: '3px solid #ff5f52',
                }}
              >
                {note.connectionToCurrentFailure}
              </p>
            </div>

            {/* 5. Key Takeaway */}
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.06)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: 8,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Key Takeaway
              </div>
              <div style={{ fontSize: 13, color: '#d4d4d8', lineHeight: 1.5 }}>
                {note.keyTakeaway}
              </div>
            </div>

            {/* 6. Related Topics & Supporting Evidence References */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                paddingTop: 6,
                borderTop: '1px solid #1f1f23',
              }}
            >
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#71717a' }}>Related Topics:</span>
                {note.relatedTopics.map((rt, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      background: '#18181b',
                      color: '#a1a1aa',
                      padding: '2px 8px',
                      borderRadius: 6,
                      border: '1px solid #27272a',
                    }}
                  >
                    {rt}
                  </span>
                ))}
              </div>

              {note.supportingEvidenceIds.length > 0 && (
                <span style={{ fontSize: 11, color: '#52525b', fontFamily: 'monospace' }}>
                  Evidence: {note.supportingEvidenceIds.slice(0, 2).join(', ')}
                </span>
              )}
            </div>

            {/* Uncertainty Note if applicable */}
            {note.uncertaintyNote && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: 6,
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  fontSize: 12,
                  color: '#f59e0b',
                }}
              >
                ⚠️ {note.uncertaintyNote}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── RAG Evidence Component (Failure Mechanism Demonstration) ─────────────────

function RAGEvidencePanel({ items }: { items: RAGEvidenceItem[] }) {
  if (!items || items.length === 0) return null;

  const TYPE_BADGES: Record<string, { label: string; color: string }> = {
    direct_code: { label: 'Direct Code', color: '#3b82f6' },
    test_outcome: { label: 'Test Outcome', color: '#f59e0b' },
    graph_inference: { label: 'Graph Inference', color: '#a855f7' },
    historical_analogy: { label: 'Historical Analogy', color: '#06b6d4' },
    learning_catalog: { label: 'Learning Concept', color: '#22c55e' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          🔍 RAG Evidence · Failure Support
        </div>
        <span style={{ fontSize: 11, color: '#71717a', fontFamily: 'monospace' }}>
          {items.length} ACCEPTED EVIDENCE ITEM{items.length === 1 ? '' : 'S'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((ev, i) => {
          const badge = TYPE_BADGES[ev.evidenceType] || { label: ev.evidenceType, color: '#71717a' };

          return (
            <div
              key={i}
              style={{
                background: '#111113',
                borderRadius: 10,
                border: '1px solid #27272a',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Header: Badge, Related Problem, Scores */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: `${badge.color}15`,
                      color: badge.color,
                      border: `1px solid ${badge.color}40`,
                    }}
                  >
                    {badge.label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>
                    {ev.relatedProblem}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#a1a1aa', background: '#18181b', padding: '2px 6px', borderRadius: 4, border: '1px solid #27272a' }}>
                    Relevance: {(ev.retrievalRelevanceScore * 100).toFixed(0)}%
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#a1a1aa', background: '#18181b', padding: '2px 6px', borderRadius: 4, border: '1px solid #27272a' }}>
                    Support: {(ev.rootCauseSupportScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Observed Signal */}
              <div style={{ fontSize: 12, color: '#d4d4d8', lineHeight: 1.5 }}>
                <span style={{ color: '#71717a', fontWeight: 600 }}>Observed Signal: </span>
                {ev.observedSignal}
              </div>

              {/* Code Evidence if present */}
              {ev.codeEvidence && (
                <pre
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: '#e4e4e7',
                    background: '#18181b',
                    padding: '8px 10px',
                    borderRadius: 6,
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    border: '1px solid #27272a',
                  }}
                >
                  {ev.codeEvidence}
                </pre>
              )}

              {/* Failure Mechanism */}
              <div
                style={{
                  fontSize: 12,
                  color: '#a1a1aa',
                  lineHeight: 1.5,
                  background: '#141416',
                  padding: '8px 10px',
                  borderRadius: 6,
                  borderLeft: `3px solid ${badge.color}`,
                }}
              >
                <span style={{ color: '#f4f4f5', fontWeight: 500 }}>Mechanism: </span>
                {ev.failureMechanism}
              </div>

              {/* Provenance Metadata */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#52525b', fontFamily: 'monospace', paddingTop: 2 }}>
                <span>ID: {ev.evidenceId}</span>
                <span>Provenance: {ev.provenance?.sourceType || 'system'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FailureExplanationCardProps {
  explanation: FailureExplanation;
  problemTitle?: string;
}

export function FailureExplanationCard({ explanation, problemTitle }: FailureExplanationCardProps) {
  const [expanded, setExpanded] = useState(true);
  const verdictColor = VERDICT_COLORS[explanation.verdict] ?? '#ef4444';
  const categoryColor = CATEGORY_COLORS[explanation.rootCauseCategory] ?? '#71717a';

  const resolvedAiEvidence: AIEvidenceNote[] = explanation.aiEvidence && explanation.aiEvidence.length > 0
    ? explanation.aiEvidence
    : [
        {
          topic: explanation.learningConcept || explanation.rootCause,
          shortExplanation: explanation.logicBreakdown || explanation.reason,
          whyItMatters: `Understanding ${explanation.rootCauseCategory} prevents recurring failures in competitive programming problems.`,
          connectionToCurrentFailure: `Your submission failed under verdict "${explanation.verdict}": ${explanation.reason}`,
          keyTakeaway: explanation.recommendation || 'Verify loop invariants and test boundary edge cases.',
          relatedTopics: [explanation.rootCauseCategory, 'Invariant Verification', 'Edge Cases'],
          relevanceScore: Math.min(1.0, Math.max(0.6, explanation.confidence / 100)),
          supportingEvidenceIds: explanation.evidenceItems.map((_, idx) => `ev_${idx + 1}`),
          informationQuality: explanation.confidence >= 80 ? 'high' : explanation.confidence >= 60 ? 'medium' : 'low',
        },
      ];

  const resolvedRagEvidence: RAGEvidenceItem[] = explanation.ragEvidence && explanation.ragEvidence.length > 0
    ? explanation.ragEvidence
    : explanation.evidenceItems.map((item, idx) => ({
        evidenceId: `ev_obs_${idx + 1}`,
        relatedProblem: problemTitle || 'Current Problem',
        observedSignal: item.label,
        failureMechanism: explanation.reason,
        supportedRootCause: explanation.rootCause,
        relatedWeakness: explanation.rootCauseCategory,
        retrievalRelevanceScore: item.confirmed ? 0.95 : 0.65,
        rootCauseSupportScore: item.confirmed ? 0.90 : 0.60,
        evidenceType: item.source === 'diff' ? 'direct_code' : item.source === 'network' ? 'test_outcome' : 'historical_analogy',
        provenance: {
          sourceType: item.source,
          sourceId: `item_${idx + 1}`,
          retrievalTimestamp: explanation.generatedAt,
          queryUsed: 'failure_explanation',
        },
      }));

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #0f0f0f 0%, #141414 100%)',
        borderRadius: 16,
        border: '1px solid #1f1f1f',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ── Verdict Banner ─────────────────────────────────────────── */}
      <div
        style={{
          padding: '16px 20px',
          background: `linear-gradient(135deg, ${verdictColor}18 0%, transparent 60%)`,
          borderBottom: `1px solid ${verdictColor}30`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                background: `${verdictColor}20`,
                color: verdictColor,
                border: `1px solid ${verdictColor}50`,
              }}
            >
              ✗ {explanation.verdict}
            </span>
            {explanation.testCasesPassed != null && explanation.totalTestCases != null && (
              <span style={{ fontSize: 12, color: '#71717a' }}>
                {explanation.testCasesPassed}/{explanation.totalTestCases} passed
              </span>
            )}
          </div>
          {problemTitle && (
            <p style={{ margin: 0, fontSize: 14, color: '#a1a1aa', fontWeight: 500 }}>
              {problemTitle}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#52525b' }}>
            {new Date(explanation.generatedAt).toLocaleTimeString()}
          </span>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: '#1f1f1f',
              border: '1px solid #3f3f46',
              borderRadius: 8,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 12,
              color: '#71717a',
            }}
          >
            {expanded ? '▲ Collapse' : '▼ Expand'}
          </button>
        </div>
      </div>

      {!expanded && (
        <div style={{ padding: '12px 20px' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#52525b' }}>
            Root Cause: <span style={{ color: categoryColor, fontWeight: 600 }}>{explanation.rootCause}</span>
          </p>
        </div>
      )}

      {expanded && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* ── Root Cause + Confidence ───────────────────────────── */}
          <div
            className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start"
            style={{
              padding: '16px',
              background: '#111',
              borderRadius: 12,
              border: `1px solid ${categoryColor}30`,
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Root Cause
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  background: `${categoryColor}15`,
                  color: categoryColor,
                  border: `1px solid ${categoryColor}40`,
                  marginBottom: 10,
                }}
              >
                {explanation.rootCause}
              </span>
              <div style={{ fontSize: 11, color: '#52525b', marginBottom: 10 }}>
                Category: <span style={{ color: categoryColor }}>{explanation.rootCauseCategory}</span>
              </div>
              <ConfidenceBar value={explanation.confidence} />
            </div>

            <div className="text-left sm:text-right">
              <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                Confidence
              </div>
              <span style={{ fontSize: 28, fontWeight: 900, color: categoryColor }}>
                {explanation.confidence}%
              </span>
            </div>
          </div>

          {/* ── Reason ───────────────────────────────────────────────── */}
          <div>
            <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Why It Failed
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#d4d4d8', lineHeight: 1.7, background: '#111', padding: '14px 16px', borderRadius: 10, border: '1px solid #1f1f1f' }}>
              {explanation.reason}
            </p>
          </div>

          {/* ── Logic Breakdown ───────────────────────────────────────── */}
          <div>
            <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Logic Breakdown
            </div>
            <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f1f1f', borderLeft: '3px solid #ef4444' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#a1a1aa', lineHeight: 1.7 }}>
                {explanation.logicBreakdown}
              </p>
            </div>
          </div>

          {/* ── Test Case ─────────────────────────────────────────────── */}
          {explanation.representativeTestCase && (
            <div>
              <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Test Case
              </div>
              <TestCasePanel tc={explanation.representativeTestCase} />
            </div>
          )}

          {/* ── Evidence Checklist ────────────────────────────────────── */}
          {explanation.evidenceItems.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Evidence
              </div>
              <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f1f1f' }}>
                <EvidenceChecklist items={explanation.evidenceItems} />
              </div>
            </div>
          )}

          {/* ── RAG Evidence (Why Failure Occurred) ────────────────── */}
          <RAGEvidencePanel items={resolvedRagEvidence} />

          {/* ── AI Evidence (Technical Learning Guidance) ───────────── */}
          <AIEvidencePanel notes={resolvedAiEvidence} />

          {/* ── Learning Concept + Recommendation ────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f1f1f' }}>
              <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Learning Concept
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#a855f7' }}>
                📖 {explanation.learningConcept}
              </span>
            </div>

            <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px', border: '1px solid #1f1f1f' }}>
              <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Estimated Study Time
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
                ⏱ {explanation.estimatedLearningTimeMinutes} min
              </span>
            </div>
          </div>

          {/* ── Recommendation ────────────────────────────────────────── */}
          <div style={{ background: 'rgba(34,197,94,0.05)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Recommendation
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
              {explanation.recommendation}
            </p>
          </div>

          {/* ── Resources ────────────────────────────────────────────── */}
          {explanation.resources && explanation.resources.length > 0 && (
            <div style={{ background: 'rgba(34,197,94,0.05)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Resources
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {explanation.resources.slice(0, 3).map((res, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ color: '#71717a' }}>•</span>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a1a1aa', textDecoration: 'underline', textUnderlineOffset: 3 }}
                    >
                      {res.title}
                    </a>
                    <span style={{ fontSize: 11, color: '#52525b' }}>({res.source})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recurring Patterns ────────────────────────────────────── */}
          <RecurringPatternsPanel patterns={explanation.recurringPatterns} />
        </div>
      )}
    </div>
  );
}