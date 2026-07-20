'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { BugDetail } from './inferenceEngine';

interface BugExplanationSectionProps {
  bugs: BugDetail[];
  isExpandedInitial?: boolean;
}

export function BugExplanationSection({
  bugs,
  isExpandedInitial = true,
}: BugExplanationSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(!isExpandedInitial);

  const primaryBug = bugs[0] || {
    line: 18,
    explanation: 'best was never updated because inner loop never executed.',
    reasonWhy: 'best never changes because the inner loop never runs.',
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
              background: '#ef444420',
              border: '1px solid #ef444440',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>
              Bug Explanation
            </h3>
            <span style={{ fontSize: 11, color: '#71717a' }}>
              Algorithmic flaw diagnosis & execution reasoning
            </span>
          </div>
        </div>

        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#71717a',
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {/* Left: Logic Anomaly Spot */}
              <div
                style={{
                  background: '#1f1212',
                  border: '1px solid #7f1d1d40',
                  borderRadius: 10,
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🎯</span>
                  <span>Logic Anomaly Spot</span>
                </div>
                <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5, fontWeight: 600 }}>
                  {primaryBug.explanation}
                </div>
              </div>

              {/* Right: Why it fails */}
              <div
                style={{
                  background: '#191712',
                  border: '1px solid #78350f40',
                  borderRadius: 10,
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚠️</span>
                  <span>Why it fails</span>
                </div>
                <div style={{ fontSize: 13, color: '#fde68a', lineHeight: 1.5, fontWeight: 500 }}>
                  {primaryBug.reasonWhy || primaryBug.explanation}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
