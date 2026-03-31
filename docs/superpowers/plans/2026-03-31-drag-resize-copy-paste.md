# Drag Resize & Copy/Paste Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-to-resize handles for shape and text layers, and copy/paste of any selected layer with toast feedback and correct z-order insertion.

**Architecture:** A DOM overlay (`#resize-overlay`) containing 8 handle divs sits inside `#canvas-wrap`, positioned to match the selected layer's bounding box after every render. A new `modules/resize.js` handles all resize drag logic. Copy/paste uses an in-memory `clipboard` variable in `app.js`, wired to toolbar buttons and keyboard shortcuts.

**Tech Stack:** Vanilla JS ES modules, HTML/CSS, canvas 2D API. No build step — open `frameforge/index.html` directly in a browser to test.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `frameforge/index.html` | Modify | Add `#resize-overlay` div with 8 `.rh` handle children |
| `frameforge/styles/components.css` | Modify | Resize overlay border + handle styles |
| `frameforge/modules/resize.js` | Create | All resize drag logic, `positionOverlay`, `hideOverlay` |
| `frameforge/app.js` | Modify | Import resize, wire `positionOverlay`/`hideOverlay`, clipboard, paste insertion |
| `frameforge/ui/text-toolbar.js` | Modify | Add copy + paste buttons and `setCanPaste()` |
| `frameforge/ui/shape-toolbar.js` | Modify | Add copy + paste buttons and `setCanPaste()` |
| `frameforge/ui/shell.js` | Modify | Add `Ctrl/Cmd+C` and `Ctrl/Cmd+V` keyboard handlers |

---

## Task 1: Add Resize Overlay HTML + CSS

**Files:**
- Modify: `frameforge/index.html`
- Modify: `frameforge/styles/components.css`

- [ ] **Step 1: Add the overlay div to index.html**

Inside `#canvas-wrap`, add the `#resize-overlay` div after `#safe-zone-overlay`. Replace:

```html
      <div id="safe-zone-overlay" aria-hidden="true"></div>
      <div id="text-toolbar"    style="display:none" aria-label="Text layer editor"    role="toolbar"></div>
```

With:

```html
      <div id="safe-zone-overlay" aria-hidden="true"></div>
      <div id="resize-overlay" aria-hidden="true">
        <div class="rh nw"></div>
        <div class="rh n"></div>
        <div class="rh ne"></div>
        <div class="rh e"></div>
        <div class="rh se"></div>
        <div class="rh s"></div>
        <div class="rh sw"></div>
        <div class="rh w"></div>
      </div>
      <div id="text-toolbar"    style="display:none" aria-label="Text layer editor"    role="toolbar"></div>
```

- [ ] **Step 2: Add CSS at the end of components.css**

Append to the very end of `frameforge/styles/components.css`:

```css

/* ── Resize overlay ──────────────────────────────────────────────────────── */

#resize-overlay {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
  border: 1px dashed rgba(255, 255, 255, 0.7);
  display: none;
  z-index: 12;
}

.rh {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.5);
  box-sizing: border-box;
  pointer-events: auto;
}

.rh.nw { top: -4px; left: -4px;               cursor: nw-resize; }
.rh.n  { top: -4px; left: calc(50% - 4px);    cursor: n-resize;  }
.rh.ne { top: -4px; right: -4px;              cursor: ne-resize; }
.rh.e  { top: calc(50% - 4px); right: -4px;  cursor: e-resize;  }
.rh.se { bottom: -4px; right: -4px;           cursor: se-resize; }
.rh.s  { bottom: -4px; left: calc(50% - 4px); cursor: s-resize;  }
.rh.sw { bottom: -4px; left: -4px;            cursor: sw-resize; }
.rh.w  { top: calc(50% - 4px); left: -4px;   cursor: w-resize;  }
```

- [ ] **Step 3: Verify HTML renders**

