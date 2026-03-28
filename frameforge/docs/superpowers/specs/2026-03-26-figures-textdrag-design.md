# Design Spec: Figures & Text Dragging

**Date:** 2026-03-26
**Status:** Approved
**Features:** Extended shape layer (figures) + interactive text dragging

---

## Overview

Two independent enhancements to FrameForge:

1. **Figures** — Extend the existing `shape` layer with 4 new shape types (circle, triangle, arrow, polygon/star), extend the existing `line` type with `angle_deg` rotation, add a fill+stroke rendering model, and provide full documentation coverage in the AI manual, brief export, and reference docs.
2. **Text Dragging** — Allow users to reposition text layers interactively by dragging on the main canvas preview. Position updates are zone-aware and persist to project data.

Both features are JSON-driven. No UI insertion panel is in scope.

---

## Feature 1: Extended Shape Layer

### New Shape Types

The `shape` field on a `shape` layer gains 5 new values alongside the existing `line` and `rectangle`:

| `shape` value | Description | Key extra fields |
|---|---|---|
| `line` | Horizontal or angled line (extended) | `angle_deg` (default 0) |
| `rectangle` | Filled/stroked rectangle with optional border radius (existing) | `border_radius_px` |
| `circle` | Circle or ellipse | `dimensions.width_pct`, `dimensions.height_pct` |
| `triangle` | Filled/stroked triangle | `direction`: `up`/`down`/`left`/`right` |
| `arrow` | Line with arrowhead(s) | `angle_deg`, `arrowhead`: `end`/`start`/`both` |
| `polygon` | Regular n-sided polygon or star | `sides` (3–12), `star`, `inner_radius_pct`, `rotation_deg` |

### Fill + Stroke Model

All shape types support independent fill and stroke. The existing `color` + `opacity` fields are kept as backwards-compatible fallbacks (treated as `fill_color` + `fill_opacity` with no stroke).

```json
{
  "type": "shape",
  "id": "accent-ring",
  "shape": "circle",
  "position": { "zone": "middle-center" },
  "dimensions": { "width_pct": 30, "height_pct": 30 },
  "fill_color": "#FFFFFF",
  "fill_opacity": 0.1,
  "stroke_color": "#FFFFFF",
  "stroke_width_px": 2,
  "stroke_opacity": 1.0
}
```

Full field reference:

| Field | Type | Default | Notes |
|---|---|---|---|
| `fill_color` | `"#RRGGBB"` | `null` (no fill) | Falls back to `color` if present |
| `fill_opacity` | `0–1` | `1.0` | Falls back to `opacity` if present |
| `stroke_color` | `"#RRGGBB"` | `null` (no stroke) | |
| `stroke_width_px` | number | `1` | In canvas pixels at export resolution |
| `stroke_opacity` | `0–1` | `1.0` | |
| `angle_deg` | number | `0` | Used by `line` and `arrow` |
| `direction` | string | `"up"` | Used by `triangle` |
| `arrowhead` | string | `"end"` | Used by `arrow` |
| `sides` | integer 3–12 | `6` | Used by `polygon` |
| `star` | boolean | `false` | Used by `polygon` |
| `inner_radius_pct` | `0–100` | `50` | Star inner radius as % of outer; used by `polygon` when `star: true` |
| `rotation_deg` | number | `0` | Used by `polygon` |

### Shape Examples

**Triangle pointing up:**
```json
{
  "type": "shape", "id": "arrow-up", "shape": "triangle",
  "direction": "up",
  "position": { "zone": "bottom-center", "offset_y_pct": -5 },
  "dimensions": { "width_pct": 5, "height_pct": 4 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.9
}
```

**Arrow callout:**
```json
{
  "type": "shape", "id": "callout", "shape": "arrow",
  "angle_deg": 45, "arrowhead": "end",
  "position": { "x_pct": 30, "y_pct": 60 },
  "dimensions": { "width_pct": 15 },
  "stroke_color": "#FFFFFF", "stroke_width_px": 3, "stroke_opacity": 1.0
}
```

**Hexagon badge:**
```json
{
  "type": "shape", "id": "hex-badge", "shape": "polygon",
  "sides": 6, "star": false, "rotation_deg": 0,
  "position": { "zone": "top-right", "offset_x_pct": -3, "offset_y_pct": 3 },
  "dimensions": { "width_pct": 18 },
  "fill_color": "#000000", "fill_opacity": 0.5,
  "stroke_color": "#FFFFFF", "stroke_width_px": 1, "stroke_opacity": 0.8
}
```

**Star accent:**
```json
{
  "type": "shape", "id": "star", "shape": "polygon",
  "sides": 5, "star": true, "inner_radius_pct": 40, "rotation_deg": -18,
  "position": { "zone": "top-left", "offset_x_pct": 4, "offset_y_pct": 4 },
  "dimensions": { "width_pct": 8 },
  "fill_color": "#FFD700", "fill_opacity": 1.0
}
```

### Rendering Implementation

**File:** `modules/layers.js`

`renderShapeLayer()` gains new branches:
- `circle` — `ctx.arc()` for circle; `ctx.ellipse()` when width ≠ height
- `triangle` — 3-point path computed from center + dimensions + direction
- `arrow` — line path with arrowhead triangle(s) at end/start/both, rotated by `angle_deg`
- `line` (extended) — add rotation via canvas transform using `angle_deg`
- `polygon` — compute n vertices around center; star variant computes alternating inner/outer radii

Each shape applies fill then stroke (in that order) if the respective color is set. `computeShapeBounds()` is extended to return accurate bounding boxes for all new shape types (for `pin_above` support).

**File:** `modules/validator.js`

`KNOWN_SHAPE_TYPES` updated to include all 7 values. Shape-specific field validation added per type (e.g. `sides` range check for polygon, `direction` enum check for triangle).

