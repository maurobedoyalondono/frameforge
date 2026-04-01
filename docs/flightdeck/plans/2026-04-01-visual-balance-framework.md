---
title: "Visual Balance Framework Implementation Plan"
description: "Step-by-step implementation plan for the two-tier composition guide and visual weight analysis system"
---

> **For agentic workers:** REQUIRED SUB-SKILL: Use flightdeck:subagent-driven-development (recommended) or flightdeck:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Visual Balance Framework to FrameForge — composition geometry guides (Rule of Thirds, Phi Grid, Golden Spiral, Center Cross, Diagonals, Quadrants) plus pixel-level visual weight heatmap and manual zone analysis with text-placement recommendations.

**Architecture:** A `btn-balance` toolbar button opens a dropdown to select one composition guide (drawn on canvas by the renderer) or toggle visual analysis tools (heatmap + draw-zones). A new right-side Balance Panel shows per-zone analysis cards. All overlays are non-exported and session-only. Two new files are created (`visual-analysis.js`, `balance-panel.js`); four existing files are modified (`renderer.js`, `shell.js`, `app.js`, `components.css`).

**Tech Stack:** Vanilla ES modules, HTML5 Canvas (getImageData for pixel analysis), CSS custom properties (existing design tokens), localStorage (existing prefs pattern).

**Note on testing:** This is a browser-only app with no test runner. Each task's verification step is a manual browser check described precisely. Open `frameforge/index.html` in a browser (live-server or file:// with a modern browser) for all verification steps.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frameforge/modules/visual-analysis.js` | **Create** | Pure pixel-analysis functions: zone analysis, heatmap scoring, WCAG calc, text color recommendation |
| `frameforge/ui/balance-panel.js` | **Create** | Right-side Balance Panel DOM: build, update, destroy |
| `frameforge/modules/renderer.js` | **Modify** | Add 4 renderer props, `drawCompositionGuide()`, `drawHeatmap()`, `drawZoneOverlays()`, call them in `renderFrame()` |
| `frameforge/ui/shell.js` | **Modify** | Add `btn-balance` + dropdown HTML to toolbar; return it; extend `updateToolbarState()` |
| `frameforge/app.js` | **Modify** | Import new modules; wire btn-balance click → dropdown; guide selection; heatmap toggle; zone-draw mode; `[B]` shortcut; prefs; frame-switch cleanup |
| `frameforge/styles/components.css` | **Modify** | Dropdown styles, balance panel styles, zone-draw cursor |

---

## Task 1: Create `visual-analysis.js` — Pure Analysis Functions

**Files:**

- Create: `frameforge/modules/visual-analysis.js`

This module has no DOM dependencies. It only receives `ImageData` and canvas dimensions and returns plain objects.

- [ ] **Step 1: Create the file with `analyzeZone`**

Create `frameforge/modules/visual-analysis.js` with this content:

```js
/**
 * visual-analysis.js — Pixel-level visual weight analysis for FrameForge.
 *
 * Pure functions only. No DOM dependencies.
 */

// ── Colour helpers ─────────────────────────────────────────────────────────

/** sRGB byte → linear (WCAG 2.1 relative luminance component) */
function linearize(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Relative luminance of an RGB triplet (WCAG 2.1) */
function relativeLuminance(r, g, b) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG 2.1 contrast ratio between two hex colours */
export function wcagContrastRatio(hexFg, hexBg) {
  const parse = (hex) => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const L1 = relativeLuminance(...parse(hexFg));
  const L2 = relativeLuminance(...parse(hexBg));
  const bright = Math.max(L1, L2);
  const dark   = Math.min(L1, L2);
  return (bright + 0.05) / (dark + 0.05);
}

/** Recommend white or black text over an average background colour */
export function recommendTextColor(avgR, avgG, avgB) {
  const bgHex = `#${[avgR, avgG, avgB].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
  const whiteRatio = wcagContrastRatio('#ffffff', bgHex);
  const blackRatio = wcagContrastRatio('#000000', bgHex);
  const color = whiteRatio >= blackRatio ? '#ffffff' : '#000000';
  const ratio = Math.max(whiteRatio, blackRatio);
  const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail';
  return { color, ratio: Math.round(ratio * 10) / 10, level, bgHex };
}

// ── Heatmap ────────────────────────────────────────────────────────────────

/**
 * Build a weight score grid from ImageData.
 *
 * @param {ImageData} imageData
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {number} [gridSize=16]
 * @returns {Float32Array} gridSize×gridSize scores in row-major order (0–1)
 */
export function buildHeatmap(imageData, canvasW, canvasH, gridSize = 16) {
  const scores = new Float32Array(gridSize * gridSize);
  const cellW  = canvasW / gridSize;
  const cellH  = canvasH / gridSize;
  const data   = imageData.data;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x0 = Math.floor(col * cellW);
      const y0 = Math.floor(row * cellH);
      const x1 = Math.floor((col + 1) * cellW);
      const y1 = Math.floor((row + 1) * cellH);

      let sumL = 0, sumS = 0, count = 0;
      const luminances = [];

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = (y * canvasW + x) * 4;
          const r   = data[idx];
          const g   = data[idx + 1];
          const b   = data[idx + 2];

          // Luminance (simple, scaled 0–1)
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          luminances.push(lum);
          sumL += lum;

          // Saturation via HSL
          const rn = r / 255, gn = g / 255, bn = b / 255;
          const cmax = Math.max(rn, gn, bn);
          const cmin = Math.min(rn, gn, bn);
          const l    = (cmax + cmin) / 2;
          const sat  = cmax === cmin ? 0 : (cmax - cmin) / (1 - Math.abs(2 * l - 1));
          sumS += Math.min(sat, 1);
          count++;
        }
      }

      if (count === 0) { scores[row * gridSize + col] = 0; continue; }

      const avgL = sumL / count;
      const avgS = sumS / count;

      // Local contrast = standard deviation of luminance
      let variance = 0;
      for (const l of luminances) variance += (l - avgL) ** 2;
      const stdDev = Math.sqrt(variance / luminances.length);
      const contrast = Math.min(stdDev * 4, 1); // scale stddev to ~0–1

      scores[row * gridSize + col] = 0.4 * avgL + 0.4 * contrast + 0.2 * avgS;
    }
  }

  return scores;
}

// ── Zone analysis ──────────────────────────────────────────────────────────

