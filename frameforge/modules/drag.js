/**
 * drag.js — Text layer drag-to-reposition for FrameForge.
 *
 * Exports:
 *   initDrag(canvas, project, getFrameIndex, onRender, onComplete, onLayerClick)
 *   destroyDrag(canvas)
 */

import { computeTextBounds, computeShapeBounds } from './layers.js';

// ── Zone anchor table (matches layers.js ZONE_ANCHORS) ────────────────────

const ZONE_ANCHORS = {
  'top-left':      [0,   0  ],
  'top-center':    [50,  0  ],
  'top-right':     [100, 0  ],
  'middle-left':   [0,   50 ],
  'middle-center': [50,  50 ],
  'middle-right':  [100, 50 ],
  'bottom-left':   [0,   100],
  'bottom-center': [50,  100],
  'bottom-right':  [100, 100],
};

const SNAP_THRESHOLD_PCT = 5; // snap when within 5% of canvas size

// ── Canvas coordinate helper ──────────────────────────────────────────────

function canvasPct(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width)  * 100,
    y: ((event.clientY - rect.top)  / rect.height) * 100,
  };
}

// ── Hit testing ───────────────────────────────────────────────────────────

/**
 * Find the topmost text layer at the given canvas percentage coordinates.
 * Returns the layer object or null.
 */
function hitTestTextLayer(pct, frame, canvas, project) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const layers = frame.layers ?? [];

  // Iterate in reverse render order (last = top-most)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer.type !== 'text') continue;

    const bounds = computeTextBounds(ctx, layer, w, h, project);
    if (!bounds) continue;

    // Convert pixel bounds to percentages
    const topPct    = (bounds.top    / h) * 100;
    const bottomPct = (bounds.bottom / h) * 100;
    const leftPct   = (bounds.left   / w) * 100;
    const rightPct  = (bounds.right  / w) * 100;

    // Add a small padding to make small text easier to grab (2% of canvas)
    const pad = 2;

    if (
      pct.x >= leftPct   - pad &&
      pct.x <= rightPct  + pad &&
      pct.y >= topPct    - pad &&
      pct.y <= bottomPct + pad
    ) {
      return layer;
    }
  }
  return null;
}

/**
 * Find the topmost shape layer at the given canvas percentage coordinates.
 * Returns the layer object or null.
 */
function hitTestShapeLayer(pct, frame, canvas, project) {
  const w   = canvas.width;
  const h   = canvas.height;
  const ctx = canvas.getContext('2d');
  const layers = frame.layers ?? [];

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer.type !== 'shape') continue;

    // polyline and path have no position anchor — not draggable
    if (layer.shape === 'polyline' || layer.shape === 'path') continue;

    let bounds;
    try {
      bounds = computeShapeBounds(ctx, layer, w, h, project);
    } catch { continue; }
    if (!bounds) continue;

    const topPct    = (bounds.top    / h) * 100;
    const bottomPct = (bounds.bottom / h) * 100;
    const leftPct   = (bounds.left   / w) * 100;
    const rightPct  = (bounds.right  / w) * 100;
    const pad = 2;

    if (
      pct.x >= leftPct   - pad &&
      pct.x <= rightPct  + pad &&
      pct.y >= topPct    - pad &&
      pct.y <= bottomPct + pad
    ) {
      return layer;
    }
  }
  return null;
}

/**
 * Find the topmost image layer at the given canvas percentage coordinates.
 * Image layers fill the entire frame — always a hit if visible.
 */
function hitTestImageLayer(pct, frame, canvas, project) {
  const layers = frame.layers || [];
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer.type !== 'image') continue;
    if (layer.visible === false) continue;
    return layer; // image fills entire frame — always a hit
  }
  return null;
}

/**
 * Find the topmost overlay layer at the given canvas percentage coordinates.
 * Overlay layers fill the entire frame — always a hit if visible.
 */
function hitTestOverlayLayer(pct, frame, canvas, project) {
  const layers = frame.layers || [];
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer.type !== 'overlay') continue;
    if (layer.visible === false) continue;
    return layer; // overlay fills entire frame — always a hit
  }
  return null;
}

/**
 * Find the topmost draggable layer (text, shape, image, or overlay) at the given canvas % coords.
 * Text and shape layers take priority if they overlap.
 */
function hitTestLayer(pct, frame, canvas, project) {
  return hitTestTextLayer(pct, frame, canvas, project)
      ?? hitTestShapeLayer(pct, frame, canvas, project)
      ?? hitTestImageLayer(pct, frame, canvas, project)
      ?? hitTestOverlayLayer(pct, frame, canvas, project);
}

// ── Zone snap ─────────────────────────────────────────────────────────────

