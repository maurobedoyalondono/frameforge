# FrameForge — Decorative Layer Extension
**Design Document**
Version: 1.0
Date: 2026-03-27
Status: Approved

---

## Overview

Adds illustrative scene geometry to the FrameForge layer model — decorative environmental shapes that sit between the photograph and text, giving frames visual depth and location identity without requiring additional photography.

Five additions to the layer model:
1. `polyline` shape type — multi-point straight-segment strokes
2. `path` shape type — freeform bezier curves using percentage coordinates
3. `image_mask` shape type — silhouette assets from a built-in named library
4. `blend_mode` on all shape layers (was overlay-only)
5. `custom_assets` at project level — project-scoped silhouette definitions

---

## Scope: Files Changed

| File | Change |
|---|---|
| `frameforge/data/asset-library.js` | **New** — 14 built-in asset SVG paths as named export |
| `frameforge/modules/layers.js` | blend_mode on shapes; polyline/path/image_mask renderers; computeShapeBounds for polyline + image_mask |
| `frameforge/modules/drag.js` | Guard: skip polyline/path in hitTestShapeLayer |
| `frameforge/modules/project.js` | No structural change — custom_assets accessible via project.data |
| `frameforge/modules/validator.js` | Add polyline/path/image_mask to KNOWN_SHAPES; validate fields; validate custom_assets |
| `frameforge/ui/inspector.js` | Layer label logic for new shape types |
| `frameforge/docs/shapes-reference.md` | Add polyline, path, image_mask, blend_mode, custom_assets sections |
| `docs/ai-manual.md` | Update §8.5, add §8.14 decorative layer rules, update §8.13 checklist |
| `frameforge/data/ai-manual-content.js` | Mirror all ai-manual.md changes |

---

## Design Decisions

### Coordinate system
All new geometry types use the existing 0–100 percentage coordinate space. No new coordinate systems introduced. The renderer scales to canvas pixels at render time.

### Asset library
Built-in silhouettes live in `frameforge/data/asset-library.js` — a JS module exporting `ASSET_LIBRARY`, a plain object keyed by asset name. Each entry has `viewbox`, `path_d`, and `description`. Imported only by `layers.js`. Custom assets from `project.data.custom_assets` are checked first; built-in library is the fallback.

### Drag and selection
- `image_mask`: fully draggable. `computeShapeBounds` resolves position via `resolvePosition()` (handles both zone and absolute modes). Drag updates `layer.position` normally.
- `polyline`: selection highlight only. `computeShapeBounds` computes min/max bounding box across all points. `hitTestShapeLayer` in `drag.js` skips polyline — no drag (no single position anchor to update).
- `path`: no selection, no drag. `computeShapeBounds` returns null. hitTestShapeLayer skips it.

### ShapeToolbar
No changes. Toolbar operates on `fill_color`, `fill_opacity`, and `dimensions.width_pct`. Controls gracefully show `—` and do nothing for polyline/path (no dimensions). Work normally for image_mask.

### Opacity ceiling
For all three new decorative shape types (`polyline`, `path`, `image_mask`), both `fill_opacity` and `stroke_opacity` above 0.35 are silently clamped by the renderer. A `console.warn` is emitted. Silent clip chosen over UI warning because AI-generated content is the primary source. Existing shape types (`line`, `rectangle`, etc.) are not subject to this ceiling — it applies only to the new decorative types.

### Blend mode mapping
| Spec value | Canvas composite operation |
|---|---|
| `normal` | `source-over` |
| `multiply` | `multiply` |
| `screen` | `screen` |
| `overlay` | `overlay` |
| `soft-light` | `soft-light` |

### path_pct commands (v1.1)
Supported: `M`, `L`, `Q`, `C`, `Z`. Commands `S`, `T`, `A` deferred to v1.2.

### image_mask stroke
Fill only in v1.1. Stroke (outline) deferred to v1.2.

