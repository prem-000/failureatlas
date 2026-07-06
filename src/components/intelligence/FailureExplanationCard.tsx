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
import type { FailureExplanation, ExplanationEvidenceItem, ExplanationTestCase, RecurringPattern } from '@/types';

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

// ─── Main Component ───────────────────────────────────────────────────────────

interface FailureExplanationCardProps {
  explanation: FailureExplanation;
  problemTitle?: string;
}

export function FailureExplanationCard({ explanation, problemTitle }: FailureExplanationCardProps) {
  const [expanded, setExpanded] = useState(true);
  const verdictColor = VERDICT_COLORS[explanation.verdict] ?? '#ef4444';
  const categoryColor = CATEGORY_COLORS[explanation.rootCauseCategory] ?? '#71717a';

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

          {/* ── Recurring Patterns ────────────────────────────────────── */}
          <RecurringPatternsPanel patterns={explanation.recurringPatterns} />
        </div>
      )}
    </div>
  );
}