/**
 * Analyse a rectangular zone within ImageData.
 *
 * @param {ImageData} imageData  — full canvas ImageData
 * @param {number} canvasW       — canvas pixel width (imageData.width)
 * @param {number} x             — zone left in canvas pixels
 * @param {number} y             — zone top in canvas pixels
 * @param {number} w             — zone width in canvas pixels
 * @param {number} h             — zone height in canvas pixels
 * @returns {object} analysis result
 */
export function analyzeZone(imageData, canvasW, x, y, w, h) {
  const data   = imageData.data;
  let sumR = 0, sumG = 0, sumB = 0, sumL = 0, sumS = 0, count = 0;
  const luminances = [];

  const x1 = x + w;
  const y1 = y + h;

  for (let py = y; py < y1; py++) {
    for (let px = x; px < x1; px++) {
      const idx = (py * canvasW + px) * 4;
      const r   = data[idx];
      const g   = data[idx + 1];
      const b   = data[idx + 2];

      sumR += r;
      sumG += g;
      sumB += b;

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      luminances.push(lum);
      sumL += lum;

      const rn = r / 255, gn = g / 255, bn = b / 255;
      const cmax = Math.max(rn, gn, bn);
      const cmin = Math.min(rn, gn, bn);
      const l    = (cmax + cmin) / 2;
      const sat  = cmax === cmin ? 0 : (cmax - cmin) / (1 - Math.abs(2 * l - 1));
      sumS += Math.min(sat, 1);
      count++;
    }
  }

  if (count === 0) {
    return { avgLuminance: 0, contrastScore: 'Low', visualWeight: 0, dominantColor: '#000000', textRec: recommendTextColor(0, 0, 0), descriptor: 'No data' };
  }

  const avgR = sumR / count;
  const avgG = sumG / count;
  const avgB = sumB / count;
  const avgL = sumL / count;
  const avgS = sumS / count;

  let variance = 0;
  for (const l of luminances) variance += (l - avgL) ** 2;
  const stdDev   = Math.sqrt(variance / luminances.length);
  const contrast = Math.min(stdDev * 4, 1);

  const contrastLabel = stdDev < 0.15 ? 'Low' : stdDev < 0.35 ? 'Medium' : 'High';
  const weight        = (0.4 * avgL + 0.4 * contrast + 0.2 * avgS) * 10;

  const textRec = recommendTextColor(avgR, avgG, avgB);
  const descriptor = buildDescriptor(avgL, contrastLabel, textRec.color);

  return {
    avgLuminance:  Math.round(avgL * 100),
    contrastScore: contrastLabel,
    visualWeight:  Math.round(weight * 10) / 10,
    dominantColor: textRec.bgHex,
    textRec,
    descriptor,
  };
}

function buildDescriptor(avgL, contrastLabel, textColor) {
  const tone   = avgL < 0.33 ? 'Dark' : avgL < 0.66 ? 'Mid-tone' : 'Light';
  const sug    = textColor === '#ffffff' ? 'good for white text' : 'good for dark text';
  return `${tone} / ${contrastLabel.toLowerCase()} contrast — ${sug}.`;
}
```

- [ ] **Step 2: Verify the module loads without errors**

Open browser dev tools console and run:
```js
import('./modules/visual-analysis.js').then(m => console.log(Object.keys(m)));
```
Expected output: `['wcagContrastRatio', 'recommendTextColor', 'buildHeatmap', 'analyzeZone']`

- [ ] **Step 3: Commit**

```bash
git add frameforge/modules/visual-analysis.js
git commit -m "feat(balance): add visual-analysis module with zone and heatmap scoring"
```

---

## Task 2: Add Composition Guide Drawing to `renderer.js`

**Files:**

- Modify: `frameforge/modules/renderer.js`

Add the 4 new renderer properties and the `drawCompositionGuide()` function, then call it in `renderFrame()`.

- [ ] **Step 1: Add the four new properties to the `Renderer` constructor**

In `frameforge/modules/renderer.js`, find the `constructor()` block (around line 88) and add four properties after `this.isDragging = false;`:

```js
    /** @type {string|null} active composition guide key */
    this.activeGuide       = null;
    /** @type {number} golden spiral orientation 0–3 */
    this.spiralOrientation = 0;
    /** @type {boolean} */
    this.showHeatmap       = false;
    /** @type {Array} analysis zones [{id,x,y,w,h,analysis}] */
    this.analysisZones     = [];
```

- [ ] **Step 2: Add `drawCompositionGuide()` function**

Add this function immediately before the `// ── Main renderer ─────` comment block in `renderer.js`:

```js
// ── Composition guide overlays ────────────────────────────────────────────

/**
 * Draw the selected composition guide onto ctx.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w  effective canvas width
 * @param {number} h  effective canvas height
 * @param {string} guide  guide key
 * @param {number} spiralOrientation  0–3
 */
function drawCompositionGuide(ctx, w, h, guide, spiralOrientation = 0) {
  if (!guide || guide === 'off') return;

  ctx.save();
  const lw = Math.max(1, w / 600);

  function line(x1, y1, x2, y2, alpha = 0.35) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur  = 2;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth   = lw;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function dot(x, y, alpha = 0.6) {
    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, lw * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (guide === 'thirds') {
    const x1 = w / 3, x2 = w * 2 / 3;
    const y1 = h / 3, y2 = h * 2 / 3;
    line(x1, 0, x1, h); line(x2, 0, x2, h);
    line(0, y1, w, y1); line(0, y2, w, y2);
    for (const x of [x1, x2]) for (const y of [y1, y2]) dot(x, y);
  }

  if (guide === 'phi') {
    const phi = 0.381966;
    const x1 = w * phi, x2 = w * (1 - phi);
    const y1 = h * phi, y2 = h * (1 - phi);
    line(x1, 0, x1, h); line(x2, 0, x2, h);
    line(0, y1, w, y1); line(0, y2, w, y2);
    for (const x of [x1, x2]) for (const y of [y1, y2]) dot(x, y);
  }

  if (guide === 'cross') {
    line(w / 2, 0, w / 2, h); line(0, h / 2, w, h / 2);
    dot(w / 2, h / 2);
  }

  if (guide === 'diagonals') {
    line(0, 0, w, h); line(w, 0, 0, h);
  }

  if (guide === 'quadrants') {
    line(w / 2, 0, w / 2, h); line(0, h / 2, w, h / 2);
    const labels = ['1', '2', '3', '4'];
    const positions = [[w * 0.25, h * 0.25], [w * 0.75, h * 0.25], [w * 0.25, h * 0.75], [w * 0.75, h * 0.75]];
    const fSize = Math.max(12, w * 0.022);
    ctx.save();
    ctx.font      = `bold ${fSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) ctx.fillText(labels[i], positions[i][0], positions[i][1]);
    ctx.restore();
  }

  if (guide === 'spiral') {
    // Draw all 4 orientations: inactive at 0.12 opacity, active at 0.5
    for (let ori = 0; ori < 4; ori++) {
      const alpha = ori === spiralOrientation ? 0.5 : 0.12;
      drawGoldenSpiral(ctx, w, h, ori, alpha, lw);
    }
  }

  ctx.restore();
}

