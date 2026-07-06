'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api/client';
import { SuccessInsightCard } from './SuccessInsightCard';
import { AdversarialTestLabCard } from './AdversarialTestLabCard';
import { OptimizationReviewCard } from './OptimizationReviewCard';
import { PatternIntelligenceCard } from './PatternIntelligenceCard';
import { ConstraintIntelligenceCard } from './ConstraintIntelligenceCard';
import { CodeQualityCard } from './CodeQualityCard';
import type { SuccessInsight } from '@/types';
import { Trophy, BrainCircuit, ShieldCheck, Zap, Network, Scale, Code2 } from 'lucide-react';

type Section = 'overview' | 'edge-cases' | 'optimization' | 'pattern' | 'risk' | 'quality';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'overview',     label: 'Why It Worked' },
  { id: 'edge-cases',  label: 'Adversarial Test Lab' },
  { id: 'optimization',label: 'Optimization' },
  { id: 'pattern',     label: 'Pattern Mastery' },
  { id: 'risk',        label: 'Constraint Intelligence' },
  { id: 'quality',     label: 'Code Quality' },
];

const SECTION_ICONS: Record<Section, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  overview: BrainCircuit,
  'edge-cases': ShieldCheck,
  optimization: Zap,
  pattern: Network,
  risk: Scale,
  quality: Code2,
};

const LEVEL_GRADIENT: Record<number, string> = {
  1: 'linear-gradient(135deg, #052e16, #0f2a0f)',
  2: 'linear-gradient(135deg, #042044, #061830)',
  3: 'linear-gradient(135deg, #3b0764, #1a0330)',
  4: 'linear-gradient(135deg, #431407, #1a0803)',
};
const LEVEL_ACCENT: Record<number, string> = {
  1: '#22c55e', 2: '#3b82f6', 3: '#a855f7', 4: '#f97316',
};

interface Props {
  submissionId: string; // eventId
  problemTitle: string;
}

export function SuccessInsightPanel({ submissionId, problemTitle }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [insight, setInsight] = useState<SuccessInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const tabRefs = useRef<Record<Section, HTMLButtonElement | null>>({} as any);

  useEffect(() => {
    const activeBtn = tabRefs.current[activeSection];
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeSection]);

  useEffect(() => {
    if (!submissionId) return;
    setLoading(true);
    setError(null);
    apiFetch<{ success: boolean; data: SuccessInsight }>(
      `/api/behavior-insights/success/${encodeURIComponent(submissionId)}`
    )
      .then(res => {
        if (res.data) setInsight(res.data);
        else throw new Error('No data returned');
      })
      .catch(e => setError(e?.message || 'Failed to load success insight'))
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) {
    return (
      <div style={{
        background: '#161616', border: '1px solid #1f1f1f', borderRadius: 14,
        padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 32, height: 32, border: '3px solid #2a2a2a',
          borderTopColor: '#10b981', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ color: '#52525b', fontSize: 13 }}>Generating success intelligence for <strong style={{ color: '#a1a1aa' }}>{problemTitle}</strong>…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !insight) {
    return (
      <div style={{
        background: '#161616', border: '1px solid #1f1f1f', borderRadius: 14,
        padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <Trophy size={32} style={{ color: '#3b82f6', marginBottom: 8 }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>
          Accepted
        </div>
        <div style={{ fontSize: 12, color: '#52525b' }}>
          {error || 'Intelligence analysis is being prepared. Refresh in a moment.'}
        </div>
      </div>
    );
  }

  const accent = LEVEL_ACCENT[insight.successLevel];
  const gradient = LEVEL_GRADIENT[insight.successLevel];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header banner */}
      <div style={{
        background: gradient, border: `1px solid ${accent}33`,
        borderRadius: '14px 14px 0 0', padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <Trophy size={24} style={{ color: '#3b82f6', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.08em', marginBottom: 2 }}>
            SUCCESS INTELLIGENCE
          </div>
          {/* Allow natural wrapping on all viewports — no clipping or nowrap */}
          <div style={{
            fontSize: 15,
            fontWeight: 800,
            color: '#f4f4f5',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}>
            {insight.successLevelLabel} · {insight.patternDetected}
          </div>
          <div style={{ fontSize: 10, color: '#71717a', marginTop: 2 }}>
            {insight.timeComplexity} · {insight.spaceComplexity} · {insight.strength}
          </div>
        </div>
        <div className="compact" style={{
          padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800,
          background: `${accent}22`, color: accent, border: `1px solid ${accent}44`,
          flexShrink: 0,
        }}>
          L{insight.successLevel}
        </div>
      </div>

      {/* Section nav — sticky on md+ only; static/relative on mobile to avoid
           collision with the accordion section sticky mini-header */}
      <div
        className="success-nav-container scrollbar-none"
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          gap: 0,
          background: '#111',
          border: '1px solid #1f1f1f',
          borderTop: 'none',
          scrollbarWidth: 'none' as any,
          WebkitOverflowScrolling: 'touch' as any,
          scrollSnapType: 'x mandatory',
          /* mobile: static so it scrolls with content and never overlaps sticky headers */
          position: isMobile ? 'relative' : 'sticky',
          top: isMobile ? 'auto' : 0,
          zIndex: isMobile ? 1 : 10,
          padding: '0 4px',
        }}
      >
        <style>{`
          .success-nav-container::-webkit-scrollbar { display: none; }
          .success-nav-tab-indicator {
            animation: tab-indicator-slide 0.2s ease-out both;
          }
        `}</style>
        {SECTIONS.map(sec => {
          const Icon = SECTION_ICONS[sec.id];
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              ref={el => { tabRefs.current[sec.id] = el; }}
              onClick={() => setActiveSection(sec.id)}
              className="compact"
              style={{
                flex: '0 0 auto',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                color: isActive ? accent : '#52525b',
                borderBottom: isActive ? `2px solid ${accent}` : '2px solid transparent',
                transition: 'color 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                scrollSnapAlign: 'start',
                minWidth: 'max-content',
              }}
            >
              <Icon size={13} style={{ color: isActive ? accent : '#52525b', flexShrink: 0 }} />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div style={{
        background: '#161616', border: '1px solid #1f1f1f', borderTop: 'none',
        borderRadius: '0 0 14px 14px', padding: '16px',
        width: '100%', maxWidth: '100%', overflow: 'hidden',
        boxSizing: 'border-box',
      }}>
        {activeSection === 'overview' && <SuccessInsightCard insight={insight} />}
        {activeSection === 'edge-cases' && <AdversarialTestLabCard data={insight.adversarialTestLab} />}
        {activeSection === 'optimization' && <OptimizationReviewCard items={insight.optimizationReview} />}
        {activeSection === 'pattern' && <PatternIntelligenceCard intelligence={insight.patternIntelligence} />}
        {activeSection === 'risk' && (
          <ConstraintIntelligenceCard
            data={insight.constraintIntelligence}
            detectedComplexity={insight.timeComplexity}
            problemTitle={problemTitle}
          />
        )}
        {activeSection === 'quality' && <CodeQualityCard quality={insight.codeQuality} />}
      </div>
    </div>
  );
}
