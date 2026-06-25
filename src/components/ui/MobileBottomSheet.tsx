'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

type SheetHeight = 'closed' | 'half' | 'tall' | 'full';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  defaultHeight?: 'half' | 'tall' | 'full';
  title?: string;
}

const HEIGHT_VALUES: Record<SheetHeight, string> = {
  closed: '0vh',
  half:   '50vh',
  tall:   '75vh',
  full:   '100dvh',
};

const HEIGHT_ORDER: SheetHeight[] = ['closed', 'half', 'tall', 'full'];

export function MobileBottomSheet({
  isOpen,
  onClose,
  children,
  defaultHeight = 'half',
  title,
}: MobileBottomSheetProps) {
  const [sheetHeight, setSheetHeight] = useState<SheetHeight>('closed');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(0);
  const touchStartHeight = useRef(0);

  useEffect(() => {
    if (isOpen) { setSheetHeight(defaultHeight); setDragOffset(0); }
    else { setSheetHeight('closed'); setDragOffset(0); }
  }, [isOpen, defaultHeight]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const getHeightPx = useCallback((state: SheetHeight) => {
    if (typeof window === 'undefined') return 0;
    const vh = window.innerHeight;
    switch (state) {
      case 'half': return vh * 0.50;
      case 'tall': return vh * 0.75;
      case 'full': return vh;
      default:     return 0;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartHeight.current = getHeightPx(sheetHeight);
    setIsDragging(true);
  }, [sheetHeight, getHeightPx]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = touchStartY.current - e.touches[0].clientY;
    const newHeight = Math.max(0, Math.min(window.innerHeight, touchStartHeight.current + delta));
    setDragOffset(newHeight);
  }, [isDragging]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    const THRESHOLD = 60;
    const currentIdx = HEIGHT_ORDER.indexOf(sheetHeight);
    if (delta > THRESHOLD) {
      const next = HEIGHT_ORDER[Math.min(HEIGHT_ORDER.length - 1, currentIdx + 1)];
      setSheetHeight(next);
    } else if (delta < -THRESHOLD) {
      const prev = HEIGHT_ORDER[Math.max(0, currentIdx - 1)];
      if (prev === 'closed') onClose(); else setSheetHeight(prev);
    }
    setDragOffset(0);
  }, [isDragging, sheetHeight, onClose]);

  if (!isOpen && sheetHeight === 'closed') return null;

  return (
    <>
      <div className="bottom-sheet-backdrop"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose} aria-hidden="true" />
      <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label={title}
        style={{
          height: isDragging ? `${dragOffset}px` : HEIGHT_VALUES[sheetHeight],
          transform: sheetHeight === 'closed' && !isDragging ? 'translateY(100%)' : 'translateY(0)',
          transition: isDragging ? 'none' : 'height 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
        <div className="bottom-sheet-handle"
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
          aria-hidden="true">
          <div className="bottom-sheet-handle-pill" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, paddingBottom: 6 }}>
          {(['half', 'tall', 'full'] as const).map((h) => (
            <button key={h} className="compact" onClick={() => setSheetHeight(h)} aria-label={`Expand to ${h}`}
              style={{ width: sheetHeight === h ? 16 : 6, height: 4, borderRadius: 2,
                background: sheetHeight === h ? '#ff5f52' : '#2a2a2a', border: 'none', cursor: 'pointer',
                padding: 0, display: 'block', transition: 'width 0.25s, background 0.25s' }} />
          ))}
        </div>
        <div className="bottom-sheet-content">{children}</div>
      </div>
    </>
  );
}
