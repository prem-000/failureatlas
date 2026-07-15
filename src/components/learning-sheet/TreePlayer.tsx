import React from 'react';
import { MermaidDiagram } from './MermaidDiagram';
import { buildMermaidFromSchema } from '@/lib/learning-sheet/parser';

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

  // Build base diagram using standard parser builder
  let treeCode = buildMermaidFromSchema({ nodes, edges });

  // Append styles for highlighted nodes
  if (highlighted.length > 0) {
    highlighted.forEach(id => {
      treeCode += `\n  style ${id} fill:#ff5f52,stroke:#ff5f52,stroke-width:2px,color:#ffffff;`;
    });
  }

  return <MermaidDiagram code={treeCode} />;
}
