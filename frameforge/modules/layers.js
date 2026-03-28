/**
 * layers.js — Per-layer rendering functions for FrameForge.
 *
 * Each function receives (ctx, layer, canvasW, canvasH, project)
 * and draws directly onto the provided 2D context.
 */

import { buildFontString } from './fonts.js';
import { ASSET_LIBRARY } from '../data/asset-library.js';

// ── Coordinate helpers ────────────────────────────────────────────────────

/** Convert percent to pixel (width axis) */
const px  = (pct, w) => (pct / 100) * w;
/** Convert percent to pixel (height axis) */
const py  = (pct, h) => (pct / 100) * h;
/** Clamp a value */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Canvas composite operation map for shape blend_mode values. */
const SHAPE_BLEND_MAP = {
  normal:       'source-over',
  multiply:     'multiply',
  screen:       'screen',
  overlay:      'overlay',
  'soft-light': 'soft-light',
};

/**
 * Resolve a position {mode, zone, offset_x_pct, offset_y_pct, x_pct, y_pct}
 * to absolute {x, y} in pixels.
 */
function resolvePosition(pos, w, h) {
  if (!pos) return { x: 0, y: 0 };

  if (pos.mode === 'absolute' || pos.x_pct != null) {
    return {
      x: px(pos.x_pct ?? 0, w),
      y: py(pos.y_pct ?? 0, h),
    };
  }

  // zone mode
  const zone = pos.zone || 'top-left';
  const offsetX = pos.offset_x_pct ?? 0;
  const offsetY = pos.offset_y_pct ?? 0;

  const ZONE_ANCHORS = {
    'top-left':      [0,   0   ],
    'top-center':    [50,  0   ],
    'top-right':     [100, 0   ],
    'middle-left':   [0,   50  ],
    'middle-center': [50,  50  ],
    'middle-right':  [100, 50  ],
    'bottom-left':   [0,   100 ],
    'bottom-center': [50,  100 ],
    'bottom-right':  [100, 100 ],
  };

  const [ax, ay] = ZONE_ANCHORS[zone] ?? [0, 0];

  return {
    x: px(ax + offsetX, w),
    y: py(ay + offsetY, h),
  };
}

// ── Image layer ───────────────────────────────────────────────────────────

/**
 * Render an "image" layer.
 * @param {number|null} frameIndex — used to resolve manual assignments
 */
