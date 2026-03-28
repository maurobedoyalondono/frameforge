# Brief Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scrollable New Project Brief modal with a 5-step wizard that imports images via file picker, generates an Export Package (brief text + canvas mockups + thumbnail sheets), and copies a prompt — all aligned with the AI manual.

**Architecture:** Three files — `brief-thumbnails.js` (thumbnail sheet generator), `brief-mockups.js` (canvas mockup generator), and a rewritten `concept-builder.js` (wizard UI). The `ConceptBuilder` receives an `onImages` callback from `app.js` so imported images go directly to the main tray. Export Package downloads everything sequentially in one click.

**Tech Stack:** Vanilla JS ES2022 modules, HTML5 Canvas API, FileReader API, no build step.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `ui/brief-thumbnails.js` | Create | Thumbnail sheet generator: constants, `generateThumbnailSheets()`, `fileToImageElement()` |
| `ui/brief-mockups.js` | Create | Sample design mockup generator: `generateMockups()`, all canvas drawing functions |
| `ui/concept-builder.js` | Full rewrite | 5-step wizard, file picker, updated brief/prompt builders (no hero/context), calls brief-thumbnails + brief-mockups at export |
| `app.js` | Modify (1 line) | Pass `handleImageFiles` callback to `conceptBuilder.open()` |
| `styles/components.css` | Modify | Add `.cb-wizard-*` CSS classes for progress bar + step panels |
| `docs/spec-app.md` | Modify | Update Part X to reflect new wizard workflow |

---

## Task 1: Create `ui/brief-thumbnails.js`

**Files:**
- Create: `ui/brief-thumbnails.js`

- [ ] **Step 1: Create the file with constants and `fileToImageElement()`**

```js
/**
 * brief-thumbnails.js — Thumbnail sheet generator for the Brief Export Package.
 *
 * Renders loaded images as a grid of thumbnails (cropped center-fill to the
 * selected aspect ratio), grouped into sheets of THUMB_COLS × THUMB_ROWS images.
 *
 * Constants are exported so callers can show the user the derived dimensions.
 */

export const THUMB_BASE = 200;  // base width px — change to adjust all thumbnail sizes
export const THUMB_COLS = 5;    // columns per sheet
export const THUMB_ROWS = 2;    // rows per sheet  → 10 images per sheet at defaults

const LABEL_H = 24;             // height of the sheet label strip at bottom (px)

/**
 * Load a File into an HTMLImageElement via object URL.
 * The object URL is revoked automatically after the image loads.
 *
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
export function fileToImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)); };
    img.src = url;
  });
}
```

- [ ] **Step 2: Add `generateThumbnailSheets()`**

Append to the same file:

```js
/**
 * Generate thumbnail sheets from an array of HTMLImageElement objects.
 * Images are grouped into sheets of THUMB_COLS × THUMB_ROWS.
 * Each image is cropped center-fill to thumbW × thumbH.
 *
 * @param {HTMLImageElement[]} images
 * @param {number} thumbW  — thumbnail cell width in px
 * @param {number} thumbH  — thumbnail cell height in px
 * @returns {Promise<Blob[]>}  one PNG Blob per sheet
 */
export async function generateThumbnailSheets(images, thumbW, thumbH) {
  const perSheet = THUMB_COLS * THUMB_ROWS;
  const sheetW   = THUMB_COLS * thumbW;
  const sheetH   = THUMB_ROWS * thumbH + LABEL_H;
  const blobs    = [];

  for (let s = 0; s * perSheet < images.length; s++) {
    const batch  = images.slice(s * perSheet, (s + 1) * perSheet);
    const canvas = document.createElement('canvas');
    canvas.width  = sheetW;
    canvas.height = sheetH;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, sheetW, sheetH);

    batch.forEach((img, i) => {
      const col = i % THUMB_COLS;
      const row = Math.floor(i / THUMB_COLS);
      const x   = col * thumbW;
      const y   = row * thumbH;

      // Clip to cell
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, thumbW, thumbH);
      ctx.clip();

      // Center-fill crop
      const scale = Math.max(thumbW / img.naturalWidth, thumbH / img.naturalHeight);
      const drawW = img.naturalWidth  * scale;
      const drawH = img.naturalHeight * scale;
      ctx.drawImage(img,
        x + (thumbW - drawW) / 2,
        y + (thumbH - drawH) / 2,
        drawW, drawH,
      );
      ctx.restore();

      // Cell border
      ctx.strokeStyle = '#2a2a3e';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, thumbW - 1, thumbH - 1);

      // Image number badge (top-left of cell)
      const num = s * perSheet + i + 1;
      ctx.fillStyle = 'rgba(0,0,0,0.70)';
      ctx.fillRect(x, y, 24, 17);
      ctx.fillStyle = '#e8e8f0';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(num), x + 12, y + 8);
    });

    // Sheet label strip
    const start = s * perSheet + 1;
    const end   = Math.min((s + 1) * perSheet, images.length);
    ctx.fillStyle = '#222230';
    ctx.fillRect(0, THUMB_ROWS * thumbH, sheetW, LABEL_H);
    ctx.strokeStyle = '#3a3a46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, THUMB_ROWS * thumbH + 0.5);
    ctx.lineTo(sheetW, THUMB_ROWS * thumbH + 0.5);
    ctx.stroke();
    ctx.fillStyle    = '#9898b0';
    ctx.font         = '12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `Sheet ${s + 1} — Images ${start}–${end}`,
      sheetW / 2,
      THUMB_ROWS * thumbH + LABEL_H / 2,
    );

    blobs.push(await canvasToBlob(canvas));
  }

  return blobs;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
```

- [ ] **Step 3: Verify in browser console**

Open `frameforge/index.html` in a browser. In DevTools console:

```js
import { fileToImageElement, generateThumbnailSheets, THUMB_BASE, THUMB_COLS, THUMB_ROWS }
  from './ui/brief-thumbnails.js';
console.log(THUMB_BASE, THUMB_COLS, THUMB_ROWS); // should log: 200 5 2
```

Expected: no errors, constants print correctly.

- [ ] **Step 4: Commit**

```bash
git add ui/brief-thumbnails.js
git commit -m "feat: add brief-thumbnails module (thumbnail sheet generator)"
```

---

## Task 2: Create `ui/brief-mockups.js`

**Files:**
- Create: `ui/brief-mockups.js`

- [ ] **Step 1: Create the file with constants**

```js
/**
 * brief-mockups.js — Sample design mockup generator for the Brief Export Package.
 *
 * Generates 3 layout mockups as PNG Blobs for the selected platform.
 * Each mockup is a canvas with three zones:
 *   - Composition zone (~65%): layout with placeholder elements + callout annotations
 *   - Element specs strip (~15%): headline/subhead/body sizes, rule, circle, safe zone, gradient
 *   - Size variants panel (~20%): all platform silhouettes, selected one highlighted
 *
 * No real images are needed — all drawing is done in code.
 */

// ── Platform registry (mirrors concept-builder.js) ───────────────────────────
// brief-mockups.js owns this list independently so it doesn't depend on
// concept-builder.js. Keep in sync with PLATFORMS in concept-builder.js.

const PLATFORMS = [
  { value: 'instagram-portrait', label: 'Instagram Portrait', shortLabel: 'Portrait',  w: 1080, h: 1350, dpi: 72  },
  { value: 'instagram-square',   label: 'Instagram Square',   shortLabel: 'Square',    w: 1080, h: 1080, dpi: 72  },
  { value: 'instagram-story',    label: 'Instagram Story',    shortLabel: 'Story',     w: 1080, h: 1920, dpi: 72  },
  { value: 'facebook-feed',      label: 'Facebook Feed',      shortLabel: 'FB Feed',   w: 1200, h:  630, dpi: 72  },
  { value: 'facebook-cover',     label: 'Facebook Cover',     shortLabel: 'FB Cover',  w:  820, h:  312, dpi: 72  },
  { value: 'print-a4-portrait',  label: 'Print A4 Portrait',  shortLabel: 'A4 Port.',  w: 2480, h: 3508, dpi: 300 },
  { value: 'print-a4-landscape', label: 'Print A4 Landscape', shortLabel: 'A4 Land.',  w: 3508, h: 2480, dpi: 300 },
];

// ── Layout definitions ────────────────────────────────────────────────────────
// All pixel values are at 1080px canvas width — scale by (canvasW / 1080).
// textZonePct = proportion of composition height occupied by the text/gradient zone.

const LAYOUTS = [
  {
    name:         'Top-heavy',
    textZone:     'top',
    gradient:     'to-top',
    textZonePct:  0.38,
    headlinePx:   72,
    subheadPx:    36,
    bodyPx:       24,
    rulePx:       2,
    circlePx:     80,
    safeZonePct:  0.05,
  },
  {
    name:         'Bottom-anchor',
    textZone:     'bottom',
    gradient:     'to-bottom',
    textZonePct:  0.42,
    headlinePx:   72,
    subheadPx:    36,
    bodyPx:       24,
    rulePx:       2,
    circlePx:     80,
    safeZonePct:  0.05,
  },
  {
    name:         'Center-split',
    textZone:     'center',
    gradient:     'none',
    textZonePct:  0.30,
    headlinePx:   64,
    subheadPx:    32,
    bodyPx:       20,
    rulePx:       2,
    circlePx:     60,
    safeZonePct:  0.05,
  },
];

// ── Canvas size limits ────────────────────────────────────────────────────────

const MAX_MOCKUP_W = 1080;
const MIN_COMP_H   = 300;
const MIN_SPECS_H  = 100;
const MIN_VARS_H   = 140;
```

