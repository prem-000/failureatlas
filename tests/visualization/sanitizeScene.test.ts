/**
 * Automated tests for the Excalidraw scene sanitizer and scene builder.
 *
 * Run with:   npx vitest run tests/visualization/sanitizeScene.test.ts
 *
 * Coverage targets:
 *  - NaN coordinates           → element removed
 *  - Infinity values           → element removed
 *  - Huge coordinates          → normalized to safe range
 *  - Negative widths/heights   → corrected
 *  - Empty scene               → returns { elements: [] }
 *  - Single-node scene         → renders without crash
 *  - Circular graphs           → no infinite BFS loop
 *  - Arrow elements            → large point offsets clamped
 *  - Scene exceeding 16 000 px → safe after sanitization
 *  - Malformed JSON string     → returns null
 *  - buildExcalidrawScene:
 *      - max nodes/edges cap
 *      - circular graph BFS terminates
 *      - nested flowcharts (deep layers)
 *      - single-node diagram
 */

import { describe, it, expect } from 'vitest';
import { sanitizeScene } from '../../src/lib/excalidraw/sanitizeScene';
import { buildExcalidrawScene } from '../../src/lib/learning-sheet/excalidraw-scene';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CANVAS_ABSOLUTE_MAX = 8_000; // Must match sanitizeScene.ts CANVAS_ABSOLUTE_MAX

function makeRect(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id:   'r1',
    type: 'rectangle',
    x:    100,
    y:    100,
    width:  200,
    height:  80,
    strokeColor:     '#ff0000',
    backgroundColor: 'transparent',
    fillStyle:   'solid',
    strokeWidth: 1,
    roughness:   0,
    opacity:     100,
    angle:       0,
    seed:        12345,
    version:     1,
    versionNonce: 99999,
    isDeleted:   false,
    boundElements: null,
    groupIds: [],
    frameId:  null,
    roundness: null,
    ...overrides,
  };
}

function makeScene(elements: any[]): Record<string, any> {
  return { type: 'excalidraw', version: 2, elements };
}

function elementBoundsOk(el: any): boolean {
  return (
    Number.isFinite(el.x) &&
    Number.isFinite(el.y) &&
    Number.isFinite(el.width) &&
    Number.isFinite(el.height) &&
    el.x + el.width  <= CANVAS_ABSOLUTE_MAX &&
    el.y + el.height <= CANVAS_ABSOLUTE_MAX &&
    el.x >= 0 &&
    el.y >= 0
  );
}

// ─── sanitizeScene ────────────────────────────────────────────────────────────

