# Figures & Text Dragging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 new shape types (circle, triangle, arrow, angled line, polygon/star) with fill+stroke model to the shape layer, and enable mouse-drag repositioning of text layers on the main canvas.

**Architecture:** Feature 1 extends `modules/layers.js` with new rendering branches and a `resolveShapeStyle()` helper; `modules/validator.js` gains updated shape type checking. Feature 2 is a new `modules/drag.js` that handles all hit-testing and position math, wired into `app.js` after project load.

**Tech Stack:** Vanilla ES modules, HTML5 Canvas 2D API, no build step, no test framework. Testing is done manually by loading a JSON snippet in the browser and verifying the canvas output.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `modules/layers.js` | Modify | New shape branches, fill/stroke helper, extended `computeTextBounds` |
| `modules/validator.js` | Modify | Accept all 6 shape types, per-type field warnings |
| `modules/drag.js` | **Create** | Hit-testing, position math, zone snap, RAF loop |
| `app.js` | Modify | Import and wire `initDrag` / `destroyDrag` |
| `data/ai-manual-content.js` | Modify | Document new shape types and fill/stroke model |
| `docs/shapes-reference.md` | **Create** | Complete shape reference with JSON examples |
| `docs/text-positioning.md` | **Create** | Zone diagram, drag behavior |
| `README.md` | **Create** | New project README with shapes and text-drag sections |

---

## ── FEATURE 1: FIGURES ──────────────────────────────────────────────────────

---

### Task 1: Update validator to accept new shape types

**Files:**
- Modify: `modules/validator.js:183-188`

- [ ] **Step 1: Open validator.js and locate the shape case**

In `modules/validator.js`, find lines 183–188:
```javascript
case 'shape':
  if (!layer.shape) warnings.push(`${lp} (shape): "shape" not set.`);
  else if (!['line','rectangle'].includes(layer.shape)) {
    warnings.push(`${lp} (shape): unknown shape "${layer.shape}".`);
  }
  break;
```

- [ ] **Step 2: Replace the shape case with full validation**

```javascript
case 'shape': {
  const KNOWN_SHAPES = ['line', 'rectangle', 'circle', 'triangle', 'arrow', 'polygon'];
  if (!layer.shape) {
    warnings.push(`${lp} (shape): "shape" not set.`);
  } else if (!KNOWN_SHAPES.includes(layer.shape)) {
    warnings.push(`${lp} (shape): unknown shape "${layer.shape}". Known: ${KNOWN_SHAPES.join(', ')}.`);
  } else {
    if (layer.shape === 'triangle') {
      const validDirs = ['up', 'down', 'left', 'right'];
      if (layer.direction && !validDirs.includes(layer.direction)) {
        warnings.push(`${lp} (shape): triangle direction "${layer.direction}" unknown. Use: up/down/left/right.`);
      }
    }
    if (layer.shape === 'arrow') {
      const validHeads = ['end', 'start', 'both'];
      if (layer.arrowhead && !validHeads.includes(layer.arrowhead)) {
        warnings.push(`${lp} (shape): arrow arrowhead "${layer.arrowhead}" unknown. Use: end/start/both.`);
      }
    }
    if (layer.shape === 'polygon') {
      if (layer.sides != null && (layer.sides < 3 || layer.sides > 12)) {
        warnings.push(`${lp} (shape): polygon sides=${layer.sides} out of range (3–12).`);
      }
    }
    if (layer.fill_opacity != null && (layer.fill_opacity < 0 || layer.fill_opacity > 1)) {
      warnings.push(`${lp} (shape): fill_opacity outside 0–1; will be clamped.`);
    }
    if (layer.stroke_opacity != null && (layer.stroke_opacity < 0 || layer.stroke_opacity > 1)) {
      warnings.push(`${lp} (shape): stroke_opacity outside 0–1; will be clamped.`);
    }
  }
  break;
}
```

- [ ] **Step 3: Verify in browser**

Load this JSON into FrameForge (drag the file onto the drop zone). The validator should produce zero errors and zero warnings:

```json
{
  "project": { "id": "val-test", "title": "Validator Test", "version": "1", "created": "2026-03-26" },
  "export": { "target": "test", "width_px": 1080, "height_px": 1350, "dpi": 72, "scale_factor": 1, "format": "png", "filename_pattern": "{frame_index}" },
  "globals": { "background_color": "#1a1a2e", "safe_zone_pct": 5, "font_defaults": { "family": "Inter", "weight": 400, "color": "#FFFFFF", "opacity": 1.0 } },
  "frames": [{
    "id": "f1", "image_src": "test.jpg",
    "layers": [
      { "type": "shape", "id": "s1", "shape": "circle", "position": { "zone": "middle-center" }, "dimensions": { "width_pct": 20, "height_pct": 20 }, "fill_color": "#FFFFFF", "fill_opacity": 0.3 },
      { "type": "shape", "id": "s2", "shape": "triangle", "direction": "up", "position": { "zone": "top-left" }, "dimensions": { "width_pct": 10, "height_pct": 8 }, "fill_color": "#FF0000", "fill_opacity": 1.0 },
      { "type": "shape", "id": "s3", "shape": "arrow", "angle_deg": 45, "arrowhead": "end", "position": { "x_pct": 20, "y_pct": 50 }, "dimensions": { "width_pct": 15 }, "stroke_color": "#FFFFFF", "stroke_width_px": 3 },
      { "type": "shape", "id": "s4", "shape": "polygon", "sides": 6, "star": false, "position": { "zone": "bottom-right", "offset_x_pct": -5, "offset_y_pct": -5 }, "dimensions": { "width_pct": 12 }, "stroke_color": "#FFD700", "stroke_width_px": 2 }
    ]
  }]
}
```

Expected: Project loads successfully. Inspector shows 0 errors, 0 warnings (the "image not uploaded" warning is normal for `image_src`). No console errors.

- [ ] **Step 4: Commit**

```bash
git add modules/validator.js
git commit -m "feat: extend shape validator to accept circle, triangle, arrow, polygon"
```

---

### Task 2: Add fill/stroke style helper to layers.js

**Files:**
- Modify: `modules/layers.js` (add helper before `renderShapeLayer`)

This helper is used by every new shape renderer. Define it once here.

- [ ] **Step 1: Add `resolveShapeStyle` helper**

In `modules/layers.js`, add the following function immediately before the `// ── Shape layer ──` comment (around line 339):