- [ ] **Step 2: Add the public API — `generateMockups()`**

Append to the same file:

```js
// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate 3 sample design mockups for the given platform.
 * Each mockup corresponds to one entry in LAYOUTS.
 *
 * @param {{ value: string, label: string, w: number, h: number, dpi: number }} platform
 *   Pass the platform object from the PLATFORMS list in concept-builder.js.
 *   For custom platforms, synthesize: { value: 'custom', label: 'Custom', w, h, dpi: 72 }
 * @returns {Promise<Blob[]>}  array of 3 PNG Blobs, one per layout
 */
export async function generateMockups(platform) {
  return Promise.all(LAYOUTS.map((layout) => _renderMockup(platform, layout)));
}

// ── Internal rendering ────────────────────────────────────────────────────────

async function _renderMockup(platform, layout) {
  const mockupW = Math.min(platform.w || MAX_MOCKUP_W, MAX_MOCKUP_W);
  const rawH    = Math.round(mockupW * (platform.h || mockupW) / (platform.w || mockupW));

  const specsH = Math.max(MIN_SPECS_H, Math.round(rawH * 0.15));
  const varsH  = Math.max(MIN_VARS_H,  Math.round(rawH * 0.20));
  const compH  = Math.max(MIN_COMP_H,  rawH - specsH - varsH);
  const totalH = compH + specsH + varsH;

  const canvas = document.createElement('canvas');
  canvas.width  = mockupW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  _drawComposition(ctx, mockupW, compH, layout);
  _drawSpecsStrip(ctx, 0, compH, mockupW, specsH, layout, platform);
  _drawVariantsPanel(ctx, 0, compH + specsH, mockupW, varsH, platform.value);

  return _canvasToBlob(canvas);
}
```

- [ ] **Step 3: Add composition drawing functions**

Append to the same file:

```js
function _drawComposition(ctx, w, h, layout) {
  const scale   = w / 1080;
  const safe    = Math.round(w * layout.safeZonePct);
  const rulePx  = Math.max(1, Math.round(layout.rulePx  * scale));
  const circleR = Math.round(layout.circlePx * scale / 2);

  // Background
  ctx.fillStyle = '#12121e';
  ctx.fillRect(0, 0, w, h);

  // Photo placeholder
  ctx.fillStyle = '#252535';
  ctx.fillRect(safe, safe, w - safe * 2, h - safe * 2);

  // Safe zone dashed border
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#3a3a5a';
  ctx.lineWidth = 1;
  ctx.strokeRect(safe + 0.5, safe + 0.5, w - safe * 2 - 1, h - safe * 2 - 1);
  ctx.setLineDash([]);

  // Gradient overlay
  if (layout.gradient !== 'none') {
    const zoneH = Math.round(h * layout.textZonePct);
    const isTop = layout.gradient === 'to-top';
    const grad  = ctx.createLinearGradient(
      0, isTop ? 0 : h,
      0, isTop ? zoneH : h - zoneH,
    );
    grad.addColorStop(0, 'rgba(12,12,22,0.92)');
    grad.addColorStop(1, 'rgba(12,12,22,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, isTop ? 0 : h - zoneH, w, zoneH);
  } else {
    ctx.fillStyle = 'rgba(12,12,22,0.45)';
    ctx.fillRect(0, 0, w, h);
  }

  // Layout elements
  if (layout.textZone === 'top') {
    _drawTopLayout(ctx, w, h, safe, scale, layout, rulePx, circleR);
  } else if (layout.textZone === 'bottom') {
    _drawBottomLayout(ctx, w, h, safe, scale, layout, rulePx, circleR);
  } else {
    _drawCenterLayout(ctx, w, h, safe, scale, layout, rulePx, circleR);
  }
}

function _drawTopLayout(ctx, w, h, safe, scale, layout, rulePx, circleR) {
  const headH  = Math.round(layout.headlinePx * scale * 1.2);
  const subH   = Math.round(layout.subheadPx  * scale * 1.2);
  const bodyH  = Math.round(layout.bodyPx     * scale * 1.2);
  const gap    = Math.round(safe * 0.45);
  const blockW = Math.round(w * 0.60);
  let y = safe + gap;

  // Headline
  ctx.fillStyle = '#e8e8f0';
  ctx.fillRect(safe, y, blockW, headH);
  _callout(ctx, safe + blockW + 8, y + headH / 2, `${layout.headlinePx}px`);
  y += headH + gap;

  // Subhead
  ctx.fillStyle = '#9898b0';
  ctx.fillRect(safe, y, Math.round(blockW * 0.72), subH);
  y += subH + gap;

  // Rule
  ctx.fillStyle = '#5b8aff';
  ctx.fillRect(safe, y, Math.round(w * 0.38), rulePx);
  _callout(ctx, safe + Math.round(w * 0.38) + 8, y, `${layout.rulePx}px rule`);
  y += rulePx + gap;

  // Body
  ctx.fillStyle = '#606078';
  ctx.fillRect(safe, y, Math.round(blockW * 0.52), bodyH);
  _callout(ctx, safe + Math.round(blockW * 0.52) + 8, y + bodyH / 2, `${layout.bodyPx}px`);

  // Circle — bottom-right
  const cx = w - safe - circleR;
  const cy = h - safe - circleR;
  ctx.strokeStyle = '#5b8aff';
  ctx.lineWidth = Math.max(1, Math.round(2 * scale));
  ctx.beginPath(); ctx.arc(cx, cy, circleR, 0, Math.PI * 2); ctx.stroke();
  _callout(ctx, cx - circleR - 8, cy, `${layout.circlePx}px`, true);
}

function _drawBottomLayout(ctx, w, h, safe, scale, layout, rulePx, circleR) {
  const headH  = Math.round(layout.headlinePx * scale * 1.2);
  const subH   = Math.round(layout.subheadPx  * scale * 1.2);
  const bodyH  = Math.round(layout.bodyPx     * scale * 1.2);
  const gap    = Math.round(safe * 0.45);
  const blockW = Math.round(w * 0.62);
  let y = h - safe;

  // Body (bottom-most visible)
  y -= bodyH;
  ctx.fillStyle = '#606078';
  ctx.fillRect(safe, y, Math.round(blockW * 0.50), bodyH);
  _callout(ctx, safe + Math.round(blockW * 0.50) + 8, y + bodyH / 2, `${layout.bodyPx}px`);
  y -= gap;

  // Subhead
  y -= subH;
  ctx.fillStyle = '#9898b0';
  ctx.fillRect(safe, y, Math.round(blockW * 0.72), subH);
  y -= gap;

  // Headline
  y -= headH;
  ctx.fillStyle = '#e8e8f0';
  ctx.fillRect(safe, y, blockW, headH);
  _callout(ctx, safe + blockW + 8, y + headH / 2, `${layout.headlinePx}px`);
  y -= gap;

  // Rule above headline
  y -= rulePx;
  ctx.fillStyle = '#5b8aff';
  ctx.fillRect(safe, y, Math.round(w * 0.38), rulePx);
  _callout(ctx, safe + Math.round(w * 0.38) + 8, y, `${layout.rulePx}px rule`);

  // Circle — top-right
  const cx = w - safe - circleR;
  const cy = safe + circleR;
  ctx.strokeStyle = '#5b8aff';
  ctx.lineWidth = Math.max(1, Math.round(2 * scale));
  ctx.beginPath(); ctx.arc(cx, cy, circleR, 0, Math.PI * 2); ctx.stroke();
  _callout(ctx, cx - circleR - 8, cy, `${layout.circlePx}px`, true);
}

function _drawCenterLayout(ctx, w, h, safe, scale, layout, rulePx, circleR) {
  const headH  = Math.round(layout.headlinePx * scale * 1.2);
  const subH   = Math.round(layout.subheadPx  * scale * 1.2);
  const bodyH  = Math.round(layout.bodyPx     * scale * 1.2);
  const gap    = Math.round(safe * 0.45);
  const colW   = Math.round(w * 0.52);
  const colX   = Math.round((w - colW) / 2);

  const totalH = rulePx + gap + headH + gap + subH + gap + bodyH + gap + rulePx;
  let y = Math.round((h - totalH) / 2);

  // Top rule
  ctx.fillStyle = '#5b8aff';
  ctx.fillRect(colX, y, colW, rulePx);
  _callout(ctx, colX + colW + 8, y, `${layout.rulePx}px rule`);
  y += rulePx + gap;

  // Headline
  ctx.fillStyle = '#e8e8f0';
  ctx.fillRect(colX, y, colW, headH);
  _callout(ctx, colX + colW + 8, y + headH / 2, `${layout.headlinePx}px`);
  y += headH + gap;

  // Subhead
  ctx.fillStyle = '#9898b0';
  ctx.fillRect(colX + Math.round(colW * 0.10), y, Math.round(colW * 0.80), subH);
  y += subH + gap;

  // Body
  ctx.fillStyle = '#606078';
  ctx.fillRect(colX + Math.round(colW * 0.20), y, Math.round(colW * 0.60), bodyH);
  _callout(ctx, colX + colW + 8, y + bodyH / 2, `${layout.bodyPx}px`);
  y += bodyH + gap;

  // Bottom rule
  ctx.fillStyle = '#5b8aff';
  ctx.fillRect(colX, y, colW, rulePx);

  // Corner circles
  [[safe + circleR, safe + circleR], [w - safe - circleR, safe + circleR],
   [safe + circleR, h - safe - circleR], [w - safe - circleR, h - safe - circleR]]
    .forEach(([cx, cy]) => {
      ctx.strokeStyle = '#5b8aff';
      ctx.lineWidth = Math.max(1, Math.round(2 * scale));
      ctx.beginPath(); ctx.arc(cx, cy, circleR, 0, Math.PI * 2); ctx.stroke();
    });
  _callout(ctx, safe + circleR * 2 + 8, safe + circleR, `${layout.circlePx}px circles`);
}
```

