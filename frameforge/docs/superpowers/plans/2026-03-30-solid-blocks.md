# Solid Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add solid shape blocks as a first-class design and text-readability tool — with a height control in the shape toolbar, add-layer buttons in the layers panel, and full documentation coverage across the AI manual, skills, and README.

**Architecture:** No new layer type. Solid blocks are existing `shape` layers with `fill_opacity` at or near `1.0`. UI changes are: (1) shape toolbar gains a `↕` height control, (2) the layers panel header gains three add-layer buttons (`T+`, `◼`, `▓`) where `◼` opens a shape-type popover (Bar / Square / Circle), (3) `app.js` wires the callback and provides three default-layer factories. Documentation updates are pure text edits in six files.

**Tech Stack:** Vanilla JS ES modules, HTML/CSS, no build step, no test framework.

---

## Files changed

| File | Change |
|---|---|
| `frameforge/ui/shape-toolbar.js` | Add `↕` height control group |
| `frameforge/ui/layers-panel.js` | Add `onAddLayer` callback, add-layer buttons, shape popover |
| `frameforge/styles/components.css` | CSS for add buttons, vertical separator, popover |
| `frameforge/app.js` | `makeUniqueId`, three layer factories, `layersPanel.onAddLayer` wiring |
| `frameforge/data/ai-manual-content.js` | New "Solid Blocks" section; updated layer order and shapes table |
| `.claude/skills/frameforge-art-director/SKILL.md` | Overlay gate extended; new Solid block gate added |
| `.claude/skills/frameforge-color-advisor/SKILL.md` | Busy/high-texture row gets solid-block flag note |
| `frameforge/data/test-projects/README.md` | Step 5b and Step 8 solid-block guidance |

---

## Task 1: Shape toolbar — height control

**Files:**
- Modify: `frameforge/ui/shape-toolbar.js`

- [ ] **Step 1: Replace `_build()` innerHTML in `shape-toolbar.js`**

Open `frameforge/ui/shape-toolbar.js`. The `_build()` method currently has a single `<div class="st-row">`. Replace the entire `_build()` method body with the version below, which adds `↕` height controls after the width controls:

```javascript
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
      <span class="st-label" title="Height">↕</span>
      <button class="st-btn" data-action="h-dec">−</button>
      <span class="st-val" data-field="h">—</span>
      <button class="st-btn" data-action="h-inc">+</button>
      <div class="st-sep"></div>
      <button class="st-btn st-delete" data-action="delete" title="Delete shape">🗑</button>
    </div>
  `;

  this._colorInput = this._el.querySelector('.st-color');
  this._opVal      = this._el.querySelector('[data-field="op"]');
  this._wVal       = this._el.querySelector('[data-field="w"]');
  this._hVal       = this._el.querySelector('[data-field="h"]');

  this._colorInput.addEventListener('input', () => {
    if (!this._layer) return;
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
```

- [ ] **Step 2: Add `h-dec` and `h-inc` cases to `_handleAction`**

In the same file, find the `_handleAction` switch statement. Add these two cases immediately before the `case 'delete':` line:

```javascript
case 'h-dec': {
  const dims = (this._layer.dimensions ??= {});
  const cur  = dims.height_pct ?? 10;
  dims.height_pct = Math.max(2, cur - 2);
  this._updateDisplays(); this.onChange?.(this._layer); break;
}
case 'h-inc': {
  const dims = (this._layer.dimensions ??= {});
  const cur  = dims.height_pct ?? 10;
  dims.height_pct = Math.min(100, cur + 2);
  this._updateDisplays(); this.onChange?.(this._layer); break;
}
```

- [ ] **Step 3: Update `_updateDisplays` to show height**

Replace the existing `_updateDisplays()` method:

```javascript
_updateDisplays() {
  if (!this._layer) return;
  this._colorInput.value = this._getFillColor();
  this._opVal.textContent = this._getOpacity().toFixed(2);
  this._wVal.textContent  = `${Math.round(this._layer.dimensions?.width_pct  ?? 10)}%`;
  this._hVal.textContent  = `${Math.round(this._layer.dimensions?.height_pct ?? 10)}%`;
}
```

- [ ] **Step 4: Verify manually**

Open FrameForge in the browser (`http://127.0.0.1:5500/frameforge/index.html`). Load a JSON project. Select a shape layer. Confirm the toolbar now shows: `Op` · `↔` · `↕` · 🗑. Click `↕ +` several times — confirm `height_pct` increases on the rendered shape. Confirm width control still works. Confirm `↕` on a `line` shape changes `height_pct` but has no visible effect (expected — lines use `height_px`, not `height_pct`).

- [ ] **Step 5: Commit**

```bash
git add frameforge/ui/shape-toolbar.js
git commit -m "feat: add height control to shape toolbar"
```

---

## Task 2: Layers panel — add-layer buttons and shape popover

**Files:**
- Modify: `frameforge/ui/layers-panel.js`

- [ ] **Step 1: Add `onAddLayer` callback and `_popoverEl` field to the constructor**

In `layers-panel.js`, find the `constructor(el)` block. After the existing `this.onLayerDelete = null;` line, add:

```javascript
this.onAddLayer = null; // (type: string, variant?: string) => void
this._popoverEl = null;
```

- [ ] **Step 2: Replace `_build()` with the version that includes add-layer buttons and popover**

Replace the entire `_build()` method with:

```javascript
_build() {
  this._el.innerHTML = `
    <div class="lp-header">
      <span class="lp-title">Layers</span>
      <div class="lp-header-actions">
        <button class="lp-btn lp-btn-add" data-action="add-text"    title="Add text layer">T+</button>
        <button class="lp-btn lp-btn-add" data-action="add-shape"   title="Add shape layer">◼</button>
        <button class="lp-btn lp-btn-add" data-action="add-overlay" title="Add overlay layer">▓</button>
        <div class="lp-sep-v"></div>
        <button class="lp-btn lp-btn-all" data-action="show-all" title="Show all layers">👁</button>
        <button class="lp-btn lp-btn-all" data-action="hide-all" title="Hide all layers">⊘</button>
      </div>
    </div>
    <div class="lp-list"></div>
    <div class="lp-shape-popover" style="display:none">
      <button class="lp-popover-btn" data-variant="bar">▬ Bar</button>
      <button class="lp-popover-btn" data-variant="square">■ Square</button>
      <button class="lp-popover-btn" data-variant="circle">● Circle</button>
    </div>
  `;

  this._listEl    = this._el.querySelector('.lp-list');
  this._popoverEl = this._el.querySelector('.lp-shape-popover');

  const header = this._el.querySelector('.lp-header');
  header.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'show-all')    { this.onLayerVisibilityAll?.(true);  return; }
    if (btn.dataset.action === 'hide-all')    { this.onLayerVisibilityAll?.(false); return; }
    if (btn.dataset.action === 'add-text')    { this.onAddLayer?.('text');          return; }
    if (btn.dataset.action === 'add-overlay') { this.onAddLayer?.('overlay');       return; }
    if (btn.dataset.action === 'add-shape')   { this._toggleShapePopover();         return; }
  });

  this._popoverEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-variant]');
    if (!btn) return;
    this._popoverEl.style.display = 'none';
    this.onAddLayer?.('shape', btn.dataset.variant);
  });

  document.addEventListener('click', e => {
    if (!this._popoverEl || this._popoverEl.style.display === 'none') return;
    if (!this._el.contains(e.target)) this._popoverEl.style.display = 'none';
  });

  this._initDrag(header);

  this._listEl.addEventListener('click', e => {
    const row = e.target.closest('[data-layer-id]');
    if (!row) return;
    const layerId = row.dataset.layerId;

    if (e.target.closest('[data-action="eye"]')) {
      this.onLayerVisibilityToggle?.(layerId);
      return;
    }
    if (e.target.closest('[data-action="delete"]')) {
      this.onLayerDelete?.(layerId);
      return;
    }
    this.onLayerSelect?.(layerId);
  });
}
```

- [ ] **Step 3: Add `_toggleShapePopover` method**

After the `_build()` method (before `_typeIcon`), add:

```javascript
_toggleShapePopover() {
  if (!this._popoverEl) return;
  const isOpen = this._popoverEl.style.display !== 'none';
  this._popoverEl.style.display = isOpen ? 'none' : '';
}
```

- [ ] **Step 4: Verify manually**

Open FrameForge. Open the Layers panel (`L`). Confirm three new buttons appear left of the eye/hide buttons: `T+`, `◼`, `▓`. Click `◼` — confirm popover shows Bar / Square / Circle options. Click outside — confirm popover closes. (Buttons won't insert layers yet — `onAddLayer` is wired in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add frameforge/ui/layers-panel.js
git commit -m "feat: add add-layer buttons and shape popover to layers panel"
```

---

## Task 3: CSS — add buttons, separator, popover

**Files:**
- Modify: `frameforge/styles/components.css`

- [ ] **Step 1: Add styles after the existing `.lp-btn-all:hover` rule**

In `frameforge/styles/components.css`, find the line:

```css
.lp-btn-all:hover { opacity: 1; background: var(--color-surface-hover, rgba(255,255,255,0.08)); }
```

Immediately after it, insert:

```css
.lp-btn-add {
  font-size: 11px; font-weight: 600; line-height: 1;
  padding: 2px 5px; border-radius: 4px;
  background: none; border: none; cursor: pointer;
  color: var(--color-text-muted); opacity: 0.7;
}
.lp-btn-add:hover { opacity: 1; background: var(--color-surface-hover, rgba(255,255,255,0.08)); }
.lp-sep-v {
  width: 1px; height: 14px;
  background: var(--color-border);
  flex-shrink: 0; margin: 0 3px;
}
.lp-shape-popover {
  position: absolute;
  top: calc(100% - 2px);
  right: 0;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  padding: 4px 0;
  z-index: 200;
  min-width: 110px;
}
.lp-popover-btn {
  display: block; width: 100%;
  padding: 6px 12px;
  background: none; border: none; cursor: pointer;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  text-align: left; white-space: nowrap;
}
.lp-popover-btn:hover { background: var(--color-surface-hover, rgba(255,255,255,0.08)); }
```

Also ensure the layers panel container has `position: relative` so the popover anchors correctly. Find the existing `#layers-panel` or `.lp-panel` rule in `components.css` and confirm `position` is set. The panel is already `position: fixed` or `absolute` (it's draggable), so the popover's `position: absolute` will anchor to it correctly. No change needed.

- [ ] **Step 2: Verify manually**

Open FrameForge. Open the Layers panel. Confirm the `T+` / `◼` / `▓` buttons are visible and styled (not cramped). Confirm the vertical separator appears between the add group and the show/hide group. Click `◼` — confirm the popover appears below the header, styled with background, border, and three rows.

- [ ] **Step 3: Commit**

```bash
git add frameforge/styles/components.css
git commit -m "feat: add CSS for layers panel add buttons and shape popover"
```

---

## Task 4: App wiring — layer factories and onAddLayer

**Files:**
- Modify: `frameforge/app.js`

- [ ] **Step 1: Add the four helper functions inside the `init()` function**

In `frameforge/app.js`, find the `async function init() {` opening. Add these four functions as local helpers immediately after the `// ── DOM refs` block (before module instances are created, around line 47):

```javascript
// ── Layer factories ──────────────────────────────────────────────────────

function makeUniqueId(prefix, frame) {
  const existing = new Set((frame.layers ?? []).map(l => l.id));
  let n = 1;
  while (existing.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

function makeDefaultTextLayer(id) {
  return {
    id,
    type: 'text',
    content: 'Text',
    font: {
      family: 'Inter', style: 'normal', weight: 400,
      size_pct: 5, line_height: 1.2, color: '#FFFFFF', opacity: 1.0,
    },
    position: { mode: 'zone', zone: 'bottom-left', offset_x_pct: 6, offset_y_pct: -8 },
    max_width_pct: 80,
    align: 'left',
  };
}

function makeDefaultShapeLayer(id, variant) {
  const base = { id, type: 'shape', fill_color: '#000000', fill_opacity: 0.85 };
  if (variant === 'circle') {
    return { ...base, shape: 'circle',
      position: { x_pct: 50, y_pct: 50 },
      dimensions: { width_pct: 20, height_pct: 20 } };
  }
  if (variant === 'square') {
    return { ...base, shape: 'rectangle',
      position: { x_pct: 50, y_pct: 50 },
      dimensions: { width_pct: 25, height_pct: 25 } };
  }
  // bar (default)
  return { ...base, shape: 'rectangle',
    position: { x_pct: 50, y_pct: 87 },
    dimensions: { width_pct: 100, height_pct: 26 } };
}

function makeDefaultOverlayLayer(id) {
  return {
    id,
    type: 'overlay',
    color: '#000000',
    opacity: 1.0,
    blend_mode: 'normal',
    gradient: {
      enabled: true,
      direction: 'to-bottom',
      from_opacity: 0.0,
      from_position_pct: 45,
      to_opacity: 0.65,
      to_position_pct: 100,
    },
  };
}
```

- [ ] **Step 2: Wire `layersPanel.onAddLayer`**

In `app.js`, find the block that wires `layersPanel.onLayerDelete` (around line 468). Immediately after that block, add:

```javascript
layersPanel.onAddLayer = (type, variant) => {
  const frame = project.data?.frames?.[project.activeFrameIndex];
  if (!frame) return;
  frame.layers ??= [];

  let layer;
  if (type === 'text') {
    layer = makeDefaultTextLayer(makeUniqueId('text', frame));
  } else if (type === 'shape') {
    layer = makeDefaultShapeLayer(makeUniqueId('solid-block', frame), variant ?? 'bar');
  } else if (type === 'overlay') {
    layer = makeDefaultOverlayLayer(makeUniqueId('overlay', frame));
  } else {
    return;
  }

  frame.layers.push(layer);
  project.save();
  layersPanel.render(frame);
  onLayerClick(layer);
  renderCurrentFrame();
  filmstrip.renderOne(project.activeFrameIndex, project);
};
```

- [ ] **Step 3: Verify manually — Bar insert**

Open FrameForge. Load a project. Open the Layers panel. Click `◼` → `▬ Bar`. Confirm:
- A new `solid-block-1` layer appears in the layers list
- A solid black rectangle renders at the bottom of the canvas
- The shape toolbar appears with Op / ↔ / ↕ controls populated
- Adjust ↕ — confirm height changes on the canvas
- Adjust fill color — confirm it updates live

- [ ] **Step 4: Verify manually — Square and Circle**

Click `◼` → `■ Square`. Confirm a square badge appears centered on the canvas. Click `◼` → `● Circle`. Confirm a circle appears. Both should have the shape toolbar showing.

- [ ] **Step 5: Verify manually — Text and Overlay inserts**

Click `T+` — confirm a text layer named `text-1` appears in the layers list and the text toolbar shows. Click `▓` — confirm an `overlay-1` gradient overlay is added.

- [ ] **Step 6: Verify manually — ID uniqueness**

Add two bars in a row. Confirm they are named `solid-block-1` and `solid-block-2`, not both `solid-block-1`.

- [ ] **Step 7: Commit**

```bash
git add frameforge/app.js
git commit -m "feat: wire add-layer callbacks and default layer factories in app.js"
```

---

## Task 5: AI manual — Solid Blocks section

**Files:**
- Modify: `frameforge/data/ai-manual-content.js`

- [ ] **Step 1: Update the layer order rule in Overlay Rules**

In `ai-manual-content.js`, find this exact line (inside the `AI_MANUAL` template literal):

```
Always: image → overlay(s) → shapes → text. Overlays go above the photo and below everything else.
```

Replace it with:

```
Always: image → overlay(s) → solid blocks → shapes → text. Overlays go above the photo; solid blocks sit above overlays; decorative shapes and text sit above solid blocks.
```

- [ ] **Step 2: Add two rows to the "Shapes — Use Them Intentionally" table**

Find this line in the shapes table:

```
| Location identity / scene depth | \`image_mask\` | Frailejón silhouette at frame bottom, mountain range horizon |
```

After that row, add:

```
| Text readability backing | \`rectangle\`, \`circle\` | Solid bar at photo bottom; circle badge behind a stat |
| Compositional anchor / design statement | \`rectangle\`, \`circle\` | Bold color block on a flat or static composition |
```

- [ ] **Step 3: Insert the new "Solid Blocks" section**

Find the line `### Vary overlays per frame` and the paragraph that follows it, ending with `---`. After that closing `---`, insert the new section:

```
## Solid Blocks

Solid blocks are \`shape\` layers used at high opacity. They serve two equal roles.

**Legibility:** When the text zone has heavy texture, repeating pattern, or competing hues, a gradient overlay produces uneven contrast. A solid block gives text a flat surface to read against, eliminating the problem entirely.

**Aesthetic:** Solid geometric forms are a first-class design tool. A bold color block, a white circle breaking a monotone composition, a black bar anchoring the frame — these are editorial design statements. They add visual energy, structure, and character to compositions that would otherwise read as flat or static.

Neither role is a fallback. Both are legitimate reasons to add a solid block.

### When to use a solid block

- Text zone has heavy texture, repeating pattern, or color variation that makes a gradient insufficient
- The photo color at the text zone fights any overlay tint regardless of opacity
- The composition reads as flat or static — a strong geometric form would inject visual energy
- You want a deliberate editorial frame: bold black bar, color band, graphic circle

### Presets

**Bar — bottom cover (most common):**
\`\`\`json
{
  "id": "solid-bar",
  "type": "shape",
  "shape": "rectangle",
  "position": { "x_pct": 50, "y_pct": 87 },
  "dimensions": { "width_pct": 100, "height_pct": 26 },
  "fill_color": "#000000",
  "fill_opacity": 0.85
}
\`\`\`
Text layers that sit on the bar go above it in the layer stack (appear later in the \`layers\` array). No gradient overlay is needed for that zone.

**Square badge:**
\`\`\`json
{
  "id": "solid-badge",
  "type": "shape",
  "shape": "rectangle",
  "position": { "x_pct": 50, "y_pct": 50 },
  "dimensions": { "width_pct": 25, "height_pct": 25 },
  "fill_color": "#000000",
  "fill_opacity": 0.85
}
\`\`\`

**Circle badge:**
\`\`\`json
{
  "id": "solid-circle",
  "type": "shape",
  "shape": "circle",
  "position": { "x_pct": 50, "y_pct": 50 },
  "dimensions": { "width_pct": 20, "height_pct": 20 },
  "fill_color": "#000000",
  "fill_opacity": 0.85
}
\`\`\`

### Solid block color

Choose a color that serves the design:
- Black (\`#000000\`) — editorial weight, maximum contrast
- White (\`#FFFFFF\`) — light, airy, graphic inversion
- A series palette color — brand coherence

Opacity \`0.85\` is a solid starting point. Push to \`1.0\` for full solidity; pull to \`0.6–0.75\` for a semi-transparent version that still provides contrast but lets the photo breathe slightly at the edges.

---
```

- [ ] **Step 4: Verify**

Open FrameForge in the browser. Open **Export Brief** (or load a project and inspect the AI manual text from the export). Confirm the new "Solid Blocks" section appears after "Vary overlays per frame" and the layer order line now reads `image → overlay(s) → solid blocks → shapes → text`.

- [ ] **Step 5: Commit**

```bash
git add frameforge/data/ai-manual-content.js
git commit -m "docs: add Solid Blocks section to AI manual; update layer order and shapes table"
```

---

## Task 6: Art director skill — overlay gate + solid block gate

**Files:**
- Modify: `.claude/skills/frameforge-art-director/SKILL.md`

- [ ] **Step 1: Extend the Overlay gate**

Find the **Overlay gate** section:

```markdown
### Overlay gate

Does any text in this frame need legibility help against the photograph?
- **Yes** → apply a gradient only over the text zone, at the minimum opacity the image requires. Look at the actual pixels, not the draft number.
- **No** → omit the overlay entirely. An overlay that darkens the photograph without serving a specific text legibility need is an error, not a default.
```

Replace it with:

```markdown
### Overlay gate

Does any text in this frame need legibility help against the photograph?
- **Yes, and the text zone is smooth / low-texture** → apply a gradient over the text zone at the minimum opacity the image requires. Look at the actual pixels, not the draft number.
- **Yes, but the text zone is high-texture, patterned, or color-conflicted** → consider a solid block instead of or alongside the gradient. A solid rectangle at the bottom eliminates the readability problem entirely — the text reads against a flat surface regardless of what the photo is doing underneath. State your decision explicitly: "used solid block" or "gradient sufficient."
- **No** → omit the overlay entirely. An overlay that darkens the photograph without serving a specific text legibility need is an error, not a default.
```

- [ ] **Step 2: Add the Solid block gate after the Shapes gate**

Find the **Shapes gate** section:

```markdown
### Shapes gate

Have you consciously considered whether a shape would strengthen this frame? Re-read the shapes section in `frameforge-spec.md`. A deliberate no is valid. An unconsidered skip is not. State your decision explicitly in your delivery.
```

After it, insert:

```markdown
### Solid block gate

Independently of text readability: does this frame feel static, flat, or visually inert? Look at the photograph. Is there graphic tension, or does everything sit at the same visual weight?

A solid block — a bold rectangle, a circle, a color band — can inject structure and energy that no amount of text or gradient adjustment can achieve. This is an aesthetic decision, not a technical fix.

Ask: would a strong geometric form make this frame more compelling? If yes, add it. State your decision explicitly: "added solid block for compositional energy" or "composition is sufficiently dynamic without it."
```

- [ ] **Step 3: Verify**

Read `.claude/skills/frameforge-art-director/SKILL.md`. Confirm the Overlay gate now has three bullet points covering smooth zones, textured zones, and no-text cases. Confirm the Solid block gate appears after the Shapes gate with the three-question structure.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/frameforge-art-director/SKILL.md
git commit -m "docs: extend art director skill with solid block gate and textured-zone overlay branch"
```

---

## Task 7: Color advisor skill — busy zone solid-block note

**Files:**
- Modify: `.claude/skills/frameforge-color-advisor/SKILL.md`

- [ ] **Step 1: Add note to the busy/high-texture row**

Find the zone risk table in the skill file:

```markdown
| Busy / high-texture | Any muted color is at risk regardless of luminance. |
```

Replace it with:

```markdown
| Busy / high-texture | Any muted color is at risk regardless of luminance. Flag as solid-block candidate for the art director: if a solid block is used, color analysis for that zone changes — text reads against the block color, not the photo. |
```

- [ ] **Step 2: Verify**

Read `.claude/skills/frameforge-color-advisor/SKILL.md`. Confirm the busy/high-texture row now includes the solid-block flag note.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/frameforge-color-advisor/SKILL.md
git commit -m "docs: add solid-block candidate note to color advisor busy-zone row"
```

---

## Task 8: Test projects README — Step 5b and Step 8 additions

**Files:**
- Modify: `frameforge/data/test-projects/README.md`

- [ ] **Step 1: Add solid-block guidance to Step 5b**

Find the Step 5b heading and the first paragraph of its content:

```markdown
## Step 5b — Analyze per-frame color

Before generating the JSON, dispatch the `frameforge-color-advisor` sub-agent
```

After the full Step 5b section body (the paragraph ending with `**The concept palette is a series default. Color notes are the per-frame truth.**`), add:

```markdown
**Overlay vs. solid block — know when to use each:** Study each frame's text zone in the thumbnail before choosing a readability tool. If the zone has strong texture, repeating pattern, or competing hues, a gradient overlay will produce uneven contrast. A solid block (rectangle bar, square, or circle) eliminates the problem: text reads against a flat surface.

Also consider solid blocks for purely aesthetic reasons: a bold color bar, a graphic circle, a geometric accent can transform a flat or static composition into something with visual weight and editorial character. These are design statements, not workarounds.
```

- [ ] **Step 2: Add solid-block question to Step 8 "Looking at each frame"**

Find the Step 8 section under "Looking at each frame", specifically the list of questions starting with `- **Does the eye move freely?**`. Add a new bullet after `- **Does the frame carry its silence?**`:

```markdown
- **Is this frame too static?** If the composition reads as flat — same tone throughout, no graphic tension, no visual anchor — ask whether a solid block would give it structure. A strong rectangle or circle can do what no text adjustment can: add a visual anchor that makes the frame feel designed rather than assembled.
```

- [ ] **Step 3: Verify**

Read `frameforge/data/test-projects/README.md`. Confirm Step 5b contains the overlay-vs-solid-block paragraph. Confirm Step 8's question list ends with the "Is this frame too static?" bullet.

- [ ] **Step 4: Commit**

```bash
git add frameforge/data/test-projects/README.md
git commit -m "docs: add solid-block guidance to README Step 5b and Step 8"
```

---

## Self-review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Height control in shape toolbar | Task 1 |
| Add-layer buttons in layers panel header | Task 2 |
| Shape popover with Bar / Square / Circle | Task 2 |
| CSS for new elements | Task 3 |
| `onAddLayer` callback wired in `app.js` | Task 4 |
| Three default layer factories | Task 4 |
| AI manual "Solid Blocks" section | Task 5 |
| Layer order updated to include solid blocks | Task 5 |
| Shapes table updated with solid-block entries | Task 5 |
| Art director overlay gate extended for textured zones | Task 6 |
| Art director solid block gate added | Task 6 |
| Color advisor busy-zone row updated | Task 7 |
| README Step 5b solid-block guidance | Task 8 |
| README Step 8 "Is this frame too static?" question | Task 8 |

All spec requirements covered. No gaps found.

**Placeholder scan:** No TBDs, TODOs, or vague steps. All code blocks show complete implementations.

**Type consistency:**
- `makeDefaultShapeLayer(id, variant)` — `variant` used in Task 4 factory matches `btn.dataset.variant` set in Task 2 (`'bar'`, `'square'`, `'circle'`)
- `onAddLayer(type, variant)` — signature defined in Task 2, consumed in Task 4
- `this._hVal` — set in `_build()` Task 1 Step 1, read in `_updateDisplays()` Task 1 Step 3
- `makeUniqueId(prefix, frame)` — used consistently with `'text'`, `'solid-block'`, `'overlay'` prefixes

No inconsistencies found.
