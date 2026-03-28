/**
 * brief-thumbnails.js — Thumbnail sheet generator for the Brief Export Package.
 *
 * Renders loaded images as a grid of thumbnails (cropped center-fill to the
 * selected aspect ratio), grouped into sheets of THUMB_COLS × THUMB_ROWS images.
 *
 * Constants are exported so callers can show the user the derived dimensions.
 */

export const THUMB_BASE = 400;  // base width px — change to adjust all thumbnail sizes
export const THUMB_COLS = 5;    // columns per sheet
export const THUMB_ROWS = 2;    // rows per sheet  → 10 images per sheet at defaults

const LABEL_H    = 32;          // height of the sheet label strip at bottom (px)
const NAME_BOX_H = 28;          // height of the filename box below each thumbnail (px)

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

/**
 * Generate thumbnail sheets from an array of HTMLImageElement objects.
 * Images are grouped into sheets of THUMB_COLS × THUMB_ROWS.
 * Each image is cropped center-fill to thumbW × thumbH.
 *
 * @param {HTMLImageElement[]} images
 * @param {string[]} names    — original filenames, parallel to images
 * @param {number} thumbW  — thumbnail cell width in px
 * @param {number} thumbH  — thumbnail cell height in px
 * @returns {Promise<Blob[]>}  one PNG Blob per sheet
 */
export async function generateThumbnailSheets(images, names, thumbW, thumbH) {
  const perSheet = THUMB_COLS * THUMB_ROWS;
  const slotH    = thumbH + NAME_BOX_H;
  const sheetW   = THUMB_COLS * thumbW;
  const sheetH   = THUMB_ROWS * slotH + LABEL_H;
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
      const col  = i % THUMB_COLS;
      const row  = Math.floor(i / THUMB_COLS);
      const x    = col * thumbW;
      const y    = row * slotH;

      // Clip to photo cell
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
      ctx.fillRect(x, y, 32, 22);
      ctx.fillStyle = '#e8e8f0';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(num), x + 16, y + 11);

      // Filename box (below the photo cell)
      const name  = names[s * perSheet + i] ?? '';
      const nameY = y + thumbH;
      ctx.fillStyle = '#12121e';
      ctx.fillRect(x, nameY, thumbW, NAME_BOX_H);
      ctx.strokeStyle = '#2a2a3e';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, nameY + 0.5, thumbW - 1, NAME_BOX_H - 1);
      ctx.fillStyle    = '#9898b0';
      ctx.font         = '12px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(truncate(ctx, name, thumbW - 12), x + thumbW / 2, nameY + NAME_BOX_H / 2);
    });

    // Sheet label strip
    const start = s * perSheet + 1;
    const end   = Math.min((s + 1) * perSheet, images.length);
    ctx.fillStyle = '#222230';
    ctx.fillRect(0, THUMB_ROWS * slotH, sheetW, LABEL_H);
    ctx.strokeStyle = '#3a3a46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, THUMB_ROWS * slotH + 0.5);
    ctx.lineTo(sheetW, THUMB_ROWS * slotH + 0.5);
    ctx.stroke();
    ctx.fillStyle    = '#9898b0';
    ctx.font         = '14px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `Sheet ${s + 1} — Images ${start}–${end}`,
      sheetW / 2,
      THUMB_ROWS * slotH + LABEL_H / 2,
    );

    blobs.push(await canvasToBlob(canvas));
  }

  return blobs;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + '…';
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null (possible tainted canvas)'));
    }, 'image/png');
  });
}