Open `frameforge/index.html` in a browser. Open DevTools → Elements. Confirm `#resize-overlay` exists inside `#canvas-wrap` with 8 `.rh` children. The overlay should not be visible yet (it has no `display:none` default — it needs one; add `style="display:none"` to the div opening tag in index.html):

```html
      <div id="resize-overlay" aria-hidden="true" style="display:none">
```

- [ ] **Step 4: Commit**

```bash
git add frameforge/index.html frameforge/styles/components.css
git commit -m "feat: add resize overlay HTML and CSS"
```

---

## Task 2: Create `modules/resize.js`

**Files:**
- Create: `frameforge/modules/resize.js`

- [ ] **Step 1: Create the file with full implementation**

Create `frameforge/modules/resize.js`:

```javascript
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
  const [ax, ay] = ZONE_ANCHORS[pos.zone ?? 'top-left'] ?? [0, 0];
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
    bounds = computeTextBounds(ctx, layer, w, h, project);
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
  overlayEl.style.display   = '';
}

/**
 * Hide the resize overlay (e.g. when no layer is selected or a non-resizable layer is selected).
 * @param {HTMLElement} overlayEl
 */
export function hideOverlay(overlayEl) {
  overlayEl.style.display   = 'none';
  overlayEl.dataset.layerId = '';
}
```

- [ ] **Step 2: Verify no import errors**

Open `frameforge/index.html` in browser. Open DevTools Console. There should be no errors about `resize.js` (it's not imported yet, so nothing loads it — that's fine for now). Confirm the console is clean.

- [ ] **Step 3: Commit**

```bash
git add frameforge/modules/resize.js
git commit -m "feat: add resize.js module with drag-to-resize logic"
```

---

## Task 3: Wire Resize Module into `app.js`

**Files:**
- Modify: `frameforge/app.js`

- [ ] **Step 1: Add import at top of app.js**

Find the existing import line:
```javascript
import { initDrag, destroyDrag } from './modules/drag.js';
```

Add the resize import directly after it:
```javascript
import { initResize, positionOverlay, hideOverlay } from './modules/resize.js';
```

- [ ] **Step 2: Add DOM reference for resizeOverlayEl**

Find where existing DOM references are grabbed. There is a block near the top of the init function. Find:
```javascript
  const canvasWrapEl   = document.getElementById('canvas-wrap');
```

Add after it:
```javascript
  const resizeOverlayEl = document.getElementById('resize-overlay');
```

- [ ] **Step 3: Update positionToolbar() to also position the overlay**

Find the `positionToolbar` function. Replace the entire function body:

```javascript
  function positionToolbar() {
    const layerId = renderer.selectedLayerId;
    if (!layerId || !project.isLoaded) { hideOverlay(resizeOverlayEl); return; }
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame) return;
    const layer = (frame.layers ?? []).find(l => l.id === layerId);
    if (!layer) return;

    const ctx = mainCanvas.getContext('2d');
    const w   = mainCanvas.width;
    const h   = mainCanvas.height;

    if (layer.type === 'text') {
      const bounds = computeTextBounds(ctx, layer, w, h, project);
      positionElement(textToolbarEl, bounds);
      positionOverlay(resizeOverlayEl, layer, mainCanvas, project);
    } else if (layer.type === 'shape') {
      const bounds = computeShapeBounds(ctx, layer, w, h, project);
      positionElement(shapeToolbarEl, bounds);
      positionOverlay(resizeOverlayEl, layer, mainCanvas, project);
    } else if (layer.type === 'image') {
      positionElementRight(imageToolbarEl);
      hideOverlay(resizeOverlayEl);
    } else if (layer.type === 'overlay') {
      positionElementRight(overlayToolbarEl);
      hideOverlay(resizeOverlayEl);
    }
  }
```

The original function looked up `ctx`, `w`, `h` inline per branch. This replaces those per-branch lookups with a single upfront lookup and adds the `positionOverlay`/`hideOverlay` calls.

