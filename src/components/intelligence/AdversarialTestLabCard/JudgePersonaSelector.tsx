import React from 'react';
import type { JudgePersona } from '@/types';

interface JudgePersonaSelectorProps {
  selectedPersona: JudgePersona;
  onSelectPersona: (persona: JudgePersona) => void;
  onGenerate: (persona: JudgePersona) => void;
  loading: boolean;
  colors: any;
}

const PERSONAS: Array<{
  id: JudgePersona;
  displayName: string;
  emoji: string;
  tagline: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = [
  {
    id: 'leetcode',
    displayName: 'LeetCode',
    emoji: '🎯',
    tagline: 'Implementation Correctness',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  {
    id: 'codeforces',
    displayName: 'Codeforces',
    emoji: '⚡',
    tagline: 'Algorithm Destruction',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  {
    id: 'icpc',
    displayName: 'ICPC',
    emoji: '🧮',
    tagline: 'Math & Proof Rigor',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.08)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  {
    id: 'hackerrank',
    displayName: 'HackerRank',
    emoji: '📊',
    tagline: 'Constraint Coverage',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
];

export function JudgePersonaSelector({
  selectedPersona,
  onSelectPersona,
  onGenerate,
  loading,
  colors,
}: JudgePersonaSelectorProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
        background: '#090d16',
        border: `1px solid ${colors.borderGlass || 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10,
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>
          SELECT JUDGE PERSONA
        </span>
        <span style={{ fontSize: 10, color: '#64748b' }}>
          PRAXIS Engine v1.0
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        {PERSONAS.map(p => {
          const isSelected = selectedPersona === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                onSelectPersona(p.id);
                if (!loading) {
                  onGenerate(p.id);
                }
              }}
              disabled={loading}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
                padding: '10px 12px',
                borderRadius: 8,
                background: isSelected ? p.bgColor : 'rgba(15, 23, 42, 0.4)',
                border: `1px solid ${isSelected ? p.borderColor : 'rgba(255,255,255,0.05)'}`,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{p.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: isSelected ? p.color : '#cbd5e1' }}>
                  {p.displayName}
                </span>
              </div>
              <span style={{ fontSize: 10, color: isSelected ? p.color : '#64748b', opacity: 0.9 }}>
                {p.tagline}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