/**
 * Draw a golden spiral (Fibonacci arc approximation) for one orientation.
 * Orientations: 0=TL, 1=TR, 2=BR, 3=BL
 */
function drawGoldenSpiral(ctx, w, h, orientation, alpha, lw) {
  const phi  = 1.61803398875;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth   = lw;
  ctx.setLineDash([]);

  // Mirror transformations for 4 orientations
  ctx.translate(w / 2, h / 2);
  if (orientation === 1) ctx.scale(-1, 1);
  if (orientation === 2) ctx.scale(-1, -1);
  if (orientation === 3) ctx.scale(1, -1);
  ctx.translate(-w / 2, -h / 2);

  // Fibonacci rectangle decomposition — 6 arcs
  // Each arc is a quarter-circle in one sub-rectangle
  let rects = [];
  let bw = w, bh = h, bx = 0, by = 0;
  for (let i = 0; i < 6; i++) {
    if (bw >= bh) {
      const sq = bh;
      rects.push({ x: bx, y: by, s: sq, dir: i % 2 === 0 ? 'right' : 'left' });
      bx  += sq;
      bw  -= sq;
    } else {
      const sq = bw;
      rects.push({ x: bx, y: by, s: sq, dir: i % 2 === 0 ? 'down' : 'up' });
      by  += sq;
      bh  -= sq;
    }
  }

  ctx.beginPath();
  let cx = w, cy = 0; // starting arc center approximation
  const startAngles = [Math.PI, Math.PI * 1.5, 0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    // Arc center is corner of each square, radius is square side
    const corners = [
      [r.x + r.s, r.y + r.s], // bottom-right
      [r.x,       r.y + r.s], // bottom-left
      [r.x,       r.y      ], // top-left
      [r.x + r.s, r.y      ], // top-right
    ];
    const [acx, acy] = corners[i % 4];
    const start = startAngles[i];
    ctx.arc(acx, acy, r.s, start, start + Math.PI / 2);
  }
  ctx.stroke();
  ctx.restore();
}
```

- [ ] **Step 3: Call `drawCompositionGuide()` inside `renderFrame()`**

Find the "Safe zone overlay" block inside `renderFrame()` (around line 272–275 in the original) and add the composition guide call immediately before it:

```js
      // Composition guide overlay
      if (!forExport && this.activeGuide) {
        drawCompositionGuide(ctx, effW, effH, this.activeGuide, this.spiralOrientation);
      }
```

- [ ] **Step 4: Manual verification**

Open the app in browser, load a project, then in the browser console run:

```js
// From app.js the renderer is accessible via window.__renderer in debug builds,
// but we can test directly:
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
// Call the function by temporarily exporting it — just verify no console errors
```

Simpler: after Step 5 (shell wiring) is done, select "Rule of Thirds" from the dropdown and confirm lines appear on the canvas. For now, verify no JS errors in console after save.

- [ ] **Step 5: Commit**

```bash
git add frameforge/modules/renderer.js
git commit -m "feat(balance): add composition guide drawing to renderer"
```

---

## Task 3: Add Heatmap and Zone Overlays to `renderer.js`

**Files:**

- Modify: `frameforge/modules/renderer.js`

- [ ] **Step 1: Add `drawHeatmap()` and `drawZoneOverlays()` functions**

Add the following two functions immediately after `drawGoldenSpiral()` (which was added in Task 2, right before the `// ── Main renderer ─────` comment):

```js
// ── Heatmap overlay ───────────────────────────────────────────────────────

/**
 * Draw the visual weight heatmap on ctx using already-computed scores.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {Float32Array} scores  gridSize×gridSize scores 0–1
 * @param {number} [gridSize=16]
 */
function drawHeatmap(ctx, w, h, scores, gridSize = 16) {
  if (!scores || scores.length < gridSize * gridSize) return;

  const cellW = w / gridSize;
  const cellH = h / gridSize;

  // Find top-3 heaviest and top-3 lightest by index
  const indexed = Array.from(scores).map((s, i) => ({ s, i }));
  const sorted  = [...indexed].sort((a, b) => b.s - a.s);
  const heavySet = new Set(sorted.slice(0, 3).map(e => e.i));
  const lightSet = new Set(sorted.slice(-3).map(e => e.i));

  ctx.save();
  for (let idx = 0; idx < scores.length; idx++) {
    const score = scores[idx];
    const row   = Math.floor(idx / gridSize);
    const col   = idx % gridSize;
    const x     = col * cellW;
    const y     = row * cellH;

    // Interpolate cool (low) → warm (high)
    const r = Math.round(40  + score * (255 - 40));
    const g = Math.round(120 - score * 120);
    const b = Math.round(255 - score * 255);
    const a = 0.15 + score * 0.35;
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fillRect(x, y, cellW, cellH);
  }

  // Badge top/bottom cells
  const fSize = Math.max(10, cellW * 0.35);
  ctx.font         = `bold ${fSize}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  for (let idx = 0; idx < scores.length; idx++) {
    const row = Math.floor(idx / gridSize);
    const col = idx % gridSize;
    const cx  = col * cellW + cellW / 2;
    const cy  = row * cellH + cellH / 2;
    if (heavySet.has(idx)) {
      ctx.fillStyle = 'rgba(255,140,0,0.9)';
      ctx.fillText('▲', cx, cy);
    } else if (lightSet.has(idx)) {
      ctx.fillStyle = 'rgba(90,200,250,0.9)';
      ctx.fillText('▽', cx, cy);
    }
  }

  ctx.restore();
}

// ── Zone overlays ─────────────────────────────────────────────────────────