export function renderImageLayer(ctx, layer, w, h, project, frameIndex = null) {
  const src = layer.src;
  const img = project.getImageForLayer(src, frameIndex);

  ctx.save();

  const opacity = clamp(layer.opacity ?? 1.0, 0, 1);
  ctx.globalAlpha = opacity;

  if (!img) {
    // Gray placeholder
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#606080';
    ctx.font = `14px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(src || 'missing image', w / 2, h / 2);

    ctx.restore();
    return;
  }

  const fit = layer.fit || 'cover';
  const pos = layer.position || { x_pct: 50, y_pct: 50 };
  const focalX = pos.x_pct ?? 50;
  const focalY = pos.y_pct ?? 50;

  let drawW, drawH, drawX, drawY;

  if (fit === 'cover') {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    drawW = img.naturalWidth  * scale;
    drawH = img.naturalHeight * scale;
    drawX = (w - drawW) * (focalX / 100);
    drawY = (h - drawH) * (focalY / 100);
  } else if (fit === 'contain') {
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    drawW = img.naturalWidth  * scale;
    drawH = img.naturalHeight * scale;
    drawX = (w - drawW) * (focalX / 100);
    drawY = (h - drawH) * (focalY / 100);
  } else {
    // fill
    drawW = w;
    drawH = h;
    drawX = 0;
    drawY = 0;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

// ── Overlay layer ─────────────────────────────────────────────────────────

/**
 * Render an "overlay" layer (flat color or gradient).
 */
export function renderOverlayLayer(ctx, layer, w, h, _project) {
  ctx.save();

  const opacity   = clamp(layer.opacity ?? 1.0, 0, 1);
  const blendMode = layer.blend_mode || 'source-over';
  ctx.globalCompositeOperation = blendMode;

  const gradient = layer.gradient;

  if (gradient?.enabled) {
    const dir       = gradient.direction || 'to-bottom';
    const fromOp    = clamp(gradient.from_opacity ?? 0,    0, 1);
    const toOp      = clamp(gradient.to_opacity   ?? 1,    0, 1);
    const fromPos   = clamp(gradient.from_position_pct ?? 0,   0, 100) / 100;
    const toPos     = clamp(gradient.to_position_pct   ?? 100, 0, 100) / 100;

    let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    switch (dir) {
      case 'to-bottom':       x0=0;  y0=0;  x1=0;  y1=h;  break;
      case 'to-top':          x0=0;  y0=h;  x1=0;  y1=0;  break;
      case 'to-right':        x0=0;  y0=0;  x1=w;  y1=0;  break;
      case 'to-left':         x0=w;  y0=0;  x1=0;  y1=0;  break;
      case 'to-bottom-left':  x0=w;  y0=0;  x1=0;  y1=h;  break;
      case 'to-bottom-right': x0=0;  y0=0;  x1=w;  y1=h;  break;
      default:                x0=0;  y0=0;  x1=0;  y1=h;
    }

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    const color = layer.color || '#000000';
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // fromPos / toPos define where the gradient color stops are
    if (fromPos > 0) {
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
    }
    grad.addColorStop(fromPos, `rgba(${r},${g},${b},${fromOp * opacity})`);
    grad.addColorStop(toPos,   `rgba(${r},${g},${b},${toOp   * opacity})`);
    if (toPos < 1) {
      grad.addColorStop(1, `rgba(${r},${g},${b},${toOp * opacity})`);
    }

    ctx.fillStyle = grad;
  } else {
    const color = layer.color || '#000000';
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
  }

  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ── Text layer ────────────────────────────────────────────────────────────

/**
 * Compute the rendered bounding box of a text layer without drawing.
 * Returns { top, bottom, left, right } in canvas pixels, or null if not computable.
 * Used by the renderer (selection indicator), drag.js (hit-testing), and the text toolbar (positioning).
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

/**
 * Compute the bounding box of a shape layer in canvas pixels.
 * Returns { top, bottom, left, right } or null if bounds cannot be determined.
 * Used by drag.js for hit-testing and by the shape toolbar for positioning.
 */
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

    // image_mask: uses resolvePosition for zone + absolute support
    if (shape === 'image_mask') {
      const dims = layer.dimensions || {};
      if (dims.width_pct == null || dims.height_pct == null) return null;
      const pos    = resolvePosition(layer.position, w, h);
      const width  = (dims.width_pct  / 100) * w;
      const height = (dims.height_pct / 100) * h;
      return { top: pos.y, bottom: pos.y + height, left: pos.x, right: pos.x + width };
    }

    const dims    = layer.dimensions || {};
    const x_pct   = layer.position?.x_pct;
    const y_pct   = layer.position?.y_pct;

    if (x_pct == null || y_pct == null) return null;
    if (dims.width_pct == null) return null;

    const posX   = px(x_pct, w);
    const posY   = py(y_pct, h);
    const width  = px(dims.width_pct, w);
    const height = dims.height_pct != null
      ? py(dims.height_pct, h)
      : (dims.height_px ?? 2);

    if (shape === 'line') {
      const angleDeg = layer.angle_deg ?? 0;
      if (angleDeg === 0) {
        // Horizontal line: rect at posX, posY - height/2, width × height
        return {
          top:    posY - height / 2,
          bottom: posY + height / 2,
          left:   posX,
          right:  posX + width,
        };
      } else {
        // Rotated line: centered at (posX + width/2, posY)
        const cx  = posX + width / 2;
        const cy  = posY;
        const rad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        // Half-extents of the rotated rect
        const hw  = width / 2;
        const hh  = height / 2;
        // Four corners of rotated rect relative to center
        const corners = [
          [ hw * cos - hh * sin,  hw * sin + hh * cos],
          [-hw * cos - hh * sin, -hw * sin + hh * cos],
          [ hw * cos + hh * sin,  hw * sin - hh * cos],
          [-hw * cos + hh * sin, -hw * sin - hh * cos],
        ];
        const xs = corners.map(([dx]) => cx + dx);
        const ys = corners.map(([, dy]) => cy + dy);
        return {
          top:    Math.min(...ys),
          bottom: Math.max(...ys),
          left:   Math.min(...xs),
          right:  Math.max(...xs),
        };
      }
    } else if (shape === 'arrow') {
      const angleDeg = layer.angle_deg ?? 0;
      const rad = (angleDeg * Math.PI) / 180;
      const endX = posX + width * Math.cos(rad);
      const endY = posY + width * Math.sin(rad);
      const pad = Math.max(8, height); // extra padding for arrowhead
      return {
        top:    Math.min(posY, endY) - pad,
        bottom: Math.max(posY, endY) + pad,
        left:   Math.min(posX, endX) - pad,
        right:  Math.max(posX, endX) + pad,
      };
    } else {
      // rectangle, circle, triangle, polygon — bounding box is posX,posY + width×height
      return {
        top:    posY,
        bottom: posY + height,
        left:   posX,
        right:  posX + width,
      };
    }
  } catch (_e) {
    return null;
  }
}

/**
 * Measure and wrap text into lines that fit within maxWidthPx.
 * Returns array of strings.
 */
function wrapText(ctx, text, maxWidthPx) {
  if (!maxWidthPx || maxWidthPx <= 0) return [text];

  const lines  = [];
  const paras  = text.split('\n');

  for (const para of paras) {
    const words = para.split(' ');
    let current = '';

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const { width } = ctx.measureText(test);
      if (width > maxWidthPx && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }

  return lines.length ? lines : [''];
}

/**
 * Draw a text string with optional letter spacing (character-by-character).
 */
function drawTextWithSpacing(ctx, text, x, y, letterSpacingPx) {
  if (letterSpacingPx === 0) {
    ctx.fillText(text, x, y);
    return;
  }
  let curX = x;
  if (ctx.textAlign === 'center') {
    // Compute total width and start from center offset
    let totalW = 0;
    for (const ch of text) totalW += ctx.measureText(ch).width + letterSpacingPx;
    totalW -= letterSpacingPx;
    curX = x - totalW / 2;
    ctx.textAlign = 'left';
    for (const ch of text) {
      ctx.fillText(ch, curX, y);
      curX += ctx.measureText(ch).width + letterSpacingPx;
    }
    ctx.textAlign = 'center';
  } else if (ctx.textAlign === 'right') {
    let totalW = 0;
    for (const ch of text) totalW += ctx.measureText(ch).width + letterSpacingPx;
    totalW -= letterSpacingPx;
    curX = x - totalW;
    ctx.textAlign = 'left';
    for (const ch of text) {
      ctx.fillText(ch, curX, y);
      curX += ctx.measureText(ch).width + letterSpacingPx;
    }
    ctx.textAlign = 'right';
  } else {
    for (const ch of text) {
      ctx.fillText(ch, curX, y);
      curX += ctx.measureText(ch).width + letterSpacingPx;
    }
  }
}

/**
 * Render a "text" layer.
 */
export function renderTextLayer(ctx, layer, w, h, project) {
  const font     = project.resolveFont(layer.font);
  const sizePx   = (font.size_pct / 100) * h;
  const opacity  = clamp(font.opacity ?? 1.0, 0, 1);
  const color    = font.color || '#FFFFFF';
  const lineH    = font.line_height ?? 1.2;
  const spacing  = (font.letter_spacing_em ?? 0) * sizePx;
  const align    = layer.align || 'left';
  const maxW     = layer.max_width_pct != null ? px(layer.max_width_pct, w) : w;
  const content  = layer.content ?? '';
  const pos      = resolvePosition(layer.position, w, h);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font      = buildFontString(font, sizePx);
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;

  // Shadow
  if (layer.shadow?.enabled) {
    const sh = layer.shadow;
    const shOpacity = clamp(sh.opacity ?? 0.5, 0, 1);
    const shColor   = sh.color || '#000000';
    const r = parseInt(shColor.slice(1, 3), 16);
    const g = parseInt(shColor.slice(3, 5), 16);
    const b = parseInt(shColor.slice(5, 7), 16);
    ctx.shadowColor   = `rgba(${r},${g},${b},${shOpacity})`;
    ctx.shadowBlur    = sh.blur_px   ?? 0;
    ctx.shadowOffsetX = sh.offset_x  ?? 0;
    ctx.shadowOffsetY = sh.offset_y  ?? 0;
  }

  const lines = wrapText(ctx, content, maxW);
  const linePx = lineH * sizePx;

  // Compute text X based on alignment and position
  let textX = pos.x;
  if (align === 'center') {
    textX = pos.x;
  } else if (align === 'right') {
    textX = pos.x;
  }

  // For bottom zones: anchor is the BOTTOM of the last line; text grows upward.
  // For all other zones: anchor is the TOP of the first line; text grows downward.
  const isBottomZone = layer.position?.mode !== 'absolute' &&
                       (layer.position?.zone ?? '').startsWith('bottom');

  for (let i = 0; i < lines.length; i++) {
    const lineY = isBottomZone
      ? pos.y - (lines.length - i) * linePx   // upward: last line at pos.y
      : pos.y + i * linePx;                    // downward: first line at pos.y
    drawTextWithSpacing(ctx, lines[i], textX, lineY, spacing);
  }

  ctx.restore();
}

// ── Shape style helpers ───────────────────────────────────────────────────

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

/**
 * Apply fill and stroke to the current canvas path.
 * Call after ctx.beginPath() + path commands, before ctx.restore().
 */
function applyShapeStyle(ctx, style) {
  const isHex = c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
  if (style.fillColor && isHex(style.fillColor)) {
    const r = parseInt(style.fillColor.slice(1, 3), 16);
    const g = parseInt(style.fillColor.slice(3, 5), 16);
    const b = parseInt(style.fillColor.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r},${g},${b},${style.fillOpacity})`;
    ctx.fill();
  }
  if (style.strokeColor && isHex(style.strokeColor)) {
    const r = parseInt(style.strokeColor.slice(1, 3), 16);
    const g = parseInt(style.strokeColor.slice(3, 5), 16);
    const b = parseInt(style.strokeColor.slice(5, 7), 16);
    ctx.strokeStyle = `rgba(${r},${g},${b},${style.strokeOpacity})`;
    ctx.lineWidth   = style.strokeWidth;
    ctx.stroke();
  }
}

