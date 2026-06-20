'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api/client';
import { BehaviorEvidenceCard } from './BehaviorEvidenceCard';
import { BehaviorTimeline } from './BehaviorTimeline';
import { LearningPrescriptionCard } from './LearningPrescriptionCard';
import type { BehaviorInsight } from '@/types';

type Tab = 'evidence' | 'timeline' | 'prescription';

interface Props {
  weaknessId: string;
  weaknessName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BehaviorInsightPanel({ weaknessId, weaknessName, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('evidence');
  const [insight, setInsight] = useState<BehaviorInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsight = useCallback(async () => {
    if (!weaknessId || !isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ success: boolean; data: BehaviorInsight }>(
        `/api/behavior-insights/${encodeURIComponent(weaknessId)}`
      );
      if (res.data) setInsight(res.data);
      else throw new Error('No data returned');
    } catch (e: any) {
      setError(e?.message || 'Failed to load behavior insight');
    } finally {
      setLoading(false);
    }
  }, [weaknessId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('evidence');
      fetchInsight();
    }
  }, [isOpen, fetchInsight]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'evidence', label: 'Evidence', emoji: '🔍' },
    { id: 'timeline', label: 'Timeline', emoji: '📅' },
    { id: 'prescription', label: 'Prescription', emoji: '💊' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#161616', borderLeft: '1px solid #1f1f1f',
        zIndex: 50, display: 'flex', flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.30s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: isOpen ? '-8px 0 40px rgba(0,0,0,0.6)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid #1f1f1f',
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: '#111',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 3, height: 16, background: '#ff5f52', borderRadius: 2 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ff5f52', letterSpacing: '0.08em' }}>
                BEHAVIOR INTELLIGENCE
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
              {weaknessName}
            </div>
            <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>
              Why this pattern appears · What drives it · How to fix it
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, background: '#1f1f1f',
              border: '1px solid #2a2a2a', color: '#71717a', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = '#2a2a2a'; (e.target as HTMLElement).style.color = '#e4e4e7'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = '#1f1f1f'; (e.target as HTMLElement).style.color = '#71717a'; }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1f1f1f', background: '#111' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                color: activeTab === tab.id ? '#ff5f52' : '#52525b',
                borderBottom: activeTab === tab.id ? '2px solid #ff5f52' : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', paddingTop: 48 }}>
              <div style={{
                width: 28, height: 28, border: '3px solid #2a2a2a',
                borderTopColor: '#ff5f52', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ color: '#52525b', fontSize: 13 }}>Analyzing behavior patterns…</span>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {error && !loading && (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 13, color: '#ef4444' }}>{error}</div>
            </div>
          )}

          {!loading && !error && insight && (
            <>
              {activeTab === 'evidence' && <BehaviorEvidenceCard insight={insight} />}
              {activeTab === 'timeline' && <BehaviorTimeline insight={insight} />}
              {activeTab === 'prescription' && <LearningPrescriptionCard insight={insight} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