### Custom asset portability
Custom assets are project-scoped in v1.1. Export as standalone library file deferred to v1.2.

---

## Section 1 — `polyline` shape type

**Renderer:** Iterate `layer.points`, convert each `{x_pct, y_pct}` to pixels via `px()`/`py()`. `moveTo` first point, `lineTo` all subsequent. If `fill_color` is set, `closePath()` before `applyShapeStyle`. Apply optional dash pattern via `ctx.setLineDash()` before stroking, reset after.

**Properties:**
- `points` — ordered array of `{x_pct, y_pct}` objects (min 2, max 20)
- `stroke_color` — hex color
- `stroke_width_px` — integer
- `stroke_opacity` — float 0–1
- `stroke_dash` — optional SVG dash pattern string (e.g. `"6 4"`), solid if omitted
- `fill_color` — optional hex, fills enclosed area if set
- `fill_opacity` — float 0–1, required if `fill_color` set
- `blend_mode` — see blend mode table

**computeShapeBounds:** Min/max across all points in pixels. Returns bounding box for selection highlight. Drag disabled via drag.js guard.

---

## Section 2 — `path` shape type

**Renderer:** Parse `layer.path_pct` string. Tokenize SVG path commands (M, L, Q, C, Z only). For each numeric coordinate pair, multiply X by `w/100` and Y by `h/100`. Replay onto canvas context using `moveTo`, `lineTo`, `quadraticCurveTo`, `bezierCurveTo`, `closePath`. Set `ctx.lineCap` from `stroke_linecap` (default `round`). Call `applyShapeStyle`.

**Properties:**
- `path_pct` — SVG path `d` syntax, all coordinates in 0–100 percentage space. M, L, Q, C, Z only.
- `stroke_color` — hex color
- `stroke_width_px` — integer
- `stroke_opacity` — float 0–1
- `stroke_linecap` — `"round"` (default), `"butt"`, `"square"`
- `fill_color` — optional hex
- `fill_opacity` — float 0–1, required if `fill_color` set
- `blend_mode` — see blend mode table

**computeShapeBounds:** Returns null. No selection highlight, no drag.

---

## Section 3 — `image_mask` shape type

**Renderer:** Look up `layer.asset` in `project.data.custom_assets` first, then fall back to `ASSET_LIBRARY`. Parse the asset's `viewbox` to get its coordinate space. Scale `path_d` coordinates to target `dimensions` (width_pct × height_pct in pixels). Resolve position via `resolvePosition()`. Apply `flip_x`/`flip_y` via `ctx.scale` + `ctx.translate`. Apply `rotation_deg` via `ctx.rotate`. Apply `fill_color` + clamped `fill_opacity` (max 0.35, console.warn if exceeded). Apply `blend_mode`.

**Properties:**
- `asset` — string, built-in asset name or custom asset name
- `position` — standard FrameForge position object (zone or absolute)
- `dimensions.width_pct` — float, width as % of canvas width
- `dimensions.height_pct` — float, height as % of canvas height
- `fill_color` — hex silhouette fill color
- `fill_opacity` — float 0–1 (clamped to 0.35 by renderer)
- `flip_x` — boolean, default false
- `flip_y` — boolean, default false
- `rotation_deg` — float, default 0
- `blend_mode` — see blend mode table

**computeShapeBounds:** Uses `resolvePosition()` to handle zone and absolute mode. Returns `posX, posY + width × height`. Fully draggable.

---

## Section 4 — blend_mode on shape layers

Added to: `line`, `rectangle`, `circle`, `triangle`, `arrow`, `polygon`, `polyline`, `path`, `image_mask`.

Applied at the start of `renderShapeLayer` via `ctx.globalCompositeOperation`. Defaults to `source-over` (equivalent to `normal`). Restored by `ctx.restore()`.

---

## Section 5 — custom_assets (project level)

