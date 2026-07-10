import React from 'react';

interface ConfidenceBarProps {
  value: number;
  color?: string;
}

export function ConfidenceBar({ value, color = '#ff5f52' }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 11, color: '#71717a', minWidth: 34 }}>{pct}%</span>
    </div>
  );
}
