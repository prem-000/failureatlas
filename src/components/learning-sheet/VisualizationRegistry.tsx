import React from 'react';
import { PointerPlayer }    from './PointerPlayer';
import { GridPlayer }       from './GridPlayer';
import { MemoryPlayer }     from './MemoryPlayer';
import { TreePlayer }       from './TreePlayer';
import { StepCardsPlayer }  from './StepCardsPlayer';
import { ExcalidrawDiagram } from './ExcalidrawDiagram';
import { ErrorBoundary }    from './ErrorBoundary';
import { buildExcalidrawScene } from '@/lib/learning-sheet/excalidraw-scene';
import {
  isGraphFlowchart,
  isStepFlowchart,
  resolveFlowchartGraph,
  describeVisualizationSchema,
} from '@/lib/visualization/stepToGraph';

const IS_DEV = process.env.NODE_ENV === 'development';

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * Validate that a raw excalidrawScene value is a parseable object with an
 * elements array.  Returns null on success, error reason on failure.
 */
function validateExcalidrawScene(scene: any): string | null {
  if (!scene) return 'Scene is null or undefined.';
  let obj: any = scene;
  if (typeof scene === 'string') {
    try { obj = JSON.parse(scene); } catch { return 'Scene JSON failed to parse.'; }
  }
  if (!obj || typeof obj !== 'object') return 'Scene is not an object.';
  if (!Array.isArray(obj.elements))    return 'Scene is missing an "elements" array.';
  return null;
}

// ─── Fallback UIs ─────────────────────────────────────────────────────────────

