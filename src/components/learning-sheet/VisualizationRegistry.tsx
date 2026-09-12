import React from 'react';
import { PointerPlayer } from './PointerPlayer';
import { GridPlayer } from './GridPlayer';
import { MemoryPlayer } from './MemoryPlayer';
import { TreePlayer } from './TreePlayer';
import { StepCardsPlayer } from './StepCardsPlayer';
import { MermaidDiagram } from './MermaidDiagram';

const REGISTRY: Record<string, React.ComponentType<any>> = {
  pointer: PointerPlayer,
  grid: GridPlayer,
  'memory-layout': MemoryPlayer,
  tree: TreePlayer,
  graph: TreePlayer,
  'step-cards': StepCardsPlayer,
  flowchart: ({ code }: { code: string }) => <MermaidDiagram code={code} />,
};

interface RenderPlayerProps {
  type: string;
  visualization: any;
  activeStep: number;
  mermaidDiagram?: string;
}

export function renderVisualizationPlayer({ type, visualization, activeStep, mermaidDiagram }: RenderPlayerProps) {
  const PlayerComponent = REGISTRY[type] || REGISTRY.flowchart;
  
  if (PlayerComponent === REGISTRY.flowchart) {
    if (!mermaidDiagram || !mermaidDiagram.trim()) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 120,
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: 12,
            color: '#71717a',
            fontSize: '12px',
          }}
        >
          No diagram data available
        </div>
      );
    }
    return <PlayerComponent code={mermaidDiagram} />;
  }

  return <PlayerComponent visualization={visualization} activeStep={activeStep} />;
}
