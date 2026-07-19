'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { sanitizeScene } from '@/lib/excalidraw/sanitizeScene';
import { ErrorBoundary }  from './ErrorBoundary';

/**
 * ExcalidrawDiagram — renders an Excalidraw scene JSON in read-only mode.
 *
 * Safety layers (inner → outer):
 *  1. sanitizeScene()      — NaN/Inf rejection, dangling-ref cleanup, coord clamping,
 *                            scene normalization, appState whitelist.
 *  2. Scene-bounds guard   — Rejects scenes whose total span exceeds SCENE_MAX_PX.
 *  3. Element-level audit  — Rejects any element whose absolute coords/dims exceed
 *                            per-element safe limits (final defence before canvas write).
 *  4. <ErrorBoundary>      — Catches any Excalidraw runtime throw and shows a
 *                            friendly fallback instead of crashing the page.
 */

const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Maximum scene span (width or height) we allow to reach Excalidraw.
 * Must match or be less than the sanitizer's CANVAS_ABSOLUTE_MAX (8 000).
 */
const SCENE_MAX_PX = 6_000;

/**
 * Maximum absolute value for any single element's origin coordinate.
 * Elements that escape sanitization with coords beyond this are blocked here.
 */
const ELEMENT_COORD_MAX = 10_000;

/**
 * Maximum width or height for any single element passed to Excalidraw.
 * The sanitizer clamps to 800 px; this is a looser "last line of defence" gate.
 */
const ELEMENT_SIZE_MAX = 5_000;

interface ExcalidrawDiagramProps {
  scene:          string | Record<string, any>;
  diagramType?:   string;
  onRegenerate?:  () => void;
}

// Lazy-load the Excalidraw React component (client-only, heavy bundle)
const ExcalidrawLazy = React.lazy(() =>
  import('@excalidraw/excalidraw').then((mod) => ({ default: mod.Excalidraw }))
);

// ─── Fallback UIs ─────────────────────────────────────────────────────────────