- [ ] **Step 4: Add specs strip, variants panel, and helper functions**

Append to the same file:

```js
function _drawSpecsStrip(ctx, x, y, w, h, layout, platform) {
  ctx.fillStyle = '#0e0e1a';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3a3a46';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + w, y + 0.5); ctx.stroke();

  const pad     = 16;
  const lineH   = Math.max(16, Math.round(h / 4));
  const safeRaw = Math.round((platform.w || 1080) * layout.safeZonePct);
  const zoneLabel = layout.textZone === 'center'
    ? `center (${Math.round(layout.textZonePct * 100)}%)`
    : `${layout.textZone} (${Math.round(layout.textZonePct * 100)}%)`;

  const lines = [
    `Headline: ${layout.headlinePx}px  ·  Subhead: ${layout.subheadPx}px  ·  Body: ${layout.bodyPx}px`,
    `Rule: ${layout.rulePx}px  ·  Circle: ${layout.circlePx}px  ·  Safe zone: ${safeRaw}px (${Math.round(layout.safeZonePct * 100)}%)`,
    `Text zone: ${zoneLabel}  ·  Gradient: ${layout.gradient}  ·  Layout: ${layout.name}`,
    `Platform: ${platform.label}  ·  ${platform.w}×${platform.h}px  ·  ${platform.dpi}dpi`,
  ];

  const totalTextH = lines.length * lineH;
  const startY = y + Math.round((h - totalTextH) / 2);

  ctx.font         = '11px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';

  lines.forEach((line, i) => {
    ctx.fillStyle = i === lines.length - 1 ? '#606078' : '#9898b0';
    ctx.fillText(line, x + pad, startY + i * lineH + lineH / 2);
  });
}

function _drawVariantsPanel(ctx, x, y, w, h, activePlatformValue) {
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3a3a46';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + w, y + 0.5); ctx.stroke();

  const count  = PLATFORMS.length;
  const cellW  = Math.floor(w / count);
  const pad    = 6;
  const labelH = 28;
  const maxSilH = h - labelH - pad * 2;
  const maxSilW = cellW - pad * 2;

  PLATFORMS.forEach((p, i) => {
    const isActive = p.value === activePlatformValue;
    const cx = x + i * cellW;
    const aspect = p.h / p.w;
    let silW, silH;

    if (aspect >= 1) {
      silH = Math.min(maxSilH, Math.round(maxSilW / (1 / aspect)));
      silW = Math.round(silH / aspect);
      if (silW > maxSilW) { silW = maxSilW; silH = Math.round(silW * aspect); }
    } else {
      silW = maxSilW;
      silH = Math.round(silW * aspect);
      if (silH > maxSilH) { silH = maxSilH; silW = Math.round(silH / aspect); }
    }

    const sx = cx + Math.round((cellW - silW) / 2);
    const sy = y + pad + Math.round((maxSilH - silH) / 2);

    ctx.fillStyle = isActive ? '#3a5cbf' : '#252535';
    ctx.fillRect(sx, sy, silW, silH);

    if (isActive) {
      ctx.strokeStyle = '#5b8aff';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 1, sy - 1, silW + 2, silH + 2);
    }

    ctx.font         = isActive ? `bold ${Math.max(8, Math.round(cellW / 8))}px sans-serif` : `${Math.max(7, Math.round(cellW / 9))}px sans-serif`;
    ctx.fillStyle    = isActive ? '#e8e8f0' : '#606078';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(p.shortLabel, cx + cellW / 2, y + h - 14);
    ctx.font         = `${Math.max(7, Math.round(cellW / 10))}px sans-serif`;
    ctx.fillStyle    = isActive ? '#9898b0' : '#404050';
    ctx.fillText(`${p.w}×${p.h}`, cx + cellW / 2, y + h - 2);
  });
}

function _callout(ctx, x, y, label, rtl = false) {
  ctx.save();
  ctx.font = '9px sans-serif';
  const tw = ctx.measureText(label).width + 8;
  const th = 15;
  const tx = rtl ? x - tw : x;
  ctx.fillStyle = 'rgba(20,20,35,0.88)';
  ctx.fillRect(tx, y - th / 2, tw, th);
  ctx.fillStyle    = '#f5c518';
  ctx.textAlign    = rtl ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rtl ? x - 4 : x + 4, y);
  ctx.restore();
}

function _canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
```

- [ ] **Step 5: Verify in browser console**

Open `frameforge/index.html` in browser. In DevTools console:

```js
import { generateMockups } from './ui/brief-mockups.js';
const blobs = await generateMockups({
  value: 'instagram-portrait', label: 'Instagram Portrait',
  w: 1080, h: 1350, dpi: 72,
});
console.log(blobs.length, blobs[0].size);
// Expected: 3 blobs, each > 10000 bytes

// Preview the first mockup
const url = URL.createObjectURL(blobs[0]);
window.open(url);
// Expected: a new tab showing the Top-heavy mockup PNG with all 3 zones
```

Inspect the PNG: composition zone should show placeholder text blocks, callout labels in yellow, a circle, rule line; specs strip should show 4 lines of measurements; variants panel should show all 7 platform silhouettes with Instagram Portrait highlighted.

- [ ] **Step 6: Commit**

```bash
git add ui/brief-mockups.js
git commit -m "feat: add brief-mockups module (canvas sample design generator)"
```

---

## Task 3: Rewrite `concept-builder.js` — wizard skeleton + steps 1-2

**Files:**
- Modify: `ui/concept-builder.js` (full rewrite)
- Modify: `styles/components.css` (add wizard CSS)

- [ ] **Step 1: Add wizard CSS to `styles/components.css`**

Append after the last `.cb-*` rule block in `components.css`:

```css
/* ── Concept Builder Wizard ───────────────────────────────────────────────── */

.cb-wizard-progress {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 10px 24px 8px;
  border-bottom: 1px solid var(--color-border);
}

.cb-wizard-step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-bg-surface);
  border: 2px solid var(--color-border);
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}

.cb-wizard-step-dot.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.cb-wizard-step-dot.done {
  background: var(--color-success);
  border-color: var(--color-success);
}

.cb-wizard-step-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
  margin: 0 6px;
  transition: color 0.15s;
}

.cb-wizard-step-label.active { color: var(--color-accent); }
.cb-wizard-step-label.done   { color: var(--color-success); }

.cb-wizard-connector {
  flex: 1;
  height: 1px;
  background: var(--color-border);
  margin: 0 2px;
}

.cb-step {
  display: none;
  flex-direction: column;
  gap: var(--space-6);
}

.cb-step.active { display: flex; }

.cb-wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.cb-wizard-next {
  min-width: 100px;
}

.cb-import-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-9);
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  text-align: center;
  transition: border-color 0.15s;
}

.cb-import-zone:hover { border-color: var(--color-accent); }

.cb-import-count {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-success);
}

.cb-import-meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.cb-ratio-row {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  flex-wrap: wrap;
}

.cb-ratio-custom { display: flex; gap: var(--space-3); align-items: center; }

.cb-export-status {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-height: 18px;
  text-align: center;
}

.cb-export-status.done  { color: var(--color-success); }
.cb-export-status.error { color: var(--color-error); }

.cb-copy-done {
  font-size: var(--font-size-sm);
  color: var(--color-success);
  min-height: 18px;
  text-align: center;
}

.cb-prompt-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  text-align: center;
}
```

- [ ] **Step 2: Write the new `concept-builder.js` — imports + constants**

Replace the entire content of `ui/concept-builder.js`:

```js
/**
 * concept-builder.js — "New Project Brief" 5-step wizard.
 *
 * Step 1: Title & Story
 * Step 2: Tone & Style
 * Step 3: Import Images (file picker → onImages callback → tray)
 * Step 4: Export Package (brief .txt + 3 mockup PNGs + thumbnail sheets)
 * Step 5: Copy Prompt
 */

import { AI_MANUAL } from '../data/ai-manual-content.js';
import { generateMockups } from './brief-mockups.js';
import {
  THUMB_BASE, THUMB_COLS, THUMB_ROWS,
  fileToImageElement, generateThumbnailSheets,
} from './brief-thumbnails.js';

// ── Platform presets (keep in sync with brief-mockups.js) ────────────────────

const PLATFORMS = [
  { value: 'instagram-portrait', label: 'Instagram Portrait 4:5 (1080×1350)', w: 1080, h: 1350, dpi: 72  },
  { value: 'instagram-square',   label: 'Instagram Square 1:1 (1080×1080)',   w: 1080, h: 1080, dpi: 72  },
  { value: 'instagram-story',    label: 'Instagram Story 9:16 (1080×1920)',   w: 1080, h: 1920, dpi: 72  },
  { value: 'facebook-feed',      label: 'Facebook Feed (1200×630)',            w: 1200, h:  630, dpi: 72  },
  { value: 'facebook-cover',     label: 'Facebook Cover (820×312)',            w:  820, h:  312, dpi: 72  },
  { value: 'print-a4-portrait',  label: 'Print A4 Portrait (2480×3508)',       w: 2480, h: 3508, dpi: 300 },
  { value: 'print-a4-landscape', label: 'Print A4 Landscape (3508×2480)',      w: 3508, h: 2480, dpi: 300 },
  { value: 'custom',             label: 'Custom…',                             w: null, h: null, dpi: 72  },
];

const TONES = [
  { value: '',                   label: '— Let the AI decide —' },
  { value: 'warm-poetic',        label: 'Warm & poetic — editorial captions, intimate' },
  { value: 'bold-documentary',   label: 'Bold & documentary — strong statements, activist' },
  { value: 'minimal-clean',      label: 'Minimal & clean — sparse text, let the photo speak' },
  { value: 'dramatic-cinematic', label: 'Dramatic & cinematic — high contrast, epic scale' },
  { value: 'luxury-refined',     label: 'Luxury & refined — elegant, understated, fine art' },
  { value: 'custom',             label: 'Custom…' },
];

// Aspect ratio presets for thumbnail sheets
const THUMB_RATIOS = [
  { value: '1x1', label: '1×1', w: 1, h: 1 },
  { value: '4x5', label: '4×5', w: 4, h: 5 },
  { value: '2x3', label: '2×3', w: 2, h: 3 },
  { value: 'custom', label: 'Custom…', w: null, h: null },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function yieldToUI() {
  return new Promise((r) => setTimeout(r, 0));
}
```

- [ ] **Step 3: Add the `ConceptBuilder` class with state + `open()`**

Append to `concept-builder.js`:

```js
// ── ConceptBuilder ────────────────────────────────────────────────────────────

export class ConceptBuilder {
  constructor() {
    this._backdrop   = null;
    this._step       = 1;
    this._onImages   = null;
    this._onKeyDown  = null;

    // Step 1 state
    this._title    = '';
    this._platform = 'instagram-portrait';
    this._customW  = '';
    this._customH  = '';
    this._story    = '';
    this._notes    = '';

    // Step 2 state
    this._tone       = '';
    this._toneCustom = '';

    // Step 3 state
    this._imageFiles    = [];   // File[]
    this._imageElements = [];   // HTMLImageElement[]  (loaded on import for thumb export)
    this._thumbRatioVal = '1x1';
    this._thumbCustomW  = String(THUMB_BASE);
    this._thumbCustomH  = String(THUMB_BASE);
  }

  /**
   * Open the wizard.
   * @param {function(File[]): void} onImages  — called immediately when the user
   *   selects images; forward to app's handleImageFiles to populate the tray.
   */
  open(onImages) {
    if (this._backdrop) return;

    // Reset state
    this._step          = 1;
    this._onImages      = onImages ?? null;
    this._title         = '';
    this._platform      = 'instagram-portrait';
    this._customW       = '';
    this._customH       = '';
    this._story         = '';
    this._notes         = '';
    this._tone          = '';
    this._toneCustom    = '';
    this._imageFiles    = [];
    this._imageElements = [];
    this._thumbRatioVal = '1x1';
    this._thumbCustomW  = String(THUMB_BASE);
    this._thumbCustomH  = String(THUMB_BASE);

    this._render();
  }
```

- [ ] **Step 4: Add `_render()` — modal shell with progress bar**

Append to `concept-builder.js` (inside the class):

```js
  // ── Rendering ──────────────────────────────────────────────────────────────

  _render() {
    const STEP_LABELS = ['Title', 'Tone', 'Images', 'Export', 'Prompt'];

    const progressDots = STEP_LABELS.map((label, i) => {
      const num   = i + 1;
      const state = num < this._step ? 'done' : num === this._step ? 'active' : '';
      return `
        ${i > 0 ? '<div class="cb-wizard-connector"></div>' : ''}
        <div class="cb-wizard-step-dot ${state}" data-step="${num}"></div>
        <span class="cb-wizard-step-label ${state}">${label}</span>
      `;
    }).join('');

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop cb-backdrop';
    backdrop.innerHTML = `
      <div class="cb-modal" role="dialog" aria-modal="true" aria-label="New Project Brief">

        <div class="cb-header">
          <div class="cb-header-left">
            <span class="cb-title">New Project Brief</span>
            <span class="cb-subtitle">Fill this in, then share the exported package + your photos with the AI model</span>
          </div>
          <button class="btn btn-ghost btn-icon cb-close" aria-label="Close">✕</button>
        </div>

        <div class="cb-wizard-progress">${progressDots}</div>

        <div class="cb-body">
          ${this._renderStep1()}
          ${this._renderStep2()}
          ${this._renderStep3()}
          ${this._renderStep4()}
          ${this._renderStep5()}
        </div>

        <div class="cb-wizard-footer">
          <button class="btn btn-ghost" id="cb-back"
            ${this._step === 1 ? 'style="visibility:hidden"' : ''}>← Back</button>
          <div id="cb-step-indicator" style="font-size:11px;color:var(--color-text-muted)">
            Step ${this._step} of 5
          </div>
          ${this._step < 5
            ? `<button class="btn btn-primary cb-wizard-next" id="cb-next"
                ${this._step === 1 && !this._title.trim() ? 'disabled' : ''}>Next →</button>`
            : `<button class="btn btn-ghost" id="cb-close-final">Close</button>`
          }
        </div>

      </div>
    `;

    this._backdrop = backdrop;
    document.body.appendChild(backdrop);
    this._activateStep(this._step);
    this._bindEvents();
    setTimeout(() => backdrop.querySelector('#cb-title')?.focus(), 60);
  }

  _activateStep(step) {
    if (!this._backdrop) return;
    this._backdrop.querySelectorAll('.cb-step').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
  }
```