- [ ] **Step 4: Update onLayerClick() to hide overlay for non-resizable layers**

Find `function onLayerClick(layer)`. In the `else if (layer?.type === 'image')` branch and `else if (layer?.type === 'overlay')` branch, and the final `else` (no layer / null), add `hideOverlay(resizeOverlayEl)`.

Replace the entire function:

```javascript
  function onLayerClick(layer) {
    renderer.selectedLayerId = layer?.id ?? null;

    // Hide all toolbars, then show the right one
    textToolbar.hide();
    shapeToolbar.hide();
    imageToolbar.hide();
    overlayToolbar.hide();

    if (layer?.type === 'text') {
      textToolbar.setProjectFonts(project.getFontFamilies?.() ?? []);
      textToolbar.show(layer);
      requestAnimationFrame(() => positionToolbar());
    } else if (layer?.type === 'shape') {
      shapeToolbar.show(layer);
      requestAnimationFrame(() => positionToolbar());
    } else if (layer?.type === 'image') {
      hideOverlay(resizeOverlayEl);
      imageToolbar.show(layer);
      requestAnimationFrame(() => positionToolbar());
    } else if (layer?.type === 'overlay') {
      hideOverlay(resizeOverlayEl);
      overlayToolbar.show(layer);
      requestAnimationFrame(() => positionToolbar());
    } else {
      hideOverlay(resizeOverlayEl);
    }

    layersPanel.setSelectedId(layer?.id ?? null);
    renderCurrentFrame();
  }
```

- [ ] **Step 5: Add initResize call after initDrag**

Find the block that calls `initDrag`:
```javascript
    initDrag(
      mainCanvas,
      project,
      () => project.activeFrameIndex,
      () => { renderer.isDragging = true; renderCurrentFrame(); positionToolbar(); },
      (frameIndex) => { renderer.isDragging = false; filmstrip.renderOne(frameIndex, project); },
      onLayerClick,
    );
```

Add `initResize` immediately after it:
```javascript
    initResize(
      resizeOverlayEl,
      mainCanvas,
      project,
      () => project.activeFrameIndex,
      () => { renderer.isDragging = true; renderCurrentFrame(); positionToolbar(); },
      (frameIndex) => { renderer.isDragging = false; filmstrip.renderOne(frameIndex, project); },
    );
```

- [ ] **Step 6: Hide overlay on frame navigation and project load/clear**

Find `function selectFrame(index)`. It has a block that clears selection and hides toolbars:
```javascript
    renderer.selectedLayerId = null;
    textToolbar.hide();
    shapeToolbar.hide();
    imageToolbar.hide();
    overlayToolbar.hide();
```

Add `hideOverlay(resizeOverlayEl);` after the overlayToolbar.hide() line in `selectFrame`.

Find the `loadProjectData` function. It has the same pattern of clearing selection. Add `hideOverlay(resizeOverlayEl);` there too (there may be multiple places that clear selection in this function — add it after each `overlayToolbar.hide()` call).

Also find the `onDeleteProject` / clear handler at the bottom that hides toolbars and add `hideOverlay(resizeOverlayEl);` there.

- [ ] **Step 7: Verify resize handles appear and work**

Open `frameforge/index.html`. Load a project. Click a shape layer. Confirm:
- A dashed white border appears around the shape with 8 white square handles at the corners and edges.
- Hovering over a handle shows the correct resize cursor.
- Dragging a corner handle changes both width and height.
- Dragging an edge handle changes only that dimension.
- The shape's visual bounds update live as you drag.
- On release, the shape stays at its new size (persisted via localStorage).

Click a text layer. Confirm:
- Handles appear around the text bounding box.
- Dragging a left/right edge changes `max_width_pct` (text reflows).
- Dragging a top/bottom edge changes `line_height` (line spacing changes).
- Dragging a corner scales both font size and width proportionally.

