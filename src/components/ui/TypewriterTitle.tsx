'use client';

import { useEffect, useRef, useState } from 'react';

const FULL_TEXT = 'FailureAtlas';
const FAILURE_LEN = 7; // 'Failure'

const TYPE_SPEED_MIN = 100;
const TYPE_SPEED_MAX = 120;
const DELETE_SPEED_MIN = 60;
const DELETE_SPEED_MAX = 80;
const PAUSE_AFTER_FULL = 1700; // ms pause when full word is shown

type Phase = 'typing' | 'pausing' | 'deleting';

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function TypewriterTitle() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [cursorVisible, setCursorVisible] = useState(true);

  // Cursor blink
  useEffect(() => {
    const id = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(id);
  }, []);

  // Typewriter state machine
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (visibleCount < FULL_TEXT.length) {
        timeout = setTimeout(() => {
          setVisibleCount(c => c + 1);
        }, randomBetween(TYPE_SPEED_MIN, TYPE_SPEED_MAX));
      } else {
        setPhase('pausing');
      }
    } else if (phase === 'pausing') {
      timeout = setTimeout(() => {
        setPhase('deleting');
      }, PAUSE_AFTER_FULL);
    } else if (phase === 'deleting') {
      if (visibleCount > 0) {
        timeout = setTimeout(() => {
          setVisibleCount(c => c - 1);
        }, randomBetween(DELETE_SPEED_MIN, DELETE_SPEED_MAX));
      } else {
        setPhase('typing');
      }
    }

    return () => clearTimeout(timeout);
  }, [phase, visibleCount]);

  // Split visible text into 'Failure' part and 'Atlas' part
  const failurePart = FULL_TEXT.slice(0, Math.min(visibleCount, FAILURE_LEN));
  const atlasPart =
    visibleCount > FAILURE_LEN ? FULL_TEXT.slice(FAILURE_LEN, visibleCount) : '';

  return (
    <span
      className="typewriter-root"
      aria-label="FailureAtlas"
      aria-live="off"
    >
      {/* Ghost (invisible) full text keeps layout stable — no layout shifts */}
      <span className="typewriter-ghost" aria-hidden="true">
        {FULL_TEXT}
      </span>

      {/* Visible animated overlay */}
      <span className="typewriter-visible" aria-hidden="true">
        {failurePart && (
          <span className="typewriter-failure">{failurePart}</span>
        )}
        {atlasPart && (
          <span className="typewriter-atlas">{atlasPart}</span>
        )}
        <span
          className="typewriter-cursor"
          style={{ opacity: cursorVisible ? 1 : 0 }}
        >
          |
        </span>
      </span>

      <style>{`
        .typewriter-root {
          position: relative;
          display: inline-block;
        }

        /* Ghost text: invisible, holds the full width */
        .typewriter-ghost {
          visibility: hidden;
          user-select: none;
          pointer-events: none;
        }

        /* Animated text: absolutely positioned on top of ghost */
        .typewriter-visible {
          position: absolute;
          left: 0;
          top: 0;
          white-space: nowrap;
        }

        .typewriter-failure {
          color: #ff6b5a;
          text-shadow:
            0 0 12px rgba(255, 107, 90, 0.6),
            0 0 28px rgba(255, 107, 90, 0.25),
            0 0 60px rgba(255, 107, 90, 0.12);
        }

        .typewriter-atlas {
          color: #f8fafc;
          text-shadow:
            0 0 10px rgba(248, 250, 252, 0.4),
            0 0 24px rgba(248, 250, 252, 0.15);
        }

        .typewriter-cursor {
          display: inline-block;
          color: #ff6b5a;
          font-weight: 300;
          margin-left: 1px;
          transition: opacity 0.1s ease;
          text-shadow:
            0 0 10px rgba(255, 107, 90, 0.7);
        }
      `}</style>
    </span>
  );
}
