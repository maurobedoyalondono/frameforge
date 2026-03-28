# Text Toolbar Extended + Drag Guidelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bold toggle, shadow toggle, and colour picker to the text layer toolbar; add visual centre-alignment guidelines to the canvas during drag.

**Architecture:** Four isolated file changes with no new files. The toolbar (`ui/text-toolbar.js`) gains three new controls and the logic to drive them. The renderer (`modules/renderer.js`) gains an `isDragging` flag and the guideline drawing block. `app.js` sets/clears `isDragging` by wrapping the `onRender`/`onComplete` callbacks in the existing `initDrag` call. `styles/components.css` gets the `.is-active` toggle style and the colour swatch size.

**Tech Stack:** Vanilla JS ES6 modules, HTML5 Canvas, no build step, no test framework — verification is manual (open `index.html` in a browser).

---

## File Map

| File | Change |
|---|---|
| `ui/text-toolbar.js` | Add bold toggle, shadow toggle, colour picker to `_build`; extend `_handleAction` and `_updateDisplays`; store new element refs |
| `modules/renderer.js` | Add `isDragging = false` to constructor; add guideline drawing block in `renderFrame` |
| `app.js` | Wrap `onRender`/`onComplete` in `initDrag` call to set/clear `renderer.isDragging` |
| `styles/components.css` | Add `.is-active` style for toggle buttons; add `.text-toolbar-color` swatch size rule |

---

## Task 1: Extend `ui/text-toolbar.js`

**Files:**
- Modify: `ui/text-toolbar.js`

### What to build

Three new controls inserted between the Width group and the delete button:

```
[ text input ] [sep] [ Size −/+ ] [sep] [ Width −/+ ] [sep] [ B ] [sep] [ Shadow ] [sep] [color swatch] [sep] [ 🗑 ]
```

- **Bold toggle** (`data-action="bold"`): button labelled **B** with `font-weight:700` inline style. Toggles `layer.font.weight` between `700` and `400`. Gets `.is-active` when bold is on.
- **Shadow toggle** (`data-action="shadow"`): button labelled **Shadow**. Toggles `layer.shadow.enabled`. On first enable (no existing shadow object), writes defaults `{ enabled: true, color: '#000000', blur_px: 8, offset_x: 2, offset_y: 2, opacity: 0.6 }`. Gets `.is-active` when shadow is on.
- **Colour picker** (`type="color"`): native `<input type="color" class="text-toolbar-color">`. Wired to `layer.font.color`. Initialised from `layer.font?.color ?? '#ffffff'` in `show()`.

- [ ] **Step 1: Replace `_build()` HTML**

Replace the entire template string inside `_build()`. The new HTML adds the three controls before the delete button:

```javascript
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
      <button class="btn text-toolbar-btn text-toolbar-toggle" data-action="bold" title="Toggle bold" style="font-weight:700">B</button>
      <div class="text-toolbar-sep"></div>
      <button class="btn text-toolbar-btn text-toolbar-toggle" data-action="shadow" title="Toggle shadow">Shadow</button>
      <div class="text-toolbar-sep"></div>
      <input type="color" class="text-toolbar-color" title="Text colour">
      <div class="text-toolbar-sep"></div>
      <button class="btn text-toolbar-delete" data-action="delete" title="Delete text layer">🗑</button>
    </div>
  `;
