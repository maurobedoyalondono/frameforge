# Text Layer Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-canvas text layer selection and editing (content, font size, container width, delete) via a persistent toolbar above the canvas, and fix drag jump/disappearance bugs.

**Architecture:** Six tasks in dependency order: fix drag bugs first, then add click detection to the drag system, then add a selection indicator to the renderer, then build the toolbar component, then add HTML/CSS, then wire everything in app.js. Each task is independently testable.

**Tech Stack:** Vanilla JavaScript ES6 modules, HTML5 Canvas, no build step. No test framework — verification is manual in a browser.

---

## File Map

| File | Change |
|---|---|
| `modules/drag.js` | Fix zone clamping + out-of-canvas drag; add `onLayerClick` callback + click detection |
| `modules/renderer.js` | Add `selectedLayerId` property; draw selection indicator after layers |
| `ui/text-toolbar.js` | **New** — TextToolbar class: build HTML, bind events, expose `show/hide/onChange/onDelete` |
| `index.html` | Add `<div id="text-toolbar">` between toolbar header and main |
| `styles/components.css` | Add text toolbar styles |
| `app.js` | Import TextToolbar; pass `onLayerClick` to `initDrag`; wire toolbar callbacks; clear selection on frame change |

---

### Task 1: Fix drag bugs in `modules/drag.js`

**Files:**
- Modify: `modules/drag.js`

Two bugs: (1) when the mouse leaves the canvas during a drag, movement stops tracking and causes a jump on re-entry; (2) zone-mode layers have no bounds clamping and fly off-canvas.

- [ ] **Step 1: Fix out-of-canvas drag — attach mousemove to window during active drag**

In `onMouseDown` (after `state.active = true;` on line 179), add:
```javascript
window.addEventListener('mousemove', handleDrag);
```

In `onMouseMove`, replace the block that calls `handleDrag` so it no longer does drag work (window handles that now):
```javascript
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
  const hit = hitTestTextLayer(pct, frame, canvas, project);
  canvas.style.cursor = hit ? 'grab' : '';
}
```

In `onMouseUp`, before `state.active = false`, add:
```javascript
window.removeEventListener('mousemove', handleDrag);
```

- [ ] **Step 2: Fix zone-mode disappearance — add bounds clamping**

In `handleDrag`, in the `else` branch (zone mode, lines 216–239), replace the block after computing `absX`/`absY` with clamped versions:

```javascript
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
```

- [ ] **Step 3: Verify drag fixes in browser**

Open the app, load a project with images. Drag a text layer:
- Drag fast so the mouse leaves the canvas mid-drag. The layer should follow smoothly when the mouse re-enters — no jump.
- Drag a zone-mode text layer to the far edge of the canvas. It should stop at the edge rather than disappearing.

- [ ] **Step 4: Commit**

```bash
git add modules/drag.js
git commit -m "fix: drag jump when mouse leaves canvas; zone-mode layer clamped to canvas bounds"
```

---

### Task 2: Add `onLayerClick` callback to `modules/drag.js`

**Files:**
- Modify: `modules/drag.js`

Add click-vs-drag detection and a new optional `onLayerClick(layer | null)` sixth parameter. When the user clicks a text layer without dragging, fire `onLayerClick(layer)`. When clicking empty canvas, fire `onLayerClick(null)`.

- [ ] **Step 1: Add tracking fields to drag state**

In `initDrag`, add three fields to the `state` object:
```javascript
const state = {
  active:         false,
  layerId:        null,
  frameIndex:     null,
  startMousePct:  null,
  startPos:       null,
  mode:           null,
  rafPending:     false,
  startClientX:   0,     // NEW — for click distance check
  startClientY:   0,     // NEW
  wasDrag:        false, // NEW — true if mouse moved >= 5px during this press
};
```

- [ ] **Step 2: Record start position and reset wasDrag in onMouseDown**

At the end of `onMouseDown`, before closing brace, add:
```javascript
state.startClientX = e.clientX;
state.startClientY = e.clientY;
state.wasDrag      = false;
```

