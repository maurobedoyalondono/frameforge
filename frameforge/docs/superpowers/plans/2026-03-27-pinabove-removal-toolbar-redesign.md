# pin_above Removal + Floating Text Toolbar + Shape Interactivity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the pin_above shape-positioning concept, replace the fixed text toolbar with a floating 2-row panel anchored to the selected layer, add shape dragging, and add a floating shape toolbar with fill color, opacity, and size controls.

**Architecture:** The existing selection model (`selectedLayerId` in `app.js`, dashed rect in `renderer.js`, drag in `drag.js`) is extended to cover both text and shape layers. Both toolbars are absolutely-positioned children of `#canvas-wrap` whose CSS coordinates are computed from layer bounds each time a layer is selected, dragged, or the canvas resizes.

**Tech Stack:** Vanilla JS ES modules, HTML5 Canvas, Google Fonts CSS2 API. No build step, no test runner — verification is manual in-browser.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `modules/layers.js` | Modify | Remove `pin_above` branch; retain `computeShapeBounds` |
| `modules/renderer.js` | Modify | Remove `layerBounds` map + pass; extend selection indicator + guidelines to shapes |
| `modules/drag.js` | Modify | Extend hit-test + drag to shape layers |
| `modules/fonts.js` | Modify | Export `loadFont(family, weights)` |
| `ui/text-toolbar.js` | Rewrite | Floating 2-row panel: row 1 formatting, row 2 content, font picker |
| `ui/shape-toolbar.js` | Create | Floating single-row: fill color, opacity, size, delete |
| `styles/components.css` | Modify | New floating toolbar CSS, remove old strip styles |
| `index.html` | Modify | Move toolbars inside `#canvas-wrap` |
| `app.js` | Modify | positionElement, positionToolbar, wire both toolbars, fix canvas injection |
| `data/ai-manual-content.js` | Modify | Remove pin_above section; add intentional shapes guidance |
| `docs/ai-manual.md` | Modify | Same changes |
| `docs/shapes-reference.md` | Modify | Remove pin_above; add positioning note |
| `docs/spec-app.md` | Modify | Update text/shape editing sections |

---

## Task 1: Remove pin_above from layers.js

**Files:**
- Modify: `frameforge/modules/layers.js`

- [ ] **Step 1: Open `layers.js` and locate `renderShapeLayer`**

  Around line 402, find this block:
  ```javascript
  // pin_above: position shape just above the top of a referenced text layer
  let posX, posY;
  const pinTarget = layer.position?.pin_above;
  if (pinTarget && layerBounds.has(pinTarget)) {
    const bounds = layerBounds.get(pinTarget);
    const gapPx  = layer.position?.gap_px ?? 8;
    posX = px(layer.position?.x_pct ?? 0, w);
    posY = bounds.top - gapPx - height / 2;
  } else {
    posX = px(layer.position?.x_pct ?? 0, w);
    posY = py(layer.position?.y_pct ?? 0, h);
  }
  ```

- [ ] **Step 2: Replace with direct positioning**

  ```javascript
  const posX = px(layer.position?.x_pct ?? 0, w);
  const posY = py(layer.position?.y_pct ?? 0, h);
  ```

- [ ] **Step 3: Remove the `layerBounds` parameter from `renderShapeLayer`**

  Change the function signature from:
  ```javascript
  export function renderShapeLayer(ctx, layer, w, h, _project, layerBounds = new Map()) {
  ```
  To:
  ```javascript
  export function renderShapeLayer(ctx, layer, w, h, _project) {
  ```

- [ ] **Step 4: Verify `computeShapeBounds` is still exported (do not remove it)**

  Search for `export function computeShapeBounds` in `layers.js`. It must stay — it's needed for toolbar positioning and drag hit-testing.

- [ ] **Step 5: Commit**

  ```bash
  cd /c/Projects/Photos/PostersCreator/frameforge
  git add modules/layers.js
  git commit -m "feat: remove pin_above from renderShapeLayer"
  ```

---

## Task 2: Remove pin_above from renderer.js

**Files:**
- Modify: `frameforge/modules/renderer.js`

- [ ] **Step 1: Remove the `layerBounds` map construction in `renderFrame`**

  Around line 145–155, remove this entire block:
  ```javascript
  // Pre-compute text bounds for pin_above shape positioning
  const layers = frame.layers || [];
  const layerBounds = new Map();
  for (const layer of layers) {
    if (layer.type === 'text' && layer.id) {
      try {
        const b = computeTextBounds(ctx, layer, effW, effH, project);
        if (b) layerBounds.set(layer.id, b);
      } catch { /* ignore — bounds are optional */ }
    }
  }
  ```

  Change the `const layers` declaration that follows to:
  ```javascript
  const layers = frame.layers || [];
  ```

- [ ] **Step 2: Update `renderLayer` call to remove `layerBounds` argument**

  Find:
  ```javascript
  renderLayer(ctx, layer, effW, effH, project, frameIndex, layerBounds);
  ```
  Change to:
  ```javascript
  renderLayer(ctx, layer, effW, effH, project, frameIndex);
  ```

- [ ] **Step 3: Remove the same pattern from `renderThumbnail`**

  Around line 295–305, remove:
  ```javascript
  // Pre-compute text bounds for pin_above
  const thumbLayers = frame.layers || [];
  const thumbBounds = new Map();
  for (const layer of thumbLayers) {
    if (layer.type === 'text' && layer.id) {
      try {
        const b = computeTextBounds(ctx, layer, thumbWidth, thumbH, project);
        if (b) thumbBounds.set(layer.id, b);
      } catch { /* ignore */ }
    }
  }
  ```

  Change `const thumbLayers` to `const thumbLayers = frame.layers || [];` and update the `renderLayer` call:
  ```javascript
  // Before:
  renderLayer(ctx, layer, thumbWidth, thumbH, project, frameIndex, thumbBounds);
  // After:
  renderLayer(ctx, layer, thumbWidth, thumbH, project, frameIndex);
  ```

- [ ] **Step 4: Find and update `renderLayer` in layers.js to not accept the `layerBounds` arg**

  In `layers.js`, find the `renderLayer` dispatcher function. Remove the `layerBounds` parameter and update the call to `renderShapeLayer` to not pass it:

  ```javascript
  // Before (example):
  export function renderLayer(ctx, layer, w, h, project, frameIndex, layerBounds) {
    // ...
    case 'shape': return renderShapeLayer(ctx, layer, w, h, project, layerBounds);

  // After:
  export function renderLayer(ctx, layer, w, h, project, frameIndex) {
    // ...
    case 'shape': return renderShapeLayer(ctx, layer, w, h, project);
  ```

- [ ] **Step 5: Open the app in browser, load a JSON project, verify it renders without errors**

  Open `frameforge/index.html` in a browser. Load a JSON project that previously had rule lines. Confirm the canvas renders, no JS errors in console. Rule lines still render at their `x_pct`/`y_pct` position (or wherever they happen to land without pin_above).

- [ ] **Step 6: Commit**

  ```bash
  git add modules/renderer.js modules/layers.js
  git commit -m "feat: remove pin_above layerBounds map from renderer"
  ```

---

## Task 3: Remove pin_above from docs; add intentional shapes guidance

**Files:**
- Modify: `data/ai-manual-content.js`
- Modify: `docs/ai-manual.md`
- Modify: `docs/shapes-reference.md`
- Modify: `docs/spec-app.md`