Click an image or overlay layer. Confirm handles disappear.

- [ ] **Step 8: Commit**

```bash
git add frameforge/app.js
git commit -m "feat: wire resize overlay into app — position, show, hide"
```

---

## Task 4: Add Copy/Paste Buttons to `text-toolbar.js`

**Files:**
- Modify: `frameforge/ui/text-toolbar.js`

- [ ] **Step 1: Add copy and paste buttons to the HTML in _build()**

Find the delete button line in `_build()`:
```javascript
        <button class="tt-btn tt-delete" data-action="delete" title="Delete layer">🗑</button>
```

Replace it with:
```javascript
        <div class="tt-sep"></div>
        <button class="tt-btn" data-action="copy"  title="Copy layer">Copy</button>
        <button class="tt-btn" data-action="paste" title="Paste layer" disabled>Paste</button>
        <button class="tt-btn tt-delete" data-action="delete" title="Delete layer">🗑</button>
```

- [ ] **Step 2: Add ref for the paste button in _build()**

After the existing `this._shadowBtn = ...` ref line, add:

```javascript
    this._pasteBtn = this._el.querySelector('[data-action="paste"]');
```

- [ ] **Step 3: Add onCopy and onPaste callbacks to the constructor**

In the constructor, after the `this.onDelete = null;` line, add:
```javascript
    /** @type {((layer: object) => void) | null} */
    this.onCopy = null;
    /** @type {(() => void) | null} */
    this.onPaste = null;
```

- [ ] **Step 4: Handle 'copy' and 'paste' in _handleAction()**

In `_handleAction`, after the `case 'delete':` block, add:
```javascript
      case 'copy':
        this.onCopy?.(this._layer); break;
      case 'paste':
        this.onPaste?.(); break;
```

- [ ] **Step 5: Add setCanPaste() method**

In the "Public API" section, after the `setProjectFonts(families)` method, add:

```javascript
  /**
   * Enable or disable the paste button (disable when clipboard is empty).
   * @param {boolean} enabled
   */
  setCanPaste(enabled) {
    if (this._pasteBtn) this._pasteBtn.disabled = !enabled;
  }
```

- [ ] **Step 6: Verify in browser**

Load project, click a text layer. Confirm "Copy" and "Paste" buttons appear in the toolbar next to the delete button. "Paste" should be disabled (greyed). Clicking "Copy" should do nothing yet (callback not wired) but should not error. Check DevTools console — no errors.

- [ ] **Step 7: Commit**

```bash
git add frameforge/ui/text-toolbar.js
git commit -m "feat: add copy/paste buttons to text toolbar"
```

---

## Task 5: Add Copy/Paste Buttons to `shape-toolbar.js`

**Files:**
- Modify: `frameforge/ui/shape-toolbar.js`

- [ ] **Step 1: Add copy and paste buttons to the HTML in _build()**

Find the delete button in `_build()`:
```javascript
        <button class="st-btn st-delete" data-action="delete" title="Delete shape">🗑</button>
```

Replace it with:
```javascript
        <div class="st-sep"></div>
        <button class="st-btn" data-action="copy"  title="Copy layer">Copy</button>
        <button class="st-btn" data-action="paste" title="Paste layer" disabled>Paste</button>
        <button class="st-btn st-delete" data-action="delete" title="Delete shape">🗑</button>
```

- [ ] **Step 2: Add ref for the paste button in _build()**

After the `this._hVal = ...` ref line, add:
```javascript
    this._pasteBtn = this._el.querySelector('[data-action="paste"]');
```

- [ ] **Step 3: Add onCopy and onPaste callbacks to the constructor**

After `this.onDelete = null;`, add:
```javascript
    /** @type {((layer: object) => void) | null} */
    this.onCopy = null;
    /** @type {(() => void) | null} */
    this.onPaste = null;
```

- [ ] **Step 4: Handle 'copy' and 'paste' in _handleAction()**

