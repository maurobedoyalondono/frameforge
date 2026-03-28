# Decorative Layer Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add polyline, bezier path, and image_mask shape types to FrameForge, plus blend_mode on all shape layers and project-level custom asset registration.

**Architecture:** New shape types slot into the existing `renderShapeLayer` dispatch in `layers.js`. A new `asset-library.js` module provides 14 built-in silhouette assets. Drag/selection support is added for image_mask; polyline gets selection-only bounds; path has no bounds. Validator, inspector, and both AI manual files are updated to match.

**Tech Stack:** Vanilla JS ES2022 modules, HTML5 Canvas API, Path2D API. No build step. No test framework — verification is visual in-browser.

**Design document:** `frameforge/docs/superpowers/specs/2026-03-27-decorative-layer-extension-design.md`

---

## File Map

| File | Action |
|---|---|
| `frameforge/data/asset-library.js` | **Create** — 14 built-in silhouette assets |
| `frameforge/modules/layers.js` | **Modify** — blend_mode, resolveShapeStyle ceiling, polyline/path/image_mask renderers, computeShapeBounds |
| `frameforge/modules/drag.js` | **Modify** — skip polyline/path in hitTestShapeLayer |
| `frameforge/modules/validator.js` | **Modify** — new shape types + custom_assets validation |
| `frameforge/ui/inspector.js` | **Modify** — descriptive badges for new shape sub-types |
| `frameforge/docs/shapes-reference.md` | **Modify** — add polyline, path, image_mask, blend_mode, custom_assets sections |
| `docs/ai-manual.md` | **Modify** — update §8.5, add §8.14, update §8.13 checklist |
| `frameforge/data/ai-manual-content.js` | **Modify** — mirror all ai-manual.md changes |

---

## Task 1: Create asset-library.js

**Files:**
- Create: `frameforge/data/asset-library.js`

- [ ] **Step 1: Create the file**

```javascript
/**
 * asset-library.js — Built-in silhouette asset library for FrameForge.
 *
 * Each asset has:
 *   viewbox   — SVG viewBox string the path was authored in (e.g. "0 0 100 100")
 *   path_d    — raw SVG path `d` string in the asset's own coordinate space
 *   description — human-readable note for the Inspector tooltip
 *
 * The renderer scales path_d coordinates from viewbox space to target
 * canvas dimensions at render time using Path2D + ctx.scale().
 *
 * Custom project assets (project.data.custom_assets) use the same structure
 * and are checked before this library when resolving an asset name.
 */

export const ASSET_LIBRARY = {
  'frailejón': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 5 Q 70 8 72 22 Q 78 38 65 48 Q 58 54 53 50 L 53 100 L 47 100 L 47 50 Q 42 54 35 48 Q 22 38 28 22 Q 30 8 50 5 Z',
    description: 'Espeletia — tall stem with dense rosette crown (Colombian páramo)',
  },
  'pine-tree': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 5 L 82 68 L 62 68 L 62 80 L 80 80 L 94 100 L 6 100 L 20 80 L 38 80 L 38 68 L 18 68 Z',
    description: 'Conifer — classic triangular layered silhouette',
  },
  'deciduous-tree': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 5 Q 92 5 92 42 Q 92 78 50 78 Q 8 78 8 42 Q 8 5 50 5 Z M 44 78 L 44 100 L 56 100 L 56 78 Z',
    description: 'Rounded canopy tree with trunk',
  },
  'mountain-peak': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 5 L 95 95 L 5 95 Z',
    description: 'Single angular mountain peak',
  },
  'mountain-range': {
    viewbox: '0 0 100 100',
    path_d: 'M 0 100 L 0 92 L 22 18 L 42 58 L 62 8 L 80 48 L 100 14 L 100 100 Z',
    description: 'Three-peak horizon line',
  },
  'cactus': {
    viewbox: '0 0 100 100',
    path_d: 'M 44 100 L 44 58 L 26 58 L 26 28 L 44 28 L 44 15 L 56 15 L 56 28 L 74 28 L 74 58 L 56 58 L 56 100 Z',
    description: 'Branching columnar cactus',
  },
  'grass-tuft': {
    viewbox: '0 0 100 100',
    path_d: 'M 8 90 Q 2 58 12 32 Q 20 60 18 90 Z M 26 90 Q 20 52 32 22 Q 40 54 36 90 Z M 50 90 Q 46 42 54 12 Q 62 44 58 90 Z M 72 90 Q 66 52 76 22 Q 84 54 80 90 Z M 90 90 Q 84 58 92 32 Q 100 60 96 90 Z',
    description: 'Low ground-level grass cluster — five blades',
  },
  'bird-in-flight': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 44 Q 32 26 8 38 Q 18 42 28 46 Q 38 43 45 52 L 50 48 L 55 52 Q 62 43 72 46 Q 82 42 92 38 Q 68 26 50 44 Z M 46 52 Q 48 64 50 60 Q 52 64 54 52 Q 52 58 50 56 Q 48 58 46 52 Z',
    description: 'Simplified bird, wings spread in flight',
  },
  'cyclist': {
    viewbox: '0 0 100 100',
    path_d: 'M 52 4 Q 60 4 60 12 Q 60 20 52 20 Q 44 20 44 12 Q 44 4 52 4 Z M 44 20 L 30 52 Q 14 52 14 68 Q 14 84 30 84 Q 44 84 46 70 L 52 56 L 56 70 Q 58 84 72 84 Q 88 84 88 68 Q 88 52 72 52 L 60 20 Z',
    description: 'Simplified rider on bike — head, body, two wheels',
  },
  'person-standing': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 4 Q 60 4 60 14 Q 60 24 50 24 Q 40 24 40 14 Q 40 4 50 4 Z M 38 24 L 36 58 L 26 96 L 38 96 L 46 65 L 54 65 L 62 96 L 74 96 L 64 58 L 62 24 Z',
    description: 'Generic standing human figure',
  },
  'road-sign-post': {
    viewbox: '0 0 100 100',
    path_d: 'M 44 100 L 44 46 L 4 46 L 4 8 L 96 8 L 96 46 L 56 46 L 56 100 Z',
    description: 'Vertical post with rectangular panel — milestone, wayfinding',
  },
  'wave': {
    viewbox: '0 0 100 100',
    path_d: 'M 0 52 Q 12 22 26 44 Q 40 66 54 38 Q 68 10 80 36 Q 90 56 100 40 L 100 100 L 0 100 Z',
    description: 'Single rolling ocean wave',
  },
  'palm-tree': {
    viewbox: '0 0 100 100',
    path_d: 'M 46 100 Q 42 72 38 48 Q 16 34 2 40 Q 16 44 28 52 Q 36 46 40 44 L 36 26 Q 42 36 42 46 L 40 18 Q 46 30 46 45 L 48 10 Q 52 30 52 45 L 60 18 Q 56 32 54 46 L 62 44 Q 72 50 86 46 Q 98 40 96 34 Q 80 28 60 44 Q 56 46 54 48 Q 58 72 54 100 Z',
    description: 'Tropical palm silhouette',
  },
  'condor': {
    viewbox: '0 0 100 100',
    path_d: 'M 50 38 Q 30 20 4 34 Q 14 38 24 42 Q 34 40 42 50 Q 46 46 50 50 Q 54 46 58 50 Q 66 40 76 42 Q 86 38 96 34 Q 70 20 50 38 Z M 44 50 Q 48 64 50 60 Q 52 64 56 50 Q 52 56 50 54 Q 48 56 44 50 Z',
    description: 'Large soaring bird, wide wingspan — Andean condor',
  },
};
```

- [ ] **Step 2: Verify in browser console**