- [ ] **Step 1: Edit `data/ai-manual-content.js` — remove rule-line guidance**

  Search for `pin_above` and `rule line` in `ai-manual-content.js`. Remove:
  - The entire "Rule lines" subsection (the JSON example block and all field descriptions for `pin_above`, `gap_px`, and the "Rule lines are an editorial device" paragraph)
  - The layout-rules sentence: `"The rule line (\`shape: line\`, \`width_pct: 3–5\`, ...) before headlines is a strong editorial device."`
  - The reference layout example lines containing `pin_above`
  - The pre-flight checklist item: `"No rule line is placed above a stats block or numeric content"`

- [ ] **Step 2: Add intentional shapes guidance to `data/ai-manual-content.js`**

  After the existing shape types table, add this section:

  ```
  ### Shapes — Use Them Intentionally

  Every shape must earn its place. Only add a shape when it serves a clear visual purpose.

  **When shapes serve a purpose — use them:**

  | Purpose | Shape type | Example |
  |---|---|---|
  | Visual divider between sections | \`line\` | Horizontal rule between location tag and headline, positioned with \`y_pct\` |
  | Accent / badge | \`rectangle\`, \`circle\`, \`polygon\` | Colour badge behind a stat, circle frame |
  | Callout / pointer | \`arrow\` | Drawing attention to a subject detail |
  | Geometric accent | \`triangle\`, \`polygon\` | Star or diamond accent in a corner |
  | Angled energy | \`line\` with \`angle_deg\` | Diagonal slash for bold/documentary |

  **Positioning:** All shapes use \`x_pct\`/\`y_pct\` or \`zone\` + offsets — the same coordinate system as text layers. Position them deliberately.

  **When NOT to use a shape:**
  - Do not add a rule line above a headline just because the layout has a headline.
  - Never place a line above \`stats_block\` or numeric content.
  - Do not add shapes to fill empty space.
  ```

- [ ] **Step 3: Apply the same changes to `docs/ai-manual.md`**

  Repeat steps 1–2 for `docs/ai-manual.md` (same content, same sections to remove and add).

- [ ] **Step 4: Edit `docs/shapes-reference.md`**

  Remove any `pin_above` example or documentation. Add a note at the top of the positioning section:
  ```
  **Positioning:** All shapes position with `x_pct`/`y_pct` or `zone` + offsets — the same coordinate system as text layers. There is no auto-pin behavior.
  ```

- [ ] **Step 5: Edit `docs/spec-app.md`**

  Search for `pin_above` — remove all occurrences. Update the text-editing section header to note that toolbar now floats near the selected layer (a later task will flesh this out).

- [ ] **Step 6: Commit**

  ```bash
  git add data/ai-manual-content.js docs/ai-manual.md docs/shapes-reference.md docs/spec-app.md
  git commit -m "docs: remove pin_above; add intentional shapes guidance"
  ```

---

## Task 4: Move toolbars into #canvas-wrap; fix canvas injection

**Files:**
- Modify: `frameforge/index.html`
- Modify: `frameforge/app.js`

- [ ] **Step 1: Edit `index.html` — move `#text-toolbar` and add `#shape-toolbar`**

  Remove the `#text-toolbar` div from between `<header>` and `<main>`:
  ```html
  <!-- REMOVE this line from between <header> and <main>: -->
  <div id="text-toolbar" style="display:none" aria-label="Text layer editor" role="toolbar"></div>
  ```

  Inside `#canvas-wrap`, add both toolbar elements and keep `#safe-zone-overlay`:
  ```html
  <div id="canvas-wrap">
    <!-- main-canvas injected by app.js -->
    <div id="safe-zone-overlay" aria-hidden="true"></div>
    <div id="text-toolbar"  style="display:none" aria-label="Text layer editor"  role="toolbar"></div>
    <div id="shape-toolbar" style="display:none" aria-label="Shape layer editor" role="toolbar"></div>
  </div>
  ```

- [ ] **Step 2: Fix canvas injection in `app.js` to not clear #canvas-wrap innerHTML**

  Find these lines (around line 72–73):
  ```javascript
  canvasWrapEl.innerHTML = '';
  canvasWrapEl.appendChild(mainCanvas);
  ```

  Replace with:
  ```javascript
  mainCanvas.id = 'main-canvas';
  const _existingCanvas = canvasWrapEl.querySelector('#main-canvas');
  if (_existingCanvas) _existingCanvas.remove();
  canvasWrapEl.insertAdjacentElement('afterbegin', mainCanvas);
  ```

  This preserves `#safe-zone-overlay`, `#text-toolbar`, and `#shape-toolbar` in the DOM.

- [ ] **Step 3: Add `#canvas-wrap` CSS — `position: relative`**

  In `styles/shell.css` (or `base.css`), find `#canvas-wrap` and ensure it has `position: relative`. The toolbars use `position: absolute` relative to this container.

  Search for `#canvas-wrap` in the CSS files. If it doesn't have `position: relative`, add it:
  ```css
  #canvas-wrap {
    position: relative;
    /* existing rules stay */
  }
  ```

- [ ] **Step 4: Verify the app still starts correctly**

  Load the app in the browser. Load a project. Confirm the canvas renders inside `#canvas-wrap`. Open DevTools → Elements, expand `#canvas-wrap` — you should see `#main-canvas`, `#safe-zone-overlay`, `#text-toolbar`, `#shape-toolbar` as children. No JS errors.

- [ ] **Step 5: Commit**

  ```bash
  git add index.html app.js styles/shell.css
  git commit -m "feat: move toolbars into canvas-wrap; fix canvas injection"
  ```

---

## Task 5: Export `loadFont` from fonts.js

**Files:**
- Modify: `frameforge/modules/fonts.js`

The text toolbar's font picker needs to load a single font family on demand. Add a convenience export.

- [ ] **Step 1: Add `loadFont` export to `fonts.js`**

  After the existing `loadProjectFonts` function, add:

  ```javascript
  /**
   * Load a single font family by name.
   * Useful for previewing fonts in the picker before applying.
   * Returns Promise<boolean> — true if loaded, false if failed.
   * @param {string} family — Google Fonts family name
   * @param {string[]} [weights] — array of weight strings e.g. ['400', '700']
   */
  export function loadFont(family, weights = ['400', '700']) {
    if (!family || SYSTEM_FONTS.has(family)) return Promise.resolve(true);
    if (LOADED.has(family)) return LOADED.get(family);
    const variants = new Set(weights);
    STATUS.set(family, 'loading');
    const p = loadFontFamily(family, variants);
    LOADED.set(family, p);
    return p;
  }
  ```

- [ ] **Step 2: Verify in console**

  Open browser DevTools console. Import the module path and call:
  ```javascript
  // In the app context — paste into console after app is loaded:
  // The function is module-private, so test indirectly by selecting a font in the picker (Task 7)
  ```
  Verification happens in Task 7 when the font picker is live.

- [ ] **Step 3: Commit**

  ```bash
  git add modules/fonts.js
  git commit -m "feat: export loadFont utility from fonts.js"
  ```

---

## Task 6: Rewrite TextToolbar — two-row floating panel

**Files:**
- Rewrite: `frameforge/ui/text-toolbar.js`