- [ ] **Step 3: Set wasDrag flag in handleDrag**

At the top of `handleDrag`, after `if (!state.active) return;`, add:
```javascript
const dxPx = e.clientX - state.startClientX;
const dyPx = e.clientY - state.startClientY;
if (Math.sqrt(dxPx * dxPx + dyPx * dyPx) >= 5) state.wasDrag = true;
```

- [ ] **Step 4: Add onLayerClick parameter and canvas click listener**

Change the `initDrag` signature to accept a 6th parameter:
```javascript
export function initDrag(canvas, project, getFrameIndex, onRender, onComplete, onLayerClick) {
```

Add the click handler function inside `initDrag`, after the `onMouseUp` definition:
```javascript
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
  const layer = hitTestTextLayer(pct, frame, canvas, project);
  onLayerClick(layer ?? null);
}
```

- [ ] **Step 5: Wire the click listener and update _dragHandlers**

In the `// ── Wire events ──` section, add:
```javascript
canvas.addEventListener('click', onCanvasClick);
```

Update the `_dragHandlers` assignment to include it:
```javascript
canvas._dragHandlers = { onMouseDown, onMouseMove, onMouseUp, onCanvasClick };
```

- [ ] **Step 6: Update destroyDrag to remove click listener**

In `destroyDrag`, add:
```javascript
canvas.removeEventListener('click', h.onCanvasClick);
```

Full updated `destroyDrag`:
```javascript
export function destroyDrag(canvas) {
  const h = canvas._dragHandlers;
  if (!h) return;
  canvas.removeEventListener('mousedown', h.onMouseDown);
  canvas.removeEventListener('mousemove', h.onMouseMove);
  canvas.removeEventListener('click',     h.onCanvasClick);
  window.removeEventListener('mouseup',   h.onMouseUp);
  delete canvas._dragHandlers;
}
```

- [ ] **Step 7: Verify in browser**

Open app, load project. Open browser console. Temporarily pass a console.log as the 6th arg to `initDrag` (or read ahead to Task 6). Clicking a text layer should log the layer object. Clicking empty canvas should log null. Dragging should not fire the callback.

- [ ] **Step 8: Commit**

```bash
git add modules/drag.js
git commit -m "feat: add onLayerClick callback to drag system with click-vs-drag detection"
```

---

### Task 3: Add selection indicator to `modules/renderer.js`

**Files:**
- Modify: `modules/renderer.js`

Add a `selectedLayerId` property to the `Renderer` class. When set, draw a dashed white rectangle around the selected text layer's bounds after all layers render.

- [ ] **Step 1: Add selectedLayerId property to Renderer constructor**

In the `Renderer` class constructor, add:
```javascript
/** @type {string|null} */
this.selectedLayerId = null;
```

Full updated constructor:
```javascript
constructor() {
  /** @type {boolean} */
  this.showSafeZone = false;
  /** @type {string|null} */
  this.selectedLayerId = null;
}
```

- [ ] **Step 2: Draw the selection indicator after layers render, before safe zone**

In `renderFrame`, after the frame-level logo block (after line ~168) and before the safe zone block, insert:

```javascript
// Selection indicator
if (this.selectedLayerId) {
  const selLayer = (frame.layers ?? []).find(l => l.id === this.selectedLayerId);
  if (selLayer?.type === 'text') {
    try {
      const bounds = computeTextBounds(ctx, selLayer, canvasW, canvasH, project);
      if (bounds) {
        const pad = canvasW * 0.008;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth   = Math.max(1, canvasW / 600);
        ctx.setLineDash([canvasW / 70, canvasW / 110]);
        ctx.strokeRect(
          bounds.left   - pad,
          bounds.top    - pad,
          (bounds.right  - bounds.left) + pad * 2,
          (bounds.bottom - bounds.top)  + pad * 2
        );
        ctx.restore();
      }
    } catch { /* ignore — selection indicator is cosmetic */ }
  }
}
```

