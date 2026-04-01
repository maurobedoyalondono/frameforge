/**
 * renderer.js — Frame rendering orchestration for FrameForge.
 *
 * Renders frames onto HTML5 Canvas elements.
 * Handles safe zone overlay, per-frame error catching, and
 * thumbnail rendering for the filmstrip.
 */

import { computeTextBounds, computeShapeBounds, computeImageBounds, computeOverlayBounds, renderLayer } from './layers.js';

/**
 * Get bounding box for any selectable layer type.
 * Returns { top, bottom, left, right } in canvas pixels, or null.
 */
function computeLayerBounds(ctx, layer, w, h, project) {
  if (layer.type === 'text')    return computeTextBounds(ctx, layer, w, h, project);
  if (layer.type === 'shape')   return computeShapeBounds(ctx, layer, w, h, project);
  if (layer.type === 'image')   return computeImageBounds(ctx, layer, w, h, project);
  if (layer.type === 'overlay') return computeOverlayBounds(ctx, layer, w, h, project);
  return null;
}

// ── Safe zone overlay ─────────────────────────────────────────────────────

/**
 * Draw a dashed safe zone border overlay.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {number} safeZonePct
 */
function drawSafeZoneOverlay(ctx, w, h, safeZonePct) {
  const pad = (safeZonePct / 100);
  const sx  = w * pad;
  const sy  = h * pad;
  const sw  = w * (1 - 2 * pad);
  const sh  = h * (1 - 2 * pad);

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 200, 50, 0.7)';
  ctx.lineWidth   = Math.max(1, w / 400);
  ctx.setLineDash([w / 60, w / 80]);
  ctx.strokeRect(sx, sy, sw, sh);
  ctx.restore();
}

// ── Error placeholder ─────────────────────────────────────────────────────

/**
 * Draw an error state on a canvas.
 */
function drawError(ctx, w, h, message) {
  ctx.save();
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,85,85,0.15)';
  ctx.fillRect(0, 0, w, h);

  const fontSize = Math.max(12, w / 40);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle   = '#ff7070';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';

  // Wrap long messages
  const maxW = w * 0.8;
  const words = message.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineH = fontSize * 1.4;
  const startY = h / 2 - (lines.length - 1) * lineH / 2;
  lines.forEach((l, i) => ctx.fillText(l, w / 2, startY + i * lineH));
  ctx.restore();
}

// ── Composition guide overlays ────────────────────────────────────────────

/**
 * Draw the selected composition guide onto ctx.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w  effective canvas width
 * @param {number} h  effective canvas height
 * @param {string} guide  guide key
 * @param {number} [spiralOrientation=0]  0–3
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
    const labels    = ['1', '2', '3', '4'];
    const positions = [[w * 0.25, h * 0.25], [w * 0.75, h * 0.25], [w * 0.25, h * 0.75], [w * 0.75, h * 0.75]];
    const fSize     = Math.max(12, w * 0.022);
    ctx.save();
    ctx.font             = `bold ${fSize}px sans-serif`;
    ctx.fillStyle        = 'rgba(255,255,255,0.35)';
    ctx.textAlign        = 'center';
    ctx.textBaseline     = 'middle';
    for (let i = 0; i < 4; i++) ctx.fillText(labels[i], positions[i][0], positions[i][1]);
    ctx.restore();
  }

  if (guide === 'spiral') {
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
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {number} orientation  0–3
 * @param {number} alpha
 * @param {number} lw  line width
 */