```

- [ ] **Step 2: Store new element refs in `_build()` after `innerHTML` assignment**

After the three existing `querySelector` lines, add:

```javascript
this._boldBtn    = this._el.querySelector('[data-action="bold"]');
this._shadowBtn  = this._el.querySelector('[data-action="shadow"]');
this._colorInput = this._el.querySelector('.text-toolbar-color');
```

Then wire the colour input's `input` event (add this after the existing `this._contentInput.addEventListener` block):

```javascript
this._colorInput.addEventListener('input', () => {
  if (!this._layer) return;
  const font = this._layer.font ?? (this._layer.font = {});
  font.color = this._colorInput.value;
  this.onChange?.(this._layer);
});
```

- [ ] **Step 3: Add `bold` and `shadow` cases to `_handleAction()`**

Add two new cases to the `switch` statement, before the `case 'delete':` line:

```javascript
case 'bold': {
  const font = this._layer.font ?? (this._layer.font = {});
  font.weight = (font.weight >= 700) ? 400 : 700;
  this._updateDisplays();
  this.onChange?.(this._layer);
  break;
}
case 'shadow': {
  if (!this._layer.shadow || !this._layer.shadow.enabled) {
    this._layer.shadow = {
      enabled: true,
      color: '#000000',
      blur_px: 8,
      offset_x: 2,
      offset_y: 2,
      opacity: 0.6,
      ...(this._layer.shadow ?? {}),
    };
  } else {
    this._layer.shadow.enabled = false;
  }
  this._updateDisplays();
  this.onChange?.(this._layer);
  break;
}
```

- [ ] **Step 4: Extend `_updateDisplays()` to sync new controls**

Append three lines at the end of `_updateDisplays()`:

```javascript
this._boldBtn.classList.toggle('is-active', (this._layer.font?.weight ?? 400) >= 700);
this._shadowBtn.classList.toggle('is-active', this._layer.shadow?.enabled === true);
this._colorInput.value = this._layer.font?.color ?? '#ffffff';
```

- [ ] **Step 5: Initialise colour in `show()`**

In `show(layer)`, after `this._updateDisplays()`, there is nothing extra needed — `_updateDisplays()` now sets the colour input. Confirm that `_updateDisplays()` is called inside `show()`. It already is:

```javascript
show(layer) {
  this._layer = layer;
  this._contentInput.value = layer.content ?? '';
  this._updateDisplays(); // ← already calls the new lines you added in Step 4
  this._el.style.display = '';
}
```

No change needed here — just verify it.

- [ ] **Step 6: Commit**

```bash
git add ui/text-toolbar.js
git commit -m "feat: add bold/shadow toggle and colour picker to text toolbar"
```

---

## Task 2: Add `isDragging` + guidelines to `modules/renderer.js`

**Files:**
- Modify: `modules/renderer.js`

### What to build

1. `this.isDragging = false` in the constructor.
2. A guideline drawing block in `renderFrame`, inserted **after** the selection indicator block and **before** the safe zone overlay block. The block computes the selected text layer's bounds, and if the layer centre is within 3% of canvas centre on either axis, draws a full-width or full-height dashed line at the canvas centre.

- [ ] **Step 1: Add `isDragging` to the constructor**

In the `Renderer` constructor, after `this.selectedLayerId = null;`, add:

```javascript
/** @type {boolean} */
this.isDragging = false;
```

The constructor should now look like:

```javascript
constructor() {
  /** @type {boolean} */
  this.showSafeZone = false;
  /** @type {string|null} */
  this.selectedLayerId = null;
  /** @type {boolean} */
  this.isDragging = false;
}
```

- [ ] **Step 2: Add guideline drawing block in `renderFrame`**

Locate the comment `// Safe zone overlay` in `renderFrame` (currently at line ~197). Insert the following block **immediately before** that comment:

```javascript
// Centre-alignment guidelines (shown while dragging)
if (this.isDragging && this.selectedLayerId) {
  try {
    const selLayer = (frame.layers ?? []).find(l => l.id === this.selectedLayerId);
    if (selLayer?.type === 'text') {
      const bounds = computeTextBounds(ctx, selLayer, canvasW, canvasH, project);
      if (bounds) {
        const cx = (bounds.left + bounds.right)  / 2;
        const cy = (bounds.top  + bounds.bottom) / 2;
        const threshX = canvasW * 0.03;
        const threshY = canvasH * 0.03;
        const drawV = Math.abs(cx - canvasW / 2) < threshX;
        const drawH = Math.abs(cy - canvasH / 2) < threshY;
        if (drawV || drawH) {
          ctx.save();
          ctx.strokeStyle = 'rgba(100, 180, 255, 0.7)';
          ctx.lineWidth   = Math.max(1, canvasW / 800);
          ctx.setLineDash([canvasW / 150, canvasW / 100]);
          if (drawV) {
            ctx.beginPath();
            ctx.moveTo(canvasW / 2, 0);
            ctx.lineTo(canvasW / 2, canvasH);
            ctx.stroke();
          }
          if (drawH) {
            ctx.beginPath();
            ctx.moveTo(0, canvasH / 2);
            ctx.lineTo(canvasW, canvasH / 2);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
  } catch { /* cosmetic — must not break render */ }
}
```

- [ ] **Step 3: Verify placement**

After edits, the order inside the `try` block in `renderFrame` should be:

1. Background fill
2. Pre-compute text bounds
3. Render layers
4. Frame-level logo
5. Selection indicator
6. **Centre-alignment guidelines** ← newly inserted
7. Safe zone overlay

- [ ] **Step 4: Commit**

```bash
git add modules/renderer.js
git commit -m "feat: add isDragging flag and centre-alignment guidelines to renderer"
```

