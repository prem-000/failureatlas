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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header banner */}
      <div style={{
        background: gradient, border: `1px solid ${accent}33`,
        borderRadius: '14px 14px 0 0', padding: '18px 22px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <Trophy size={28} style={{ color: '#3b82f6', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '0.08em', marginBottom: 2 }}>
            SUCCESS INTELLIGENCE
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f4f4f5' }}>
            {insight.successLevelLabel} · {insight.patternDetected}
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
            {insight.timeComplexity} time · {insight.spaceComplexity} space · {insight.strength}
          </div>
        </div>
        <div style={{
          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800,
          background: `${accent}22`, color: accent, border: `1px solid ${accent}44`,
        }}>
          L{insight.successLevel}
        </div>
      </div>

      {/* Section nav */}
      <div className="success-nav-container" style={{
        display: 'flex', overflowX: 'auto', gap: 8,
        background: '#111', border: '1px solid #1f1f1f', borderTop: 'none',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x proximity',
      }}>
        <style>{`
          /* hide scrollbar on Webkit */
          .success-nav-container::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {SECTIONS.map(sec => {
          const Icon = SECTION_ICONS[sec.id];
          return (
            <button
              key={sec.id}
              ref={el => { tabRefs.current[sec.id] = el; }}
              onClick={() => setActiveSection(sec.id)}
              style={{
                flex: '0 0 auto', padding: '9px 14px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                color: activeSection === sec.id ? accent : '#52525b',
                borderBottom: activeSection === sec.id ? `2px solid ${accent}` : '2px solid transparent',
                transition: 'color 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 'max-content',
                flexShrink: 0,
              }}
            >
              <Icon size={14} style={{ color: activeSection === sec.id ? accent : '#52525b' }} />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div style={{
        background: '#161616', border: '1px solid #1f1f1f', borderTop: 'none',
        borderRadius: '0 0 14px 14px', padding: '18px 20px',
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