- [ ] **Step 1: Replace the entire file with this implementation**

  ```javascript
  /**
   * text-toolbar.js — Floating contextual toolbar for a selected text layer.
   *
   * Two-row layout:
   *   Row 1: Font | Size | B/I | Align | Line-height | Width | Color | Shadow | Delete
   *   Row 2: Text content input (full width)
   *   Popup: Font picker panel (opens below font button)
   *
   * Usage:
   *   const toolbar = new TextToolbar(el, loadFontFn);
   *   toolbar.onChange = (layer) => { re-render + save };
   *   toolbar.onDelete = (layer) => { remove layer + re-render };
   *   toolbar.show(layer);
   *   toolbar.hide();
   */

  const CURATED_FONTS = [
    { family: 'Playfair Display', role: 'Display' },
    { family: 'Cormorant Garamond', role: 'Display' },
    { family: 'Bebas Neue', role: 'Display' },
    { family: 'DM Serif Display', role: 'Display' },
    { family: 'Cinzel', role: 'Display' },
    { family: 'Josefin Sans', role: 'Display' },
    { family: 'Inter', role: 'Body' },
    { family: 'Montserrat', role: 'Body' },
    { family: 'Source Sans 3', role: 'Body' },
    { family: 'DM Sans', role: 'Body' },
    { family: 'Oswald', role: 'Body' },
    { family: 'Open Sans', role: 'Body' },
  ];

  // Google Fonts URL to pre-load all curated fonts for picker preview
  const CURATED_FONT_URL =
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700' +
    '&family=Cormorant+Garamond:wght@400;700' +
    '&family=Bebas+Neue:wght@400' +
    '&family=DM+Serif+Display:wght@400;700' +
    '&family=Cinzel:wght@400;700' +
    '&family=Josefin+Sans:wght@300;400;700' +
    '&family=Inter:wght@400;700' +
    '&family=Montserrat:wght@400;700' +
    '&family=Source+Sans+3:wght@400;700' +
    '&family=DM+Sans:wght@400;700' +
    '&family=Oswald:wght@400;700' +
    '&family=Open+Sans:wght@400;700' +
    '&display=swap';

  export class TextToolbar {
    /**
     * @param {HTMLElement} el
     * @param {(family: string) => Promise<boolean>} loadFontFn — loads a Google Font family
     */
    constructor(el, loadFontFn) {
      this._el        = el;
      this._layer     = null;
      this._loadFont  = loadFontFn ?? (() => Promise.resolve(false));
      this._pickerOpen       = false;
      this._curatedLoaded    = false;
      this._projectFamilies  = [];

      /** @type {((layer: object) => void) | null} */
      this.onChange = null;
      /** @type {((layer: object) => void) | null} */
      this.onDelete = null;

      this._build();
    }

    // ── Build DOM ──────────────────────────────────────────────────────────

    _build() {
      this._el.innerHTML = `
        <div class="tt-row1">
          <button class="tt-font-btn" data-action="font-picker" title="Font family">—</button>
          <div class="tt-sep"></div>
          <span class="tt-label">Sz</span>
          <button class="tt-btn" data-action="size-dec">−</button>
          <span class="tt-val" data-field="size">—</span>
          <button class="tt-btn" data-action="size-inc">+</button>
          <div class="tt-sep"></div>
          <button class="tt-btn tt-toggle" data-action="bold"   style="font-weight:700">B</button>
          <button class="tt-btn tt-toggle" data-action="italic" style="font-style:italic">I</button>
          <div class="tt-sep"></div>
          <button class="tt-btn tt-toggle" data-action="align-left"   title="Align left">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <line x1="1" y1="2"  x2="11" y2="2"  stroke="currentColor" stroke-width="1.5"/>
              <line x1="1" y1="5"  x2="8"  y2="5"  stroke="currentColor" stroke-width="1.5"/>
              <line x1="1" y1="8"  x2="10" y2="8"  stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
          <button class="tt-btn tt-toggle" data-action="align-center" title="Align center">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <line x1="1"   y1="2"  x2="11" y2="2"  stroke="currentColor" stroke-width="1.5"/>
              <line x1="2.5" y1="5"  x2="9.5" y2="5" stroke="currentColor" stroke-width="1.5"/>
              <line x1="1.5" y1="8"  x2="10.5" y2="8" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
          <button class="tt-btn tt-toggle" data-action="align-right" title="Align right">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <line x1="1"  y1="2"  x2="11" y2="2"  stroke="currentColor" stroke-width="1.5"/>
              <line x1="4"  y1="5"  x2="11" y2="5"  stroke="currentColor" stroke-width="1.5"/>
              <line x1="2"  y1="8"  x2="11" y2="8"  stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
          <div class="tt-sep"></div>
          <span class="tt-label" title="Line height">↕</span>
          <button class="tt-btn" data-action="lh-dec">−</button>
          <span class="tt-val" data-field="lh">—</span>
          <button class="tt-btn" data-action="lh-inc">+</button>
          <div class="tt-sep"></div>
          <span class="tt-label" title="Max width">↔</span>
          <button class="tt-btn" data-action="width-dec">−</button>
          <span class="tt-val" data-field="width">—</span>
          <button class="tt-btn" data-action="width-inc">+</button>
          <div class="tt-sep"></div>
          <input type="color" class="tt-color" title="Text colour">
          <div class="tt-sep"></div>
          <button class="tt-btn tt-toggle" data-action="shadow">Shadow</button>
          <div class="tt-sep"></div>
          <button class="tt-btn tt-delete" data-action="delete" title="Delete layer">🗑</button>
        </div>
        <div class="tt-row2">
          <input type="text" class="tt-content" placeholder="Text content" spellcheck="false">
        </div>
        <div class="tt-picker" style="display:none"></div>
      `;

      // Refs
      this._fontBtn      = this._el.querySelector('[data-action="font-picker"]');
      this._sizeVal      = this._el.querySelector('[data-field="size"]');
      this._lhVal        = this._el.querySelector('[data-field="lh"]');
      this._widthVal     = this._el.querySelector('[data-field="width"]');
      this._boldBtn      = this._el.querySelector('[data-action="bold"]');
      this._italicBtn    = this._el.querySelector('[data-action="italic"]');
      this._alignBtns    = {
        left:   this._el.querySelector('[data-action="align-left"]'),
        center: this._el.querySelector('[data-action="align-center"]'),
        right:  this._el.querySelector('[data-action="align-right"]'),
      };
      this._lhBtns       = {
        dec: this._el.querySelector('[data-action="lh-dec"]'),
        inc: this._el.querySelector('[data-action="lh-inc"]'),
      };
      this._shadowBtn    = this._el.querySelector('[data-action="shadow"]');
      this._colorInput   = this._el.querySelector('.tt-color');
      this._contentInput = this._el.querySelector('.tt-content');
      this._pickerEl     = this._el.querySelector('.tt-picker');

      // Events
      this._contentInput.addEventListener('input', () => {
        if (!this._layer) return;
        this._layer.content = this._contentInput.value;
        this.onChange?.(this._layer);
      });

      this._colorInput.addEventListener('input', () => {
        if (!this._layer) return;
        (this._layer.font ??= {}).color = this._colorInput.value;
        this.onChange?.(this._layer);
      });

      this._el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || !this._layer) return;
        this._handleAction(btn.dataset.action);
      });

      // Close picker on outside click
      document.addEventListener('click', (e) => {
        if (this._pickerOpen && !this._el.contains(e.target)) {
          this._closePicker();
        }
      }, true);
    }

    // ── Actions ────────────────────────────────────────────────────────────

    _handleAction(action) {
      const font = () => (this._layer.font ??= {});
      switch (action) {
        case 'font-picker':
          this._pickerOpen ? this._closePicker() : this._openPicker();
          break;
        case 'size-dec':
          font().size_pct = Math.max(1.5, (this._layer.font?.size_pct ?? 5) - 0.5);
          this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'size-inc':
          font().size_pct = Math.min(25, (this._layer.font?.size_pct ?? 5) + 0.5);
          this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'bold':
          font().weight = (this._layer.font?.weight ?? 400) >= 700 ? 400 : 700;
          this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'italic':
          font().style = (this._layer.font?.style === 'italic') ? 'normal' : 'italic';
          this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'align-left':   this._layer.align = 'left';   this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'align-center': this._layer.align = 'center'; this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'align-right':  this._layer.align = 'right';  this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'lh-dec':
          font().line_height = Math.max(0.8, parseFloat(((this._layer.font?.line_height ?? 1.2) - 0.05).toFixed(2)));
          this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'lh-inc':
          font().line_height = Math.min(2.5, parseFloat(((this._layer.font?.line_height ?? 1.2) + 0.05).toFixed(2)));
          this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'width-dec':
          this._layer.max_width_pct = Math.max(10, (this._layer.max_width_pct ?? 80) - 5);
          this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'width-inc':
          this._layer.max_width_pct = Math.min(100, (this._layer.max_width_pct ?? 80) + 5);
          this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'shadow':
          if (!this._layer.shadow?.enabled) {
            this._layer.shadow = { color: '#000000', blur_px: 8, offset_x: 2, offset_y: 2, opacity: 0.6, ...(this._layer.shadow ?? {}), enabled: true };
          } else {
            this._layer.shadow.enabled = false;
          }
          this._updateDisplays(); this.onChange?.(this._layer); break;
        case 'delete':
          this.onDelete?.(this._layer); break;
      }
    }

    // ── Font picker ────────────────────────────────────────────────────────

    _openPicker() {
      this._pickerOpen = true;
      this._buildPicker();
      this._pickerEl.style.display = '';
      this._loadCuratedFonts();
    }

    _closePicker() {
      this._pickerOpen = false;
      this._pickerEl.style.display = 'none';
    }

    _buildPicker() {
      const currentFamily = this._layer?.font?.family ?? '';
      const projectFonts  = this._projectFamilies;

      const curatedDisplay = CURATED_FONTS.filter(f => f.role === 'Display');
      const curatedBody    = CURATED_FONTS.filter(f => f.role === 'Body');

      const renderItem = (family) => {
        const isActive    = family === currentFamily;
        const isInProject = projectFonts.includes(family);
        return `
          <div class="fp-item${isActive ? ' fp-item-active' : ''}" data-family="${family}"
               style="font-family: '${family}', sans-serif;">
            ${family}
            ${isInProject && !isActive ? '<span class="fp-badge">✓ in project</span>' : ''}
          </div>`;
      };

      const projectSection = projectFonts.length > 0 ? `
        <div class="fp-section-title">IN THIS PROJECT</div>
        ${projectFonts.map(renderItem).join('')}
        <div class="fp-divider"></div>
      ` : '';

      this._pickerEl.innerHTML = `
        <div class="fp-search-wrap">
          <input class="fp-search" type="text" placeholder="Search any Google Font…" spellcheck="false">
        </div>
        ${projectSection}
        <div class="fp-section-title">DISPLAY</div>
        <div class="fp-curated-display">${curatedDisplay.map(f => renderItem(f.family)).join('')}</div>
        <div class="fp-section-title" style="margin-top:6px;">BODY / LABELS</div>
        <div class="fp-curated-body">${curatedBody.map(f => renderItem(f.family)).join('')}</div>
        <div class="fp-search-result" style="display:none"></div>
      `;

      // Search input
      const searchInput = this._pickerEl.querySelector('.fp-search');
      const searchResult = this._pickerEl.querySelector('.fp-search-result');
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim();
        if (!q) { searchResult.style.display = 'none'; return; }
        searchResult.style.display = '';
        searchResult.innerHTML = `
          <div class="fp-divider"></div>
          <div class="fp-item" data-family="${q}" style="font-family: '${q}', sans-serif;">
            ${q} <span class="fp-badge">use this font</span>
          </div>`;
      });

      // Click handler
      this._pickerEl.addEventListener('click', (e) => {
        const item = e.target.closest('[data-family]');
        if (!item) return;
        this._selectFont(item.dataset.family);
      });
    }

    _selectFont(family) {
      if (!this._layer) return;
      (this._layer.font ??= {}).family = family;
      this._fontBtn.textContent = family;
      this._closePicker();
      this._loadFont(family).then((ok) => {
        if (ok) this.onChange?.(this._layer);
      });
    }

    _loadCuratedFonts() {
      if (this._curatedLoaded) return;
      this._curatedLoaded = true;
      if (!document.querySelector(`link[href*="Playfair+Display"][href*="Cormorant"]`)) {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = CURATED_FONT_URL;
        document.head.appendChild(link);
      }
    }

    // ── Displays ───────────────────────────────────────────────────────────

    _updateDisplays() {
      if (!this._layer) return;
      const font    = this._layer.font ?? {};
      const align   = this._layer.align ?? 'left';
      const weight  = font.weight ?? 400;
      const isItal  = font.style === 'italic';
      const shadow  = this._layer.shadow?.enabled === true;

      this._fontBtn.textContent = font.family ?? '—';
      this._sizeVal.textContent = (font.size_pct ?? 5).toFixed(1);
      this._lhVal.textContent   = (font.line_height ?? 1.2).toFixed(2);
      this._widthVal.textContent = `${Math.round(this._layer.max_width_pct ?? 80)}%`;

      this._boldBtn.classList.toggle('tt-active', weight >= 700);
      this._italicBtn.classList.toggle('tt-active', isItal);
      this._alignBtns.left.classList.toggle('tt-active',   align === 'left');
      this._alignBtns.center.classList.toggle('tt-active', align === 'center');
      this._alignBtns.right.classList.toggle('tt-active',  align === 'right');
      this._shadowBtn.classList.toggle('tt-active', shadow);

      this._colorInput.value = font.color ?? '#ffffff';
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Provide the list of font families currently used in the project,
     * so the picker can show them in the "In this project" section.
     * @param {string[]} families
     */
    setProjectFonts(families) {
      this._projectFamilies = families ?? [];
    }

    show(layer) {
      this._layer = layer;
      this._contentInput.value = layer.content ?? '';
      this._closePicker();
      this._updateDisplays();
      this._el.style.display = '';
    }

    hide() {
      this._closePicker();
      this._layer = null;
      this._el.style.display = 'none';
    }

    get currentLayer() { return this._layer; }
  }
  ```

