import React from 'react';

interface MemoryPlayerProps {
  visualization: {
    structure?: 'stack' | 'queue' | 'heap' | string;
    steps: Array<{
      action: string;
      state?: string[];
    }>;
  };
  activeStep: number;
}

export function MemoryPlayer({ visualization, activeStep }: MemoryPlayerProps) {
  const structure = (visualization.structure || 'stack').toLowerCase();
  const stepData = visualization.steps[activeStep] || {};
  const state = stepData.state || [];

  if (structure === 'queue') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', padding: '10px 0' }}>
        <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Queue (FIFO)</span>
        
        {/* Horizontal Pipeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '12px', color: '#ff5f52', fontWeight: 800 }}>OUT ◀</span>
          <div style={{ display: 'flex', gap: 6, borderTop: '2px solid rgba(255,255,255,0.1)', borderBottom: '2px solid rgba(255,255,255,0.1)', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', minWidth: 200, minHeight: 60, justifyContent: 'flex-start', alignItems: 'center', borderRadius: 4 }}>
            {state.map((val, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(59,130,246,0.15)',
                  border: '1.5px solid #3b82f6',
                  color: '#60a5fa',
                  borderRadius: 6,
                  fontSize: '13px',
                  fontWeight: 800,
                }}
              >
                {val}
              </div>
            ))}
            {state.length === 0 && (
              <span style={{ color: '#52525b', fontSize: '12px', width: '100%', textAlign: 'center' }}>Empty Queue</span>
            )}
          </div>
          <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 800 }}>◀ IN</span>
        </div>
      </div>
    );
  }

  // Default to Stack
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', padding: '10px 0' }}>
      <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stack (LIFO)</span>
      
      {/* Vertical Beaker Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 6,
          borderLeft: '3px solid rgba(255,255,255,0.15)',
          borderRight: '3px solid rgba(255,255,255,0.15)',
          borderBottom: '3px solid rgba(255,255,255,0.15)',
          borderRadius: '0 0 12px 12px',
          padding: '12px 10px 10px 10px',
          background: 'rgba(255,255,255,0.01)',
          width: 140,
          minHeight: 180,
          justifyContent: 'flex-start',
        }}
      >
        {state.map((val, idx) => (
          <div
            key={idx}
            style={{
              width: '100%',
              padding: '8px 4px',
              background: 'rgba(168,85,247,0.15)',
              border: '1.5px solid #c084fc',
              color: '#d8b4fe',
              borderRadius: 6,
              fontSize: '13px',
              fontWeight: 800,
              textAlign: 'center',
              transition: 'all 200ms ease',
            }}
          >
            {val}
          </div>
        ))}
        {state.length === 0 && (
          <span style={{ color: '#52525b', fontSize: '12px', textAlign: 'center', width: '100%', marginBottom: 'auto', marginTop: 'auto' }}>Empty Stack</span>
        )}
      </div>
    </div>
  );
}
