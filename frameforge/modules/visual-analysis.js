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

/**
 * WCAG 2.1 contrast ratio between two hex colours.
 *
 * @param {string} hexFg — 6-digit hex colour (e.g. '#ff0000')
 * @param {string} hexBg — 6-digit hex colour
 * @returns {number} contrast ratio (1–21)
 */
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
 * @returns {{ scores: Float32Array, lumaScores: Float32Array, contrastScores: Float32Array, satScores: Float32Array }}
 */
export function buildHeatmap(imageData, canvasW, canvasH, gridSize = 16) {
  const scores        = new Float32Array(gridSize * gridSize);
  const lumaScores    = new Float32Array(gridSize * gridSize);
  const contrastScores = new Float32Array(gridSize * gridSize);
  const satScores     = new Float32Array(gridSize * gridSize);
  const cellW  = canvasW / gridSize;
  const cellH  = canvasH / gridSize;
  const data   = imageData.data;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x0 = Math.floor(col * cellW);
      const y0 = Math.floor(row * cellH);
      const x1 = Math.floor((col + 1) * cellW);
      const y1 = Math.floor((row + 1) * cellH);

      let sumL = 0, sumL2 = 0, sumS = 0, count = 0;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = (y * canvasW + x) * 4;
          const r   = data[idx];
          const g   = data[idx + 1];
          const b   = data[idx + 2];

          // BT.601 luma on gamma-encoded values — intentional; WCAG linear luminance
          // is reserved for contrast-ratio comparisons only.
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          sumL  += lum;
          sumL2 += lum * lum;

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
      const variance = (sumL2 / count) - (avgL * avgL);
      const stdDev = Math.sqrt(Math.max(0, variance));
      const contrast = Math.min(stdDev * 4, 1); // scale stddev to ~0–1

      const cellIndex = row * gridSize + col;
      lumaScores[cellIndex]      = avgL;
      contrastScores[cellIndex]  = contrast;
      satScores[cellIndex]       = avgS;
      scores[cellIndex]          = 0.4 * avgL + 0.4 * contrast + 0.2 * avgS;
    }
  }

  return { scores, lumaScores, contrastScores, satScores };
}

/**
 * Find the best canvas position for a layer to either balance or complement
 * the photo's visual weight.
 *
 * @param {Float32Array} heatmapScores — gridSize×gridSize combined weight scores (0–1)
 * @param {number} canvasW — canvas width in pixels
 * @param {number} canvasH — canvas height in pixels
 * @param {number} layerW  — layer bounding box width in pixels
 * @param {number} layerH  — layer bounding box height in pixels
 * @param {number} [gridSize=16]
 * @returns {{ balance: {x:number, y:number}, legibility: {x:number, y:number} }}
 *   Pixel coordinates for the layer top-left, clamped to canvas bounds.
 */
export function findBestPosition(heatmapScores, canvasW, canvasH, layerW, layerH, gridSize = 16) {
  const cellW = canvasW / gridSize;
  const cellH = canvasH / gridSize;

  // Pre-compute left/right weight split from the heatmap
  let sumLeft = 0, sumRight = 0;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const score = heatmapScores[row * gridSize + col];
      const cellCX = (col + 0.5) * cellW;
      if (cellCX < canvasW / 2) sumLeft  += score;
      else                       sumRight += score;
    }
  }
  const totalWeight = sumLeft + sumRight || 1;

  // Synthetic element weight: proportional to area, capped at 40% of total
  const elemArea   = (layerW * layerH) / (canvasW * canvasH);
  const elemWeight = Math.min(elemArea * totalWeight * 0.4, totalWeight * 0.4);

  // maxDelta: worst-case delta after adding element to one side
  const maxDelta   = totalWeight + elemWeight;

  // 5×5 candidate grid for top-left anchor (12.5% increments)
  const STEPS = 5;
  let bestBalance    = { score: -1, x: 0, y: 0 };
  let bestLegibility = { score: -1, x: 0, y: 0 };

  for (let row = 0; row < STEPS; row++) {
    for (let col = 0; col < STEPS; col++) {
      const cx = Math.round(col * canvasW * 0.125);
      const cy = Math.round(row * canvasH * 0.125);

      // Skip if element overflows canvas
      if (cx + layerW > canvasW || cy + layerH > canvasH) continue;

      // ── Legibility score ────────────────────────────────────────────────
      let overlapSum = 0, overlapCount = 0;
      for (let gr = 0; gr < gridSize; gr++) {
        for (let gc = 0; gc < gridSize; gc++) {
          const cellX0 = gc * cellW, cellX1 = (gc + 1) * cellW;
          const cellY0 = gr * cellH, cellY1 = (gr + 1) * cellH;
          if (cellX1 > cx && cellX0 < cx + layerW &&
              cellY1 > cy && cellY0 < cy + layerH) {
            overlapSum += heatmapScores[gr * gridSize + gc];
            overlapCount++;
          }
        }
      }
      const avgOverlap      = overlapCount > 0 ? overlapSum / overlapCount : 0;
      const legibilityScore = 1 - avgOverlap;

      // ── Balance score ────────────────────────────────────────────────────
      const elemCX   = cx + layerW / 2;
      const onRight  = elemCX >= canvasW / 2;
      const newLeft  = onRight ? sumLeft  : sumLeft  + elemWeight;
      const newRight = onRight ? sumRight + elemWeight : sumRight;
      const newDelta = Math.abs(newLeft - newRight);
      const balanceScore = 1 - (newDelta / maxDelta);

      // ── Combined scores ──────────────────────────────────────────────────
      const balanceCombined    = 0.75 * balanceScore + 0.25 * legibilityScore;
      const legibilityCombined = 0.25 * balanceScore + 0.75 * legibilityScore;

      if (balanceCombined    > bestBalance.score)    { bestBalance    = { score: balanceCombined,    x: cx, y: cy }; }
      if (legibilityCombined > bestLegibility.score) { bestLegibility = { score: legibilityCombined, x: cx, y: cy }; }
    }
  }

  // Clamp to canvas bounds
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return {
    balance: {
      x: clamp(bestBalance.x,    0, canvasW - layerW),
      y: clamp(bestBalance.y,    0, canvasH - layerH),
    },
    legibility: {
      x: clamp(bestLegibility.x, 0, canvasW - layerW),
      y: clamp(bestLegibility.y, 0, canvasH - layerH),
    },
  };
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
  let sumR = 0, sumG = 0, sumB = 0, sumL = 0, sumL2 = 0, sumS = 0, count = 0;

  const canvasH = imageData.data.length / 4 / canvasW;
  const clampedX  = Math.max(0, x);
  const clampedY  = Math.max(0, y);
  const clampedX1 = Math.min(x + w, canvasW);
  const clampedY1 = Math.min(y + h, canvasH);

  for (let py = clampedY; py < clampedY1; py++) {
    for (let px = clampedX; px < clampedX1; px++) {
      const idx = (py * canvasW + px) * 4;
      const r   = data[idx];
      const g   = data[idx + 1];
      const b   = data[idx + 2];

      sumR += r;
      sumG += g;
      sumB += b;

      // BT.601 luma on gamma-encoded values — intentional; WCAG linear luminance
      // is reserved for contrast-ratio comparisons only.
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      sumL  += lum;
      sumL2 += lum * lum;

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

  const variance = (sumL2 / count) - (avgL * avgL);
  const stdDev   = Math.sqrt(Math.max(0, variance));
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