describe('sanitizeScene', () => {

  it('returns null for null input', () => {
    expect(sanitizeScene(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(sanitizeScene(undefined)).toBeNull();
  });

  it('returns null for malformed JSON string', () => {
    expect(sanitizeScene('{ bad json }')).toBeNull();
  });

  it('returns empty elements for scene without elements array', () => {
    const result = sanitizeScene({ type: 'excalidraw', version: 2 });
    expect(result).not.toBeNull();
    expect(result!.elements).toEqual([]);
  });

  it('returns empty elements for an empty elements array', () => {
    const result = sanitizeScene(makeScene([]));
    expect(result).not.toBeNull();
    expect(result!.elements).toHaveLength(0);
  });

  it('removes elements with NaN x coordinate', () => {
    const result = sanitizeScene(makeScene([makeRect({ x: NaN })]));
    expect(result!.elements).toHaveLength(0);
  });

  it('removes elements with NaN y coordinate', () => {
    const result = sanitizeScene(makeScene([makeRect({ y: NaN })]));
    expect(result!.elements).toHaveLength(0);
  });

  it('removes elements with Infinity x coordinate', () => {
    const result = sanitizeScene(makeScene([makeRect({ x: Infinity })]));
    expect(result!.elements).toHaveLength(0);
  });

  it('removes elements with -Infinity y coordinate', () => {
    const result = sanitizeScene(makeScene([makeRect({ y: -Infinity })]));
    expect(result!.elements).toHaveLength(0);
  });

  it('removes elements with unknown type', () => {
    const result = sanitizeScene(makeScene([makeRect({ type: 'blob' })]));
    expect(result!.elements).toHaveLength(0);
  });

  it('preserves a valid single-element scene', () => {
    const result = sanitizeScene(makeScene([makeRect()]));
    expect(result!.elements).toHaveLength(1);
    const el = result!.elements[0];
    expect(elementBoundsOk(el)).toBe(true);
  });

  it('normalises element with NaN width to a default width', () => {
    const result = sanitizeScene(makeScene([makeRect({ width: NaN })]));
    expect(result!.elements).toHaveLength(1);
    const el = result!.elements[0];
    expect(Number.isFinite(el.width)).toBe(true);
    expect(el.width).toBeGreaterThan(0);
  });

  it('flips negative width and adjusts x', () => {
    const result = sanitizeScene(makeScene([makeRect({ x: 200, width: -100 })]));
    expect(result!.elements).toHaveLength(1);
    const el = result!.elements[0];
    expect(el.width).toBeGreaterThan(0);
  });

  it('clamps extremely large coordinate to canvas-safe range', () => {
    const result = sanitizeScene(makeScene([makeRect({ x: 700_000, y: 500_000 })]));
    expect(result!.elements).toHaveLength(1);
    const el = result!.elements[0];
    expect(el.x + el.width).toBeLessThanOrEqual(CANVAS_ABSOLUTE_MAX);
    expect(el.y + el.height).toBeLessThanOrEqual(CANVAS_ABSOLUTE_MAX);
  });

  it('clamped scene never exceeds CANVAS_ABSOLUTE_MAX on any axis', () => {
    const elements = Array.from({ length: 20 }, (_, i) =>
      makeRect({ id: `r${i}`, x: i * 50_000, y: i * 30_000 })
    );
    const result = sanitizeScene(makeScene(elements));
    expect(result).not.toBeNull();
    for (const el of result!.elements) {
      expect(el.x + el.width).toBeLessThanOrEqual(CANVAS_ABSOLUTE_MAX);
      expect(el.y + el.height).toBeLessThanOrEqual(CANVAS_ABSOLUTE_MAX);
    }
  });

  it('clamps oversized element dimensions (>800)', () => {
    const result = sanitizeScene(makeScene([makeRect({ width: 99_999, height: 99_999 })]));
    expect(result!.elements).toHaveLength(1);
    const el = result!.elements[0];
    expect(el.width).toBeLessThanOrEqual(800);
    expect(el.height).toBeLessThanOrEqual(800);
  });

  it('accepts a scene provided as a JSON string', () => {
    const scene = JSON.stringify(makeScene([makeRect()]));
    const result = sanitizeScene(scene);
    expect(result!.elements).toHaveLength(1);
  });

  it('handles arrow with huge relative points', () => {
    const arrow = {
      id:   'a1',
      type: 'arrow',
      x:    100,
      y:    100,
      width:  0,
      height: 0,
      strokeColor: '#000',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      roughness: 0,
      opacity: 100,
      angle: 0,
      seed: 1,
      version: 1,
      versionNonce: 2,
      isDeleted: false,
      boundElements: null,
      groupIds: [],
      frameId: null,
      roundness: null,
      points: [[0, 0], [90_000, 90_000]],
    };
    const result = sanitizeScene(makeScene([arrow]));
    expect(result!.elements).toHaveLength(1);
    const el = result!.elements[0];
    const pts: number[][] = el.points;
    for (const [px, py] of pts) {
      expect(Math.abs(px)).toBeLessThanOrEqual(1000); // POINT_MAX in sanitizeScene.ts
      expect(Math.abs(py)).toBeLessThanOrEqual(1000);
    }
  });

  it('attaches _sanitizerMeta to the result', () => {
    const result = sanitizeScene(makeScene([makeRect()]));
    expect(result!._sanitizerMeta).toBeDefined();
    const meta = result!._sanitizerMeta;
    expect(Number.isFinite(meta.sceneWidth)).toBe(true);
    expect(Number.isFinite(meta.sceneHeight)).toBe(true);
  });

  it('handles 100-node large scene without crash', () => {
    const elements = Array.from({ length: 100 }, (_, i) =>
      makeRect({ id: `r${i}`, x: (i % 10) * 220, y: Math.floor(i / 10) * 120 })
    );
    const result = sanitizeScene(makeScene(elements));
    expect(result).not.toBeNull();
    for (const el of result!.elements) {
      expect(elementBoundsOk(el)).toBe(true);
    }
  });
});

// ─── buildExcalidrawScene ─────────────────────────────────────────────────────

describe('buildExcalidrawScene', () => {

  it('returns empty elements for empty node list', () => {
    const result = buildExcalidrawScene({ nodes: [], edges: [] });
    expect(result.elements).toHaveLength(0);
  });

  it('builds a single-node scene', () => {
    const result = buildExcalidrawScene({
      nodes: [{ id: 'n1', label: 'Start' }],
      edges: [],
    });
    // Expect at least a rectangle + text element
    expect(result.elements.length).toBeGreaterThanOrEqual(1);
    const types = result.elements.map((e) => e.type);
    expect(types).toContain('rectangle');
    expect(types).toContain('text');
  });

  it('builds a linear chain of 5 nodes', () => {
    const nodes = Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}` }));
    const edges = Array.from({ length: 4 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}` }));
    const result = buildExcalidrawScene({ nodes, edges });
    expect(result.elements.some((e) => e.type === 'arrow')).toBe(true);
  });

  it('handles circular graphs without hanging (BFS terminates)', () => {
    // n0 → n1 → n2 → n0
    const nodes = [
      { id: 'n0', label: 'A' },
      { id: 'n1', label: 'B' },
      { id: 'n2', label: 'C' },
    ];
    const edges = [
      { from: 'n0', to: 'n1' },
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n0' }, // cycle
    ];
    // Must complete without hanging
    const result = buildExcalidrawScene({ nodes, edges });
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it('self-loop edge does not cause infinite loop', () => {
    const nodes = [{ id: 'n0', label: 'Loop' }];
    const edges = [{ from: 'n0', to: 'n0' }];
    const result = buildExcalidrawScene({ nodes, edges });
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it('caps nodes at MAX_NODES (50)', () => {
    const nodes = Array.from({ length: 100 }, (_, i) => ({ id: `n${i}`, label: `N${i}` }));
    const result = buildExcalidrawScene({ nodes, edges: [] });
    // Each node produces 2 elements (rect + text) → max 100 node-elements
    const rectCount = result.elements.filter((e) => e.type === 'rectangle').length;
    expect(rectCount).toBeLessThanOrEqual(50);
  });

  it('caps edges at MAX_EDGES (80)', () => {
    const nodeCount = 10;
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: `n${i}`, label: `N${i}` }));
    const edges: { from: string; to: string }[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = 0; j < nodeCount; j++) {
        if (i !== j) edges.push({ from: `n${i}`, to: `n${j}` });
      }
    }
    const result = buildExcalidrawScene({ nodes, edges });
    const arrowCount = result.elements.filter((e) => e.type === 'arrow').length;
    expect(arrowCount).toBeLessThanOrEqual(80);
  });

  it('produces all-finite coordinates for all elements', () => {
    const nodes = Array.from({ length: 20 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}` }));
    const edges = Array.from({ length: 15 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}` }));
    const result = buildExcalidrawScene({ nodes, edges });
    for (const el of result.elements) {
      expect(Number.isFinite(el.x)).toBe(true);
      expect(Number.isFinite(el.y)).toBe(true);
    }
  });

  it('scene → sanitize round-trip stays within canvas limits', () => {
    // Build a wide scene (many nodes in one layer) then sanitize
    const nodes = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, label: `N${i}` }));
    const built = buildExcalidrawScene({ nodes, edges: [] });
    const sanitized = sanitizeScene(built);
    expect(sanitized).not.toBeNull();
    for (const el of sanitized!.elements) {
      expect(el.x + el.width).toBeLessThanOrEqual(CANVAS_ABSOLUTE_MAX);
      expect(el.y + el.height).toBeLessThanOrEqual(CANVAS_ABSOLUTE_MAX);
    }
  });

  it('deep nested flowchart (10 levels) stays within canvas limits', () => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, label: `Level ${i}` }));
    const edges = Array.from({ length: 9 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}` }));
    const built = buildExcalidrawScene({ nodes, edges });
    const sanitized = sanitizeScene(built);
    expect(sanitized).not.toBeNull();
    for (const el of sanitized!.elements) {
      expect(elementBoundsOk(el)).toBe(true);
    }
  });

  it('ignores edges that reference non-existent node ids', () => {
    const nodes = [{ id: 'n0', label: 'Node' }];
    const edges = [{ from: 'n0', to: 'ghost' }];
    // Must not throw
    expect(() => buildExcalidrawScene({ nodes, edges })).not.toThrow();
  });
});

// ─── New: Dangling References & appState ─────────────────────────────────────

describe('sanitizeScene — dangling references', () => {

  it('clears containerId when the container element was removed (bad coords)', () => {
    // Rect with NaN x → will be removed. Text references it via containerId.
    const scene = makeScene([
      makeRect({ id: 'badRect', x: NaN }),          // will be removed
      {
        ...makeRect({ id: 'txt1', type: 'text', x: 100, y: 100, width: 80, height: 20 }),
        containerId: 'badRect',                      // dangling
      },
    ]);
    const result = sanitizeScene(scene);
    expect(result).not.toBeNull();
    // The text survives but its containerId should be cleared
    const text = result!.elements.find((e: any) => e.id === 'txt1');
    expect(text).toBeDefined();
    expect(text!.containerId).toBeNull();
  });

  it('removes dangling entries from boundElements when the bound element was removed', () => {
    // Text with NaN x → removed. Rect still has a boundElements reference to it.
    const scene = makeScene([
      makeRect({ id: 'badTxt', type: 'text', x: NaN, y: 100, width: 80, height: 20 }),
      {
        ...makeRect({ id: 'rect1' }),
        boundElements: [{ id: 'badTxt', type: 'text' }],
      },
    ]);
    const result = sanitizeScene(scene);
    expect(result).not.toBeNull();
    const rect = result!.elements.find((e: any) => e.id === 'rect1');
    expect(rect).toBeDefined();
    // Dangling reference should be cleaned
    expect(rect!.boundElements).toHaveLength(0);
  });

  it('preserves valid boundElements entries', () => {
    const scene = makeScene([
      makeRect({ id: 'txt1', type: 'text', width: 80, height: 20 }),
      {
        ...makeRect({ id: 'rect1' }),
        boundElements: [{ id: 'txt1', type: 'text' }],
      },
    ]);
    const result = sanitizeScene(scene);
    expect(result).not.toBeNull();
    const rect = result!.elements.find((e: any) => e.id === 'rect1');
    expect(rect!.boundElements).toHaveLength(1);
    expect(rect!.boundElements[0].id).toBe('txt1');
  });

  it('clears dangling startBinding on an arrow', () => {
    const arrow = {
      id: 'a1', type: 'arrow',
      x: 100, y: 100, width: 0, height: 0,
      strokeColor: '#000', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 1, roughness: 0,
      opacity: 100, angle: 0, seed: 1, version: 1,
      versionNonce: 2, isDeleted: false,
      boundElements: null, groupIds: [], frameId: null, roundness: null,
      points: [[0, 0], [100, 0]],
      startBinding: { elementId: 'ghost-node', focus: 0, gap: 0 },
      endBinding: null,
    };
    const scene = makeScene([arrow]);
    const result = sanitizeScene(scene);
    expect(result).not.toBeNull();
    const a = result!.elements.find((e: any) => e.id === 'a1');
    expect(a!.startBinding).toBeNull();
  });

  it('clears dangling endBinding on an arrow', () => {
    const arrow = {
      id: 'a2', type: 'arrow',
      x: 100, y: 100, width: 0, height: 0,
      strokeColor: '#000', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 1, roughness: 0,
      opacity: 100, angle: 0, seed: 1, version: 1,
      versionNonce: 2, isDeleted: false,
      boundElements: null, groupIds: [], frameId: null, roundness: null,
      points: [[0, 0], [100, 0]],
      startBinding: null,
      endBinding: { elementId: 'also-gone', focus: 0, gap: 0 },
    };
    const result = sanitizeScene(makeScene([arrow]));
    expect(result).not.toBeNull();
    const a = result!.elements.find((e: any) => e.id === 'a2');
    expect(a!.endBinding).toBeNull();
  });

  it('keeps valid startBinding/endBinding when target exists', () => {
    const rect  = makeRect({ id: 'target' });
    const arrow = {
      id: 'a3', type: 'arrow',
      x: 100, y: 100, width: 0, height: 0,
      strokeColor: '#000', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 1, roughness: 0,
      opacity: 100, angle: 0, seed: 1, version: 1,
      versionNonce: 2, isDeleted: false,
      boundElements: null, groupIds: [], frameId: null, roundness: null,
      points: [[0, 0], [100, 0]],
      startBinding: { elementId: 'target', focus: 0, gap: 0 },
      endBinding:   { elementId: 'target', focus: 0, gap: 0 },
    };
    const result = sanitizeScene(makeScene([rect, arrow]));
    expect(result).not.toBeNull();
    const a = result!.elements.find((e: any) => e.id === 'a3');
    expect(a!.startBinding?.elementId).toBe('target');
    expect(a!.endBinding?.elementId).toBe('target');
  });
});

describe('sanitizeScene — appState sanitization', () => {

  it('strips unsafe scrollX/scrollY from appState', () => {
    const scene = {
      ...makeScene([makeRect()]),
      appState: { scrollX: 999999, scrollY: -999999, viewBackgroundColor: '#000' },
    };
    const result = sanitizeScene(scene);
    expect(result).not.toBeNull();
    expect(result!.appState.scrollX).toBeUndefined();
    expect(result!.appState.scrollY).toBeUndefined();
    // Safe cosmetic key preserved
    expect(result!.appState.viewBackgroundColor).toBe('#000');
  });

  it('strips unsafe zoom from appState', () => {
    const scene = {
      ...makeScene([makeRect()]),
      appState: { zoom: { value: 99999 }, theme: 'dark' },
    };
    const result = sanitizeScene(scene);
    expect(result).not.toBeNull();
    expect(result!.appState.zoom).toBeUndefined();
    expect(result!.appState.theme).toBe('dark');
  });

  it('returns empty appState when scene has no appState', () => {
    const result = sanitizeScene(makeScene([makeRect()]));
    expect(result).not.toBeNull();
    expect(result!.appState).toBeDefined();
    expect(typeof result!.appState).toBe('object');
  });
});

describe('sanitizeScene — text and geometry sanitization', () => {

  it('clamps extreme fontSize on text elements', () => {
    const text = {
      ...makeRect({ id: 't1', type: 'text', width: 80, height: 20 }),
      fontSize: 99999,
      text: 'Hello',
    };
    const result = sanitizeScene(makeScene([text]));
    expect(result).not.toBeNull();
    const el = result!.elements.find((e: any) => e.id === 't1');
    expect(el!.fontSize).toBeLessThanOrEqual(200);
  });

  it('sanitizes NaN fontSize on text to a safe default', () => {
    const text = {
      ...makeRect({ id: 't2', type: 'text', width: 80, height: 20 }),
      fontSize: NaN,
      text: 'World',
    };
    const result = sanitizeScene(makeScene([text]));
    expect(result).not.toBeNull();
    const el = result!.elements.find((e: any) => e.id === 't2');
    expect(Number.isFinite(el!.fontSize)).toBe(true);
    expect(el!.fontSize).toBeGreaterThan(0);
  });

  it('sanitizes NaN angle to 0', () => {
    const result = sanitizeScene(makeScene([makeRect({ angle: NaN })]));
    expect(result).not.toBeNull();
    const el = result!.elements[0];
    expect(el.angle).toBe(0);
  });

  it('ensures groupIds is always an array', () => {
    const result = sanitizeScene(makeScene([makeRect({ groupIds: null as any })]));
    expect(result).not.toBeNull();
    expect(Array.isArray(result!.elements[0].groupIds)).toBe(true);
  });
});

describe('sanitizeScene — arrow endpoint absolute position guard', () => {

  it('clamps arrow endpoint that would exceed canvas absolute max', () => {
    // Arrow at x=100, with point [CANVAS_MAX + 1000, 0] → endpoint way off screen
    const CANVAS_MAX = 8_000;
    const arrow = {
      id: 'a_huge', type: 'arrow',
      x: 100, y: 100, width: 0, height: 0,
      strokeColor: '#000', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 1, roughness: 0,
      opacity: 100, angle: 0, seed: 1, version: 1,
      versionNonce: 2, isDeleted: false,
      boundElements: null, groupIds: [], frameId: null, roundness: null,
      points: [[0, 0], [CANVAS_MAX + 5000, 0]],  // endpoint at 13 100 — exceeds 8 000
    };
    const result = sanitizeScene(makeScene([arrow]));
    expect(result).not.toBeNull();
    const a = result!.elements.find((e: any) => e.id === 'a_huge');
    expect(a).toBeDefined();
    // The absolute x of the endpoint must be ≤ CANVAS_ABSOLUTE_MAX
    for (const [px] of a!.points) {
      expect(a!.x + px).toBeLessThanOrEqual(CANVAS_MAX);
    }
  });
});
