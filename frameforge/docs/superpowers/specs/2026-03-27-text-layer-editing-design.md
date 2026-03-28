# Text Layer Editing Design

**Date:** 2026-03-27
**Status:** Approved

## Goal

Add in-canvas text layer editing to FrameForge: single-click to select a text layer, a contextual toolbar above the canvas for editing content/size/width/delete, and a fix for the drag jump + disappearance bugs.

---

## 1. Selection Model

### Triggering selection
- `mousedown` on the canvas starts a drag (existing behavior).
- On `mouseup`, if the mouse moved less than 3px from the `mousedown` position, treat it as a **click** rather than a drag.
- On click: hit-test text layers using the existing hit-test logic in `drag.js`. Hit-test in **reverse layer order** (last rendered = topmost visually) so the topmost layer under the cursor wins.
- Clicking the canvas background (no text layer hit) clears the selection.

### State
- A single `selectedLayerId` variable (string or `null`) is maintained in `app.js`.
- When it changes: populate and show/hide the toolbar, and trigger a re-render to draw/clear the selection indicator.

### Selection indicator
- `renderer.js` draws a dashed rectangle around the selected text layer's bounding box after all other layers are rendered.
- Style: 1px dashed white, 50% opacity — visible on any background, non-intrusive.

### Coexistence with drag
- Drag and select share the same `mousedown` handler.
- If `mouseup` fires after moving ≥ 3px → drag completed, selection unchanged.
- If `mouseup` fires after moving < 3px → click → select the layer under cursor.

---

## 2. Toolbar

### Placement
A `<div id="text-toolbar">` is inserted between the main toolbar and the canvas in `index.html`. It spans the full canvas width.

### Visibility
- Hidden (`display: none`) when `selectedLayerId` is `null`.
- Shown when a text layer is selected.

### Layout (single row)

```
[ text content input ·················· ] [ Size − 4.5 + ] [ Width − 75% + ] [ 🗑 ]
```

### Controls

**Text input**
- `flex: 1`, placeholder "Text content"
- Populated with `layer.content` when selection changes
- On `input` event: write to `layer.content`, trigger re-render, mark project dirty

**Size control**
- Label: "Size"
- Displays `layer.font.size_pct` rounded to 1 decimal place
- `−` decrements by `0.5`, `+` increments by `0.5`
- Minimum: `1.5` (clamped, cannot go lower)
- On change: write to `layer.font.size_pct`, trigger re-render, mark project dirty

**Width control**
- Label: "Width"
- Displays `layer.max_width_pct` as integer with `%` suffix
- `−` decrements by `5`, `+` increments by `5`
- Clamped to `[10, 100]`
- On change: write to `layer.max_width_pct`, trigger re-render, mark project dirty

**Delete button**
- Trash icon (🗑 or SVG)
- On click: remove the layer from `frame.layers`, clear `selectedLayerId`, hide toolbar, re-render, mark project dirty

### Styling
Defined in `styles/components.css`. Matches existing toolbar aesthetic (dark background, same height/padding as main toolbar). Controls are grouped with visible separators between content / size / width / delete sections.

---

## 3. Drag Bug Fix

Both fixes are isolated to `drag.js`.

### Bug 1 — Jump on drag start (anchor offset)

**Cause:** On `mousedown`, the layer's position is set to the raw cursor coordinates, treating the cursor as the layer's top-left anchor. Clicking anywhere inside the layer (not at the anchor) causes an immediate jump.

**Fix:** On `mousedown`, record the offset between the cursor and the layer's anchor point:
```
dragOffset = { x: cursorX_pct − layerAnchorX_pct, y: cursorY_pct − layerAnchorY_pct }
```
On every `mousemove`, subtract `dragOffset` from the cursor position before writing to the layer's position.

### Bug 2 — Disappearance (no bounds clamping)

**Cause:** Position percentages can go below 0 or above 100 when dragging near canvas edges, pushing the layer entirely off-canvas.

**Fix:** After computing the new position on every `mousemove`, clamp:
- `x_pct` to `[0, 95]` (leaves at least a sliver of the layer visible)
- `y_pct` to `[0, 95]`

For absolute mode: clamp `x_pct` and `y_pct` directly. For zone mode: resolve the zone anchor + offsets to an absolute position, clamp, then convert back to offsets by subtracting the zone anchor.

---

## Files Affected

| File | Change |
|---|---|
| `drag.js` | Fix anchor offset bug, add bounds clamping, add click-vs-drag detection |
| `renderer.js` | Draw selection indicator rectangle for selected layer |
| `ui/text-toolbar.js` | New file — toolbar HTML construction, event binding, show/hide |
| `index.html` | Add `<div id="text-toolbar">` between main toolbar and canvas |
| `styles/components.css` | Add toolbar styles |
| `app.js` | Maintain `selectedLayerId`, wire toolbar ↔ renderer ↔ project |

---

## Out of Scope

- Editing font family, color, shadow, opacity, or alignment (not requested)
- Multi-layer selection
- Undo/redo
- Keyboard shortcuts