Open `frameforge/index.html` in a browser. In DevTools console:
```javascript
import('/frameforge/data/asset-library.js').then(m => console.log(Object.keys(m.ASSET_LIBRARY)));
```
Expected: array of 14 asset names logged.

- [ ] **Step 3: Commit**

```bash
cd frameforge
git add data/asset-library.js
git commit -m "feat: add built-in decorative asset library (14 silhouettes)"
```

---

## Task 2: Add blend_mode to all shape layers + extend resolveShapeStyle

**Files:**
- Modify: `frameforge/modules/layers.js`

This task touches two things in layers.js: (1) add blend_mode support to `renderShapeLayer`, and (2) extend `resolveShapeStyle` with an optional opacity ceiling for decorative shapes.

- [ ] **Step 1: Extend `resolveShapeStyle` to accept an opacity ceiling**

Find the function (around line 445) and replace it:

```javascript
/**
 * Resolve fill and stroke style from a shape layer.
 * Supports new fill_color/stroke_color model with fallback to legacy color/opacity.
 * opacityCeiling: clamp both fill and stroke opacity to this value (default 1.0).
 *   For decorative shape types (polyline, path, image_mask) pass 0.35.
 */
function resolveShapeStyle(layer, opacityCeiling = 1.0) {
  // Fill
  const fillColor   = layer.fill_color ?? layer.color ?? null;
  const rawFillOp   = layer.fill_opacity ?? (layer.fill_color ? 1.0 : (layer.color ? (layer.opacity ?? 1.0) : 0));

  // Stroke
  const strokeColor  = layer.stroke_color ?? null;
  const rawStrokeOp  = layer.stroke_opacity ?? 1.0;
  const strokeWidth  = layer.stroke_width_px ?? 1;

  if (opacityCeiling < 1.0) {
    if (rawFillOp > opacityCeiling) {
      console.warn(`[layers] ${layer.shape}: fill_opacity ${rawFillOp} exceeds ${opacityCeiling}, clamping.`);
    }
    if (strokeColor && rawStrokeOp > opacityCeiling) {
      console.warn(`[layers] ${layer.shape}: stroke_opacity ${rawStrokeOp} exceeds ${opacityCeiling}, clamping.`);
    }
  }

  const fillOpacity   = clamp(rawFillOp,   0, opacityCeiling);
  const strokeOpacity = clamp(rawStrokeOp, 0, opacityCeiling);

  return { fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth };
}
```

- [ ] **Step 2: Add blend_mode to `renderShapeLayer`**

In `renderShapeLayer` (around line 497), the function starts with `ctx.save();`. Add the blend_mode block immediately after:

```javascript
  ctx.save();

  // Blend mode — applies to all shape types
  const _blendMap = {
    normal:       'source-over',
    multiply:     'multiply',
    screen:       'screen',
    overlay:      'overlay',
    'soft-light': 'soft-light',
  };
  ctx.globalCompositeOperation = _blendMap[layer.blend_mode] || 'source-over';
```

- [ ] **Step 3: Verify in browser**

Load a project with an existing shape layer. Add `"blend_mode": "multiply"` to a rectangle shape in the JSON. Reload. The shape should composite against the photo using multiply. Remove it — shape should return to normal rendering. No console errors.

- [ ] **Step 4: Commit**

```bash
git add modules/layers.js
git commit -m "feat: add blend_mode support to all shape layers"
```

---

## Task 3: Add polyline shape renderer and bounds

**Files:**
- Modify: `frameforge/modules/layers.js`

- [ ] **Step 1: Add the polyline renderer function**

Add this new module-private function in `layers.js`, just before the `renderShapeLayer` function (around line 483):

```javascript
/**
 * Render a polyline shape — called from renderShapeLayer.
 * Points are in percentage coordinates; opacity ceiling 0.35 enforced.
 */
function renderPolylineShape(ctx, layer, w, h) {
  const pts = layer.points;
  if (!Array.isArray(pts) || pts.length < 2) {
    console.warn(`[layers] polyline "${layer.id}": needs at least 2 points.`);
    return;
  }

  const style = resolveShapeStyle(layer, 0.35);

  // Optional dash pattern
  if (layer.stroke_dash) {
    const dashValues = String(layer.stroke_dash).trim().split(/\s+/).map(Number);
    ctx.setLineDash(dashValues);
  }

  ctx.beginPath();
  ctx.moveTo((pts[0].x_pct / 100) * w, (pts[0].y_pct / 100) * h);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo((pts[i].x_pct / 100) * w, (pts[i].y_pct / 100) * h);
  }

  if (style.fillColor) ctx.closePath();

  applyShapeStyle(ctx, style);

  // Reset dash so it doesn't bleed into other shapes
  if (layer.stroke_dash) ctx.setLineDash([]);
}
```

- [ ] **Step 2: Add polyline branch in `renderShapeLayer`**

In `renderShapeLayer`, after the `polygon` branch (around line 664, just before the closing `ctx.restore()`), add:

```javascript
  } else if (shape === 'polyline') {
    renderPolylineShape(ctx, layer, w, h);
  }
```

- [ ] **Step 3: Add polyline case in `computeShapeBounds`**

In `computeShapeBounds` (around line 227), add a polyline early-return before the existing `x_pct` null checks:

```javascript
export function computeShapeBounds(ctx, layer, w, h, _project) {
  try {
    const shape = layer.shape || 'rectangle';

    // polyline: bounding box from all points (selection highlight only — not draggable)
    if (shape === 'polyline') {
      const pts = layer.points;
      if (!Array.isArray(pts) || pts.length < 2) return null;
      const xs = pts.map(p => (p.x_pct / 100) * w);
      const ys = pts.map(p => (p.y_pct / 100) * h);
      const pad = (layer.stroke_width_px ?? 2) / 2;
      return {
        top:    Math.min(...ys) - pad,
        bottom: Math.max(...ys) + pad,
        left:   Math.min(...xs) - pad,
        right:  Math.max(...xs) + pad,
      };
    }

    // path: no reliable bounds — not selectable
    if (shape === 'path') return null;

    // (image_mask handled in Task 5)

    // Existing shapes: require absolute x_pct/y_pct
    const dims  = layer.dimensions || {};
    // ... rest of existing code unchanged
```

- [ ] **Step 4: Verify in browser**

Create a test JSON frame with:
```json
{
  "id": "test-polyline",
  "type": "shape",
  "shape": "polyline",
  "points": [
    { "x_pct": 10, "y_pct": 80 },
    { "x_pct": 30, "y_pct": 60 },
    { "x_pct": 50, "y_pct": 75 },
    { "x_pct": 70, "y_pct": 55 },
    { "x_pct": 90, "y_pct": 70 }
  ],
  "stroke_color": "#FFFFFF",
  "stroke_width_px": 3,
  "stroke_opacity": 0.25
}
```
Expected: a white multi-segment line across the frame. Click on it — selection box should appear. Drag attempt should do nothing (no position update). Test with `"stroke_opacity": 0.5` — console should warn and render at 0.35.

- [ ] **Step 5: Commit**

```bash
git add modules/layers.js
git commit -m "feat: add polyline shape type with selection bounds"
```

---

## Task 4: Add path (bezier) shape renderer

**Files:**
- Modify: `frameforge/modules/layers.js`

- [ ] **Step 1: Add the path renderer function**

Add this function just before `renderShapeLayer` (below `renderPolylineShape`):

