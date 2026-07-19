/**
 * Tests for the stepToGraph converter and schema type guards.
 *
 * Run with:  npx vitest run tests/visualization/stepToGraph.test.ts --config vitest.config.ts
 */

import { describe, it, expect } from 'vitest';
import {
  isGraphFlowchart,
  isStepFlowchart,
  stepsToGraph,
  resolveFlowchartGraph,
  describeVisualizationSchema,
} from '../../src/lib/visualization/stepToGraph';

// ─── isGraphFlowchart ─────────────────────────────────────────────────────────

describe('isGraphFlowchart', () => {
  it('returns true for a valid graph flowchart', () => {
    expect(isGraphFlowchart({
      type: 'flowchart',
      nodes: [{ id: 'n1', label: 'Start' }],
      edges: [],
    })).toBe(true);
  });

  it('returns false when nodes is missing', () => {
    expect(isGraphFlowchart({ type: 'flowchart', steps: [] })).toBe(false);
  });

  it('returns false when nodes is empty', () => {
    expect(isGraphFlowchart({ type: 'flowchart', nodes: [], edges: [] })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isGraphFlowchart(null)).toBe(false);
  });

  it('returns false for a primitive', () => {
    expect(isGraphFlowchart('string')).toBe(false);
  });
});

// ─── isStepFlowchart ──────────────────────────────────────────────────────────

describe('isStepFlowchart', () => {
  it('returns true for a valid step flowchart', () => {
    expect(isStepFlowchart({
      type: 'flowchart',
      steps: [{ step: 1, action: 'Start', explanation: 'Begin here' }],
    })).toBe(true);
  });

  it('returns false when steps is missing', () => {
    expect(isStepFlowchart({ type: 'flowchart', nodes: [{ id: 'n1', label: 'X' }] })).toBe(false);
  });

  it('returns false when steps is empty', () => {
    expect(isStepFlowchart({ type: 'flowchart', steps: [] })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isStepFlowchart(null)).toBe(false);
  });
});

// ─── stepsToGraph ─────────────────────────────────────────────────────────────

describe('stepsToGraph', () => {
  it('converts a single step into one node and no edges', () => {
    const { nodes, edges } = stepsToGraph([
      { step: 1, action: 'Start', explanation: 'Initial step' },
    ]);
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
    expect(nodes[0].id).toBe('1');
    expect(nodes[0].label).toBe('Start');
    expect(nodes[0].explanation).toBe('Initial step');
  });

  it('converts 3 sequential steps into 3 nodes and 2 edges', () => {
    const steps = [
      { step: 1, action: 'Init',    explanation: 'e1' },
      { step: 2, action: 'Process', explanation: 'e2' },
      { step: 3, action: 'Done',    explanation: 'e3' },
    ];
    const { nodes, edges } = stepsToGraph(steps);
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
    expect(edges[0]).toEqual({ from: '1', to: '2' });
    expect(edges[1]).toEqual({ from: '2', to: '3' });
  });

  it('sorts steps by step number before converting', () => {
    const steps = [
      { step: 3, action: 'Last',   explanation: '' },
      { step: 1, action: 'First',  explanation: '' },
      { step: 2, action: 'Middle', explanation: '' },
    ];
    const { nodes } = stepsToGraph(steps);
    expect(nodes[0].label).toBe('First');
    expect(nodes[1].label).toBe('Middle');
    expect(nodes[2].label).toBe('Last');
  });

  it('returns empty nodes and edges for an empty steps array', () => {
    const { nodes, edges } = stepsToGraph([]);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('preserves explanation on each node', () => {
    const steps = [
      { step: 1, action: 'A', explanation: 'Explanation A' },
      { step: 2, action: 'B', explanation: 'Explanation B' },
    ];
    const { nodes } = stepsToGraph(steps);
    expect(nodes[0].explanation).toBe('Explanation A');
    expect(nodes[1].explanation).toBe('Explanation B');
  });

  it('uses a fallback label when action is empty/whitespace', () => {
    const { nodes } = stepsToGraph([
      { step: 5, action: '   ', explanation: '' },
    ]);
    expect(nodes[0].label).toBe('Step 5');
  });
});

// ─── resolveFlowchartGraph ────────────────────────────────────────────────────

describe('resolveFlowchartGraph', () => {
  it('returns nodes+edges for a graph flowchart', () => {
    const result = resolveFlowchartGraph({
      type: 'flowchart',
      nodes: [{ id: 'n1', label: 'A' }],
      edges: [{ from: 'n1', to: 'n1' }],
    });
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(1);
    expect(result!.edges).toHaveLength(1);
  });

  it('converts steps to nodes+edges for a step flowchart', () => {
    const result = resolveFlowchartGraph({
      type: 'flowchart',
      steps: [
        { step: 1, action: 'Start',   explanation: 'e1' },
        { step: 2, action: 'Finish',  explanation: 'e2' },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(2);
    expect(result!.edges).toHaveLength(1);
    expect(result!.nodes[0].label).toBe('Start');
  });

  it('returns null for an unknown schema (no nodes, no steps)', () => {
    const result = resolveFlowchartGraph({ type: 'flowchart', array: ['a', 'b'] });
    expect(result).toBeNull();
  });

  it('returns null for null input', () => {
    expect(resolveFlowchartGraph(null)).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(resolveFlowchartGraph({})).toBeNull();
  });

  it('defaults edges to [] for a graph flowchart missing edges', () => {
    const result = resolveFlowchartGraph({
      type: 'flowchart',
      nodes: [{ id: 'n1', label: 'Solo' }],
    });
    expect(result).not.toBeNull();
    expect(result!.edges).toEqual([]);
  });
});

// ─── describeVisualizationSchema ──────────────────────────────────────────────

describe('describeVisualizationSchema', () => {
  it('describes a graph schema', () => {
    const desc = describeVisualizationSchema({
      nodes: [{ id: 'n1', label: 'X' }],
      edges: [],
    });
    expect(desc).toContain('nodes(1)');
    expect(desc).toContain('edges(0)');
  });

  it('describes a step schema', () => {
    const desc = describeVisualizationSchema({
      steps: [{ step: 1, action: 'A', explanation: '' }],
    });
    expect(desc).toContain('steps(1)');
  });

  it('handles null gracefully', () => {
    expect(describeVisualizationSchema(null)).toBe('(not an object)');
  });

  it('handles empty object', () => {
    expect(describeVisualizationSchema({})).toBe('{ (empty) }');
  });
});