After the `case 'delete':` block:
```javascript
      case 'copy':
        this.onCopy?.(this._layer); break;
      case 'paste':
        this.onPaste?.(); break;
```

- [ ] **Step 5: Add setCanPaste() method**

After the `hide()` method, add:
```javascript
  /**
   * Enable or disable the paste button.
   * @param {boolean} enabled
   */
  setCanPaste(enabled) {
    if (this._pasteBtn) this._pasteBtn.disabled = !enabled;
  }
```

- [ ] **Step 6: Verify in browser**

Load project, click a shape layer. Confirm "Copy" and "Paste" buttons appear. "Paste" is disabled. No console errors.

- [ ] **Step 7: Commit**

```bash
git add frameforge/ui/shape-toolbar.js
git commit -m "feat: add copy/paste buttons to shape toolbar"
```

---

## Task 6: Wire Clipboard Logic + Keyboard Shortcuts

**Files:**
- Modify: `frameforge/app.js`
- Modify: `frameforge/ui/shell.js`

- [ ] **Step 1: Add clipboard state variable to app.js**

Find the comment `// ── Layer factories` near the top of the init function. Add immediately before it:
```javascript
  // ── Clipboard (in-memory only, not persisted) ─────────────────────────────
  let clipboard = null;
```

- [ ] **Step 2: Add copySelectedLayer() function to app.js**

Add this function after the clipboard variable declaration:
```javascript
  function copySelectedLayer() {
    const layerId = renderer.selectedLayerId;
    if (!layerId || !project.isLoaded) return;
    const frame = project.data?.frames?.[project.activeFrameIndex];
    const layer = frame?.layers?.find(l => l.id === layerId);
    if (!layer) return;
    clipboard = JSON.parse(JSON.stringify(layer));
    textToolbar.setCanPaste(true);
    shapeToolbar.setCanPaste(true);
    toasts.success('Copied', '');
  }
```

- [ ] **Step 3: Add pasteLayer() function to app.js**

Add after `copySelectedLayer()`:
```javascript
  function pasteLayer() {
    if (!clipboard || !project.isLoaded) return;
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame) return;

    const pasted = JSON.parse(JSON.stringify(clipboard));
    pasted.id = makeUniqueId(pasted.type, frame);

    // Insert at the correct z-order position (same logic as smartInsertIndex).
    const layers  = (frame.layers ??= []);
    const type    = pasted.type;
    let insertAt  = -1;

    // Find last index of same type
    for (let i = layers.length - 1; i >= 0; i--) {
      if (layers[i].type === type) { insertAt = i + 1; break; }
    }

    // If no same-type layer found, use the type boundary
    if (insertAt === -1) {
      if (type === 'text') {
        insertAt = layers.length;
      } else if (type === 'shape') {
        const firstText = layers.findIndex(l => l.type === 'text');
        insertAt = firstText >= 0 ? firstText : layers.length;
      } else if (type === 'overlay') {
        const firstShape = layers.findIndex(l => l.type === 'shape' || l.type === 'text');
        insertAt = firstShape >= 0 ? firstShape : layers.length;
      } else {
        insertAt = 0; // image: at the bottom
      }
    }

    layers.splice(insertAt, 0, pasted);
    project.save();
    layersPanel.render(frame);
    layersPanel.setSelectedId(pasted.id);
    onLayerClick(pasted);
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    toasts.success('Pasted', '');
  }
```

- [ ] **Step 4: Wire toolbar callbacks in app.js**

Find `textToolbar.onDelete = (layer) => {`. Add before it:
```javascript
  textToolbar.onCopy  = (layer) => copySelectedLayer();
  textToolbar.onPaste = ()      => pasteLayer();
```

Find `shapeToolbar.onDelete = (layer) => {`. Add before it:
```javascript
  shapeToolbar.onCopy  = (layer) => copySelectedLayer();
  shapeToolbar.onPaste = ()      => pasteLayer();
```