/**
 * Draw analysis zone rectangles on ctx.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {Array} zones  [{id, x, y, w, h, analysis}] — canvas pixel coords
 */
function drawZoneOverlays(ctx, w, h, zones) {
  if (!zones || zones.length === 0) return;

  const lw = Math.max(1, w / 600);
  ctx.save();

  for (const zone of zones) {
    // Dashed cyan border
    ctx.strokeStyle = 'rgba(90,200,250,0.8)';
    ctx.lineWidth   = lw * 1.5;
    ctx.setLineDash([w / 60, w / 80]);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    // Number badge
    const fSize  = Math.max(11, w * 0.018);
    const label  = zone.id;
    const padX   = fSize * 0.5;
    const padY   = fSize * 0.3;
    const tw     = ctx.measureText(label).width + padX * 2;
    const th     = fSize + padY * 2;

    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(90,200,250,0.85)';
    ctx.fillRect(zone.x, zone.y, tw, th);

    ctx.font         = `bold ${fSize}px sans-serif`;
    ctx.fillStyle    = '#000';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, zone.x + padX, zone.y + padY);

    // Good-for-text badge
    if (zone.analysis && zone.analysis.visualWeight <= 4.0) {
      const badge  = '✓ Good for text';
      const bSize  = Math.max(10, w * 0.014);
      const bPadX  = bSize * 0.5;
      const bPadY  = bSize * 0.3;
      const bw     = ctx.measureText(badge).width + bPadX * 2;
      ctx.font     = `${bSize}px sans-serif`;
      const bw2    = ctx.measureText(badge).width + bPadX * 2;
      const bh     = bSize + bPadY * 2;
      const bx     = zone.x + zone.w - bw2;
      const by     = zone.y;
      ctx.fillStyle = 'rgba(50,200,100,0.85)';
      ctx.fillRect(bx, by, bw2, bh);
      ctx.fillStyle    = '#000';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(badge, zone.x + zone.w - bPadX, zone.y + bPadY);
    }
  }

  ctx.restore();
}
```

- [ ] **Step 2: Call heatmap and zone overlays in `renderFrame()`**

Add these two calls immediately after the composition guide call added in Task 2, still inside the `!forExport` region. The heatmap scores are computed externally (in app.js) and passed via `opts`:

```js
      // Heatmap overlay (scores pre-computed by app.js after last render)
      if (!forExport && this.showHeatmap && this._heatmapScores) {
        drawHeatmap(ctx, effW, effH, this._heatmapScores);
      }

      // Zone overlays
      if (!forExport && this.analysisZones.length > 0) {
        drawZoneOverlays(ctx, effW, effH, this.analysisZones);
      }
```

Also add `this._heatmapScores = null;` to the Renderer constructor.

- [ ] **Step 3: Verify no console errors**

Save and reload the browser. Load a project. Confirm no JS errors in console.

- [ ] **Step 4: Commit**

```bash
git add frameforge/modules/renderer.js
git commit -m "feat(balance): add heatmap and zone overlay drawing to renderer"
```

---

## Task 4: Create `balance-panel.js` — Right-Side Analysis Panel

**Files:**

- Create: `frameforge/ui/balance-panel.js`

- [ ] **Step 1: Create the file**

```js
/**
 * balance-panel.js — Right-side Visual Analysis panel for FrameForge.
 *
 * Shows per-zone analysis cards and heatmap status.
 * Absolutely positioned inside #canvas-area, overlapping the canvas right edge.
 */

export class BalancePanel {
  /**
   * @param {HTMLElement} canvasArea — #canvas-area element
   * @param {object} callbacks
   * @param {function} callbacks.onDeleteZone  — called with zone id
   * @param {function} callbacks.onClearAll    — called with no args
   * @param {function} callbacks.onClose       — called with no args
   */
  constructor(canvasArea, { onDeleteZone, onClearAll, onClose } = {}) {
    this._canvasArea   = canvasArea;
    this._onDeleteZone = onDeleteZone ?? (() => {});
    this._onClearAll   = onClearAll   ?? (() => {});
    this._onClose      = onClose      ?? (() => {});
    this._el           = null;
    this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.id        = 'balance-panel';
    el.className = 'balance-panel';
    el.setAttribute('aria-label', 'Visual analysis panel');
    el.innerHTML = `
      <div class="balance-panel-header">
        <span class="balance-panel-title">Visual Analysis</span>
        <button class="balance-panel-close" title="Close panel" aria-label="Close visual analysis panel">×</button>
      </div>
      <div class="balance-panel-actions">
        <button class="btn btn-ghost balance-clear-all" disabled>Clear All Zones</button>
      </div>
      <div class="balance-panel-body"></div>
    `;
    el.querySelector('.balance-panel-close').addEventListener('click', () => this._onClose());
    el.querySelector('.balance-clear-all').addEventListener('click', () => this._onClearAll());
    this._canvasArea.appendChild(el);
    this._el = el;
  }

  /** Show or hide the panel */
  setVisible(visible) {
    if (!this._el) return;
    this._el.style.display = visible ? '' : 'none';
  }

  /**
   * Re-render zone cards.
   * @param {Array} zones  [{id, x, y, w, h, analysis}]
   * @param {boolean} heatmapActive
   */
  update(zones, heatmapActive) {
    if (!this._el) return;
    const clearBtn = this._el.querySelector('.balance-clear-all');
    clearBtn.disabled = zones.length === 0;

    const body = this._el.querySelector('.balance-panel-body');
    body.innerHTML = '';

    if (heatmapActive && zones.length === 0) {
      const info = document.createElement('p');
      info.className = 'balance-panel-hint';
      info.textContent = 'Heatmap active — warm cells have high visual weight.';
      body.appendChild(info);
      return;
    }

    for (const zone of zones) {
      body.appendChild(this._buildCard(zone));
    }
  }