**Structure in project JSON:**
```json
"custom_assets": [
  {
    "name": "my-asset",
    "viewbox": "0 0 100 80",
    "path_d": "M 0 80 L 50 0 L 100 80 Z",
    "description": "Optional human-readable note"
  }
]
```

**Resolution order in renderer:** `project.data.custom_assets` checked first by name match; `ASSET_LIBRARY` is fallback. If neither contains the named asset, renderer logs a warning and skips drawing the layer.

**Validator:** If `custom_assets` is present and is an array, warn on any entry missing `name`, `viewbox`, or `path_d`.

---

## Built-in Asset Library

14 assets ship with the renderer. All authored in a normalized coordinate space.

| Name | Description |
|---|---|
| `frailejón` | Espeletia — tall stem with dense rosette crown |
| `pine-tree` | Conifer — classic triangular silhouette |
| `deciduous-tree` | Rounded canopy tree |
| `mountain-peak` | Single angular peak |
| `mountain-range` | Three-peak horizon line |
| `cactus` | Branching columnar cactus |
| `grass-tuft` | Low ground-level grass cluster |
| `bird-in-flight` | Simplified bird, wings spread |
| `cyclist` | Simplified rider on bike |
| `person-standing` | Generic standing human figure |
| `road-sign-post` | Vertical post with rectangular panel |
| `wave` | Single rolling ocean wave |
| `palm-tree` | Tropical palm silhouette |
| `condor` | Large soaring bird, wide wingspan |

---

## Inspector Display

| Layer type | Inspector label | Key fields shown |
|---|---|---|
| `polyline` | `Polyline — N points` | Point count, stroke color, opacity |
| `path` | `Path — bezier` | Stroke color, opacity |
| `image_mask` | `Silhouette — [asset name]` | Asset name, dimensions, flip state |

Custom assets show `description` as a tooltip.

---

## Validator Changes

- `KNOWN_SHAPES` extended: add `polyline`, `path`, `image_mask`
- `polyline`: warn if `points` absent or < 2 entries
- `path`: warn if `path_pct` absent
- `image_mask`: warn if `asset` absent
- `custom_assets` (top-level): if present and is array, warn on entries missing `name`, `viewbox`, or `path_d`

---

## Documentation Changes

### `frameforge/docs/shapes-reference.md`
Append after `polygon` section:
- Full `polyline` section with property table and JSON example
- Full `path` section with property table and JSON example
- Full `image_mask` section with property table, JSON example, and built-in asset library table
- `blend_mode` section with values table and when-to-use guidance
- `custom_assets` section with registration format and example

### `docs/ai-manual.md`
- §8.5 shape section: extend inline example and "When to use" table to include polyline, path, image_mask
- New §8.14 "Decorative Layer Rules": opacity ceilings (0.08–0.15 / 0.18–0.28 / max 0.35), quantity limit (max 5 per frame), intent discipline, when NOT to use
- §8.13 pre-output checklist: add two items for decorative shape opacity and count

### `frameforge/data/ai-manual-content.js`
Mirror all changes from `docs/ai-manual.md` exactly. Per existing sync note.

---

## AI Usage Rules (§8.14)

**Opacity ceilings — applies to fill_opacity and stroke_opacity on polyline, path, image_mask:**
- Background texture / barely-there: 0.08–0.15
- Visible but clearly subordinate: 0.18–0.28
- Hard ceiling: 0.35 (renderer clamps silently, console.warn)

**Quantity:** Maximum 5 decorative shape layers per frame. Never place decorative shapes on a frame with 2+ text layers unless the shape is a single low-opacity line.

**Intent:** Every decorative shape must reinforce the location, mood, or compositional flow of the specific frame. Do not use to fill empty space.

**When NOT to use:**
- Portrait frames where a person's face is the primary subject
- Frames with no clear environmental or geographic identity
- Frames where the photograph already provides sufficient visual complexity

**image_mask instances:** When using multiple instances of the same asset, vary height, x position, and opacity between instances — identical copies read as a bug.