- [ ] **Step 5: Add `_renderStep1()` and `_renderStep2()`**

Append to `concept-builder.js`:

```js
  _renderStep1() {
    const slug = this._title ? toSlug(this._title) : '';
    return `
      <div class="cb-step ${this._step === 1 ? 'active' : ''}" data-step="1">
        <div class="cb-field">
          <label class="cb-label" for="cb-title">Title <span class="cb-required">*</span></label>
          <input type="text" id="cb-title" class="input cb-input"
            placeholder="e.g. Family Moments — Patagonia Trip"
            value="${escHtml(this._title)}" autocomplete="off">
          <div class="cb-field-hint" id="cb-slug-preview">${slug ? `ID: ${slug}` : 'ID: —'}</div>
        </div>

        <div class="cb-field">
          <label class="cb-label" for="cb-platform">Platform <span class="cb-required">*</span></label>
          <select id="cb-platform" class="input cb-input cb-select">
            ${PLATFORMS.map((p) => `<option value="${p.value}"
              ${p.value === this._platform ? 'selected' : ''}>${escHtml(p.label)}</option>`).join('')}
          </select>
        </div>

        <div class="cb-field cb-custom-dims ${this._platform === 'custom' ? '' : 'hidden'}" id="cb-custom-dims">
          <label class="cb-label">Custom size (px)</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="number" id="cb-custom-w" class="input cb-input"
              placeholder="Width" min="1" style="flex:1" value="${escHtml(this._customW)}">
            <span class="cb-dim-sep">×</span>
            <input type="number" id="cb-custom-h" class="input cb-input"
              placeholder="Height" min="1" style="flex:1" value="${escHtml(this._customH)}">
          </div>
        </div>

        <div class="cb-field">
          <label class="cb-label" for="cb-story">What is this about?</label>
          <textarea id="cb-story" class="input cb-input cb-textarea" rows="4"
            placeholder="e.g. A trip to Patagonia with my family — three generations, the mountains, the horses. I want to capture the sense of wonder on my kids' faces.">${escHtml(this._story)}</textarea>
        </div>

        <div class="cb-field">
          <label class="cb-label" for="cb-notes">Additional notes for the AI <span class="cb-optional">(optional)</span></label>
          <textarea id="cb-notes" class="input cb-input cb-textarea" rows="2"
            placeholder="e.g. Keep text overlays minimal. Use the mountains as the visual anchor.">${escHtml(this._notes)}</textarea>
        </div>
      </div>
    `;
  }

  _renderStep2() {
    return `
      <div class="cb-step ${this._step === 2 ? 'active' : ''}" data-step="2">
        <div class="cb-field">
          <label class="cb-label" for="cb-tone">Text &amp; tone style</label>
          <select id="cb-tone" class="input cb-input cb-select">
            ${TONES.map((t) => `<option value="${t.value}"
              ${t.value === this._tone ? 'selected' : ''}>${escHtml(t.label)}</option>`).join('')}
          </select>
        </div>

        <div class="cb-field ${this._tone === 'custom' ? '' : 'hidden'}" id="cb-custom-tone-wrap">
          <label class="cb-label" for="cb-tone-custom">Describe the tone</label>
          <input type="text" id="cb-tone-custom" class="input cb-input"
            placeholder="e.g. Intimate and nostalgic, like a letter to the future"
            value="${escHtml(this._toneCustom)}">
        </div>
      </div>
    `;
  }
```

- [ ] **Step 6: Add `_renderStep3()`, `_renderStep4()`, `_renderStep5()` (placeholders for now)**

Append to `concept-builder.js`:

```js
  _renderStep3() {
    const count = this._imageFiles.length;
    const ratioPreset = THUMB_RATIOS.find((r) => r.value === this._thumbRatioVal);
    const thumbW = ratioPreset?.w ? THUMB_BASE : parseInt(this._thumbCustomW, 10) || THUMB_BASE;
    const thumbH = ratioPreset?.h
      ? Math.round(THUMB_BASE * ratioPreset.h / ratioPreset.w)
      : parseInt(this._thumbCustomH, 10) || THUMB_BASE;

    return `
      <div class="cb-step ${this._step === 3 ? 'active' : ''}" data-step="3">
        <div class="cb-import-zone" id="cb-import-zone">
          ${count > 0
            ? `<div class="cb-import-count">${count} image${count !== 1 ? 's' : ''} loaded</div>
               <div class="cb-import-meta">These will be added to the Image Tray and used for thumbnail sheets.</div>
               <button class="btn btn-ghost btn-sm" id="cb-clear-images">Clear</button>`
            : `<div style="font-size:32px;opacity:0.4">🖼</div>
               <div style="font-size:13px;color:var(--color-text-secondary)">No images loaded yet</div>`
          }
          <button class="btn btn-primary" id="cb-add-images">+ Add Images</button>
          <input type="file" id="cb-file-input" multiple accept="image/*"
            style="display:none" aria-hidden="true">
        </div>

        <div class="cb-field">
          <label class="cb-label">Thumbnail aspect ratio</label>
          <div class="cb-ratio-row">
            ${THUMB_RATIOS.map((r) => `
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                <input type="radio" name="cb-thumb-ratio" value="${r.value}"
                  ${r.value === this._thumbRatioVal ? 'checked' : ''}>
                ${escHtml(r.label)}
              </label>
            `).join('')}
          </div>
          <div class="cb-ratio-custom ${this._thumbRatioVal === 'custom' ? '' : 'hidden'}" id="cb-ratio-custom-wrap">
            <input type="number" id="cb-thumb-cw" class="input cb-input"
              placeholder="W" min="1" style="width:64px" value="${escHtml(this._thumbCustomW)}">
            <span>×</span>
            <input type="number" id="cb-thumb-ch" class="input cb-input"
              placeholder="H" min="1" style="width:64px" value="${escHtml(this._thumbCustomH)}">
            <span style="font-size:11px;color:var(--color-text-muted)">px</span>
          </div>
          <div class="cb-field-hint">
            Each thumbnail: ${thumbW}×${thumbH}px · Sheet: ${THUMB_COLS * thumbW}×${THUMB_ROWS * thumbH}px
            · ${THUMB_COLS * THUMB_ROWS} images per sheet
          </div>
        </div>
      </div>
    `;
  }

  _renderStep4() {
    return `
      <div class="cb-step ${this._step === 4 ? 'active' : ''}" data-step="4">
        <div style="text-align:center;padding:var(--space-7) 0;">
          <p style="font-size:13px;color:var(--color-text-secondary);margin-bottom:var(--space-6)">
            Downloads everything the AI model needs in one click:
          </p>
          <ul style="list-style:none;font-size:12px;color:var(--color-text-secondary);margin-bottom:var(--space-8);line-height:1.9;text-align:left;display:inline-block;">
            <li>📄 <strong>Brief</strong> — project description + AI generation manual (.txt)</li>
            <li>🖼 <strong>3 Sample Designs</strong> — layout mockups for your platform (.png)</li>
            <li>🗂 <strong>Thumbnail Sheets</strong> — all images grouped by ${THUMB_COLS * THUMB_ROWS} (.png)</li>
          </ul>
          <br>
          <button class="btn btn-primary" id="cb-export-package" style="min-width:180px">
            Export Package
          </button>
          <div class="cb-export-status" id="cb-export-status"></div>
        </div>
      </div>
    `;
  }

  _renderStep5() {
    return `
      <div class="cb-step ${this._step === 5 ? 'active' : ''}" data-step="5">
        <div style="text-align:center;padding:var(--space-7) 0;">
          <p class="cb-prompt-hint">
            Copy this prompt and paste it into your AI session.<br>
            Attach the exported files (brief + designs + thumbnails) along with it.
          </p>
          <br>
          <button class="btn btn-primary" id="cb-copy" style="min-width:180px">
            Copy Prompt
          </button>
          <div class="cb-copy-done" id="cb-copy-done"></div>
        </div>
      </div>
    `;
  }
```

- [ ] **Step 7: Add `_bindEvents()` for wizard navigation + steps 1-2 field sync**

Append to `concept-builder.js`:

```js
  // ── Events ─────────────────────────────────────────────────────────────────

  _bindEvents() {
    const b = this._backdrop;

    // Close
    b.querySelector('.cb-close').addEventListener('click', () => this._close());
    b.querySelector('#cb-close-final')?.addEventListener('click', () => this._close());
    b.addEventListener('click', (e) => { if (e.target === b) this._close(); });
    document.addEventListener('keydown', this._onKeyDown = (e) => {
      if (e.key === 'Escape') this._close();
    });

    // Navigation
    b.querySelector('#cb-back')?.addEventListener('click', () => this._goTo(this._step - 1));
    b.querySelector('#cb-next')?.addEventListener('click', () => this._goTo(this._step + 1));

    // Step 1 — sync fields
    b.querySelector('#cb-title')?.addEventListener('input', (e) => {
      this._title = e.target.value;
      const slug = toSlug(this._title);
      const el = b.querySelector('#cb-slug-preview');
      if (el) el.textContent = slug ? `ID: ${slug}` : 'ID: —';
      const nextBtn = b.querySelector('#cb-next');
      if (nextBtn) nextBtn.disabled = !this._title.trim();
    });
    b.querySelector('#cb-platform')?.addEventListener('change', (e) => {
      this._platform = e.target.value;
      b.querySelector('#cb-custom-dims')?.classList.toggle('hidden', this._platform !== 'custom');
    });
    b.querySelector('#cb-custom-w')?.addEventListener('input', (e) => { this._customW = e.target.value; });
    b.querySelector('#cb-custom-h')?.addEventListener('input', (e) => { this._customH = e.target.value; });
    b.querySelector('#cb-story')?.addEventListener('input', (e) => { this._story = e.target.value; });
    b.querySelector('#cb-notes')?.addEventListener('input',  (e) => { this._notes = e.target.value; });

    // Step 2 — sync fields
    b.querySelector('#cb-tone')?.addEventListener('change', (e) => {
      this._tone = e.target.value;
      b.querySelector('#cb-custom-tone-wrap')?.classList.toggle('hidden', this._tone !== 'custom');
    });
    b.querySelector('#cb-tone-custom')?.addEventListener('input', (e) => { this._toneCustom = e.target.value; });

    // Steps 3-5 bound in _bindStep3Events / _bindStep4Events / _bindStep5Events
    this._bindStep3Events();
    this._bindStep4Events();
    this._bindStep5Events();
  }

  _goTo(step) {
    if (step < 1 || step > 5) return;
    this._step = step;
    // Re-render to update progress dots + nav buttons
    this._close(true);
    this._render();
  }
```

- [ ] **Step 8: Add `_bindStep3Events()` — file picker**

Append to `concept-builder.js`:

```js
  _bindStep3Events() {
    const b = this._backdrop;
    const addBtn   = b.querySelector('#cb-add-images');
    const fileInput = b.querySelector('#cb-file-input');
    const clearBtn  = b.querySelector('#cb-clear-images');

    addBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async (e) => {
      const files = [...(e.target.files ?? [])];
      if (!files.length) return;
      e.target.value = '';

      this._imageFiles = files;

      // Forward to main app tray immediately
      this._onImages?.(files);

      // Load into Image elements for thumbnail export (non-blocking)
      this._imageElements = await Promise.all(
        files.map((f) => fileToImageElement(f).catch(() => null))
      ).then((imgs) => imgs.filter(Boolean));

      // Re-render step 3 to show count
      this._goTo(3);
    });

    clearBtn?.addEventListener('click', () => {
      this._imageFiles    = [];
      this._imageElements = [];
      this._goTo(3);
    });

    // Thumbnail ratio selector
    b.querySelectorAll('input[name="cb-thumb-ratio"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        this._thumbRatioVal = e.target.value;
        b.querySelector('#cb-ratio-custom-wrap')?.classList.toggle('hidden', this._thumbRatioVal !== 'custom');
        // Update hint
        this._updateThumbHint();
      });
    });
    b.querySelector('#cb-thumb-cw')?.addEventListener('input', (e) => {
      this._thumbCustomW = e.target.value;
      this._updateThumbHint();
    });
    b.querySelector('#cb-thumb-ch')?.addEventListener('input', (e) => {
      this._thumbCustomH = e.target.value;
      this._updateThumbHint();
    });
  }

  _updateThumbHint() {
    const { thumbW, thumbH } = this._thumbDimensions();
    const hint = this._backdrop?.querySelector('.cb-field-hint');
    if (hint) {
      hint.textContent = `Each thumbnail: ${thumbW}×${thumbH}px · Sheet: ${THUMB_COLS * thumbW}×${THUMB_ROWS * thumbH}px · ${THUMB_COLS * THUMB_ROWS} images per sheet`;
    }
  }

  _thumbDimensions() {
    const preset = THUMB_RATIOS.find((r) => r.value === this._thumbRatioVal);
    if (preset?.w) {
      return { thumbW: THUMB_BASE, thumbH: Math.round(THUMB_BASE * preset.h / preset.w) };
    }
    return {
      thumbW: parseInt(this._thumbCustomW, 10) || THUMB_BASE,
      thumbH: parseInt(this._thumbCustomH, 10) || THUMB_BASE,
    };
  }
```

- [ ] **Step 9: Verify wizard navigation in browser**

Open `frameforge/index.html`. Click "New Brief". The modal should open on Step 1. Verify:
- Progress bar shows Step 1 active (blue dot)
- No Back button on step 1
- Next button disabled until Title is typed
- Type a title → Next enables, slug preview updates
- Click Next → Step 2 appears, Tone dropdown shown
- Back from Step 2 returns to Step 1 with title preserved
- Step dots update correctly on each step

- [ ] **Step 10: Commit**

```bash
git add ui/concept-builder.js styles/components.css
git commit -m "feat: concept-builder wizard skeleton — steps 1-2 + navigation"
```

---

## Task 4: Add Export Package (Step 4) and prompt/brief builders

**Files:**
- Modify: `ui/concept-builder.js`

- [ ] **Step 1: Add `_readFields()` — no hero/context, simplified**

Append to the `ConceptBuilder` class in `concept-builder.js`:

```js
  // ── Field reader ────────────────────────────────────────────────────────────

  _readFields() {
    const b = this._backdrop;

    // Sync live values from DOM if backdrop is open
    if (b) {
      this._title      = b.querySelector('#cb-title')?.value.trim()       ?? this._title;
      this._story      = b.querySelector('#cb-story')?.value.trim()       ?? this._story;
      this._notes      = b.querySelector('#cb-notes')?.value.trim()       ?? this._notes;
      this._tone       = b.querySelector('#cb-tone')?.value               ?? this._tone;
      this._toneCustom = b.querySelector('#cb-tone-custom')?.value.trim() ?? this._toneCustom;
    }

    const slug     = toSlug(this._title) || 'untitled-project';
    const today    = new Date().toISOString().slice(0, 10);
    const preset   = PLATFORMS.find((p) => p.value === this._platform);
    let w = preset?.w ?? 1080;
    let h = preset?.h ?? 1350;
    if (this._platform === 'custom') {
      w = parseInt(this._customW, 10) || 1080;
      h = parseInt(this._customH, 10) || 1080;
    }
    const dpi         = preset?.dpi ?? 72;
    const platformObj = { ...preset, w, h, dpi };
    const toneTxt     = this._tone === 'custom'
      ? this._toneCustom
      : (TONES.find((t) => t.value === this._tone)?.label ?? '');
    const toneLine = toneTxt && this._tone
      ? toneTxt.replace(/^— /, '').replace(/ —.*/, '')
      : 'Let the AI decide based on the story and images';

    return {
      title: this._title, slug, today, w, h, dpi, platformObj,
      story: this._story, notes: this._notes,
      tone: this._tone, toneLine,
      imageCount: this._imageFiles.length,
    };
  }
```

- [ ] **Step 2: Add `_buildBrief()` — no hero/context sections**

Append to the class:

```js
  _buildBrief() {
    const { title, slug, today, w, h, dpi, platformObj, story, notes, toneLine, imageCount } = this._readFields();
    const platformLabel = platformObj?.label ?? this._platform;

    return `# FrameForge Project Brief
Generated: ${today}

---

## Project