```javascript
/**
 * Render a bezier path shape — called from renderShapeLayer.
 * path_pct uses SVG path syntax with coordinates in 0–100 percentage space.
 * Supported commands: M, L, Q, C, Z (uppercase only, explicit per command).
 * After M, implicit coordinate pairs are treated as L (standard SVG behaviour).
 * Opacity ceiling 0.35 enforced.
 */
function renderPathShape(ctx, layer, w, h) {
  const pathStr = layer.path_pct;
  if (!pathStr || typeof pathStr !== 'string') {
    console.warn(`[layers] path "${layer.id}": missing path_pct.`);
    return;
  }

  const style = resolveShapeStyle(layer, 0.35);
  ctx.lineCap = layer.stroke_linecap || 'round';

  // Tokenize: command letters and numbers (including negatives and decimals)
  const tokens = pathStr.trim()
    .match(/[MmLlQqCcZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];

  ctx.beginPath();

  let i = 0;
  let cmd = '';

  const num = (offset) => parseFloat(tokens[i + offset]);
  const X   = (v) => (v / 100) * w;
  const Y   = (v) => (v / 100) * h;

  while (i < tokens.length) {
    const tok = tokens[i];

    if (/[MmLlQqCcZz]/.test(tok)) {
      cmd = tok.toUpperCase();
      i++;
    }

    if (cmd === 'Z') {
      ctx.closePath();
      cmd = ''; // no implicit repeat for Z
      continue;
    }

    if (i >= tokens.length) break;

    switch (cmd) {
      case 'M':
        ctx.moveTo(X(num(0)), Y(num(1)));
        i += 2;
        cmd = 'L'; // subsequent coords after M are implicit L
        break;
      case 'L':
        ctx.lineTo(X(num(0)), Y(num(1)));
        i += 2;
        break;
      case 'Q':
        ctx.quadraticCurveTo(X(num(0)), Y(num(1)), X(num(2)), Y(num(3)));
        i += 4;
        break;
      case 'C':
        ctx.bezierCurveTo(X(num(0)), Y(num(1)), X(num(2)), Y(num(3)), X(num(4)), Y(num(5)));
        i += 6;
        break;
      default:
        i++; // skip unknown token
    }
  }

  applyShapeStyle(ctx, style);
}
```

- [ ] **Step 2: Add path branch in `renderShapeLayer`**

In `renderShapeLayer`, after the polyline branch (just before `ctx.restore()`):

```javascript
  } else if (shape === 'path') {
    renderPathShape(ctx, layer, w, h);
  }
```

- [ ] **Step 3: Verify in browser**

Create a test JSON frame with:
```json
{
  "id": "test-path",
  "type": "shape",
  "shape": "path",
  "path_pct": "M 10 90 Q 30 40 50 70 Q 70 100 90 50",
  "stroke_color": "#FFD700",
  "stroke_width_px": 4,
  "stroke_opacity": 0.3,
  "stroke_linecap": "round"
}
```
Expected: a gold curved stroke arcing across the frame. Click on it — no selection box (returns null bounds). Test with a closed path using Z and `fill_color` set.

- [ ] **Step 4: Commit**

```bash
git add modules/layers.js
git commit -m "feat: add path bezier shape type (M/L/Q/C/Z, pct coordinates)"
```

---

## Task 5: Add image_mask shape renderer and bounds

**Files:**
- Modify: `frameforge/modules/layers.js` (add import + renderer + bounds)

- [ ] **Step 1: Import ASSET_LIBRARY at the top of layers.js**

Add the import at the top of `layers.js`, after the existing imports:

```javascript
import { ASSET_LIBRARY } from '../data/asset-library.js';
```

- [ ] **Step 2: Add the image_mask renderer function**

Add this function just before `renderShapeLayer` (below `renderPathShape`):

```javascript
/**
 * Render an image_mask shape — silhouette from the built-in or custom asset library.
 * Called from renderShapeLayer. blend_mode already set by caller.
 * fill_opacity is clamped to 0.35 (decorative ceiling).
 */
function renderImageMaskShape(ctx, layer, w, h, project) {
  const assetName = layer.asset;
  if (!assetName) {
    console.warn(`[layers] image_mask "${layer.id}": missing "asset" name.`);
    return;
  }

  // Resolve asset: custom first, then built-in library
  let asset = null;
  if (Array.isArray(project?.data?.custom_assets)) {
    asset = project.data.custom_assets.find(a => a.name === assetName) ?? null;
  }
  if (!asset) asset = ASSET_LIBRARY[assetName] ?? null;
  if (!asset) {
    console.warn(`[layers] image_mask "${layer.id}": unknown asset "${assetName}".`);
    return;
  }

  const fillColor = layer.fill_color ?? null;
  if (!fillColor) return; // nothing to draw

  // Parse viewbox: "minX minY width height"
  const vbParts = String(asset.viewbox || '0 0 100 100').trim().split(/\s+/).map(Number);
  const [vx, vy, vw, vh] = vbParts;
  if (!vw || !vh) return;

  // Resolve position (supports both zone and absolute modes)
  const pos    = resolvePosition(layer.position, w, h);
  const dims   = layer.dimensions || {};
  const targetW = clamp((dims.width_pct  ?? 10) / 100, 0, 1) * w;
  const targetH = clamp((dims.height_pct ?? 10) / 100, 0, 1) * h;

  // Opacity ceiling
  let fillOpacity = clamp(layer.fill_opacity ?? 1.0, 0, 1);
  if (fillOpacity > 0.35) {
    console.warn(`[layers] image_mask "${assetName}": fill_opacity ${fillOpacity} exceeds 0.35, clamping.`);
    fillOpacity = 0.35;
  }

  // Parse fill color to rgba
  const isHex = c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
  if (!isHex(fillColor)) return;
  const r = parseInt(fillColor.slice(1, 3), 16);
  const g = parseInt(fillColor.slice(3, 5), 16);
  const b = parseInt(fillColor.slice(5, 7), 16);

  // Translate to position
  ctx.translate(pos.x, pos.y);

  // Rotation around center of bounding box
  const rotDeg = layer.rotation_deg ?? 0;
  if (rotDeg !== 0) {
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((rotDeg * Math.PI) / 180);
    ctx.translate(-targetW / 2, -targetH / 2);
  }

  // Horizontal / vertical flip
  if (layer.flip_x) { ctx.translate(targetW, 0); ctx.scale(-1, 1); }
  if (layer.flip_y) { ctx.translate(0, targetH); ctx.scale(1, -1); }

  // Scale from viewbox space to target pixel dimensions
  ctx.scale(targetW / vw, targetH / vh);
  ctx.translate(-vx, -vy);

  // Draw via Path2D — browser parses the SVG path string natively
  const path2d = new Path2D(asset.path_d);
  ctx.fillStyle = `rgba(${r},${g},${b},${fillOpacity})`;
  ctx.fill(path2d);
}
```

- [ ] **Step 3: Add image_mask branch in `renderShapeLayer`**

In `renderShapeLayer`, after the path branch (just before `ctx.restore()`):

```javascript
  } else if (shape === 'image_mask') {
    renderImageMaskShape(ctx, layer, w, h, _project);
  }
```

Note: `_project` is the parameter name in the existing function signature — it's already there, just unused previously. Update the function signature from `_project` to `project` (remove the underscore) so the parameter is accessible:

```javascript
export function renderShapeLayer(ctx, layer, w, h, project) {
```

- [ ] **Step 4: Add image_mask case in `computeShapeBounds`**

In `computeShapeBounds`, after the `path` early-return added in Task 3, add:

```javascript
    // image_mask: uses resolvePosition for zone + absolute support
    if (shape === 'image_mask') {
      const dims = layer.dimensions || {};
      if (dims.width_pct == null || dims.height_pct == null) return null;
      const pos    = resolvePosition(layer.position, w, h);
      const width  = (dims.width_pct  / 100) * w;
      const height = (dims.height_pct / 100) * h;
      return { top: pos.y, bottom: pos.y + height, left: pos.x, right: pos.x + width };
    }
```