function drawGoldenSpiral(ctx, w, h, orientation, alpha, lw) {
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth   = lw;
  ctx.setLineDash([]);

  // Mirror transformations for 4 orientations
  ctx.translate(w / 2, h / 2);
  if (orientation === 1) ctx.scale(-1,  1);
  if (orientation === 2) ctx.scale(-1, -1);
  if (orientation === 3) ctx.scale( 1, -1);
  ctx.translate(-w / 2, -h / 2);

  // Decompose canvas into Fibonacci rectangles and draw one arc per square
  let bw = w, bh = h, bx = 0, by = 0;
  const rects = [];
  for (let i = 0; i < 6; i++) {
    if (bw >= bh) {
      rects.push({ x: bx, y: by, s: bh });
      bx += bh;
      bw -= bh;
    } else {
      rects.push({ x: bx, y: by, s: bw });
      by += bw;
      bh -= bw;
    }
  }

  // Arc start angles for each successive square (clockwise spiral from top-right)
  const startAngles = [Math.PI, Math.PI * 1.5, 0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  // Arc center corners: cycle through bottom-right, bottom-left, top-left, top-right
  const cornerOffsets = [
    (r) => [r.x + r.s, r.y + r.s],
    (r) => [r.x,       r.y + r.s],
    (r) => [r.x,       r.y      ],
    (r) => [r.x + r.s, r.y      ],
  ];

  ctx.beginPath();
  for (let i = 0; i < rects.length; i++) {
    const r          = rects[i];
    const [acx, acy] = cornerOffsets[i % 4](r);
    const startAngle = startAngles[i];
    ctx.moveTo(acx + r.s * Math.cos(startAngle), acy + r.s * Math.sin(startAngle));
    ctx.arc(acx, acy, r.s, startAngle, startAngle + Math.PI / 2);
  }
  ctx.stroke();
  ctx.restore();
}

// ── Heatmap overlay ───────────────────────────────────────────────────────

/**
 * Draw the visual weight heatmap on ctx using pre-computed scores.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {Float32Array} scores  gridSize×gridSize scores 0–1 in row-major order
 * @param {number} [gridSize=16]
 */
function drawHeatmap(ctx, w, h, scores, gridSize = 16) {
  if (!scores || scores.length < gridSize * gridSize) return;

  const cellW = w / gridSize;
  const cellH = h / gridSize;

  // Find top-3 heaviest and top-3 lightest indices
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

    // Interpolate cool (low weight) → warm (high weight)
    const r = Math.round(40  + score * (255 - 40));
    const g = Math.round(120 + score * 20);
    const b = Math.round(255 - score * 255);
    const a = 0.15 + score * 0.35;
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fillRect(x, y, cellW, cellH);
  }

  // Badge marks on top-3 heaviest and lightest cells
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
 * @param {number} w  canvas effective width
 * @param {number} h  canvas effective height
 * @param {Array} zones  [{id, x, y, w, h, analysis}] — in canvas pixel coords
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

    // Number badge — background rect + text
    ctx.setLineDash([]);
    const fSize = Math.max(11, w * 0.018);
    ctx.font = `bold ${fSize}px sans-serif`;
    const label  = zone.id;
    const padX   = fSize * 0.5;
    const padY   = fSize * 0.3;
    const tw     = ctx.measureText(label).width + padX * 2;
    const th     = fSize + padY * 2;

    ctx.fillStyle = 'rgba(90,200,250,0.85)';
    ctx.fillRect(zone.x, zone.y, tw, th);

    ctx.fillStyle    = '#000';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, zone.x + padX, zone.y + padY);

    // "Good for text" badge for low-weight zones (weight <= 4.0)
    if (zone.analysis && zone.analysis.visualWeight <= 4.0) {
      const badge  = '✓ Good for text';
      const bSize  = Math.max(10, w * 0.014);
      ctx.font     = `${bSize}px sans-serif`;
      const bPadX  = bSize * 0.5;
      const bPadY  = bSize * 0.3;
      const bw     = ctx.measureText(badge).width + bPadX * 2;
      const bh     = bSize + bPadY * 2;
      const bx     = zone.x + zone.w - bw;
      const by     = zone.y;
      ctx.fillStyle = 'rgba(50,200,100,0.85)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle    = '#000';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(badge, zone.x + zone.w - bPadX, by + bPadY);
    }
  }

  ctx.restore();
}

// ── Main renderer ─────────────────────────────────────────────────────────

