'use client';

import { Handle, Position, NodeProps } from 'reactflow';

const CONCEPT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  concept:      { border: '#3b82f6', bg: 'rgba(30,58,95,0.6)',   text: '#93c5fd' },
  subconcept:   { border: '#a855f7', bg: 'rgba(46,16,101,0.6)',  text: '#d8b4fe' },
  technique:    { border: '#22c55e', bg: 'rgba(5,46,22,0.6)',    text: '#86efac' },
  pattern:      { border: '#f59e0b', bg: 'rgba(45,31,0,0.6)',    text: '#fcd34d' },
  pitfall:      { border: '#ef4444', bg: 'rgba(69,10,10,0.6)',   text: '#fca5a5' },
  complexity:   { border: '#14b8a6', bg: 'rgba(4,47,46,0.6)',    text: '#5eead4' },
};

export function KnowledgeNode({ data, selected }: NodeProps) {
  const kind: string = data.kind || 'concept';
  const style = CONCEPT_COLORS[kind] || CONCEPT_COLORS.concept;

  return (
    <div style={{
      background: style.bg,
      border: `1.5px solid ${selected ? '#ff5f52' : style.border}60`,
      borderRadius: 12,
      padding: '9px 14px',
      minWidth: 130,
      maxWidth: 200,
      boxShadow: selected
        ? '0 0 0 2px rgba(255,95,82,0.3), 0 6px 20px rgba(0,0,0,0.4)'
        : '0 4px 12px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(10px)',
      cursor: 'default',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: style.border, width: 6, height: 6, border: '2px solid #09090b' }} />

      <div style={{ fontSize: '8px', fontWeight: 700, color: style.text, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, opacity: 0.8 }}>
        {kind}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5', lineHeight: 1.3 }}>
        {data.label}
      </div>
      {data.description && (
        <div style={{ fontSize: '10px', color: '#71717a', marginTop: 4, lineHeight: 1.35 }}>
          {data.description}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: style.border, width: 6, height: 6, border: '2px solid #09090b' }} />
    </div>
  );
}