  _buildCard(zone) {
    const a = zone.analysis;
    const card = document.createElement('div');
    card.className = 'balance-zone-card';

    const wcagBadgeClass = a.textRec.level === 'AAA' ? 'badge-pass-aaa'
                         : a.textRec.level === 'AA'  ? 'badge-pass-aa'
                         : 'badge-fail';

    card.innerHTML = `
      <div class="balance-zone-header">
        <span class="balance-zone-name">${escHtml(zone.id)}</span>
        <button class="balance-zone-delete" data-id="${escHtml(zone.id)}" title="Delete zone" aria-label="Delete zone ${escHtml(zone.id)}">×</button>
      </div>
      <div class="balance-zone-row"><span>Avg Luminance</span><span>${a.avgLuminance}/100</span></div>
      <div class="balance-zone-row"><span>Contrast</span><span>${escHtml(a.contrastScore)}</span></div>
      <div class="balance-zone-row"><span>Visual Weight</span><span>${a.visualWeight}/10</span></div>
      <div class="balance-zone-row">
        <span>Dominant</span>
        <span class="balance-swatch-row">
          <span class="balance-swatch" style="background:${escHtml(a.dominantColor)}"></span>
          ${escHtml(a.dominantColor)}
        </span>
      </div>
      <div class="balance-zone-divider"></div>
      <div class="balance-zone-rec">
        <div class="balance-rec-label">Text Recommendation</div>
        <div class="balance-rec-value">
          <span class="balance-swatch" style="background:${escHtml(a.textRec.color)};border:1px solid rgba(255,255,255,0.2)"></span>
          ${escHtml(a.textRec.color === '#ffffff' ? 'White' : 'Black')} ${escHtml(a.textRec.color)}
        </div>
        <div class="balance-rec-row">
          WCAG ratio: ${a.textRec.ratio}:1 &nbsp;
          <span class="balance-badge ${wcagBadgeClass}">${escHtml(a.textRec.level)}</span>
        </div>
        <div class="balance-rec-desc">${escHtml(a.descriptor)}</div>
      </div>
    `;

    card.querySelector('.balance-zone-delete').addEventListener('click', (e) => {
      this._onDeleteZone(e.currentTarget.dataset.id);
    });

    return card;
  }