export class Renderer {
  constructor() {
    /** @type {boolean} */
    this.showSafeZone = false;
    /** @type {boolean} */
    this.showLayerBounds = false;
    /** @type {string|null} */
    this.selectedLayerId = null;
    /** @type {boolean} */
    this.isDragging = false;
    /** @type {string|null} active composition guide key */
    this.activeGuide       = null;
    /** @type {number} golden spiral orientation 0–3 */
    this.spiralOrientation = 0;
    /** @type {boolean} */
    this.showHeatmap       = false;
    /** @type {Array} analysis zones [{id,x,y,w,h,analysis}] */
    this.analysisZones     = [];
    /** @type {Float32Array|null} pre-computed heatmap scores */
    this._heatmapScores    = null;
  }

  /**
   * Render a single frame onto a canvas element.
   *
   * @param {HTMLCanvasElement} canvas — target canvas
   * @param {number} frameIndex — frame index in project.data.frames
   * @param {object} project — Project instance
   * @param {object} [opts]
   * @param {number} [opts.scaleFactor=1] — multiplier for export resolution
   * @param {number} [opts.displayWidth]  — CSS/display width override (for preview)
   * @param {number} [opts.displayHeight] — CSS/display height override (for preview)
   * @param {boolean} [opts.safeZone] — override showSafeZone for this render
   * @param {boolean} [opts.forExport=false] — skip all canvas overlays (selection indicator, layer bounds)
   * @returns {{ ok: boolean, error?: string }}
   */
  renderFrame(canvas, frameIndex, project, opts = {}) {
    if (!project.isLoaded) {
      drawError(canvas.getContext('2d') || canvas, canvas.width, canvas.height, 'No project loaded');
      return { ok: false, error: 'No project loaded' };
    }

    const frame = project.data.frames[frameIndex];
    if (!frame) {
      return { ok: false, error: `Frame ${frameIndex} not found` };
    }

    const exp    = project.exportConfig;
    const scaleFactor = opts.scaleFactor ?? 1;
    const forExport   = opts.forExport   ?? false;
    const canvasW = (exp.width_px  ?? 1080) * scaleFactor;
    const canvasH = (exp.height_px ?? 1350) * scaleFactor;

    canvas.width  = canvasW;
    canvas.height = canvasH;

    if (opts.displayWidth)  canvas.style.width  = `${opts.displayWidth}px`;
    if (opts.displayHeight) canvas.style.height = `${opts.displayHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return { ok: false, error: 'Could not get 2D context' };

    try {
      // Background
      const bg = project.getFrameBackground(frameIndex);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // White frame mat
      const wf    = frame.white_frame;
      const inset = (wf?.enabled && wf.size_px > 0)
        ? Math.round(wf.size_px * scaleFactor)
        : 0;
      if (inset > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);
      }
      const effW = canvasW - 2 * inset;
      const effH = canvasH - 2 * inset;
      if (inset > 0) { ctx.save(); ctx.translate(inset, inset); }

      // Render layers
      const layers = frame.layers || [];
      for (const layer of layers) {
        if (layer.visible === false) continue;
        try {
          ctx.save();
          renderLayer(ctx, layer, effW, effH, project, frameIndex);
          ctx.restore();
        } catch (layerErr) {
          console.error(`[renderer] Layer "${layer.id}" error:`, layerErr);
          ctx.restore();
          // Draw a subtle error indicator for the layer but continue
          ctx.save();
          ctx.strokeStyle = 'rgba(255,85,85,0.4)';
          ctx.lineWidth = 2;
          ctx.strokeRect(2, 2, canvasW - 4, canvasH - 4);
          ctx.restore();
        }
      }

      // Layer bounds outlines (debug / art-direction aid)
      if (!forExport && this.showLayerBounds) {
        this._drawLayerOutlines(ctx, frame, effW, effH, project);
      }

      // Frame-level logo (if defined outside layers)
      if (frame.logo) {
        try {
          ctx.save();
          renderLayer(ctx, { ...frame.logo, type: 'logo' }, effW, effH, project, frameIndex);
          ctx.restore();
        } catch (e) {
          ctx.restore();
          console.warn('[renderer] Frame logo error:', e);
        }
      }

      // Selection indicator
      // image/overlay: only shown in layers mode; text/shape: always shown when selected
      if (!forExport && this.selectedLayerId) {
        const selLayer = (frame.layers ?? []).find(l => l.id === this.selectedLayerId);
        if (selLayer) {
          const isFullFrame = selLayer.type === 'image' || selLayer.type === 'overlay';
          if (!isFullFrame || this.showLayerBounds) {
            try {
              const bounds = computeLayerBounds(ctx, selLayer, effW, effH, project);
              if (bounds) {
                const pad = effW * 0.008;
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
                ctx.lineWidth   = Math.max(1, effW / 600);
                ctx.setLineDash([effW / 70, effW / 110]);
                ctx.strokeRect(
                  bounds.left   - pad,
                  bounds.top    - pad,
                  (bounds.right  - bounds.left) + pad * 2,
                  (bounds.bottom - bounds.top)  + pad * 2
                );
                // Type badge for full-frame layers (only reached when showLayerBounds is true)
                if (isFullFrame) {
                  const label    = selLayer.type === 'image' ? 'IMG' : 'OVR';
                  const fontSize = Math.max(10, effW * 0.018);
                  ctx.setLineDash([]);
                  ctx.font      = `bold ${fontSize}px sans-serif`;
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                  ctx.fillText(label, bounds.left + pad * 2 + 4, bounds.top + pad * 2 + fontSize);
                }
                ctx.restore();
              }
            } catch { /* ignore — selection indicator is cosmetic */ }
          }
        }
      }

      // Centre-alignment guidelines (shown while dragging)
      if (this.isDragging && this.selectedLayerId) {
        try {
          const selLayer = (frame.layers ?? []).find(l => l.id === this.selectedLayerId);
          if (selLayer) {
            const bounds = computeLayerBounds(ctx, selLayer, effW, effH, project);
            if (bounds) {
              const cx = (bounds.left + bounds.right)  / 2;
              const cy = (bounds.top  + bounds.bottom) / 2;
              const threshX = effW * 0.03;
              const threshY = effH * 0.03;
              const drawV = Math.abs(cx - effW / 2) < threshX;
              const drawH = Math.abs(cy - effH / 2) < threshY;
              if (drawV || drawH) {
                ctx.save();
                ctx.strokeStyle = 'rgba(100, 180, 255, 0.7)';
                ctx.lineWidth   = Math.max(1, effW / 800);
                ctx.setLineDash([effW / 150, effW / 100]);
                if (drawV) {
                  ctx.beginPath();
                  ctx.moveTo(effW / 2, 0);
                  ctx.lineTo(effW / 2, effH);
                  ctx.stroke();
                }
                if (drawH) {
                  ctx.beginPath();
                  ctx.moveTo(0, effH / 2);
                  ctx.lineTo(effW, effH / 2);
                  ctx.stroke();
                }
                ctx.restore();
              }
            }
          }
        } catch { /* cosmetic — must not break render */ }
      }

      // Composition guide overlay
      if (!forExport && this.activeGuide) {
        drawCompositionGuide(ctx, effW, effH, this.activeGuide, this.spiralOrientation);
      }

      // Heatmap overlay (scores pre-computed by app.js after each render)
      if (!forExport && this.showHeatmap && this._heatmapScores) {
        drawHeatmap(ctx, effW, effH, this._heatmapScores);
      }

      // Zone overlays
      if (!forExport && this.analysisZones.length > 0) {
        drawZoneOverlays(ctx, effW, effH, this.analysisZones);
      }

      // Safe zone overlay
      const showSZ = opts.safeZone ?? this.showSafeZone;
      if (showSZ && project.globals.safe_zone_pct > 0) {
        drawSafeZoneOverlay(ctx, effW, effH, project.globals.safe_zone_pct);
      }

      if (inset > 0) ctx.restore();

      return { ok: true };

    } catch (err) {
      console.error(`[renderer] Frame ${frameIndex} fatal error:`, err);
      drawError(ctx, canvasW, canvasH, `Render error: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Render a thumbnail for the filmstrip.
   *
   * @param {HTMLCanvasElement} thumbCanvas
   * @param {number} frameIndex
   * @param {object} project
   * @param {number} [thumbWidth=156]
   * @returns {{ ok: boolean, error?: string }}
   */
  renderThumbnail(thumbCanvas, frameIndex, project, thumbWidth = 156) {
    const exp     = project.exportConfig;
    const aspect  = (exp.height_px ?? 1350) / (exp.width_px ?? 1080);
    const thumbH  = Math.round(thumbWidth * aspect);

    // Render at thumb size directly (no scale factor for thumbnails)
    thumbCanvas.width  = thumbWidth;
    thumbCanvas.height = thumbH;

    const frame = project.data?.frames?.[frameIndex];
    if (!frame) return { ok: false, error: 'Frame not found' };

    const ctx = thumbCanvas.getContext('2d');
    if (!ctx) return { ok: false, error: 'No context' };

    try {
      // Background
      const bg = project.getFrameBackground(frameIndex);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, thumbWidth, thumbH);

      // Render layers at thumbnail scale
      const thumbLayers = frame.layers || [];
      for (const layer of thumbLayers) {
        try {
          ctx.save();
          renderLayer(ctx, layer, thumbWidth, thumbH, project, frameIndex);
          ctx.restore();
        } catch {
          ctx.restore();
        }
      }

      return { ok: true };
    } catch (err) {
      console.error('[renderer] Thumbnail error:', err);
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(0, 0, thumbWidth, thumbH);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Draw faint dashed outlines around every visible (non-selected) layer.
   * Called only when this.showLayerBounds is true.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} frame
   * @param {number} w
   * @param {number} h
   * @param {object} project
   */
  _drawLayerOutlines(ctx, frame, w, h, project) {
    const layers = frame.layers || [];
    let badgeRow = 0; // stack badges vertically for full-frame layers so they don't overlap
    for (const layer of layers) {
      if (layer.visible === false) continue;
      if (layer.id === this.selectedLayerId) continue; // selected layer gets the bright border separately
      const bounds = computeLayerBounds(ctx, layer, w, h, project);
      if (!bounds) continue;

      const pad = w * 0.008;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = Math.max(1, w / 600);
      ctx.setLineDash([w / 70, w / 110]);
      ctx.strokeRect(
        bounds.left  - pad,
        bounds.top   - pad,
        (bounds.right  - bounds.left) + pad * 2,
        (bounds.bottom - bounds.top)  + pad * 2
      );

      // Type badge for full-frame layers — stacked vertically so they never overlap
      if (layer.type === 'image' || layer.type === 'overlay') {
        const label    = layer.type === 'image' ? 'IMG' : 'OVR';
        const fontSize = Math.max(10, w * 0.018);
        const rowY     = bounds.top + pad * 2 + fontSize + badgeRow * (fontSize + 6);
        ctx.setLineDash([]);
        ctx.font      = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(label, bounds.left + pad * 2 + 4, rowY);
        badgeRow++;
      }
      ctx.restore();
    }
  }

  /**
   * Fit a canvas to a container element, preserving aspect ratio.
   * Sets the canvas CSS width/height to fit within the container.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} container
   */
  fitCanvasToContainer(canvas, container) {
    const cw = container.clientWidth  - 32; // some padding
    const ch = container.clientHeight - 80;

    if (cw <= 0 || ch <= 0 || !canvas.width || !canvas.height) return;

    const aspect = canvas.height / canvas.width;
    let displayW = cw;
    let displayH = cw * aspect;

    if (displayH > ch) {
      displayH = ch;
      displayW = ch / aspect;
    }

    canvas.style.width  = `${Math.round(displayW)}px`;
    canvas.style.height = `${Math.round(displayH)}px`;
  }
}
