'use client';
/**
 * src/app/page.tsx
 *
 * Praxis Premium Landing Page Redesign (v2)
 *
 * Implements 8 storytelling sections detailing the Praxis diagnostic value proposition:
 * Section 1: Hero (100vh + HeroCanvas)
 * Section 2: Live Diagnosis Animation
 * Section 3: LeetCode vs Praxis Comparison
 * Section 4: Praxis Architecture (How Praxis Thinks)
 * Section 5: Interactive Knowledge Graph (ReactFlow Explorer)
 * Section 6: Learning Journey Progression
 * Section 7: Animated Product Metrics
 * Section 8: Final CTA
 */

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import { Menu, ArrowRight, ChevronRight, Terminal, Cpu, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/logo';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// ─── Dynamic Imports for Heavy Components ─────────────────────────────────────
const HeroCanvas = dynamic(() => import('@/components/ui/HeroCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] md:min-h-[450px] flex items-center justify-center bg-surface/20 rounded-2xl border border-white/5">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  ),
});

const LiveDiagnosis = dynamic(() => import('@/components/ui/LiveDiagnosis'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] bg-surface/20 rounded-2xl border border-white/5 animate-pulse" />
  ),
});

const PlatformComparison = dynamic(() => import('@/components/ui/PlatformComparison'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] bg-surface/20 rounded-2xl border border-white/5 animate-pulse" />
  ),
});

const PipelineGraph = dynamic(() => import('@/components/ui/PipelineGraph'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] md:h-[550px] flex items-center justify-center bg-surface/20 rounded-2xl border border-white/5">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  ),
});

const AnimatedMetrics = dynamic(() => import('@/components/ui/AnimatedMetrics'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[150px] bg-surface/20 rounded-2xl border border-white/5 animate-pulse" />
  ),
});

const MobileDrawer = dynamic(() => import('@/components/navigation/MobileDrawer'), {
  ssr: false,
});

