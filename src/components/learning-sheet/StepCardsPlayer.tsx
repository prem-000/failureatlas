import React from 'react';

interface StepCardsPlayerProps {
  visualization: {
    steps: Array<{
      step: number;
      action: string;
      explanation: string;
    }>;
  };
  activeStep: number;
}

export function StepCardsPlayer({ visualization, activeStep }: StepCardsPlayerProps) {
  const steps = visualization.steps || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', padding: '10px 0' }}>
      {steps.map((s, idx) => {
        const isActive = idx === activeStep;
        
        return (
          <div
            key={idx}
            style={{
              padding: '14px 18px',
              borderRadius: 10,
              background: isActive ? 'rgba(255,95,82,0.04)' : 'rgba(255,255,255,0.01)',
              border: isActive ? '1px solid rgba(255,95,82,0.3)' : '1px solid rgba(255,255,255,0.04)',
              boxShadow: isActive ? '0 0 12px rgba(255,95,82,0.05)' : 'none',
              transition: 'all 250ms ease-in-out',
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              opacity: isActive ? 1 : 0.45,
            }}
          >
            {/* Step badge */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isActive ? '#ff5f52' : 'rgba(255,255,255,0.08)',
                color: isActive ? '#ffffff' : '#a1a1aa',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {s.step || (idx + 1)}
            </div>
            
            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: isActive ? '#ff8a80' : '#e4e4e7' }}>
                {s.action}
              </span>
              <p style={{ fontSize: '12px', lineHeight: 1.55, color: '#a1a1aa', margin: 0 }}>
                {s.explanation}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