- [ ] **Step 2: Update `app.js` import to pass `loadFont` to the constructor**

  In `app.js`, find the import section and add:
  ```javascript
  import { loadProjectFonts, loadFont } from './modules/fonts.js';
  ```

  Find the `TextToolbar` instantiation:
  ```javascript
  const textToolbar = new TextToolbar(textToolbarEl);
  ```
  Change to:
  ```javascript
  const textToolbar = new TextToolbar(textToolbarEl, loadFont);
  ```

- [ ] **Step 3: Verify row 1 controls work**

  Load the app. Load a project. Click a text layer. The toolbar should appear (somewhere in the DOM — not positioned yet). Verify in DevTools that `#text-toolbar` is visible and contains two rows. Clicking B/I/align/shadow buttons should change the canvas render.

- [ ] **Step 4: Commit**

  ```bash
  git add ui/text-toolbar.js app.js
  git commit -m "feat: rewrite TextToolbar as 2-row floating panel with font picker"
  ```

---

## Task 7: Create ShapeToolbar

**Files:**
- Create: `frameforge/ui/shape-toolbar.js`

- [ ] **Step 1: Create the file**

  ```javascript
  /**
   * shape-toolbar.js — Floating contextual toolbar for a selected shape layer.
   *
   * Single-row layout: [ Fill color ] | [ Op − val + ] | [ ↔ − val% + ] | [ 🗑 ]
   *
   * Usage:
   *   const toolbar = new ShapeToolbar(el);
   *   toolbar.onChange = (layer) => { re-render + save };
   *   toolbar.onDelete = (layer) => { remove layer };
   *   toolbar.show(layer);
   *   toolbar.hide();
   */

  export class ShapeToolbar {
    constructor(el) {
      this._el    = el;
      this._layer = null;

      /** @type {((layer: object) => void) | null} */
      this.onChange = null;
      /** @type {((layer: object) => void) | null} */
      this.onDelete = null;

      this._build();
    }

    _build() {
      this._el.innerHTML = `
        <div class="st-row">
          <input type="color" class="st-color" title="Fill colour">
          <div class="st-sep"></div>
          <span class="st-label" title="Fill opacity">Op</span>
          <button class="st-btn" data-action="op-dec">−</button>
          <span class="st-val" data-field="op">—</span>
          <button class="st-btn" data-action="op-inc">+</button>
          <div class="st-sep"></div>
          <span class="st-label" title="Width">↔</span>
          <button class="st-btn" data-action="w-dec">−</button>
          <span class="st-val" data-field="w">—</span>
          <button class="st-btn" data-action="w-inc">+</button>
          <div class="st-sep"></div>
          <button class="st-btn st-delete" data-action="delete" title="Delete shape">🗑</button>
        </div>
      `;

      this._colorInput = this._el.querySelector('.st-color');
      this._opVal      = this._el.querySelector('[data-field="op"]');
      this._wVal       = this._el.querySelector('[data-field="w"]');

      this._colorInput.addEventListener('input', () => {
        if (!this._layer) return;
        // Migrate legacy 'color' field → 'fill_color' on first toolbar write
        this._layer.fill_color = this._colorInput.value;
        delete this._layer.color;
        this.onChange?.(this._layer);
      });

      this._el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || !this._layer) return;
        this._handleAction(btn.dataset.action);
      });
    }

    _handleAction(action) {
      switch (action) {
        case 'op-dec': {
          const cur = this._getOpacity();
          // Migrate legacy opacity
          this._layer.fill_opacity = parseFloat(Math.max(0.05, cur - 0.05).toFixed(2));
          delete this._layer.opacity;
          this._updateDisplays(); this.onChange?.(this._layer); break;
        }
        case 'op-inc': {
          const cur = this._getOpacity();
          this._layer.fill_opacity = parseFloat(Math.min(1.0, cur + 0.05).toFixed(2));
          delete this._layer.opacity;
          this._updateDisplays(); this.onChange?.(this._layer); break;
        }
        case 'w-dec': {
          const dims = (this._layer.dimensions ??= {});
          const cur  = dims.width_pct ?? 10;
          dims.width_pct = Math.max(1, cur - 1);
          if (this._isSquare()) dims.height_pct = dims.width_pct;
          this._updateDisplays(); this.onChange?.(this._layer); break;
        }
        case 'w-inc': {
          const dims = (this._layer.dimensions ??= {});
          const cur  = dims.width_pct ?? 10;
          dims.width_pct = Math.min(100, cur + 1);
          if (this._isSquare()) dims.height_pct = dims.width_pct;
          this._updateDisplays(); this.onChange?.(this._layer); break;
        }
        case 'delete':
          this.onDelete?.(this._layer); break;
      }
    }

    /** True if height_pct === width_pct at show() time (preserve square/circle aspect ratio) */
    _isSquare() {
      const d = this._layer.dimensions ?? {};
      return d.height_pct != null && d.height_pct === this._squareRef;
    }

    _getOpacity() {
      return this._layer.fill_opacity ?? this._layer.opacity ?? 1.0;
    }

    _getFillColor() {
      return this._layer.fill_color ?? this._layer.color ?? '#ffffff';
    }

    _updateDisplays() {
      if (!this._layer) return;
      this._colorInput.value = this._getFillColor();
      this._opVal.textContent = this._getOpacity().toFixed(2);
      this._wVal.textContent  = `${Math.round(this._layer.dimensions?.width_pct ?? 10)}%`;
    }

    show(layer) {
      this._layer = layer;
      // Snapshot width_pct === height_pct at open time to detect square/circle
      const d = layer.dimensions ?? {};
      this._squareRef = (d.height_pct != null && d.height_pct === d.width_pct)
        ? d.width_pct
        : null;
      this._updateDisplays();
      this._el.style.display = '';
    }

    hide() {
      this._layer = null;
      this._el.style.display = 'none';
    }

    get currentLayer() { return this._layer; }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add ui/shape-toolbar.js
  git commit -m "feat: create ShapeToolbar with fill color, opacity, size, delete"
  ```

