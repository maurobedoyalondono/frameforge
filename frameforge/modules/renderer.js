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
      if (this.showLayerBounds) {
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
      if (this.selectedLayerId) {
        const selLayer = (frame.layers ?? []).find(l => l.id === this.selectedLayerId);
        if (selLayer) {
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
              // Type badge for full-frame layers so the selected type is always visible
              if (selLayer.type === 'image' || selLayer.type === 'overlay') {
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
