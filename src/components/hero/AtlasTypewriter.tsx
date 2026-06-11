'use client';

import { useEffect, useRef, useState } from 'react';

const WORD = 'Atlas';
const TYPE_INTERVAL_MS = 1300;   // 1.3 s per character typed
const DELETE_INTERVAL_MS = 1100; // 1.1 s per character deleted
const PAUSE_FULL_MS = 4000;      // pause after full word
const PAUSE_EMPTY_MS = 2000;     // pause before restarting

type Phase = 'typing' | 'pause-full' | 'deleting' | 'pause-empty';

export function AtlasTypewriter() {
  const [displayed, setDisplayed] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const phaseRef = useRef<Phase>('typing');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cursor blink — completely independent of typewriter state
  useEffect(() => {
    const blink = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => clearInterval(blink);
  }, []);

  // Typewriter state machine
  useEffect(() => {
    function tick(currentDisplayed: string, phase: Phase) {
      if (phase === 'typing') {
        const next = WORD.slice(0, currentDisplayed.length + 1);
        setDisplayed(next);
        if (next.length === WORD.length) {
          phaseRef.current = 'pause-full';
          timeoutRef.current = setTimeout(() => tick(next, 'pause-full'), 0);
        } else {
          timeoutRef.current = setTimeout(() => tick(next, 'typing'), TYPE_INTERVAL_MS);
        }
      } else if (phase === 'pause-full') {
        phaseRef.current = 'deleting';
        timeoutRef.current = setTimeout(() => tick(currentDisplayed, 'deleting'), PAUSE_FULL_MS);
      } else if (phase === 'deleting') {
        const next = currentDisplayed.slice(0, -1);
        setDisplayed(next);
        if (next.length === 0) {
          phaseRef.current = 'pause-empty';
          timeoutRef.current = setTimeout(() => tick(next, 'pause-empty'), 0);
        } else {
          timeoutRef.current = setTimeout(() => tick(next, 'deleting'), DELETE_INTERVAL_MS);
        }
      } else if (phase === 'pause-empty') {
        phaseRef.current = 'typing';
        timeoutRef.current = setTimeout(() => tick('', 'typing'), PAUSE_EMPTY_MS);
      }
    }

    // Start with a short initial delay so the page loads first
    timeoutRef.current = setTimeout(() => tick('', 'typing'), 800);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <span
      aria-label="Atlas"
      style={{
        color: '#ff5f52',
        textShadow: '0 0 32px rgba(255, 95, 82, 0.35), 0 0 8px rgba(255, 95, 82, 0.15)',
        display: 'inline',
      }}
    >
      {/* Leading space keeps "Failure Atlas" spaced correctly */}
      {' '}
      {displayed}
      {/* Cursor — inline, attached to text end, no transforms */}
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: '3px',
          height: '0.85em',
          background: '#ff5f52',
          borderRadius: '1px',
          marginLeft: '2px',
          verticalAlign: 'middle',
          opacity: cursorVisible ? 0.9 : 0,
          transition: 'opacity 0.12s ease',
        }}
      />
    </span>
  );
}
