'use client';

import { X, CheckCircle, XCircle, AlertTriangle, Clock, Code2, Lightbulb, ChevronRight, ExternalLink } from 'lucide-react';
import type { RoadmapProblem } from '@/hooks/usePhase3Queries';
import type { FailureData } from '@/hooks/usePhase3Queries';

interface ProblemDrawerProps {
  problem: RoadmapProblem | null;
  relatedFailures: FailureData[];
  onClose: () => void;
}

const DIFF_COLORS: Record<string, string> = {
  Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444',
};

function getTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ProblemDrawer({ problem, relatedFailures, onClose }: ProblemDrawerProps) {
  if (!problem) return null;

  const diffColor = DIFF_COLORS[problem.difficulty] || '#71717a';
  const isOpen = !!problem;

  // Filter failures related to this problem
  const failures = relatedFailures.filter(f =>
    f.problemSlug === problem.slug ||
    f.problemTitle.toLowerCase().includes(problem.title.toLowerCase().substring(0, 10))
  );

  const allEvidence = failures.flatMap(f => f.evidence || []);
  const allRootCauses = failures.flatMap(f => f.rootCauses || []);
  const uniqueRootCauses = Array.from(new Map(allRootCauses.map(r => [r.name, r])).values());

  return (
    <>
      <style>{`
        .problem-drawer {
          position: fixed;
          right: 0;
          top: 56px;
          bottom: 0;
          width: 380px;
          background: rgba(10,10,12,0.98);
          border-left: 1px solid rgba(255,255,255,0.07);
          z-index: 60;
          display: flex;
          flex-direction: column;
          transform: ${isOpen ? 'translateX(0)' : 'translateX(100%)'};
          transition: transform 300ms cubic-bezier(0.16,1,0.3,1);
          backdrop-filter: blur(20px);
        }
        .drawer-section {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .drawer-section-title {
          font-size: 10px;
          font-weight: 700;
          color: #52525b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 10px;
        }
        .tag-chip {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          color: #71717a;
        }
        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 14px;
          border-radius: 10px;
          border: none;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 150ms;
        }
        .timeline-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;
        }
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
        @media (max-width: 767px) {
          .problem-drawer {
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
            transform: ${isOpen ? 'translateY(0)' : 'translateY(100%)'} !important;
          }
          .drawer-close-btn {
            min-width: 44px !important;
            min-height: 44px !important;
          }
          .drawer-scroll-content {
            padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>

      <div className="problem-drawer custom-scrollbar">
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#52525b' }}>#{problem.leetcodeId}</span>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: 6, color: diffColor, background: `${diffColor}15`, border: `1px solid ${diffColor}25` }}>
                  {problem.difficulty}
                </span>
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#f4f4f5', lineHeight: 1.2, margin: 0 }}>
                {problem.title}
              </h2>
              <p style={{ fontSize: '11px', color: '#71717a', marginTop: 6, lineHeight: 1.4 }}>
                {problem.reason}
              </p>
            </div>
            <button onClick={onClose} className="drawer-close-btn">
              <X size={16} />
            </button>
          </div>
 
          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
            {problem.topics.slice(0, 4).map(t => (
              <span key={t} className="tag-chip">{t}</span>
            ))}
          </div>
 
          {/* Open on LeetCode */}
          <a
            href={`https://leetcode.com/problems/${problem.slug}/`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10,
              fontSize: '11px', fontWeight: 600, color: '#f59e0b', textDecoration: 'none',
            }}
          >
            <ExternalLink size={11} />
            Open on LeetCode
            <ChevronRight size={11} />
          </a>
        </div>
 
        {/* Scrollable content */}
        <div className="custom-scrollbar drawer-scroll-content" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Stats */}
          <div className="drawer-section">
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'Attempts', value: problem.userAttempts || 0, color: problem.userAttempts ? '#f97316' : '#3f3f46' },
                { label: 'Status', value: problem.nodeState, color: problem.nodeState === 'solved' || problem.nodeState === 'previously_solved' ? '#22c55e' : problem.nodeState === 'failed' ? '#ef4444' : '#71717a' },
                { label: 'Sessions', value: failures.length, color: failures.length > 0 ? '#ef4444' : '#3f3f46' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '9px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: s.color, textTransform: 'capitalize' }}>{String(s.value)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Timeline */}
          {failures.length > 0 && (
            <div className="drawer-section">
              <div className="drawer-section-title">Submission Timeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {failures.slice(0, 5).map((f, i) => {
                  const statusColor = f.status === 'Accepted' ? '#22c55e' : f.status.includes('Time') ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={f.id || i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div className="timeline-dot" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}80` }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor }}>{f.status}</span>
                          <span style={{ fontSize: '10px', color: '#52525b' }}>{getTimeAgo(f.timestamp)}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#71717a' }}>Attempt #{f.attemptNumber}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Evidence */}
          {allEvidence.length > 0 && (
            <div className="drawer-section">
              <div className="drawer-section-title">Evidence ({allEvidence.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {allEvidence.slice(0, 4).map((ev, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>{ev.type}</span>
                      <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>{Math.round(ev.confidence * 100)}%</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>{ev.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Root Causes */}
          {uniqueRootCauses.length > 0 && (
            <div className="drawer-section">
              <div className="drawer-section-title">Learning Insights</div>
              {uniqueRootCauses.slice(0, 4).map((rc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < uniqueRootCauses.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <AlertTriangle size={11} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '11px', color: '#d4d4d8', fontWeight: 600 }}>{rc.name}</span>
                  <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>{Math.round(rc.confidence * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* AI Reason */}
          <div className="drawer-section">
            <div className="drawer-section-title">Why This Problem</div>
            <div style={{ background: 'rgba(255,95,82,0.04)', border: '1px solid rgba(255,95,82,0.12)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <Lightbulb size={13} style={{ color: '#ff5f52', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: '12px', color: '#d4d4d8', lineHeight: 1.5 }}>{problem.reason}</span>
              </div>
            </div>
          </div>

          {/* Patterns */}
          <div className="drawer-section">
            <div className="drawer-section-title">Patterns</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {problem.patterns.map(p => (
                <span key={p} style={{ padding: '4px 10px', borderRadius: 8, fontSize: '10px', fontWeight: 700, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
