'use client';

import { useState } from 'react';
import { X, AlertTriangle, Zap, BookOpen, TrendingDown, Clock, CheckCircle, Activity } from 'lucide-react';
import type { FailureData, WeaknessData } from '@/hooks/usePhase3Queries';
import type { Node, Edge } from 'reactflow';

interface WeaknessDrawerProps {
  node: Node | null;
  nodes: Node[];
  edges: Edge[];
  failures: FailureData[];
  onClose: () => void;
}

function getTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        {icon}
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export function WeaknessDrawer({ node, nodes, edges, failures, onClose }: WeaknessDrawerProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchTranslation, setTouchTranslation] = useState<number>(0);

  if (!node) return null;

  const nodeType: string = node.data?.nodeType || '';
  const props = (node.data?.properties || {}) as Record<string, any>;
  const label: string = node.data?.label || '';

  // ── Build story from graph ──────────────────────────────────────────────────
  const isWeakness = nodeType === 'Weakness';

  // Root causes → this weakness
  const rootCauseIds = edges.filter(e => e.target === node.id && e.type === 'INDICATES').map(e => e.source);
  const rootCauses = nodes.filter(n => rootCauseIds.includes(n.id));

  // Evidence → root causes
  const evidenceIds = edges.filter(e => rootCauseIds.includes(e.target) && e.type === 'SUGGESTS').map(e => e.source);
  const evidenceList = nodes.filter(n => evidenceIds.includes(n.id));

  // Failures → evidence
  const failureIds = edges.filter(e => evidenceIds.includes(e.target) && e.type === 'HAS_EVIDENCE').map(e => e.source);
  const failureNodes = nodes.filter(n => failureIds.includes(n.id));

  // Problems → failures
  const problemIds = edges.filter(e => failureIds.includes(e.target) && e.type === 'TRIGGERED').map(e => e.source);
  const problemNodes = nodes.filter(n => problemIds.includes(n.id));

  // Strategies ← weakness
  const strategyIds = edges.filter(e => e.source === node.id && e.type === 'ADDRESSED_BY').map(e => e.target);
  const strategies = nodes.filter(n => strategyIds.includes(n.id));

  // Match real failure records to node IDs
  const relatedFailures = failures.filter(f =>
    failureNodes.some(fn => fn.data?.properties?.eventId === f.id || fn.id.includes(f.id))
    || problemNodes.some(pn => pn.data?.properties?.slug === f.problemSlug)
  ).slice(0, 4);

  const pageRank = Number(props.pageRankScore || 0);
  const frequency = Number(props.frequency || 0);
  const confidence = Number(props.confidence || props.confidence || 0);

  const riskColor = pageRank > 0.5 ? '#ef4444' : pageRank > 0.3 ? '#f97316' : pageRank > 0.1 ? '#f59e0b' : '#22c55e';

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return;
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentY = e.targetTouches[0].clientY;
    const diff = currentY - touchStart;
    if (diff > 0) {
      setTouchTranslation(diff);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    if (touchTranslation > 100) {
      onClose();
    }
    setTouchTranslation(0);
  };

  return (
    <>
      <style>{`
        .wdrawer {
          position: fixed; right: 0; top: 56px; bottom: 0; width: 380px;
          background: rgba(10,10,12,0.98); border-left: 1px solid rgba(255,255,255,0.07);
          z-index: 60; display: flex; flex-direction: column;
          transform: translateX(0); transition: transform 300ms cubic-bezier(0.16,1,0.3,1);
          backdrop-filter: blur(20px);
        }
        .wdrawer-chip { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 700; }
        .drawer-close-btn {
          background: none;
          border: none;
          color: #52525b;
          cursor: pointer;
          padding: 4px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .mobile-drag-pill {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.25);
          margin: 8px auto 0 auto;
          display: none;
        }
        @media (max-width: 767px) {
          .wdrawer {
            left: 0 !important;
            right: 0 !important;
            top: auto !important;
            bottom: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 90vh !important;
            max-height: 90vh !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 20px 20px 0 0 !important;
            transform: translateY(0) !important;
          }
          .drawer-close-btn {
            min-width: 44px !important;
            min-height: 44px !important;
          }
          .drawer-scroll-content {
            padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .mobile-drag-pill {
            display: block !important;
          }
        }
      `}</style>
 
      <div
        className="wdrawer custom-scrollbar"
        style={{
          transform: touchTranslation > 0 ? `translateY(${touchTranslation}px)` : undefined,
          transition: touchStart !== null ? 'none' : 'transform 300ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Mobile Drag Header */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: 'grab', flexShrink: 0 }}
        >
          <div className="mobile-drag-pill" />
        </div>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                {nodeType}
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#f4f4f5', margin: 0, lineHeight: 1.2 }}>{label}</h2>
              {isWeakness && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <span className="wdrawer-chip" style={{ background: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}30` }}>
                    PR: {pageRank.toFixed(3)}
                  </span>
                  <span className="wdrawer-chip" style={{ background: 'rgba(255,255,255,0.04)', color: '#71717a', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {frequency} occurrences
                  </span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="drawer-close-btn">
              <X size={16} />
            </button>
          </div>
        </div>
 
        {/* Scrollable content */}
        <div className="custom-scrollbar drawer-scroll-content" style={{ flex: 1, overflowY: 'auto' }}>

          {/* WHY IT HAPPENS */}
          {rootCauses.length > 0 && (
            <Section title="Why It Happens" icon={<AlertTriangle size={13} style={{ color: '#f59e0b' }} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {rootCauses.map(rc => (
                  <div key={rc.id} style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fcd34d', marginBottom: 3 }}>
                      {rc.data?.label}
                    </div>
                    {rc.data?.properties?.confidence && (
                      <div style={{ fontSize: '10px', color: '#71717a' }}>
                        Confidence: {Math.round(Number(rc.data.properties.confidence) * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Evidence */}
          {evidenceList.length > 0 && (
            <Section title="Evidence" icon={<Zap size={13} style={{ color: '#f59e0b' }} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {evidenceList.slice(0, 4).map(ev => (
                  <div key={ev.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase' }}>
                        {ev.data?.properties?.type || 'Evidence'}
                      </span>
                      {ev.data?.properties?.confidence && (
                        <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>
                          {Math.round(Number(ev.data.properties.confidence) * 100)}%
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>{ev.data?.label}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* WHERE IT APPEARS */}
          {problemNodes.length > 0 && (
            <Section title="Where It Appears" icon={<BookOpen size={13} style={{ color: '#3b82f6' }} />}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {problemNodes.map(pn => (
                  <span key={pn.id} style={{ padding: '5px 10px', borderRadius: 8, fontSize: '11px', fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
                    {pn.data?.label}
                  </span>
                ))}
              </div>
              {failureNodes.length > 0 && (
                <div style={{ marginTop: 10, fontSize: '11px', color: '#71717a' }}>
                  <strong style={{ color: '#f97316' }}>{failureNodes.length}</strong> practice session{failureNodes.length !== 1 ? 's' : ''} recorded
                </div>
              )}
            </Section>
          )}

          {/* Recent Session Examples */}
          {relatedFailures.length > 0 && (
            <Section title="Recent Examples" icon={<Clock size={13} style={{ color: '#f97316' }} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {relatedFailures.map(f => (
                  <div key={f.id} style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.12)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5' }}>{f.problemTitle}</span>
                      <span style={{ fontSize: '10px', color: '#52525b' }}>{getTimeAgo(f.timestamp)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#f97316', fontWeight: 700 }}>{f.status}</span>
                      <span style={{ fontSize: '10px', color: '#71717a' }}>Attempt #{f.attemptNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* IMPACT */}
          {isWeakness && (
            <Section title="Impact" icon={<Activity size={13} style={{ color: '#ef4444' }} />}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Frequency', value: frequency, color: '#f97316' },
                  { label: 'PageRank', value: pageRank.toFixed(3), color: riskColor },
                  { label: 'Confidence', value: confidence > 0 ? `${Math.round(confidence * 100)}%` : 'N/A', color: '#a1a1aa' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 9, padding: '9px 10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '9px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: s.color }}>{String(s.value)}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* HOW TO FIX */}
          {strategies.length > 0 && (
            <Section title="How to Fix" icon={<CheckCircle size={13} style={{ color: '#22c55e' }} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {strategies.map(st => (
                  <div key={st.id} style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#86efac', marginBottom: 3 }}>{st.data?.label}</div>
                    {st.data?.properties?.description && (
                      <div style={{ fontSize: '11px', color: '#71717a', lineHeight: 1.4 }}>{st.data.properties.description}</div>
                    )}
                    {st.data?.properties?.estimatedTime && (
                      <div style={{ fontSize: '10px', color: '#52525b', marginTop: 5 }}>
                        ⏱ {st.data.properties.estimatedTime}
                      </div>
                    )}
                    {st.data?.properties?.practiceProblems?.length > 0 && (
                      <div style={{ marginTop: 7 }}>
                        <div style={{ fontSize: '9px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Practice</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(st.data.properties.practiceProblems as string[]).slice(0, 5).map((p: string) => (
                            <a
                              key={p}
                              href={`https://leetcode.com/problems/${p}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ padding: '3px 8px', borderRadius: 6, fontSize: '10px', fontWeight: 700, background: 'rgba(34,197,94,0.08)', color: '#86efac', border: '1px solid rgba(34,197,94,0.15)', textDecoration: 'none' }}
                            >
                              {p}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* No connections fallback */}
          {rootCauses.length === 0 && evidenceList.length === 0 && problemNodes.length === 0 && strategies.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#52525b', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              <p>No connected story nodes found for this node. Submit more practice sessions to build the learning map.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