/**
 * Given current absolute position (absPct.x, absPct.y),
 * find the nearest zone anchor within snap threshold.
 * Returns zone name string or null.
 */
function findSnapZone(absPct) {
  let closest = null;
  let minDist = Infinity;

  for (const [zone, [ax, ay]] of Object.entries(ZONE_ANCHORS)) {
    const dx = absPct.x - ax;
    const dy = absPct.y - ay;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = zone;
    }
  }

  return minDist <= SNAP_THRESHOLD_PCT ? closest : null;
}

/**
 * Compute the absolute canvas position (as %) of a layer's position anchor.
 * For zone mode: zone anchor + offsets.
 * For absolute mode: x_pct, y_pct.
 */
function getAbsolutePct(pos) {
  if (!pos || pos.mode === 'absolute' || pos.x_pct != null) {
    return { x: pos?.x_pct ?? 0, y: pos?.y_pct ?? 0 };
  }
  const [ax, ay] = ZONE_ANCHORS[pos.zone ?? 'top-left'] ?? [0, 0];
  return {
    x: ax + (pos.offset_x_pct ?? 0),
    y: ay + (pos.offset_y_pct ?? 0),
  };
}

// ── Main drag logic ───────────────────────────────────────────────────────

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Project} project
 * @param {() => number} getFrameIndex — returns current active frame index
 * @param {() => void} onRender — called during drag to re-render the frame
 * @param {(frameIndex: number) => void} onComplete — called on mouseup to update thumbnail
 * @param {(layer: object | null) => void} onLayerClick — called on click (not drag) with layer or null
 */