- **Title:** ${title || '(untitled)'}
- **Project ID:** \`${slug}\`
- **Platform:** ${platformLabel} — ${w}×${h}px (DPI: ${dpi})
- **Total images:** ${imageCount}

---

## Story & Direction

${story || '(no story provided — use the images and title as your guide)'}

**Tone:** ${toneLine}
${notes ? `\n**Additional notes:** ${notes}` : ''}

---

## Images

${imageCount} image${imageCount !== 1 ? 's' : ''} provided alongside this brief.
See the attached thumbnail sheets for a visual reference of all images (grouped by ${THUMB_COLS * THUMB_ROWS}).
Images are numbered 1–${imageCount} in the thumbnail sheets — reference them by number in your JSON (\`image_src: "image-01.jpg"\`, etc.).

---

${AI_MANUAL}

---

## Hard Requirements (non-negotiable)

- \`project.id\` → \`"${slug}"\`
- \`project.version\` → \`"1.0"\`
- \`export.target\` → \`"${this._platform}"\`
- \`export.width_px\` → \`${w}\`, \`export.height_px\` → \`${h}\`, \`export.dpi\` → \`${dpi}\`
- \`export.scale_factor\` → \`2\`
- One frame per image, in the order shown in the thumbnail sheets
- Include \`image_index\` at the top level with one real entry per frame

When generating the JSON, output **only** the raw JSON — no markdown fences, no explanation, no commentary.
`;
  }
```

- [ ] **Step 3: Add `_buildPrompt()` — no hero/context, add thumbnail sheet reference**

Append to the class:

```js
  _buildPrompt() {
    const { title, slug, w, h, story, notes, toneLine, imageCount } = this._readFields();
    const platformLabel = PLATFORMS.find((p) => p.value === this._platform)?.label ?? this._platform;

    return `I'm working on a photography project and need you to design FrameForge layouts for it.

I'm attaching:
- The FrameForge brief file (full technical instructions for generating the JSON)
- 3 sample design mockups (layout references for the platform — study the element sizes and zones)
- Thumbnail sheets showing all ${imageCount} image${imageCount !== 1 ? 's' : ''}, grouped by ${THUMB_COLS * THUMB_ROWS}

Please follow these steps:

---

**Step 1 — Review.**
Read the attached brief. Study the thumbnail sheets carefully — for each image, identify where the subject is, where the key feature is, and where the negative space is. Review the sample design mockups to understand the platform dimensions and typical element proportions.

**Step 2 — Propose a concept.**
Before generating any JSON, present your concept:
- Color palette: 2–3 colors with hex values, names, and their intended roles
- Font pairing: display font + sans-serif, and why this combination fits the story
- Per-image layout intent: for each image, one line describing subject position and negative space, then one line explaining your chosen text zone and gradient direction — text must never cover the subject's key feature

Let's review and refine the concept together before you generate anything.

**Step 3 — Generate.**
Once we agree on the concept, generate the complete FrameForge JSON following the brief exactly.

---

**Project: ${title || '(untitled)'}**
Platform: ${platformLabel} — ${w}×${h}px
Project ID: ${slug}

**Story:**
${story || '(no story provided — use the images and title as your guide)'}

**Tone:** ${toneLine}${notes ? `\n\n**Notes:** ${notes}` : ''}

**Images:** ${imageCount} image${imageCount !== 1 ? 's' : ''} — see attached thumbnail sheets

---

**Design principles — apply to every frame:**

This is high-quality editorial design. Every frame must be individually designed based on what that specific image needs.

- No copied layouts: text zone, offsets, layer count, and overlay direction must vary per frame.
- Color palette is shared, but applied with variation across frames.
- Write real editorial copy for every text layer — no placeholders.
- Refer to the sample design mockups for guidance on element proportions and safe zones.
`;
  }
```

- [ ] **Step 4: Add `_bindStep4Events()` — Export Package button**

Append to the class:

```js
  _bindStep4Events() {
    const b = this._backdrop;
    b.querySelector('#cb-export-package')?.addEventListener('click', () => this._doExportPackage());
  }

  async _doExportPackage() {
    const b      = this._backdrop;
    const btn    = b?.querySelector('#cb-export-package');
    const status = b?.querySelector('#cb-export-status');

    if (!btn || !status) return;

    btn.disabled = true;
    const { slug } = this._readFields();
    let fileCount = 0;

    const setStatus = (msg) => { if (status) status.textContent = msg; };

    try {
      // 1 — Brief text
      setStatus('Generating brief…');
      await yieldToUI();
      const briefText = this._buildBrief();
      const briefBlob = new Blob([briefText], { type: 'text/plain;charset=utf-8' });
      triggerDownload(briefBlob, `frameforge-brief-${slug}.txt`);
      fileCount++;
      await new Promise((r) => setTimeout(r, 300));

      // 2 — Sample design mockups
      setStatus('Generating sample designs…');
      await yieldToUI();
      const { platformObj } = this._readFields();
      const mockupBlobs = await generateMockups(platformObj);
      for (let i = 0; i < mockupBlobs.length; i++) {
        triggerDownload(mockupBlobs[i], `${slug}-sample-${i + 1}.png`);
        fileCount++;
        await new Promise((r) => setTimeout(r, 200));
      }

      // 3 — Thumbnail sheets (only if images were loaded)
      if (this._imageElements.length > 0) {
        setStatus('Generating thumbnail sheets…');
        await yieldToUI();
        const { thumbW, thumbH } = this._thumbDimensions();
        const sheetBlobs = await generateThumbnailSheets(this._imageElements, thumbW, thumbH);
        for (let i = 0; i < sheetBlobs.length; i++) {
          const sheetNum = String(i + 1).padStart(2, '0');
          triggerDownload(sheetBlobs[i], `${slug}-thumbs-${sheetNum}.png`);
          fileCount++;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      status.textContent = `✓ Package exported — ${fileCount} file${fileCount !== 1 ? 's' : ''} downloaded`;
      status.className   = 'cb-export-status done';
    } catch (err) {
      console.error('[ConceptBuilder] Export error:', err);
      status.textContent = `Export failed: ${err.message}`;
      status.className   = 'cb-export-status error';
    } finally {
      btn.disabled = false;
    }
  }
```

- [ ] **Step 5: Add `_bindStep5Events()` — Copy Prompt button**

Append to the class:

```js
  _bindStep5Events() {
    const b = this._backdrop;
    b.querySelector('#cb-copy')?.addEventListener('click', () => this._doCopyPrompt());
  }

  _doCopyPrompt() {
    const prompt   = this._buildPrompt();
    const doneEl   = this._backdrop?.querySelector('#cb-copy-done');
    const copyBtn  = this._backdrop?.querySelector('#cb-copy');

    const show = () => {
      if (doneEl) doneEl.textContent = '✓ Copied! Paste it into your AI session along with the exported files.';
      if (copyBtn) { copyBtn.textContent = '✓ Copied!'; copyBtn.disabled = true; }
      setTimeout(() => {
        if (doneEl) doneEl.textContent = '';
        if (copyBtn) { copyBtn.textContent = 'Copy Prompt'; copyBtn.disabled = false; }
      }, 3000);
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt).then(show).catch(() => this._fallbackCopy(prompt, show));
    } else {
      this._fallbackCopy(prompt, show);
    }
  }

  _fallbackCopy(text, callback) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    callback?.();
  }
```

- [ ] **Step 6: Add `_close()` lifecycle method**

Append to the class (closing the class brace at the end):

```js
  // ── Lifecycle ──────────────────────────────────────────────────────────────

  _close(preserveState = false) {
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
    this._backdrop?.remove();
    this._backdrop = null;
    if (!preserveState) {
      // Only clear image state on final close, not internal navigation
      this._imageFiles    = [];
      this._imageElements = [];
    }
  }
}
```

- [ ] **Step 7: Verify full wizard flow in browser**

Open `frameforge/index.html`. Click "New Brief":
1. Type a title on Step 1 → Next enables → advance to Step 2
2. Step 2: select a tone → Next → Step 3
3. Step 3: click "Add Images", select 2–3 image files → count shows correctly
4. Step 4: click "Export Package" → browser downloads: 1 `.txt` + 3 `.png` mockups
   - Open the `.txt` file: should contain project metadata, story, image count, and the full AI manual
   - Open a mockup `.png`: should show composition + specs strip + variants panel
   - If images were loaded: thumbnail sheet `.png` also downloads
5. Step 5: click "Copy Prompt" → paste into a text editor → verify it references thumbnail sheets, lists image count, has no hero shot or per-image context sections

- [ ] **Step 8: Commit**

```bash
git add ui/concept-builder.js
git commit -m "feat: concept-builder export package — brief, mockups, thumbnails, copy prompt"
```

---

## Task 5: Wire `app.js` and update `docs/spec-app.md`

**Files:**
- Modify: `app.js` (1 line change)
- Modify: `docs/spec-app.md` (Part X replacement)

- [ ] **Step 1: Update `app.js` — pass `handleImageFiles` to `conceptBuilder.open()`**

In `app.js`, find:

```js
  tb.btnNewProject?.addEventListener('click', () => {
    conceptBuilder.open();
  });
