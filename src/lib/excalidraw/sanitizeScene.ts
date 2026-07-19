/**
 * Excalidraw Scene Sanitizer
 *
 * Validates, repairs, clamps, and normalizes AI-generated Excalidraw scene JSON.
 * Prevents "Canvas exceeds max size" runtime errors in Excalidraw.
 *
 * Browser canvas hard limit: 32 767 × 32 767 px.
 * We target a safe maximum of 5 000 px on each axis (well within the limit,
 * accounting for device pixel ratios up to 3× and Excalidraw's internal zoom).
 *
 * Pipeline order:
 *   1. Parse & deep-copy
 *   2. Per-element filter + NaN/Infinity/bad-type rejection
 *   3. Per-element dimension repair (negative / zero / oversized)
 *   4. Outlier coordinate clamping
 *   5. Point array clamping
 *   6. Dangling reference cleanup (containerId / boundElements)
 *   7. Scene-level bounds calculation
 *   8. Origin normalization (shift to start at 100, 100)
 *   9. Proportional downscaling
 *  10. Absolute canvas footprint guard (post-scale per-element clamp)
 *  11. appState sanitization (zero out unsafe scroll/zoom values)
 *  12. Dev logging
 */

const IS_DEV = process.env.NODE_ENV === 'development';

export interface SanitizerLog {
  originalBounds: { minX: number; minY: number; maxX: number; maxY: number };
  finalBounds:    { minX: number; minY: number; maxX: number; maxY: number };
  removedElementsCount:  number;
  clampedCoordsCount:    number;
  danglingRefsRemoved:   number;
  scalingFactor:         number;
}

const VALID_TYPES = new Set([
  'rectangle',
  'ellipse',
  'diamond',
  'arrow',
  'line',
  'freedraw',
  'text',
  'selection',
  'image',
]);

/** Maximum coordinate value (x or y) for any single element origin. */
const COORD_MIN = -4000;
const COORD_MAX =  4000;

/** Maximum *dimension* for any individual element (width / height). */
const SIZE_MAX = 800;

/** Relative point offset clamp for arrows/lines. */
const POINT_MAX = 1000;

/** Maximum allowed scene span on either axis before proportional down-scaling. */
const SCENE_SIZE_MAX = 4000;

/**
 * Absolute canvas footprint guard — the final per-element clamp after all
 * transformations.  Must stay well below 32 767 ÷ 3 (device pixel ratio) ≈ 10 900.
 * We use 8 000 for additional headroom.
 */
