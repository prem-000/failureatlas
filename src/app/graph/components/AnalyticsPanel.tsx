'use client';

import { ChevronRight, BrainCircuit, TrendingDown, Activity, Zap, Gauge, AlertTriangle } from 'lucide-react';
import type { WeaknessData, FailureData } from '@/hooks/usePhase3Queries';

interface AnalyticsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  weaknesses: WeaknessData[];
  failures: FailureData[];
}

function getRiskLevel(score: number): { label: string; color: string } {
  if (score > 0.5) return { label: 'Critical', color: '#ef4444' };
  if (score > 0.3) return { label: 'High', color: '#f97316' };
  if (score > 0.1) return { label: 'Medium', color: '#f59e0b' };
  return { label: 'Low', color: '#22c55e' };
}

function getTrend(failures: FailureData[]): 'increasing' | 'stable' | 'decreasing' {
  if (failures.length < 2) return 'stable';
  const recent = failures.slice(0, 3).length;
  const older = failures.slice(3, 6).length;
  if (recent > older) return 'increasing';
  if (recent < older) return 'decreasing';
  return 'stable';
}

export function AnalyticsPanel({ isOpen, onToggle, weaknesses, failures }: AnalyticsPanelProps) {
  const topWeakness = weaknesses[0];
  const topRcMap: Record<string, number> = {};
  failures.forEach(f => { topRcMap[f.rootCause] = (topRcMap[f.rootCause] || 0) + 1; });
  const topRc = Object.entries(topRcMap).sort((a, b) => b[1] - a[1])[0];
  const risk = topWeakness ? getRiskLevel(topWeakness.pageRankScore) : { label: 'None', color: '#71717a' };
  const trend = getTrend(failures);
  const confidence = topWeakness
    ? Math.round(52 + Math.min(topWeakness.pageRankScore * 35 + topWeakness.frequency * 1.8, 38))
    : 0;

  const trendColor = trend === 'increasing' ? '#ef4444' : trend === 'decreasing' ? '#22c55e' : '#f59e0b';
  const trendIcon = trend === 'increasing' ? '↑' : trend === 'decreasing' ? '↓' : '→';

  return (
    <>
      <style>{`
        .analytics-panel {
          position: fixed;
          right: 0;
          top: 56px;
          bottom: 0;
          width: 280px;
          background: rgba(12,12,14,0.97);
          border-left: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(16px);
          z-index: 40;
          display: flex;
          flex-direction: column;
          transition: transform 320ms cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .analytics-panel.closed {
          transform: translateX(100%);
        }
        .analytics-toggle {
          position: fixed;
          right: ${isOpen ? '280px' : '0px'};
          top: 50%;
          transform: translateY(-50%);
          z-index: 41;
          transition: right 320ms cubic-bezier(0.16,1,0.3,1);
          background: rgba(15,15,18,0.9);
          border: 1px solid rgba(255,255,255,0.08);
          border-right: none;
          border-radius: 10px 0 0 10px;
          width: 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #52525b;
          transition: right 320ms cubic-bezier(0.16,1,0.3,1), color 150ms;
        }
        .analytics-toggle:hover { color: #a1a1aa; }
        .stat-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          transition: background 150ms;
        .stat-row:hover { background: rgba(255,255,255,0.04); }
        @media (max-width: 768px) {
          .analytics-panel { width: 100% !important; border-left: none !important; z-index: 100 !important; }
          .analytics-toggle { z-index: 101 !important; right: 0 !important; }
        }
      `}</style>

      {/* Toggle button */}
      <button className="analytics-toggle" onClick={onToggle} title="Toggle analytics panel">
        <ChevronRight size={14} style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 300ms' }} />
      </button>

      {/* Panel */}
      <aside className={`analytics-panel custom-scrollbar${isOpen ? '' : ' closed'}`}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BrainCircuit size={15} style={{ color: '#ff5f52' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Learning Intelligence
            </span>
          </div>
          <p style={{ fontSize: '10px', color: '#52525b', marginTop: 4, lineHeight: 1.4 }}>
            Predictive analytics from your learning map
          </p>
        </div>

        {/* Content */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Prediction Confidence */}
          {confidence > 0 && (
            <div className="stat-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prediction Confidence</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#f4f4f5' }}>{confidence}%</span>
              </div>
              <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ width: `${confidence}%`, height: '100%', background: 'linear-gradient(90deg, #ff5f52, #a855f7)', borderRadius: 2 }} />
              </div>
            </div>
          )}

          {/* Predicted Next Weakness */}
          <div className="stat-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <TrendingDown size={11} style={{ color: '#a855f7' }} />
              <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Predicted Growth Area</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: topWeakness ? '#d8b4fe' : '#52525b' }}>
              {topWeakness ? topWeakness.name : 'No data yet'}
            </span>
            {topWeakness && (
              <span style={{ fontSize: '10px', color: '#71717a', marginTop: 2 }}>
                PageRank: {topWeakness.pageRankScore.toFixed(3)} · {topWeakness.frequency} occurrence{topWeakness.frequency !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Predicted Root Cause */}
          <div className="stat-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Zap size={11} style={{ color: '#fcd34d' }} />
              <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Predicted Learning Insight</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: topRc ? '#fcd34d' : '#52525b' }}>
              {topRc ? topRc[0] : 'Insufficient data'}
            </span>
            {topRc && (
              <span style={{ fontSize: '10px', color: '#71717a', marginTop: 2 }}>
                Occurred {topRc[1]} time{topRc[1] !== 1 ? 's' : ''} recently
              </span>
            )}
          </div>

          {/* Risk Level */}
          <div className="stat-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <AlertTriangle size={11} style={{ color: risk.color }} />
              <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Risk Level</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: risk.color }}>{risk.label}</span>
          </div>

          {/* Recent Trend */}
          <div className="stat-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Activity size={11} style={{ color: trendColor }} />
              <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Trend</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: trendColor }}>{trendIcon}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: trendColor, textTransform: 'capitalize' }}>{trend}</span>
            </div>
          </div>

          {/* Priority Learning Area */}
          {topWeakness && (
            <div className="stat-row" style={{ borderColor: 'rgba(255,95,82,0.15)', background: 'rgba(255,95,82,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Gauge size={11} style={{ color: '#ff5f52' }} />
                <span style={{ fontSize: '10px', color: '#ff5f52', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority Focus</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5' }}>{topWeakness.name}</span>
              <span style={{ fontSize: '10px', color: '#a1a1aa', marginTop: 2, lineHeight: 1.4 }}>
                {topWeakness.description}
              </span>
            </div>
          )}

          {/* Top weaknesses list */}
          {weaknesses.length > 1 && (
            <div>
              <div style={{ fontSize: '10px', color: '#52525b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, padding: '0 2px' }}>
                Growth Area Ranking
              </div>
              {weaknesses.slice(0, 5).map((w, i) => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < Math.min(weaknesses.length, 5) - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: i < 3 ? '#a855f7' : '#3f3f46', width: 14, textAlign: 'center' }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#d4d4d8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                    <div style={{ height: 2, background: 'rgba(168,85,247,0.15)', borderRadius: 1, marginTop: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(w.pageRankScore / (weaknesses[0]?.pageRankScore || 1)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #a855f7, #6366f1)', borderRadius: 1 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', color: '#a855f7', fontWeight: 700 }}>{w.pageRankScore.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
