# Drag Resize & Copy/Paste Design

**Date:** 2026-03-31
**Status:** Approved

---

## Overview

Two features for the FrameForge frame editor:

1. **Drag-resize** — Resize shape and text layers by dragging handles on their edges and corners, replacing the current button-only approach.
2. **Copy/paste** — Copy any selected layer and paste it into the same or a different frame, with toast feedback and correct layer ordering.

---

## Feature 1: Drag-Resize

### Approach

DOM overlay handles (Approach 1). A `#resize-overlay` div lives inside `#canvas-wrap`, sibling to the canvas and existing toolbars. The overlay is sized and positioned to match the selected layer's bounding box. Resize logic lives in a new `modules/resize.js`, separate from the existing `modules/drag.js` (which handles move-only).

### Overlay Structure

```
#canvas-wrap
  ├── #main-canvas
  ├── #resize-overlay          ← new
  │     ├── .rh.nw  (corner)
  │     ├── .rh.n   (top edge)
  │     ├── .rh.ne  (corner)
  │     ├── .rh.e   (right edge)
  │     ├── .rh.se  (corner)
  │     ├── .rh.s   (bottom edge)
  │     ├── .rh.sw  (corner)
  │     └── .rh.w   (left edge)
  ├── #text-toolbar
  └── #shape-toolbar
```

- Overlay: `position: absolute`, `pointer-events: none`, thin dashed outline border
- Handles: 8×8px squares, `pointer-events: auto`, CSS resize cursors (`nw-resize`, `n-resize`, `ne-resize`, `e-resize`, `se-resize`, `s-resize`, `sw-resize`, `w-resize`)
- Shown when a shape or text layer is selected; hidden otherwise
- Reposition after every render and after every toolbar-triggered change

### Shape Resize Logic

On mousedown on a handle, record: handle direction, current `x_pct`, `y_pct`, `dimensions.width_pct`, `dimensions.height_pct`, and mouse position in canvas-percentage coordinates.

On mousemove, compute `delta_x` and `delta_y` in canvas %:

| Handle(s) | Effect |
|-----------|--------|
| w, nw, sw | `x_pct += delta_x`, `width_pct -= delta_x` (left edge fixed) |
| e, ne, se | `width_pct += delta_x` |
| n, nw, ne | `y_pct += delta_y`, `height_pct -= delta_y` (top edge fixed) |
| s, sw, se | `height_pct += delta_y` |

Corners combine both the horizontal and vertical rules.

Constraints: `width_pct` clamped to min 1, `height_pct` clamped to min 2 (matches existing toolbar ranges).

On mouseup: save to localStorage.

### Text Resize Logic

Text has no `height_pct` — height is derived from content, font size, and line height. Three separate axes:

| Handle(s) | Field changed | Notes |
|-----------|--------------|-------|
| w, e | `max_width_pct` | Text reflows to fit new width |
| n, s | `line_height` | Clamped to 0.8–2.5 |
| nw, ne, sw, se (corners) | `font.size_pct` + `max_width_pct` | Horizontal delta applied to `max_width_pct` first, then `scale = new_max_width / old_max_width`, `font.size_pct *= scale` |

After each mousemove tick: update data model → re-render canvas → reposition overlay + toolbar. On mouseup: save to localStorage.

---

## Feature 2: Copy / Paste

### Clipboard State

A single `let clipboard = null` variable in `app.js` (in-memory; not persisted to localStorage or the system clipboard). Holds a deep copy of the layer object at the time of copy, with a new unique `id` pre-assigned.

### Copy

**Triggers:**
- `Ctrl+C` / `Cmd+C` keyboard shortcut (added to existing handler in `shell.js`)
- Copy button (icon) in `text-toolbar` and `shape-toolbar`, next to the delete button

**Behavior:**
- No layer selected → no-op
- Layer selected (visible or hidden) → deep-clone layer, assign new `id`, store in `clipboard`
- Show toast: `"Copied"`

### Paste

**Triggers:**
- `Ctrl+V` / `Cmd+V` keyboard shortcut
- Paste button in `text-toolbar` and `shape-toolbar` (disabled when `clipboard` is null)

**Behavior:**
- `clipboard` is null → no-op
- Deep-clone `clipboard`, assign a fresh `id`
- Insert into `activeFrame.layers` at the correct position:
  - Layer order (array bottom → top): `image → overlay → shape → text`
  - Find the **last index** of a layer with the same type and insert after it
  - If no layer of that type exists, use the type boundary: text → append at end; shape → insert before the first text (or at end if none); overlay → insert before the first shape (or end if none); image → insert at index 0
- Position: same `x_pct`/`y_pct` (or zone) as the original — directly on top
- Show toast: `"Pasted"`
- Select the newly pasted layer immediately (triggers toolbar + overlay to appear on it)

### Toast Utility

A `showToast(message)` function renders a small, centered-bottom div that appears for 2 seconds then fades out. Reuse if one exists in the codebase; otherwise add a lightweight implementation in `app.js` or a new `ui/toast.js`.

---

## Files Affected

| File | Change |
|------|--------|
| `frameforge/index.html` | Add `#resize-overlay` div with 8 `.rh` handle divs |
| `frameforge/styles/` | Add resize overlay and handle CSS |
| `frameforge/modules/resize.js` | New — all resize drag logic |
| `frameforge/app.js` | Wire resize module; add clipboard state; add copy/paste keyboard shortcuts; add `showToast` |
| `frameforge/ui/text-toolbar.js` | Add copy + paste buttons |
| `frameforge/ui/shape-toolbar.js` | Add copy + paste buttons |
| `frameforge/ui/shell.js` | Register `Ctrl/Cmd+C` and `Ctrl/Cmd+V` handlers |

---

## Out of Scope

- Image and overlay layers are not resizable (they fill the frame)
- No system clipboard integration
- No multi-select or multi-copy
- No aspect-ratio lock (Shift-drag) for shapes
