/**
 * brief-mockups.js — Sample design mockup generator for the Brief Export Package.
 *
 * Generates 3 layout mockups as PNG Blobs for any given platform.
 * Each mockup has three zones:
 *   - Composition (~65%): layout placeholder with elements + callout annotations
 *   - Element specs strip (~15%): headline/subhead/body sizes, rule, circle, safe zone, gradient
 *   - Size variants panel (~20%): all platform silhouettes, selected one highlighted
 *
 * No real images required — all drawing is done in code via the Canvas API.
 */

// ─── 1. Platform registry ────────────────────────────────────────────────────
// Keep in sync with concept-builder.js (no import dependency — maintained separately)

const PLATFORMS = [
  { value: 'instagram-portrait', label: 'Instagram Portrait', shortLabel: 'Portrait',  w: 1080, h: 1350, dpi: 72  },
  { value: 'instagram-square',   label: 'Instagram Square',   shortLabel: 'Square',    w: 1080, h: 1080, dpi: 72  },
  { value: 'instagram-story',    label: 'Instagram Story',    shortLabel: 'Story',     w: 1080, h: 1920, dpi: 72  },
  { value: 'facebook-feed',      label: 'Facebook Feed',      shortLabel: 'FB Feed',   w: 1200, h:  630, dpi: 72  },
  { value: 'facebook-cover',     label: 'Facebook Cover',     shortLabel: 'FB Cover',  w:  820, h:  312, dpi: 72  },
  { value: 'print-a4-portrait',  label: 'Print A4 Portrait',  shortLabel: 'A4 Port.',  w: 2480, h: 3508, dpi: 300 },
  { value: 'print-a4-landscape', label: 'Print A4 Landscape', shortLabel: 'A4 Land.',  w: 3508, h: 2480, dpi: 300 },
];

// ─── 2. Layout definitions ────────────────────────────────────────────────────

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

// ─── 3. Canvas size constants ─────────────────────────────────────────────────

const MAX_MOCKUP_W = 1080;
const MIN_COMP_H   = 300;
const MIN_SPECS_H  = 100;
const MIN_VARS_H   = 140;

// ─── 4. Public API ────────────────────────────────────────────────────────────

/**
 * Generate 3 sample design mockups for the given platform.
 * @param {{ value: string, label: string, w: number, h: number, dpi: number }} platform
 * @returns {Promise<Blob[]>}  array of 3 PNG Blobs, one per layout
 */
export async function generateMockups(platform) {
  return Promise.all(LAYOUTS.map((layout) => _renderMockup(platform, layout)));
}

// ─── 5. Internal rendering functions ─────────────────────────────────────────

