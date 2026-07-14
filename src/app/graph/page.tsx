'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TabBar, type TabId } from './components/TabBar';
import { RoadmapTab } from './components/RoadmapTab';
import { KnowledgeGraphTab } from './components/KnowledgeGraphTab';
import { FailureReplayTab } from './components/FailureReplayTab';

export default function GraphPage() {
  const [activeTab, setActiveTab] = useState<TabId>('roadmap');

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
        }
        .tab-content {
          flex: 1;
          display: flex;
          overflow: hidden;
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

      <div className="graph-workspace">
        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        <div className="tab-content">
          {activeTab === 'roadmap'   && <RoadmapTab />}
          {activeTab === 'knowledge' && <KnowledgeGraphTab />}
          {activeTab === 'replay'    && <FailureReplayTab />}
        </div>
      </div>
    </AppShell>
  );
}