---

## Task 8: Add CSS for floating toolbars

**Files:**
- Modify: `frameforge/styles/components.css`

- [ ] **Step 1: Remove all old `.text-toolbar-*` rules**

  In `components.css`, find the section `/* ── Text toolbar ─────────────────────────────────────────────────────── */` and delete everything from `#text-toolbar` through `.text-toolbar-color::-moz-color-swatch`.

- [ ] **Step 2: Add new shared floating toolbar base styles**

  ```css
  /* ── Floating toolbars (text + shape) ────────────────────────────────────── */

  #text-toolbar,
  #shape-toolbar {
    position: absolute;
    z-index: 50;
    background: var(--color-bg-panel);
    border: 1.5px solid var(--color-accent);
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.55);
    /* top/left set by JS */
  }

  /* Arrow pointing down toward selected layer (default) */
  #text-toolbar.arrow-down::after,
  #shape-toolbar.arrow-down::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid var(--color-accent);
    pointer-events: none;
  }

  /* Arrow pointing up (toolbar is below text) */
  #text-toolbar.arrow-up::after,
  #shape-toolbar.arrow-up::after {
    content: '';
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 8px solid var(--color-accent);
    pointer-events: none;
  }

  /* ── Text toolbar rows ──────────────────────────────────────────────────── */

  .tt-row1 {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 8px;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: nowrap;
    white-space: nowrap;
  }

  .tt-row2 {
    padding: 5px 8px;
  }

  .tt-content {
    width: 100%;
    min-width: 280px;
    box-sizing: border-box;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-base);
    padding: 4px 8px;
    height: 26px;
  }

  .tt-content:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .tt-font-btn {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-sm);
    padding: 3px 8px;
    cursor: pointer;
    height: 22px;
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tt-font-btn:hover {
    border-color: var(--color-accent);
  }

  .tt-sep {
    width: 1px;
    height: 16px;
    background: var(--color-border);
    flex-shrink: 0;
    margin: 0 2px;
  }

  .tt-label {
    font-size: 10px;
    color: var(--color-text-muted);
    user-select: none;
    flex-shrink: 0;
  }

  .tt-btn {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    width: 20px;
    height: 22px;
    padding: 0;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tt-btn:hover {
    background: var(--color-bg-panel-alt);
    border-color: var(--color-border-light);
  }

  .tt-val {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    min-width: 28px;
    text-align: center;
    user-select: none;
    flex-shrink: 0;
  }

  .tt-active {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent) !important;
    border-color: var(--color-accent) !important;
    color: var(--color-accent) !important;
  }

  .tt-delete {
    color: var(--color-text-muted);
    background: transparent;
    border-color: transparent;
  }

  .tt-delete:hover {
    color: var(--color-error);
    background: rgba(255,85,85,0.1);
    border-color: rgba(255,85,85,0.35);
  }

  .tt-color {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: none;
    cursor: pointer;
    flex-shrink: 0;
  }

  .tt-color::-webkit-color-swatch-wrapper { padding: 0; }
  .tt-color::-webkit-color-swatch { border: none; border-radius: calc(var(--radius-sm) - 1px); }
  .tt-color::-moz-color-swatch { border: none; }

  /* ── Font picker panel ──────────────────────────────────────────────────── */

  .tt-picker {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    background: var(--color-bg-panel);
    border: 1px solid var(--color-accent);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    width: 220px;
    max-height: 360px;
    overflow-y: auto;
    z-index: 60;
    padding: 6px 0;
  }

  .fp-search-wrap {
    padding: 6px 10px;
    border-bottom: 1px solid var(--color-border);
  }

  .fp-search {
    width: 100%;
    box-sizing: border-box;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-sm);
    padding: 4px 8px;
  }

  .fp-search:focus { outline: none; border-color: var(--color-accent); }

  .fp-section-title {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 6px 12px 3px;
  }

  .fp-item {
    padding: 6px 12px;
    color: var(--color-text-secondary);
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .fp-item:hover { background: var(--color-bg-surface); color: var(--color-text-primary); }
  .fp-item-active { color: var(--color-accent); font-weight: 600; }

  .fp-badge {
    font-size: 9px;
    color: var(--color-text-muted);
    background: var(--color-bg-surface);
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .fp-divider {
    height: 1px;
    background: var(--color-border);
    margin: 4px 10px;
  }

  /* ── Shape toolbar row ──────────────────────────────────────────────────── */

  .st-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 8px;
    white-space: nowrap;
  }

  /* Reuse tt-btn, tt-sep, tt-label, tt-val, tt-delete for shape toolbar */
  .st-btn   { @extend .tt-btn; }
  .st-sep   { @extend .tt-sep; }
  .st-label { @extend .tt-label; }
  .st-val   { @extend .tt-val; }

  .st-btn {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    width: 20px;
    height: 22px;
    padding: 0;
    font-size: 14px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .st-btn:hover { background: var(--color-bg-panel-alt); border-color: var(--color-border-light); }

  .st-sep { width: 1px; height: 16px; background: var(--color-border); flex-shrink: 0; margin: 0 2px; }
  .st-label { font-size: 10px; color: var(--color-text-muted); user-select: none; flex-shrink: 0; }
  .st-val { font-size: var(--font-size-sm); color: var(--color-text-primary); min-width: 28px; text-align: center; user-select: none; flex-shrink: 0; }

  .st-color {
    width: 22px; height: 22px; padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: none; cursor: pointer; flex-shrink: 0;
  }
  .st-color::-webkit-color-swatch-wrapper { padding: 0; }
  .st-color::-webkit-color-swatch { border: none; border-radius: calc(var(--radius-sm) - 1px); }
  .st-color::-moz-color-swatch { border: none; }

  .st-delete { color: var(--color-text-muted); background: transparent; border-color: transparent; }
  .st-delete:hover { color: var(--color-error); background: rgba(255,85,85,0.1); border-color: rgba(255,85,85,0.35); }
  ```

  > **Note:** The `@extend` directives above are CSS preprocessor syntax that won't work in vanilla CSS. Since this project uses plain CSS, replace `.st-btn { @extend .tt-btn; }` with the explicit rules already shown below each directive. The explicit rules are already written above — remove the `@extend` lines.

