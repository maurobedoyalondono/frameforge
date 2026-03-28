# Design Spec: pin_above Removal + Floating Text Toolbar + Shape Interactivity

**Date:** 2026-03-27
**Status:** Approved
**Supersedes:** `2026-03-27-text-layer-editing-design.md`, `2026-03-27-text-toolbar-extended-design.md`

---

## Overview

Three features:

1. **Remove `pin_above`** — Strip the auto-pin-above-headline shape positioning from the renderer and all documentation. Replace the AI manual rule-line guidance with intentional shape usage instructions.
2. **Floating text toolbar** — Redesign the text-layer editing toolbar from a fixed strip above the canvas into a two-row floating panel that anchors to the selected text element on the canvas. Add font family picker, line height, italic, and alignment controls. Fix the broken width control.
3. **Shape interactivity** — Shapes are now draggable (same drag system as text). A floating shape toolbar anchors to selected shapes with controls for fill color, fill opacity, size, and delete.

---

## Feature 1: Remove pin_above

### What gets removed

`pin_above` is a shape-layer position property that auto-places a shape just above the top edge of a referenced text layer. It was documented as the canonical way to add short decorative rule lines above headlines.

**Removal is complete:** the concept disappears from code and all documentation. Shapes remain fully functional — they just position themselves via the normal coordinate system (`x_pct`, `y_pct`, `zone`).

### Code change — `modules/layers.js`

In `renderShapeLayer()`, remove the entire `pin_above` branch:

```javascript
// REMOVE this block:
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

// REPLACE with:
posX = px(layer.position?.x_pct ?? 0, w);
posY = py(layer.position?.y_pct ?? 0, h);
```

Also remove the `layerBounds` parameter from `renderShapeLayer()` signature — it was only used for `pin_above`. Update the call sites in `renderer.js` accordingly. **Retain `computeShapeBounds()`** — it is now needed for shape toolbar positioning and shape drag hit-testing (Feature 3).

### AI manual + spec changes

Remove from `data/ai-manual-content.js` and `docs/ai-manual.md`:
- The entire "Rule lines" subsection (the `pin_above` JSON example, field descriptions, and all guidance around it)
- The checklist item "No rule line is placed above a stats block or numeric content"
- The layout rules mention: "The rule line (`shape: line`, ...) before headlines is a strong editorial device."
- The reference layout example that includes `pin_above: "main-headline"`

**Replace with a new "Shapes — Intentional Use" section** in both files:

---

### Shapes — Use Them Intentionally

Shapes (`line`, `rectangle`, `circle`, `triangle`, `arrow`, `polygon`) are **design elements that must earn their place.** Every shape in a frame must have a clear visual purpose. Do not add shapes by habit or as decoration for its own sake.

**When shapes serve a purpose — use them:**

| Purpose | Shape type | Example use |
|---|---|---|
| Visual divider / separator | `line` | Horizontal rule between a location tag and the headline, positioned deliberately with `y_pct` |
| Accent / badge | `rectangle`, `circle`, `polygon` | Colour badge behind a stat, circle frame around a detail shot |
| Callout / pointer | `arrow` | Drawing attention to a subject detail |
| Geometric accent | `triangle`, `polygon` | Star or diamond accent in a corner |
| Angled energy | `line` with `angle_deg` | Diagonal slash for bold/documentary layouts |

**Positioning:** All shapes use the standard `position` object (`x_pct`, `y_pct`, or `zone` + offsets). There is no auto-pin behaviour — you decide exactly where the shape sits.

**When NOT to use a shape:**
- Do not add a rule line above a headline just because the layout has a headline. Only add it if the line serves the composition — creating a visual pause, adding editorial formality, or separating distinct content areas.
- Never place a line above a `stats_block`, numeric content, or any data layer.
- Do not add shapes to fill empty space. Empty space is intentional.

---

### `docs/shapes-reference.md` update

Remove the `pin_above` section and example. Add a note: "All shapes position with `x_pct`/`y_pct` or `zone` — the same coordinate system as text layers."

---

## Feature 2: Floating Text Toolbar

### Architecture change

The `#text-toolbar` element moves from its current position (between `<header id="toolbar">` and `<main id="main">` in `index.html`) to **inside `#canvas-wrap`**:

```html
<!-- index.html -->
<div id="canvas-wrap">
  <!-- main-canvas injected by app.js -->
  <div id="safe-zone-overlay" aria-hidden="true"></div>
  <div id="text-toolbar" style="display:none" aria-label="Text layer editor" role="toolbar"></div>
</div>
```

