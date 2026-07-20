'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Cpu, ChevronDown, ChevronUp, CheckCircle2, AlertOctagon } from 'lucide-react';
import type { SimulationStep } from './inferenceEngine';

interface ExecutionSimulationSectionProps {
  steps: SimulationStep[];
  isExpandedInitial?: boolean;
}

export function ExecutionSimulationSection({
  steps,
  isExpandedInitial = true,
}: ExecutionSimulationSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(!isExpandedInitial);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const totalSteps = steps.length > 0 ? steps.length : 1;
  const currentStep = steps[currentStepIndex] || {
    stepNumber: 1,
    title: 'Initialization',
    variables: { i: 0, best: 'INT_MIN' },
    description: 'Starting state of execution.',
    status: 'normal',
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1800);
    }
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  const handlePlayPause = () => {
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
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
              background: '#3b82f620',
              border: '1px solid #3b82f640',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
            }}
          >
            <Cpu size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>
              AI Execution Simulation
            </h3>
            <span style={{ fontSize: 11, color: '#71717a' }}>
              Step-by-step state visualization & loop analysis
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#60a5fa',
              background: '#1e3a8a30',
              border: '1px solid #1e3a8a',
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            Step {currentStepIndex + 1} of {totalSteps}
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
            {/* Desktop step view */}
            <div className="hidden md:block">
              {/* Progress bar */}
              <div style={{ background: '#262626', height: 4, borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
                    background: '#3b82f6',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Current Step Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStepIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: currentStep.status === 'bug' ? '#2b0f0f' : '#141414',
                    border: `1px solid ${currentStep.status === 'bug' ? '#7f1d1d' : '#262626'}`,
                    borderRadius: 10,
                    padding: '20px',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', background: '#3b82f620', padding: '2px 8px', borderRadius: 4 }}>
                        Step {currentStepIndex + 1}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>
                        {currentStep.title}
                      </span>
                    </div>
                    {currentStep.status === 'bug' && (
                      <span style={{ fontSize: 11, color: '#ef4444', background: '#450a0a', border: '1px solid #991b1b', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        ⚠️ Logic Anomaly Detected
                      </span>
                    )}
                  </div>

                  {/* Variable state chips */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                    {Object.entries(currentStep.variables).map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          background: '#0d0d0d',
                          border: '1px solid #27272a',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontFamily: 'monospace',
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{ color: '#9ca3af' }}>{k}</span>
                        <span style={{ color: '#60a5fa', fontWeight: 700 }}>= {String(v)}</span>
                      </div>
                    ))}
                  </div>

                  <p style={{ margin: 0, fontSize: 14, color: '#d4d4d8', lineHeight: 1.5 }}>
                    {currentStep.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Mobile Vertical Timeline Layout */}
            <div className="block md:hidden mb-5">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                {steps.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  const isBug = step.status === 'bug';

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIndex(idx);
                      }}
                      style={{
                        background: isActive ? (isBug ? '#2b0f0f' : '#1e293b') : '#141414',
                        border: `1px solid ${isActive ? (isBug ? '#ef4444' : '#3b82f6') : '#262626'}`,
                        borderRadius: 10,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: isActive ? (isBug ? '#ef4444' : '#3b82f6') : '#27272a',
                              color: '#ffffff',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {idx + 1}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#ffffff' : '#a1a1aa' }}>
                            {step.title}
                          </span>
                        </div>
                        {isBug && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠️ BUG</span>}
                      </div>

                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                        {step.description}
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Object.entries(step.variables).map(([k, v]) => (
                          <span key={k} style={{ fontSize: 10, fontFamily: 'monospace', background: '#0a0a0a', padding: '2px 6px', borderRadius: 4, color: '#60a5fa' }}>
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controls Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: '#121212',
                border: '1px solid #262626',
                borderRadius: 10,
                padding: '10px 16px',
              }}
            >
              <button
                onClick={handleRestart}
                style={{
                  background: '#1f1f23',
                  border: '1px solid #3f3f46',
                  color: '#a1a1aa',
                  borderRadius: 6,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}
                title="Restart Simulation"
              >
                <RotateCcw size={14} />
                Restart
              </button>

              <button
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                style={{
                  background: '#1f1f23',
                  border: '1px solid #3f3f46',
                  color: currentStepIndex === 0 ? '#52525b' : '#e4e4e7',
                  borderRadius: 6,
                  padding: '8px 14px',
                  cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <SkipBack size={14} />
                Previous
              </button>

              <button
                onClick={handlePlayPause}
                style={{
                  background: isPlaying ? '#dc2626' : '#3b82f6',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: 6,
                  padding: '8px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                }}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                {isPlaying ? 'Pause' : '▶ Play'}
              </button>

              <button
                onClick={handleNext}
                disabled={currentStepIndex === steps.length - 1}
                style={{
                  background: '#1f1f23',
                  border: '1px solid #3f3f46',
                  color: currentStepIndex === steps.length - 1 ? '#52525b' : '#e4e4e7',
                  borderRadius: 6,
                  padding: '8px 14px',
                  cursor: currentStepIndex === steps.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Next
                <SkipForward size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