---

## Task 3: Wire `renderer.isDragging` in `app.js`

**Files:**
- Modify: `app.js`

### What to build

The existing `initDrag` call passes two lambdas:
- `onRender` (4th arg): `() => renderCurrentFrame()`
- `onComplete` (5th arg): `(frameIndex) => { filmstrip.renderOne(frameIndex, project); }`

Wrap them to set/clear `renderer.isDragging`:

```javascript
initDrag(
  mainCanvas,
  project,
  () => project.activeFrameIndex,
  () => { renderer.isDragging = true;  renderCurrentFrame(); },
  (frameIndex) => { renderer.isDragging = false; filmstrip.renderOne(frameIndex, project); },
  onLayerClick,
);
```

- [ ] **Step 1: Update the `initDrag` call**

Find the block (around line 341):

```javascript
initDrag(
  mainCanvas,
  project,
  () => project.activeFrameIndex,
  () => renderCurrentFrame(),
  (frameIndex) => {
    filmstrip.renderOne(frameIndex, project);
  },
  onLayerClick,
);
```

Replace with:

```javascript
initDrag(
  mainCanvas,
  project,
  () => project.activeFrameIndex,
  () => { renderer.isDragging = true;  renderCurrentFrame(); },
  (frameIndex) => { renderer.isDragging = false; filmstrip.renderOne(frameIndex, project); },
  onLayerClick,
);
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: wire renderer.isDragging via initDrag callbacks for guidelines"
```

---

## Task 4: Add CSS for toggle `.is-active` and colour swatch

**Files:**
- Modify: `styles/components.css`

### What to build

Append two rule blocks after the existing `.text-toolbar-delete:hover` rule (the last rule in the text toolbar section, around line 1195):

1. `.text-toolbar-toggle.is-active` — highlighted background + accent-coloured border to show active state.
2. `.text-toolbar-color` — fixed 24×24 px square, no default browser padding/border, cursor pointer.

- [ ] **Step 1: Append new rules to `styles/components.css`**

After the `.text-toolbar-delete:hover` closing brace, append:

```css
.text-toolbar-toggle.is-active {
  background: rgba(var(--color-accent-rgb, 99, 179, 237), 0.18);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.text-toolbar-color {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: none;
  cursor: pointer;
  flex-shrink: 0;
}

.text-toolbar-color::-webkit-color-swatch-wrapper {
  padding: 0;
}

.text-toolbar-color::-webkit-color-swatch {
  border: none;
  border-radius: calc(var(--radius-sm) - 1px);
}
```

> **Note on accent colour:** The project uses `var(--color-accent)` for the border/text tint. The background tint uses `--color-accent-rgb` (an RGB triple like `99, 179, 237`) to construct an `rgba()`. If `--color-accent-rgb` is not defined in the project's CSS variables, the fallback `99, 179, 237` (light blue) will be used — acceptable as a default.

- [ ] **Step 2: Verify `--color-accent-rgb` exists or fallback is fine**

Run:
```bash
grep -n "color-accent" styles/theme.css styles/variables.css styles/base.css 2>/dev/null | head -20
```

If `--color-accent-rgb` is defined, use it. If not, the fallback `99, 179, 237` is visually acceptable and no further change is needed.

- [ ] **Step 3: Commit**

```bash
git add styles/components.css
git commit -m "feat: add is-active toggle style and colour swatch CSS for text toolbar"
```

---

## Manual Verification Checklist

Open `frameforge/index.html` in a browser. Load or create a project with a text layer.

- [ ] Click a text layer → toolbar appears
- [ ] **Bold:** Click **B** → button highlights (`.is-active`), text becomes bold on canvas. Click again → un-highlights, text returns to normal weight.
- [ ] **Shadow:** Click **Shadow** → button highlights, text layer gains a shadow on canvas. Click again → shadow disabled (button un-highlights). Re-click → shadow re-enabled from saved values (no new defaults object created).
- [ ] **Colour:** Click the colour swatch → native colour picker opens. Change colour → canvas updates immediately.
- [ ] **Colour init:** Click a different text layer → colour swatch shows that layer's `font.color` (or white if none).
- [ ] **Guidelines:** Drag a text layer towards canvas centre → dashed blue guidelines appear at canvas centre when within ~3% on either axis. Stop dragging → guidelines disappear.
- [ ] **No guideline when not dragging:** Select a layer without dragging → no blue lines.
- [ ] **No render crash:** All interactions above complete without console errors.