`#text-toolbar` gets `position: absolute` and its coordinates are computed in JS on every selection change, drag update, and canvas resize.

### Positioning logic — `app.js`

New function `positionToolbar(layer)`:

```
1. Call computeTextBounds(ctx, layer, canvasW, canvasH, project) → bounds in canvas px
2. Get canvas CSS rect via canvas.getBoundingClientRect()
3. Compute CSS scale factor: scaleX = rect.width / canvasW
4. Convert bounds.top and bounds.left to CSS px:
     cssTop  = bounds.top  * scaleX
     cssLeft = bounds.left * scaleX
     cssTextWidth = (bounds.right - bounds.left) * scaleX
5. Toolbar height (approx 62px for two rows). Arrow height = 8px.
6. Default: toolbar sits ABOVE text:
     toolbarTop = cssTop - toolbarHeight - 8
7. If toolbarTop < 0: flip BELOW text:
     toolbarTop = (bounds.bottom * scaleX) + 8
8. Toolbar left = centre text horizontally, then clamp to [0, canvasRect.width - toolbarWidth]
9. Apply: toolbar.style.top = toolbarTop + 'px', toolbar.style.left = clampedLeft + 'px'
```

Call `positionToolbar(layer)` on:
- Text layer selected
- `onChange` fires (re-render may change text bounds)
- Canvas resize (ResizeObserver on `#canvas-wrap`)
- Drag `mousemove` (toolbar follows the text)

### Toolbar HTML — `ui/text-toolbar.js`

Full rewrite. Two-row layout:

```
Row 1: [Font family ▾] | [Sz −][8.5][+] | [B][I] | [←][≡][→] | [↕ −][1.2][+] | [↔ −][80%][+] | [color] | [SHADOW] | [🗑]
Row 2: [text content input — full width                                                                                    ]
```

#### Font family control

A button showing the current `layer.font.family`. Clicking opens the font picker panel (see below) as an absolutely-positioned child. The panel closes on outside click or on font selection.

#### Size stepper

- Field: `layer.font.size_pct`
- Step: `0.5`, range: `[1.5, 25]`
- Display: 1 decimal place

#### Bold / Italic toggles

- **Bold**: toggles `layer.font.weight` between `400` and `700`. Active state = `.is-active`
- **Italic**: toggles `layer.font.style` between `'normal'` and `'italic'`. Active state = `.is-active`

#### Alignment buttons

Three buttons (left / center / right) with SVG icons. Sets `layer.align` to `'left'`, `'center'`, or `'right'`. The active alignment button gets `.is-active`.

#### Line height stepper

- **NEW control**
- Field: `layer.font.line_height`
- Step: `0.05`, range: `[0.8, 2.5]`
- Display: 2 decimal places
- Default when absent: `1.2`

#### Width stepper

- Field: `layer.max_width_pct`
- Step: `5`, range: `[10, 100]`
- Display: integer + `%`
- **Bug fix:** Width changes appear to have no effect on the canvas. During implementation, identify the root cause (likely a stale layer reference, a re-render not being triggered, or the value being overwritten on re-show) and fix it. Verify the fix by confirming that decrementing width narrows the visible text wrap and incrementing it widens it.

#### Color swatch

- `<input type="color">` styled as 22×22px rounded square
- Reads/writes `layer.font.color`

#### Shadow toggle

- Toggles `layer.shadow.enabled`. Active state = `.is-active`
- Default shadow on enable: `{ enabled: true, color: "#000000", blur_px: 8, offset_x: 2, offset_y: 2, opacity: 0.6 }`

#### Delete

- Calls `onDelete(layer)` — removes layer, hides toolbar

#### Text content input (Row 2)

- Full-width `<input type="text">`, `flex: 1 1 100%`
- `spellcheck="false"`
- Reads/writes `layer.content`
- On `input`: fires `onChange(layer)` immediately

### Font picker panel

Absolutely-positioned panel, opens below the font family button. Closes on outside click or selection.

```
┌─────────────────────────────────────┐
│  🔍  [Search any Google Font…      ]│
├─────────────────────────────────────┤
│  IN THIS PROJECT                    │
│  ● Playfair Display  (active)       │
│    Inter                            │
├─────────────────────────────────────┤
│  EDITORIAL PHOTOGRAPHY              │
│  Display                            │
│    Playfair Display                 │
│    Cormorant Garamond               │
│    Bebas Neue                       │
│    DM Serif Display                 │
│    Cinzel                           │
│    Josefin Sans                     │
│  Body / Labels                      │
│    Inter                            │
│    Montserrat                       │
│    Source Sans 3                    │
│    DM Sans                          │
│    Oswald                           │
│    Open Sans                        │
└─────────────────────────────────────┘
```

