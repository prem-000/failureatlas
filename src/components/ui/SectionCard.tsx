import React from 'react';

interface SectionCardProps {
  title: string;
  accent?: string;
  children: React.ReactNode;
  padding?: string;
  overflow?: string;
}

export function SectionCard({
  title,
  accent = '#ff5f52',
  children,
  padding = '12px 16px',
  overflow = 'hidden',
}: SectionCardProps) {
  return (
    <div
      style={{
        background: '#191919',
        border: '1px solid #1f1f1f',
        borderRadius: 12,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: overflow as any,
      }}
    >
      <div
        style={{
          padding,
          borderBottom: '1px solid #1f1f1f',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ width: 3, height: 16, background: accent, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', letterSpacing: '-0.01em' }}>
          {title}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}
