/**
 * resize.js — Drag-to-resize for shape and text layers.
 *
 * Exports:
 *   initResize(overlayEl, canvas, project, getFrameIndex, onRender, onComplete)
 *   positionOverlay(overlayEl, layer, canvas, project)
 *   hideOverlay(overlayEl)
 */

import { computeTextBounds, computeShapeBounds } from './layers.js';

const ZONE_ANCHORS = {
  'top-left':      [0,   0  ], 'top-center':    [50,  0  ], 'top-right':     [100, 0  ],
  'middle-left':   [0,   50 ], 'middle-center': [50,  50 ], 'middle-right':  [100, 50 ],
  'bottom-left':   [0,   100], 'bottom-center': [50,  100], 'bottom-right':  [100, 100],
};

// Convert a mouse event to canvas-percentage coordinates.
function canvasPct(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width)  * 100,
    y: ((event.clientY - rect.top)  / rect.height) * 100,
  };
}

// Convert zone/offset position to absolute x_pct/y_pct in place. Mirrors shape-toolbar._toAbsolutePos.
function toAbsolutePos(layer) {
  const pos = (layer.position ??= {});
  if (pos.x_pct != null && pos.y_pct != null) return pos;
  const [ax, ay] = ZONE_ANCHORS[pos.zone] ?? [50, 50];
  pos.x_pct = ax + (pos.offset_x_pct ?? 0);
  pos.y_pct = ay + (pos.offset_y_pct ?? 0);
  delete pos.mode;
  delete pos.zone;
  delete pos.offset_x_pct;
  delete pos.offset_y_pct;
  return pos;
}

// Apply delta to a shape layer's position + dimensions based on handle direction.
function applyShapeResize(layer, dir, dx, dy, start) {
  const dims = (layer.dimensions ??= {});
  const pos  = (layer.position  ??= {});

  let x = start.x_pct;
  let y = start.y_pct;
  let w = start.width_pct;
  let h = start.height_pct;

  // Left edges: right boundary stays fixed, left boundary moves.
  if (dir === 'nw' || dir === 'w' || dir === 'sw') {
    const newW = Math.max(1, w - dx);
    x += (w - newW);
    w  = newW;
  }
  // Right edges: left boundary stays fixed, right boundary moves.
  if (dir === 'ne' || dir === 'e' || dir === 'se') {
    w = Math.max(1, w + dx);
  }
  // Top edges: bottom boundary stays fixed, top boundary moves.
  if (dir === 'nw' || dir === 'n' || dir === 'ne') {
    const newH = Math.max(2, h - dy);
    y += (h - newH);
    h  = newH;
  }
  // Bottom edges: top boundary stays fixed, bottom boundary moves.
  if (dir === 'sw' || dir === 's' || dir === 'se') {
    h = Math.max(2, h + dy);
  }

  pos.x_pct       = x;
  pos.y_pct       = y;
  dims.width_pct  = w;
  dims.height_pct = h;
}

// Apply delta to a text layer's properties based on handle direction.
function applyTextResize(layer, dir, dx, dy, start) {
  const isCorner = ['nw', 'ne', 'sw', 'se'].includes(dir);
  const isHoriz  = dir === 'e' || dir === 'w';
  const isVert   = dir === 'n' || dir === 's';

  if (isCorner || isHoriz) {
    // Left-side handles shrink width on rightward drag; right-side handles grow it.
    const newWidth = (dir === 'w' || dir === 'nw' || dir === 'sw')
      ? Math.max(10, start.max_width_pct - dx)
      : Math.max(10, start.max_width_pct + dx);
    layer.max_width_pct = newWidth;

    if (isCorner && start.max_width_pct > 0) {
      // Scale font size proportionally to the width change.
      const scale   = newWidth / start.max_width_pct;
      const newSize = Math.max(1.5, Math.min(25, start.size_pct * scale));
      (layer.font ??= {}).size_pct = parseFloat(newSize.toFixed(2));
    }
  }

  if (isVert) {
    // Top handle: drag up (negative dy) increases line_height.
    // Bottom handle: drag down (positive dy) increases line_height.
    const rawLH = (dir === 'n')
      ? start.line_height - dy * 0.02
      : start.line_height + dy * 0.02;
    (layer.font ??= {}).line_height = parseFloat(
      Math.max(0.8, Math.min(2.5, rawLH)).toFixed(2)
    );
  }
}

/**
 * Wire resize drag events onto the overlay's handle elements.
 *
 * @param {HTMLElement}       overlayEl    — #resize-overlay
 * @param {HTMLCanvasElement} canvas       — the main preview canvas
 * @param {object}            project      — Project instance (has .data, .save())
 * @param {() => number}      getFrameIndex — returns the active frame index
 * @param {() => void}        onRender     — re-render + reposition after each tick
 * @param {(fi: number) => void} onComplete — called on mouseup to update filmstrip
 */
