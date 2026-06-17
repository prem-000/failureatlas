'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

const PHRASES = ["Into Insight.", "Into Growth.", "Into Mastery."];

function TypewriterEffect() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentPhrase = PHRASES[phraseIndex];

    if (!isDeleting && charIndex < currentPhrase.length) {
      timeout = setTimeout(() => setCharIndex(c => c + 1), 70);
    } else if (isDeleting && charIndex > 0) {
      timeout = setTimeout(() => setCharIndex(c => c - 1), 40);
    } else if (!isDeleting && charIndex === currentPhrase.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPhraseIndex((p) => (p + 1) % PHRASES.length);
    }
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex]);

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{ visibility: 'hidden' }}>Into Mastery.</span>
      <span style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
        <span style={{ color: '#ff5f52', textShadow: '0 0 20px rgba(255, 95, 82, 0.4)' }}>
          {PHRASES[phraseIndex].substring(0, charIndex)}
        </span>
        <span 
          style={{ 
            display: 'inline-block',
            width: '0.08em',
            height: '0.9em',
            backgroundColor: '#ff5f52',
            marginLeft: '4px',
            animation: 'blink 1s ease-in-out infinite'
          }} 
        />
      </span>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  );
}

import { Menu, X } from 'lucide-react';
import { TechMarquee } from '@/components/hero/TechMarquee';

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ overflowX: 'hidden' }}>

      {/* ─── Navigation ──────────────────────────────────────────────── */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">

          {/* Logo */}
          <div className="text-xl sm:text-2xl font-bold text-primary flex-shrink-0">
            Praxis
          </div>

          {/* Desktop nav buttons */}
          <div className="hidden sm:flex items-center space-x-3">
            <Link href="/login">
              <Button variant="secondary" size="sm">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            style={{ minHeight: 'unset', minWidth: 'unset' }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div
            className="sm:hidden border-t border-border bg-surface/95 backdrop-blur-lg"
            style={{ animation: 'menu-open 0.2s ease' }}
          >
            <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3">
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="secondary" className="w-full justify-center">Login</Button>
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                <Button className="w-full justify-center">Register</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* ─── Hero Section ─────────────────────────────────────────── */}
        <section className="text-center mb-12 sm:mb-16">
          <h1
            className="font-bold mb-6 sm:mb-8 tracking-tight flex flex-col items-center justify-center gap-1 sm:gap-2"
            style={{ fontSize: 'var(--text-hero)', lineHeight: 0.95 }}
          >
            <span style={{ color: '#FFFFFF' }}>Turn Practice</span>
            <TypewriterEffect />
          </h1>

          <p
            className="text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 px-2"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.125rem)', lineHeight: 1.6 }}
          >
            Praxis is a personal learning intelligence system.
            <br className="hidden sm:block" />
            <br className="hidden sm:block" />
            Track your practice journey, uncover recurring patterns, strengthen weak concepts, and build lasting mastery through consistent improvement.
          </p>

          {/* CTA buttons — stacked on mobile, inline on sm+ */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Start Practicing
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8">
                Continue Journey
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <TechMarquee />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16">
        {/* ─── Philosophy Section ────────────────────────────────────── */}
        <section className="text-center mb-12 sm:mb-20 max-w-3xl mx-auto px-4 bg-muted/30 py-10 rounded-2xl border border-border">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Learning Is Not About Winning</h2>
          <div className="text-muted-foreground space-y-4" style={{ fontSize: 'clamp(0.875rem, 2vw, 1.0625rem)', lineHeight: 1.7 }}>
            <p>Most platforms measure outcomes.<br/><strong className="text-primary">Praxis measures growth.</strong></p>
            <p>Instead of focusing on pass or fail, success or failure, Praxis helps you understand the patterns behind your learning.</p>
            <p className="font-medium text-foreground">
              Every attempt becomes data.<br/>
              Every challenge becomes feedback.<br/>
              Every practice session becomes progress.
            </p>
          </div>
        </section>

        {/* ─── Feature Cards ────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
          <div className="card">
            <div className="text-2xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold mb-3">Intelligent Analysis</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Myers diff, structural code pattern analysis, and behavioral pattern recognition
              identify why your solutions fail.
            </p>
          </div>

          <div className="card">
            <div className="text-2xl mb-3">🕸️</div>
            <h3 className="text-lg font-semibold mb-3">Knowledge Graph</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Graph-powered failure relationships map systemic weaknesses across problem domains.
            </p>
          </div>

          <div className="card sm:col-span-2 lg:col-span-1">
            <div className="text-2xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold mb-3">Personalized Guidance</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              LLM-generated diagnoses with targeted learning strategies to improve faster.
            </p>
          </div>
        </section>

        {/* ─── CTA Section ─────────────────────────────────────────── */}
        <section className="text-center py-8 sm:py-12">
          <h2
            className="font-bold mb-6 sm:mb-8"
            style={{ fontSize: 'var(--text-h2)' }}
          >
            Ready to improve?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Start Practicing
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8">
                Continue Journey
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 mt-12 text-center text-muted-foreground bg-background/50">
        <div className="max-w-4xl mx-auto px-4 italic" style={{ fontSize: '0.95rem' }}>
          <p>The goal is not to be better than others.</p>
          <p>The goal is to be better than yesterday.</p>
        </div>
      </footer>
    </div>
  );
}
