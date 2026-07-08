'use client';
/**
 * src/components/ui/PlatformComparison.tsx
 *
 * Traditional competitive programming platforms vs Praxis comparison component.
 * Premium interactive side-by-side design.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, CheckCircle2, ChevronRight, FileCode, Play, AlertCircle, HelpCircle } from 'lucide-react';

export default function PlatformComparison() {
  const [activeTab, setActiveTab] = useState<'leetcode' | 'praxis'>('praxis');

  return (
    <div className="w-full max-w-5xl mx-auto select-text">
      {/* Switcher Tab Header for Mobile */}
      <div className="flex md:hidden bg-surface p-1 rounded-xl border border-border mb-6">
        <button
          onClick={() => setActiveTab('leetcode')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'leetcode' ? 'bg-zinc-800 text-white shadow-sm' : 'text-muted-foreground'
          }`}
          style={{ minHeight: 'unset' }}
        >
          LeetCode (Standard)
        </button>
        <button
          onClick={() => setActiveTab('praxis')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'praxis' ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-muted-foreground'
          }`}
          style={{ minHeight: 'unset' }}
        >
          Praxis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* LeetCode Side (Standard Platforms) */}
        <div
          className={`rounded-2xl border bg-[#0d0d0d] p-6 flex flex-col justify-between transition-all duration-300 min-h-[380px] ${
            activeTab === 'leetcode' ? 'ring-2 ring-red-500/20 border-red-500/30' : 'border-border/30 opacity-40 md:opacity-100'
          } ${activeTab !== 'leetcode' ? 'hidden md:flex' : 'flex'}`}
        >
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Standard Platforms</span>
            </div>
            
            <h3 className="text-xl font-bold text-zinc-300 mb-2">The Wrong Answer Wall</h3>
            <p className="text-zinc-500 text-xs leading-relaxed mb-6">
              Traditional competitive programming platforms notify you about execution failures but keep the structural logic errors hidden behind proprietary test suites.
            </p>

            {/* Simulated Wrong Answer Screen */}
            <div className="bg-[#121212] border border-red-950/20 rounded-xl p-4 font-mono text-xs select-none">
              <div className="flex items-center gap-2 text-red-500 font-bold mb-3">
                <AlertCircle size={15} />
                <span>Wrong Answer</span>
              </div>
              
              <div className="space-y-2 text-zinc-500">
                <p>Passed Test Cases: <span className="text-zinc-300 font-bold">22/46</span></p>
                <p>Runtime: <span className="text-zinc-300">N/A</span></p>
                <p className="border-t border-white/5 pt-2 mt-2 text-[10px] text-zinc-600">
                  ❌ Output limit exceeded or wrong value returned.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-zinc-600 text-xs">
            <span>Result: Guessing loop begins</span>
            <span>🔒 Hidden Case</span>
          </div>
        </div>

        {/* Praxis Side (Premium AI-powered Diagnostics) */}
        <div
          className={`rounded-2xl border bg-gradient-to-b from-[#141414] to-[#111111] p-6 flex flex-col justify-between transition-all duration-300 min-h-[380px] ${
            activeTab === 'praxis' ? 'ring-2 ring-brand/20 border-brand/30 shadow-2xl' : 'border-border/30 opacity-40 md:opacity-100'
          } ${activeTab !== 'praxis' ? 'hidden md:flex' : 'flex'}`}
        >
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_8px_#FF6A3D]" />
              <span className="text-xs font-bold text-brand uppercase tracking-widest">Praxis Intelligence</span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Deep Logic Diagnosis</h3>
            <p className="text-muted-foreground text-xs leading-relaxed mb-6">
              Praxis intercepts code telemetry, compares editing patterns, and performs Bayesian analysis to generate actionable insights and representative test cases.
            </p>

            {/* Praxis Explanation UI */}
            <div className="space-y-3 font-mono text-xs">
              {/* Diagnosis Badge */}
              <div className="bg-[#18181b] border border-brand/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-brand font-bold uppercase tracking-wider text-[10px]">Diagnosis: Boundary Condition</span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ 91% Confidence</span>
                </div>
                <p className="text-[11px] font-sans text-zinc-300 leading-normal">
                  Your pointer loop bounds terminate early, causing you to skip index checks on duplicate array subsets.
                </p>
              </div>

              {/* Representative TestCase */}
              <div className="bg-[#121212] border border-white/5 rounded-xl p-3 text-[10px] space-y-1.5">
                <div className="flex items-center justify-between text-zinc-500 font-bold border-b border-white/5 pb-1">
                  <span>Adversarial TestCase</span>
                  <span className="text-primary-foreground/60 text-[9px] bg-primary/20 px-1.5 py-0.5 rounded">AI Generated</span>
                </div>
                <p className="text-zinc-400">Input: <span className="text-white bg-zinc-800 px-1 rounded">[0, 0, 0, 0]</span></p>
                <p className="text-zinc-400">Expected: <span className="text-emerald-400">[[0,0,0]]</span></p>
                <p className="text-zinc-400">Your Code returned: <span className="text-red-400">[[0,0,0],[0,0,0]]</span></p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-muted-foreground text-xs font-sans">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 size={13} />
              Concept Mastery Actionable
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Mastery Enabled</span>
          </div>
        </div>

      </div>
    </div>
  );
}
