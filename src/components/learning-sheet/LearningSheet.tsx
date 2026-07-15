'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Hero } from './Hero';
import { PracticeProblems } from './PracticeProblems';
import { renderVisualizationPlayer } from './VisualizationRegistry';
import {
  Lightbulb,
  Eye,
  BookOpen,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Award,
  AlertTriangle,
  Code,
  Layers,
  Cpu,
  Bookmark,
  CheckCircle,
  HelpCircle,
  Clock,
  Compass,
} from 'lucide-react';
import type { LearningSheetData, Difficulty } from '@/types/learning-sheet';

interface LearningSheetProps {
  topic: string;
  category: string;
  difficulty: string; // Dynamic difficulty level name
  data: LearningSheetData;
  createdAt?: string;
  cached?: boolean;
  bookmarked?: boolean;
  onRegenerate?: () => void;
  onToggleBookmark?: () => void;
}

export function LearningSheet({
  topic,
  category,
  difficulty,
  data,
  createdAt,
  cached,
  bookmarked,
  onRegenerate,
  onToggleBookmark,
}: LearningSheetProps) {
  // ─── States ───
  const [learnedStatus, setLearnedStatus] = useState<'none' | 'learned' | 'review'>('none');
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<0.5 | 1 | 2>(1);
  
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (!data) return null;

  const isSchemaV2 = data.schemaVersion === 2;

  // Local storage learning progress synchronization
  useEffect(() => {
    const key = `ls-progress-${topic}-${difficulty}`;
    const saved = localStorage.getItem(key);
    if (saved === 'learned' || saved === 'review') {
      setLearnedStatus(saved as any);
    } else {
      setLearnedStatus('none');
    }
    
    // Reset visual player states
    setActiveStep(0);
    setIsPlaying(false);
  }, [topic, difficulty, data]);

  // Visual Player Autoplay Timer
  const visData = data.visualization || { type: 'flowchart', steps: [] };
  const steps = visData.steps || [];

  useEffect(() => {
    if (isPlaying && steps.length > 0) {
      const delay = 1500 / playSpeed;
      playTimerRef.current = setTimeout(() => {
        setActiveStep((prev) => {
          if (prev + 1 >= steps.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    } else {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
      }
    }
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, activeStep, playSpeed, steps.length]);

  const handleSetStatus = (status: 'learned' | 'review' | 'none') => {
    setLearnedStatus(status);
    const key = `ls-progress-${topic}-${difficulty}`;
    if (status === 'none') {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, status);
    }
    console.log(`[Analytics]: user_marked_status`, { topic, difficulty, status });
  };

  const handleNext = () => {
    setIsPlaying(false);
    if (activeStep + 1 < steps.length) {
      setActiveStep(activeStep + 1);
      console.log(`[Analytics]: user_clicked_next_step`, { topic, difficulty, activeStep: activeStep + 1 });
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      console.log(`[Analytics]: user_clicked_prev_step`, { topic, difficulty, activeStep: activeStep - 1 });
    }
  };

  const handleJumpToStart = () => {
    setIsPlaying(false);
    setActiveStep(0);
    console.log(`[Analytics]: user_jumped_to_start`, { topic, difficulty });
  };

  const handleJumpToEnd = () => {
    setIsPlaying(false);
    setActiveStep(steps.length - 1);
    console.log(`[Analytics]: user_jumped_to_end`, { topic, difficulty });
  };

  const toggleAutoplay = () => {
    setIsPlaying(!isPlaying);
    console.log(`[Analytics]: user_toggled_autoplay`, { topic, difficulty, isPlaying: !isPlaying });
  };

  const changeSpeed = (speed: 0.5 | 1 | 2) => {
    setPlaySpeed(speed);
    console.log(`[Analytics]: user_changed_playback_speed`, { topic, difficulty, speed });
  };

  const activeStepDetails = steps[activeStep] || {};

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        padding: '0 4px',
      }}
    >
      {/* 1. Hero Block */}
      <Hero
        title={data.title || topic}
        difficulty={difficulty}
        category={category}
        createdAt={createdAt}
        cached={cached}
        bookmarked={bookmarked}
        onRegenerate={onRegenerate}
        onToggleBookmark={onToggleBookmark}
      />

      {/* 2. Visual Memory Hook Analogy Card */}
      {isSchemaV2 && data.analogy && data.analogy.analogyName && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(236,72,153,0.06))',
            border: '1px solid rgba(168,85,247,0.18)',
            borderRadius: 14,
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(168,85,247,0.12)',
              color: '#c084fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Compass size={18} />
          </div>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#d8b4fe',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Visual Memory Analogy — {data.analogy.analogyName}
            </span>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#e4e4e7', margin: 0 }}>
              {data.analogy.analogyDescription}
            </p>
          </div>
        </div>
      )}

      {/* Legacy Core Idea (Fallback) */}
      {!isSchemaV2 && data.coreIdea && (
        <div style={{ background: 'rgba(255,95,82,0.04)', border: '1px solid rgba(255,95,82,0.15)', borderRadius: 14, padding: '18px 22px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#ff5f52', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Core Idea
          </span>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#e4e4e7', margin: 0 }}>{data.coreIdea}</p>
        </div>
      )}

      {/* 3. Pattern Recognition Card ("Should I use this algorithm?") */}
      {isSchemaV2 && data.recognition && (
        <div
          style={{
            background: 'rgba(59,130,246,0.03)',
            border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(59,130,246,0.1)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Eye size={15} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Should I use this algorithm?
            </span>
          </div>

          {/* Decision Path Tree Card */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {data.recognition.decisionPath.map((stepNode, i) => (
              <React.Fragment key={i}>
                <div
                  style={{
                    padding: '8px 14px',
                    background: i === data.recognition.decisionPath.length - 1 ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1.2px solid ${i === data.recognition.decisionPath.length - 1 ? '#22c55e' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 8,
                    fontSize: '12px',
                    fontWeight: 700,
                    color: i === data.recognition.decisionPath.length - 1 ? '#4ade80' : '#e4e4e7',
                  }}
                >
                  {stepNode}
                </div>
                {i < data.recognition.decisionPath.length - 1 && (
                  <span style={{ color: '#71717a', fontSize: '14px', fontWeight: 800 }}>➔</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <p style={{ fontSize: '13px', lineHeight: 1.55, color: '#a1a1aa', margin: 0 }}>
            {data.recognition.explanation}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase' }}>Keywords:</span>
            {data.recognition.keywords.map((kw, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.04)',
                  color: '#d4d4d8',
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.03)',
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legacy Recognition Clues (Fallback) */}
      {!isSchemaV2 && data.recognitionClues && data.recognitionClues.length > 0 && (
        <div style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 14, padding: '18px 22px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Recognition Clues
          </span>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.recognitionClues.map((clue, idx) => (
              <li key={idx} style={{ display: 'flex', gap: 8, fontSize: '13px', color: '#d4d4d8' }}>
                <span style={{ color: '#60a5fa' }}>→</span> {clue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Interactive Visualization Player */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff5f52', display: 'inline-block' }} />
          Interactive Visualization
        </h3>
        
        <div
          style={{
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: 14,
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Visual Container */}
          <div style={{ width: '100%', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderVisualizationPlayer({
              type: visData.type,
              visualization: visData,
              activeStep,
              mermaidDiagram: data.mermaidDiagram,
            })}
          </div>

          {/* Autoplay / Speed & Jump Controls */}
          {steps.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 16 }}>
              {/* Playback step buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={handleJumpToStart} style={{ padding: 6, background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }} title="Jump to Start">
                  <SkipBack size={16} />
                </button>
                <button onClick={handlePrev} style={{ padding: 6, background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }} title="Prev step">
                  <SkipBack size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button
                  onClick={toggleAutoplay}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isPlaying ? 'rgba(255,95,82,0.15)' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: isPlaying ? '#ff5f52' : '#f4f4f5',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
                </button>
                <button onClick={handleNext} style={{ padding: 6, background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }} title="Next step">
                  <SkipForward size={14} />
                </button>
                <button onClick={handleJumpToEnd} style={{ padding: 6, background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }} title="Jump to End">
                  <SkipForward size={16} />
                </button>
              </div>

              {/* Step indicator */}
              <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 600 }}>
                Step {activeStep + 1} of {steps.length}
              </span>

              {/* Speed Controls */}
              <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.15)', padding: 2, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                {([0.5, 1, 2] as const).map((sp) => {
                  const isSel = playSpeed === sp;
                  return (
                    <button
                      key={sp}
                      onClick={() => changeSpeed(sp)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        fontWeight: 800,
                        border: 'none',
                        borderRadius: 6,
                        background: isSel ? '#ff5f52' : 'transparent',
                        color: isSel ? '#ffffff' : '#71717a',
                        cursor: 'pointer',
                      }}
                    >
                      {sp}x
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explain This Step Callout */}
          {steps.length > 0 && activeStepDetails.explanation && (
            <div style={{ padding: '12px 16px', background: 'rgba(255,95,82,0.03)', borderLeft: '3px solid #ff5f52', borderRadius: '0 8px 8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <HelpCircle size={13} style={{ color: '#ff5f52' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#ff8a80', textTransform: 'uppercase' }}>Explain This Step</span>
              </div>
              <p style={{ fontSize: '12.5px', lineHeight: 1.5, color: '#e4e4e7', margin: 0 }}>
                <strong>{activeStepDetails.action}:</strong> {activeStepDetails.explanation}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Historical State Timeline Table */}
      {isSchemaV2 && data.timeline && data.timeline.headers && data.timeline.headers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h4 style={{ fontSize: '11px', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            State Timeline Trace
          </h4>
          <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {data.timeline.headers.map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', textAlign: 'left', color: '#a1a1aa', fontWeight: 700 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.timeline.rows.map((rowVal, rIdx) => {
                  const isCur = rIdx === activeStep;
                  return (
                    <tr
                      key={rIdx}
                      style={{
                        background: isCur ? 'rgba(255,95,82,0.06)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        color: isCur ? '#ff8a80' : '#d4d4d8',
                        fontWeight: isCur ? 700 : 500,
                        transition: 'all 200ms ease',
                      }}
                    >
                      {rowVal.map((colVal, cIdx) => (
                        <td key={cIdx} style={{ padding: '10px 14px' }}>
                          {colVal}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Complexity Breakdown callout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 16,
        }}
        className="ls-complexity"
      >
        <style>{`
          @media (min-width: 768px) {
            .ls-complexity {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
        `}</style>
        
        {/* Time Complexity */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 14 }}>
          <Clock size={20} style={{ color: '#ff5f52', flexShrink: 0, marginTop: 2 }} />
          <div>
            <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Time Complexity</span>
            <span style={{ fontSize: '18px', color: '#ff5f52', fontWeight: 800, display: 'block', marginBottom: 4 }}>
              {isSchemaV2 ? data.complexity.time : data.complexity.time.split(' ')[0]}
            </span>
            <span style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: 1.5 }}>
              {isSchemaV2 ? data.complexity.timeExplanation : data.complexity.time.split(' ').slice(1).join(' ')}
            </span>
          </div>
        </div>

        {/* Space Complexity */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 14 }}>
          <Layers size={20} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }} />
          <div>
            <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Space Complexity</span>
            <span style={{ fontSize: '18px', color: '#3b82f6', fontWeight: 800, display: 'block', marginBottom: 4 }}>
              {isSchemaV2 ? data.complexity.space : data.complexity.space.split(' ')[0]}
            </span>
            <span style={{ fontSize: '12px', color: '#a1a1aa', lineHeight: 1.5 }}>
              {isSchemaV2 ? data.complexity.spaceExplanation : data.complexity.space.split(' ').slice(1).join(' ')}
            </span>
          </div>
        </div>
      </div>

      {/* 7. Common Pitfalls / Mistakes Card */}
      {(data.pitfalls || data.mistakes) && (
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(251,191,36,0.1)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={15} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#e4e4e7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Common Pitfalls
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data.pitfalls || data.mistakes || []).map((trap, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.03)',
                  borderRadius: 10,
                }}
              >
                <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '13px', lineHeight: 1.2, marginTop: 1 }}>
                  {idx + 1}.
                </span>
                <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#d4d4d8', margin: 0 }}>{trap}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Practice Roadmap */}
      {(data.practiceRoadmap || data.practiceProblems) && (
        <PracticeProblems problems={data.practiceRoadmap || data.practiceProblems || []} />
      )}

      {/* ─── DIFFICULTY EXTRAS (PROGRESSIVE WIDGETS) ─── */}

      {/* A. Fundamentals Extras */}
      {data.fundamentals && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
          <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Fundamentals Core
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.fundamentals.concept && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Concept Explanation</span>
                <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#e4e4e7', margin: 0 }}>{data.fundamentals.concept}</p>
              </div>
            )}
            {data.fundamentals.whyItWorks && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Why It Works Intuition</span>
                <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#e4e4e7', margin: 0 }}>{data.fundamentals.whyItWorks}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* B. Interview Extras */}
      {data.interview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
          <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Interview Strategy
          </h3>
          
          {data.interview.strategy && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Interview Approach</span>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#e4e4e7', margin: 0 }}>{data.interview.strategy}</p>
            </div>
          )}

          {data.interview.template && (
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Code size={13} style={{ color: '#ff5f52' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' }}>Generic Logic Template</span>
              </div>
              <pre style={{ margin: 0, padding: 16, overflowX: 'auto', fontSize: '12.5px', color: '#e4e4e7', fontFamily: 'monospace', lineHeight: 1.6 }}>
                {data.interview.template}
              </pre>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="ls-interview-grid">
            <style>{`
              @media (min-width: 768px) {
                .ls-interview-grid {
                  grid-template-columns: 1fr 1fr !important;
                }
              }
            `}</style>
            
            {/* Variants */}
            {data.interview.variants && data.interview.variants.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Common Variants</span>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.interview.variants.map((v, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, fontSize: '12.5px', color: '#d4d4d8' }}>
                      <span style={{ color: '#ff5f52' }}>•</span> {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Similar Patterns */}
            {data.interview.similarPatterns && data.interview.similarPatterns.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Similar Patterns</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.interview.similarPatterns.map((p, i) => (
                    <div key={i} style={{ fontSize: '12.5px' }}>
                      <strong style={{ color: '#ff8a80', display: 'block', marginBottom: 2 }}>{p.name}</strong>
                      <span style={{ color: '#a1a1aa' }}>{p.difference}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* C. Expert Extras */}
      {data.expert && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
          <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Expert Engineering Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="ls-expert-grid">
            <style>{`
              @media (min-width: 768px) {
                .ls-expert-grid {
                  grid-template-columns: 1fr 1fr !important;
                }
              }
            `}</style>
            
            {/* Loop Invariants */}
            {data.expert.invariants && data.expert.invariants.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Loop/State Invariants</span>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.expert.invariants.map((inv, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, fontSize: '12.5px', color: '#d4d4d8', fontFamily: 'monospace' }}>
                      <span style={{ color: '#c084fc' }}>inv:</span> {inv}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Edge Cases */}
            {data.expert.edgeCases && data.expert.edgeCases.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Sneaky Edge Cases</span>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.expert.edgeCases.map((ec, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, fontSize: '12.5px', color: '#d4d4d8' }}>
                      <span style={{ color: '#ef4444' }}>!</span> {ec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Alternatives Comparison Table */}
          {data.expert.alternatives && data.expert.alternatives.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Alternative Solutions</span>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#a1a1aa' }}>Approach</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#a1a1aa' }}>Complexity</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#a1a1aa' }}>Pros / Cons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expert.alternatives.map((alt, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#e4e4e7' }}>{alt.name}</td>
                        <td style={{ padding: '8px 12px', color: '#60a5fa', fontFamily: 'monospace' }}>{alt.complexity}</td>
                        <td style={{ padding: '8px 12px', color: '#a1a1aa' }}>{alt.prosCons}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Interview follow up progression ("What interviewer asks next") */}
          {data.expert.followUps && data.expert.followUps.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#ff8a80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What Interviewers Ask Next</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.expert.followUps.map((fu, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.12)', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                    <strong style={{ color: '#e4e4e7', fontSize: '13px', display: 'block', marginBottom: 6 }}>Q: {fu.question}</strong>
                    <span style={{ color: '#a1a1aa', fontSize: '12.5px', lineHeight: 1.5 }}>A: {fu.answer}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-world Production Applications */}
          {data.expert.productionApplications && data.expert.productionApplications.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.05), rgba(59,130,246,0.05))', padding: '20px 24px', borderRadius: 12, border: '1px solid rgba(34,197,94,0.12)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Cpu size={16} style={{ color: '#4ade80' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Production Engineering Applications</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.expert.productionApplications.map((app, i) => (
                  <div key={i} style={{ fontSize: '13px' }}>
                    <strong style={{ color: '#e4e4e7' }}>{app.system}: </strong>
                    <span style={{ color: '#a1a1aa' }}>{app.useCase}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. Floating Learning Progress Buttons group */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase' }}>Learning Status</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => handleSetStatus(learnedStatus === 'learned' ? 'none' : 'learned')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              background: learnedStatus === 'learned' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
              color: learnedStatus === 'learned' ? '#4ade80' : '#71717a',
              border: `1px solid ${learnedStatus === 'learned' ? '#22c55e' : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 150ms',
            }}
          >
            <CheckCircle size={13} />
            <span>Learned</span>
          </button>
          
          <button
            onClick={() => handleSetStatus(learnedStatus === 'review' ? 'none' : 'review')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              background: learnedStatus === 'review' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.03)',
              color: learnedStatus === 'review' ? '#fbbf24' : '#71717a',
              border: `1px solid ${learnedStatus === 'review' ? '#f59e0b' : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 150ms',
            }}
          >
            <Clock size={13} />
            <span>Needs Review</span>
          </button>
        </div>
      </div>
    </div>
  );
}