export function initDrag(canvas, project, getFrameIndex, onRender, onComplete, onLayerClick) {
  const state = {
    active:         false,
    layerId:        null,
    frameIndex:     null,
    startMousePct:  null,
    startPos:       null,   // deep clone of layer.position at drag start
    mode:           null,   // 'absolute' | 'zone'
    rafPending:     false,
    startClientX:   0,      // for click distance check
    startClientY:   0,      // for click distance check
    wasDrag:        false,  // true if mouse moved >= 5px during this press
  };

  // ── Hover cursor feedback ────────────────────────────────────────────────

  function onMouseMove(e) {
    if (state.active) {
      // Drag tracking is handled by window mousemove — just update cursor
      return;
    }

    // Hover: change cursor when over a text layer
    const frameIndex = getFrameIndex();
    const frame = project.data?.frames?.[frameIndex];
    if (!frame || !project.isLoaded) {
      canvas.style.cursor = '';
      return;
    }

    const pct = canvasPct(e, canvas);
    const hit = hitTestLayer(pct, frame, canvas, project);
    canvas.style.cursor = hit ? 'grab' : '';
  }

  // ── Mousedown — start drag ───────────────────────────────────────────────

  function onMouseDown(e) {
    if (e.button !== 0) return; // left button only
    if (!project.isLoaded) return;

    // Reset click-tracking on every mousedown
    state.startClientX = e.clientX;
    state.startClientY = e.clientY;
    state.wasDrag      = false;

    const frameIndex = getFrameIndex();
    const frame = project.data?.frames?.[frameIndex];
    if (!frame) return;

    const pct = canvasPct(e, canvas);
    const layer = hitTestLayer(pct, frame, canvas, project);
    if (!layer) return;

    e.preventDefault();
    canvas.style.cursor = 'grabbing';

    const pos = layer.position ?? {};
    const isAbsolute = pos.mode === 'absolute' || pos.x_pct != null;

    state.active        = true;
    state.layerId       = layer.id;
    state.frameIndex    = frameIndex;
    state.startMousePct = pct;
    state.startPos      = JSON.parse(JSON.stringify(pos)); // deep clone
    state.mode          = isAbsolute ? 'absolute' : 'zone';

    window.addEventListener('mousemove', handleDrag);
  }

  // ── Mousemove — update position ──────────────────────────────────────────

  function handleDrag(e) {
    if (!state.active) return;

    const dxPx = e.clientX - state.startClientX;
    const dyPx = e.clientY - state.startClientY;
    if (Math.sqrt(dxPx * dxPx + dyPx * dyPx) >= 5) state.wasDrag = true;

    const currentPct = canvasPct(e, canvas);
    const dx = currentPct.x - state.startMousePct.x;
    const dy = currentPct.y - state.startMousePct.y;

    const frame = project.data?.frames?.[state.frameIndex];
    if (!frame) return;

    const layer = frame.layers?.find(l => l.id === state.layerId);
    if (!layer) return;

    // Image layers: drag sets the focal point (crop center), not a position anchor
    if (layer.type === 'image') {
      layer.position = {
        x_pct: Math.round(Math.max(0, Math.min(100, currentPct.x))),
        y_pct: Math.round(Math.max(0, Math.min(100, currentPct.y)))
      };
      onRender();
      state.rafPending = false;
      return;
    }

    if (state.mode === 'absolute') {
      const newX = Math.max(0, Math.min(100, (state.startPos.x_pct ?? 0) + dx));
      const newY = Math.max(0, Math.min(100, (state.startPos.y_pct ?? 0) + dy));

      // Check snap
      const snapZone = findSnapZone({ x: newX, y: newY });
      if (snapZone) {
        layer.position = { zone: snapZone, offset_x_pct: 0, offset_y_pct: 0 };
        canvas.style.cursor = 'crosshair';
        state.mode = 'zone'; // switched to zone
      } else {
        layer.position = { ...state.startPos, x_pct: newX, y_pct: newY };
        canvas.style.cursor = 'grabbing';
      }
    } else {
      // zone mode: update offsets
      const newOffsetX = (state.startPos.offset_x_pct ?? 0) + dx;
      const newOffsetY = (state.startPos.offset_y_pct ?? 0) + dy;

      // Compute the absolute position to check for zone snap
      const currentZone = layer.position?.zone ?? state.startPos.zone ?? 'top-left';
      const [ax, ay] = ZONE_ANCHORS[currentZone] ?? [0, 0];
      const absX = ax + newOffsetX;
      const absY = ay + newOffsetY;

      // Clamp absolute position so the layer stays on canvas
      const clampedAbsX = Math.max(0, Math.min(95, absX));
      const clampedAbsY = Math.max(0, Math.min(95, absY));
      const clampedOffsetX = clampedAbsX - ax;
      const clampedOffsetY = clampedAbsY - ay;

      const snapZone = findSnapZone({ x: clampedAbsX, y: clampedAbsY });
      if (snapZone && snapZone !== currentZone) {
        layer.position = { zone: snapZone, offset_x_pct: 0, offset_y_pct: 0 };
        canvas.style.cursor = 'crosshair';
      } else {
        layer.position = {
          ...(layer.position ?? {}),
          zone: currentZone,
          offset_x_pct: clampedOffsetX,
          offset_y_pct: clampedOffsetY,
        };
        canvas.style.cursor = 'grabbing';
      }
    }

    // Trigger re-render via RAF (skip if one is already queued)
    if (!state.rafPending) {
      state.rafPending = true;
      requestAnimationFrame(() => {
        state.rafPending = false;
        if (!state.active) return;
        onRender();
      });
    }
  }

  // ── Mouseup — commit position ────────────────────────────────────────────

  function onMouseUp(e) {
    if (!state.active) return;

    window.removeEventListener('mousemove', handleDrag);

    state.active     = false;
    state.wasDrag    = false;
    canvas.style.cursor = '';

    // Save project to localStorage
    project.save();

    // Notify app to update filmstrip thumbnail
    onComplete(state.frameIndex);

    // For image layers: re-fire selection so the image toolbar appears after focal-point drag
    if (state.layerId) {
      const _frame = project.data?.frames?.[state.frameIndex];
      const _layer = _frame?.layers?.find(l => l.id === state.layerId);
      if (_layer?.type === 'image') onLayerClick(_layer);
    }

    state.layerId    = null;
    state.frameIndex = null;
    state.startPos   = null;
    state.mode       = null;
  }

  // ── Click detection ───────────────────────────────────────────────────────

  function onCanvasClick(e) {
    if (state.wasDrag) return; // was a drag, not a click — ignore
    if (!onLayerClick) return;

    const frameIndex = getFrameIndex();
    const frame = project.data?.frames?.[frameIndex];
    if (!frame || !project.isLoaded) {
      onLayerClick(null);
      return;
    }

    const pct = canvasPct(e, canvas);
    const layer = hitTestLayer(pct, frame, canvas, project);
    onLayerClick(layer ?? null);
  }

  // ── Wire events ───────────────────────────────────────────────────────────

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click',     onCanvasClick);
  window.addEventListener('mouseup',  onMouseUp); // window to catch mouseup outside canvas

  // Store handlers on canvas element for cleanup
  canvas._dragHandlers = { onMouseDown, onMouseMove, onMouseUp, handleDrag, onCanvasClick };
}

/**
 * Remove drag event listeners from a canvas.
 */
export function destroyDrag(canvas) {
  const h = canvas._dragHandlers;
  if (!h) return;
  canvas.removeEventListener('mousedown', h.onMouseDown);
  canvas.removeEventListener('mousemove', h.onMouseMove);
  canvas.removeEventListener('click',     h.onCanvasClick);
  window.removeEventListener('mouseup',   h.onMouseUp);
  window.removeEventListener('mousemove', h.handleDrag);
  delete canvas._dragHandlers;
}
