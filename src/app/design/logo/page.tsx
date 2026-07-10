'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Info } from 'lucide-react';
import { Logo, LogoAnimationMode } from '@/components/ui/logo';
import { Button } from '@/components/ui/Button';

export default function LogoShowcase() {
  const [animState, setAnimState] = useState<LogoAnimationMode>('idle');
  const [triggerKey, setTriggerKey] = useState(0); // Used to remount/restart draw anim

  const triggerDraw = () => {
    setAnimState('draw');
    setTriggerKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#131313] text-foreground p-8 md:p-16 selection:bg-brand/35 selection:text-white font-sans">
      
      {/* Back button */}
      <div className="max-w-7xl mx-auto mb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <header className="max-w-7xl mx-auto mb-16 border-b border-white/5 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand mb-2.5 block">
              Design System Showcase
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-none mb-4">
              Praxis Logo System
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              The single source of truth for the Praxis brand. Scalable, responsive, accessible, theme-aware, and built for modern vector stroke animations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Logo variant="wordmark" size="lg" className="text-brand" animation="idle" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Side: Showcases */}
        <section className="lg:col-span-8 space-y-16">
          
          {/* Section: Sizes */}
          <div className="bg-[#191919] border border-white/5 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-3">
              1. Responsive Sizes
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-end">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-28 flex items-center justify-center">
                    <Logo variant="mark" size="xs" className="text-brand" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">xs (16px)</span>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="h-28 flex items-center justify-center">
                    <Logo variant="mark" size="sm" className="text-brand" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">sm (20px)</span>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="h-28 flex items-center justify-center">
                    <Logo variant="mark" size="md" className="text-brand" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">md (24px)</span>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="h-28 flex items-center justify-center">
                    <Logo variant="mark" size="lg" className="text-brand" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">lg (32px)</span>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="h-28 flex items-center justify-center">
                    <Logo variant="mark" size="xl" className="text-brand" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">xl (48px)</span>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="h-28 flex items-center justify-center">
                    <Logo variant="mark" size="hero" className="text-brand" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">hero (96px)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Variants */}
          <div className="bg-[#191919] border border-white/5 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-3">
              2. Structural Layout Variants
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              
              <div className="border border-white/5 rounded-xl p-6 flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground mb-3">Icon / Mark</span>
                <div className="flex items-center gap-4">
                  <Logo variant="icon" size="xl" className="text-brand" />
                  <span className="text-xs text-muted-foreground font-mono">variant=&quot;icon&quot;</span>
                </div>
              </div>

              <div className="border border-white/5 rounded-xl p-6 flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground mb-3">Wordmark (Default)</span>
                <div className="flex items-center gap-4">
                  <Logo variant="wordmark" size="lg" className="text-brand" />
                  <span className="text-xs text-muted-foreground font-mono">variant=&quot;wordmark&quot;</span>
                </div>
              </div>

              <div className="border border-white/5 rounded-xl p-6 flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground mb-3">Stacked Layout</span>
                <div className="flex items-center justify-center py-2">
                  <Logo variant="stacked" size="xl" className="text-brand" />
                </div>
                <div className="text-center">
                  <span className="text-xs text-muted-foreground font-mono">variant=&quot;stacked&quot;</span>
                </div>
              </div>

              <div className="border border-white/5 rounded-xl p-6 flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground mb-3">Compact Layout</span>
                <div className="flex items-center gap-4">
                  <Logo variant="compact" size="md" className="text-brand" />
                  <span className="text-xs text-muted-foreground font-mono">variant=&quot;compact&quot;</span>
                </div>
              </div>

            </div>
          </div>

          {/* Section: Animation Modes */}
          <div className="bg-[#191919] border border-white/5 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-3">
              3. Future-Proof Animations
            </h2>
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
              <div className="flex flex-col items-center justify-center p-8 bg-black/30 border border-white/5 rounded-2xl w-full md:w-1/2 aspect-video">
                <Logo
                  key={triggerKey}
                  variant="wordmark"
                  size="hero"
                  className="text-brand"
                  animation={animState}
                />
              </div>

              <div className="w-full md:w-1/2 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Test and cycle animations built using inlined vector path offsets. Toggle state or trigger sequential draws below:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={animState === 'none' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setAnimState('none')}
                  >
                    None
                  </Button>
                  <Button
                    variant={animState === 'idle' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setAnimState('idle')}
                  >
                    Idle Pulse
                  </Button>
                  <Button
                    variant={animState === 'hover' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setAnimState('hover')}
                  >
                    Hover Wave
                  </Button>
                  <Button
                    variant={animState === 'draw' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={triggerDraw}
                  >
                    <div className="flex items-center gap-1.5 justify-center">
                      <Play size={12} /> Draw Stroke
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Accessibility */}
          <div className="bg-[#191919] border border-white/5 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-3">
              4. Interactive Accessibility
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Clicking or focusing on the interactive logo enforces a minimum 44x44px touch target, includes full keyboard handler support (Tab focus, Space / Enter click), and implements visual feedback outlines. Try interacting below:
              </p>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="border border-white/5 rounded-xl p-6 flex flex-col gap-2 items-center bg-black/10">
                  <span className="text-[11px] font-semibold text-muted-foreground mb-2">Interactive Button (Focus / Press)</span>
                  <Logo
                    variant="wordmark"
                    size="md"
                    className="text-brand"
                    interactive
                    onClick={() => alert('Logo Clicked! Space or Enter also triggers this.')}
                  />
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* Right Side: Quick Reference Sidebar */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* Contrast Panel */}
          <div className="bg-[#191919] border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Contrast & Themes</h3>
            
            <div className="space-y-4">
              <div className="border border-white/5 rounded-xl p-4 bg-[#131313] flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">Dark Brand</span>
                <Logo variant="wordmark" size="sm" className="text-brand" />
              </div>

              <div className="border border-white/5 rounded-xl p-4 bg-white flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-2">Light Mode</span>
                {/* Override text color to neutral-900 so text remains readable */}
                <div className="text-neutral-900 flex items-center justify-center">
                  <Logo variant="wordmark" size="sm" className="text-brand" />
                </div>
              </div>

              <div className="border border-white/5 rounded-xl p-4 bg-neutral-900 flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">High Contrast</span>
                <Logo variant="wordmark" size="sm" className="text-white" />
              </div>
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="bg-brand/5 border border-brand/20 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Info size={16} className="text-brand" /> Logo Rules
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2.5 list-disc pl-4">
              <li>Use the split React vector paths for all branding.</li>
              <li>Always size proportional to coordinates.</li>
              <li>Use <code className="text-white">currentColor</code> to automatically follow CSS text colors.</li>
              <li>Always maintain at least 44x44px for click elements.</li>
              <li>Avoid rasterizing as JPG or PNG for user interfaces.</li>
            </ul>
          </div>

        </aside>

      </main>

    </div>
  );
}
