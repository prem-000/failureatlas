'use client';

import React, { useState } from 'react';
import { Target, ExternalLink, HelpCircle } from 'lucide-react';
import type { PracticeProblem } from '@/types/learning-sheet';

interface PracticeProblemsProps {
  problems: PracticeProblem[];
}

const DIFF_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  easy:   { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
  hard:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)' },
};

export function PracticeProblems({ problems }: PracticeProblemsProps) {
  const [visibleHints, setVisibleHints] = useState<Record<number, boolean>>({});

  if (!problems || problems.length === 0) return null;

  const toggleHint = (index: number) => {
    setVisibleHints((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(34,197,94,0.1)',
            color: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Target size={16} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#e4e4e7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recommended Practice Problems
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {problems.map((p, index) => {
          const diffKey = p.difficulty.toLowerCase();
          const badge = DIFF_COLORS[diffKey] || DIFF_COLORS.medium;
          const showHint = !!visibleHints[index];

          return (
            <div
              key={index}
              style={{
                background: 'rgba(0,0,0,0.12)',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                {/* Title & Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f4f4f5' }}>
                    {p.name}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: badge.color,
                      backgroundColor: badge.bg,
                      border: `1px solid ${badge.border}`,
                      padding: '2px 7px',
                      borderRadius: 5,
                    }}
                  >
                    {p.difficulty}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {p.hint && (
                    <button
                      onClick={() => toggleHint(index)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '11px',
                        fontWeight: 700,
                        color: showHint ? '#ff5f52' : '#a1a1aa',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: 6,
                      }}
                    >
                      <HelpCircle size={13} />
                      <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                    </button>
                  )}

                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#3b82f6',
                        textDecoration: 'none',
                        padding: '4px 8px',
                        background: 'rgba(59,130,246,0.06)',
                        border: '1px solid rgba(59,130,246,0.15)',
                        borderRadius: 6,
                        transition: 'all 150ms',
                      }}
                      className="hover:bg-blue-500/10"
                    >
                      <span>Solve</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Hint Panel */}
              {showHint && p.hint && (
                <div
                  style={{
                    fontSize: '12px',
                    lineHeight: 1.55,
                    color: '#ff8a80',
                    background: 'rgba(255,95,82,0.04)',
                    borderLeft: '2px solid #ff5f52',
                    padding: '8px 12px',
                    borderRadius: '0 6px 6px 0',
                  }}
                >
                  {p.hint}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
