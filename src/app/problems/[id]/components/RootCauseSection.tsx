'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ChevronDown, ChevronUp, History, AlertCircle, TrendingUp } from 'lucide-react';
import type { RootCauseDetail } from './inferenceEngine';

interface RootCauseSectionProps {
  rootCause: RootCauseDetail;
  isExpandedInitial?: boolean;
}

export function RootCauseSection({
  rootCause,
  isExpandedInitial = true,
}: RootCauseSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(!isExpandedInitial);

  const confidence = rootCause.confidence || 97;
  const confidenceColor = confidence >= 90 ? '#ef4444' : confidence >= 75 ? '#f59e0b' : '#3b82f6';

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
              background: '#ef444420',
              border: '1px solid #ef444440',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <Target size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>
              Root Cause Analysis
            </h3>
            <span style={{ fontSize: 11, color: '#71717a' }}>
              Bayesian taxonomy classification & cognitive pattern metrics
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#fca5a5',
              background: '#450a0a',
              border: '1px solid #991b1b',
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            {confidence}% Confidence
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
            {/* Title & Confidence bar */}
            <div
              style={{
                background: '#121212',
                border: '1px solid #262626',
                borderRadius: 10,
                padding: '16px 20px',
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
                  {rootCause.type || 'Boundary Condition Error'}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 6,
                    color: '#fca5a5',
                    background: '#450a0a',
                    border: '1px solid #991b1b',
                  }}
                >
                  {rootCause.category || 'Boundary Errors'}
                </span>
              </div>

              {/* Confidence Meter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 6, background: '#27272a', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${confidence}%`,
                      height: '100%',
                      background: confidenceColor,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: confidenceColor, minWidth: 36 }}>
                  {confidence}%
                </span>
              </div>
            </div>

            {/* Why this belongs to Boundary Errors */}
            <div
              style={{
                background: '#141414',
                border: '1px solid #262626',
                borderRadius: 10,
                padding: '16px',
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} style={{ color: '#ef4444' }} />
                <span>Why this belongs to {rootCause.category || 'Boundary Errors'}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
                {rootCause.whyBelongs}
              </p>
            </div>

            {/* Similar mistakes in CP */}
            <div
              style={{
                background: '#141414',
                border: '1px solid #262626',
                borderRadius: 10,
                padding: '16px',
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🧩</span>
                <span>Similar Common Mistakes</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#a1a1aa', fontSize: 13, lineHeight: 1.7 }}>
                {rootCause.similarMistakes.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>

            {/* How often user makes this mistake */}
            <div
              style={{
                background: '#1c1917',
                border: '1px solid #78350f40',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#78350f30',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <TrendingUp size={18} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  User Pattern Frequency
                </div>
                <div style={{ fontSize: 13, color: '#fde68a', fontWeight: 600, marginTop: 2 }}>
                  {rootCause.frequencyMetric}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