- [ ] **Step 3: Commit**

  ```bash
  git add styles/components.css
  git commit -m "feat: add floating toolbar CSS (text + shape)"
  ```

---

## Task 9: Wire both toolbars in app.js — positionElement + positionToolbar

**Files:**
- Modify: `frameforge/app.js`

- [ ] **Step 1: Add `ShapeToolbar` import**

  ```javascript
  import { ShapeToolbar } from './ui/shape-toolbar.js';
  ```

- [ ] **Step 2: Instantiate `shapeToolbar` alongside `textToolbar`**

  After the `textToolbar` instantiation:
  ```javascript
  const shapeToolbarEl = document.getElementById('shape-toolbar');
  const shapeToolbar   = new ShapeToolbar(shapeToolbarEl);
  ```

- [ ] **Step 3: Add `positionElement` helper inside `init()`**

  Add this function near the `renderCurrentFrame` function:

  ```javascript
  /**
   * Position a floating toolbar element over/under a layer's bounding box.
   * @param {HTMLElement} el — the toolbar element (position:absolute inside #canvas-wrap)
   * @param {{ top, bottom, left, right }} bounds — layer bounds in canvas pixels
   */
  function positionElement(el, bounds) {
    if (!bounds) return;
    const canvasRect  = mainCanvas.getBoundingClientRect();
    const wrapRect    = canvasWrapEl.getBoundingClientRect();
    const scaleX      = canvasRect.width  / mainCanvas.width;
    const scaleY      = canvasRect.height / mainCanvas.height;

    // Bounds in CSS px relative to canvas
    const cssTop    = bounds.top    * scaleY;
    const cssBottom = bounds.bottom * scaleY;
    const cssLeft   = bounds.left   * scaleX;
    const cssRight  = bounds.right  * scaleX;
    const cssCenter = (cssLeft + cssRight) / 2;

    // Canvas origin relative to canvas-wrap
    const canvasOffsetLeft = canvasRect.left - wrapRect.left;
    const canvasOffsetTop  = canvasRect.top  - wrapRect.top;

    const toolbarW = el.offsetWidth  || 500;
    const toolbarH = el.offsetHeight || 68;
    const GAP      = 10; // px between toolbar and layer edge
    const ARROW_H  = 8;

    // Try above first
    let top  = canvasOffsetTop + cssTop - toolbarH - GAP - ARROW_H;
    let flip = false;
    if (top < 0) {
      // Flip below
      top  = canvasOffsetTop + cssBottom + GAP + ARROW_H;
      flip = true;
    }

    // Centre horizontally over the text, clamped to canvas-wrap
    const wrapW = wrapRect.width;
    let left = canvasOffsetLeft + cssCenter - toolbarW / 2;
    left = Math.max(4, Math.min(wrapW - toolbarW - 4, left));

    el.style.top  = `${Math.round(top)}px`;
    el.style.left = `${Math.round(left)}px`;
    el.classList.toggle('arrow-down', !flip);
    el.classList.toggle('arrow-up',   flip);
  }
  ```

