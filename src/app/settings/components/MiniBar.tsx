import React from 'react';

interface MiniBarProps {
  value: number;
  max: number;
  color: string;
}

export function MiniBar({ value, max, color }: MiniBarProps) {
  return (
    <div style={{ height: 6, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s' }} />
    </div>
  );
}