**"In this project" section:** built dynamically from `project.getFontFamilies()`. Always shown first. Active font gets a filled dot indicator.

**"Editorial photography" section:** hardcoded list of 12 fonts grouped as Display and Body. All 12 are shown as clickable entries regardless of whether they're already in the project. Each font name is rendered in its own typeface using `font-family` inline style; inject a single Google Fonts `<link>` tag for all 12 families when the picker first opens so names render in their own face. Fonts already in the project (present in Section 1) show a small "✓ in project" badge inline — they are still clickable and reassigning to them is valid.

**Search field:** filters the curated list in real time. If the typed name is not in the curated list, a "Use [typed name]" entry appears at the bottom. On selection, the font loads via `loadProjectFonts({...})` pattern and triggers re-render.

**On font selection:** write `layer.font.family` → fire `onChange(layer)` → trigger font load → re-render once font is ready (via `onFontReady` callback).

### CSS — `styles/components.css`

Replace all existing `.text-toolbar-*` rules with new floating toolbar styles:

```css
#text-toolbar {
  position: absolute;
  z-index: 50;
  background: var(--color-bg-panel);
  border: 1.5px solid var(--color-accent);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.55);
  min-width: 480px;
  /* top/left set by JS */
}

/* Arrow pointing toward the text — CSS border triangle */
#text-toolbar.arrow-down::after {
  content: '';
  position: absolute;
  bottom: -7px; left: 50%; transform: translateX(-50%);
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 7px solid var(--color-accent);
}
#text-toolbar.arrow-up::after {
  content: '';
  position: absolute;
  top: -7px; left: 50%; transform: translateX(-50%);
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 7px solid var(--color-accent);
}
/* JS adds .arrow-down (default) or .arrow-up (when toolbar flips below text) */

.text-toolbar-row1 { display: flex; align-items: center; gap: 5px; padding: 6px 10px; border-bottom: 1px solid var(--color-border); }
.text-toolbar-row2 { padding: 5px 10px; }
```

### `app.js` changes

- Remove `#text-toolbar` from its old position in the DOM wiring
- Add `positionToolbar(layer)` function
- Call `positionToolbar` on selection change, `onChange`, canvas resize
- Wire `ResizeObserver` on `#canvas-wrap` to call `positionToolbar` when canvas scales

---

---

## Feature 3: Shape Interactivity

### Dragging shapes — `modules/drag.js`

Extend the existing drag system to handle `shape` layers alongside `text` layers.

**Hit testing:** On `mousedown`, iterate layers in reverse render order. For each `shape` layer, call `computeShapeBounds(ctx, layer, canvasW, canvasH, project)` → returns `{ top, bottom, left, right }` in canvas pixels. Convert to canvas percentages and test whether the click point falls inside. First hit wins (same logic as text).

**Cursor feedback:** `mousemove` without active drag performs hit tests on both `text` and `shape` layers. Cursor becomes `grab` over any draggable layer.

**Position update:** Shape layers use the same `position` object as text layers (`x_pct`/`y_pct` absolute mode, or `zone` + offsets). Apply the identical absolute-mode and zone-mode update rules already implemented for text. No new drag math needed.

**`initDrag` signature is unchanged.** The extended hit-test loop handles both layer types internally. The `onPositionUpdated(frameIndex, layerId, newPosition)` callback fires for shapes the same way it does for text.

### Shape toolbar — `ui/shape-toolbar.js`

New file, parallel structure to `TextToolbar`. A single-row floating panel.

```
[ ■ fill color ] | [ Op − 1.0 + ] | [ ↔ − 25% + ] | [ 🗑 ]
```

#### Controls

**Fill color swatch**
- `<input type="color">` styled as 22×22px rounded square
- Reads: `layer.fill_color ?? layer.color ?? '#ffffff'`
- Writes: `layer.fill_color`. If layer previously used the legacy `color` field (no `fill_color`), migrate on write: set `layer.fill_color = newValue`, remove `layer.color`.
- Fires `onChange(layer)`

**Fill opacity stepper**
- Label: `Op`
- Field: `layer.fill_opacity ?? layer.opacity ?? 1.0`
- Step: `0.05`, range `[0.05, 1.0]`, display 2 decimal places
- Writes `layer.fill_opacity`. If layer used legacy `opacity`, migrate on write: set `layer.fill_opacity = newValue`, remove `layer.opacity`.
- Fires `onChange(layer)`

