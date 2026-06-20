'use client';

import type { PatternIntelligence } from '@/types';
import { Network } from 'lucide-react';

interface Props {
  intelligence: PatternIntelligence;
}

export function PatternIntelligenceCard({ intelligence }: Props) {
  const progress = Math.min(1, intelligence.masteryCount / intelligence.masteryTarget);
  const progressPct = Math.round(progress * 100);

  let masteryLabel = 'Beginner';
  let masteryColor = '#71717a';
  if (intelligence.masteryCount >= intelligence.masteryTarget) { masteryLabel = 'Expert'; masteryColor = '#f97316'; }
  else if (progress >= 0.6) { masteryLabel = 'Proficient'; masteryColor = '#a855f7'; }
  else if (progress >= 0.3) { masteryLabel = 'Developing'; masteryColor = '#3b82f6'; }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Pattern header */}
      <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Network size={12} style={{ color: '#71717a' }} />
              <div style={{ fontSize: 10, color: '#71717a', fontWeight: 600, letterSpacing: '0.06em' }}>PATTERN</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#a855f7' }}>{intelligence.pattern}</div>
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            color: masteryColor, background: `${masteryColor}22`, border: `1px solid ${masteryColor}44`,
          }}>
            {masteryLabel}
          </div>
        </div>

        {/* Mastery progress bar */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#71717a' }}>Mastery Progress</span>
            <span style={{ fontSize: 11, color: masteryColor }}>
              {intelligence.masteryCount}/{intelligence.masteryTarget} solved
            </span>
          </div>
          <div style={{ height: 6, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`, height: '100%',
              background: `linear-gradient(90deg, ${masteryColor}88, ${masteryColor})`,
              borderRadius: 4, transition: 'width 0.8s ease-out',
            }} />
          </div>
        </div>
      </div>

      {/* Related patterns */}
      <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: '#71717a', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>
          RELATED PATTERNS
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {intelligence.relatedPatterns.map((rp, i) => (
            <span key={i} style={{
              fontSize: 11, color: '#a1a1aa', background: '#1a1a1a',
              border: '1px solid #2a2a2a', borderRadius: 5, padding: '3px 9px',
            }}>
              {rp}
            </span>
          ))}
        </div>
      </div>

      {/* Next recommendation */}
      <div style={{
        background: '#1a1020', border: '1px solid #6b21a8', borderRadius: 10, padding: '12px 14px',
      }}>
        <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
          NEXT CHALLENGE
        </div>
        <p style={{ fontSize: 12, color: '#d8b4fe', lineHeight: 1.5, margin: 0 }}>
          {intelligence.nextRecommendation}
        </p>
      </div>
    </div>
  );
}