- [ ] **Step 5: Add copyLayer and pasteLayer to registerKeyboardShortcuts call**

Find the call to `registerKeyboardShortcuts({...})`. Add two new handlers at the end of the object:
```javascript
      copyLayer:  copySelectedLayer,
      pasteLayer: pasteLayer,
```

The full call should look like:
```javascript
  registerKeyboardShortcuts({
    nextFrame:         () => navigateFrame(1),
    prevFrame:         () => navigateFrame(-1),
    exportCurrent:     handleExportCurrentFrame,
    exportAll:         handleExportAllFrames,
    toggleSafeZone:    () => { ... },
    toggleLayersPanel: () => { ... },
    rerender:          () => renderCurrentFrame(),
    copyLayer:         copySelectedLayer,
    pasteLayer:        pasteLayer,
  });
```

- [ ] **Step 6: Add keyboard handling in shell.js**

Open `frameforge/ui/shell.js`. Find the `registerKeyboardShortcuts` function signature comment:
```javascript
 * @param {function} handlers.rerender
 */
```

Add after it (in the JSDoc):
```javascript
 * @param {function} [handlers.copyLayer]
 * @param {function} [handlers.pasteLayer]
```

Find the `switch (e.key)` block. After the `case 'r':` block (the last case before the closing `}`), add:
```javascript
      case 'c':
      case 'C':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handlers.copyLayer?.();
        }
        break;
      case 'v':
      case 'V':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handlers.pasteLayer?.();
        }
        break;
```

- [ ] **Step 7: Verify full copy/paste flow in browser**

Load a project with multiple frames.

**Test 1 — Button copy/paste within same frame:**
1. Click a shape layer. Click "Copy" in the toolbar. Confirm toast "Copied" appears. Confirm "Paste" button becomes enabled.
2. Click "Paste". Confirm toast "Pasted" appears. Confirm a new identical shape appears on the canvas, directly on top of the original. Confirm it is now the selected layer.
3. Open the Layers panel. Confirm the pasted layer appears after the original in the shape group (before any text layers).

**Test 2 — Keyboard copy/paste:**
1. Click anywhere outside inputs to ensure nothing has keyboard focus.
2. Click a text layer. Press `Ctrl+C` (or `Cmd+C` on Mac). Confirm "Copied" toast.
3. Navigate to a different frame (arrow key or filmstrip click).
4. Press `Ctrl+V`. Confirm "Pasted" toast. Confirm the text layer appears in the new frame.

**Test 3 — Layer ordering:**
1. Copy a shape layer and paste it. Confirm in the Layers panel it inserts after the last existing shape and before any text layers.
2. Copy a text layer and paste it. Confirm it appears at the end (top of the stack).

**Test 4 — Paste button disabled initially:**
Reload the page. Load a project. Click a layer. Confirm "Paste" button is disabled before anything is copied.

- [ ] **Step 8: Commit**

```bash
git add frameforge/app.js frameforge/ui/shell.js
git commit -m "feat: add copy/paste with clipboard, toolbar buttons, keyboard shortcuts"
```

---

## Self-Review Checklist (run before calling done)

- [ ] Resize handles appear for shape and text layers, not for image/overlay
- [ ] Shape corner drag changes both width and height; edge drags change one dimension
- [ ] Text corner drag changes both font size and max_width_pct proportionally
- [ ] Text w/e edge drag changes max_width_pct only
- [ ] Text n/s edge drag changes line_height only
- [ ] Overlay hides when switching frames or deselecting
- [ ] Copy toast fires; Paste button enables after copy
- [ ] Paste toast fires; pasted layer is selected and positioned on top of original
- [ ] Layer z-order after paste: shapes after last shape, texts after last text
- [ ] Ctrl+C / Ctrl+V work when no input is focused
- [ ] No console errors throughout all scenarios