- [ ] **Step 4: Add `positionToolbar` dispatcher inside `init()`**

  ```javascript
  function positionToolbar() {
    const layerId = renderer.selectedLayerId;
    if (!layerId || !project.isLoaded) return;
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
    } else if (layer.type === 'shape') {
      const bounds = computeShapeBounds(ctx, layer, w, h, project);
      positionElement(shapeToolbarEl, bounds);
    }
  }
  ```

  Add the missing imports at the top of `app.js`:
  ```javascript
  import { computeTextBounds, computeShapeBounds } from './modules/layers.js';
  ```

- [ ] **Step 5: Rewrite `onLayerClick` to dispatch to the correct toolbar**

  Replace the existing `onLayerClick` function:
  ```javascript
  function onLayerClick(layer) {
    renderer.selectedLayerId = layer?.id ?? null;

    if (layer?.type === 'text') {
      textToolbar.setProjectFonts(project.getFontFamilies());
      textToolbar.show(layer);
      shapeToolbar.hide();
      // Defer positioning until the toolbar is visible and has a layout size
      requestAnimationFrame(() => positionToolbar());
    } else if (layer?.type === 'shape') {
      shapeToolbar.show(layer);
      textToolbar.hide();
      requestAnimationFrame(() => positionToolbar());
    } else {
      textToolbar.hide();
      shapeToolbar.hide();
    }
    renderCurrentFrame();
  }
  ```

- [ ] **Step 6: Update `textToolbar.onChange` and add `shapeToolbar.onChange`**

  Replace existing `textToolbar.onChange`:
  ```javascript
  textToolbar.onChange = (layer) => {
    project.save();
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    // Reposition in case text wrap changed bounds
    requestAnimationFrame(() => positionToolbar());
  };
  ```

  Add after it:
  ```javascript
  shapeToolbar.onChange = (layer) => {
    project.save();
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    requestAnimationFrame(() => positionToolbar());
  };

  shapeToolbar.onDelete = (layer) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame) return;
    frame.layers = (frame.layers ?? []).filter(l => l.id !== layer.id);
    project.save();
    shapeToolbar.hide();
    renderer.selectedLayerId = null;
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    inspector.update(project, project.activeFrameIndex, validation);
  };
  ```

- [ ] **Step 7: Hide both toolbars on frame navigation**

  In `selectFrame`, replace:
  ```javascript
  renderer.selectedLayerId = null;
  textToolbar.hide();
  ```
  With:
  ```javascript
  renderer.selectedLayerId = null;
  textToolbar.hide();
  shapeToolbar.hide();
  ```

  Also update `loadProjectData` and `doClearProject` the same way (replace `textToolbar.hide()` with both `textToolbar.hide(); shapeToolbar.hide();`).

- [ ] **Step 8: Add ResizeObserver to reposition on canvas scale change**

  The existing `ResizeObserver` already handles canvas resize. After `fitCanvas()` is called, trigger repositioning. Find the existing `ro.observe(canvasAreaEl)` code and update the callback:

  ```javascript
  const ro = new ResizeObserver(() => {
    if (project.isLoaded) {
      fitCanvas();
      requestAnimationFrame(() => positionToolbar());
    }
  });
  ro.observe(canvasAreaEl);
  ```

- [ ] **Step 9: Call `positionToolbar` from drag `onRender` callback**

  In `initDrag(...)` call inside `loadProjectData`, the `onRender` callback currently sets `renderer.isDragging = true` and re-renders. Update it to also reposition:

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

- [ ] **Step 10: Verify both toolbars position correctly**

  Load the app. Load a project.
  - Click a text layer → text toolbar should appear floating above the selected text. The content input (row 2) should show the text.
  - Click a shape layer → shape toolbar should appear floating above the shape. Fill color swatch should reflect the shape's color.
  - Click canvas background → both toolbars should hide.
  - Resize the browser window → toolbar should reposition.
  - Drag a text layer → toolbar should follow the text.

- [ ] **Step 11: Commit**

  ```bash
  git add app.js
  git commit -m "feat: wire both floating toolbars in app.js with positionElement"
  ```

---

## Task 10: Extend drag.js to handle shape layers

**Files:**
- Modify: `frameforge/modules/drag.js`

- [ ] **Step 1: Import `computeShapeBounds`**

  ```javascript
  import { computeTextBounds, computeShapeBounds } from './layers.js';
  ```

- [ ] **Step 2: Add `hitTestShapeLayer` function after `hitTestTextLayer`**

  ```javascript
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
  ```

- [ ] **Step 3: Add a unified `hitTestLayer` that checks both text and shape**

  ```javascript
  /**
   * Find the topmost draggable layer (text or shape) at the given canvas % coords.
   * Text layers take priority if they overlap.
   */
  function hitTestLayer(pct, frame, canvas, project) {
    return hitTestTextLayer(pct, frame, canvas, project)
        ?? hitTestShapeLayer(pct, frame, canvas, project);
  }
  ```

- [ ] **Step 4: Replace all uses of `hitTestTextLayer` with `hitTestLayer`**

  In `onMouseMove`:
  ```javascript
  // Before:
  const hit = hitTestTextLayer(pct, frame, canvas, project);
  // After:
  const hit = hitTestLayer(pct, frame, canvas, project);
  ```

  In `onMouseDown`:
  ```javascript
  // Before:
  const layer = hitTestTextLayer(pct, frame, canvas, project);
  // After:
  const layer = hitTestLayer(pct, frame, canvas, project);
  ```

  In `onCanvasClick`:
  ```javascript
  // Before:
  const layer = hitTestTextLayer(pct, frame, canvas, project);
  // After:
  const layer = hitTestLayer(pct, frame, canvas, project);
  ```

- [ ] **Step 5: Verify shape dragging works**

  Load the app. Load a project with a visible shape layer.
  - Hover over the shape → cursor should become `grab`.
  - Click and drag the shape → it should reposition on the canvas.
  - Release → position should persist (reload the project from storage to confirm).
  - The shape toolbar should follow the shape during drag (from Task 9 Step 9).

- [ ] **Step 6: Commit**

  ```bash
  git add modules/drag.js
  git commit -m "feat: extend drag.js to hit-test and drag shape layers"
  ```

---

## Task 11: Extend renderer.js — selection indicator and guidelines for shapes

**Files:**
- Modify: `frameforge/modules/renderer.js`

- [ ] **Step 1: Import `computeShapeBounds`**

  ```javascript
  import { renderLayer, computeTextBounds, computeShapeBounds } from './layers.js';
  ```

- [ ] **Step 2: Add `computeLayerBounds` helper**

  After the imports and before `drawSafeZoneOverlay`, add:

  ```javascript
  /**
   * Get bounding box for any selectable layer type.
   * Returns { top, bottom, left, right } in canvas pixels, or null.
   */
  function computeLayerBounds(ctx, layer, w, h, project) {
    if (layer.type === 'text')  return computeTextBounds(ctx, layer, w, h, project);
    if (layer.type === 'shape') return computeShapeBounds(ctx, layer, w, h, project);
    return null;
  }
  ```