- [ ] **Step 5: Verify in browser**

Create a test JSON frame with:
```json
{
  "id": "test-mask",
  "type": "shape",
  "shape": "image_mask",
  "asset": "mountain-range",
  "position": { "zone": "bottom-left", "offset_x_pct": 0, "offset_y_pct": -25 },
  "dimensions": { "width_pct": 100, "height_pct": 25 },
  "fill_color": "#FFFFFF",
  "fill_opacity": 0.15
}
```
Expected: a white mountain-range silhouette across the bottom quarter of the frame. Click on it — selection box should appear. Drag it — it should move.

Test `flip_x: true` — silhouette should mirror horizontally.

Test all 14 asset names — no console errors for any of them.

- [ ] **Step 6: Commit**

```bash
git add modules/layers.js data/asset-library.js
git commit -m "feat: add image_mask shape type with built-in asset library"
```

---

## Task 6: Guard polyline/path against dragging in drag.js

**Files:**
- Modify: `frameforge/modules/drag.js`

- [ ] **Step 1: Add the guard in `hitTestShapeLayer`**

Find `hitTestShapeLayer` (around line 82). Inside the loop, after `if (layer.type !== 'shape') continue;`, add:

```javascript
    // polyline and path have no position anchor — not draggable
    if (layer.shape === 'polyline' || layer.shape === 'path') continue;
```

The complete loop body should look like:

```javascript
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer.type !== 'shape') continue;

    // polyline and path have no position anchor — not draggable
    if (layer.shape === 'polyline' || layer.shape === 'path') continue;

    let bounds;
    try {
      bounds = computeShapeBounds(ctx, layer, w, h, project);
    } catch { continue; }
    if (!bounds) continue;
    // ... rest unchanged
```

- [ ] **Step 2: Verify in browser**

With the polyline test layer from Task 3 in the frame: click the polyline — the selection highlight should appear (selection box drawn by renderer.js is unaffected). Try to drag it — nothing should move. The image_mask layer from Task 5 should still be draggable.

- [ ] **Step 3: Commit**

```bash
git add modules/drag.js
git commit -m "fix: prevent drag on polyline and path shapes (no position anchor)"
```

---

## Task 7: Update validator.js

**Files:**
- Modify: `frameforge/modules/validator.js`

- [ ] **Step 1: Extend KNOWN_SHAPES**

Find (around line 205):
```javascript
const KNOWN_SHAPES = ['line', 'rectangle', 'circle', 'triangle', 'arrow', 'polygon'];
```

Replace with:
```javascript
const KNOWN_SHAPES = ['line', 'rectangle', 'circle', 'triangle', 'arrow', 'polygon', 'polyline', 'path', 'image_mask'];
```

- [ ] **Step 2: Add shape-specific validation for the three new types**

After the existing `polygon` validation block (around line 226), add inside the `else` block of the shape case:

```javascript
        if (layer.shape === 'polyline') {
          if (!Array.isArray(layer.points)) {
            warnings.push(`${lp} (polyline): "points" must be an array.`);
          } else if (layer.points.length < 2) {
            warnings.push(`${lp} (polyline): "points" must have at least 2 entries (has ${layer.points.length}).`);
          }
        }
        if (layer.shape === 'path') {
          if (!layer.path_pct) {
            warnings.push(`${lp} (path): missing "path_pct".`);
          }
        }
        if (layer.shape === 'image_mask') {
          if (!layer.asset) {
            warnings.push(`${lp} (image_mask): missing "asset" name.`);
          }
          if (!layer.dimensions?.width_pct || !layer.dimensions?.height_pct) {
            warnings.push(`${lp} (image_mask): "dimensions.width_pct" and "dimensions.height_pct" are required.`);
          }
          if (!layer.fill_color) {
            warnings.push(`${lp} (image_mask): missing "fill_color" — silhouette will not render.`);
          }
        }
```

- [ ] **Step 3: Add custom_assets top-level validation**

Find the `image_index` validation block (around line 33). After it, add:

```javascript
  // ── custom_assets (optional) ───────────────────────────────────────────
  if (data.custom_assets != null) {
    if (!Array.isArray(data.custom_assets)) {
      warnings.push('"custom_assets" must be an array if present.');
    } else {
      data.custom_assets.forEach((asset, i) => {
        const ap = `custom_assets[${i}]`;
        if (!asset.name)    warnings.push(`${ap}: missing "name".`);
        if (!asset.viewbox) warnings.push(`${ap}: missing "viewbox".`);
        if (!asset.path_d)  warnings.push(`${ap}: missing "path_d".`);
      });
    }
  }
```

- [ ] **Step 4: Verify in browser**

Load a project JSON with an intentionally invalid polyline (0 points), an image_mask with no `asset`, and a `custom_assets` entry missing `path_d`. Open the validator panel. Expected: warnings for each invalid entry. No errors for valid polyline/path/image_mask layers.

- [ ] **Step 5: Commit**

```bash
git add modules/validator.js
git commit -m "feat: validate polyline, path, image_mask shape types and custom_assets"
```

---

## Task 8: Update inspector.js

**Files:**
- Modify: `frameforge/ui/inspector.js`

- [ ] **Step 1: Update `renderLayerTypeBadges` to accept layers array**

Find the function (around line 247) and replace it entirely:

```javascript
function renderLayerTypeBadges(layers) {
  if (!layers.length) return '<div class="text-muted text-sm">No layers</div>';

  const typeClasses = {
    image:       'layer-type-image',
    overlay:     'layer-type-overlay',
    text:        'layer-type-text',
    shape:       'layer-type-shape',
    stats_block: 'layer-type-stats',
    logo:        'layer-type-logo',
  };

  // Generic layers counted by type; decorative shape sub-types get individual badges
  const genericCounts = {};
  const specificBadges = [];

  for (const layer of layers) {
    if (layer.type === 'shape') {
      const s = layer.shape;
      if (s === 'polyline') {
        const n = Array.isArray(layer.points) ? layer.points.length : 0;
        specificBadges.push({ label: `Polyline — ${n} pts`, cssClass: 'layer-type-shape' });
      } else if (s === 'path') {
        specificBadges.push({ label: 'Path — bezier', cssClass: 'layer-type-shape' });
      } else if (s === 'image_mask') {
        const name = layer.asset ?? '?';
        specificBadges.push({ label: `Silhouette — ${escHtml(name)}`, cssClass: 'layer-type-shape' });
      } else {
        genericCounts['shape'] = (genericCounts['shape'] ?? 0) + 1;
      }
    } else {
      genericCounts[layer.type] = (genericCounts[layer.type] ?? 0) + 1;
    }
  }

  const genericHtml = Object.entries(genericCounts).map(([type, count]) =>
    `<span class="layer-type-tag ${typeClasses[type] ?? ''}">${escHtml(type)} ×${count}</span>`
  );

  const specificHtml = specificBadges.map(({ label, cssClass }) =>
    `<span class="layer-type-tag ${cssClass}" title="${label}">${label}</span>`
  );

  return `<div class="inspector-badge-list">
    ${[...genericHtml, ...specificHtml].join('')}
  </div>`;
}
```

- [ ] **Step 2: Update the call site in `Inspector.render()`**

Find the `typeCounts` computation block (around line 64):

```javascript
    // Count layer types
    const typeCounts = {};
    for (const layer of layers) {
      typeCounts[layer.type] = (typeCounts[layer.type] ?? 0) + 1;
    }
```

Delete it entirely. Then find the call:
```javascript
        ${renderLayerTypeBadges(typeCounts)}
```
Change to:
```javascript
        ${renderLayerTypeBadges(layers)}
```