// ── Shape layer ───────────────────────────────────────────────────────────

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
    const dashValues = String(layer.stroke_dash).trim().split(/\s+/).map(Number).filter(n => isFinite(n) && n >= 0);
    if (dashValues.length) ctx.setLineDash(dashValues);
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
      if (tok !== tok.toUpperCase()) {
        console.warn(`[layers] path "${layer.id}": lowercase command '${tok}' treated as absolute (relative commands not supported).`);
      }
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
  if (vw <= 0 || vh <= 0) return;

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
  if (!asset.path_d || typeof asset.path_d !== 'string') {
    console.warn(`[layers] image_mask "${assetName}": asset has no valid path_d.`);
    return;
  }
  let path2d;
  try {
    path2d = new Path2D(asset.path_d);
  } catch (e) {
    console.warn(`[layers] image_mask "${assetName}": Path2D parse failed — ${e.message}`);
    return;
  }
  ctx.fillStyle = `rgba(${r},${g},${b},${fillOpacity})`;
  ctx.fill(path2d);
}

/**
 * Render a "shape" layer (line or rectangle).
 */
export function renderShapeLayer(ctx, layer, w, h, project) {
  const shape   = layer.shape || 'rectangle';
  const dims    = layer.dimensions || {};
  const width   = px(dims.width_pct ?? 10, w);
  const height  = dims.height_pct != null
    ? py(dims.height_pct, h)
    : (dims.height_px ?? 2);

  const resolved = resolvePosition(layer.position, w, h);
  const posX = resolved.x;
  const posY = resolved.y;

  ctx.save();

  // Blend mode — applies to all shape types
  ctx.globalCompositeOperation = SHAPE_BLEND_MAP[layer.blend_mode] || 'source-over';

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
    }
  } else if (shape === 'rectangle') {
    const radius = layer.border_radius_px ?? 0;
    ctx.beginPath();
    if (radius > 0 && ctx.roundRect) {
      ctx.roundRect(posX, posY, width, height, radius);
    } else {
      ctx.rect(posX, posY, width, height);
    }
    applyShapeStyle(ctx, resolveShapeStyle(layer));
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
      const isHex = c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
      if (isHex(arrowStyle.strokeColor)) {
        const r = parseInt(arrowStyle.strokeColor.slice(1, 3), 16);
        const g = parseInt(arrowStyle.strokeColor.slice(3, 5), 16);
        const b = parseInt(arrowStyle.strokeColor.slice(5, 7), 16);
        ctx.strokeStyle = `rgba(${r},${g},${b},${arrowStyle.strokeOpacity})`;
        ctx.stroke();
      }
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
        const isHex = c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
        if (isHex(arrowStyle.strokeColor)) {
          const r = parseInt(arrowStyle.strokeColor.slice(1, 3), 16);
          const g = parseInt(arrowStyle.strokeColor.slice(3, 5), 16);
          const b = parseInt(arrowStyle.strokeColor.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r},${g},${b},${arrowStyle.strokeOpacity})`;
          ctx.fill();
        }
      }
    }

    if (arrowhead === 'end' || arrowhead === 'both') {
      drawHead(posX + width * cos, posY + width * sin, cos, sin);
    }
    if (arrowhead === 'start' || arrowhead === 'both') {
      drawHead(posX, posY, -cos, -sin);
    }
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
  } else if (shape === 'polyline') {
    renderPolylineShape(ctx, layer, w, h);
  } else if (shape === 'path') {
    renderPathShape(ctx, layer, w, h);
  } else if (shape === 'image_mask') {
    renderImageMaskShape(ctx, layer, w, h, project);
  }

  ctx.restore();
}

// ── Logo layer ────────────────────────────────────────────────────────────

/**
 * Render a "logo" layer.
 */
export function renderLogoLayer(ctx, layer, w, h, project) {
  const src     = layer.src;
  const img     = project.getImage(src);
  const opacity = clamp(layer.opacity ?? 1.0, 0, 1);
  const widthPx = px(layer.width_pct ?? 10, w);
  const pos     = resolvePosition(layer.position, w, h);

  ctx.save();
  ctx.globalAlpha = opacity;

  if (!img) {
    ctx.fillStyle = '#555560';
    ctx.fillRect(pos.x, pos.y, widthPx, widthPx * 0.4);
    ctx.restore();
    return;
  }

  const aspectRatio = img.naturalHeight / img.naturalWidth;
  const drawH = widthPx * aspectRatio;

  ctx.drawImage(img, pos.x, pos.y, widthPx, drawH);
  ctx.restore();
}

// ── Stats block layer ─────────────────────────────────────────────────────

/**
 * Render a "stats_block" layer (horizontal or vertical layout of value+label pairs).
 */
export function renderStatsBlockLayer(ctx, layer, w, h, project) {
  const layout = layer.layout || 'horizontal';
  const gapPx  = px(layer.gap_pct ?? 5, w);
  const items  = layer.items || [];
  const pos    = resolvePosition(layer.position, w, h);

  // For bottom zones: anchor is the BOTTOM of the block; shift startY upward.
  const isBottomZone = layer.position?.mode !== 'absolute' &&
                       (layer.position?.zone ?? '').startsWith('bottom');

  ctx.save();

  if (layout === 'horizontal') {
    // Compute block height (same for all columns: value row + label row)
    let startY = pos.y;
    if (isBottomZone && items.length > 0) {
      const vFont  = project.resolveFont(items[0].value_font);
      const lFont  = project.resolveFont(items[0].label_font);
      const vSize  = (vFont.size_pct / 100) * h;
      const lSize  = (lFont.size_pct / 100) * h;
      const blockH = vSize * (vFont.line_height ?? 1.0) + lSize * (lFont.line_height ?? 1.2);
      startY = pos.y - blockH;
    }

    let curX = pos.x;

    for (const item of items) {
      const vFont  = project.resolveFont(item.value_font);
      const lFont  = project.resolveFont(item.label_font);
      const vSize  = (vFont.size_pct / 100) * h;
      const lSize  = (lFont.size_pct / 100) * h;
      const vColor = vFont.color || '#FFFFFF';
      const lColor = lFont.color || '#999999';
      const vSpacing = (vFont.letter_spacing_em ?? 0) * vSize;
      const lSpacing = (lFont.letter_spacing_em ?? 0) * lSize;

      // Draw value
      ctx.globalAlpha  = clamp(vFont.opacity ?? 1.0, 0, 1);
      ctx.font         = buildFontString(vFont, vSize);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = vColor;
      drawTextWithSpacing(ctx, item.value || '', curX, startY, vSpacing);

      // Measure value width for positioning label below
      ctx.font = buildFontString(vFont, vSize);
      const valueMetrics = ctx.measureText(item.value || '');

      // Draw label below value
      const labelY = startY + vSize * (vFont.line_height ?? 1.0);
      ctx.globalAlpha  = clamp(lFont.opacity ?? 1.0, 0, 1);
      ctx.font         = buildFontString(lFont, lSize);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = lColor;
      drawTextWithSpacing(ctx, item.label || '', curX, labelY, lSpacing);

      // Compute column width for advancing curX
      ctx.font = buildFontString(lFont, lSize);
      const labelWidth = ctx.measureText(item.label || '').width;
      const colWidth   = Math.max(valueMetrics.width, labelWidth);

      curX += colWidth + gapPx;
    }
  } else {
    // vertical layout — compute total height first for bottom zones
    let startY = pos.y;
    if (isBottomZone) {
      let totalH = 0;
      for (const item of items) {
        const vFont = project.resolveFont(item.value_font);
        const lFont = project.resolveFont(item.label_font);
        const vSize = (vFont.size_pct / 100) * h;
        const lSize = (lFont.size_pct / 100) * h;
        totalH += vSize * (vFont.line_height ?? 1.0) + lSize * (lFont.line_height ?? 1.2) + gapPx;
      }
      startY = pos.y - totalH;
    }

    let curY = startY;

    for (const item of items) {
      const vFont  = project.resolveFont(item.value_font);
      const lFont  = project.resolveFont(item.label_font);
      const vSize  = (vFont.size_pct / 100) * h;
      const lSize  = (lFont.size_pct / 100) * h;
      const vColor = vFont.color || '#FFFFFF';
      const lColor = lFont.color || '#999999';
      const vSpacing = (vFont.letter_spacing_em ?? 0) * vSize;
      const lSpacing = (lFont.letter_spacing_em ?? 0) * lSize;

      ctx.globalAlpha  = clamp(vFont.opacity ?? 1.0, 0, 1);
      ctx.font         = buildFontString(vFont, vSize);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = vColor;
      drawTextWithSpacing(ctx, item.value || '', pos.x, curY, vSpacing);
      curY += vSize * (vFont.line_height ?? 1.0);

      ctx.globalAlpha  = clamp(lFont.opacity ?? 1.0, 0, 1);
      ctx.font         = buildFontString(lFont, lSize);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = lColor;
      drawTextWithSpacing(ctx, item.label || '', pos.x, curY, lSpacing);
      curY += lSize * (lFont.line_height ?? 1.2) + gapPx;
    }
  }

  ctx.restore();
}

// ── Dispatch ──────────────────────────────────────────────────────────────

/**
 * Render a single layer by dispatching to the correct function.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} layer
 * @param {number} w — canvas width
 * @param {number} h — canvas height
 * @param {object} project — Project instance
 * @param {number|null} [frameIndex] — passed to image layer for assignment resolution
 */
export function renderLayer(ctx, layer, w, h, project, frameIndex = null) {
  switch (layer.type) {
    case 'image':       renderImageLayer      (ctx, layer, w, h, project, frameIndex); break;
    case 'overlay':     renderOverlayLayer    (ctx, layer, w, h, project); break;
    case 'text':        renderTextLayer       (ctx, layer, w, h, project); break;
    case 'shape':       renderShapeLayer      (ctx, layer, w, h, project); break;
    case 'logo':        renderLogoLayer       (ctx, layer, w, h, project); break;
    case 'stats_block': renderStatsBlockLayer (ctx, layer, w, h, project); break;
    default:
      console.warn(`[layers] Unknown layer type: ${layer.type}`);
  }
}
