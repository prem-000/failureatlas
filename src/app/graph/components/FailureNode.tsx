'use client';

import { Handle, Position, NodeProps } from 'reactflow';

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Problem:          { bg: 'rgba(30,58,95,0.75)',   border: '#3b82f6', text: '#93c5fd', dot: '#3b82f6' },
  FailureEvent:     { bg: 'rgba(61,31,0,0.75)',    border: '#f97316', text: '#fdba74', dot: '#f97316' },
  Evidence:         { bg: 'rgba(28,28,30,0.75)',   border: '#71717a', text: '#a1a1aa', dot: '#71717a' },
  RootCause:        { bg: 'rgba(45,31,0,0.75)',    border: '#f59e0b', text: '#fcd34d', dot: '#f59e0b' },
  Weakness:         { bg: 'rgba(46,16,101,0.75)',  border: '#a855f7', text: '#d8b4fe', dot: '#a855f7' },
  LearningStrategy: { bg: 'rgba(5,46,22,0.75)',    border: '#22c55e', text: '#86efac', dot: '#22c55e' },
};

export function FailureNode({ data, selected }: NodeProps) {
  const colors = NODE_COLORS[data.nodeType] || NODE_COLORS.Evidence;
  const label = (data.label?.length > 30) ? data.label.slice(0, 28) + '…' : data.label;
  const isFaded = data.isFaded;
  const isHighlighted = data.isHighlighted;

  return (
    <div style={{
      background: colors.bg,
      border: isHighlighted
        ? '2px solid #ff5f52'
        : selected
          ? `2px solid ${colors.border}`
          : `1px solid ${colors.border}50`,
      borderRadius: 12,
      padding: '10px 14px',
      minWidth: 150,
      maxWidth: 210,
      boxShadow: isHighlighted
        ? '0 0 0 3px rgba(255,95,82,0.4), 0 4px 20px rgba(0,0,0,0.5)'
        : selected
          ? `0 0 0 2px ${colors.border}40, 0 4px 20px rgba(0,0,0,0.5)`
          : '0 4px 12px rgba(0,0,0,0.35)',
      backdropFilter: 'blur(8px)',
      cursor: 'pointer',
      opacity: isFaded ? 0.2 : 1,
      transition: 'opacity 200ms, border-color 200ms, box-shadow 200ms',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: colors.border, border: '2px solid #09090b', width: 8, height: 8 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors.dot, flexShrink: 0 }} />
        <span style={{ fontSize: '9px', color: colors.text, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {data.nodeType}
        </span>
        {data.nodeType === 'Weakness' && data.properties?.pageRankScore && (
          <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#a855f7', fontWeight: 800 }}>
            PR: {Number(data.properties.pageRankScore).toFixed(2)}
          </span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: '#f4f4f5', fontWeight: 600, lineHeight: 1.35 }}>{label}</div>

      {data.nodeType === 'Weakness' && data.properties?.frequency && (
        <div style={{ fontSize: '10px', color: '#71717a', marginTop: 4 }}>
          {data.properties.frequency} occurrence{data.properties.frequency !== 1 ? 's' : ''}
        </div>
      )}
      {data.nodeType === 'Evidence' && data.properties?.confidence && (
        <div style={{ fontSize: '10px', color: '#71717a', marginTop: 4 }}>
          {Math.round(Number(data.properties.confidence) * 100)}% confidence
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: colors.border, border: '2px solid #09090b', width: 8, height: 8 }} />
    </div>
  );
}