- [ ] **Step 3: Verify in browser**

Load a project with a mix of existing shapes plus one polyline, one path, and one image_mask. Open the Inspector panel. Expected:
- Existing shapes (line, rectangle, etc.) grouped as `shape ×N`
- Polyline shown as `Polyline — 5 pts` (or however many points)
- Path shown as `Path — bezier`
- image_mask shown as `Silhouette — mountain-range`

- [ ] **Step 4: Commit**

```bash
git add ui/inspector.js
git commit -m "feat: show descriptive inspector badges for polyline, path, image_mask"
```

---

## Task 9: Update shapes-reference.md

**Files:**
- Modify: `frameforge/docs/shapes-reference.md`

- [ ] **Step 1: Append new sections after the polygon section**

Read `frameforge/docs/shapes-reference.md` first. At the end of the file (after the polygon examples), append:

```markdown
---

### `polyline`

A connected series of straight line segments defined by two or more percentage coordinate points.

**When to use:**
- Road or path direction suggestions across a frame
- Angular mountain or horizon silhouettes
- Multi-segment accent strokes that span compositional zones

| Field | Default | Description |
|---|---|---|
| `points` | required | Ordered array of `{x_pct, y_pct}` objects (min 2, max 20) |
| `stroke_color` | null | Hex stroke color |
| `stroke_width_px` | `1` | Stroke thickness in pixels |
| `stroke_opacity` | `1.0` | Stroke opacity (clamped to 0.35 for decorative use) |
| `stroke_dash` | none | SVG dash pattern string, e.g. `"6 4"` — solid if omitted |
| `fill_color` | null | Optional hex fill — closes the path and fills the enclosed area |
| `fill_opacity` | `1.0` | Fill opacity (clamped to 0.35 for decorative use) |
| `blend_mode` | `"normal"` | See Blend Mode section |

**Note:** Polyline layers are selectable (show a bounding box highlight) but are not draggable — the geometry is defined by the points array, not a single position anchor.

```json
{ "type": "shape", "id": "horizon-line", "shape": "polyline",
  "points": [
    { "x_pct": 0,  "y_pct": 65 },
    { "x_pct": 25, "y_pct": 55 },
    { "x_pct": 50, "y_pct": 62 },
    { "x_pct": 75, "y_pct": 50 },
    { "x_pct": 100,"y_pct": 58 }
  ],
  "stroke_color": "#FFFFFF", "stroke_width_px": 2, "stroke_opacity": 0.20 }
```

---

### `path`

A freeform curve defined by SVG-style path commands using percentage coordinates.

**When to use:**
- Curved road or river suggestions
- Organic horizon lines
- Framing arcs and sweeping compositional guides

**Supported commands (v1.1):** `M` (move to), `L` (line to), `Q` (quadratic bezier), `C` (cubic bezier), `Z` (close path). Commands `S`, `T`, `A` are not supported in v1.1.

**Coordinate space:** All numeric values are in 0–100 percentage space. `M 50 100` means center-bottom of the canvas, not pixel 50×100.

| Field | Default | Description |
|---|---|---|
| `path_pct` | required | SVG path `d` syntax, all coords in 0–100 percentage space |
| `stroke_color` | null | Hex stroke color |
| `stroke_width_px` | `1` | Stroke thickness in pixels |
| `stroke_opacity` | `1.0` | Stroke opacity (clamped to 0.35 for decorative use) |
| `stroke_linecap` | `"round"` | `"round"`, `"butt"`, or `"square"` |
| `fill_color` | null | Optional hex fill for closed paths |
| `fill_opacity` | `1.0` | Fill opacity (clamped to 0.35 for decorative use) |
| `blend_mode` | `"normal"` | See Blend Mode section |

**Note:** Path layers have no bounding box — they are not selectable or draggable.

```json
{ "type": "shape", "id": "road-curve", "shape": "path",
  "path_pct": "M 10 95 Q 35 40 55 70 Q 75 100 90 45",
  "stroke_color": "#FFFFFF", "stroke_width_px": 3,
  "stroke_opacity": 0.22, "stroke_linecap": "round" }
