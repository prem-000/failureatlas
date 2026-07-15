import React from 'react';

interface PointerPlayerProps {
  visualization: {
    array?: string[];
    steps: Array<{
      left?: number;
      right?: number;
      pointers?: Array<{ name: string; index: number }>;
    }>;
  };
  activeStep: number;
}

export function PointerPlayer({ visualization, activeStep }: PointerPlayerProps) {
  const arr = visualization.array || [];
  const stepData = visualization.steps[activeStep] || {};
  
  // Collect pointers for the current step
  const pointers = stepData.pointers ? [...stepData.pointers] : [];
  if (stepData.left !== undefined) {
    if (!pointers.some(p => p.name === 'L')) pointers.push({ name: 'L', index: stepData.left });
  }
  if (stepData.right !== undefined) {
    if (!pointers.some(p => p.name === 'R')) pointers.push({ name: 'R', index: stepData.right });
  }

  // Create a map from index -> list of pointer names
  const pointerMap: Record<number, string[]> = {};
  pointers.forEach(p => {
    if (p.index !== undefined && p.index >= 0 && p.index < arr.length) {
      if (!pointerMap[p.index]) pointerMap[p.index] = [];
      pointerMap[p.index].push(p.name);
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', padding: '10px 0' }}>
      {/* Horizontal Array blocks */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {arr.map((val, idx) => {
          // Check if index is within active window
          let inWindow = false;
          const leftIdx = stepData.left ?? (pointers.find(p => p.name === 'L')?.index ?? -1);
          const rightIdx = stepData.right ?? (pointers.find(p => p.name === 'R')?.index ?? -1);
          if (leftIdx !== -1 && rightIdx !== -1) {
            inWindow = idx >= leftIdx && idx <= rightIdx;
          } else if (leftIdx !== -1) {
            inWindow = idx === leftIdx;
          }

          const hasPointers = pointerMap[idx] && pointerMap[idx].length > 0;

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 50 }}>
              {/* Index number */}
              <span style={{ fontSize: '10px', color: '#52525b', fontWeight: 600 }}>idx {idx}</span>
              
              {/* Element Box */}
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  fontWeight: 800,
                  background: inWindow ? 'rgba(255,95,82,0.15)' : 'rgba(255,255,255,0.03)',
                  border: inWindow ? '1.5px solid #ff5f52' : '1px solid rgba(255,255,255,0.06)',
                  color: inWindow ? '#ff8a80' : '#e4e4e7',
                  transition: 'all 200ms ease-in-out',
                }}
              >
                {val}
              </div>
              
              {/* Pointers List */}
              <div style={{ height: 24, display: 'flex', gap: 4, justifyContent: 'center' }}>
                {hasPointers && pointerMap[idx].map((name, pidx) => (
                  <span
                    key={pidx}
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      background: name === 'L' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
                      color: name === 'L' ? '#60a5fa' : '#4ade80',
                      border: `1px solid ${name === 'L' ? 'rgba(59,130,246,0.3)' : 'rgba(34,197,94,0.3)'}`,
                      padding: '2px 5px',
                      borderRadius: 4,
                      animation: 'bounce 0.5s ease infinite alternate',
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
