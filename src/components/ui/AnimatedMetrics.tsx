'use client';
/**
 * src/components/ui/AnimatedMetrics.tsx
 *
 * Stats counters with progress indicator rings.
 * Animates into view when scrolled to using react-intersection-observer.
 */

import React, { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { motion } from 'framer-motion';

interface MetricItem {
  target: number;
  suffix: string;
  label: string;
  desc: string;
  color: string;
}

export default function AnimatedMetrics() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const metrics: MetricItem[] = [
    {
      target: 95,
      suffix: '%',
      label: 'Diagnosis Accuracy',
      desc: 'Statistical precision in mapping code anomalies to core weaknesses.',
      color: '#ff5f52', // primary
    },
    {
      target: 91,
      suffix: '%',
      label: 'Evidence Confidence',
      desc: 'PageRank and Bayesian networks weight mapping certainty.',
      color: '#a855f7', // purple
    },
    {
      target: 4,
      suffix: '',
      label: 'Telemetry Channels',
      desc: 'Myers diff, AST logs, execution status, and timing variables.',
      color: '#3b82f6', // blue
    },
    {
      target: 1,
      suffix: ' Unified',
      label: 'Mastery Learning Plan',
      desc: 'A single, structured path to practice exactly what you struggle with.',
      color: '#22c55e', // green
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-text text-left">
      {metrics.map((metric, index) => (
        <div key={metric.label} className="p-6 rounded-2xl bg-surface border border-white/5 flex flex-col justify-between">
          <div>
            {/* Metric Number */}
            <div className="flex items-baseline gap-1 mb-2">
              <Counter target={metric.target} inView={inView} suffix={metric.suffix} color={metric.color} />
            </div>
            
            {/* Label */}
            <h3 className="text-sm font-bold text-white mb-2">{metric.label}</h3>
          </div>
          
          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed mt-4 pt-4 border-t border-white/5">
            {metric.desc}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Simple Count-up Counter Component ─────────────────────────────────────────
function Counter({ target, inView, suffix, color }: { target: number; inView: boolean; suffix: string; color: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000; // ms
    const increment = target / (duration / 16); // ~60fps
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, inView]);

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5 }}
      className="text-4xl md:text-5xl font-extrabold tracking-tight"
      style={{ color }}
    >
      {count}
      <span className="text-xl md:text-2xl font-bold opacity-80">{suffix}</span>
    </motion.span>
  );
}
