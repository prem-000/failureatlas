import React from 'react';

export function ClusterHeaderNode({ data }: { data: { label: string } }) {
  return (
    <div style={{
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 800,
      color: '#a1a1aa',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    }}>
      {data.label}
    </div>
  );
}