async function _renderMockup(platform, layout) {
  const mockupW = Math.min(platform.w || MAX_MOCKUP_W, MAX_MOCKUP_W);
  // Composition zone = exact platform aspect ratio (specs/variants added below, not carved out)
  const compH  = Math.max(MIN_COMP_H, Math.round(mockupW * (platform.h || mockupW) / (platform.w || mockupW)));
  const specsH = MIN_SPECS_H;
  const varsH  = MIN_VARS_H;
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
  _callout(ctx, safe + blockW + 8, y + headH / 2, `${layout.headlinePx}px`, false, w);
  y += headH + gap;

  // Subhead
  ctx.fillStyle = '#9898b0';
  ctx.fillRect(safe, y, Math.round(blockW * 0.72), subH);
  y += subH + gap;

  // Rule
  ctx.fillStyle = '#5b8aff';
  ctx.fillRect(safe, y, Math.round(w * 0.38), rulePx);
  _callout(ctx, safe + Math.round(w * 0.38) + 8, y, `${layout.rulePx}px rule`, false, w);
  y += rulePx + gap;

  // Body
  ctx.fillStyle = '#606078';
  ctx.fillRect(safe, y, Math.round(blockW * 0.52), bodyH);
  _callout(ctx, safe + Math.round(blockW * 0.52) + 8, y + bodyH / 2, `${layout.bodyPx}px`, false, w);

  // Circle — bottom-right
  const cx = w - safe - circleR;
  const cy = h - safe - circleR;
  ctx.strokeStyle = '#5b8aff';
  ctx.lineWidth = Math.max(1, Math.round(2 * scale));
  ctx.beginPath(); ctx.arc(cx, cy, circleR, 0, Math.PI * 2); ctx.stroke();
  _callout(ctx, cx - circleR - 8, cy, `${layout.circlePx}px`, true, w);
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
  _callout(ctx, safe + Math.round(blockW * 0.50) + 8, y + bodyH / 2, `${layout.bodyPx}px`, false, w);
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
  _callout(ctx, safe + blockW + 8, y + headH / 2, `${layout.headlinePx}px`, false, w);
  y -= gap;

  // Rule above headline
  y -= rulePx;
  ctx.fillStyle = '#5b8aff';
  ctx.fillRect(safe, y, Math.round(w * 0.38), rulePx);
  _callout(ctx, safe + Math.round(w * 0.38) + 8, y, `${layout.rulePx}px rule`, false, w);

  // Circle — top-right
  const cx = w - safe - circleR;
  const cy = safe + circleR;
  ctx.strokeStyle = '#5b8aff';
  ctx.lineWidth = Math.max(1, Math.round(2 * scale));
  ctx.beginPath(); ctx.arc(cx, cy, circleR, 0, Math.PI * 2); ctx.stroke();
  _callout(ctx, cx - circleR - 8, cy, `${layout.circlePx}px`, true, w);
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
  _callout(ctx, colX + colW + 8, y, `${layout.rulePx}px rule`, false, w);
  y += rulePx + gap;

  // Headline
  ctx.fillStyle = '#e8e8f0';
  ctx.fillRect(colX, y, colW, headH);
  _callout(ctx, colX + colW + 8, y + headH / 2, `${layout.headlinePx}px`, false, w);
  y += headH + gap;

  // Subhead
  ctx.fillStyle = '#9898b0';
  ctx.fillRect(colX + Math.round(colW * 0.10), y, Math.round(colW * 0.80), subH);
  y += subH + gap;

  // Body
  ctx.fillStyle = '#606078';
  ctx.fillRect(colX + Math.round(colW * 0.20), y, Math.round(colW * 0.60), bodyH);
  _callout(ctx, colX + colW + 8, y + bodyH / 2, `${layout.bodyPx}px`, false, w);
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
  _callout(ctx, safe + circleR * 2 + 8, safe + circleR, `${layout.circlePx}px circles`, false, w);
}

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
  const lastCellExtra = w - cellW * count; // remainder px given to last cell
  const pad    = 6;
  const labelH = 28;
  const maxSilH = h - labelH - pad * 2;
  const maxSilW = cellW - pad * 2;

  PLATFORMS.forEach((p, i) => {
    const isActive = p.value === activePlatformValue;
    const isLast = i === count - 1;
    const cx = x + i * cellW;
    const thisCellW = isLast ? cellW + lastCellExtra : cellW;
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

    const sx = cx + Math.round((thisCellW - silW) / 2);
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
    ctx.fillText(p.shortLabel, cx + thisCellW / 2, y + h - 14);
    ctx.font         = `${Math.max(7, Math.round(cellW / 10))}px sans-serif`;
    ctx.fillStyle    = isActive ? '#9898b0' : '#404050';
    ctx.fillText(`${p.w}×${p.h}`, cx + thisCellW / 2, y + h - 2);
  });
}

function _callout(ctx, x, y, label, rtl = false, canvasW = Infinity) {
  ctx.save();
  ctx.font = '9px sans-serif';
  const tw = ctx.measureText(label).width + 8;
  const th = 15;
  let tx = rtl ? x - tw : x;
  // Clamp so label doesn't overflow the canvas right edge
  if (tx + tw > canvasW - 2) tx = canvasW - tw - 2;
  if (tx < 2) tx = 2;
  ctx.fillStyle = 'rgba(20,20,35,0.88)';
  ctx.fillRect(tx, y - th / 2, tw, th);
  ctx.fillStyle    = '#f5c518';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, tx + 4, y);
  ctx.restore();
}