- [ ] **Step 3: Verify in browser**

Temporarily set `renderer.selectedLayerId = 'some-layer-id'` in the browser console (matching an actual layer id from your project JSON). Re-render. A dashed white rectangle should appear around the text layer. Set back to null and re-render — rectangle disappears.

- [ ] **Step 4: Commit**

```bash
git add modules/renderer.js
git commit -m "feat: draw dashed selection indicator around selected text layer"
```

---

### Task 4: Create `ui/text-toolbar.js`

**Files:**
- Create: `ui/text-toolbar.js`

A self-contained toolbar component. Builds its own HTML into a provided container element. Exposes `show(layer)`, `hide()`, `onChange`, and `onDelete`.

- [ ] **Step 1: Create the file**

Create `ui/text-toolbar.js` with this full content:

```javascript
/**
 * text-toolbar.js — Contextual toolbar for editing a selected text layer.
 *
 * Usage:
 *   const toolbar = new TextToolbar(document.getElementById('text-toolbar'));
 *   toolbar.onChange = (layer) => { re-render + save };
 *   toolbar.onDelete = (layer) => { remove layer + re-render + save };
 *   toolbar.show(layer);   // populates and shows toolbar
 *   toolbar.hide();        // hides toolbar and clears internal ref
 */
export class TextToolbar {
  /**
   * @param {HTMLElement} el — the container element (hidden by default)
   */
  constructor(el) {
    this._el    = el;
    this._layer = null;

    /** @type {((layer: object) => void) | null} */
    this.onChange = null;

    /** @type {((layer: object) => void) | null} */
    this.onDelete = null;

    this._build();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _build() {
    this._el.innerHTML = `
      <div class="text-toolbar-inner">
        <input type="text" class="text-toolbar-content" placeholder="Text content" spellcheck="false">
        <div class="text-toolbar-sep"></div>
        <div class="text-toolbar-group">
          <span class="text-toolbar-label">Size</span>
          <button class="btn text-toolbar-btn" data-action="size-dec" title="Decrease font size">−</button>
          <span class="text-toolbar-value" data-field="size">—</span>
          <button class="btn text-toolbar-btn" data-action="size-inc" title="Increase font size">+</button>
        </div>
        <div class="text-toolbar-sep"></div>
        <div class="text-toolbar-group">
          <span class="text-toolbar-label">Width</span>
          <button class="btn text-toolbar-btn" data-action="width-dec" title="Decrease container width">−</button>
          <span class="text-toolbar-value" data-field="width">—</span>
          <button class="btn text-toolbar-btn" data-action="width-inc" title="Increase container width">+</button>
        </div>
        <div class="text-toolbar-sep"></div>
        <button class="btn text-toolbar-delete" data-action="delete" title="Delete text layer">🗑</button>
      </div>
    `;

    this._contentInput = this._el.querySelector('.text-toolbar-content');
    this._sizeDisplay  = this._el.querySelector('[data-field="size"]');
    this._widthDisplay = this._el.querySelector('[data-field="width"]');

    // Text content changes
    this._contentInput.addEventListener('input', () => {
      if (!this._layer) return;
      this._layer.content = this._contentInput.value;
      this.onChange?.(this._layer);
    });

    // Button actions (delegated)
    this._el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !this._layer) return;
      this._handleAction(btn.dataset.action);
    });
  }

  _handleAction(action) {
    switch (action) {
      case 'size-dec': {
        const font = this._layer.font ?? (this._layer.font = {});
        font.size_pct = Math.max(1.5, (font.size_pct ?? 5) - 0.5);
        this._updateDisplays();
        this.onChange?.(this._layer);
        break;
      }
      case 'size-inc': {
        const font = this._layer.font ?? (this._layer.font = {});
        font.size_pct = (font.size_pct ?? 5) + 0.5;
        this._updateDisplays();
        this.onChange?.(this._layer);
        break;
      }
      case 'width-dec': {
        this._layer.max_width_pct = Math.max(10, (this._layer.max_width_pct ?? 80) - 5);
        this._updateDisplays();
        this.onChange?.(this._layer);
        break;
      }
      case 'width-inc': {
        this._layer.max_width_pct = Math.min(100, (this._layer.max_width_pct ?? 80) + 5);
        this._updateDisplays();
        this.onChange?.(this._layer);
        break;
      }
      case 'delete': {
        this.onDelete?.(this._layer);
        break;
      }
    }
  }

  _updateDisplays() {
    if (!this._layer) return;
    this._sizeDisplay.textContent  = (this._layer.font?.size_pct ?? 0).toFixed(1);
    this._widthDisplay.textContent = `${Math.round(this._layer.max_width_pct ?? 80)}%`;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Populate the toolbar and make it visible.
   * @param {object} layer — a text layer object from project.data.frames[n].layers
   */
  show(layer) {
    this._layer = layer;
    this._contentInput.value = layer.content ?? '';
    this._updateDisplays();
    this._el.style.display = '';
  }

  /**
   * Hide the toolbar and clear the internal layer reference.
   */
  hide() {
    this._layer = null;
    this._el.style.display = 'none';
  }

  /**
   * The layer currently bound to this toolbar, or null.
   * @returns {object|null}
   */
  get currentLayer() {
    return this._layer;
  }
}
```

