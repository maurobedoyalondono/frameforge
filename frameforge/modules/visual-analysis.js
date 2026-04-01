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
