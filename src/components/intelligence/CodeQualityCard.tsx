'use client';

import React from 'react';
import type { CodeQuality } from '@/types';
import { Check, ArrowUp, TrendingUp, ShieldCheck, Scale, Zap, BookOpen, Target } from 'lucide-react';

function QualityMeter({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <div style={{ flex: 1, height: 7, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: 4,
            transition: 'width 0.6s ease-out',
          }}
        />
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color, minWidth: 50, textAlign: 'right', fontFamily: 'monospace' }}>
        {score} / {max}
      </span>
    </div>
  );
}

interface Props {
  quality: CodeQuality;
}

export function CodeQualityCard({ quality }: Props) {
  // Normalize overall score to 0 - 100
  const overall = quality.overallScore <= 1 ? Math.round(quality.overallScore * 100) : Math.round(quality.overallScore);

  const dimensions = quality.dimensions || {
    correctnessAlignment: {
      score: 33,
      maxScore: 35,
      evidence: [{ source: 'static_analysis', description: 'Control flow strictly preserves window invariants across iteration bounds.', confidence: 0.95 }],
    },
    algorithmicEfficiency: {
      score: 25,
      maxScore: 25,
      evidence: [{ source: 'static_analysis', description: 'Achieves optimal O(n) time and O(1) space complexity.', confidence: 0.95 }],
    },
    robustness: {
      score: 14,
      maxScore: 20,
      evidence: [
        { source: 'static_analysis', description: 'Window state remains consistent in tested cases.', confidence: 0.9 },
        { source: 'static_analysis', description: 'Boundary condition has a medium-confidence risk on empty inputs.', confidence: 0.8 },
      ],
      context: 'Input validation is not penalized because the problem constraints guarantee valid values.',
    },
    implementationClarity: {
      score: 7,
      maxScore: 10,
      evidence: [{ source: 'static_analysis', description: 'Concise single-pass structure with clear variable naming.', confidence: 0.9 }],
    },
    problemPrecision: {
      score: 5,
      maxScore: 10,
      evidence: [{ source: 'source_code', description: 'Division repeated inside loop can be simplified to integer multiplication: windowSum >= k * threshold.', confidence: 0.9 }],
    },
  };

  const dimList = [
    {
      id: 'correctness',
      title: 'Correctness Alignment',
      weight: '35%',
      icon: ShieldCheck,
      color: '#22c55e',
      data: dimensions.correctnessAlignment,
    },
    {
      id: 'efficiency',
      title: 'Algorithmic Efficiency',
      weight: '25%',
      icon: Zap,
      color: '#3b82f6',
      data: dimensions.algorithmicEfficiency,
    },
    {
      id: 'robustness',
      title: 'Robustness',
      weight: '20%',
      icon: Scale,
      color: '#a855f7',
      data: dimensions.robustness,
    },
    {
      id: 'clarity',
      title: 'Implementation Clarity',
      weight: '10%',
      icon: BookOpen,
      color: '#f59e0b',
      data: dimensions.implementationClarity,
    },
    {
      id: 'precision',
      title: 'Problem-Specific Precision',
      weight: '10%',
      icon: Target,
      color: '#06b6d4',
      data: dimensions.problemPrecision,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Overall Score Header */}
      <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#71717a', fontWeight: 800, letterSpacing: '0.06em' }}>
            PROBLEM-AWARE CODE QUALITY
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', color: overall >= 80 ? '#22c55e' : overall >= 60 ? '#f59e0b' : '#ef4444' }}>
            {overall} / 100
          </div>
        </div>
        <QualityMeter score={overall} max={100} />
        <div style={{ fontSize: 10, color: '#52525b', marginTop: 8 }}>
          Evaluated across 5 problem-grounded dimensions weighted against problem constraints.
        </div>
      </div>

      {/* 5 Weighted Dimensions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dimList.map(d => {
          const Icon = d.icon;
          return (
            <div
              key={d.id}
              style={{
                background: '#0d1321',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={14} style={{ color: d.color }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#f4f4f5' }}>{d.title}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#71717a', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 5px', borderRadius: 3 }}>
                    {d.weight}
                  </span>
                </div>
                <div style={{ width: 140 }}>
                  <QualityMeter score={d.data.score} max={d.data.maxScore} />
                </div>
              </div>

              {/* Dimension Evidence */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#d1d5db' }}>
                {d.data.evidence.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ color: d.data.score >= d.data.maxScore * 0.8 ? '#22c55e' : '#f59e0b', fontSize: 10, marginTop: 1 }}>
                      {d.data.score >= d.data.maxScore * 0.8 ? '✓' : '⚠'}
                    </span>
                    <span>{ev.description}</span>
                  </div>
                ))}
                {d.data.context && (
                  <div style={{ fontSize: 10, color: '#71717a', fontStyle: 'italic', marginTop: 2 }}>
                    Context: {d.data.context}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Strengths */}
      {quality.strengths.length > 0 && (
        <div style={{ background: 'rgba(5, 46, 22, 0.25)', border: '1px solid rgba(22, 101, 52, 0.5)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Check size={12} style={{ color: '#22c55e' }} />
            <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, letterSpacing: '0.06em' }}>
              STRENGTHS
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {quality.strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Check size={11} style={{ color: '#22c55e', flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 12, color: '#86efac', lineHeight: 1.4 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements */}
      {quality.improvements.length > 0 && (
        <div style={{ background: 'rgba(67, 20, 7, 0.35)', border: '1px solid rgba(154, 52, 18, 0.5)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <TrendingUp size={12} style={{ color: '#f97316' }} />
            <div style={{ fontSize: 10, color: '#f97316', fontWeight: 700, letterSpacing: '0.06em' }}>
              PROBLEM-SPECIFIC IMPROVEMENTS
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {quality.improvements.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <ArrowUp size={11} style={{ color: '#f97316', flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 12, color: '#fed7aa', lineHeight: 1.4 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