**Size stepper**
- Label: `↔` (width icon)
- Field: `layer.dimensions.width_pct`
- Step: `1`, range `[1, 100]`, display integer + `%`
- Writes `layer.dimensions.width_pct`
- For shapes where `height_pct` equals `width_pct` at load time (i.e. a square or circle — aspect ratio 1:1), update both together to preserve the aspect ratio
- Fires `onChange(layer)`

**Delete button**
- Calls `onDelete(layer)`

#### Public API

```javascript
export class ShapeToolbar {
  constructor(el)
  onChange = null    // (layer) => void
  onDelete = null    // (layer) => void
  show(layer)        // populate + display
  hide()             // hide + clear ref
  get currentLayer() // layer | null
}
```

### Toolbar element — `index.html`

Add a second floating toolbar element inside `#canvas-wrap`:

```html
<div id="shape-toolbar" style="display:none" aria-label="Shape layer editor" role="toolbar"></div>
```

### Positioning — `app.js`

Generalise the existing `positionToolbar(layer)` function to dispatch by layer type:

```javascript
function positionToolbar(layer) {
  if (layer.type === 'text')  positionElement(textToolbarEl,  computeTextBounds(...));
  if (layer.type === 'shape') positionElement(shapeToolbarEl, computeShapeBounds(...));
}
```

`positionElement(el, bounds)` is the shared positioning logic (above/below flip, horizontal clamp) extracted from the text toolbar wiring.

On selection change: show the relevant toolbar, hide the other. On deselect: hide both.

### Selection model

The existing `selectedLayerId` in `app.js` is type-agnostic — it already stores any layer ID. No changes needed to the selection model. `renderer.js` selection indicator (dashed rectangle) already draws around any layer whose bounds can be computed — extend `computeLayerBounds(ctx, layer, ...)` helper in `renderer.js` to try `computeTextBounds` for text and `computeShapeBounds` for shapes, return null for other types.

### CSS — `styles/components.css`

Add `.shape-toolbar-*` styles mirroring the text toolbar styles. `#shape-toolbar` gets the same `position: absolute`, border, box-shadow, and arrow rules as `#text-toolbar`.

---

## Documentation updates

### `docs/spec-app.md`

- Update module structure table: add `ui/text-toolbar.js` description as "Floating contextual toolbar for selected text layers"
- Update text editing section to describe the floating toolbar, two-row layout, font picker, and positioning logic
- Remove any remaining mention of `pin_above`

### `data/ai-manual-content.js` + `docs/ai-manual.md`

Changes described in Feature 1 section above.

---

## Files Changed

| File | Change |
|---|---|
| `modules/layers.js` | Remove `pin_above` branch from `renderShapeLayer()`; remove `layerBounds` parameter; retain `computeShapeBounds()` |
| `modules/renderer.js` | Update `renderShapeLayer()` call — no longer passes `layerBounds`; extend selection indicator to cover shape layers |
| `modules/drag.js` | Extend hit-test loop to include `shape` layers using `computeShapeBounds()` |
| `ui/text-toolbar.js` | Full rewrite — floating 2-row panel, font picker, all new controls |
| `ui/shape-toolbar.js` | **New file** — single-row floating toolbar: fill color, opacity, size, delete |
| `styles/components.css` | Replace text toolbar styles with floating panel styles; add shape toolbar styles |
| `index.html` | Move `#text-toolbar` inside `#canvas-wrap`; add `#shape-toolbar` inside `#canvas-wrap` |
| `app.js` | Add `positionToolbar()`, `positionElement()`, `ResizeObserver`, wire both toolbars |
| `data/ai-manual-content.js` | Remove `pin_above` section; add intentional shapes guidance |
| `docs/ai-manual.md` | Same changes as `ai-manual-content.js` |
| `docs/shapes-reference.md` | Remove `pin_above` docs; add positioning note |
| `docs/spec-app.md` | Update text editing section; add shape editing section; remove `pin_above` references |

---

## Out of Scope

- Shadow property editing (color, blur, offset) — text shadow toggle only
- Letter spacing editor (can be set in JSON directly)
- Shape stroke color / stroke width editing via toolbar (JSON only)
- Undo/redo
- Multi-layer selection
- Direct canvas text editing (click-to-type)
- Font weight variants beyond 400 / 700
- Dragging non-text, non-shape layers (image, overlay, logo, stats_block)