function _canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null (possible tainted canvas)'));
    }, 'image/png');
  });
}

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
  const compH  = 660;
  const specsH = 120;
  const rulesH = 100;

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
  ctx.fillStyle = '#12121e';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#252538';
  ctx.fillRect(w * 0.1, h * 0.05, w * 0.8, h * 0.6);

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
  const silH = Math.round(h * 0.28);
  const silY = h - silH;

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, silY + silH * 0.6);
  ctx.lineTo(w * 0.15, silY + silH * 0.2);
  ctx.lineTo(w * 0.28, silY + silH * 0.55);
  ctx.lineTo(w * 0.42, silY + silH * 0.05);
  ctx.lineTo(w * 0.55, silY + silH * 0.40);
  ctx.lineTo(w * 0.68, silY + silH * 0.15);
  ctx.lineTo(w * 0.80, silY + silH * 0.50);
  ctx.lineTo(w * 0.92, silY + silH * 0.30);
  ctx.lineTo(w, silY + silH * 0.45);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

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

  _callout(ctx, treeX + treeW + 10, treeTopY + treeH * 0.3, 'image_mask · asset: "pine-tree" · fill_opacity: 0.18', false, w);
  _callout(ctx, w * 0.20, h - silH * 0.5, 'asset: "mountain-range" · fill_opacity: 0.15', false, w);
  _callout(ctx, tree2X - 10, tree2TopY + tree2H * 0.3, 'flip_x: true · fill_opacity: 0.13', true, w);

  ctx.font = `bold ${Math.round(28 * scale)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('image_mask  —  silhouette assets', w / 2, Math.round(16 * scale));
}

function _drawPolylineSample(ctx, w, h, scale) {
  const pts = [
    [0,        h * 0.62],
    [w * 0.18, h * 0.52],
    [w * 0.35, h * 0.58],
    [w * 0.52, h * 0.46],
    [w * 0.68, h * 0.55],
    [w * 0.82, h * 0.48],
    [w,        h * 0.53],
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

  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#5b8aff';
  for (const [px, py] of pts) {
    ctx.beginPath();
    ctx.arc(px, py, Math.round(4 * scale), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  _callout(ctx, pts[2][0], pts[2][1] - 22, 'polyline · 7 points · stroke_opacity: 0.20 · stroke_width_px: 2', false, w);
  _callout(ctx, pts2[2][0], pts2[2][1] + 20, 'stroke_dash: "8 5" · stroke_opacity: 0.15 · stroke_color: #a0c8ff', false, w);

  ctx.font = `bold ${Math.round(28 * scale)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('polyline  —  multi-point strokes', w / 2, Math.round(16 * scale));
}

function _drawPathSample(ctx, w, h, scale) {
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

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.round(2 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.10, h * 0.85);
  ctx.quadraticCurveTo(w * 0.30, h * 0.55, w * 0.50, h * 0.80);
  ctx.quadraticCurveTo(w * 0.70, h * 1.05, w * 0.90, h * 0.75);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = '#5b8aff';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h * 0.92);
  ctx.lineTo(w * 0.20, h * 0.30);
  ctx.moveTo(w * 0.95, h * 0.15);
  ctx.lineTo(w * 0.60, h * 0.80);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.50;
  ctx.fillStyle = '#5b8aff';
  for (const [px, py] of [[w * 0.20, h * 0.30], [w * 0.60, h * 0.80]]) {
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  _callout(ctx, w * 0.30, h * 0.38, 'path · path_pct: "M 5 92 C 20 30 60 80 95 15" · stroke_opacity: 0.22', false, w);
  _callout(ctx, w * 0.35, h * 0.68, 'Q command · stroke_linecap: "round" · stroke_opacity: 0.15', false, w);

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
  const pad   = 16;
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

  const pad  = 16;
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
