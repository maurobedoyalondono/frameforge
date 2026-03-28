/**
 * export.js — PNG export functionality for FrameForge.
 *
 * Creates offscreen canvases at export resolution. Print/custom targets multiply
 * width_px and height_px by scale_factor; social targets (instagram-*, facebook-*)
 * export at native resolution (scale_factor is ignored).
 * Uses sequential downloads (no zip library required).
 */

import { Renderer } from './renderer.js';

const renderer = new Renderer();

/**
 * Resolve a filename pattern with token substitution.
 *
 * Tokens: {project_id}, {frame_index}, {frame_id}, {target}, {date}
 *
 * @param {string} pattern
 * @param {object} tokens
 * @returns {string}
 */
export function resolveFilename(pattern, tokens) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return pattern
    .replace(/\{project_id\}/g,   tokens.project_id   ?? 'project')
    .replace(/\{frame_index\}/g,  String(tokens.frame_index ?? 0).padStart(3, '0'))
    .replace(/\{frame_id\}/g,     tokens.frame_id     ?? 'frame')
    .replace(/\{target\}/g,       tokens.target       ?? 'output')
    .replace(/\{date\}/g,         today)
    + '.png';
}

/**
 * Export a single frame as a PNG download.
 *
 * @param {number} frameIndex
 * @param {object} project — Project instance
 * @param {function} [onProgress] — callback(message)
 * @returns {Promise<{ ok: boolean, filename?: string, error?: string }>}
 */
export async function exportFrame(frameIndex, project, onProgress) {
  if (!project.isLoaded) return { ok: false, error: 'No project loaded' };

  const exp   = project.exportConfig;
  const frame = project.data.frames[frameIndex];
  if (!frame) return { ok: false, error: `Frame ${frameIndex} not found` };

  const scaleFactor = resolveExportScale(exp);
  const exportW     = (exp.width_px  ?? 1080) * scaleFactor;
  const exportH     = (exp.height_px ?? 1350) * scaleFactor;

  onProgress?.(`Rendering frame ${frameIndex + 1}…`);

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width  = exportW;
  canvas.height = exportH;

  const result = renderer.renderFrame(canvas, frameIndex, project, {
    scaleFactor,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  // Resolve filename
  const filename = resolveFilename(exp.filename_pattern || '{project_id}_{frame_index}_{frame_id}', {
    project_id:  project.data.project.id,
    frame_index: frameIndex + 1,
    frame_id:    frame.id,
    target:      exp.target,
  });

  onProgress?.(`Encoding ${filename}…`);

  // toBlob → download
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve({ ok: false, error: 'Canvas toBlob returned null' });
        return;
      }
      triggerDownload(blob, filename);
      resolve({ ok: true, filename });
    }, 'image/png');
  });
}

/**
 * Export all frames sequentially.
 *
 * @param {object} project — Project instance
 * @param {function} [onProgress] — callback(frameIndex, total, message)
 * @param {function} [onFrameDone] — callback(frameIndex, result)
 * @returns {Promise<{ exported: number, failed: number, errors: string[] }>}
 */
export async function exportAllFrames(project, onProgress, onFrameDone) {
  if (!project.isLoaded) return { exported: 0, failed: 0, errors: ['No project loaded'] };

  const total   = project.frameCount;
  let exported  = 0;
  let failed    = 0;
  const errors  = [];

  for (let i = 0; i < total; i++) {
    onProgress?.(i, total, `Exporting frame ${i + 1} of ${total}…`);

    // Small yield to let UI update
    await yieldToUI();

    const result = await exportFrame(i, project, (msg) => onProgress?.(i, total, msg));

    if (result.ok) {
      exported++;
    } else {
      failed++;
      errors.push(`Frame ${i + 1}: ${result.error}`);
    }

    onFrameDone?.(i, result);

    // Brief delay between downloads to avoid browser popup blocking
    if (i < total - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return { exported, failed, errors };
}

/**
 * Trigger a file download from a Blob.
 * @param {Blob} blob
 * @param {string} filename
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Resolve the effective scale factor for export.
 * Social network targets (instagram-*, facebook-*) export at native resolution
 * (scale_factor = 1). Print and custom targets use the configured scale_factor.
 *
 * @param {object} exp — export config object
 * @returns {number}
 */
function resolveExportScale(exp) {
  const target = exp.target ?? '';
  const isSocial = target.startsWith('instagram-') || target.startsWith('facebook-');
  return isSocial ? 1 : (exp.scale_factor ?? 1);
}

/**
 * Yield to the browser event loop briefly.
 */
function yieldToUI() {
  return new Promise((r) => setTimeout(r, 0));
}

/**
 * Get a data URL for a frame (for clipboard or preview use).
 * @param {number} frameIndex
 * @param {object} project
 * @returns {Promise<string|null>}
 */
export async function getFrameDataURL(frameIndex, project) {
  if (!project.isLoaded) return null;

  const exp   = project.exportConfig;
  const scaleFactor = resolveExportScale(exp);

  const canvas = document.createElement('canvas');
  canvas.width  = (exp.width_px  ?? 1080) * scaleFactor;
  canvas.height = (exp.height_px ?? 1350) * scaleFactor;

  const result = renderer.renderFrame(canvas, frameIndex, project, { scaleFactor });
  if (!result.ok) return null;

  return canvas.toDataURL('image/png');
}
