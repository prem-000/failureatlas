'use client';

import { BrainCircuit, Map, GitFork, BookOpen, Bug, type LucideIcon } from 'lucide-react';

export type TabId = 'roadmap' | 'knowledge' | 'intelligence' | 'workspace' | 'replay';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
  badgeColor?: string;
}

const TABS: Tab[] = [
  { id: 'roadmap',      label: 'Roadmap',              icon: Map,          description: 'Adaptive LeetCode practice plan' },
  { id: 'knowledge',    label: 'Knowledge Graph',       icon: GitFork,      description: 'Concept relationships' },
  { id: 'intelligence', label: 'Learning Intelligence', icon: BrainCircuit, description: 'Weakness story explorer', badge: 'Core' },
  { id: 'workspace',    label: 'Workspace',             icon: BookOpen,     description: 'Notes, cheat sheets, journal' },
  { id: 'replay',       label: 'Failure Replay',        icon: Bug,          description: 'Counter-example discovery engine', badge: 'New', badgeColor: '#ef4444' },
];

interface TabBarProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

export function TabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      padding: '0 16px',
      height: 52,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(15,15,18,0.95)',
      backdropFilter: 'blur(16px)',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <style>{`
        .tab-scroll-container {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          overflow-x: auto;
          overflow-y: hidden;
          white-space: nowrap;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          min-width: 0;
        }
        .tab-scroll-container::-webkit-scrollbar { display: none; }
        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 13px;
          border-radius: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #52525b;
          transition: all 180ms ease;
          position: relative;
          white-space: nowrap;
          letter-spacing: -0.01em;
          flex-shrink: 0;
          min-width: max-content;
          scroll-snap-align: start;
        }
        .tab-btn:hover {
          color: #a1a1aa;
          background: rgba(255,255,255,0.04);
        }
        .tab-btn.tab-active {
          color: #ff5f52;
          background: rgba(255,95,82,0.08);
        }
        .tab-btn.tab-active-replay {
          color: #ef4444;
          background: rgba(239,68,68,0.1);
        }
        .tab-active-bar {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 2px;
          border-radius: 2px;
          background: #ff5f52;
          box-shadow: 0 0 8px rgba(255,95,82,0.6);
        }
        .tab-active-bar-replay {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 2px;
          border-radius: 2px;
          background: #ef4444;
          box-shadow: 0 0 8px rgba(239,68,68,0.6);
        }
        .tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: rgba(255,95,82,0.15);
          color: #ff5f52;
          border: 1px solid rgba(255,95,82,0.25);
        }
        .tab-badge-replay {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: rgba(239,68,68,0.15);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.25);
        }
        @media (max-width: 767px) {
          .tab-btn { padding: 5px 10px; font-size: 12px; }
          .tab-tagline { display: none !important; }
        }
      `}</style>

      <div className="tab-scroll-container">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const isReplay = tab.id === 'replay';
          const activeClass = active ? (isReplay ? 'tab-active-replay' : 'tab-active') : '';
          const badgeClass = isReplay ? 'tab-badge-replay' : 'tab-badge';
          const barClass = isReplay ? 'tab-active-bar-replay' : 'tab-active-bar';

          return (
            <button
              key={tab.id}
              className={`tab-btn ${activeClass}`}
              onClick={() => onChange(tab.id)}
              title={tab.description}
            >
              <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
              {tab.label}
              {tab.badge && (
                <span className={badgeClass}>{tab.badge}</span>
              )}
              {active && <span className={barClass} />}
            </button>
          );
        })}
      </div>

      {/* Tagline */}
      <div className="tab-tagline" style={{
        fontSize: '11px',
        color: '#3f3f46',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        paddingLeft: 12,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block' }} />
        Learning Intelligence OS
      </div>
    </header>
  );
}