```

---

### `image_mask`

A pre-defined silhouette drawn from the built-in named asset library. The AI specifies an asset by name; the renderer resolves it to a vector path and renders it at the specified position, size, and color.

**When to use:**
- Location-specific flora or fauna silhouettes
- Human presence suggestions (cyclist, standing figure)
- Environmental props (sign post, wave, mountain peak)
- Opening or closing frames needing a single strong silhouette anchor

**Multiple instances:** Using the same asset more than once is intentional and expected. Vary `x_pct`, `y_pct`, `dimensions`, and `fill_opacity` between instances for a naturalistic effect.

| Field | Default | Description |
|---|---|---|
| `asset` | required | Asset name from built-in library or project `custom_assets` |
| `position` | required | Standard FrameForge position object (zone or absolute mode) |
| `dimensions.width_pct` | `10` | Width as % of canvas width |
| `dimensions.height_pct` | `10` | Height as % of canvas height |
| `fill_color` | required | Hex silhouette fill color |
| `fill_opacity` | `1.0` | Fill opacity (clamped to 0.35 by renderer) |
| `flip_x` | `false` | Mirror horizontally |
| `flip_y` | `false` | Mirror vertically |
| `rotation_deg` | `0` | Rotation in degrees |
| `blend_mode` | `"normal"` | See Blend Mode section |

**image_mask layers are fully draggable** (they have a standard `position` anchor).

```json
{ "type": "shape", "id": "silhouette-1", "shape": "image_mask",
  "asset": "frailejón",
  "position": { "zone": "bottom-left", "offset_x_pct": 5, "offset_y_pct": -30 },
  "dimensions": { "width_pct": 12, "height_pct": 28 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.18 }
```

#### Built-in asset library

| Name | Description | Typical context |
|---|---|---|
| `frailejón` | Espeletia — tall stem with dense rosette crown | Colombian páramo |
| `pine-tree` | Conifer — classic triangular silhouette | Mountain and alpine |
| `deciduous-tree` | Rounded canopy tree | Valley, lowland, temperate |
| `mountain-peak` | Single angular peak | Establishing landscape |
| `mountain-range` | Three-peak horizon line | Wide landscape, skyline |
| `cactus` | Branching columnar cactus | Desert, arid |
| `grass-tuft` | Low ground-level grass cluster | Foreground, field |
| `bird-in-flight` | Simplified bird, wings spread | Open sky frames |
| `cyclist` | Simplified rider on bike | Cycling and sport projects |
| `person-standing` | Generic standing human figure | Human presence, scale |
| `road-sign-post` | Vertical post with rectangular panel | Milestone, wayfinding |
| `wave` | Single rolling ocean wave | Coastal, water |
| `palm-tree` | Tropical palm silhouette | Beach, tropical |
| `condor` | Large soaring bird, wide wingspan | Andean, wildlife |

---

### Blend Mode

`blend_mode` is now available on all shape layer types. Previously overlay-only.

| Value | Canvas operation | When to use |
|---|---|---|
| `"normal"` | `source-over` | Default — all opaque or semi-transparent shapes |
| `"screen"` | `screen` | Light-colored strokes that should glow rather than sit on top |
| `"multiply"` | `multiply` | Dark shapes that should deepen the photo without a hard edge |
| `"soft-light"` | `soft-light` | Subtle tonal overlays, texture suggestions |
| `"overlay"` | `overlay` | High-contrast accent shapes — use sparingly |

Applies to: `line`, `rectangle`, `circle`, `triangle`, `arrow`, `polygon`, `polyline`, `path`, `image_mask`.

---

### Custom Assets (`custom_assets`)

For projects requiring silhouettes not in the built-in library. Defined at the top level of the project JSON and referenced by name in any `image_mask` layer throughout the project.

Custom assets are resolved before the built-in library — a custom asset with the same name as a built-in asset will override it.

```json
"custom_assets": [
  {
    "name": "my-peak",
    "viewbox": "0 0 100 60",
    "path_d": "M 50 5 L 90 60 L 10 60 Z",
    "description": "Optional note shown in Inspector tooltip"
  }
]
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Reference name used in `image_mask` layers |
| `viewbox` | string | Yes | SVG viewBox of the source path, e.g. `"0 0 100 80"` |
| `path_d` | string | Yes | Raw SVG `d` attribute in the asset's own coordinate space |
| `description` | string | No | Human-readable note for the Inspector tooltip |
```

- [ ] **Step 2: Verify the file renders correctly**

Open the file in a Markdown viewer or GitHub. Check that all tables, code blocks, and section headers are correctly formatted.

- [ ] **Step 3: Commit**

```bash
git add docs/shapes-reference.md
git commit -m "docs: add polyline, path, image_mask, blend_mode, custom_assets to shapes reference"
```

---

## Task 10: Update AI manual (ai-manual.md + ai-manual-content.js)

**Files:**
- Modify: `docs/ai-manual.md`
- Modify: `frameforge/data/ai-manual-content.js`

This task updates both files in sync. Make the changes to `docs/ai-manual.md` first, then mirror them in `ai-manual-content.js`.

- [ ] **Step 1: Update §8.5 shape section in `docs/ai-manual.md`**

Find the shape layer section in §8.5 (around line 277). Update the inline example and the "When to use" table:

Replace the current shape example and table:

```markdown
#### `shape`

```json
{
  "id": "title-rule",
  "type": "shape",
  "shape": "line",
  "color": "#F5C518",
  "opacity": 1.0,
  "position": { "x_pct": 6, "y_pct": 70 },
  "dimensions": { "width_pct": 4, "height_px": 3 }
}
```

- `shape`: `"line"` or `"rectangle"`
- Use `height_px` for thin lines, `height_pct` for proportional shapes
```

With:

```markdown
#### `shape`

```json
{
  "id": "title-rule",
  "type": "shape",
  "shape": "line",
  "fill_color": "#F5C518",
  "fill_opacity": 1.0,
  "position": { "x_pct": 6, "y_pct": 70 },
  "dimensions": { "width_pct": 4, "height_px": 3 }
}
```

- `shape`: `"line"`, `"rectangle"`, `"circle"`, `"triangle"`, `"arrow"`, `"polygon"`, `"polyline"`, `"path"`, `"image_mask"`
- Use `height_px` for thin lines, `height_pct` for proportional shapes
- All shape types support `blend_mode`: `"normal"` (default), `"multiply"`, `"screen"`, `"overlay"`, `"soft-light"`
- See the full shapes reference for per-type properties
```

- [ ] **Step 2: Update the "Shapes — Use Them Intentionally" table in §8.5**

Find the shape usage table. Append three new rows after the "Angled energy" row:

```markdown
| Location identity / scene depth | `image_mask` | Frailejón silhouette at frame bottom, mountain range horizon |
| Multi-point stroke / terrain | `polyline` | Winding road suggestion, angular ridgeline |
| Organic curve / compositional guide | `path` | Sweeping arc, curved river, framing loop |
```

- [ ] **Step 3: Add §8.14 Decorative Layer Rules in `docs/ai-manual.md`**

Add the following new section after §8.13 (the pre-output checklist):

```markdown
---

### 8.14 Decorative Layer Rules

These rules apply to `polyline`, `path`, and `image_mask` shape layers. These are the three types used for illustrative scene geometry — the environmental layer that sits between the photograph and the text.

#### Opacity discipline — hard ceilings

The renderer enforces these automatically, but the AI must not exceed them in the first place:

| Usage | `fill_opacity` / `stroke_opacity` range |
|---|---|
| Background texture — barely-there suggestion | 0.08–0.15 |
| Visible but clearly subordinate accent | 0.18–0.28 |
| Hard ceiling (renderer clamps above this) | **0.35** |

❌ Never set decorative shape opacity above 0.35.

#### Quantity discipline

- Maximum **5 decorative shape layers** per frame
- Never place decorative shapes on a frame that already has 2+ text layers, unless the shape is a single low-opacity line
- When using multiple `image_mask` instances of the same asset, vary `height_pct`, `x_pct`/`y_pct`, and `fill_opacity` between instances — identical copies read as a bug, not a design

#### Intent discipline

Every decorative shape must earn its place. It must reinforce the **location, mood, or compositional flow** of the specific frame. Ask before placing any decorative shape:
- Does it reinforce where this image was taken?
- Does it guide the eye toward or away from the subject?
- Does it add depth that the photograph cannot provide on its own?

If you cannot answer yes to at least one of these, do not add the shape.

❌ Do not use decorative shapes to fill empty space.
❌ Do not use decorative shapes as a substitute for a proper overlay — contrast is the overlay's job.

#### When NOT to use decorative shapes

- Portrait frames where a person's face is the primary subject
- Frames with no clear environmental or geographic identity to reinforce
- Frames where the photograph already provides sufficient visual complexity

#### `image_mask` — choosing and placing assets

- Match the asset to the actual environment in the photograph. `frailejón` is for páramo, not beach. `palm-tree` is for tropical, not alpine.
- Place silhouettes in the compositional foreground (bottom or sides), never overlapping the subject's face or key feature
- Scale silhouettes relative to the frame — a tree that is 8–15% of canvas width reads as a frame element; at 40% it competes with the subject
- `flip_x` allows one asset to serve both sides of a composition without visual repetition

#### Example — correct decorative use

```json
{ "id": "silhouette-left",  "type": "shape", "shape": "image_mask",
  "asset": "frailejón",
  "position": { "zone": "bottom-left",  "offset_x_pct": 3,  "offset_y_pct": -35 },
  "dimensions": { "width_pct": 10, "height_pct": 30 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.18 }

{ "id": "silhouette-right", "type": "shape", "shape": "image_mask",
  "asset": "frailejón",
  "position": { "zone": "bottom-right", "offset_x_pct": -5, "offset_y_pct": -40 },
  "dimensions": { "width_pct": 8, "height_pct": 24 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.13,
  "flip_x": true }
```
```

- [ ] **Step 4: Update §8.13 pre-output checklist**

Find the checklist (around line 626). Add two new items at the end of the list, before the closing `---`:

```markdown
- [ ] No decorative shape layer (`polyline`, `path`, `image_mask`) has `fill_opacity` or `stroke_opacity` above 0.35
- [ ] No frame has more than 5 decorative shape layers total
```

- [ ] **Step 5: Mirror all changes to `frameforge/data/ai-manual-content.js`**

Open `frameforge/data/ai-manual-content.js`. The file exports a template literal `AI_MANUAL` (starts at line 11). The content inside the template literal mirrors `docs/ai-manual.md` but uses Markdown `##` headings instead of `###` (one level up, since it has no `## PART VIII` wrapper).

Read `docs/ai-manual.md` first. Then apply the same four changes to the template literal in `ai-manual-content.js`:
1. Find the shape layer subsection in "Layer Types". Update the `shape` example JSON (replace `"color"` with `"fill_color"`) and the `shape` bullet list to include `"polyline"`, `"path"`, `"image_mask"` and the blend_mode note.
2. Find "Shapes — Use Them Intentionally" table. Append the same three rows added to `docs/ai-manual.md`.
3. Find the pre-output checklist section. Append a new "## Decorative Layer Rules" section after it (matching the `### 8.14` content from `docs/ai-manual.md` but using `##` heading level).
4. Find the pre-output checklist bullet list. Add the same two items: decorative opacity ≤ 0.35, no more than 5 decorative shape layers.

The content must match `docs/ai-manual.md` exactly (modulo heading level). The sync note at the bottom of `docs/ai-manual.md` mandates this.

- [ ] **Step 6: Verify sync**

After editing both files, open the FrameForge app and export a project brief. Open the exported brief in a text editor and search for "Decorative Layer Rules". It should be present. Also search for "image_mask" in the layer types list — it should appear.

- [ ] **Step 7: Commit**

```bash
cd ..  # back to PostersCreator root if needed
git add docs/ai-manual.md
cd frameforge
git add data/ai-manual-content.js
git commit -m "docs: add decorative layer rules to AI manual (§8.14) + shape type updates"
```

---

## Task 11: Shape sample mockups for AI export package

**Files:**
- Modify: `frameforge/ui/brief-mockups.js` — add `generateShapeSamples()`
- Modify: `frameforge/ui/concept-builder.js` — import and call it

Generates 3 new PNGs (`{slug}-shapes-1.png`, `{slug}-shapes-2.png`, `{slug}-shapes-3.png`) downloaded as part of the export package. Each shows one decorative shape type drawn on canvas with callout annotations, so the AI model has a visual reference for how shapes look and what their key properties do.

- [ ] **Step 1: Add `generateShapeSamples` to `brief-mockups.js`**

Add this export function and its helpers at the bottom of `frameforge/ui/brief-mockups.js` (before the final blank line):

```javascript
// ─── 6. Shape sample mockups ──────────────────────────────────────────────────

/**
 * Generate 3 shape sample mockups illustrating image_mask, polyline, and path usage.
 * Each returns a PNG Blob. Downloaded as {slug}-shapes-1/2/3.png.
 * @returns {Promise<Blob[]>}
 */
export async function generateShapeSamples() {
  return Promise.all([
    _renderShapeSample('image_mask'),
    _renderShapeSample('polyline'),
    _renderShapeSample('path'),
  ]);
}

async function _renderShapeSample(shapeType) {
  const W = 1080;
  const compH  = 660;   // composition zone
  const specsH = 120;   // specs strip
  const rulesH = 100;   // opacity rules strip

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = compH + specsH + rulesH;
  const ctx = canvas.getContext('2d');

  _drawShapeComposition(ctx, W, compH, shapeType);
  _drawShapeSpecsStrip(ctx, 0, compH, W, specsH, shapeType);
  _drawOpacityRulesStrip(ctx, 0, compH + specsH, W, rulesH);

  return _canvasToBlob(canvas);
}

function _drawShapeComposition(ctx, w, h, shapeType) {
  // Background
  ctx.fillStyle = '#12121e';
  ctx.fillRect(0, 0, w, h);

  // Photo placeholder
  ctx.fillStyle = '#1e1e30';
  ctx.fillRect(0, 0, w, h);

  // Subtle photo texture suggestion
  ctx.fillStyle = '#252538';
  ctx.fillRect(w * 0.1, h * 0.05, w * 0.8, h * 0.6);

  // Dark gradient overlay (simulates photo + overlay layer)
  const grad = ctx.createLinearGradient(0, h, 0, h * 0.4);
  grad.addColorStop(0, 'rgba(8,8,16,0.85)');
  grad.addColorStop(1, 'rgba(8,8,16,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const scale = w / 1080;

  if (shapeType === 'image_mask') {
    _drawImageMaskSample(ctx, w, h, scale);
  } else if (shapeType === 'polyline') {
    _drawPolylineSample(ctx, w, h, scale);
  } else {
    _drawPathSample(ctx, w, h, scale);
  }
}

function _drawImageMaskSample(ctx, w, h, scale) {
  // Mountain range silhouette — bottom 28% of frame
  const silH = Math.round(h * 0.28);
  const silY = h - silH;

  // Draw a simplified mountain-range shape (3 peaks)
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, silY + silH * 0.6);
  ctx.lineTo(w * 0.15, silY + silH * 0.2);
  ctx.lineTo(w * 0.28, silY + silH * 0.55);
  ctx.lineTo(w * 0.42, silY + silH * 0.05);  // tallest peak
  ctx.lineTo(w * 0.55, silY + silH * 0.40);
  ctx.lineTo(w * 0.68, silY + silH * 0.15);
  ctx.lineTo(w * 0.80, silY + silH * 0.50);
  ctx.lineTo(w * 0.92, silY + silH * 0.30);
  ctx.lineTo(w, silY + silH * 0.45);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Pine tree left — taller, opacity 0.18
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#FFFFFF';
  const treeX = w * 0.06;
  const treeTopY = h * 0.45;
  const treeW = w * 0.08;
  const treeH = h * 0.35;
  ctx.beginPath();
  ctx.moveTo(treeX + treeW / 2, treeTopY);
  ctx.lineTo(treeX + treeW, treeTopY + treeH);
  ctx.lineTo(treeX, treeTopY + treeH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Pine tree right — shorter, flipped, opacity 0.13
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = '#FFFFFF';
  const tree2X = w * 0.86;
  const tree2TopY = h * 0.52;
  const tree2W = w * 0.06;
  const tree2H = h * 0.28;
  ctx.beginPath();
  ctx.moveTo(tree2X + tree2W / 2, tree2TopY);
  ctx.lineTo(tree2X + tree2W, tree2TopY + tree2H);
  ctx.lineTo(tree2X, tree2TopY + tree2H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Callouts
  const lh = Math.round(14 * scale);
  _callout(ctx, w * 0.06 + w * 0.04 + 10, h * 0.45 + lh, 'image_mask · asset: "pine-tree" · opacity 0.18', false, w);
  _callout(ctx, w * 0.20, h - silH * 0.5, 'asset: "mountain-range" · fill_opacity: 0.15', false, w);
  _callout(ctx, w * 0.86 - 10, h * 0.55, 'flip_x: true · opacity 0.13', true, w);

  // Label
  ctx.font = `bold ${Math.round(28 * scale)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('image_mask  —  silhouette assets', w / 2, Math.round(16 * scale));
}

function _drawPolylineSample(ctx, w, h, scale) {
  // Horizon polyline — solid stroke, white, opacity 0.20
  const pts = [
    [0,      h * 0.62],
    [w * 0.18, h * 0.52],
    [w * 0.35, h * 0.58],
    [w * 0.52, h * 0.46],
    [w * 0.68, h * 0.55],
    [w * 0.82, h * 0.48],
    [w,      h * 0.53],
  ];

  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.round(2 * scale);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();

  // Dashed accent polyline — lower, different color, opacity 0.15
  const pts2 = [
    [w * 0.05, h * 0.75],
    [w * 0.25, h * 0.70],
    [w * 0.50, h * 0.73],
    [w * 0.75, h * 0.68],
    [w * 0.95, h * 0.72],
  ];

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#a0c8ff';
  ctx.lineWidth = Math.round(3 * scale);
  ctx.setLineDash([Math.round(8 * scale), Math.round(5 * scale)]);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts2[0][0], pts2[0][1]);
  for (let i = 1; i < pts2.length; i++) ctx.lineTo(pts2[i][0], pts2[i][1]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Point dots on solid line
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#5b8aff';
  for (const [px, py] of pts) {
    ctx.beginPath();
    ctx.arc(px, py, Math.round(4 * scale), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Callouts
  _callout(ctx, pts[2][0], pts[2][1] - 18, 'polyline · 7 points · stroke_opacity: 0.20 · stroke_width_px: 2', false, w);
  _callout(ctx, pts2[2][0], pts2[2][1] + 20, 'stroke_dash: "8 5" · stroke_opacity: 0.15 · stroke_color: #a0c8ff', false, w);

  // Label
  ctx.font = `bold ${Math.round(28 * scale)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('polyline  —  multi-point strokes', w / 2, Math.round(16 * scale));
}

function _drawPathSample(ctx, w, h, scale) {
  // Sweeping bezier arc — bottom-left to top-right
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.round(4 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h * 0.92);
  ctx.bezierCurveTo(w * 0.20, h * 0.30, w * 0.60, h * 0.80, w * 0.95, h * 0.15);
  ctx.stroke();
  ctx.restore();

  // Second path — closed fill example
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.round(2 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.10, h * 0.85);
  ctx.quadraticCurveTo(w * 0.30, h * 0.55, w * 0.50, h * 0.80);
  ctx.quadraticCurveTo(w * 0.70, h * 1.05, w * 0.90, h * 0.75);
  ctx.stroke();
  ctx.restore();

  // Bezier control-point visualization
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = '#5b8aff';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  // Control handles for the arc
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h * 0.92);
  ctx.lineTo(w * 0.20, h * 0.30);
  ctx.moveTo(w * 0.95, h * 0.15);
  ctx.lineTo(w * 0.60, h * 0.80);
  ctx.stroke();
  ctx.setLineDash([]);
  // Control point dots
  ctx.globalAlpha = 0.50;
  ctx.fillStyle = '#5b8aff';
  for (const [px, py] of [[w*0.20, h*0.30],[w*0.60, h*0.80]]) {
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // Callouts
  _callout(ctx, w * 0.30, h * 0.38, 'path · path_pct: "M 5 92 C 20 30 60 80 95 15" · stroke_opacity: 0.22', false, w);
  _callout(ctx, w * 0.45, h * 0.68, 'stroke_linecap: "round" · Q command (quadratic)', false, w);

  // Label
  ctx.font = `bold ${Math.round(28 * scale)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('path  —  bezier curves (M L Q C Z)', w / 2, Math.round(16 * scale));
}

function _drawShapeSpecsStrip(ctx, x, y, w, h, shapeType) {
  ctx.fillStyle = '#0e0e1a';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3a3a46';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + w, y + 0.5); ctx.stroke();

  const specs = {
    image_mask: [
      'shape: "image_mask"  ·  asset: built-in name (e.g. "mountain-range", "pine-tree", "frailejón")',
      'position: zone or absolute  ·  dimensions: { width_pct, height_pct }  ·  fill_color: hex',
      'fill_opacity: 0.08–0.35  ·  flip_x / flip_y  ·  rotation_deg  ·  blend_mode',
      'Draggable. Selectable. Custom assets supported via project.custom_assets.',
    ],
    polyline: [
      'shape: "polyline"  ·  points: [ { x_pct, y_pct }, … ]  (min 2, max 20)',
      'stroke_color: hex  ·  stroke_width_px  ·  stroke_opacity: 0.08–0.35',
      'stroke_dash: "6 4" (optional)  ·  fill_color (optional, closes path)  ·  blend_mode',
      'Selectable (bounding box shown). Not draggable — geometry defined by points array.',
    ],
    path: [
      'shape: "path"  ·  path_pct: SVG d syntax, coords in 0–100% space',
      'Commands: M (moveTo)  L (lineTo)  Q (quadratic)  C (cubic bezier)  Z (close)',
      'stroke_color: hex  ·  stroke_width_px  ·  stroke_opacity: 0.08–0.35  ·  stroke_linecap: "round"',
      'Not selectable. Not draggable. fill_color optional (for closed paths).  blend_mode.',
    ],
  };

  const lines = specs[shapeType] || [];
  const pad  = 16;
  const lineH = Math.max(18, Math.round(h / (lines.length + 0.5)));
  const startY = y + Math.round((h - lines.length * lineH) / 2);

  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.fillStyle = i === lines.length - 1 ? '#606078' : '#9898b0';
    ctx.fillText(line, x + pad, startY + i * lineH + lineH / 2);
  });
}

function _drawOpacityRulesStrip(ctx, x, y, w, h) {
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3a3a46';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + w, y + 0.5); ctx.stroke();

  const pad = 16;
  const midY = y + h / 2;

  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#f5c518';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Opacity rules (all decorative shapes):', x + pad, midY - 14);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#9898b0';
  ctx.fillText(
    'Barely-there texture: 0.08–0.15  ·  Visible accent: 0.18–0.28  ·  Hard ceiling: 0.35 (renderer clamps)  ·  Max 5 decorative layers per frame',
    x + pad, midY + 10,
  );
}
```

- [ ] **Step 2: Import and call `generateShapeSamples` in `concept-builder.js`**

Find the import at the top of `frameforge/ui/concept-builder.js`:
```javascript
import { generateMockups } from './brief-mockups.js';
```
Change to:
```javascript
import { generateMockups, generateShapeSamples } from './brief-mockups.js';
```

Then find the section in `_doExportPackage()` that downloads the sample mockups:
```javascript
      // 2 — Sample design mockups
      setStatus('Generating sample designs…');
      await yieldToUI();
      const mockupBlobs = await generateMockups(platformObj);
      for (let i = 0; i < mockupBlobs.length; i++) {
        triggerDownload(mockupBlobs[i], `${slug}-sample-${i + 1}.png`);
        fileCount++;
        await new Promise((r) => setTimeout(r, 200));
      }
```

After it, add:
```javascript
      // 3 — Shape sample mockups
      setStatus('Generating shape samples…');
      await yieldToUI();
      const shapeBlobs = await generateShapeSamples();
      for (let i = 0; i < shapeBlobs.length; i++) {
        triggerDownload(shapeBlobs[i], `${slug}-shapes-${i + 1}.png`);
        fileCount++;
        await new Promise((r) => setTimeout(r, 200));
      }
```

Also renumber the existing sections 3 and onwards to 4 and 5 in comments.

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/Photos/PostersCreator/frameforge
git add ui/brief-mockups.js ui/concept-builder.js
git commit -m "feat: add shape sample mockups to AI export package (shapes-1/2/3.png)"
```

---

## Final verification

- [ ] **Load a complete decorative frame**

Create a JSON project with all three new shape types in one frame:
1. A `polyline` horizon line at `stroke_opacity: 0.20`
2. A `path` curve at `stroke_opacity: 0.25`
3. Two `image_mask` silhouettes at `fill_opacity: 0.15` and `fill_opacity: 0.18`
4. A `rectangle` shape with `blend_mode: "multiply"`

Verify all render correctly, Inspector shows correct badges for each, validator shows no spurious warnings, and the frame exports cleanly to PNG.

- [ ] **Test opacity ceiling enforcement**

Set `fill_opacity: 0.8` on an image_mask. Reload. Expected: renders at 0.35, console.warn logged. Remove the override — renders at specified value.

- [ ] **Final commit check**

```bash
git log --oneline -8
```

Expected sequence of commits (newest first):
```
docs: add decorative layer rules to AI manual (§8.14) + shape type updates
docs: add polyline, path, image_mask, blend_mode, custom_assets to shapes reference
feat: show descriptive inspector badges for polyline, path, image_mask
feat: validate polyline, path, image_mask shape types and custom_assets
fix: prevent drag on polyline and path shapes (no position anchor)
feat: add image_mask shape type with built-in asset library
feat: add path bezier shape type (M/L/Q/C/Z, pct coordinates)
feat: add polyline shape type with selection bounds
feat: add blend_mode support to all shape layers
feat: add built-in decorative asset library (14 silhouettes)
```
