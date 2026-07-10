import React from 'react';

interface StatTileProps {
  label: string;
  value: string | number;
  sub?: string;
}

export function StatTile({ label, value, sub }: StatTileProps) {
  return (
    <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#ff5f52', letterSpacing: '-0.03em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#52525b', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
