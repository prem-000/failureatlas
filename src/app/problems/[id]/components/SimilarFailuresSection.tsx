'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ExternalLink, ChevronDown, ChevronUp, Clock, AlertTriangle } from 'lucide-react';
import type { PastFailure } from './inferenceEngine';

interface SimilarFailuresSectionProps {
  failures: PastFailure[];
  isExpandedInitial?: boolean;
  onSelectPastFailure?: (failure: PastFailure) => void;
}

export function SimilarFailuresSection({
  failures,
  isExpandedInitial = true,
  onSelectPastFailure,
}: SimilarFailuresSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(!isExpandedInitial);

  const pastFailures = failures && failures.length > 0 ? failures : [];

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
              background: '#f59e0b20',
              border: '1px solid #f59e0b40',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
            }}
          >
            <History size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>
              Similar Past Failures
            </h3>
            <span style={{ fontSize: 11, color: '#71717a' }}>
              Historical problem diagnosis records & recurring weakness links
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#fcd34d',
              background: '#78350f30',
              border: '1px solid #78350f',
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            {pastFailures.length} Pattern Matches
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pastFailures.map((pf) => (
                <div
                  key={pf.id}
                  onClick={() => onSelectPastFailure && onSelectPastFailure(pf)}
                  style={{
                    background: '#141414',
                    border: '1px solid #262626',
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#f59e0b60';
                    e.currentTarget.style.background = '#1f1912';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#262626';
                    e.currentTarget.style.background = '#141414';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#f4f4f5' }}>
                        {pf.problemTitle}
                      </span>
                      <span style={{ fontSize: 10, color: '#f59e0b', background: '#78350f30', border: '1px solid #78350f50', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
                        {pf.topic}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#a1a1aa' }}>
                      <span style={{ color: '#ef4444', fontWeight: 500 }}>
                        ⚠️ {pf.mistakeType}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#71717a' }}>
                        <Clock size={12} />
                        {pf.timeAgo}
                      </span>
                    </div>
                  </div>

                  <div style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Open Diagnosis</span>
                    <ExternalLink size={14} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
