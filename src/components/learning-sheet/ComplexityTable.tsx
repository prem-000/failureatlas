import React from 'react';
import { Clock, HardDrive } from 'lucide-react';

interface ComplexityTableProps {
  complexity: {
    time: string;
    space: string;
  };
}

export function ComplexityTable({ complexity }: ComplexityTableProps) {
  if (!complexity) return null;

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
            background: 'rgba(168,85,247,0.1)',
            color: '#c084fc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Clock size={16} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#e4e4e7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Complexity Analysis
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 12,
        }}
        className="sm:grid-cols-2"
      >
        <style>{`
          @media (min-width: 640px) {
            .sm\\:grid-cols-2 {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
        `}</style>

        {/* Time Complexity Card */}
        <div
          style={{
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.03)',
            borderRadius: 10,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <Clock size={20} style={{ color: '#ff5f52', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Time Complexity
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ff5f52', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {complexity.time.split(' ')[0] || 'O(?)'}
            </div>
            <div style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: 1.5 }}>
              {complexity.time.split(' ').slice(1).join(' ') || 'No explanation provided.'}
            </div>
          </div>
        </div>

        {/* Space Complexity Card */}
        <div
          style={{
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.03)',
            borderRadius: 10,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <HardDrive size={20} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Space Complexity
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {complexity.space.split(' ')[0] || 'O(?)'}
            </div>
            <div style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: 1.5 }}>
              {complexity.space.split(' ').slice(1).join(' ') || 'No explanation provided.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
