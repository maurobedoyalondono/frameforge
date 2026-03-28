/**
 * dropzone.js — Drag-and-drop file handling.
 *
 * Handles dragging JSON or image files onto the app window.
 * Fires callbacks for each type.
 */

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const JSON_EXTS  = new Set(['.json']);

export class DropZone {
  /**
   * @param {HTMLElement} overlayEl — #dropzone element
   * @param {function} onJSON — callback(File)
   * @param {function} onImages — callback(File[])
   */
  constructor(overlayEl, onJSON, onImages) {
    this.overlay   = overlayEl;
    this.onJSON    = onJSON;
    this.onImages  = onImages;
    this._dragDepth = 0;

    this._bindEvents();
  }

  _bindEvents() {
    // Prevent default for all drag events on document
    document.addEventListener('dragover',  (e) => e.preventDefault());
    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this._dragDepth++;
      if (this._dragDepth === 1) this._show(e.dataTransfer);
    });
    document.addEventListener('dragleave', () => {
      this._dragDepth--;
      if (this._dragDepth <= 0) {
        this._dragDepth = 0;
        this._hide();
      }
    });
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      this._dragDepth = 0;
      this._hide();
      this._handleDrop(e.dataTransfer);
    });
  }

  _show(dataTransfer) {
    // Determine hint text from data types
    const types = dataTransfer?.types ?? [];
    const hasFiles = types.includes('Files');
    if (!hasFiles) return;

    this.overlay.classList.add('active');
  }

  _hide() {
    this.overlay.classList.remove('active');
  }

  _handleDrop(dataTransfer) {
    if (!dataTransfer?.files?.length) return;

    const files     = [...dataTransfer.files];
    const jsonFiles = files.filter((f) => f.name.toLowerCase().endsWith('.json'));
    const imgFiles  = files.filter((f) => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      return IMAGE_EXTS.has(ext);
    });

    // JSON takes priority if mixed drop
    if (jsonFiles.length > 0) {
      this.onJSON?.(jsonFiles[0]);
      // Also process any images in the same drop
      if (imgFiles.length > 0) {
        this.onImages?.(imgFiles);
      }
    } else if (imgFiles.length > 0) {
      this.onImages?.(imgFiles);
    }
  }
}

/**
 * Read a File as text (JSON).
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Read a File as a data URL.
 * Downsamples large images (>10MB) to avoid performance issues.
 *
 * @param {File} file
 * @param {number} [maxSizeMB=10]
 * @returns {Promise<string>} data URL
 */
export function readFileAsDataURL(file, maxSizeMB = 10) {
  return new Promise((resolve, reject) => {
    const sizeMB = file.size / (1024 * 1024);

    if (sizeMB > maxSizeMB) {
      // Downsample large images via canvas
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 4096;
          let { naturalWidth: w, naturalHeight: h } = img;

          if (w > MAX_DIM || h > MAX_DIM) {
            const scale = MAX_DIM / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }

          const canvas = document.createElement('canvas');
          canvas.width  = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        img.onerror = () => reject(new Error(`Failed to decode image: ${file.name}`));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    } else {
      // Small enough — read as-is
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Process a FileList/array of image files into a { filename: dataURL } map.
 * Reports progress via callback.
 *
 * @param {File[]} files
 * @param {function} [onProgress] — callback(current, total, filename)
 * @returns {Promise<Object.<string, string>>}
 */
export async function processImageFiles(files, onProgress) {
  const result = {};
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);
    try {
      result[file.name] = await readFileAsDataURL(file);
    } catch (err) {
      console.warn(`[dropzone] Could not process image "${file.name}":`, err);
    }
  }
  return result;
}