```javascript
// ── Shape style helpers ───────────────────────────────────────────────────

/**
 * Resolve fill and stroke style from a shape layer.
 * Supports new fill_color/stroke_color model with fallback to legacy color/opacity.
 */
function resolveShapeStyle(layer) {
  // Fill
  const fillColor   = layer.fill_color ?? layer.color ?? null;
  const fillOpacity = clamp(layer.fill_opacity ?? (layer.fill_color ? 1.0 : (layer.color ? (layer.opacity ?? 1.0) : 0)), 0, 1);

  // Stroke
  const strokeColor   = layer.stroke_color ?? null;
  const strokeOpacity = clamp(layer.stroke_opacity ?? 1.0, 0, 1);
  const strokeWidth   = layer.stroke_width_px ?? 1;

  return { fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth };
}

/**
 * Apply fill and stroke to the current canvas path.
 * Call after ctx.beginPath() + path commands, before ctx.restore().
 */
function applyShapeStyle(ctx, style) {
  if (style.fillColor) {
    const r = parseInt(style.fillColor.slice(1, 3), 16);
    const g = parseInt(style.fillColor.slice(3, 5), 16);
    const b = parseInt(style.fillColor.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r},${g},${b},${style.fillOpacity})`;
    ctx.fill();
  }
  if (style.strokeColor) {
    const r = parseInt(style.strokeColor.slice(1, 3), 16);
    const g = parseInt(style.strokeColor.slice(3, 5), 16);
    const b = parseInt(style.strokeColor.slice(5, 7), 16);
    ctx.strokeStyle = `rgba(${r},${g},${b},${style.strokeOpacity})`;
    ctx.lineWidth   = style.strokeWidth;
    ctx.stroke();
  }
}
```

- [ ] **Step 2: Verify no browser errors**

Reload the browser. The page should load without JS errors. No visual change expected yet.

- [ ] **Step 3: Commit**

```bash
git add modules/layers.js
git commit -m "feat: add resolveShapeStyle and applyShapeStyle helpers to layers.js"
```

---

### Task 3: Extend `computeTextBounds` to return left/right

**Files:**
- Modify: `modules/layers.js:185-204`

This is needed for text drag hit-testing in Feature 2. Do it now so the function signature is stable.

- [ ] **Step 1: Update `computeTextBounds` return value**

Replace the existing `computeTextBounds` function (lines 185–205) with:

```javascript
/**
 * Compute the rendered bounding box of a text layer without drawing.
 * Returns { top, bottom, left, right } in canvas pixels, or null if not computable.
 * Used by the renderer for pin_above shape positioning, and by drag.js for hit-testing.
 */