- [ ] **Step 3: Update the selection indicator block to use `computeLayerBounds`**

  Find the selection indicator block (around line 188):
  ```javascript
  if (this.selectedLayerId) {
    const selLayer = (frame.layers ?? []).find(l => l.id === this.selectedLayerId);
    if (selLayer?.type === 'text') {
      try {
        const bounds = computeTextBounds(ctx, selLayer, effW, effH, project);
  ```

  Replace the entire selection indicator block with:
  ```javascript
  if (this.selectedLayerId) {
    const selLayer = (frame.layers ?? []).find(l => l.id === this.selectedLayerId);
    if (selLayer) {
      try {
        const bounds = computeLayerBounds(ctx, selLayer, effW, effH, project);
        if (bounds) {
          const pad = effW * 0.008;
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.lineWidth   = Math.max(1, effW / 600);
          ctx.setLineDash([effW / 70, effW / 110]);
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

- [ ] **Step 4: Update the drag guidelines block the same way**

  Find the centre-alignment guidelines block (around line 212):
  ```javascript
  if (this.isDragging && this.selectedLayerId) {
    try {
      const selLayer = (frame.layers ?? []).find(l => l.id === this.selectedLayerId);
      if (selLayer?.type === 'text') {
        const bounds = computeTextBounds(ctx, selLayer, effW, effH, project);
  ```

  Replace the `if (selLayer?.type === 'text')` check:
  ```javascript
  if (this.isDragging && this.selectedLayerId) {
    try {
      const selLayer = (frame.layers ?? []).find(l => l.id === this.selectedLayerId);
      if (selLayer) {
        const bounds = computeLayerBounds(ctx, selLayer, effW, effH, project);
        if (bounds) {
          // ... rest of the guidelines logic unchanged
  ```

  The rest of the guidelines block (computing cx, cy, drawing lines) is unchanged.

- [ ] **Step 5: Verify selection indicator shows on shapes**

  Load the app. Load a project with a visible shape. Click the shape → a dashed white rectangle should appear around it, same as for text layers.

- [ ] **Step 6: Commit**

  ```bash
  git add modules/renderer.js
  git commit -m "feat: extend selection indicator and drag guidelines to shape layers"
  ```

---

## Task 12: Investigate and fix width bug in TextToolbar

**Files:**
- Modify: `frameforge/ui/text-toolbar.js`
- Possibly: `frameforge/app.js`

- [ ] **Step 1: Reproduce the bug**

  Load the app. Load a project. Click a text layer whose `max_width_pct` is explicitly set (e.g., 80). Click the `↔ −` button. Observe whether the text wraps narrower on the canvas.

- [ ] **Step 2: Diagnose — add temporary logging**

  In the `width-dec` case of `_handleAction`, add:
  ```javascript
  case 'width-dec': {
    this._layer.max_width_pct = Math.max(10, (this._layer.max_width_pct ?? 80) - 5);
    console.log('[toolbar] width-dec → max_width_pct =', this._layer.max_width_pct, 'layer id:', this._layer.id);
    this._updateDisplays();
    this.onChange?.(this._layer);
    break;
  }
  ```

  In `app.js`, inside `textToolbar.onChange`:
  ```javascript
  textToolbar.onChange = (layer) => {
    console.log('[app] textToolbar.onChange — max_width_pct in project:',
      project.data?.frames?.[project.activeFrameIndex]?.layers
        ?.find(l => l.id === layer.id)?.max_width_pct);
    project.save();
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    requestAnimationFrame(() => positionToolbar());
  };
  ```

  Click `↔ −` and check the console. If both logs show the same updated value, the layer reference is intact and the re-render should show the change. If they differ, the toolbar holds a stale reference.

- [ ] **Step 3: Fix based on findings**

  **If stale reference:** The toolbar's `this._layer` is not the same object as `project.data.frames[n].layers[m]`. This can happen if `show(layer)` is called with a copy. Ensure `onLayerClick` in `app.js` passes the actual layer object from `project.data`:

  ```javascript
  function onLayerClick(layer) {
    // layer comes from drag.js hitTest which reads from project.data directly
    // — should be the same reference. If not, resolve it:
    if (layer) {
      const frame = project.data?.frames?.[project.activeFrameIndex];
      const liveLayer = frame?.layers?.find(l => l.id === layer.id) ?? layer;
      // use liveLayer instead of layer for toolbar.show()
    }
    ...
  }
  ```

  **If re-render doesn't redraw with new value:** Check `renderCurrentFrame()` is being called after `onChange`. Add `console.log('[renderer] max_width_pct:', layer.max_width_pct)` in `renderTextLayer` in `layers.js` temporarily to confirm the renderer sees the new value.

- [ ] **Step 4: Remove all temporary logging after fix is confirmed**

- [ ] **Step 5: Verify the fix**

  Click a text layer. Click `↔ −` three times. The text wrap should visibly narrow on the canvas. Click `↔ +` three times. The text wrap should widen back. The displayed percentage should match what's on canvas.

- [ ] **Step 6: Commit**

  ```bash
  git add ui/text-toolbar.js app.js modules/layers.js  # whichever files changed
  git commit -m "fix: resolve max_width_pct not updating canvas in text toolbar"
  ```

---

## Task 13: Final verification + spec-app.md update

**Files:**
- Modify: `docs/spec-app.md`

- [ ] **Step 1: End-to-end verification checklist**

  Load the app in the browser. Run through all of these:

  - [ ] Load a JSON project → renders without errors
  - [ ] Click a text layer → floating toolbar appears above it, arrow points down
  - [ ] Text near top of canvas → floating toolbar appears below it, arrow points up
  - [ ] Edit text content in row 2 → canvas updates live
  - [ ] Click font button → picker opens showing project fonts + curated list
  - [ ] Select a font from curated list → canvas re-renders with new font
  - [ ] Type a custom font name in search → "use this font" entry appears
  - [ ] Size stepper → text size changes on canvas
  - [ ] Bold/Italic → toggles, `is-active` class applied
  - [ ] Alignment buttons → text alignment changes, correct button highlighted
  - [ ] Line height stepper → line spacing changes on canvas
  - [ ] Width stepper → text wrap width changes on canvas (the bug should be fixed)
  - [ ] Color picker → text color updates
  - [ ] Shadow toggle → shadow appears/disappears
  - [ ] Delete → layer removed from canvas and project
  - [ ] Click a shape → shape toolbar appears, text toolbar hides
  - [ ] Shape fill color → fill color changes on canvas
  - [ ] Shape opacity → opacity changes on canvas
  - [ ] Shape size → width changes on canvas; square/circle updates both axes
  - [ ] Drag text → toolbar follows text during drag
  - [ ] Drag shape → shape repositions; toolbar follows
  - [ ] Zone snap during text drag → text snaps to zone, cursor shows crosshair
  - [ ] Click canvas background → both toolbars hide
  - [ ] Navigate frames → both toolbars hide
  - [ ] Resize browser window → toolbar repositions to follow layer
  - [ ] Load a project that previously had `pin_above` rule lines → renders without errors (lines render at their `x_pct`/`y_pct` position)

- [ ] **Step 2: Update `docs/spec-app.md`**

  Find the text-editing section and update it to describe:
  - The floating 2-row toolbar (both rows, all controls)
  - The font picker (3 sections)
  - The floating shape toolbar (fill color, opacity, size, delete)
  - The fact that shapes are now draggable
  - Remove all remaining `pin_above` references

- [ ] **Step 3: Final commit**

  ```bash
  git add docs/spec-app.md
  git commit -m "docs: update spec-app.md for floating toolbars and shape interactivity"
  ```
