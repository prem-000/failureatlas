'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { CheckCircle, XCircle, Lock, Circle, Star, Loader2, ExternalLink } from 'lucide-react';

export type NodeState = 'locked' | 'available' | 'solved' | 'failed' | 'previously_solved' | 'solving';

const STATE_STYLES: Record<NodeState, {
  border: string; bg: string; color: string; glow: string; iconColor: string;
}> = {
  locked:            { border: '#27272a',  bg: 'rgba(15,15,18,0.7)',        color: '#3f3f46',  glow: 'none',                            iconColor: '#3f3f46'  },
  available:         { border: '#3b82f6',  bg: 'rgba(30,58,95,0.7)',        color: '#93c5fd',  glow: '0 0 16px rgba(59,130,246,0.35)',   iconColor: '#3b82f6'  },
  solving:           { border: '#f59e0b',  bg: 'rgba(45,31,0,0.7)',         color: '#fcd34d',  glow: '0 0 16px rgba(245,158,11,0.35)',   iconColor: '#f59e0b'  },
  solved:            { border: '#22c55e',  bg: 'rgba(5,46,22,0.7)',         color: '#86efac',  glow: '0 0 20px rgba(34,197,94,0.4)',     iconColor: '#22c55e'  },
  failed:            { border: '#ef4444',  bg: 'rgba(69,10,10,0.7)',        color: '#fca5a5',  glow: '0 0 16px rgba(239,68,68,0.35)',    iconColor: '#ef4444'  },
  previously_solved: { border: '#14b8a6',  bg: 'rgba(4,47,46,0.7)',         color: '#5eead4',  glow: '0 0 16px rgba(20,184,166,0.3)',    iconColor: '#14b8a6'  },
};

const DIFF_COLORS: Record<string, string> = {
  Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444',
};

const StateIcon = ({ state, size = 14 }: { state: NodeState; size?: number }) => {
  const s = STATE_STYLES[state];
  switch (state) {
    case 'solved':            return <CheckCircle size={size} style={{ color: s.iconColor }} />;
    case 'failed':            return <XCircle size={size} style={{ color: s.iconColor }} />;
    case 'locked':            return <Lock size={size} style={{ color: s.iconColor }} />;
    case 'previously_solved': return <Star size={size} style={{ color: s.iconColor }} />;
    case 'solving':           return <Loader2 size={size} style={{ color: s.iconColor }} className="spin-icon" />;
    default:                  return <Circle size={size} style={{ color: s.iconColor }} />;
  }
};

export function RoadmapNode({ data, selected }: NodeProps) {
  const state: NodeState = data.nodeState || 'locked';
  const style = STATE_STYLES[state];
  const diffColor = DIFF_COLORS[data.difficulty] || '#71717a';
  const isLocked = state === 'locked';
  const attempts = data.userAttempts;

  return (
    <div
      style={{
        background: style.bg,
        border: `1.5px solid ${selected ? '#ff5f52' : style.border}`,
        borderRadius: 14,
        padding: '10px 14px',
        minWidth: 160,
        maxWidth: 220,
        boxShadow: selected
          ? '0 0 0 3px rgba(255,95,82,0.35), 0 8px 24px rgba(0,0,0,0.5)'
          : style.glow !== 'none' ? style.glow : '0 4px 14px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(12px)',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.45 : 1,
        transition: 'all 200ms ease',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
          70% { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        @keyframes spin-anim { to { transform: rotate(360deg); } }
        .roadmap-node-available { animation: pulse-ring 2s cubic-bezier(0.455,0.03,0.515,0.955) infinite; }
        .spin-icon { animation: spin-anim 1s linear infinite; }
      `}</style>

      <Handle type="target" position={Position.Left} style={{ background: style.border, width: 7, height: 7, border: '2px solid #09090b' }} />

      {/* Top row: state icon + difficulty badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <StateIcon state={state} size={13} />
          <span style={{ fontSize: '9px', fontWeight: 700, color: style.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {state === 'previously_solved' ? 'Done' : state}
          </span>
        </div>
        <span style={{
          fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: 6,
          color: diffColor, background: `${diffColor}18`, border: `1px solid ${diffColor}30`,
        }}>
          {data.difficulty}
        </span>
      </div>

      {/* Problem number */}
      <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, marginBottom: 3 }}>
        #{data.leetcodeId}
      </div>

      {/* Problem title */}
      <div style={{
        fontSize: '12px', fontWeight: 600, color: isLocked ? '#3f3f46' : '#f4f4f5',
        lineHeight: 1.35, marginBottom: 6,
      }}>
        {data.title}
      </div>

      {/* Footer: attempts + link */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {attempts != null && attempts > 0 ? (
          <span style={{ fontSize: '9px', color: '#71717a', fontWeight: 600 }}>
            {attempts} attempt{attempts !== 1 ? 's' : ''}
          </span>
        ) : (
          <span style={{ fontSize: '9px', color: '#3f3f46' }}>
            {data.patterns?.[0] || ''}
          </span>
        )}
        {!isLocked && (
          <a
            href={`https://leetcode.com/problems/${data.slug}/`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ color: '#52525b', display: 'flex', alignItems: 'center' }}
            title="Open on LeetCode"
          >
            <ExternalLink size={10} />
          </a>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: style.border, width: 7, height: 7, border: '2px solid #09090b' }} />
    </div>
  );
}