export function initResize(overlayEl, canvas, project, getFrameIndex, onRender, onComplete) {
  const state = {
    active:        false,
    handle:        null,
    layerId:       null,
    frameIndex:    null,
    startMousePct: null,
    startDims:     null,  // snapshot of the relevant layer props at drag start
    rafPending:    false,
  };

  overlayEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const handleEl = e.target.closest('.rh');
    if (!handleEl) return;

    // Derive handle direction from the second class on the element (the first is 'rh').
    const dir = [...handleEl.classList].find(c => c !== 'rh');
    if (!dir) return;

    e.preventDefault();
    e.stopPropagation(); // do not let drag.js see this mousedown

    const frameIndex = getFrameIndex();
    const frame = project.data?.frames?.[frameIndex];
    if (!frame) return;

    const layerId = overlayEl.dataset.layerId;
    const layer   = frame.layers?.find(l => l.id === layerId);
    if (!layer) return;

    state.active        = true;
    state.handle        = dir;
    state.layerId       = layerId;
    state.frameIndex    = frameIndex;
    state.startMousePct = canvasPct(e, canvas);

    if (layer.type === 'shape') {
      const pos = toAbsolutePos(layer); // converts zone → absolute in place
      state.startDims = {
        x_pct:      pos.x_pct,
        y_pct:      pos.y_pct,
        width_pct:  layer.dimensions?.width_pct  ?? 10,
        height_pct: layer.dimensions?.height_pct ?? 10,
      };
    } else if (layer.type === 'text') {
      state.startDims = {
        max_width_pct: layer.max_width_pct    ?? 80,
        size_pct:      layer.font?.size_pct   ?? 5,
        line_height:   layer.font?.line_height ?? 1.2,
      };
    }

    window.removeEventListener('mousemove', handleDrag);
    window.removeEventListener('mouseup', handleUp);
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', handleUp, { once: true });
  });

  function handleDrag(e) {
    if (!state.active) return;
    const frame = project.data?.frames?.[state.frameIndex];
    if (!frame) return;
    const layer = frame.layers?.find(l => l.id === state.layerId);
    if (!layer) return;

    const cur = canvasPct(e, canvas);
    const dx  = cur.x - state.startMousePct.x;
    const dy  = cur.y - state.startMousePct.y;

    if (layer.type === 'shape') {
      applyShapeResize(layer, state.handle, dx, dy, state.startDims);
    } else if (layer.type === 'text') {
      applyTextResize(layer, state.handle, dx, dy, state.startDims);
    }

    if (!state.rafPending) {
      state.rafPending = true;
      requestAnimationFrame(() => {
        state.rafPending = false;
        if (!state.active) return;
        onRender(); // re-render + positionToolbar (which repositions overlay too)
      });
    }
  }

  function handleUp() {
    if (!state.active) return;
    window.removeEventListener('mousemove', handleDrag);
    state.active    = false;
    project.save();
    onComplete(state.frameIndex);
    state.layerId   = null;
    state.handle    = null;
    state.startDims = null;
  }
}

/**
 * Position and show the resize overlay over the given layer.
 * Call this after every render cycle when a resizable layer is selected.
 * If the layer is not resizable or bounds can't be computed, hides the overlay.
 *
 * @param {HTMLElement}       overlayEl
 * @param {object}            layer       — the selected layer object
 * @param {HTMLCanvasElement} canvas      — main canvas (parentElement must be #canvas-wrap)
 * @param {object}            project
 */
export function positionOverlay(overlayEl, layer, canvas, project) {
  if (!layer || (layer.type !== 'shape' && layer.type !== 'text')) {
    hideOverlay(overlayEl);
    return;
  }

  const ctx = canvas.getContext('2d');
  const w   = canvas.width;
  const h   = canvas.height;
  let bounds;

  if (layer.type === 'text') {
    try { bounds = computeTextBounds(ctx, layer, w, h, project); }
    catch { bounds = null; }
  } else {
    try { bounds = computeShapeBounds(ctx, layer, w, h, project); }
    catch { bounds = null; }
  }

  if (!bounds) { hideOverlay(overlayEl); return; }

  // Scale from canvas pixels to CSS pixels, offset by canvas position inside canvas-wrap.
  const canvasRect = canvas.getBoundingClientRect();
  const wrapRect   = canvas.parentElement.getBoundingClientRect();
  const scaleX     = canvasRect.width  / w;
  const scaleY     = canvasRect.height / h;
  const offsetLeft = canvasRect.left - wrapRect.left;
  const offsetTop  = canvasRect.top  - wrapRect.top;

  overlayEl.style.left   = `${Math.round(offsetLeft + bounds.left  * scaleX)}px`;
  overlayEl.style.top    = `${Math.round(offsetTop  + bounds.top   * scaleY)}px`;
  overlayEl.style.width  = `${Math.round((bounds.right  - bounds.left) * scaleX)}px`;
  overlayEl.style.height = `${Math.round((bounds.bottom - bounds.top)  * scaleY)}px`;
  overlayEl.dataset.layerId = layer.id;
  overlayEl.style.display   = 'block';
}

/**
 * Hide the resize overlay (e.g. when no layer is selected or a non-resizable layer is selected).
 * @param {HTMLElement} overlayEl
 */
export function hideOverlay(overlayEl) {
  overlayEl.style.display   = 'none';
  overlayEl.dataset.layerId = '';
}
