import React from 'react';
import type { CoverageHeatmap } from '@/types';

interface CoverageHeatmapPanelProps {
  heatmap?: CoverageHeatmap;
  colors: any;
}

export function CoverageHeatmapPanel({ heatmap, colors }: CoverageHeatmapPanelProps) {
  if (!heatmap || !heatmap.bars || heatmap.bars.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: '#070a12',
        border: `1px solid ${colors.borderGlass || 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10,
        padding: '12px 14px',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>
            COVERAGE HEATMAP
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 4,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            {heatmap.overallScore}% Overall
          </span>
        </div>
        <div style={{ fontSize: 10, color: '#64748b', display: 'flex', gap: 10 }}>
          <span>Weakest: <strong style={{ color: '#f87171' }}>{heatmap.weakestConcept}</strong></span>
          <span>Strongest: <strong style={{ color: '#34d399' }}>{heatmap.strongestConcept}</strong></span>
        </div>
      </div>

      {/* Bars Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        {heatmap.bars.map((bar, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 6,
              padding: '6px 8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
              <span style={{ fontWeight: 600, color: '#cbd5e1' }}>{bar.concept}</span>
              <span style={{ color: bar.color, fontWeight: 700 }}>{bar.count} cases ({bar.coverage}%)</span>
            </div>
            {/* Progress Bar Container */}
            <div
              style={{
                width: '100%',
                height: 4,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.max(5, bar.coverage)}%`,
                  height: '100%',
                  background: bar.color,
                  borderRadius: 2,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