const NAV_LINKS = [
  { label: 'Diagnosis Flow', href: '#diagnosis' },
  { label: 'Comparison', href: '#comparison' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Knowledge Graph', href: '#graph' },
];

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const heroTextRef = useRef<HTMLHeadingElement>(null);
  const heroBtnRef = useRef<HTMLDivElement>(null);
  const heroCanvasContainerRef = useRef<HTMLDivElement>(null);
  const architectureRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLDivElement>(null);

  // Smooth Scroll & GSAP setup
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);
    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value) {
        return arguments.length ? lenis.scrollTo(value!) : lenis.scroll;
      },
    });

    const ctx = gsap.context(() => {
      // Hero entrance
      const heroLines = heroTextRef.current?.querySelectorAll('.hero-line');
      if (heroLines) {
        gsap.from(heroLines, {
          y: 50,
          opacity: 0,
          duration: 1.2,
          ease: 'power4.out',
          stagger: 0.15,
        });
      }

      if (heroBtnRef.current) {
        gsap.from(heroBtnRef.current, {
          opacity: 0,
          y: 20,
          duration: 1,
          delay: 0.8,
          ease: 'power3.out',
        });
      }

      if (heroCanvasContainerRef.current) {
        gsap.from(heroCanvasContainerRef.current, {
          opacity: 0,
          scale: 0.95,
          duration: 1.5,
          delay: 0.4,
          ease: 'power3.out',
        });
      }

      // Section 4: Architecture modules slide-in
      if (architectureRef.current) {
        const modules = architectureRef.current.querySelectorAll('.arch-card');
        modules.forEach((mod, idx) => {
          gsap.from(mod, {
            scrollTrigger: {
              trigger: mod,
              start: 'top 85%',
              end: 'bottom 60%',
              toggleActions: 'play none none none',
            },
            opacity: 0,
            y: 30,
            duration: 0.8,
            delay: idx * 0.15,
            ease: 'power2.out',
          });
        });
      }

      // Section 6: Journey timeline slide-in
      if (journeyRef.current) {
        const cards = journeyRef.current.querySelectorAll('.journey-step');
        cards.forEach((card, idx) => {
          gsap.from(card, {
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              end: 'bottom 65%',
              toggleActions: 'play none none none',
            },
            opacity: 0,
            x: idx % 2 === 0 ? -30 : 30,
            duration: 0.8,
            ease: 'power2.out',
          });
        });
      }
    });

    return () => {
      lenis.destroy();
      ctx.revert();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-white font-sans antialiased overflow-x-hidden select-text">
      
      {/* ─── Navigation Header ────────────────────────────────────────── */}
      <nav className="border-b border-white/5 sticky top-0 z-40 bg-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 md:px-8 xl:px-12 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center" style={{ minWidth: 44, minHeight: 44 }}>
            <Logo variant="wordmark" size="sm" className="text-brand" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="md">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="md" className="shadow-lg shadow-primary/10">Get Started</Button>
            </Link>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden w-11 h-11 border border-border/40 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
            aria-label="Open navigation drawer"
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} navLinks={NAV_LINKS} />

      {/* ─── Section 1: Premium Hero (100vh) ─────────────────────────── */}
      <header className="relative w-full min-h-[calc(100vh-76px)] flex flex-col justify-center max-w-7xl mx-auto px-6 md:px-8 xl:px-12 py-12 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Left Info */}
          <div className="lg:col-span-7 select-text text-left">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] uppercase tracking-wider font-extrabold text-primary mb-6"
            >
              <Terminal size={12} className="animate-pulse" />
              <span>Competitive Programming Growth Core</span>
            </motion.div>

            <h1
              ref={heroTextRef}
              className="font-extrabold tracking-tight text-white mb-6 leading-[1.02] overflow-hidden"
              style={{ fontSize: 'clamp(36px, 6.8vw, 92px)' }}
            >
              <span className="hero-line block">Master the Patterns.</span>
              <span className="hero-line block text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                Solve Anything.
              </span>
            </h1>

            <p className="text-muted-foreground text-sm md:text-base xl:text-lg leading-relaxed max-w-lg mb-10">
              Praxis explains <span className="text-white font-semibold">WHY</span> your code failed, not just <span className="text-white font-semibold">THAT</span> it failed. Target logical errors, identify boundary weaknesses, and conquer competitive coding.
            </p>

            <div ref={heroBtnRef} className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto px-8 group">
                  Create Free Account
                  <ArrowRight size={15} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#diagnosis" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8">
                  View Live Demo
                </Button>
              </a>
            </div>
          </div>

          {/* Hero Right 3D Visual */}
          <div ref={heroCanvasContainerRef} className="lg:col-span-5 w-full aspect-square lg:aspect-auto h-full flex justify-center items-center">
            <HeroCanvas />
          </div>
        </div>
      </header>

      {/* ─── Section 2: Live Diagnosis Animation ────────────────────── */}
      <section id="diagnosis" className="py-20 md:py-32 border-t border-white/5 max-w-7xl mx-auto px-6 md:px-8 xl:px-12">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary mb-3 block">
            Inside the Engine
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            The Analysis Pipeline
          </h2>
          <p className="text-muted-foreground text-sm">
            Observe the telemetry pipeline capture code edits, perform Bayesian categorization, and synthesize explanatory mastery recommendations.
          </p>
        </div>

        <LiveDiagnosis />
      </section>

      {/* ─── Section 3: Why Existing Platforms Stop Too Early ───────── */}
      <section id="comparison" className="py-20 md:py-32 border-t border-white/5 bg-surface/5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,95,82,0.02)_0%,transparent_60%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-8 xl:px-12">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="text-xs uppercase font-extrabold tracking-widest text-primary mb-3 block">
              The Critical Difference
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              Stop Guessing, Start Mastering
            </h2>
            <p className="text-muted-foreground text-sm">
              Traditional competitive programming judges leave you with ambiguous diagnostics. Praxis exposes the structural flaw.
            </p>
          </div>

          <PlatformComparison />
        </div>
      </section>

      {/* ─── Section 4: How Praxis Thinks (Architecture) ────────────── */}
      <section id="architecture" ref={architectureRef} className="py-20 md:py-32 border-t border-white/5 max-w-7xl mx-auto px-6 md:px-8 xl:px-12">
        <div className="text-left mb-16 max-w-xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary mb-3 block">
            Core Architecture
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            How Praxis Thinks
          </h2>
          <p className="text-muted-foreground text-sm">
            Praxis connects telemetry, code metrics, and static analysis models in parallel to synthesize the diagnostic explanation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Module 1: Ingestion */}
          <div className="arch-card p-6 rounded-2xl bg-surface border border-white/5 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Terminal size={18} className="text-blue-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">1. Multichannel Telemetry</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Captures network judge JSON logs, Myers code changes, and keystroke variables during practice.
              </p>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-6 pt-4 border-t border-white/5">
              Input: submission.raw
            </div>
          </div>

          {/* Module 2: Analysis Core */}
          <div className="arch-card p-6 rounded-2xl bg-surface border border-white/5 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <Activity size={18} className="text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">2. Bayesian Classification</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Applies PageRank weakness propagation and Bayesian inference to categorize the logic error.
              </p>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-6 pt-4 border-t border-white/5">
              Process: probability_engine
            </div>
          </div>

          {/* Module 3: Synthesis */}
          <div className="arch-card p-6 rounded-2xl bg-surface border border-white/5 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <Cpu size={18} className="text-purple-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">3. LLM Diagnostic Synthesis</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Hybrid RAG fetches related past failures; LLM generates a diagnostic card and a localized practice plan.
              </p>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-6 pt-4 border-t border-white/5">
              Output: failure_explanation.json
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 5: Interactive Knowledge Graph ─────────────────── */}
      <section id="graph" className="py-20 md:py-32 border-t border-white/5 max-w-7xl mx-auto px-6 md:px-8 xl:px-12">
        <div className="text-left mb-12 max-w-2xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary mb-3 block">
            Knowledge Map
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Interactive Knowledge Graph
          </h2>
          <p className="text-muted-foreground text-sm">
            Drag, zoom, and explore your personal concept node network. Click on nodes to inspect active weaknesses and recommended practice tasks.
          </p>
        </div>

        {/* Fullscreen ReactFlow Explorer Container */}
        <div className="w-full h-[450px] md:h-[600px] shadow-2xl shadow-black/45">
          <PipelineGraph />
        </div>
      </section>

      {/* ─── Section 6: Learning Journey ────────────────────────────── */}
      <section ref={journeyRef} className="py-20 md:py-32 border-t border-white/5 bg-surface/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs uppercase font-extrabold tracking-widest text-primary mb-3 block">
              The Path to Mastery
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              Your Learning Journey
            </h2>
            <p className="text-muted-foreground text-sm">
              See how Praxis converts a single code crash into consistent algorithmic progression.
            </p>
          </div>

          <div className="relative border-l-2 border-white/5 pl-8 md:pl-16 space-y-12 py-4">
            {/* Step 1 */}
            <div className="journey-step relative">
              <span className="absolute -left-[41px] md:-left-[73px] top-1.5 w-6 h-6 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-xs font-bold text-red-400">
                1
              </span>
              <h4 className="text-lg font-bold text-white mb-1.5">Attempt 1: Wrong Answer</h4>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xl">
                The code fails index boundaries on LeetCode test cases. Praxis intercepts the run, extracts output variables, and computes code line edits.
              </p>
            </div>

            {/* Step 2 */}
            <div className="journey-step relative">
              <span className="absolute -left-[41px] md:-left-[73px] top-1.5 w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-400">
                2
              </span>
              <h4 className="text-lg font-bold text-white mb-1.5">Boundary Weakness Diagnosed</h4>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xl">
                Inference models identify a pointer loop convergence bug (91% confidence). A representative adversarial case and study plan are immediately queued.
              </p>
            </div>

            {/* Step 3 */}
            <div className="journey-step relative">
              <span className="absolute -left-[41px] md:-left-[73px] top-1.5 w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-400">
                3
              </span>
              <h4 className="text-lg font-bold text-white mb-1.5">Concept Practice Problems</h4>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xl">
                The user completes targeted loop-pointer bounds drills to consolidate the structural pattern change.
              </p>
            </div>

            {/* Step 4 */}
            <div className="journey-step relative">
              <span className="absolute -left-[41px] md:-left-[73px] top-1.5 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-400">
                4
              </span>
              <h4 className="text-lg font-bold text-white mb-1.5">Attempt 2: Accepted & Skill Improved</h4>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xl">
                The updated solution passes the test suite. The Two-Pointers concept level is incremented to Level 4 in the knowledge graph.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 7: Product Metrics ─────────────────────────────── */}
      <section className="py-20 md:py-32 border-t border-white/5 max-w-7xl mx-auto px-6 md:px-8 xl:px-12">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary mb-3 block">
            System Reliability
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Engineered For Accuracy
          </h2>
          <p className="text-muted-foreground text-sm">
            Praxis utilizes multiple independent pipelines to ensure your learning diagnostics are statistically precise.
          </p>
        </div>

        <AnimatedMetrics />
      </section>

      {/* ─── Section 8: Final CTA ────────────────────────────────────── */}
      <section className="py-24 md:py-36 border-t border-white/5 bg-gradient-to-b from-transparent to-primary/5 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center select-text relative z-10">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.08]">
            Ready to stop guessing?<br />
            Start building your learning graph.
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto mb-10">
            Failing is part of practice. Praxis ensures that every failing test case becomes a learning opportunity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto">
            <Link href="/register" className="w-full">
              <Button size="lg" className="w-full justify-center group">
                Get Started Free
                <ChevronRight size={15} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-background py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-8 xl:px-12 flex flex-col sm:flex-row justify-between items-center gap-6">
          <span className="text-xs font-semibold tracking-tight text-muted-foreground">
            © {new Date().getFullYear()} Praxis. Built for algorithmic growth.
          </span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-xs text-muted-foreground hover:text-white transition-colors">
              Platform Login
            </Link>
            <Link href="/register" className="text-xs text-muted-foreground hover:text-white transition-colors">
              Register
            </Link>
            <a href="#" className="text-xs text-muted-foreground hover:text-white transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
