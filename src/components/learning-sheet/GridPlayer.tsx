import React from 'react';

interface GridPlayerProps {
  visualization: {
    rows?: string[];
    cols?: string[];
    steps: Array<{
      row?: number;
      col?: number;
      val?: string;
    }>;
  };
  activeStep: number;
}

export function GridPlayer({ visualization, activeStep }: GridPlayerProps) {
  const rows = visualization.rows || [];
  const cols = visualization.cols || [];
  const steps = visualization.steps || [];
  
  // Reconstruct matrix values up to activeStep
  const matrix: Record<string, string> = {};
  for (let s = 0; s <= activeStep; s++) {
    const stepData = steps[s];
    if (stepData && stepData.row !== undefined && stepData.col !== undefined && stepData.val !== undefined) {
      matrix[`${stepData.row}-${stepData.col}`] = stepData.val;
    }
  }

  const currentStep = steps[activeStep] || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '10px 0', overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', margin: '0 auto', background: 'rgba(0,0,0,0.15)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <thead>
          <tr>
            <th style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#71717a', fontSize: '12px' }}></th>
            {cols.map((col, cIdx) => (
              <th key={cIdx} style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#a1a1aa', fontSize: '12px', fontWeight: 700 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              <td style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#a1a1aa', fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>
                {row}
              </td>
              {cols.map((_, cIdx) => {
                const isCurrent = currentStep.row === rIdx && currentStep.col === cIdx;
                const cellVal = matrix[`${rIdx}-${cIdx}`] || '-';
                
                return (
                  <td
                    key={cIdx}
                    style={{
                      padding: '12px 18px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      fontSize: '14px',
                      fontWeight: 800,
                      textAlign: 'center',
                      color: isCurrent ? '#ff8a80' : cellVal !== '-' ? '#e4e4e7' : '#52525b',
                      background: isCurrent ? 'rgba(255,95,82,0.18)' : cellVal !== '-' ? 'rgba(255,255,255,0.02)' : 'transparent',
                      transition: 'all 200ms ease-in-out',
                    }}
                  >
                    {cellVal}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
