'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ChevronDown, ChevronUp, BookOpen, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { LearningRecommendation } from './inferenceEngine';

interface LearningRecommendationSectionProps {
  recommendation: LearningRecommendation;
  isExpandedInitial?: boolean;
}

export function LearningRecommendationSection({
  recommendation,
  isExpandedInitial = true,
}: LearningRecommendationSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(!isExpandedInitial);

  const problems = recommendation.suggestedProblems || [];

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
              background: '#22c55e20',
              border: '1px solid #22c55e40',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22c55e',
            }}
          >
            <GraduationCap size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>
              Learning Recommendation
            </h3>
            <span style={{ fontSize: 11, color: '#71717a' }}>
              Targeted practice plan to permanently eliminate this weakness
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#86efac',
              background: '#052e16',
              border: '1px solid #166534',
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            +{recommendation.estimatedImprovement || 18}% Estimated Improvement
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
            {/* Top 3 Summary Pillars */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  background: '#052e1620',
                  border: '1px solid #16653450',
                  borderRadius: 10,
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ background: '#052e16', border: '1px solid #166534', padding: 8, borderRadius: 8, color: '#22c55e' }}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#86efac', fontWeight: 600 }}>ACTION PLAN</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
                    Practice {recommendation.practiceProblemCount || 5} problems
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#1e1b4b20',
                  border: '1px solid #3730a350',
                  borderRadius: 10,
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ background: '#312e81', border: '1px solid #3730a3', padding: 8, borderRadius: 8, color: '#a5b4fc' }}>
                  <GraduationCap size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600 }}>REVIEW CONCEPT</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
                    {recommendation.topicToReview || 'Review Boundary Conditions'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#064e3b20',
                  border: '1px solid #065f4650',
                  borderRadius: 10,
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ background: '#064e3b', border: '1px solid #065f46', padding: 8, borderRadius: 8, color: '#6ee7b7' }}>
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>EXPECTED GAIN</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
                    +{recommendation.estimatedImprovement || 18}% Accuracy Rate
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested Practice Problems */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Curated Practice Queue
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {problems.map((p, idx) => {
                const diffColor = p.difficulty === 'Easy' ? '#22c55e' : p.difficulty === 'Medium' ? '#f59e0b' : '#ef4444';

                return (
                  <div
                    key={idx}
                    style={{
                      background: '#141414',
                      border: '1px solid #262626',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#52525b', width: 18 }}>#{idx + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>{p.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: diffColor, background: `${diffColor}20` }}>
                        {p.difficulty}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: '#71717a' }}>{p.topic}</span>
                      <Link
                        href={`/problems`}
                        style={{
                          fontSize: 12,
                          color: '#22c55e',
                          textDecoration: 'none',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>Solve</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
