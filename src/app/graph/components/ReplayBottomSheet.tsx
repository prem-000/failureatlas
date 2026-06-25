'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';

interface ReplayBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function ReplayBottomSheet({ isOpen, onClose, title, children }: ReplayBottomSheetProps) {
  const [translation, setTranslation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setTranslation(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setTranslation(delta);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translation > 100) {
      onClose();
    } else {
      setTranslation(0);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .replay-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          animation: fadeIn 200ms ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .replay-sheet {
          position: fixed; bottom: 0; left: 0; right: 0;
          z-index: 201;
          background: #111113;
          border-radius: 20px 20px 0 0;
          border-top: 1px solid rgba(255,255,255,0.08);
          max-height: 90vh;
          display: flex; flex-direction: column;
          animation: slideUpSheet 280ms cubic-bezier(0.16,1,0.3,1);
        }
        .sheet-drag-handle {
          width: 36px; height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.15);
          margin: 12px auto 0;
          flex-shrink: 0;
          cursor: grab;
        }
        .sheet-header {
          padding: 14px 20px 12px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .sheet-title {
          font-size: 14px; font-weight: 700;
          color: #e4e4e7; letter-spacing: -0.02em;
        }
        .sheet-close {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: #71717a;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 11px; font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.04em;
        }
        .sheet-body {
          overflow-y: auto;
          flex: 1;
          padding: 16px 20px 32px;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>

      {/* Backdrop */}
      <div className="replay-backdrop" onClick={onClose} />

      {/* Sheet */}
      <div
        className="replay-sheet"
        style={{ transform: `translateY(${translation}px)`, transition: isDragging ? 'none' : 'transform 250ms cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div
          className="sheet-drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        <div className="sheet-header">
          <span className="sheet-title">{title}</span>
          <button className="sheet-close" onClick={onClose}>CLOSE</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}