```

Replace with:

```js
  tb.btnNewProject?.addEventListener('click', () => {
    conceptBuilder.open((files) => handleImageFiles(files));
  });
```

- [ ] **Step 2: Verify images from Brief appear in tray**

Open `frameforge/index.html`. Load a JSON project first (so the tray is active). Then click "New Brief", advance to Step 3, add images — the Image Tray in the main app should immediately show the new images with correct thumbnails.

- [ ] **Step 3: Update `docs/spec-app.md` Part X**

Find and replace the entire `## PART X — CONCEPT BUILDER (NEW PROJECT BRIEF)` section (from line `## PART X` to the end of the file, which is the end of the section) with the following:

```markdown
## PART X — CONCEPT BUILDER (NEW PROJECT BRIEF)

### 10.1 Purpose

The Concept Builder is an in-app 5-step wizard that lets photographers describe their project, import images, and export a complete AI package. The package — brief text + layout mockups + thumbnail sheets — is given to an AI model along with the actual image files to generate the FrameForge JSON settings file.

**The photographer provides:** title, platform, story, tone, and image files.
**The AI decides:** color palette, typography, overlay style, layout, and all text content.

**Full workflow:**
```
[FrameForge — Concept Builder Wizard]
    → Step 1: Title, platform, story, notes
    → Step 2: Tone & style
    → Step 3: Import images (file picker → images also go to Image Tray)
    → Step 4: Export Package (brief .txt + 3 layout mockup PNGs + thumbnail sheets)
    → Step 5: Copy Prompt (paste into AI session)

[AI Model session]
    → Attach exported package + actual image files
    → AI reviews brief + mockups + thumbnails, proposes concept, outputs JSON

[FrameForge — Main App]
    → Load JSON → images already in tray from Step 3 → Preview → Export
```

---

### 10.2 Trigger

A **"New Brief"** button is always visible in the toolbar. Clicking it opens the Concept Builder wizard.

---

### 10.3 Wizard Steps

#### Step 1 — Title & Story

| Field | Required | Notes |
|---|---|---|
| Title | Yes | Generates slug preview on input |
| Platform | Yes | Same dropdown as §3.3.1. Determines mockup dimensions. |
| What is this about? | Recommended | Free-text story |
| Additional notes | No | Extra AI instructions |

#### Step 2 — Tone & Style

| Field | Required | Notes |
|---|---|---|
| Text & tone style | No | Same presets + Custom. Default: "Let the AI decide." |
| Custom tone description | Conditional | Shown when Custom selected |

#### Step 3 — Import Images

- File picker (`<input type="file" multiple accept="image/*">`)
- Shows image count only — no filenames, no previews
- Images forwarded immediately to the main app Image Tray via `onImages` callback
- Aspect ratio selector for thumbnail sheets: 1×1, 4×5, 2×3, Custom (default: 1×1)

#### Step 4 — Export Package

Single button downloads everything:
1. `frameforge-brief-{slug}.txt` — brief + AI manual
2. `{slug}-sample-1.png` through `{slug}-sample-3.png` — layout mockups
3. `{slug}-thumbs-01.png`, `{slug}-thumbs-02.png`, … — thumbnail sheets

#### Step 5 — Copy Prompt

Copies the assembled prompt to clipboard. Prompt references thumbnail sheets and image count. No hero shot or per-image context references.

---

### 10.4 Exported Brief Structure

```
# FrameForge Project Brief
Generated: YYYY-MM-DD

## Project
[Title, ID, platform, dimensions, DPI, image count]

## Story & Direction
[Story text]
[Tone line]
[Additional notes if any]

## Images
[Image count + reference to thumbnail sheets]

---

[Full AI Generation Manual — Part VIII]

---

## Hard Requirements
[project.id, export target, dimensions, scale factor, frame count]
```

---

### 10.5 Sample Design Mockups

Three PNG files generated in canvas — no real images required. Each mockup is at the selected platform's dimensions (capped at 1080px wide) and has three zones:

- **Composition (~65%):** Layout placeholder (text blocks, rule lines, circle accents, safe zone border, callout annotations with element sizes)
- **Element specs (~15%):** Headline/subhead/body sizes, rule thickness, circle diameter, safe zone, text zone %, gradient direction, platform info
- **Size variants (~20%):** Silhouettes of all platform presets at correct aspect ratios; selected platform highlighted

Three layouts, mapped to AI manual text zones:
- **Top-heavy** → text at top, gradient `to-top`
- **Bottom-anchor** → text at bottom, gradient `to-bottom`
- **Center-split** → centered text column, two rule lines

---

### 10.6 Thumbnail Sheets

Configurable constants in `ui/brief-thumbnails.js`:

```js
const THUMB_BASE = 200;  // base width px
const THUMB_COLS = 5;    // columns per sheet
const THUMB_ROWS = 2;    // rows per sheet → 10 per sheet
```

User selects aspect ratio on Step 3: 1×1, 4×5, 2×3, or Custom. Sheet dimensions = `THUMB_COLS × thumbW` by `THUMB_ROWS × thumbH`. Each sheet labelled with image range.

---

### 10.7 Export Actions

| Action | Output |
|---|---|
| Export Package | Downloads `frameforge-brief-{slug}.txt` + 3 mockup PNGs + thumbnail sheets in one click |
| Copy Prompt | Copies assembled prompt to clipboard |

---

### 10.8 Files

| File | Purpose |
|---|---|
| `ui/concept-builder.js` | 5-step wizard UI, field state, brief/prompt builders, export orchestration |
| `ui/brief-mockups.js` | Canvas-based sample design mockup generator (3 layouts × all platforms) |
| `ui/brief-thumbnails.js` | Thumbnail sheet generator (configurable constants, center-fill crop) |
| `data/ai-manual-content.js` | Full AI Generation Manual embedded as JS string |
```

- [ ] **Step 4: Commit**

```bash
git add app.js docs/spec-app.md
git commit -m "feat: wire brief wizard to app tray callback + update spec-app.md Part X"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| 5-step wizard with progress indicator | Task 3 Step 4 |
| Step 1: title, platform, story, notes (no author) | Task 3 Step 5 |
| Step 2: tone + custom tone | Task 3 Step 5 |
| Step 3: file picker, count only, no names/preview | Task 3 Step 6 + Task 3 Step 8 |
| Step 3: aspect ratio selector (1×1, 4×5, 2×3, custom) | Task 3 Step 6 + Task 3 Step 8 |
| Images forwarded to main app tray | Task 3 Step 8 + Task 5 Step 1 |
| Step 4: Export Package — brief .txt | Task 4 Step 2 + Step 4 |
| Step 4: Export Package — 3 mockup PNGs | Task 2 + Task 4 Step 4 |
| Step 4: Export Package — thumbnail sheets | Task 1 + Task 4 Step 4 |
| Step 4: progress indicator + completion message | Task 4 Step 4 (`setStatus`) |
| Step 5: copy prompt, no hero/context | Task 4 Step 3 + Step 5 |
| Mockup zones: composition + specs strip + variants | Task 2 Steps 3-4 |
| Callout annotations on composition elements | Task 2 Step 3 (`_callout`) |
| Element specs: headline/subhead/body/rule/circle/safe zone | Task 2 Step 4 (`_drawSpecsStrip`) |
| Size variants panel with all platforms | Task 2 Step 4 (`_drawVariantsPanel`) |
| Layouts aligned with AI manual text zones | Task 2 Step 1 LAYOUTS constants |
| THUMB_BASE/COLS/ROWS as named constants | Task 1 Step 1 |
| Thumbnail aspect ratio drives thumbW/thumbH | Task 3 Step 8 `_thumbDimensions()` |
| Sheet label with image range | Task 1 Step 2 |
| Brief includes AI manual | Task 4 Step 2 (`AI_MANUAL` import) |
| Prompt references thumbnail sheets | Task 4 Step 3 |
| `spec-app.md` Part X updated | Task 5 Step 3 |
| Next disabled on Step 1 if title empty | Task 3 Step 7 |
| No Back on Step 1, no Next on Step 5 | Task 3 Step 4 |
