import React from 'react';
import { Hero } from './Hero';
import { ComplexityTable } from './ComplexityTable';
import { MistakesCard } from './MistakesCard';
import { PracticeProblems } from './PracticeProblems';
import { MermaidDiagram } from './MermaidDiagram';
import { Lightbulb, Eye, BookOpen } from 'lucide-react';
import type { LearningSheetData, Difficulty } from '@/types/learning-sheet';

interface LearningSheetProps {
  topic: string;
  category: string;
  difficulty: Difficulty;
  data: LearningSheetData;
  createdAt?: string;
  cached?: boolean;
  bookmarked?: boolean;
  onRegenerate?: () => void;
  onToggleBookmark?: () => void;
}

export function LearningSheet({ topic, category, difficulty, data, createdAt, cached, bookmarked, onRegenerate, onToggleBookmark }: LearningSheetProps) {
  if (!data) return null;

  const hasPersonalizedRecs = data.personalizedRecommendations && data.personalizedRecommendations.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        padding: '0 4px',
      }}
    >
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

      {/* 2. Core Idea */}
      {data.coreIdea && (
        <div
          style={{
            background: 'rgba(255,95,82,0.04)',
            border: '1px solid rgba(255,95,82,0.15)',
            borderRadius: 14,
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: 'rgba(255,95,82,0.1)',
                color: '#ff5f52',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen size={14} />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#ff5f52',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Core Idea
            </span>
          </div>
          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.65,
              color: '#e4e4e7',
              margin: 0,
            }}
          >
            {data.coreIdea}
          </p>
        </div>
      )}

      {/* Mermaid flowchart */}
      {data.mermaidDiagram && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff5f52', display: 'inline-block' }} />
            Visual Workflow
          </h3>
          <MermaidDiagram code={data.mermaidDiagram} />
        </div>
      )}

      {/* 3. Recognition Clues */}
      {data.recognitionClues && data.recognitionClues.length > 0 && (
        <div
          style={{
            background: 'rgba(59,130,246,0.04)',
            border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: 14,
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: 'rgba(59,130,246,0.1)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Eye size={14} />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#60a5fa',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Recognition Clues
            </span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.recognitionClues.map((clue, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  fontSize: '13px',
                  lineHeight: 1.55,
                  color: '#d4d4d8',
                }}
              >
                <span style={{ color: '#60a5fa', fontWeight: 800, marginTop: 1, flexShrink: 0 }}>→</span>
                <span>{clue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Complexity + Mistakes side by side on larger screens */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}
        className="ls-two-col"
      >
        <style>{`
          @media (min-width: 768px) {
            .ls-two-col {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
        `}</style>
        <ComplexityTable complexity={data.complexity} />
        <MistakesCard mistakes={data.mistakes} personalizedMistakes={data.personalizedMistakes} />
      </div>

      {/* 5. Personalized recommendations */}
      {hasPersonalizedRecs && (
        <div
          style={{
            background: 'rgba(168,85,247,0.03)',
            border: '1px solid rgba(168,85,247,0.15)',
            borderRadius: 14,
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: 'rgba(168,85,247,0.1)',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lightbulb size={14} />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#d8b4fe',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              ✨ Personalized Advice
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.personalizedRecommendations?.map((rec, index) => (
              <div
                key={index}
                style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: '#e2d8f0',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: '#c084fc', fontWeight: 800, marginTop: 1 }}>•</span>
                <p style={{ margin: 0, flex: 1 }}>{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Practice Problems */}
      {data.practiceProblems && data.practiceProblems.length > 0 && (
        <PracticeProblems problems={data.practiceProblems} />
      )}
    </div>
  );
}
