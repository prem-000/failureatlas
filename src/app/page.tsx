'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';

const ATLAS_WORD = 'Atlas';
const TYPE_SPEED_MIN = 250;
const TYPE_SPEED_MAX = 300;
const DELETE_SPEED_MIN = 150;
const DELETE_SPEED_MAX = 200;
const PAUSE_FULL = 2000;
const PAUSE_EMPTY = 400;

type Phase = 'typing' | 'pausing-full' | 'deleting' | 'pausing-empty';

function useTypewriter() {
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const phaseRef = useRef<Phase>('typing');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cursor blink
  useEffect(() => {
    const id = setInterval(() => setShowCursor(v => !v), 530);
    return () => clearInterval(id);
  }, []);

  // Typewriter loop
  useEffect(() => {
    function rand(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function tick() {
      const phase = phaseRef.current;

      if (phase === 'typing') {
        setDisplayed(prev => {
          const next = ATLAS_WORD.slice(0, prev.length + 1);
          if (next.length === ATLAS_WORD.length) {
            phaseRef.current = 'pausing-full';
            timeoutRef.current = setTimeout(tick, PAUSE_FULL);
          } else {
            timeoutRef.current = setTimeout(tick, rand(TYPE_SPEED_MIN, TYPE_SPEED_MAX));
          }
          return next;
        });
      } else if (phase === 'pausing-full') {
        phaseRef.current = 'deleting';
        timeoutRef.current = setTimeout(tick, rand(DELETE_SPEED_MIN, DELETE_SPEED_MAX));
      } else if (phase === 'deleting') {
        setDisplayed(prev => {
          const next = prev.slice(0, -1);
          if (next.length === 0) {
            phaseRef.current = 'pausing-empty';
            timeoutRef.current = setTimeout(tick, PAUSE_EMPTY);
          } else {
            timeoutRef.current = setTimeout(tick, rand(DELETE_SPEED_MIN, DELETE_SPEED_MAX));
          }
          return next;
        });
      } else if (phase === 'pausing-empty') {
        phaseRef.current = 'typing';
        timeoutRef.current = setTimeout(tick, rand(TYPE_SPEED_MIN, TYPE_SPEED_MAX));
      }
    }

    timeoutRef.current = setTimeout(tick, 600);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { displayed, showCursor };
}

export default function Home() {
  const { displayed, showCursor } = useTypewriter();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">FailureAtlas</div>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="secondary">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Register</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <section className="text-center mb-16">
          {/*
            The h1 renders as one unbroken inline flow:
              "Failure" (static span) + animated "Atlas" chars + cursor
            All three share the exact same font properties via inheritance.
            No layout shifts: the full word "Atlas" is rendered invisibly
            at all times to hold the width, with the visible portion
            overlaid absolutely.
          */}
          <h1
            className="text-5xl font-bold mb-6"
            style={{ whiteSpace: 'nowrap' }}
          >
            {/* Static "Failure" */}
            <span>Failure</span>

            {/* Animated "Atlas" + cursor as one inline unit */}
            <span
              style={{
                display: 'inline-block',
                position: 'relative',
                /* Reserve full width of "Atlas" + cursor so nothing shifts */
                minWidth: '0',
              }}
            >
              {/* Invisible full word keeps nothing reserved — we let text flow naturally */}
              {displayed}
              {/* Cursor — inline, same font, subtle blink only */}
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '0.85em',
                  background: 'currentColor',
                  marginLeft: '2px',
                  verticalAlign: 'middle',
                  borderRadius: '1px',
                  opacity: showCursor ? 1 : 0,
                  transition: 'opacity 80ms ease',
                  position: 'relative',
                  top: '-0.05em',
                }}
              />
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8">
            AI-powered failure intelligence for competitive programming
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform your coding failures into learning opportunities. FailureAtlas analyzes your submissions,
            identifies root causes, maps systemic weaknesses, and recommends personalized learning strategies.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Intelligent Analysis</h3>
            <p className="text-muted-foreground">
              Myers diff, structural code pattern analysis, and behavioral pattern recognition identify why your solutions fail.
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Knowledge Graph</h3>
            <p className="text-muted-foreground">
              Graph-powered failure relationships map systemic weaknesses across problem domains.
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Personalized Guidance</h3>
            <p className="text-muted-foreground">
              LLM-generated diagnoses with targeted learning strategies to improve faster.
            </p>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-3xl font-bold mb-8">Ready to improve?</h2>
          <div className="space-x-4">
            <Link href="/register">
              <Button className="px-8 py-3">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" className="px-8 py-3">Sign In</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