---

## Feature 2: Text Dragging

### Scope

- Text layers (`type: "text"`) on the main canvas are draggable by mouse
- Drag updates position data in the loaded project (persists to localStorage)
- Text size is not affected by dragging
- Other layer types (image, shape, logo, overlay) are not draggable in this release

### New Module: `modules/drag.js`

Exports:
```javascript
initDrag(canvas, project, getActiveFrameIndex, onPositionUpdated)
// Sets up mousedown/mousemove/mouseup on canvas
// Calls onPositionUpdated(frameIndex, layerId, newPosition) when drag completes

destroyDrag(canvas)
// Removes event listeners (for cleanup)
```

Internal drag state:
```javascript
{
  active: false,
  layerId: null,
  frameIndex: null,
  startMousePct: { x, y },
  startPos: null,        // snapshot of layer.position at drag start
  mode: null             // 'absolute' | 'zone'
}
```

### Hit Testing

On `mousedown`:
1. Convert mouse event coords to canvas percentage using `getBoundingClientRect()` ratio
2. Iterate the active frame's layers in **reverse render order** (top-most first)
3. For each `text` layer, call an extended `computeTextBounds()` to get `{ top, bottom, left, right }` in pixels, convert to percentages. **Note:** the current `computeTextBounds()` only returns `{ top, bottom }` — it must be extended to also return `left` (the text's x anchor) and `right` (x anchor + wrapped text max width) as part of this feature.
4. First layer whose bounding box contains the click point becomes the drag target
5. Cursor changes to `grab` on hover (mousemove without active drag also performs hit test for cursor feedback)

### Position Update Rules

**Absolute mode** (`position.x_pct` / `position.y_pct`):
```
new_x_pct = startPos.x_pct + (currentMousePct.x - startMousePct.x)
new_y_pct = startPos.y_pct + (currentMousePct.y - startMousePct.y)
```
Values clamped to `[0, 100]`.

**Zone mode** (`position.zone` + `offset_x_pct` / `offset_y_pct`):
```
new_offset_x_pct = startPos.offset_x_pct + (currentMousePct.x - startMousePct.x)
new_offset_y_pct = startPos.offset_y_pct + (currentMousePct.y - startMousePct.y)
```
Zone name unchanged unless zone snap triggers.

### Zone Snapping

Zone anchors (9 positions as canvas percentages):

| Zone | x_pct | y_pct |
|---|---|---|
| top-left | 5 | 5 |
| top-center | 50 | 5 |
| top-right | 95 | 5 |
| middle-left | 5 | 50 |
| middle-center | 50 | 50 |
| middle-right | 95 | 50 |
| bottom-left | 5 | 95 |
| bottom-center | 50 | 95 |
| bottom-right | 95 | 95 |

During `mousemove`, the text's computed absolute position (zone anchor + offsets) is compared to each zone anchor. If within **5% of canvas size**, the layer snaps:
- `position.zone` → nearest zone name
- `position.offset_x_pct` and `position.offset_y_pct` → `0`
- Cursor changes to `crosshair` as snap indicator

### Canvas Coordinate Conversion

```javascript
function canvasPercent(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100
  };
}
```

This correctly handles CSS-scaled canvases at any display size.

### Re-render Cadence

- `mousemove` while dragging: re-render via `requestAnimationFrame` (max ~60fps, skips frames if render is still in progress)
- `mouseup`: commit position to `project.data`, mark project dirty, save to localStorage, re-render filmstrip thumbnail for active frame

### Wiring in `app.js`

```javascript
import { initDrag } from './modules/drag.js';

// After canvas and project are ready:
initDrag(mainCanvas, project, () => activeFrameIndex, (frameIndex, layerId, newPos) => {
  // newPos already applied to project.data by drag.js
  renderThumbnail(frameIndex);
  markDirty();
});
```

---

## Documentation Updates

### `data/ai-manual-content.js`

- Add "Shape Layer — Extended" section to the JSON schema docs
- Document all 7 shape types with field tables and one JSON example each
- Document fill/stroke model with backwards-compatibility note
- Add note that `angle_deg` extends `line` type

### New `docs/` folder

**`docs/shapes-reference.md`**
- Table of all shape types, fields, defaults
- One complete JSON example per shape type
- Note on fill vs stroke vs both

**`docs/text-positioning.md`**
- ASCII zone diagram showing all 9 zones
- How zone mode works (zone + offset)
- How absolute mode works (x_pct/y_pct)
- How drag updates position (zone vs absolute mode)
- Zone snapping explanation

**`docs/superpowers/specs/`**
- This design spec (self-referential)

### `README.md`

New sections:
- **Shapes & Figures** — table of shape types with `shape` field values and key params
- **Text Positioning & Dragging** — zone names, drag instructions, zone snap behavior

### Brief Export (`modules/export.js`)

No changes needed. The brief appends `ai-manual-content.js` verbatim — updating that file automatically propagates to all future brief exports.

---

## Files Changed

| File | Change |
|---|---|
| `modules/layers.js` | New shape branches in `renderShapeLayer()`, extended `computeShapeBounds()` |
| `modules/validator.js` | Updated `KNOWN_SHAPE_TYPES`, shape-specific field validation |
| `modules/drag.js` | **New file** — all drag logic |
| `app.js` | Wire `initDrag()` after project load |
| `data/ai-manual-content.js` | Add extended shape documentation |
| `docs/shapes-reference.md` | **New file** |
| `docs/text-positioning.md` | **New file** |
| `README.md` | New sections for shapes and text positioning |

---

## Out of Scope

- UI panel for inserting figures (JSON-only in this release)
- Dragging non-text layers (shape, logo, image)
- Undo/redo for drag operations
- Multi-select drag