- [ ] **Step 2: Verify the file exists and has no syntax errors**

Open the browser DevTools console after wiring in Task 6. No import errors should appear. (If you want to test immediately: temporarily import and instantiate it in app.js and check the console.)

- [ ] **Step 3: Commit**

```bash
git add ui/text-toolbar.js
git commit -m "feat: TextToolbar component for editing text layer content, size, width, and delete"
```

---

### Task 5: Add toolbar HTML and CSS

**Files:**
- Modify: `index.html`
- Modify: `styles/components.css`

- [ ] **Step 1: Add toolbar div to index.html**

After the closing `</header>` for `#toolbar` (line 25) and before `<main id="main">` (line 28), insert:

```html
  <!-- ── Text layer toolbar (shown when a text layer is selected) ────── -->
  <div id="text-toolbar" style="display:none" aria-label="Text layer editor" role="toolbar"></div>
```

- [ ] **Step 2: Add styles to styles/components.css**

At the end of `styles/components.css`, append:

```css
/* ── Text toolbar ─────────────────────────────────────────────────────── */

#text-toolbar {
  background: var(--color-bg-panel);
  border-bottom: 1px solid var(--color-border);
  padding: 5px 12px;
  flex-shrink: 0;
}

.text-toolbar-inner {
  display: flex;
  align-items: center;
  gap: 6px;
}

.text-toolbar-content {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--font-ui);
  font-size: var(--font-size-base);
  height: 28px;
}

.text-toolbar-content:focus {
  outline: none;
  border-color: var(--color-accent);
}

.text-toolbar-sep {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  flex-shrink: 0;
}

.text-toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.text-toolbar-label {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  user-select: none;
  white-space: nowrap;
}

.text-toolbar-value {
  min-width: 38px;
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  user-select: none;
}

.text-toolbar-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 15px;
  line-height: 1;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.text-toolbar-btn:hover {
  background: var(--color-bg-panel-alt);
  border-color: var(--color-border-light);
}

.text-toolbar-delete {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.text-toolbar-delete:hover {
  color: #ff5555;
  background: rgba(255, 85, 85, 0.1);
}
```

- [ ] **Step 3: Verify layout in browser**

Open the app. The toolbar div exists in the DOM (hidden). Temporarily set `document.getElementById('text-toolbar').style.display = ''` in the console — the toolbar area should appear above the main content without breaking the layout. Set back to `none`.

- [ ] **Step 4: Commit**

```bash
git add index.html styles/components.css
git commit -m "feat: add text-toolbar HTML slot and CSS styles"
```

---

### Task 6: Wire selection and toolbar in `app.js`

**Files:**
- Modify: `app.js`

