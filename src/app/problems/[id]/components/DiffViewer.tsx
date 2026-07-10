import React from 'react';

export interface DiffOp {
  type: string;
  content: string;
}

interface DiffViewerProps {
  ops: DiffOp[];
}

export function DiffViewer({ ops }: DiffViewerProps) {
  const significant = ops.filter(o => o.type !== 'EQUAL');
  if (significant.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#52525b', fontSize: 13, textAlign: 'center' }}>
        No code changes — same code as previous attempt.
      </div>
    );
  }
  return (
    <div className="diff-scroll-wrapper">
      <div style={{ fontFamily: 'monospace', fontSize: 'clamp(10px,2.5vw,12px)', lineHeight: 1.7 }}>
        {ops.map((op, i) => {
          const isInsert = op.type === 'INSERT';
          const isDelete = op.type === 'DELETE';
          if (op.type === 'EQUAL') {
            return (
              <div key={i} style={{ padding: '1px 14px', color: '#3f3f46' }}>
                <span style={{ color: '#52525b', marginRight: 10, userSelect: 'none' }}>&nbsp;</span>
                {op.content}
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                background: isInsert ? '#052e1630' : '#450a0a30',
                borderLeft: `3px solid ${isInsert ? '#22c55e' : '#ef4444'}`,
                padding: '2px 14px',
              }}
            >
              <span
                style={{
                  color: isInsert ? '#22c55e' : '#ef4444',
                  userSelect: 'none',
                  minWidth: 14,
                  fontWeight: 700,
                }}
              >
                {isInsert ? '+' : '−'}
              </span>
              <span style={{ color: isInsert ? '#86efac' : '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {op.content}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
