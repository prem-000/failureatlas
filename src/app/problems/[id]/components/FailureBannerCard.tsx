'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertOctagon, Play, Lightbulb } from 'lucide-react';

interface FailureBannerCardProps {
  bannerText: string;
  reasonText: string;
  onShowExecution: () => void;
  onHowWeFoundThis: () => void;
}

export function FailureBannerCard({
  bannerText,
  reasonText,
  onShowExecution,
  onHowWeFoundThis,
}: FailureBannerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'linear-gradient(135deg, #2b0d0d 0%, #1a0a0a 100%)',
        border: '1px solid #7f1d1d',
        borderRadius: 14,
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.12)',
        color: '#f4f4f5',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background glow */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
        <div
          style={{
            background: '#450a0a',
            border: '1px solid #991b1b',
            borderRadius: 10,
            padding: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            flexShrink: 0,
          }}
        >
          <AlertOctagon size={24} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              fontWeight: 800,
              color: '#fca5a5',
              letterSpacing: '-0.02em',
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span>❌</span>
            <span>{bannerText}</span>
          </div>

          <p
            style={{
              fontSize: 14,
              color: '#e4e4e7',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {reasonText}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid rgba(239, 68, 68, 0.2)',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={onShowExecution}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#ef4444')}
        >
          <Play size={15} />
          Show Execution
        </button>

        <button
          onClick={onHowWeFoundThis}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: 'transparent',
            color: '#a1a1aa',
            border: '1px solid #3f3f46',
            borderRadius: 8,
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f4f4f5';
            e.currentTarget.style.borderColor = '#71717a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#a1a1aa';
            e.currentTarget.style.borderColor = '#3f3f46';
          }}
        >
          <Lightbulb size={15} />
          How we found this
        </button>
      </div>
    </motion.div>
  );
}
