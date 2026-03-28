/**
 * image-tray.js — Image tray panel for FrameForge.
 *
 * Displays all loaded images as draggable thumbnails.
 * Users drag an image from here onto a filmstrip frame (or the canvas)
 * to manually assign it — bypassing filename-based matching.
 */

const THUMB_SIZE = 56; // px, square

export class ImageTray {
  /**
   * @param {HTMLElement} containerEl — #image-tray-list
   * @param {HTMLElement} countEl     — #image-tray-count
   */
  constructor(containerEl, countEl) {
    this.containerEl = containerEl;
    this.countEl     = countEl;

    /** @type {Map<string, { el: HTMLElement }>} imageKey → item */
    this._items = new Map();
  }

  // ── Build ───────────────────────────────────────────────────────────────

  /**
   * (Re)build the tray from the current project state.
   * @param {object} project — Project instance
   */
  build(project) {
    this.containerEl.innerHTML = '';
    this._items.clear();

    const keys = Object.keys(project.imageMap ?? {});

    if (this.countEl) this.countEl.textContent = keys.length;

    if (keys.length === 0) {
      this._showEmpty();
      return;
    }

    for (const key of keys) {
      const img = project.imageElements.get(key) ?? null;
      const el  = this._buildItem(key, img);
      this.containerEl.appendChild(el);
      this._items.set(key, { el });
    }

    // Restore assignment badges
    project.imageAssignments.forEach((imageKey, frameIndex) => {
      this.showAssignment(imageKey, frameIndex);
    });
  }

  /**
   * Build one tray item element.
   * @param {string} key
   * @param {HTMLImageElement|null} img
   * @returns {HTMLElement}
   */
  _buildItem(key, img) {
    const canvas = document.createElement('canvas');
    canvas.width  = THUMB_SIZE;
    canvas.height = THUMB_SIZE;
    const ctx = canvas.getContext('2d');

    if (img) {
      const scale = Math.max(THUMB_SIZE / img.naturalWidth, THUMB_SIZE / img.naturalHeight);
      const drawW = img.naturalWidth  * scale;
      const drawH = img.naturalHeight * scale;
      ctx.drawImage(img, (THUMB_SIZE - drawW) / 2, (THUMB_SIZE - drawH) / 2, drawW, drawH);
    } else {
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);
      ctx.fillStyle = '#606080';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', THUMB_SIZE / 2, THUMB_SIZE / 2);
    }

    const label = key.length > 14 ? key.slice(0, 12) + '…' : key;

    const el = document.createElement('div');
    el.className  = 'image-tray-item';
    el.draggable  = true;
    el.dataset.key = key;
    el.title      = key;
    el.innerHTML  = `
      <span class="image-tray-badge" data-assignment style="display:none"></span>
      <div class="image-tray-name">${escHtml(label)}</div>
    `;
    el.insertBefore(canvas, el.firstChild);

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', key);
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
    });

    return el;
  }

  // ── State ───────────────────────────────────────────────────────────────

  /**
   * Show or clear the assignment badge on a tray item.
   * @param {string} imageKey
   * @param {number|null} frameIndex — null to clear
   */
  showAssignment(imageKey, frameIndex) {
    const item = this._items.get(imageKey);
    if (!item) return;
    const badge = item.el.querySelector('[data-assignment]');
    if (!badge) return;
    if (frameIndex != null) {
      badge.textContent = `→ ${frameIndex + 1}`;
      badge.style.display = '';
    } else {
      badge.textContent = '';
      badge.style.display = 'none';
    }
  }

  /**
   * Clear all assignment badges (e.g. after project clear).
   */
  clearAssignments() {
    this._items.forEach(({ el }) => {
      const badge = el.querySelector('[data-assignment]');
      if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
    });
  }

  /**
   * Clear the tray and show empty state.
   */
  clear() {
    this.containerEl.innerHTML = '';
    this._items.clear();
    if (this.countEl) this.countEl.textContent = '0';
    this._showEmpty();
  }

  _showEmpty() {
    this.containerEl.innerHTML = `
      <div class="image-tray-empty">
        <p>Load images, then drag them onto frames to assign.</p>
      </div>
    `;
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