Connect all pieces: import TextToolbar, instantiate it, pass `onLayerClick` to `initDrag`, wire toolbar callbacks, clear selection on frame change.

- [ ] **Step 1: Import TextToolbar**

At the top of `app.js`, after the existing imports, add:
```javascript
import { TextToolbar } from './ui/text-toolbar.js';
```

- [ ] **Step 2: Declare textToolbar variable in init()**

Inside the `async function init()` body, after the `const conceptBuilder = new ConceptBuilder();` line (~line 56), add:
```javascript
const textToolbarEl = document.getElementById('text-toolbar');
const textToolbar   = new TextToolbar(textToolbarEl);
```

- [ ] **Step 3: Add onLayerClick handler function**

Inside `init()`, after the `renderCurrentFrame` function definition (~line 478), add this new function:

```javascript
function onLayerClick(layer) {
  renderer.selectedLayerId = layer?.id ?? null;
  if (layer) {
    textToolbar.show(layer);
  } else {
    textToolbar.hide();
  }
  renderCurrentFrame();
}
```

- [ ] **Step 4: Wire toolbar callbacks**

Immediately after the `onLayerClick` function, add:

```javascript
textToolbar.onChange = (layer) => {
  project.save();
  renderCurrentFrame();
  filmstrip.renderOne(project.activeFrameIndex, project);
};

textToolbar.onDelete = (layer) => {
  const frame = project.data?.frames?.[project.activeFrameIndex];
  if (!frame) return;
  frame.layers = (frame.layers ?? []).filter(l => l.id !== layer.id);
  project.save();
  textToolbar.hide();
  renderer.selectedLayerId = null;
  renderCurrentFrame();
  filmstrip.renderOne(project.activeFrameIndex, project);
  inspector.update(project, project.activeFrameIndex, validation);
};
```

- [ ] **Step 5: Pass onLayerClick to initDrag**

In `loadProjectData`, find the `initDrag(...)` call (~line 303) and add `onLayerClick` as the 6th argument:

```javascript
initDrag(
  mainCanvas,
  project,
  () => project.activeFrameIndex,
  () => renderCurrentFrame(),
  (frameIndex) => {
    filmstrip.renderOne(frameIndex, project);
  },
  onLayerClick,  // ← NEW 6th argument
);
```

- [ ] **Step 6: Clear selection when changing frames**

In the `selectFrame` function (~line 398), add two lines before the existing body:

```javascript
function selectFrame(index) {
  if (!project.isLoaded) return;
  // Clear text selection when navigating to a different frame
  renderer.selectedLayerId = null;
  textToolbar.hide();

  if (!project.setActiveFrame(index)) return;
  filmstrip.setActive(index);
  updateNavButtons();
  renderCurrentFrame();
  inspector.update(project, index, validation);
}
```

- [ ] **Step 7: Full integration test in browser**

Load a project with text layers. Verify all five original requirements:

1. **Drag no longer jumps** — drag a text layer quickly, mouse leaving canvas mid-drag. Layer follows smoothly.
2. **Drag no longer disappears** — drag to the edge of canvas. Layer stops at boundary.
3. **Click selects a layer** — single click on a text layer shows the toolbar above canvas and draws a dashed border around the layer.
4. **Text content editing** — edit the text in the toolbar input. The canvas updates live.
5. **Font size** — click `−`/`+` next to Size. Canvas updates, value display changes.
6. **Container width** — click `−`/`+` next to Width. Canvas re-wraps text live.
7. **Delete** — click 🗑. Layer is removed from the canvas, toolbar hides.
8. **Click background deselects** — clicking empty canvas hides the toolbar and removes the dashed border.
9. **Frame navigation clears selection** — navigate to another frame. Toolbar hides automatically.
10. **Changes persist** — reload the page. Edits made (content, size, width) are still there (saved via `project.save()`).

- [ ] **Step 8: Commit**

```bash
git add app.js
git commit -m "feat: wire text layer selection, toolbar, and drag-to-select in app.js"
```