export function computeTextBounds(ctx, layer, w, h, project) {
  const font   = project.resolveFont(layer.font);
  const sizePx = (font.size_pct / 100) * h;
  const lineH  = font.line_height ?? 1.2;
  const maxW   = layer.max_width_pct != null ? px(layer.max_width_pct, w) : w;
  const pos    = resolvePosition(layer.position, w, h);
  const align  = layer.align || 'left';

  ctx.save();
  ctx.font = buildFontString(font, sizePx);
  const lines = wrapText(ctx, layer.content ?? '', maxW);
  // Measure the actual widest rendered line
  const measuredWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
  ctx.restore();

  const linePx = lineH * sizePx;
  const totalH = lines.length * linePx;
  const isBottomZone = layer.position?.mode !== 'absolute' &&
                       (layer.position?.zone ?? '').startsWith('bottom');

  const top    = isBottomZone ? pos.y - totalH : pos.y;
  const bottom = isBottomZone ? pos.y          : pos.y + totalH;

  // Compute left edge based on text alignment
  let left;
  if (align === 'center') {
    left = pos.x - measuredWidth / 2;
  } else if (align === 'right') {
    left = pos.x - measuredWidth;
  } else {
    left = pos.x;
  }
  const right = left + measuredWidth;

  return { top, bottom, left, right };
}
```

- [ ] **Step 2: Verify in browser**

Load any project. The canvas should render identically to before (the `pin_above` feature only uses `top` and `bottom`, which are unchanged). Check that existing shape layers with `pin_above` still position correctly.

- [ ] **Step 3: Commit**

```bash
git add modules/layers.js
git commit -m "feat: extend computeTextBounds to return left/right for drag hit-testing"
```

---

### Task 4: Extend `line` shape with `angle_deg` rotation

**Files:**
- Modify: `modules/layers.js:372-374` (the `line` branch of `renderShapeLayer`)

- [ ] **Step 1: Replace the line rendering branch**

In `renderShapeLayer`, find and replace the `line` branch:

```javascript
// BEFORE:
if (shape === 'line') {
  // A "line" is a thin rectangle
  ctx.fillRect(posX, posY - height / 2, width, height);
}
```

Replace with:

```javascript
if (shape === 'line') {
  const angleDeg = layer.angle_deg ?? 0;
  if (angleDeg === 0) {
    // Fast path: horizontal line (backwards compatible)
    ctx.beginPath();
    ctx.rect(posX, posY - height / 2, width, height);
    applyShapeStyle(ctx, resolveShapeStyle(layer));
  } else {
    // Rotated line: draw centered at (posX + width/2, posY), rotated
    const cx = posX + width / 2;
    const cy = posY;
    const rad = (angleDeg * Math.PI) / 180;
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.beginPath();
    ctx.rect(-width / 2, -height / 2, width, height);
    applyShapeStyle(ctx, resolveShapeStyle(layer));
    ctx.rotate(-rad);
    ctx.translate(-cx, -cy);
  }
}
```

- [ ] **Step 2: Update the rectangle branch to use applyShapeStyle**

While in this function, also update the `rectangle` branch for consistency (it currently uses the old `ctx.fillStyle = color` pattern):

```javascript
// BEFORE:
} else if (shape === 'rectangle') {
  const radius = layer.border_radius_px ?? 0;
  if (radius > 0 && ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(posX, posY, width, height, radius);
    ctx.fill();
  } else {
    ctx.fillRect(posX, posY, width, height);
  }
}
```

Replace with:

```javascript
} else if (shape === 'rectangle') {
  const radius = layer.border_radius_px ?? 0;
  ctx.beginPath();
  if (radius > 0 && ctx.roundRect) {
    ctx.roundRect(posX, posY, width, height, radius);
  } else {
    ctx.rect(posX, posY, width, height);
  }
  applyShapeStyle(ctx, resolveShapeStyle(layer));
}
```

- [ ] **Step 3: Remove the old `ctx.fillStyle = color` and `ctx.globalAlpha = opacity` from `renderShapeLayer`**

The top of `renderShapeLayer` currently sets:
```javascript
ctx.globalAlpha = opacity;
ctx.fillStyle   = color;
```

These are now handled inside `applyShapeStyle`. Remove those two lines (keep `ctx.save()` and `ctx.restore()`). The `color` and `opacity` variables are still used for backwards-compat — they are now consumed inside `resolveShapeStyle`.

The updated function header should look like:

```javascript
export function renderShapeLayer(ctx, layer, w, h, _project, layerBounds = new Map()) {
  const shape   = layer.shape || 'rectangle';
  const dims    = layer.dimensions || {};
  const width   = px(dims.width_pct ?? 10, w);
  const height  = dims.height_pct != null
    ? py(dims.height_pct, h)
    : (dims.height_px ?? 2);

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

  ctx.save();

  if (shape === 'line') {
    // ... (updated above)
  } else if (shape === 'rectangle') {
    // ... (updated above)
  }

  ctx.restore();
}
```

- [ ] **Step 4: Test in browser**

Load the validator test JSON from Task 1. Existing `line` and `rectangle` shapes should still render correctly. Now test a rotated line by loading this minimal JSON:

```json
{
  "project": { "id": "line-test", "title": "Line Test", "version": "1", "created": "2026-03-26" },
  "export": { "target": "test", "width_px": 1080, "height_px": 1350, "dpi": 72, "scale_factor": 1, "format": "png", "filename_pattern": "{frame_index}" },
  "globals": { "background_color": "#1a1a2e", "safe_zone_pct": 5, "font_defaults": { "family": "Inter", "weight": 400, "color": "#FFFFFF", "opacity": 1.0 } },
  "frames": [{
    "id": "f1", "image_src": "test.jpg",
    "layers": [
      { "type": "shape", "id": "h-line", "shape": "line", "position": { "x_pct": 10, "y_pct": 30 }, "dimensions": { "width_pct": 30, "height_px": 3 }, "fill_color": "#FFFFFF", "fill_opacity": 1.0 },
      { "type": "shape", "id": "d-line", "shape": "line", "angle_deg": 45, "position": { "x_pct": 10, "y_pct": 50 }, "dimensions": { "width_pct": 30, "height_px": 3 }, "fill_color": "#FFD700", "fill_opacity": 1.0 },
      { "type": "shape", "id": "rect", "shape": "rectangle", "position": { "x_pct": 10, "y_pct": 60 }, "dimensions": { "width_pct": 20, "height_pct": 8 }, "fill_color": "#FF0000", "fill_opacity": 0.5, "stroke_color": "#FFFFFF", "stroke_width_px": 3, "stroke_opacity": 1.0 }
    ]
  }]
}
```

Expected:
- White horizontal line at ~30% down
- Gold diagonal line at ~50% down, angled at 45°
- Red semi-transparent rectangle with white border at ~60% down

- [ ] **Step 5: Commit**

```bash
git add modules/layers.js
git commit -m "feat: extend line shape with angle_deg rotation, rectangle with fill+stroke model"
```

---

### Task 5: Add `circle` shape renderer

**Files:**
- Modify: `modules/layers.js` (inside `renderShapeLayer`, after rectangle branch)

- [ ] **Step 1: Add circle branch inside `renderShapeLayer`**

Add after the `rectangle` branch:

```javascript
} else if (shape === 'circle') {
  const rx = width / 2;
  const ry = dims.height_pct != null ? height / 2 : rx; // ellipse if height differs
  const cx = posX + rx;
  const cy = posY + ry;
  ctx.beginPath();
  if (rx === ry) {
    ctx.arc(cx, cy, rx, 0, Math.PI * 2);
  } else {
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  }
  applyShapeStyle(ctx, resolveShapeStyle(layer));
}
```

- [ ] **Step 2: Test in browser**

Load this JSON:

```json
{
  "project": { "id": "circle-test", "title": "Circle Test", "version": "1", "created": "2026-03-26" },
  "export": { "target": "test", "width_px": 1080, "height_px": 1350, "dpi": 72, "scale_factor": 1, "format": "png", "filename_pattern": "{frame_index}" },
  "globals": { "background_color": "#1a1a2e", "safe_zone_pct": 5, "font_defaults": { "family": "Inter", "weight": 400, "color": "#FFFFFF", "opacity": 1.0 } },
  "frames": [{
    "id": "f1", "image_src": "test.jpg",
    "layers": [
      { "type": "shape", "id": "circle1", "shape": "circle", "position": { "zone": "middle-center" }, "dimensions": { "width_pct": 30, "height_pct": 30 }, "fill_color": "#FFFFFF", "fill_opacity": 0.15, "stroke_color": "#FFFFFF", "stroke_width_px": 3, "stroke_opacity": 0.8 },
      { "type": "shape", "id": "ellipse1", "shape": "circle", "position": { "x_pct": 10, "y_pct": 10 }, "dimensions": { "width_pct": 25, "height_pct": 12 }, "stroke_color": "#FFD700", "stroke_width_px": 2, "stroke_opacity": 1.0 }
    ]
  }]
}
```

Expected:
- Semi-transparent white circle with outline in center
- Gold ellipse in top-left area

- [ ] **Step 3: Commit**

```bash
git add modules/layers.js
git commit -m "feat: add circle/ellipse shape renderer"
```

---

### Task 6: Add `triangle` shape renderer

**Files:**
- Modify: `modules/layers.js` (inside `renderShapeLayer`, after circle branch)

- [ ] **Step 1: Add triangle branch**

```javascript
} else if (shape === 'triangle') {
  const direction = layer.direction ?? 'up';
  const hw = width / 2;
  const hh = height / 2;
  // posX/posY is top-left of bounding box; compute center
  const cx = posX + hw;
  const cy = posY + hh;

  ctx.beginPath();
  if (direction === 'up') {
    ctx.moveTo(cx,       cy - hh); // apex top
    ctx.lineTo(cx + hw,  cy + hh); // bottom-right
    ctx.lineTo(cx - hw,  cy + hh); // bottom-left
  } else if (direction === 'down') {
    ctx.moveTo(cx,       cy + hh); // apex bottom
    ctx.lineTo(cx + hw,  cy - hh); // top-right
    ctx.lineTo(cx - hw,  cy - hh); // top-left
  } else if (direction === 'left') {
    ctx.moveTo(cx - hw,  cy);       // apex left
    ctx.lineTo(cx + hw,  cy - hh); // top-right
    ctx.lineTo(cx + hw,  cy + hh); // bottom-right
  } else { // right
    ctx.moveTo(cx + hw,  cy);       // apex right
    ctx.lineTo(cx - hw,  cy - hh); // top-left
    ctx.lineTo(cx - hw,  cy + hh); // bottom-left
  }
  ctx.closePath();
  applyShapeStyle(ctx, resolveShapeStyle(layer));
}
```

- [ ] **Step 2: Test in browser**

Load this JSON:

```json
{
  "project": { "id": "tri-test", "title": "Triangle Test", "version": "1", "created": "2026-03-26" },
  "export": { "target": "test", "width_px": 1080, "height_px": 1350, "dpi": 72, "scale_factor": 1, "format": "png", "filename_pattern": "{frame_index}" },
  "globals": { "background_color": "#1a1a2e", "safe_zone_pct": 5, "font_defaults": { "family": "Inter", "weight": 400, "color": "#FFFFFF", "opacity": 1.0 } },
  "frames": [{
    "id": "f1", "image_src": "test.jpg",
    "layers": [
      { "type": "shape", "id": "t-up",    "shape": "triangle", "direction": "up",    "position": { "x_pct": 10, "y_pct": 20 }, "dimensions": { "width_pct": 12, "height_pct": 10 }, "fill_color": "#FF4444", "fill_opacity": 1.0 },
      { "type": "shape", "id": "t-down",  "shape": "triangle", "direction": "down",  "position": { "x_pct": 30, "y_pct": 20 }, "dimensions": { "width_pct": 12, "height_pct": 10 }, "fill_color": "#44FF44", "fill_opacity": 1.0 },
      { "type": "shape", "id": "t-left",  "shape": "triangle", "direction": "left",  "position": { "x_pct": 50, "y_pct": 20 }, "dimensions": { "width_pct": 12, "height_pct": 10 }, "fill_color": "#4444FF", "fill_opacity": 1.0 },
      { "type": "shape", "id": "t-right", "shape": "triangle", "direction": "right", "position": { "x_pct": 70, "y_pct": 20 }, "dimensions": { "width_pct": 12, "height_pct": 10 }, "fill_color": "#FFD700", "fill_opacity": 1.0 }
    ]
  }]
}
```

Expected: Four triangles pointing up, down, left, right in a row.

- [ ] **Step 3: Commit**

```bash
git add modules/layers.js
git commit -m "feat: add triangle shape renderer with direction support"
```

---

### Task 7: Add `arrow` shape renderer

**Files:**
- Modify: `modules/layers.js` (inside `renderShapeLayer`, after triangle branch)

- [ ] **Step 1: Add arrow branch**

```javascript
} else if (shape === 'arrow') {
  const angleDeg   = layer.angle_deg ?? 0;
  const arrowhead  = layer.arrowhead ?? 'end';
  const lineThick  = height; // height_pct/height_px used as line thickness
  const headSize   = Math.max(lineThick * 4, px(1.5, w)); // arrowhead: 4× line thickness

  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Line runs from posX,posY for length=width in direction of angle
  // Shorten line ends where arrowheads sit
  const headLen = arrowhead === 'both' ? headSize : (arrowhead === 'end' ? headSize : 0);
  const tailLen = arrowhead === 'both' ? headSize : (arrowhead === 'start' ? headSize : 0);

  const x0 = posX + tailLen * cos;
  const y0 = posY + tailLen * sin;
  const x1 = posX + (width - headLen) * cos;
  const y1 = posY + (width - headLen) * sin;

  const style = resolveShapeStyle(layer);
  // Arrow always strokes (use stroke_color; fall back to fill_color for compat)
  const arrowStyle = {
    ...style,
    strokeColor: style.strokeColor ?? style.fillColor,
    strokeOpacity: style.strokeColor ? style.strokeOpacity : style.fillOpacity,
    strokeWidth: style.strokeWidth,
    fillColor: null, // shaft is a stroke, not fill
  };

  // Draw shaft
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineWidth   = lineThick;
  if (arrowStyle.strokeColor) {
    const r = parseInt(arrowStyle.strokeColor.slice(1, 3), 16);
    const g = parseInt(arrowStyle.strokeColor.slice(3, 5), 16);
    const b = parseInt(arrowStyle.strokeColor.slice(5, 7), 16);
    ctx.strokeStyle = `rgba(${r},${g},${b},${arrowStyle.strokeOpacity})`;
    ctx.stroke();
  }

  // Helper: draw filled arrowhead triangle at tip pointing in direction (dx,dy)
  function drawHead(tipX, tipY, dx, dy) {
    const perpX = -dy;
    const perpY =  dx;
    ctx.beginPath();
    ctx.moveTo(tipX,                         tipY);
    ctx.lineTo(tipX - dx * headSize + perpX * headSize * 0.4,
               tipY - dy * headSize + perpY * headSize * 0.4);
    ctx.lineTo(tipX - dx * headSize - perpX * headSize * 0.4,
               tipY - dy * headSize - perpY * headSize * 0.4);
    ctx.closePath();
    if (arrowStyle.strokeColor) {
      const r = parseInt(arrowStyle.strokeColor.slice(1, 3), 16);
      const g = parseInt(arrowStyle.strokeColor.slice(3, 5), 16);
      const b = parseInt(arrowStyle.strokeColor.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},${arrowStyle.strokeOpacity})`;
      ctx.fill();
    }
  }

  if (arrowhead === 'end' || arrowhead === 'both') {
    drawHead(posX + width * cos, posY + width * sin, cos, sin);
  }
  if (arrowhead === 'start' || arrowhead === 'both') {
    drawHead(posX, posY, -cos, -sin);
  }
}
```

- [ ] **Step 2: Test in browser**

Load this JSON:

```json
{
  "project": { "id": "arrow-test", "title": "Arrow Test", "version": "1", "created": "2026-03-26" },
  "export": { "target": "test", "width_px": 1080, "height_px": 1350, "dpi": 72, "scale_factor": 1, "format": "png", "filename_pattern": "{frame_index}" },
  "globals": { "background_color": "#1a1a2e", "safe_zone_pct": 5, "font_defaults": { "family": "Inter", "weight": 400, "color": "#FFFFFF", "opacity": 1.0 } },
  "frames": [{
    "id": "f1", "image_src": "test.jpg",
    "layers": [
      { "type": "shape", "id": "a1", "shape": "arrow", "angle_deg": 0,   "arrowhead": "end",   "position": { "x_pct": 10, "y_pct": 30 }, "dimensions": { "width_pct": 30, "height_px": 4 }, "stroke_color": "#FFFFFF", "stroke_width_px": 4 },
      { "type": "shape", "id": "a2", "shape": "arrow", "angle_deg": 45,  "arrowhead": "both",  "position": { "x_pct": 10, "y_pct": 50 }, "dimensions": { "width_pct": 25, "height_px": 3 }, "stroke_color": "#FFD700", "stroke_width_px": 3 },
      { "type": "shape", "id": "a3", "shape": "arrow", "angle_deg": 270, "arrowhead": "start", "position": { "x_pct": 60, "y_pct": 40 }, "dimensions": { "width_pct": 15, "height_px": 3 }, "stroke_color": "#FF4444", "stroke_width_px": 3 }
    ]
  }]
}
```

Expected:
- White horizontal arrow pointing right
- Gold diagonal arrow with heads at both ends
- Red arrow pointing upward (270°) with head at start

- [ ] **Step 3: Commit**

```bash
git add modules/layers.js
git commit -m "feat: add arrow shape renderer with angle and arrowhead support"
```

---

### Task 8: Add `polygon` shape renderer

**Files:**
- Modify: `modules/layers.js` (inside `renderShapeLayer`, after arrow branch)

- [ ] **Step 1: Add polygon branch**

```javascript
} else if (shape === 'polygon') {
  const sides       = Math.max(3, Math.min(12, layer.sides ?? 6));
  const isStar      = layer.star ?? false;
  const rotDeg      = layer.rotation_deg ?? 0;
  const innerRatio  = clamp((layer.inner_radius_pct ?? 50) / 100, 0.01, 0.99);

  const outerR = width / 2;
  const innerR = outerR * innerRatio;
  const cx     = posX + outerR;
  const cy     = posY + outerR; // polygon uses width for both dimensions (square bounding box)
  const rotRad = (rotDeg * Math.PI) / 180;
  const totalPoints = isStar ? sides * 2 : sides;

  ctx.beginPath();
  for (let i = 0; i < totalPoints; i++) {
    const angle = rotRad + (i * Math.PI * 2) / totalPoints - Math.PI / 2;
    const r     = isStar ? (i % 2 === 0 ? outerR : innerR) : outerR;
    const vx    = cx + r * Math.cos(angle);
    const vy    = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(vx, vy);
    else         ctx.lineTo(vx, vy);
  }
  ctx.closePath();
  applyShapeStyle(ctx, resolveShapeStyle(layer));
}
```

- [ ] **Step 2: Test in browser**

Load this JSON:

```json
{
  "project": { "id": "poly-test", "title": "Polygon Test", "version": "1", "created": "2026-03-26" },
  "export": { "target": "test", "width_px": 1080, "height_px": 1350, "dpi": 72, "scale_factor": 1, "format": "png", "filename_pattern": "{frame_index}" },
  "globals": { "background_color": "#1a1a2e", "safe_zone_pct": 5, "font_defaults": { "family": "Inter", "weight": 400, "color": "#FFFFFF", "opacity": 1.0 } },
  "frames": [{
    "id": "f1", "image_src": "test.jpg",
    "layers": [
      { "type": "shape", "id": "hex",  "shape": "polygon", "sides": 6, "star": false, "rotation_deg": 0,   "position": { "x_pct": 5,  "y_pct": 20 }, "dimensions": { "width_pct": 20 }, "stroke_color": "#FFFFFF", "stroke_width_px": 2 },
      { "type": "shape", "id": "pent", "shape": "polygon", "sides": 5, "star": false, "rotation_deg": 0,   "position": { "x_pct": 35, "y_pct": 20 }, "dimensions": { "width_pct": 20 }, "fill_color": "#4488FF", "fill_opacity": 0.8 },
      { "type": "shape", "id": "star", "shape": "polygon", "sides": 5, "star": true,  "rotation_deg": -18, "inner_radius_pct": 40, "position": { "x_pct": 65, "y_pct": 20 }, "dimensions": { "width_pct": 20 }, "fill_color": "#FFD700", "fill_opacity": 1.0 }
    ]
  }]
}
```

Expected:
- White-outlined hexagon
- Blue-filled pentagon
- Gold star (5-pointed)

- [ ] **Step 3: Commit**

```bash
git add modules/layers.js
git commit -m "feat: add polygon and star shape renderers"
```

---

## ── FEATURE 2: TEXT DRAGGING ────────────────────────────────────────────────

---

### Task 9: Create `modules/drag.js`

**Files:**
- Create: `modules/drag.js`

- [ ] **Step 1: Create the file with full drag logic**

Create `modules/drag.js` with the following complete content:

```javascript
/**
 * drag.js — Text layer drag-to-reposition for FrameForge.
 *
 * Exports:
 *   initDrag(canvas, project, getFrameIndex, onRender, onComplete)
 *   destroyDrag(canvas)
 */

import { computeTextBounds } from './layers.js';
import { buildFontString }   from './fonts.js';

// ── Zone anchor table (matches layers.js ZONE_ANCHORS) ────────────────────

const ZONE_ANCHORS = {
  'top-left':      [0,   0  ],
  'top-center':    [50,  0  ],
  'top-right':     [100, 0  ],
  'middle-left':   [0,   50 ],
  'middle-center': [50,  50 ],
  'middle-right':  [100, 50 ],
  'bottom-left':   [0,   100],
  'bottom-center': [50,  100],
  'bottom-right':  [100, 100],
};

const SNAP_THRESHOLD_PCT = 5; // snap when within 5% of canvas size

// ── Canvas coordinate helper ──────────────────────────────────────────────

function canvasPct(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width)  * 100,
    y: ((event.clientY - rect.top)  / rect.height) * 100,
  };
}

// ── Hit testing ───────────────────────────────────────────────────────────

/**
 * Find the topmost text layer at the given canvas percentage coordinates.
 * Returns the layer object or null.
 */
function hitTestTextLayer(pct, frame, canvas, project) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const layers = frame.layers ?? [];

  // Iterate in reverse render order (last = top-most)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer.type !== 'text') continue;

    const bounds = computeTextBounds(ctx, layer, w, h, project);
    if (!bounds) continue;

    // Convert pixel bounds to percentages
    const topPct    = (bounds.top    / h) * 100;
    const bottomPct = (bounds.bottom / h) * 100;
    const leftPct   = (bounds.left   / w) * 100;
    const rightPct  = (bounds.right  / w) * 100;

    // Add a small padding to make small text easier to grab (2% of canvas)
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

// ── Zone snap ─────────────────────────────────────────────────────────────

/**
 * Given current absolute position (absPct.x, absPct.y),
 * find the nearest zone anchor within snap threshold.
 * Returns zone name string or null.
 */
function findSnapZone(absPct) {
  let closest = null;
  let minDist = Infinity;

  for (const [zone, [ax, ay]] of Object.entries(ZONE_ANCHORS)) {
    const dx = absPct.x - ax;
    const dy = absPct.y - ay;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = zone;
    }
  }

  return minDist <= SNAP_THRESHOLD_PCT ? closest : null;
}

/**
 * Compute the absolute canvas position (as %) of a layer's position anchor.
 * For zone mode: zone anchor + offsets.
 * For absolute mode: x_pct, y_pct.
 */
function getAbsolutePct(pos) {
  if (!pos || pos.mode === 'absolute' || pos.x_pct != null) {
    return { x: pos?.x_pct ?? 0, y: pos?.y_pct ?? 0 };
  }
  const [ax, ay] = ZONE_ANCHORS[pos.zone ?? 'top-left'] ?? [0, 0];
  return {
    x: ax + (pos.offset_x_pct ?? 0),
    y: ay + (pos.offset_y_pct ?? 0),
  };
}

// ── Main drag logic ───────────────────────────────────────────────────────

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Project} project
 * @param {() => number} getFrameIndex — returns current active frame index
 * @param {() => void} onRender — called during drag to re-render the frame
 * @param {(frameIndex: number) => void} onComplete — called on mouseup to update thumbnail
 */
export function initDrag(canvas, project, getFrameIndex, onRender, onComplete) {
  const state = {
    active:         false,
    layerId:        null,
    frameIndex:     null,
    startMousePct:  null,
    startPos:       null,   // deep clone of layer.position at drag start
    mode:           null,   // 'absolute' | 'zone'
    rafPending:     false,
  };

  // ── Hover cursor feedback ────────────────────────────────────────────────

  function onMouseMove(e) {
    if (state.active) {
      handleDrag(e);
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

  // ── Mousedown — start drag ───────────────────────────────────────────────

  function onMouseDown(e) {
    if (e.button !== 0) return; // left button only
    if (!project.isLoaded) return;

    const frameIndex = getFrameIndex();
    const frame = project.data?.frames?.[frameIndex];
    if (!frame) return;

    const pct = canvasPct(e, canvas);
    const layer = hitTestTextLayer(pct, frame, canvas, project);
    if (!layer) return;

    e.preventDefault();
    canvas.style.cursor = 'grabbing';

    const pos = layer.position ?? {};
    const isAbsolute = pos.mode === 'absolute' || pos.x_pct != null;

    state.active        = true;
    state.layerId       = layer.id;
    state.frameIndex    = frameIndex;
    state.startMousePct = pct;
    state.startPos      = JSON.parse(JSON.stringify(pos)); // deep clone
    state.mode          = isAbsolute ? 'absolute' : 'zone';
  }

  // ── Mousemove — update position ──────────────────────────────────────────

  function handleDrag(e) {
    if (!state.active) return;

    const currentPct = canvasPct(e, canvas);
    const dx = currentPct.x - state.startMousePct.x;
    const dy = currentPct.y - state.startMousePct.y;

    const frame = project.data?.frames?.[state.frameIndex];
    if (!frame) return;

    const layer = frame.layers?.find(l => l.id === state.layerId);
    if (!layer) return;

    if (state.mode === 'absolute') {
      const newX = Math.max(0, Math.min(100, (state.startPos.x_pct ?? 0) + dx));
      const newY = Math.max(0, Math.min(100, (state.startPos.y_pct ?? 0) + dy));

      // Check snap
      const snapZone = findSnapZone({ x: newX, y: newY });
      if (snapZone) {
        const [ax, ay] = ZONE_ANCHORS[snapZone];
        layer.position = { zone: snapZone, offset_x_pct: 0, offset_y_pct: 0 };
        canvas.style.cursor = 'crosshair';
        state.mode = 'zone'; // switched to zone
      } else {
        layer.position = { ...state.startPos, x_pct: newX, y_pct: newY };
        canvas.style.cursor = 'grabbing';
      }
    } else {
      // zone mode: update offsets
      const newOffsetX = (state.startPos.offset_x_pct ?? 0) + dx;
      const newOffsetY = (state.startPos.offset_y_pct ?? 0) + dy;

      // Compute the absolute position to check for zone snap
      const currentZone = layer.position?.zone ?? state.startPos.zone ?? 'top-left';
      const [ax, ay] = ZONE_ANCHORS[currentZone] ?? [0, 0];
      const absX = ax + newOffsetX;
      const absY = ay + newOffsetY;

      const snapZone = findSnapZone({ x: absX, y: absY });
      if (snapZone && snapZone !== currentZone) {
        layer.position = { zone: snapZone, offset_x_pct: 0, offset_y_pct: 0 };
        canvas.style.cursor = 'crosshair';
      } else {
        layer.position = {
          ...(layer.position ?? {}),
          zone: currentZone,
          offset_x_pct: newOffsetX,
          offset_y_pct: newOffsetY,
        };
        canvas.style.cursor = 'grabbing';
      }
    }

    // Trigger re-render via RAF (skip if one is already queued)
    if (!state.rafPending) {
      state.rafPending = true;
      requestAnimationFrame(() => {
        state.rafPending = false;
        onRender();
      });
    }
  }

  // ── Mouseup — commit position ────────────────────────────────────────────

  function onMouseUp(e) {
    if (!state.active) return;

    state.active     = false;
    canvas.style.cursor = '';

    // Save project to localStorage
    project.save();

    // Notify app to update filmstrip thumbnail
    onComplete(state.frameIndex);

    state.layerId    = null;
    state.frameIndex = null;
    state.startPos   = null;
    state.mode       = null;
  }

  // ── Wire events ───────────────────────────────────────────────────────────

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup',  onMouseUp); // window to catch mouseup outside canvas

  // Store handlers on canvas element for cleanup
  canvas._dragHandlers = { onMouseDown, onMouseMove, onMouseUp };
}

/**
 * Remove drag event listeners from a canvas.
 */
export function destroyDrag(canvas) {
  const h = canvas._dragHandlers;
  if (!h) return;
  canvas.removeEventListener('mousedown', h.onMouseDown);
  canvas.removeEventListener('mousemove', h.onMouseMove);
  window.removeEventListener('mouseup',   h.onMouseUp);
  delete canvas._dragHandlers;
}
```

- [ ] **Step 2: Verify no import errors**

Open browser dev tools console. Load a project JSON. Verify no import errors or console errors for drag.js. (Drag won't work yet — wiring happens in Task 10.)

- [ ] **Step 3: Commit**

```bash
git add modules/drag.js
git commit -m "feat: add drag.js module for text layer repositioning"
```

---

### Task 10: Wire drag into `app.js`

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add import at top of app.js**

After the existing imports (around line 23), add:

```javascript
import { initDrag, destroyDrag } from './modules/drag.js';
```

- [ ] **Step 2: Add drag initialization inside `loadProjectData`**

In `loadProjectData`, after the line `renderCurrentFrame();` (around line 280) and before `inspector.update(...)`, add:

```javascript
// Initialize text drag on main canvas
destroyDrag(mainCanvas); // clear any previous listener set
initDrag(
  mainCanvas,
  project,
  () => project.activeFrameIndex,
  () => renderCurrentFrame(),
  (frameIndex) => {
    filmstrip.renderOne(frameIndex, project);
  },
);
```

- [ ] **Step 3: Test in browser**

1. Load any project JSON that has a `text` layer
2. Hover over a text element on the canvas — cursor should change to `grab`
3. Click and drag the text — it should move
4. Release — the text should stay in its new position
5. Reload the page — the text position should still be at the dragged location (persisted to localStorage)

If no existing project has a text layer, use this test JSON:

```json
{
  "project": { "id": "drag-test", "title": "Drag Test", "version": "1", "created": "2026-03-26" },
  "export": { "target": "test", "width_px": 1080, "height_px": 1350, "dpi": 72, "scale_factor": 1, "format": "png", "filename_pattern": "{frame_index}" },
  "globals": { "background_color": "#1a1a2e", "safe_zone_pct": 5, "font_defaults": { "family": "Inter", "weight": 700, "color": "#FFFFFF", "opacity": 1.0 } },
  "frames": [{
    "id": "f1", "image_src": "test.jpg",
    "layers": [
      { "type": "text", "id": "heading", "content": "DRAG ME", "font": { "size_pct": 8, "color": "#FFFFFF", "weight": 700 }, "position": { "zone": "middle-center" }, "align": "center", "max_width_pct": 80 },
      { "type": "text", "id": "sub",     "content": "drag this text too", "font": { "size_pct": 4, "color": "#AAAAAA", "weight": 400 }, "position": { "zone": "bottom-center", "offset_y_pct": -8 }, "align": "center", "max_width_pct": 70 }
    ]
  }]
}
```

Expected behaviors:
- `DRAG ME` is grabbable in the center and can be moved
- `drag this text too` is grabbable near the bottom
- Dragging near a zone anchor causes snap (cursor becomes crosshair briefly)
- After drag+release, filmstrip thumbnail updates

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: wire text drag into app.js after project load"
```

---

## ── DOCUMENTATION ────────────────────────────────────────────────────────────

---

### Task 11: Write `docs/shapes-reference.md`

**Files:**
- Create: `docs/shapes-reference.md`

- [ ] **Step 1: Create the reference doc**

Create `docs/shapes-reference.md`:

```markdown
# FrameForge Shapes Reference

All shapes are defined as layers with `"type": "shape"` in your frame's `layers` array.

## Common Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `type` | `"shape"` | required | Layer type |
| `id` | string | required | Unique layer ID within the frame |
| `shape` | string | required | Shape type (see table below) |
| `position` | object | `{}` | Position using zone or absolute mode |
| `dimensions` | object | `{}` | Size fields (see per-shape below) |
| `fill_color` | `"#RRGGBB"` | null | Fill color (no fill if absent) |
| `fill_opacity` | 0–1 | `1.0` | Fill opacity |
| `stroke_color` | `"#RRGGBB"` | null | Stroke/outline color (no stroke if absent) |
| `stroke_width_px` | number | `1` | Stroke width in export pixels |
| `stroke_opacity` | 0–1 | `1.0` | Stroke opacity |

**Backwards compatibility:** If `fill_color` is absent but `color` is set, `color` is used as fill. `opacity` falls back to `fill_opacity`.

---

## Shape Types

### `line`

A horizontal or angled line (rendered as a thin filled rectangle).

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Line length as % of canvas width |
| `dimensions.height_px` | `2` | Line thickness in pixels |
| `angle_deg` | `0` | Rotation in degrees (0 = horizontal) |

```json
{ "type": "shape", "id": "divider", "shape": "line",
  "position": { "zone": "bottom-left", "offset_x_pct": 2, "offset_y_pct": -10 },
  "dimensions": { "width_pct": 20, "height_px": 2 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.6 }
```

---

### `rectangle`

A filled/outlined rectangle with optional rounded corners.

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Width as % of canvas width |
| `dimensions.height_pct` | — | Height as % of canvas height |
| `dimensions.height_px` | `2` | Height in pixels (used if height_pct absent) |
| `border_radius_px` | `0` | Corner radius in pixels |

```json
{ "type": "shape", "id": "tag", "shape": "rectangle",
  "position": { "zone": "top-left", "offset_x_pct": 3, "offset_y_pct": 3 },
  "dimensions": { "width_pct": 15, "height_pct": 4 },
  "fill_color": "#000000", "fill_opacity": 0.6,
  "stroke_color": "#FFFFFF", "stroke_width_px": 1, "stroke_opacity": 0.8,
  "border_radius_px": 4 }
```

---

### `circle`

A circle or ellipse. Use equal width/height for a circle; different values for an ellipse.

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Diameter (or horizontal axis) as % of canvas width |
| `dimensions.height_pct` | same as width | Vertical axis; omit for circle |

```json
{ "type": "shape", "id": "ring", "shape": "circle",
  "position": { "zone": "middle-center" },
  "dimensions": { "width_pct": 30, "height_pct": 30 },
  "stroke_color": "#FFFFFF", "stroke_width_px": 3, "stroke_opacity": 0.7 }
```

---

### `triangle`

A filled/outlined triangle pointing in one of four directions.

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Bounding box width |
| `dimensions.height_pct` | — | Bounding box height |
| `direction` | `"up"` | `up` / `down` / `left` / `right` |

```json
{ "type": "shape", "id": "pointer", "shape": "triangle",
  "direction": "up",
  "position": { "zone": "bottom-center", "offset_y_pct": -5 },
  "dimensions": { "width_pct": 5, "height_pct": 4 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.9 }
```

---

### `arrow`

A line with arrowhead(s) at one or both ends.

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Arrow total length |
| `dimensions.height_px` | `2` | Shaft thickness in pixels |
| `angle_deg` | `0` | Direction (0 = right, 90 = down, 180 = left, 270 = up) |
| `arrowhead` | `"end"` | `end` / `start` / `both` |

```json
{ "type": "shape", "id": "callout", "shape": "arrow",
  "angle_deg": 45, "arrowhead": "end",
  "position": { "x_pct": 30, "y_pct": 60 },
  "dimensions": { "width_pct": 15, "height_px": 3 },
  "stroke_color": "#FFFFFF", "stroke_width_px": 3, "stroke_opacity": 1.0 }
```

---

### `polygon`

A regular n-sided polygon or star shape.

| Field | Default | Description |
|---|---|---|
| `dimensions.width_pct` | `10` | Outer radius diameter |
| `sides` | `6` | Number of sides/points (3–12) |
| `star` | `false` | `true` for star shape |
| `inner_radius_pct` | `50` | Star inner radius as % of outer (only when `star: true`) |
| `rotation_deg` | `0` | Rotation offset in degrees |

```json
{ "type": "shape", "id": "hex-badge", "shape": "polygon",
  "sides": 6, "star": false, "rotation_deg": 0,
  "position": { "zone": "top-right", "offset_x_pct": -3, "offset_y_pct": 3 },
  "dimensions": { "width_pct": 18 },
  "fill_color": "#000000", "fill_opacity": 0.5,
  "stroke_color": "#FFFFFF", "stroke_width_px": 1, "stroke_opacity": 0.8 }
```

Star example:
```json
{ "type": "shape", "id": "star", "shape": "polygon",
  "sides": 5, "star": true, "inner_radius_pct": 40, "rotation_deg": -18,
  "position": { "zone": "top-left", "offset_x_pct": 4, "offset_y_pct": 4 },
  "dimensions": { "width_pct": 8 },
  "fill_color": "#FFD700", "fill_opacity": 1.0 }
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/shapes-reference.md
git commit -m "docs: add shapes-reference.md with all shape types and examples"
```

---

### Task 12: Write `docs/text-positioning.md`

**Files:**
- Create: `docs/text-positioning.md`

- [ ] **Step 1: Create the doc**

Create `docs/text-positioning.md`:

```markdown
# FrameForge Text Positioning

Text layers can be positioned using two modes: **zone mode** (recommended) or **absolute mode**.

---

## Zone Mode

The canvas is divided into 9 named zones:

```
┌────────────┬────────────┬────────────┐
│ top-left   │ top-center │ top-right  │
├────────────┼────────────┼────────────┤
│middle-left │middle-ctr  │middle-right│
├────────────┼────────────┼────────────┤
│bottom-left │bottom-ctr  │bottom-right│
└────────────┴────────────┴────────────┘
```

Each zone has an anchor point at its corner/edge/center. Use `offset_x_pct` and `offset_y_pct` to nudge the text away from the anchor.

```json
"position": {
  "zone": "bottom-left",
  "offset_x_pct": 5,
  "offset_y_pct": -8
}
```

**Important:** Bottom zones anchor to the *bottom* of the text block — text grows upward. All other zones anchor to the *top* of the first line — text grows downward.

---

## Absolute Mode

Position text at an exact canvas location using percentages (0–100 for both axes):

```json
"position": {
  "x_pct": 20,
  "y_pct": 35
}
```

---

## Drag to Reposition

In the FrameForge preview, text layers can be repositioned by dragging them with the mouse:

1. **Hover** over any text — the cursor changes to a grab hand
2. **Click and drag** — the text moves with the mouse
3. **Release** — the new position is saved automatically

### What happens to the position data:

- **Zone mode text:** The `offset_x_pct` and `offset_y_pct` values update. The zone name stays the same unless you drag close to a different zone anchor.
- **Absolute mode text:** The `x_pct` and `y_pct` values update directly.

### Zone snapping

When dragging, if you move the text within ~5% of a zone anchor point, it **snaps** to that zone. The cursor briefly changes to a crosshair to indicate the snap. The `zone` value in the JSON updates to the new zone, and offsets reset to 0.

**Text size is never affected by dragging.** Only the position changes.

---

## Zones and negative space

Use the zone system to place text in the negative space of your photo:

| Subject position | Recommended zones |
|---|---|
| Upper half of frame | `bottom-left`, `bottom-right`, `bottom-center` |
| Lower half of frame | `top-left`, `top-right`, `top-center` |
| Left side | `bottom-right`, `middle-right` |
| Right side | `bottom-left`, `middle-left` |
| Fills frame | One edge zone with strong gradient overlay |
```

- [ ] **Step 2: Commit**

```bash
git add docs/text-positioning.md
git commit -m "docs: add text-positioning.md with zone diagram and drag behavior"
```

---

### Task 13: Update `data/ai-manual-content.js` with new shape docs

**Files:**
- Modify: `data/ai-manual-content.js`

- [ ] **Step 1: Read current shape section in ai-manual-content.js**

Open `data/ai-manual-content.js` and find the section that documents the `shape` layer type in the JSON schema docs (search for `"shape"` near the schema documentation).

- [ ] **Step 2: Replace or extend the shape layer documentation**

Find the shape layer schema entry in the AI_MANUAL string and replace it with the following extended version. Insert this block wherever the current shape layer is documented:

````
### Shape Layer

Geometric figures for visual decoration. Use shapes to add badges, dividers, callouts, and accents to your design.

**Fill + Stroke model:**
- \`fill_color\` + \`fill_opacity\` — interior fill (omit for no fill)
- \`stroke_color\` + \`stroke_width_px\` + \`stroke_opacity\` — outline (omit for no outline)
- Backwards compatible: if only \`color\` + \`opacity\` are provided, they act as fill

**Shape types:**

| \`shape\` | Description | Key extra fields |
|---|---|---|
| \`line\` | Horizontal or angled line | \`angle_deg\` (default 0) |
| \`rectangle\` | Filled/outlined rectangle | \`border_radius_px\`, \`dimensions.width_pct\`, \`dimensions.height_pct\` |
| \`circle\` | Circle or ellipse | \`dimensions.width_pct\`, \`dimensions.height_pct\` (equal = circle) |
| \`triangle\` | Triangle | \`direction\`: up/down/left/right |
| \`arrow\` | Line with arrowhead | \`angle_deg\`, \`arrowhead\`: end/start/both |
| \`polygon\` | Regular polygon or star | \`sides\` (3–12), \`star\`: true/false, \`inner_radius_pct\` |

**Position:** All shapes accept the same \`position\` object as text layers (zone mode or absolute mode).

**Dimensions:** Use \`dimensions.width_pct\` for width (as % of canvas width). For circle/ellipse use \`height_pct\` separately. Line/arrow use \`height_px\` for thickness.

**Examples:**

Circle accent ring:
\`\`\`json
{ "type": "shape", "id": "ring", "shape": "circle",
  "position": { "zone": "middle-center" },
  "dimensions": { "width_pct": 40, "height_pct": 40 },
  "stroke_color": "#FFFFFF", "stroke_width_px": 2, "stroke_opacity": 0.4 }
\`\`\`

Diagonal accent line:
\`\`\`json
{ "type": "shape", "id": "slash", "shape": "line", "angle_deg": 45,
  "position": { "x_pct": 5, "y_pct": 80 },
  "dimensions": { "width_pct": 20, "height_px": 2 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.5 }
\`\`\`

Hexagon badge:
\`\`\`json
{ "type": "shape", "id": "hex", "shape": "polygon",
  "sides": 6, "star": false,
  "position": { "zone": "top-right", "offset_x_pct": -4, "offset_y_pct": 4 },
  "dimensions": { "width_pct": 16 },
  "fill_color": "#000000", "fill_opacity": 0.6,
  "stroke_color": "#FFFFFF", "stroke_width_px": 1, "stroke_opacity": 0.7 }
\`\`\`
````

- [ ] **Step 3: Verify brief export includes new shape docs**

Load any project in FrameForge. Click "Export Brief" (if that button exists in the UI) or check that the AI_MANUAL string in `ai-manual-content.js` now includes the updated shape section when viewed in the browser console:

```javascript
// In browser console:
import('./data/ai-manual-content.js').then(m => console.log(m.AI_MANUAL))
```

Verify the output contains the new shape table.

- [ ] **Step 4: Commit**

```bash
git add data/ai-manual-content.js
git commit -m "docs: update AI manual with new shape types and fill/stroke model"
```

---

### Task 14: Create `README.md`

**Files:**
- Create: `README.md` (in `frameforge/` root)

- [ ] **Step 1: Check if README.md exists**

```bash
ls README.md 2>/dev/null && echo "exists" || echo "not found"
```

- [ ] **Step 2: Create README.md**

Create `frameforge/README.md`:

```markdown
# FrameForge

Browser-based photography layout tool. Load a project JSON, assign images, preview and export frames as PNG.

## Getting Started

1. Open `index.html` in a browser (Chrome/Firefox recommended)
2. Drag a project JSON file onto the drop zone, or click the toolbar JSON button
3. Drag image files onto the canvas or into the image tray
4. Preview and export frames

---

## Shapes & Figures

Add geometric shapes to your designs via the `shape` layer type in your project JSON.

### Available shape types

| `shape` value | Description |
|---|---|
| `line` | Horizontal or angled line (`angle_deg` field) |
| `rectangle` | Filled/outlined rectangle with optional `border_radius_px` |
| `circle` | Circle or ellipse (`width_pct` and `height_pct` dimensions) |
| `triangle` | Triangle with `direction`: `up` / `down` / `left` / `right` |
| `arrow` | Line with arrowhead(s): `arrowhead`: `end` / `start` / `both` |
| `polygon` | Regular polygon or star (`sides` 3–12, `star: true` for star) |

### Fill and stroke

```json
{
  "type": "shape",
  "id": "my-shape",
  "shape": "circle",
  "position": { "zone": "middle-center" },
  "dimensions": { "width_pct": 25, "height_pct": 25 },
  "fill_color": "#FFFFFF",
  "fill_opacity": 0.15,
  "stroke_color": "#FFFFFF",
  "stroke_width_px": 2,
  "stroke_opacity": 0.8
}
```

See [`docs/shapes-reference.md`](docs/shapes-reference.md) for full field reference and one example per shape type.

---

## Text Positioning & Dragging

Text layers can be positioned via zone mode (recommended) or absolute percentage mode.

### Zone names

```
┌────────────┬────────────┬────────────┐
│ top-left   │ top-center │ top-right  │
├────────────┼────────────┼────────────┤
│middle-left │middle-ctr  │middle-right│
├────────────┼────────────┼────────────┤
│bottom-left │bottom-ctr  │bottom-right│
└────────────┴────────────┴────────────┘
```

```json
"position": { "zone": "bottom-left", "offset_x_pct": 5, "offset_y_pct": -8 }
```

### Dragging text

In the canvas preview, hover over any text to see the grab cursor, then drag to reposition. Positions are saved automatically. Drag close to a zone anchor to snap. Text size is never affected.

See [`docs/text-positioning.md`](docs/text-positioning.md) for full details.

---

## Project JSON Structure

See `data/ai-manual-content.js` for the complete JSON schema reference, including all layer types, fields, and examples.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with shapes and text positioning sections"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ circle, triangle, arrow, diagonal line (via angle_deg on line), polygon/star — all covered
- ✅ fill + stroke model with backwards compat — Task 2
- ✅ validator updated — Task 1
- ✅ computeTextBounds left/right — Task 3
- ✅ drag.js module — Task 9
- ✅ app.js wiring — Task 10
- ✅ ai-manual-content.js update — Task 13
- ✅ docs/shapes-reference.md — Task 11
- ✅ docs/text-positioning.md — Task 12
- ✅ README.md — Task 14
- ✅ brief export auto-updates via ai-manual-content.js — no extra task needed

**Type consistency check:**
- `resolveShapeStyle` returns `{ fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth }` — used consistently in `applyShapeStyle` and `arrow` branch
- `computeTextBounds` returns `{ top, bottom, left, right }` — used in `drag.js` with `.top`, `.bottom`, `.left`, `.right`
- `initDrag` signature: `(canvas, project, getFrameIndex, onRender, onComplete)` — matches wiring in `app.js`
- `destroyDrag` signature: `(canvas)` — matches `app.js` call

**Placeholder check:** None found.
