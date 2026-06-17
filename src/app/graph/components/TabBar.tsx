'use client';

import { BrainCircuit, Map, GitFork, BookOpen, type LucideIcon } from 'lucide-react';

export type TabId = 'roadmap' | 'knowledge' | 'intelligence' | 'workspace';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
  description: string;
}


const TABS: Tab[] = [
  { id: 'roadmap',      label: 'Roadmap',              icon: Map,         description: 'Adaptive LeetCode practice plan' },
  { id: 'knowledge',    label: 'Knowledge Graph',       icon: GitFork,     description: 'Concept relationships' },
  { id: 'intelligence', label: 'Learning Intelligence',  icon: BrainCircuit,description: 'Weakness story explorer' },
  { id: 'workspace',    label: 'Workspace',             icon: BookOpen,    description: 'Notes, cheat sheets, journal' },
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
      gap: 4,
      padding: '0 20px',
      height: 56,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(15,15,18,0.95)',
      backdropFilter: 'blur(16px)',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <style>{`
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
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
        }
        .tab-btn:hover {
          color: #a1a1aa;
          background: rgba(255,255,255,0.04);
        }
        .tab-btn.tab-active {
          color: #ff5f52;
          background: rgba(255,95,82,0.08);
        }
        .tab-active-bar {
          position: absolute;
          bottom: -14px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 2px;
          border-radius: 2px;
          background: #ff5f52;
          box-shadow: 0 0 8px rgba(255,95,82,0.6);
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
      `}</style>

      {/* Left spacer to account for sidebar */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`tab-btn${active ? ' tab-active' : ''}`}
              onClick={() => onChange(tab.id)}
              title={tab.description}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              {tab.label}
              {tab.id === 'intelligence' && (
                <span className="tab-badge">Core</span>
              )}
              {active && <span className="tab-active-bar" />}
            </button>
          );
        })}
      </div>

      {/* Tagline */}
      <div style={{
        fontSize: '11px',
        color: '#3f3f46',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block' }} />
        Learning Intelligence OS
      </div>
    </header>
  );
}
