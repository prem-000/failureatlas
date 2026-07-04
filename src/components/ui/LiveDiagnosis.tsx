'use client';
/**
 * src/components/ui/LiveDiagnosis.tsx
 *
 * Premium interactive visual demo of the Praxis diagnostic pipeline.
 * Animates through steps representing the process of resolving a code failure.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Cpu, GitCompare, Wifi, HelpCircle, Activity, LayoutGrid, CheckCircle2, ChevronRight } from 'lucide-react';

interface DiagnosticStep {
  id: number;
  label: string;
  shortDesc: string;
  icon: React.ReactNode;
  terminalHeader: string;
  terminalBody: React.ReactNode;
}

export default function LiveDiagnosis() {
  const [activeStep, setActiveStep] = useState(1);

  // Auto-play the steps slowly
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev % steps.length) + 1);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const steps: DiagnosticStep[] = [
    {
      id: 1,
      label: 'Submission Ingested',
      shortDesc: 'Extension captures the raw execution telemetry.',
      icon: <Terminal size={16} className="text-blue-400" />,
      terminalHeader: 'Telemetry Interceptor v1.0.4',
      terminalBody: (        <div className="font-mono text-xs text-blue-300/90 space-y-2">
          <p className="text-zinc-500">// Intercepting submission data from network response...</p>
          <p className="text-zinc-300">HTTP POST leetcode.com/submissions/detail/1409210981/check/</p>
          <p className="text-emerald-400">{"-> [Status 200] Telemetry capture complete."}</p>
          <p className="text-zinc-400">Language: Python3 | Problem: 3Sum (slug: 3sum)</p>
          <pre className="text-zinc-500 bg-zinc-900/60 p-2.5 rounded-lg border border-white/5 overflow-x-auto text-[10px]">
{`def threeSum(self, nums: List[int]) -> List[List[int]]:
    nums.sort()
    res = []
    for i in range(len(nums) - 2): # loop starts
        if i > 0 and nums[i] == nums[i-1]:
            continue`}
          </pre>
        </div>
      ),
    },
    {
      id: 2,
      label: 'LeetCode Verdict',
      shortDesc: 'Failing status is parsed from the response stream.',
      icon: <Cpu size={16} className="text-red-400" />,
      terminalHeader: 'Execution Checker Output',
      terminalBody: (
        <div className="font-mono text-xs space-y-2 select-none">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-red-500 font-bold uppercase tracking-wider text-[11px]">Wrong Answer</span>
          </div>
          <p className="text-zinc-400">Passed Test Cases: <span className="text-white font-bold">22/46</span></p>
          <p className="text-zinc-400">Runtime: <span className="text-white">72ms</span> | Memory: <span className="text-white">18.4MB</span></p>
          <p className="text-zinc-500">// Traditional platforms stop here. Ingestion continuing...</p>
        </div>
      ),
    },
    {
      id: 3,
      label: 'Network Evidence',
      shortDesc: 'Failed test case variables extracted.',
      icon: <Wifi size={16} className="text-amber-400" />,
      terminalHeader: 'Network Payload Decryption',
      terminalBody: (
        <div className="font-mono text-xs text-amber-300/90 space-y-2">
          <p className="text-zinc-500">// Extracting evidence headers from JSON stream...</p>
          <div className="bg-zinc-900/60 p-3 rounded-lg border border-white/5 space-y-1">
            <p className="text-zinc-400">Failed Input: <span className="text-white">[0, 0, 0, 0]</span></p>
            <p className="text-zinc-400">Expected Output: <span className="text-emerald-400">[[0, 0, 0]]</span></p>
            <p className="text-zinc-400">User Output: <span className="text-red-400">[[0, 0, 0], [0, 0, 0]]</span></p>
          </div>
          <p className="text-zinc-400">Signal: Duplicate triplets returned. Duplicate avoidance logic missing.</p>
        </div>
      ),
    },
    {
      id: 4,
      label: 'Myers Code Diff',
      shortDesc: 'Code delta computed against previous submission.',
      icon: <GitCompare size={16} className="text-purple-400" />,
      terminalHeader: 'Myers Diff Engine v1.2',
      terminalBody: (
        <div className="font-mono text-xs text-purple-300/90 space-y-2">
          <p className="text-zinc-500">// Comparing edits against previous failed attempt...</p>
          <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-white/5 overflow-x-auto text-[10px] space-y-0.5">
            <p className="text-red-400 bg-red-950/20 px-1.5 py-0.5 rounded">{"- while left < right:"}</p>
            <p className="text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded">{"+ while left < right and nums[left] == nums[left-1]:"}</p>
            <p className="text-zinc-500 px-1.5">{"     left += 1"}</p>
          </div>
          <p className="text-zinc-400">Myers Confidence Index: <span className="text-white">96.4%</span></p>
        </div>
      ),
    },
    {
      id: 5,
      label: 'Behavioral Signals',
      shortDesc: 'Editor interaction timing analyzed.',
      icon: <Activity size={16} className="text-emerald-400" />,
      terminalHeader: 'Behavior Analysis Engine',
      terminalBody: (
        <div className="font-mono text-xs text-emerald-300/90 space-y-2">
          <p className="text-zinc-500">// Evaluating user interaction telemetry...</p>
          <ul className="space-y-1 bg-zinc-900/60 p-3 rounded-lg border border-white/5 list-disc pl-4 text-zinc-300">
            <li>Time since last attempt: <span className="text-white">42s (Rapid Resubmission)</span></li>
            <li>Code lines edited: <span className="text-white">1 line (Trial-and-error patch)</span></li>
            <li>Keystrokes detected: <span className="text-white">12</span></li>
          </ul>
          <p className="text-zinc-400">Action: Tagging as "high risk of repetitive pattern".</p>
        </div>
      ),
    },
    {
      id: 6,
      label: 'Bayesian Diagnosis',
      shortDesc: 'Probabilities mapped to core weaknesses.',
      icon: <HelpCircle size={16} className="text-pink-400" />,
      terminalHeader: 'Bayesian Inference Core',
      terminalBody: (
        <div className="font-mono text-xs text-pink-300/90 space-y-2">
          <p className="text-zinc-500">// Computing posterior probability weights...</p>
          <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-white/5">
            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>Boundary Condition Error</span>
                <span>88%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500" style={{ width: '88%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>Off-by-One</span>
                <span>42%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500/50" style={{ width: '42%' }} />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 7,
      label: 'Failure Explanation',
      shortDesc: 'Detailed diagnostic breakdown card generated.',
      icon: <LayoutGrid size={16} className="text-primary" />,
      terminalHeader: 'Praxis Explanation Card',
      terminalBody: (
        <div className="space-y-3 select-text">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
            <span className="text-xs font-bold text-primary block uppercase tracking-wider mb-1">Primary Diagnosis</span>
            <h4 className="font-bold text-sm text-white">Duplicate Avoidance Bug</h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
              Your solution fails on sorted arrays with duplicate values because you increment pointers without checking if the next elements match the current ones.
            </p>
          </div>
          <div className="p-2.5 bg-zinc-900/80 border border-white/5 rounded-lg text-[10px] font-mono text-zinc-400">
            <span className="text-white font-bold block mb-1">Representative TestCase</span>
            <p className="text-zinc-500">Input: [0, 0, 0, 0]</p>
            <p className="text-zinc-500">Expected: [[0, 0, 0]]</p>
          </div>
        </div>
      ),
    },
    {
      id: 8,
      label: 'Learning Plan',
      shortDesc: 'Personalized practice recommendation queued.',
      icon: <CheckCircle2 size={16} className="text-emerald-400" />,
      terminalHeader: 'Praxis Mastery Plan',
      terminalBody: (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-emerald-400">Queueing practice problems</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                Master pointer loop convergence:
              </p>
              <ul className="text-[10px] list-disc pl-4 text-emerald-300 mt-1.5 space-y-0.5 font-mono">
                <li>15. 3Sum (Refactor & Accept)</li>
                <li>18. 4Sum (Master Pointer Bounds)</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch select-text">
      {/* Steps List */}
      <div className="lg:col-span-5 flex flex-col gap-3 justify-center">
        {steps.map((step) => {
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-300 ${
                isActive
                  ? 'bg-surface border-primary/30 shadow-lg'
                  : 'bg-transparent border-transparent hover:bg-surface/30'
              }`}
              style={{ minHeight: 'unset', minWidth: 'unset' }}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 mt-0.5 transition-all duration-300 ${
                  isActive ? 'bg-primary/10 border-primary/30' : 'bg-surface/50 border-border/30'
                }`}
              >
                {step.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-semibold transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                    {step.label}
                  </h4>
                  <ChevronRight
                    size={14}
                    className={`text-zinc-600 transition-all duration-300 ${isActive ? 'translate-x-0.5 text-primary' : 'opacity-0'}`}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.shortDesc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Terminal View */}
      <div className="lg:col-span-7 flex flex-col">
        <div className="flex-1 flex flex-col bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl min-h-[380px]">
          {/* Header */}
          <div className="px-4 py-3 bg-[#171717] border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <span className="text-[10px] text-zinc-500 font-mono ml-2">praxis-diagnose:~</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
              {steps[activeStep - 1].terminalHeader}
            </span>
          </div>

          {/* Terminal Body */}
          <div className="flex-1 p-6 flex flex-col justify-between relative bg-black/40 overflow-y-auto">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,95,82,0.02)_0%,transparent_50%)] pointer-events-none" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-center"
              >
                {steps[activeStep - 1].terminalBody}
              </motion.div>
            </AnimatePresence>

            {/* Stepper progress indicator */}
            <div className="flex gap-1.5 justify-center mt-6 pt-4 border-t border-white/5">
              {steps.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(s.id)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    activeStep === s.id ? 'w-6 bg-primary' : 'w-2 bg-zinc-800 hover:bg-zinc-700'
                  }`}
                  style={{ minHeight: 'unset', minWidth: 'unset' }}
                  aria-label={`Go to step ${s.id}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