  destroy() {
    this._el?.remove();
    this._el = null;
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

- [ ] **Step 2: Verify — open app, no console errors**

No wiring yet — just confirm the module parses without errors by adding a temporary import in console:

```js
import('./ui/balance-panel.js').then(m => console.log('OK', Object.keys(m)));
```

Expected: `OK ['BalancePanel']`

- [ ] **Step 3: Commit**

```bash
git add frameforge/ui/balance-panel.js
git commit -m "feat(balance): add BalancePanel component"
```

---

## Task 5: Update `shell.js` — Toolbar Button and Dropdown

**Files:**

- Modify: `frameforge/ui/shell.js`

- [ ] **Step 1: Add `btn-balance` and dropdown to the toolbar HTML in `buildToolbar()`**

Find the block with `btn-safe-zone` in `buildToolbar()`. Add the new button and dropdown immediately after `btn-layers` (before the next `<div class="toolbar-sep">`):

```html
    <button class="btn btn-ghost btn-icon" id="btn-balance" title="Visual Balance [B]" disabled>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 1a.5.5 0 0 1 .5.5V2h4a.5.5 0 0 1 .354.854l-2 2A.5.5 0 0 1 10 5H8.5v1.5a.5.5 0 0 1-1 0V5H6a.5.5 0 0 1-.354-.146l-2-2A.5.5 0 0 1 4 2h3.5V1.5A.5.5 0 0 1 8 1zM2.5 8a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5zm11 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5zM7 9.5A.5.5 0 0 1 7.5 9h1a.5.5 0 0 1 0 1h-1A.5.5 0 0 1 7 9.5z"/>
        <line x1="2.5" y1="12.5" x2="13.5" y2="12.5" stroke="currentColor" stroke-width="1"/>
        <polyline points="8,12.5 8,14" stroke="currentColor" stroke-width="1"/>
      </svg>
      <span style="font-size:9px;line-height:1">▾</span>
    </button>

    <!-- Balance dropdown (hidden by default) -->
    <div id="balance-dropdown" class="balance-dropdown" style="display:none" role="menu" aria-label="Visual Balance">
      <div class="balance-dropdown-header">Visual Balance</div>
      <div class="balance-dropdown-section-label">Composition Guides</div>
      <label class="balance-dropdown-item"><input type="radio" name="balance-guide" value="off" checked> Off</label>
      <label class="balance-dropdown-item"><input type="radio" name="balance-guide" value="thirds"> Rule of Thirds</label>
      <label class="balance-dropdown-item"><input type="radio" name="balance-guide" value="phi"> Phi Grid</label>
      <label class="balance-dropdown-item"><input type="radio" name="balance-guide" value="spiral"> Golden Spiral</label>
      <label class="balance-dropdown-item"><input type="radio" name="balance-guide" value="cross"> Center Cross</label>
      <label class="balance-dropdown-item"><input type="radio" name="balance-guide" value="diagonals"> Diagonals</label>
      <label class="balance-dropdown-item"><input type="radio" name="balance-guide" value="quadrants"> Quadrants</label>
      <div class="balance-dropdown-divider"></div>
      <div class="balance-dropdown-section-label">Visual Analysis</div>
      <label class="balance-dropdown-item"><input type="checkbox" id="balance-heatmap"> Weight Heatmap</label>
      <label class="balance-dropdown-item" id="balance-draw-zones-label"><input type="checkbox" id="balance-draw-zones"> Draw Zones</label>
      <button class="balance-dropdown-item balance-clear-zones-btn" id="balance-clear-zones" disabled>✕ Clear All Zones</button>
    </div>
```

- [ ] **Step 2: Return `btnBalance` and dropdown elements from `buildToolbar()`**

Add to the return object:

```js
    btnBalance:    document.getElementById('btn-balance'),
    balanceDropdown: document.getElementById('balance-dropdown'),
```

- [ ] **Step 3: Extend `updateToolbarState()` to handle balance active state**

Add this block inside `updateToolbarState()` after the `btns.btnLayers` block:

```js
  if (btns.btnBalance) {
    btns.btnBalance.disabled = !hasProject;
  }
```

Also add `btns.btnBalance` to the `els` array that gets `disabled = !hasProject`.

- [ ] **Step 4: Verify — no console errors, button appears in toolbar (disabled until project loaded)**

Reload browser, confirm btn-balance appears next to btn-layers with a ▾ indicator. No console errors.

- [ ] **Step 5: Commit**

```bash
git add frameforge/ui/shell.js
git commit -m "feat(balance): add btn-balance and dropdown to toolbar"
```

---

## Task 6: Add Styles to `components.css`

**Files:**

- Modify: `frameforge/styles/components.css`

- [ ] **Step 1: Append balance dropdown and panel styles**

Add the following at the end of `frameforge/styles/components.css`:

```css
/* ── Visual Balance Dropdown ─────────────────────────────────────────────── */

.balance-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: auto;
  z-index: 200;
  min-width: 200px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  padding: 6px 0;
  user-select: none;
}

.balance-dropdown-header {
  padding: 6px 14px 4px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.balance-dropdown-section-label {
  padding: 4px 14px 2px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.balance-dropdown-divider {
  height: 1px;
  background: var(--color-border);
  margin: 6px 0;
}

.balance-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  border-radius: 0;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.balance-dropdown-item:hover {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
}

.balance-dropdown-item input[type="radio"],
.balance-dropdown-item input[type="checkbox"] {
  accent-color: var(--color-accent);
  cursor: pointer;
}

.balance-clear-zones-btn {
  color: var(--color-error);
}

.balance-clear-zones-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Visual Balance Panel ─────────────────────────────────────────────────── */

.balance-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 240px;
  max-height: 100%;
  overflow-y: auto;
  background: var(--color-bg-panel);
  border-left: 1px solid var(--color-border);
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.balance-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-bg-panel);
  z-index: 1;
}

.balance-panel-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.balance-panel-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
  border-radius: var(--radius-sm);
}
.balance-panel-close:hover { color: var(--color-text-primary); }

.balance-panel-actions {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
}

.balance-clear-all {
  font-size: var(--font-size-sm);
  width: 100%;
}

.balance-panel-body {
  padding: 8px;
  flex: 1;
  overflow-y: auto;
}

.balance-panel-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: 8px 4px;
  line-height: 1.5;
}

.balance-zone-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  margin-bottom: 8px;
  font-size: var(--font-size-sm);
}

.balance-zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.balance-zone-name {
  font-weight: 600;
  color: rgba(90,200,250,0.9);
  font-size: var(--font-size-base);
}

.balance-zone-delete {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 15px;
  padding: 0 2px;
  border-radius: var(--radius-sm);
}
.balance-zone-delete:hover { color: var(--color-error); }

.balance-zone-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  color: var(--color-text-secondary);
}

.balance-zone-row span:first-child { color: var(--color-text-muted); }

.balance-swatch-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.balance-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(255,255,255,0.15);
  flex-shrink: 0;
}

.balance-zone-divider {
  height: 1px;
  background: var(--color-border);
  margin: 8px 0;
}

.balance-zone-rec { color: var(--color-text-secondary); }

.balance-rec-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-muted);
  margin-bottom: 5px;
}

.balance-rec-value {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 3px;
}

.balance-rec-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: var(--font-size-sm);
}

.balance-rec-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.balance-badge {
  display: inline-block;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.badge-pass-aaa { background: rgba(50,200,100,0.2); color: rgb(50,200,100); }
.badge-pass-aa  { background: rgba(250,200,50,0.2);  color: rgb(250,200,50); }
.badge-fail     { background: rgba(255,85,85,0.2);   color: rgb(255,85,85); }

/* Zone draw cursor mode */
#canvas-wrap.zone-draw-mode {
  cursor: crosshair;
}
```

- [ ] **Step 2: Verify — no visual regressions**

Reload browser, load project. Toolbar looks correct. No layout shifts.

- [ ] **Step 3: Commit**

```bash
git add frameforge/styles/components.css
git commit -m "feat(balance): add dropdown and balance panel styles"
```

---

## Task 7: Wire Everything in `app.js`

**Files:**

- Modify: `frameforge/app.js`

This is the longest task. Work through it sub-step by sub-step.

- [ ] **Step 1: Add imports at the top of `app.js`**

After the existing imports, add:

```js
import { buildHeatmap, analyzeZone } from './modules/visual-analysis.js';
import { BalancePanel } from './ui/balance-panel.js';
```

- [ ] **Step 2: Initialize renderer balance state from prefs**

Find the block where `renderer.showSafeZone` and `renderer.showLayerBounds` are loaded from prefs (around line 269). Add:

```js
  renderer.activeGuide       = prefs.active_guide        ?? null;
  renderer.spiralOrientation = prefs.spiral_orientation  ?? 0;
```

- [ ] **Step 3: Initialize the BalancePanel instance**

After `const safeZoneEl = document.getElementById('safe-zone-overlay');`, add:

```js
  // ── Balance Panel ──────────────────────────────────────────────────────
  let balancePanel = null;
  let zoneDrawState = { active: false, startX: 0, startY: 0, currentRect: null };
  let nextZoneNum = 1;

  function getOrCreateBalancePanel() {
    if (!balancePanel) {
      balancePanel = new BalancePanel(canvasAreaEl, {
        onDeleteZone: (id) => {
          renderer.analysisZones = renderer.analysisZones.filter(z => z.id !== id);
          syncBalancePanel();
          renderCurrentFrame();
        },
        onClearAll: clearAllZones,
        onClose:    hideBalancePanel,
      });
    }
    return balancePanel;
  }

  function syncBalancePanel() {
    const panel = getOrCreateBalancePanel();
    const hasContent = renderer.analysisZones.length > 0 || renderer.showHeatmap;
    panel.setVisible(hasContent);
    panel.update(renderer.analysisZones, renderer.showHeatmap);
    // Update "Clear All Zones" in dropdown
    const clearBtn = tb.balanceDropdown?.querySelector('#balance-clear-zones');
    if (clearBtn) clearBtn.disabled = renderer.analysisZones.length === 0;
    // Update "Draw Zones" label with zone count
    const dzLabel = tb.balanceDropdown?.querySelector('#balance-draw-zones-label');
    if (dzLabel) {
      const n = renderer.analysisZones.length;
      dzLabel.title = n >= 8 ? 'Max 8 zones — clear some first' : '';
    }
    const dzChk = tb.balanceDropdown?.querySelector('#balance-draw-zones');
    if (dzChk) dzChk.disabled = renderer.analysisZones.length >= 8 && !zoneDrawState.active;
  }

  function clearAllZones() {
    renderer.analysisZones = [];
    nextZoneNum = 1;
    zoneDrawState.active = false;
    canvasWrapEl.classList.remove('zone-draw-mode');
    const dzChk = tb.balanceDropdown?.querySelector('#balance-draw-zones');
    if (dzChk) dzChk.checked = false;
    syncBalancePanel();
    renderCurrentFrame();
  }

  function hideBalancePanel() {
    if (balancePanel) balancePanel.setVisible(false);
  }
```

- [ ] **Step 4: Wire the `btn-balance` click to open/close the dropdown**

Find the block `tb.btnSafeZone.addEventListener(...)`. After `tb.btnLayers.addEventListener(...)`, add:

```js
  tb.btnBalance?.addEventListener('click', (e) => {
    const dd = tb.balanceDropdown;
    if (!dd) return;
    const isOpen = dd.style.display !== 'none';
    if (isOpen) {
      dd.style.display = 'none';
    } else {
      // Position dropdown below btn-balance
      const btnRect = tb.btnBalance.getBoundingClientRect();
      const toolbarRect = document.getElementById('toolbar').getBoundingClientRect();
      dd.style.display  = '';
      dd.style.position = 'fixed';
      dd.style.top      = `${btnRect.bottom + 4}px`;
      dd.style.left     = `${btnRect.left}px`;
      dd.style.zIndex   = '500';
    }
    e.stopPropagation();
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const dd = tb.balanceDropdown;
    if (!dd || dd.style.display === 'none') return;
    if (!dd.contains(e.target) && e.target !== tb.btnBalance) {
      dd.style.display = 'none';
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tb.balanceDropdown?.style.display !== 'none') {
      tb.balanceDropdown.style.display = 'none';
    }
  });
```

- [ ] **Step 5: Wire guide radio buttons**

Add after Step 4:

```js
  tb.balanceDropdown?.querySelectorAll('input[name="balance-guide"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const val = radio.value;
      if (val === renderer.activeGuide) {
        // Re-selecting spiral cycles orientation
        if (val === 'spiral') {
          renderer.spiralOrientation = (renderer.spiralOrientation + 1) % 4;
          prefs.spiral_orientation = renderer.spiralOrientation;
          storage.savePrefs(prefs);
        }
      }
      renderer.activeGuide = val === 'off' ? null : val;
      prefs.active_guide = renderer.activeGuide;
      storage.savePrefs(prefs);
      updateBalanceBtnState();
      renderCurrentFrame();
    });
  });

  // Restore active guide radio on page load
  if (renderer.activeGuide) {
    const radio = tb.balanceDropdown?.querySelector(`input[value="${renderer.activeGuide}"]`);
    if (radio) radio.checked = true;
  }

  function updateBalanceBtnState() {
    if (!tb.btnBalance) return;
    const isActive = renderer.activeGuide || renderer.showHeatmap || renderer.analysisZones.length > 0;
    tb.btnBalance.style.color = isActive ? 'var(--color-accent)' : '';
  }
```

- [ ] **Step 6: Wire heatmap toggle**

Add after Step 5:

```js
  tb.balanceDropdown?.querySelector('#balance-heatmap')?.addEventListener('change', (e) => {
    renderer.showHeatmap = e.target.checked;
    if (renderer.showHeatmap) {
      // Compute heatmap scores after current render
      requestAnimationFrame(() => {
        if (!project.isLoaded) return;
        const ctx = mainCanvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
        renderer._heatmapScores = buildHeatmap(imgData, mainCanvas.width, mainCanvas.height);
        renderCurrentFrame();
        syncBalancePanel();
      });
    } else {
      renderer._heatmapScores = null;
      syncBalancePanel();
      renderCurrentFrame();
    }
    updateBalanceBtnState();
  });
```

- [ ] **Step 7: Wire Draw Zones toggle and canvas mouse events**

```js
  tb.balanceDropdown?.querySelector('#balance-draw-zones')?.addEventListener('change', (e) => {
    zoneDrawState.active = e.target.checked;
    canvasWrapEl.classList.toggle('zone-draw-mode', zoneDrawState.active);
  });

  // Zone drawing — mousedown on canvas-wrap when draw mode active
  canvasWrapEl.addEventListener('mousedown', (e) => {
    if (!zoneDrawState.active || !project.isLoaded) return;
    if (e.button !== 0) return;
    // Prevent drag/select from firing — but only in draw mode
    e.stopPropagation();
    const rect   = mainCanvas.getBoundingClientRect();
    zoneDrawState.startX = e.clientX - rect.left;
    zoneDrawState.startY = e.clientY - rect.top;
    zoneDrawState.currentRect = null;
  }, true); // capture phase so we intercept before drag.js

  canvasWrapEl.addEventListener('mousemove', (e) => {
    if (!zoneDrawState.active || !project.isLoaded) return;
    if (!(e.buttons & 1)) return;
    const rect = mainCanvas.getBoundingClientRect();
    const ex   = e.clientX - rect.left;
    const ey   = e.clientY - rect.top;
    zoneDrawState.currentRect = {
      x: Math.min(zoneDrawState.startX, ex),
      y: Math.min(zoneDrawState.startY, ey),
      w: Math.abs(ex - zoneDrawState.startX),
      h: Math.abs(ey - zoneDrawState.startY),
    };
    // Live preview: render with a temporary zone rect
    renderCurrentFrame();
    // Draw live rect directly on top
    const ctx    = mainCanvas.getContext('2d');
    const scaleX = mainCanvas.width  / rect.width;
    const scaleY = mainCanvas.height / rect.height;
    const r      = zoneDrawState.currentRect;
    ctx.save();
    ctx.strokeStyle = 'rgba(90,200,250,0.9)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(r.x * scaleX, r.y * scaleY, r.w * scaleX, r.h * scaleY);
    ctx.restore();
  });

  canvasWrapEl.addEventListener('mouseup', (e) => {
    if (!zoneDrawState.active || !project.isLoaded) return;
    if (!zoneDrawState.currentRect) return;
    const rect   = mainCanvas.getBoundingClientRect();
    const r      = zoneDrawState.currentRect;
    // Ignore tiny drags
    if (r.w < 10 || r.h < 10) { zoneDrawState.currentRect = null; return; }

    // Convert CSS px → canvas px
    const scaleX = mainCanvas.width  / rect.width;
    const scaleY = mainCanvas.height / rect.height;
    const cx     = Math.round(r.x * scaleX);
    const cy     = Math.round(r.y * scaleY);
    const cw     = Math.round(r.w * scaleX);
    const ch     = Math.round(r.h * scaleY);

    // Clamp to canvas bounds
    const fx = Math.max(0, Math.min(cx, mainCanvas.width  - 1));
    const fy = Math.max(0, Math.min(cy, mainCanvas.height - 1));
    const fw = Math.min(cw, mainCanvas.width  - fx);
    const fh = Math.min(ch, mainCanvas.height - fy);

    if (fw < 4 || fh < 4) { zoneDrawState.currentRect = null; return; }

    // Pixel analysis
    const ctx     = mainCanvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
    const analysis = analyzeZone(imgData, mainCanvas.width, fx, fy, fw, fh);

    const zone = { id: `Z${nextZoneNum++}`, x: fx, y: fy, w: fw, h: fh, analysis };
    renderer.analysisZones = [...renderer.analysisZones, zone];
    zoneDrawState.currentRect = null;

    syncBalancePanel();
    renderCurrentFrame();
    updateBalanceBtnState();
    getOrCreateBalancePanel().setVisible(true);
  });
```

- [ ] **Step 8: Wire Clear All Zones button in the dropdown**

```js
  tb.balanceDropdown?.querySelector('#balance-clear-zones')?.addEventListener('click', () => {
    clearAllZones();
    tb.balanceDropdown.style.display = 'none';
  });
```

- [ ] **Step 9: Add `[B]` keyboard shortcut**

In `registerKeyboardShortcuts({...})`, add:

```js
    toggleBalance: () => {
      if (!project.isLoaded) return;
      const dd = tb.balanceDropdown;
      if (!dd) return;
      dd.style.display = dd.style.display === 'none' ? '' : 'none';
    },
```

Also register it: find `registerKeyboardShortcuts` in `shell.js` and add `'b'` mapping to `toggleBalance`. *(See Step 10.)*

- [ ] **Step 10: Add the `[B]` key mapping to `registerKeyboardShortcuts()` in `shell.js`**

Find `registerKeyboardShortcuts` in `frameforge/ui/shell.js`. Add `'b': actions.toggleBalance` to the key map, following the pattern of existing shortcuts.

- [ ] **Step 11: Clear zones on frame switch**

Find `function selectFrame(index)` in `app.js`. At the start of that function, after hiding toolbars, add:

```js
    // Clear analysis zones on frame switch
    if (renderer.analysisZones.length > 0) {
      renderer.analysisZones = [];
      nextZoneNum = 1;
      syncBalancePanel();
    }
    if (renderer.showHeatmap) {
      renderer._heatmapScores = null;
      // Heatmap will re-compute after renderCurrentFrame()
    }
```

Also wire heatmap recompute after `renderCurrentFrame()` in `selectFrame`: at the end of selectFrame, after `renderCurrentFrame()`:

```js
    if (renderer.showHeatmap) {
      requestAnimationFrame(() => {
        if (!project.isLoaded) return;
        const ctx2 = mainCanvas.getContext('2d');
        const imgData2 = ctx2.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
        renderer._heatmapScores = buildHeatmap(imgData2, mainCanvas.width, mainCanvas.height);
        renderCurrentFrame();
      });
    }
```

- [ ] **Step 12: Update `updateToolbarState` call signature (if needed)**

The existing calls to `updateToolbarState(tb, ...)` pass 3 extra booleans. The function signature only needs a new `btns.btnBalance` disable statement which was added in Task 5. No signature change needed.

- [ ] **Step 13: Commit**

```bash
git add frameforge/app.js frameforge/ui/shell.js
git commit -m "feat(balance): wire balance framework into app — guide selection, heatmap, zone draw"
```

---

## Task 8: End-to-End Verification

- [ ] **Step 1: Load a project with an image assigned**

Open the app, load a project JSON via "Load JSON", load images via "Load Images". Confirm a frame renders on canvas.

- [ ] **Step 2: Test composition guides**

Click the `⚖ ▾` button in the toolbar. Confirm dropdown opens. Select "Rule of Thirds". Confirm 2 H + 2 V lines with intersection dots appear on canvas. Select "Phi Grid" — lines shift proportionally. Select "Golden Spiral" — four spirals appear. Click "Golden Spiral" again — one spiral brightens (orientation cycles). Select "Off" — guides disappear.

- [ ] **Step 3: Test keyboard shortcut**

Press `B`. Confirm dropdown toggles open/closed.

- [ ] **Step 4: Test reload persistence**

Select "Phi Grid", reload page, reload project. Confirm "Phi Grid" is still active.

- [ ] **Step 5: Test heatmap**

Open dropdown. Check "Weight Heatmap". Confirm blue-to-amber cell overlay appears on canvas. Open panel appears on the right. Uncheck heatmap — cells disappear, panel hides.

- [ ] **Step 6: Test Draw Zones**

Check "Draw Zones" in dropdown. Close dropdown. Drag a rectangle on the canvas. Confirm: cyan rectangle appears, Balance Panel opens, zone card shows luminance / contrast / weight / dominant color / WCAG recommendation.

- [ ] **Step 7: Test zone limit**

Draw 8 zones. Confirm "Draw Zones" checkbox disables. Draw a 9th (should be impossible). Confirm zone list stops at 8.

- [ ] **Step 8: Test zone delete**

Click × on a zone card. Confirm zone rectangle disappears from canvas and card is gone from panel.

- [ ] **Step 9: Test Clear All Zones**

Draw 2 zones. Click "Clear All Zones" in panel. Confirm canvas is clean, panel hides.

- [ ] **Step 10: Test frame switch cleanup**

Draw zones on frame 1. Navigate to frame 2. Confirm zones are gone. Navigate back to frame 1. Confirm zones are gone (session-only by design).

- [ ] **Step 11: Test export safety**

With a guide active and heatmap on: Export This frame. Confirm downloaded image has no overlay lines, no heatmap.

- [ ] **Step 12: Commit final verification**

```bash
git add -A
git commit -m "feat(balance): complete visual balance framework — guides, heatmap, zone analysis"
```

---

## Summary of Commits

1. `feat(balance): add visual-analysis module with zone and heatmap scoring`
2. `feat(balance): add composition guide drawing to renderer`
3. `feat(balance): add heatmap and zone overlay drawing to renderer`
4. `feat(balance): add BalancePanel component`
5. `feat(balance): add btn-balance and dropdown to toolbar`
6. `feat(balance): add dropdown and balance panel styles`
7. `feat(balance): wire balance framework into app — guide selection, heatmap, zone draw`
8. `feat(balance): complete visual balance framework — guides, heatmap, zone analysis`
