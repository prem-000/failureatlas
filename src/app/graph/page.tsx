'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TabBar, type TabId } from './components/TabBar';
import { RoadmapTab } from './components/RoadmapTab';
import { KnowledgeGraphTab } from './components/KnowledgeGraphTab';
import { FailureIntelligenceTab } from './components/FailureIntelligenceTab';
import { WorkspaceTab } from './components/WorkspaceTab';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { useGraphWeaknesses, useGraphFailures } from '@/hooks/usePhase3Queries';

export default function GraphPage() {
  const [activeTab, setActiveTab] = useState<TabId>('roadmap');
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  const { data: weaknesses = [] } = useGraphWeaknesses(10);
  const { data: failures = [] } = useGraphFailures(20, 30);

  // Right margin to account for analytics panel
  const rightOffset = analyticsOpen ? 280 : 0;

  return (
    <AppShell>
      <style>{`
        .graph-workspace {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #0d0d0f;
          font-family: 'Inter', system-ui, sans-serif;
          overflow: hidden;
          transition: padding-right 320ms cubic-bezier(0.16,1,0.3,1);
        }
        .tab-content {
          flex: 1;
          display: flex;
          overflow: hidden;
          transition: padding-right 320ms cubic-bezier(0.16,1,0.3,1);
        }
        @media (max-width: 768px) {
          .graph-workspace { padding-right: 0 !important; }
        }
        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        /* Global reactflow overrides */
        .react-flow__edge path.react-flow__edge-path { stroke-width: 1.5px; }
        .react-flow__controls button {
          background: rgba(15,15,18,0.85) !important;
          border-color: rgba(255,255,255,0.07) !important;
          color: #71717a !important;
        }
        .react-flow__controls button:hover { color: #e4e4e7 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 1s linear infinite; }
      `}</style>

      <div className="graph-workspace" style={{ paddingRight: rightOffset }}>
        {/* 4-tab header */}
        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab content */}
        <div className="tab-content">
          {activeTab === 'roadmap'      && <RoadmapTab />}
          {activeTab === 'knowledge'    && <KnowledgeGraphTab />}
          {activeTab === 'intelligence' && <FailureIntelligenceTab />}
          {activeTab === 'workspace'    && <WorkspaceTab />}
        </div>
      </div>

      {/* Right analytics panel — always mounted, shows on all tabs */}
      <AnalyticsPanel
        isOpen={analyticsOpen}
        onToggle={() => setAnalyticsOpen(v => !v)}
        weaknesses={weaknesses}
        failures={failures}
      />
    </AppShell>
  );
}
