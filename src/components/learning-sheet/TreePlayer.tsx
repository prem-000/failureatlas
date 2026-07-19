import React from 'react';
import { ExcalidrawDiagram } from './ExcalidrawDiagram';
import { buildExcalidrawSceneWithHighlights } from '@/lib/learning-sheet/excalidraw-scene';

interface TreePlayerProps {
  visualization: {
    nodes?: Array<{ id: string; label: string }>;
    edges?: Array<{ from: string; to: string }>;
    steps: Array<{
      state?: string[]; // active node IDs to highlight
    }>;
  };
  activeStep: number;
}

export function TreePlayer({ visualization, activeStep }: TreePlayerProps) {
  const nodes = visualization.nodes || [];
  const edges = visualization.edges || [];
  const stepData = visualization.steps[activeStep] || {};
  const highlighted = stepData.state || [];

  const scene = buildExcalidrawSceneWithHighlights({ nodes, edges }, highlighted);

  return <ExcalidrawDiagram scene={scene} />;
}