function ValidationFallback({
  reason,
  type,
}: {
  reason: string;
  type: string;
}) {
  return (
    <div
      style={{
        padding: '20px 22px',
        background: 'rgba(245,158,11,0.04)',
        border: '1px solid rgba(245,158,11,0.18)',
        borderRadius: 14,
        fontSize: '13px',
        color: '#a1a1aa',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span style={{ fontWeight: 800, color: '#fbbf24', fontSize: '13px' }}>
        Unable to render this diagram
      </span>
      <span style={{ fontSize: '12px', color: '#71717a' }}>
        Diagram type: <code style={{ color: '#d4d4d8' }}>{type}</code>
      </span>
      <div
        style={{
          fontSize: '12px',
          color: '#fca5a5',
          background: 'rgba(239,68,68,0.06)',
          padding: '8px 12px',
          borderRadius: 8,
          fontFamily: 'monospace',
          lineHeight: 1.6,
        }}
      >
        {reason}
      </div>
      <span style={{ fontSize: '12px', color: '#71717a' }}>
        The explanation below contains the complete learning content.
      </span>
    </div>
  );
}

/** Shown when a flowchart has neither a recognizable graph nor step schema. */
function UnknownSchemaFallback({
  type,
  schemaSummary,
}: {
  type: string;
  schemaSummary: string;
}) {
  return (
    <div
      style={{
        padding: '20px 22px',
        background: 'rgba(245,158,11,0.04)',
        border: '1px solid rgba(245,158,11,0.18)',
        borderRadius: 14,
        fontSize: '13px',
        color: '#a1a1aa',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span style={{ fontWeight: 800, color: '#fbbf24', fontSize: '13px' }}>
        Unknown flowchart schema
      </span>
      <span style={{ fontSize: '12px', color: '#71717a' }}>
        Diagram type: <code style={{ color: '#d4d4d8' }}>{type}</code>
      </span>

      {/* Expected schemas */}
      <div style={{ fontSize: '12px', color: '#d4d4d8', lineHeight: 1.7 }}>
        <span style={{ color: '#71717a' }}>Expected one of:</span>
        <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <li>
            <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>Graph Flowchart</span>
            {' '}— <code style={{ color: '#a1a1aa' }}>{'{ nodes: [...], edges: [...] }'}</code>
          </li>
          <li>
            <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>Step Flowchart</span>
            {' '}— <code style={{ color: '#a1a1aa' }}>{'{ steps: [{ step, action, explanation }] }'}</code>
          </li>
        </ul>
      </div>

      {/* Received schema */}
      <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
        <span style={{ color: '#71717a' }}>Received: </span>
        <code
          style={{
            color: '#fca5a5',
            background: 'rgba(239,68,68,0.06)',
            padding: '2px 8px',
            borderRadius: 6,
            fontFamily: 'monospace',
          }}
        >
          {schemaSummary}
        </code>
      </div>

      <span style={{ fontSize: '12px', color: '#71717a' }}>
        The explanation below contains the complete learning content.
      </span>
    </div>
  );
}

// ─── Dev logging ──────────────────────────────────────────────────────────────

function logVisualizationDev(type: string, visualization: any) {
  if (!IS_DEV) return;
  const schema = isGraphFlowchart(visualization)
    ? 'Graph (nodes + edges)'
    : isStepFlowchart(visualization)
    ? 'Steps'
    : 'Unknown';

  console.group('[VisualizationRegistry]');
  console.log('Type:  ', type);
  console.log('Schema:', schema);
  console.dir(visualization);
  console.groupEnd();
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const PLAYER_MAP: Record<string, React.ComponentType<any>> = {
  pointer:         PointerPlayer,
  grid:            GridPlayer,
  'memory-layout': MemoryPlayer,
  tree:            TreePlayer,
  graph:           TreePlayer,
  'step-cards':    StepCardsPlayer,
};

interface RenderPlayerProps {
  type:              string;
  visualization:     any;
  activeStep:        number;
  excalidrawScene?:  string | Record<string, any>;
  /** Passed through to ErrorBoundary for richer error messages. */
  onRegenerate?:     () => void;
}

export function renderVisualizationPlayer({
  type,
  visualization,
  activeStep,
  excalidrawScene,
  onRegenerate,
}: RenderPlayerProps): React.ReactElement {

  logVisualizationDev(type, visualization);

  // ── Flowchart / Graph / Tree → Excalidraw path ───────────────────────────
  if (type === 'flowchart' || type === 'graph' || type === 'tree') {

    // 1. Prefer an explicitly pre-built Excalidraw scene (from AI/parser output)
    if (excalidrawScene) {
      const sceneError = validateExcalidrawScene(excalidrawScene);
      if (sceneError) {
        return <ValidationFallback reason={sceneError} type={type} />;
      }
      return (
        <ErrorBoundary diagramType={type} onRegenerate={onRegenerate}>
          <ExcalidrawDiagram scene={excalidrawScene} />
        </ErrorBoundary>
      );
    }

    // 2. Resolve graph schema — accepts BOTH graph and step flowcharts
    const graph = resolveFlowchartGraph(visualization);

    if (!graph) {
      // Neither schema matched — show a diagnostic fallback
      const schemaSummary = describeVisualizationSchema(visualization);
      if (IS_DEV) {
        console.warn(
          `[VisualizationRegistry] Unknown flowchart schema for type="${type}":`,
          visualization
        );
      }
      return (
        <UnknownSchemaFallback
          type={type}
          schemaSummary={schemaSummary}
        />
      );
    }

    if (graph.nodes.length === 0) {
      return (
        <ValidationFallback
          reason="Visualization has no renderable nodes."
          type={type}
        />
      );
    }

    const scene = buildExcalidrawScene(graph);

    return (
      <ErrorBoundary diagramType={type} onRegenerate={onRegenerate}>
        <ExcalidrawDiagram scene={scene} />
      </ErrorBoundary>
    );
  }

  // ── Standard interactive players ─────────────────────────────────────────
  const PlayerComponent = PLAYER_MAP[type];

  if (!PlayerComponent) {
    // Unknown type — attempt to interpret as a flowchart via either schema
    const graph = resolveFlowchartGraph(visualization);
    if (!graph || graph.nodes.length === 0) {
      const schemaSummary = describeVisualizationSchema(visualization);
      return (
        <UnknownSchemaFallback
          type={`${type} (unknown type)`}
          schemaSummary={schemaSummary}
        />
      );
    }
    const scene = buildExcalidrawScene(graph);
    return (
      <ErrorBoundary diagramType={type} onRegenerate={onRegenerate}>
        <ExcalidrawDiagram scene={scene} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary diagramType={type} onRegenerate={onRegenerate}>
      <PlayerComponent visualization={visualization} activeStep={activeStep} />
    </ErrorBoundary>
  );
}
