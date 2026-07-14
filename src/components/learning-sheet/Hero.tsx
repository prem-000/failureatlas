import React from 'react';
import { RefreshCw, Star } from 'lucide-react';
import { DIFFICULTY_META, type Difficulty } from '@/types/learning-sheet';

interface HeroProps {
  title: string;
  difficulty: Difficulty;
  category: string;
  createdAt?: string;
  cached?: boolean;
  bookmarked?: boolean;
  onRegenerate?: () => void;
  onToggleBookmark?: () => void;
}

export function Hero({ title, difficulty, category, createdAt, cached, bookmarked, onRegenerate, onToggleBookmark }: HeroProps) {
  const meta = DIFFICULTY_META[difficulty] || DIFFICULTY_META.interview;
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      style={{
        position: 'relative',
        padding: '32px 24px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Background Decorative Blur */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: meta.color,
          opacity: 0.08,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#a1a1aa',
            background: 'rgba(255,255,255,0.04)',
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {category}
        </span>

        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: meta.color,
            backgroundColor: meta.bg,
            border: `1px solid ${meta.border}`,
            padding: '4px 10px',
            borderRadius: 6,
          }}
        >
          {meta.label}
        </span>

        {cached && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.25)',
              padding: '4px 10px',
              borderRadius: 6,
            }}
          >
            ⚡ Cached
          </span>
        )}
      </div>

      <div>
        <h1
          style={{
            fontSize: 'clamp(24px, 5vw, 36px)',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            margin: 0,
            background: 'linear-gradient(to right, #ffffff, #d4d4d8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {title}
        </h1>
        {formattedDate && (
          <p style={{ fontSize: '12px', color: '#71717a', margin: '6px 0 0 0' }}>
            Generated on {formattedDate}
          </p>
        )}
      </div>

      {(onRegenerate || onToggleBookmark) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#71717a',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#e4e4e7';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#71717a';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              <RefreshCw size={11} />
              Regenerate
            </button>
          )}

          {onToggleBookmark && (
            <button
              onClick={onToggleBookmark}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: bookmarked ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,255,255,0.08)',
                background: bookmarked ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                color: bookmarked ? '#f59e0b' : '#71717a',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                if (!bookmarked) {
                  (e.currentTarget as HTMLButtonElement).style.color = '#e4e4e7';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
                }
              }}
              onMouseLeave={e => {
                if (!bookmarked) {
                  (e.currentTarget as HTMLButtonElement).style.color = '#71717a';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                }
              }}
            >
              <Star size={11} fill={bookmarked ? '#f59e0b' : 'none'} />
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
