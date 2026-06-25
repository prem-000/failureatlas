'use client';

import { useState } from 'react';
import { X, BookOpen, AlertTriangle, Layers, Info, Zap, Sparkles } from 'lucide-react';
import type { Node } from 'reactflow';

interface KnowledgeNodeDrawerProps {
  node: Node | null;
  onClose: () => void;
}

const CONCEPT_COLORS: Record<string, { border: string; bg: string; text: string; lightBg: string }> = {
  concept:      { border: '#3b82f6', bg: 'rgba(30,58,95,0.7)',   text: '#93c5fd', lightBg: 'rgba(59,130,246,0.06)' },
  subconcept:   { border: '#a855f7', bg: 'rgba(46,16,101,0.7)',  text: '#d8b4fe', lightBg: 'rgba(168,85,247,0.06)' },
  technique:    { border: '#22c55e', bg: 'rgba(5,46,22,0.7)',    text: '#86efac', lightBg: 'rgba(34,197,94,0.06)' },
  pattern:      { border: '#f59e0b', bg: 'rgba(45,31,0,0.7)',    text: '#fcd34d', lightBg: 'rgba(245,158,11,0.06)' },
  pitfall:      { border: '#ef4444', bg: 'rgba(69,10,10,0.7)',   text: '#fca5a5', lightBg: 'rgba(239,68,68,0.06)' },
  complexity:   { border: '#14b8a6', bg: 'rgba(4,47,46,0.7)',    text: '#5eead4', lightBg: 'rgba(20,184,166,0.06)' },
};

export function KnowledgeNodeDrawer({ node, onClose }: KnowledgeNodeDrawerProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchTranslation, setTouchTranslation] = useState<number>(0);

  if (!node) return null;

  const kind = node.data?.kind || 'concept';
  const label = node.data?.label || '';
  const description = node.data?.description || '';
  const style = CONCEPT_COLORS[kind] || CONCEPT_COLORS.concept;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return;
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentY = e.targetTouches[0].clientY;
    const diff = currentY - touchStart;
    if (diff > 0) {
      setTouchTranslation(diff);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    if (touchTranslation > 100) {
      onClose();
    }
    setTouchTranslation(0);
  };

  const IconMap: Record<string, any> = {
    concept: BookOpen,
    subconcept: Layers,
    technique: Zap,
    pattern: Sparkles,
    pitfall: AlertTriangle,
    complexity: Info,
  };
  const NodeIcon = IconMap[kind] || Info;

  return (
    <>
      <style>{`
        .kd-drawer {
          position: fixed;
          right: 0;
          top: 56px;
          bottom: 0;
          width: 380px;
          background: rgba(10,10,12,0.98);
          border-left: 1px solid rgba(255,255,255,0.07);
          z-index: 60;
          display: flex;
          flex-direction: column;
          box-shadow: -8px 0 32px rgba(0,0,0,0.5);
          backdrop-filter: blur(20px);
          transition: transform 300ms cubic-bezier(0.16,1,0.3,1);
        }
        .kd-close-btn {
          background: none;
          border: none;
          color: #52525b;
          cursor: pointer;
          padding: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 150ms;
        }
        .kd-close-btn:hover {
          background: rgba(255,255,255,0.05);
          color: #a1a1aa;
        }
        .kd-header-touch {
          cursor: grab;
        }
        .kd-header-touch:active {
          cursor: grabbing;
        }
        .mobile-drag-pill {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.25);
          margin: 8px auto 0 auto;
          display: none;
        }
        @media (max-width: 767px) {
          .kd-drawer {
            left: 0 !important;
            right: 0 !important;
            top: auto !important;
            bottom: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 70vh !important;
            max-height: 70vh !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 20px 20px 0 0 !important;
            box-shadow: 0 -8px 32px rgba(0,0,0,0.6) !important;
            backdrop-filter: blur(12px) !important;
          }
          .mobile-drag-pill {
            display: block !important;
          }
          .kd-close-btn {
            min-width: 44px;
            min-height: 44px;
          }
        }
      `}</style>

      <div
        className="kd-drawer"
        style={{
          transform: touchTranslation > 0 ? `translateY(${touchTranslation}px)` : undefined,
          transition: touchStart !== null ? 'none' : 'transform 300ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Mobile Drag Handle */}
        <div
          className="kd-header-touch"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mobile-drag-pill" />
        </div>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: style.text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {kind}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f4f4f5', margin: 0, lineHeight: 1.25 }}>{label}</h2>
          </div>
          <button onClick={onClose} className="kd-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: style.lightBg,
            border: `1px solid ${style.border}22`,
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start'
          }}>
            <NodeIcon size={18} style={{ color: style.text, flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: style.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Concept Description
              </div>
              <p style={{ fontSize: '13px', color: '#e4e4e7', lineHeight: 1.5, margin: 0 }}>
                {description || 'No detailed explanation is currently available for this concept. Practice problems to learn more.'}
              </p>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#52525b', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 14 }}>
            <span>Source: Praxis Curriculum Library</span>
            <span>Category: {kind}</span>
          </div>
        </div>
      </div>
    </>
  );
}