function UnableToRender({ reason }: { reason?: string }) {
  return (
    <div
      style={{
        padding: '24px 20px',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 14,
        fontSize: '13px',
        color: '#a1a1aa',
        textAlign: 'center',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span style={{ fontWeight: 800, color: '#e4e4e7', fontSize: '14px' }}>
        Visualization is too large to render
      </span>
      {reason && (
        <span
          style={{
            color: '#fca5a5',
            fontSize: '12px',
            fontFamily: 'monospace',
            maxWidth: 460,
            wordBreak: 'break-word',
          }}
        >
          {reason}
        </span>
      )}
      <span style={{ color: '#71717a', fontSize: '12px', maxWidth: 380 }}>
        The explanation below contains the complete learning content.
      </span>
    </div>
  );
}

function LoadingDiagram() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#52525b',
        fontSize: '12px',
      }}
    >
      Loading diagram…
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExcalidrawDiagram({
  scene,
  diagramType,
  onRegenerate,
}: ExcalidrawDiagramProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ── 1. Parse + sanitize ──────────────────────────────────────────────────
  const parsed = useMemo(() => sanitizeScene(scene), [scene]);

  if (!parsed) {
    return (
      <UnableToRender reason="Scene JSON could not be parsed or contained no valid elements." />
    );
  }

  // ── 2. Scene-level bounds guard ───────────────────────────────────────────
  const meta = parsed._sanitizerMeta as
    | { sceneWidth: number; sceneHeight: number; minX: number; minY: number; maxX: number; maxY: number }
    | undefined;

  let sceneWidth  = meta?.sceneWidth  ?? 0;
  let sceneHeight = meta?.sceneHeight ?? 0;

  // Recompute bounds if meta is absent (defensive fallback)
  if (!meta && Array.isArray(parsed.elements) && parsed.elements.length > 0) {
    let minX =  Infinity, minY =  Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const el of parsed.elements as any[]) {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width  ?? 0));
      maxY = Math.max(maxY, el.y + (el.height ?? 0));
    }
    sceneWidth  = Number.isFinite(maxX - minX) ? maxX - minX : 0;
    sceneHeight = Number.isFinite(maxY - minY) ? maxY - minY : 0;
  }

  if (IS_DEV) {
    console.log(
      `[ExcalidrawDiagram] Scene bounds — ` +
      `minX=${meta?.minX ?? '?'} maxX=${meta?.maxX ?? '?'} ` +
      `minY=${meta?.minY ?? '?'} maxY=${meta?.maxY ?? '?'} ` +
      `width=${sceneWidth} height=${sceneHeight}`
    );
  }

  if (sceneWidth > SCENE_MAX_PX || sceneHeight > SCENE_MAX_PX) {
    if (IS_DEV) {
      console.error(
        `[ExcalidrawDiagram] Scene bounds (${sceneWidth} × ${sceneHeight}) exceed ` +
        `SCENE_MAX_PX (${SCENE_MAX_PX}). Refusing to render.`
      );
    }
    return (
      <UnableToRender
        reason={
          `Scene dimensions ${Math.round(sceneWidth)} × ${Math.round(sceneHeight)} px ` +
          `exceed the browser canvas limit.`
        }
      />
    );
  }

  // ── 3. SSR guard ─────────────────────────────────────────────────────────
  if (!isClient) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 120,
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: 12, color: '#52525b', fontSize: '12px',
        }}
      >
        Loading diagram…
      </div>
    );
  }

  // Strip internal meta before handing to Excalidraw
  const { _sanitizerMeta: _dropped, ...cleanScene } = parsed as any;
  const elements: any[] = cleanScene.elements || [];
  const appState: any   = cleanScene.appState  || {};

  // ── 4. Final per-element audit ────────────────────────────────────────────
  // This is the LAST line of defence before Excalidraw touches the canvas.
  // The sanitizer should have already clamped everything; this catches any
  // edge-case that escapes (e.g., a code path that bypassed sanitizeScene).
  let unsafeEl: any | null = null;
  for (const el of elements) {
    const cx = Number(el.x);
    const cy = Number(el.y);
    const cw = Number(el.width);
    const ch = Number(el.height);

    const bad =
      !Number.isFinite(cx) || !Number.isFinite(cy) ||
      !Number.isFinite(cw) || !Number.isFinite(ch) ||
      Math.abs(cx) > ELEMENT_COORD_MAX ||
      Math.abs(cy) > ELEMENT_COORD_MAX ||
      cw > ELEMENT_SIZE_MAX ||
      ch > ELEMENT_SIZE_MAX;

    if (bad) { unsafeEl = el; break; }
  }

  // ── 5. Dev logging (console.group / console.table / console.dir) ──────────
  if (IS_DEV) {
    console.group(`[ExcalidrawDiagram] Pre-render scene audit (${elements.length} elements)`);
    console.table(
      elements.map((el: any) => ({
        id:     el.id  ?? '?',
        type:   el.type,
        x:      el.x,
        y:      el.y,
        width:  el.width,
        height: el.height,
      }))
    );
    console.dir({ elements, appState, sceneWidth, sceneHeight });
    if (unsafeEl) {
      console.error('[ExcalidrawDiagram] UNSAFE element detected:', unsafeEl);
    }
    console.groupEnd();
  }

  if (unsafeEl) {
    return (
      <UnableToRender
        reason={
          `Element "${unsafeEl.id ?? '?'}" (${unsafeEl.type}) has invalid geometry: ` +
          `x=${unsafeEl.x}, y=${unsafeEl.y}, w=${unsafeEl.width}, h=${unsafeEl.height}.`
        }
      />
    );
  }

  // ── 6. Render ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: '100%',
        height: 320,
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <ErrorBoundary diagramType={diagramType ?? 'excalidraw'} onRegenerate={onRegenerate}>
        <React.Suspense fallback={<LoadingDiagram />}>
          {/*
           * key forces Excalidraw to unmount + remount when the scene changes,
           * preventing stale canvas state from a previous render being reused.
           */}
          <ExcalidrawLazy
            key={`${sceneWidth}-${sceneHeight}-${elements.length}`}
            initialData={{
              elements,
              appState: {
                ...appState,
                // Always override with safe cosmetic values — never trust
                // AI-generated scroll/zoom/cursor state.
                viewBackgroundColor: '#0d0d0f',
                theme: 'dark',
              },
              scrollToContent: true,
            }}
            viewModeEnabled={true}
            zenModeEnabled={true}
            gridModeEnabled={false}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: false,
                clearCanvas:              false,
                export:                   false,
                loadScene:                false,
                saveToActiveFile:         false,
                toggleTheme:              false,
              },
              tools: { image: false },
            }}
          />
        </React.Suspense>
      </ErrorBoundary>
    </div>
  );
}
