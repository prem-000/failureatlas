'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ArrowRight, ArrowLeft, Terminal, ShieldAlert, Target, Star, Play } from 'lucide-react';
import type { ReconstructedJudgeCase } from './inferenceEngine';

interface HiddenTestCasesSectionProps {
  judgeCases?: ReconstructedJudgeCase[];
  hiddenTests?: ReconstructedJudgeCase[];
  isExpandedInitial?: boolean;
  activeTestIndexInitial?: number;
  onTestIndexChange?: (index: number) => void;
  onRunSimulation?: () => void;
}

export function HiddenTestCasesSection({
  judgeCases,
  hiddenTests,
  isExpandedInitial = true,
  activeTestIndexInitial = 0,
  onTestIndexChange,
  onRunSimulation,
}: HiddenTestCasesSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(!isExpandedInitial);
  const [currentIndex, setCurrentIndex] = useState(activeTestIndexInitial);

  const cases = judgeCases || hiddenTests || [];
  const totalCases = cases.length > 0 ? cases.length : 1;

  const currentCase = cases[currentIndex] || {
    id: 'jc-fallback',
    caseNumber: 1,
    totalCases: 6,
    category: 'Adversarial Cycle',
    difficultyStars: 4,
    purpose: 'Verify that Floyd\'s algorithm correctly detects a cycle that begins after a long traversal.',
    input: 'nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 5]',
    expectedOutput: '5',
    targets: ['✓ Cycle Detection', '✓ Pointer Update', '✓ Loop Termination'],
    whyIncorrectSolutionsFail: 'Many implementations reset the wrong pointer after the first meeting point.',
  };

  const handleNext = () => {
    if (totalCases <= 1) return;
    const nextIdx = (currentIndex + 1) % totalCases;
    setCurrentIndex(nextIdx);
    if (onTestIndexChange) onTestIndexChange(nextIdx);
  };

  const handlePrev = () => {
    if (totalCases <= 1) return;
    const prevIdx = (currentIndex - 1 + totalCases) % totalCases;
    setCurrentIndex(prevIdx);
    if (onTestIndexChange) onTestIndexChange(prevIdx);
  };

  const handleRunSim = () => {
    if (onRunSimulation) {
      onRunSimulation();
    } else {
      const el = document.getElementById('section-execution-simulation');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Render star ratings (e.g. ★★★★☆)
  const renderStars = (stars: number) => {
    const totalStars = 5;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {Array.from({ length: totalStars }).map((_, i) => (
          <Star
            key={i}
            size={13}
            fill={i < stars ? '#f59e0b' : 'transparent'}
            color={i < stars ? '#f59e0b' : '#3f3f46'}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        background: '#161616',
        border: '1px solid #262626',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Card Header */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          padding: '16px 20px',
          background: '#1a1a1a',
          borderBottom: isCollapsed ? 'none' : '1px solid #262626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: '#9333ea20',
              border: '1px solid #9333ea40',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
            }}
          >
            <Terminal size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>
              AI Judge Simulator
            </h3>
            <span style={{ fontSize: 11, color: '#71717a' }}>
              Reconstructed hidden judge suite designed by AI problem setters to eliminate common incorrect implementations.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#c084fc',
              background: '#581c8730',
              border: '1px solid #6b21a8',
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            Judge Case {currentIndex + 1} of {totalCases}
          </span>
          <button style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex' }}>
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Card Body */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ padding: '20px' }}
          >
            {/* Reconstructed Judge Case Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: '#121212',
                  border: '1px solid #262626',
                  borderRadius: 10,
                  padding: '20px',
                }}
              >
                {/* Header Row: Case Number, Category, and Star Difficulty */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#f4f4f5' }}>
                      Judge Case #{currentIndex + 1}
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 6,
                        background: '#1f1f23',
                        color: '#c084fc',
                        border: '1px solid #3b0764',
                      }}
                    >
                      {currentCase.category}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#18181b', padding: '4px 10px', borderRadius: 6, border: '1px solid #27272a' }}>
                    <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600 }}>Judge Difficulty</span>
                    {renderStars(currentCase.difficultyStars || 3)}
                  </div>
                </div>

                {/* Purpose Statement */}
                <div
                  style={{
                    background: '#171719',
                    border: '1px solid #27272a',
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    PURPOSE
                  </div>
                  <div style={{ fontSize: 13, color: '#e4e4e7', lineHeight: 1.5, fontWeight: 500 }}>
                    {currentCase.purpose}
                  </div>
                </div>

                {/* Input / Expected Output Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 8, padding: '12px' }}>
                    <div style={{ fontSize: 10, color: '#71717a', fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>
                      INPUT
                    </div>
                    <div style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: 13, color: '#60a5fa', wordBreak: 'break-all' }}>
                      {currentCase.input}
                    </div>
                  </div>

                  <div style={{ background: '#0a0a0a', border: '1px solid #16653450', borderRadius: 8, padding: '12px' }}>
                    <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>
                      EXPECTED OUTPUT
                    </div>
                    <div style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: 13, color: '#4ade80', wordBreak: 'break-all', fontWeight: 700 }}>
                      {currentCase.expectedOutput}
                    </div>
                  </div>
                </div>

                {/* Targets Section */}
                {currentCase.targets && currentCase.targets.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Target size={12} style={{ color: '#a855f7' }} />
                      <span>TARGETS</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {currentCase.targets.map((target, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: '#2e106540',
                            color: '#d8b4fe',
                            border: '1px solid #581c8760',
                          }}
                        >
                          {target}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Why Incorrect Solutions Fail Box */}
                <div
                  style={{
                    background: '#1f1315',
                    border: '1px solid #7f1d1d40',
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 18,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldAlert size={13} />
                    <span>WHY INCORRECT SOLUTIONS FAIL</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#fca5a5', lineHeight: 1.5, fontWeight: 500 }}>
                    {currentCase.whyIncorrectSolutionsFail}
                  </p>
                </div>

                {/* Separator Line */}
                <div style={{ height: 1, background: '#262626', marginBottom: 16 }} />

                {/* Navigation: ← Previous | Judge Case X of Y | Next → */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#18181b',
                      border: '1px solid #27272a',
                      color: currentIndex === 0 ? '#52525b' : '#a1a1aa',
                      borderRadius: 8,
                      padding: '9px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    }}
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft size={14} />
                    ← Previous
                  </button>

                  <span style={{ fontSize: 12, fontWeight: 700, color: '#a1a1aa' }}>
                    Judge Case {currentIndex + 1} of {totalCases}
                  </span>

                  <button
                    onClick={handleNext}
                    disabled={currentIndex === totalCases - 1}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: currentIndex === totalCases - 1 ? '#27272a' : '#9333ea',
                      border: 'none',
                      color: currentIndex === totalCases - 1 ? '#71717a' : '#ffffff',
                      borderRadius: 8,
                      padding: '9px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: currentIndex === totalCases - 1 ? 'not-allowed' : 'pointer',
                      boxShadow: currentIndex === totalCases - 1 ? 'none' : '0 2px 8px rgba(147, 51, 234, 0.3)',
                    }}
                    className="w-full sm:w-auto"
                  >
                    Next →
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