const CANVAS_ABSOLUTE_MAX = 8_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeNumber(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/** Returns true if `val` is a safe, finite JavaScript number. */
function isSafeFinite(val: unknown): val is number {
  return val !== null && val !== undefined &&
    !(typeof val === 'number' && !Number.isFinite(val)) &&
    Number.isFinite(Number(val));
}

/** Derive the bounding-box span of an arrow/line from its relative `points`. */
function arrowSpan(el: any): { w: number; h: number } {
  if (!Array.isArray(el.points) || el.points.length < 2) return { w: 0, h: 0 };
  let minPx = 0, maxPx = 0, minPy = 0, maxPy = 0;
  for (const pt of el.points) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const px = safeNumber(pt[0], 0);
    const py = safeNumber(pt[1], 0);
    minPx = Math.min(minPx, px); maxPx = Math.max(maxPx, px);
    minPy = Math.min(minPy, py); maxPy = Math.max(maxPy, py);
  }
  return { w: maxPx - minPx, h: maxPy - minPy };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function sanitizeScene(
  rawScene: string | Record<string, any> | null | undefined
): Record<string, any> | null {
  if (!rawScene) return null;

  // ── 0. Parse & deep-copy ──────────────────────────────────────────────────
  let scene: Record<string, any>;
  try {
    if (typeof rawScene === 'string') {
      scene = JSON.parse(rawScene);
    } else {
      // Deep-copy so we never mutate the caller's object.
      // NOTE: JSON.stringify converts NaN → null and ±Infinity → null.
      // We detect these sentinel values explicitly in step 2.
      scene = JSON.parse(JSON.stringify(rawScene));
    }
  } catch (err) {
    if (IS_DEV) console.error('[Excalidraw Sanitizer] Failed to parse JSON:', err);
    return null;
  }

  if (!scene || typeof scene !== 'object') return null;

  const rawElements = scene.elements;
  if (!Array.isArray(rawElements)) {
    return { ...scene, elements: [], _sanitizerMeta: { sceneWidth: 0, sceneHeight: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 } };
  }

  let removedElementsCount = 0;
  let clampedCoordsCount   = 0;
  let danglingRefsRemoved  = 0;

  // ── 1. Per-element filter, validate, and repair ───────────────────────────
  const validElements: any[] = [];
  const validCoordsX: number[] = [];
  const validCoordsY: number[] = [];

  for (const el of rawElements) {
    if (!el || typeof el !== 'object') { removedElementsCount++; continue; }

    // Type check
    if (typeof el.type !== 'string' || !VALID_TYPES.has(el.type)) {
      removedElementsCount++;
      continue;
    }

    // ── Coordinate validation ────────────────────────────────────────────────
    // After JSON.parse(JSON.stringify(...)), NaN and ±Infinity become null.
    // We reject both the original forms AND the null sentinel.
    const rawX = el.x;
    const rawY = el.y;

    if (!isSafeFinite(rawX) || !isSafeFinite(rawY)) {
      removedElementsCount++;
      continue;
    }

    let x = Number(rawX);
    let y = Number(rawY);

    // ── Dimension validation ─────────────────────────────────────────────────
    const defaultW = el.type === 'text' ? 100 : 120;
    const defaultH = el.type === 'text' ?  20 :  50;

    let width  = isSafeFinite(el.width)  ? Number(el.width)  : defaultW;
    let height = isSafeFinite(el.height) ? Number(el.height) : defaultH;

    // For arrows / lines: use points span as the effective bounding box,
    // since Excalidraw positions arrows via relative `points` not w/h.
    // (Arrow w/h are set to 0 by buildExcalidrawScene; the span is computed
    // from the points to check for oversized relative offsets.)
    if (el.type === 'arrow' || el.type === 'line') {
      const span = arrowSpan(el);
      // Only override w/h if the raw values are 0 or unreliable
      if (Math.abs(width)  < 1) width  = span.w;
      if (Math.abs(height) < 1) height = span.h;
    }

    // Negative dimensions: flip and adjust origin
    if (width  < 0) { x -= Math.abs(width);  width  = Math.abs(width);  }
    if (height < 0) { y -= Math.abs(height); height = Math.abs(height); }

    // Ensure positive minimum
    if (width  < 1) width  = defaultW;
    if (height < 1) height = defaultH;

    // Per-element size clamp
    if (width  > SIZE_MAX) { width  = SIZE_MAX; clampedCoordsCount++; }
    if (height > SIZE_MAX) { height = SIZE_MAX; clampedCoordsCount++; }

    // Write back repaired values
    el.x      = x;
    el.y      = y;
    el.width  = width;
    el.height = height;

    // Sanitize angle — must be a finite number (defaults to 0)
    if (!isSafeFinite(el.angle)) el.angle = 0;

    // Sanitize fontSize for text elements
    if (el.type === 'text') {
      const fs = Number(el.fontSize);
      if (!Number.isFinite(fs) || fs <= 0 || fs > 200) el.fontSize = 14;
    }

    // Sanitize groupIds / boundElements to be arrays
    if (!Array.isArray(el.groupIds))       el.groupIds       = [];
    if (el.boundElements !== null && !Array.isArray(el.boundElements)) {
      el.boundElements = null;
    }

    validElements.push(el);

    // Track coordinates within the expected cluster for outlier detection
    if (x >= COORD_MIN && x <= COORD_MAX) validCoordsX.push(x);
    if (y >= COORD_MIN && y <= COORD_MAX) validCoordsY.push(y);
  }

  if (validElements.length === 0) {
    return {
      ...scene,
      elements: [],
      _sanitizerMeta: { sceneWidth: 0, sceneHeight: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 },
    };
  }

  // ── 2. Outlier coordinate clamping ────────────────────────────────────────
  const centerX = validCoordsX.length > 0
    ? validCoordsX.reduce((a, b) => a + b, 0) / validCoordsX.length
    : 0;
  const centerY = validCoordsY.length > 0
    ? validCoordsY.reduce((a, b) => a + b, 0) / validCoordsY.length
    : 0;

  for (const el of validElements) {
    let x = el.x;
    let y = el.y;

    const outlierX = Math.abs(x - centerX) > 3000 || x < COORD_MIN || x > COORD_MAX;
    const outlierY = Math.abs(y - centerY) > 3000 || y < COORD_MIN || y > COORD_MAX;

    if (outlierX) { x = centerX; clampedCoordsCount++; }
    if (outlierY) { y = centerY; clampedCoordsCount++; }

    el.x = Math.max(COORD_MIN, Math.min(COORD_MAX, x));
    el.y = Math.max(COORD_MIN, Math.min(COORD_MAX, y));
  }

  // ── 3. Point array clamping (arrows / lines) ──────────────────────────────
  for (const el of validElements) {
    if (!Array.isArray(el.points)) continue;
    el.points = el.points.map((pt: any) => {
      if (!Array.isArray(pt) || pt.length < 2) return [0, 0];
      let px = safeNumber(pt[0], 0);
      let py = safeNumber(pt[1], 0);
      const cpx = Math.max(-POINT_MAX, Math.min(POINT_MAX, px));
      const cpy = Math.max(-POINT_MAX, Math.min(POINT_MAX, py));
      if (cpx !== px || cpy !== py) clampedCoordsCount++;
      return [cpx, cpy];
    });
    // Ensure the points array starts at [0, 0]
    if (el.points.length >= 1) {
      const [firstX, firstY] = el.points[0] as [number, number];
      if (firstX !== 0 || firstY !== 0) {
        el.points = el.points.map(([px, py]: [number, number]) => [px - firstX, py - firstY]);
        el.x += firstX;
        el.y += firstY;
      }
    }
  }

  // ── 4. Dangling reference cleanup ─────────────────────────────────────────
  // If any elements were removed during filtering, their IDs may still be
  // referenced by surviving elements' `containerId` or `boundElements`.
  // Excalidraw performs internal lookups on these IDs; a missing container
  // can cause it to compute Infinity coordinates, triggering the canvas crash.
  const validIdSet = new Set(validElements.map((el: any) => el.id).filter(Boolean));

  for (const el of validElements) {
    // Clean up dangling containerId
    if (el.containerId && !validIdSet.has(el.containerId)) {
      el.containerId = null;
      danglingRefsRemoved++;
    }
    // Clean up dangling boundElements entries
    if (Array.isArray(el.boundElements) && el.boundElements.length > 0) {
      const before = el.boundElements.length;
      el.boundElements = el.boundElements.filter(
        (be: any) => be && typeof be === 'object' && validIdSet.has(be.id)
      );
      danglingRefsRemoved += before - el.boundElements.length;
    }
    // Clean up dangling startBinding / endBinding (arrows)
    if (el.startBinding && !validIdSet.has(el.startBinding.elementId)) {
      el.startBinding = null;
      danglingRefsRemoved++;
    }
    if (el.endBinding && !validIdSet.has(el.endBinding.elementId)) {
      el.endBinding = null;
      danglingRefsRemoved++;
    }
  }

  // ── 5. Scene bounds calculation ───────────────────────────────────────────
  let minX =  Infinity;
  let minY =  Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of validElements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    // For arrows (w/h may be 0 or span-derived), also factor in point extents
    const span = (el.type === 'arrow' || el.type === 'line') ? arrowSpan(el) : { w: el.width, h: el.height };
    maxX = Math.max(maxX, el.x + Math.max(el.width, span.w));
    maxY = Math.max(maxY, el.y + Math.max(el.height, span.h));
  }

  const origMinX = minX, origMinY = minY;
  const origMaxX = maxX, origMaxY = maxY;

  // ── 6. Normalize: shift so top-left is at (100, 100) ─────────────────────
  const shiftX = 100 - minX;
  const shiftY = 100 - minY;

  for (const el of validElements) {
    el.x += shiftX;
    el.y += shiftY;
  }

  minX = 100; maxX += shiftX;
  minY = 100; maxY += shiftY;

  // ── 7. Proportional downscaling ───────────────────────────────────────────
  let sceneWidth  = maxX - minX;
  let sceneHeight = maxY - minY;
  let scalingFactor = 1;

  if (sceneWidth > SCENE_SIZE_MAX || sceneHeight > SCENE_SIZE_MAX) {
    scalingFactor = Math.min(
      SCENE_SIZE_MAX / Math.max(sceneWidth, 1),
      SCENE_SIZE_MAX / Math.max(sceneHeight, 1)
    );

    for (const el of validElements) {
      el.x      = 100 + (el.x - 100) * scalingFactor;
      el.y      = 100 + (el.y - 100) * scalingFactor;
      el.width  = el.width  * scalingFactor;
      el.height = el.height * scalingFactor;

      if (Array.isArray(el.points)) {
        el.points = el.points.map((pt: number[]) => [
          pt[0] * scalingFactor,
          pt[1] * scalingFactor,
        ]);
      }
    }

    maxX = 100 + sceneWidth  * scalingFactor;
    maxY = 100 + sceneHeight * scalingFactor;
    sceneWidth  = maxX - minX;
    sceneHeight = maxY - minY;
  }

  // ── 8. Absolute canvas footprint guard ───────────────────────────────────
  // Final per-element clamp AFTER all transformations.
  // For arrows: also check that origin + max-point-offset stays in bounds.
  for (const el of validElements) {
    // Origin clamp
    if (el.x < 0) { el.x = 0; clampedCoordsCount++; }
    if (el.y < 0) { el.y = 0; clampedCoordsCount++; }
    if (el.x > CANVAS_ABSOLUTE_MAX) { el.x = CANVAS_ABSOLUTE_MAX - el.width; clampedCoordsCount++; }
    if (el.y > CANVAS_ABSOLUTE_MAX) { el.y = CANVAS_ABSOLUTE_MAX - el.height; clampedCoordsCount++; }

    // Extent clamp (right/bottom edge)
    if (el.x + el.width > CANVAS_ABSOLUTE_MAX) {
      el.width = Math.max(1, CANVAS_ABSOLUTE_MAX - el.x);
      clampedCoordsCount++;
    }
    if (el.y + el.height > CANVAS_ABSOLUTE_MAX) {
      el.height = Math.max(1, CANVAS_ABSOLUTE_MAX - el.y);
      clampedCoordsCount++;
    }

    // For arrows/lines: ensure the absolute endpoint stays in bounds
    if (Array.isArray(el.points)) {
      el.points = el.points.map((pt: number[]) => {
        const absX = el.x + pt[0];
        const absY = el.y + pt[1];
        let px = pt[0];
        let py = pt[1];
        if (absX > CANVAS_ABSOLUTE_MAX || absX < 0) {
          px = Math.max(0, Math.min(CANVAS_ABSOLUTE_MAX, absX)) - el.x;
          clampedCoordsCount++;
        }
        if (absY > CANVAS_ABSOLUTE_MAX || absY < 0) {
          py = Math.max(0, Math.min(CANVAS_ABSOLUTE_MAX, absY)) - el.y;
          clampedCoordsCount++;
        }
        return [px, py];
      });
    }
  }

  // ── 9. appState sanitization ─────────────────────────────────────────────
  // AI-generated scenes can include scrollX/scrollY/zoom values that cause
  // Excalidraw to render at absurd offsets. Strip them out entirely — the
  // renderer uses scrollToContent:true to compute its own safe viewport.
  const safeAppState: Record<string, any> = {};
  if (scene.appState && typeof scene.appState === 'object') {
    // Allow only safe cosmetic properties
    const ALLOWED_APP_STATE_KEYS = new Set([
      'viewBackgroundColor',
      'theme',
      'currentItemFontFamily',
      'currentItemFontSize',
    ]);
    for (const [k, v] of Object.entries(scene.appState as Record<string, any>)) {
      if (ALLOWED_APP_STATE_KEYS.has(k)) safeAppState[k] = v;
    }
  }

  // ── 10. Dev logging ───────────────────────────────────────────────────────
  if (IS_DEV) {
    const changed = removedElementsCount > 0 || clampedCoordsCount > 0 ||
      danglingRefsRemoved > 0 || scalingFactor < 1 ||
      origMinX !== 100 || origMinY !== 100;

    if (changed) {
      const report: SanitizerLog = {
        originalBounds: { minX: origMinX, minY: origMinY, maxX: origMaxX, maxY: origMaxY },
        finalBounds:    { minX, minY, maxX, maxY },
        removedElementsCount,
        clampedCoordsCount,
        danglingRefsRemoved,
        scalingFactor,
      };
      console.group('[Excalidraw Sanitizer] Changes applied');
      console.log('Report:', JSON.stringify(report, null, 2));
      console.log(`Scene: ${Math.round(sceneWidth)}w × ${Math.round(sceneHeight)}h px`);
      console.table(validElements.map((el: any) => ({
        id:     el.id ?? '?',
        type:   el.type,
        x:      +el.x.toFixed(1),
        y:      +el.y.toFixed(1),
        width:  +el.width.toFixed(1),
        height: +el.height.toFixed(1),
      })));
      console.groupEnd();
    }
  }

  return {
    ...scene,
    elements: validElements,
    appState: safeAppState,
    _sanitizerMeta: {
      sceneWidth:  Math.round(sceneWidth),
      sceneHeight: Math.round(sceneHeight),
      minX: Math.round(minX),
      minY: Math.round(minY),
      maxX: Math.round(maxX),
      maxY: Math.round(maxY),
    },
  };
}
