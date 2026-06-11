'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AtlasTypewriter } from '@/components/hero/AtlasTypewriter';
import { Menu, X } from 'lucide-react';

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ overflowX: 'hidden' }}>

      {/* ─── Navigation ──────────────────────────────────────────────── */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">

          {/* Logo */}
          <div className="text-xl sm:text-2xl font-bold text-primary flex-shrink-0">
            FailureAtlas
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
            className="font-bold mb-5 sm:mb-6 leading-tight tracking-tight"
            style={{ fontSize: 'var(--text-hero)' }}
          >
            <span style={{ color: 'var(--color-foreground)' }}>Failure</span>
            <AtlasTypewriter />
          </h1>

          <p
            className="text-muted-foreground mb-6 sm:mb-8 max-w-xl mx-auto px-2"
            style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}
          >
            AI-powered failure intelligence for competitive programming
          </p>

          <p
            className="text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 px-2"
            style={{ fontSize: 'clamp(0.875rem, 2vw, 1.0625rem)', lineHeight: 1.7 }}
          >
            Transform your coding failures into learning opportunities. FailureAtlas analyzes your
            submissions, identifies root causes, maps systemic weaknesses, and recommends personalized
            learning strategies.
          </p>

          {/* CTA buttons — stacked on mobile, inline on sm+ */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto px-8">
                Get Started Free
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8">
                Sign In
              </Button>
            </Link>
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
                Get Started
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
