/**
 * filmstrip.js — Left filmstrip panel showing frame thumbnails.
 */

import { Renderer } from '../modules/renderer.js';

const THUMB_WIDTH = 44;
const renderer    = new Renderer();

export class Filmstrip {
  /**
   * @param {HTMLElement} containerEl — #filmstrip-list
   * @param {HTMLElement} countEl — #filmstrip-count
   * @param {object} contextMenu — ContextMenu instance
   */
  constructor(containerEl, countEl, contextMenu) {
    this.container   = containerEl;
    this.countEl     = countEl;
    this.contextMenu = contextMenu;

    /** @type {function(number):void} */
    this.onFrameSelect = null;

    /** @type {function(number):void} — export single frame */
    this.onExportFrame = null;

    /**
     * Called when user drops an image onto a frame in the filmstrip.
     * @type {function(number, string):void} (frameIndex, imageKey)
     */
    this.onAssignImage = null;

    /** @type {number} */
    this.activeIndex = 0;

    /** @type {HTMLCanvasElement[]} */
    this._thumbCanvases = [];

    /** @type {string[]} — 'ok'|'warn'|'error'|'pending' per frame */
    this._statuses = [];
  }

  // ── Render ─────────────────────────────────────────────────────────────

  /**
   * Build the filmstrip for a loaded project.
   * @param {object} project — Project instance
   */
  build(project) {
    this.container.innerHTML = '';
    this._thumbCanvases = [];
    this._statuses = [];

    if (!project.isLoaded) {
      this._showEmpty();
      if (this.countEl) this.countEl.textContent = '0';
      return;
    }

    const frames = project.data.frames;
    if (this.countEl) this.countEl.textContent = frames.length;

    frames.forEach((frame, i) => {
      const item = this._buildItem(frame, i, project);
      this.container.appendChild(item.el);
      this._thumbCanvases.push(item.canvas);
      this._statuses.push('pending');
    });

    this.setActive(this.activeIndex);
  }

  /**
   * Build a single filmstrip item element — compact horizontal row.
   * @returns {{ el: HTMLElement, canvas: HTMLCanvasElement }}
   */
  _buildItem(frame, index, project) {
    const exp    = project.exportConfig;
    const aspect = (exp.height_px ?? 1350) / (exp.width_px ?? 1080);
    const thumbH = Math.round(THUMB_WIDTH * aspect);

    const canvas = document.createElement('canvas');
    canvas.width  = THUMB_WIDTH;
    canvas.height = thumbH;
    canvas.style.width  = `${THUMB_WIDTH}px`;
    canvas.style.height = `${thumbH}px`;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e1e2a';
    ctx.fillRect(0, 0, THUMB_WIDTH, thumbH);

    const el = document.createElement('div');
    el.className = 'filmstrip-item';
    el.dataset.index = index;
    el.innerHTML = `
      <div class="filmstrip-item-info">
        <span class="filmstrip-item-index">${index + 1}</span>
        <span class="filmstrip-item-id truncate" title="${escHtml(frame.id)}">${escHtml(frame.id)}</span>
        <span data-assign-badge class="filmstrip-assign-badge" style="display:none"></span>
      </div>
      <span class="filmstrip-item-status status-pending" data-status>⋯</span>
    `;
    el.insertBefore(canvas, el.firstChild);

    // Click → select frame
    el.addEventListener('click', () => {
      this.onFrameSelect?.(index);
    });

    // Drag-and-drop: accept image drops to assign
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget)) {
        el.classList.remove('drag-over');
      }
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const imageKey = e.dataTransfer.getData('text/plain');
      if (imageKey) this.onAssignImage?.(index, imageKey);
    });

    // Right-click → context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.contextMenu?.show(e.clientX, e.clientY, [
        {
          label: `Export frame ${index + 1}`,
          icon: '↓',
          action: () => this.onExportFrame?.(index),
        },
        { sep: true },
        {
          label: 'Copy frame ID',
          icon: '⎘',
          action: () => {
            navigator.clipboard?.writeText(frame.id).catch(() => {});
          },
        },
      ]);
    });

    return { el, canvas };
  }

  /**
   * Render all thumbnails asynchronously.
   * @param {object} project
   * @param {function} [onThumbDone] — callback(index)
   */
  async renderAll(project, onThumbDone) {
    if (!project.isLoaded) return;
    const frames = project.data.frames;

    for (let i = 0; i < frames.length; i++) {
      this.setStatus(i, 'pending');
      // Yield so the browser can paint between thumbnails
      await new Promise((r) => setTimeout(r, 0));

      const canvas = this._thumbCanvases[i];
      if (!canvas) continue;

      const result = renderer.renderThumbnail(canvas, i, project, THUMB_WIDTH);
      this.setStatus(i, result.ok ? this._imageStatus(project, i) : 'error');

      // Update canvas display dimensions
      canvas.style.width  = `${canvas.width}px`;
      canvas.style.height = `${canvas.height}px`;

      onThumbDone?.(i);
    }
  }

  /**
   * Re-render a single thumbnail.
   * @param {number} index
   * @param {object} project
   */
  renderOne(index, project) {
    const canvas = this._thumbCanvases[index];
    if (!canvas) return;
    const result = renderer.renderThumbnail(canvas, index, project, THUMB_WIDTH);
    this.setStatus(index, result.ok ? this._imageStatus(project, index) : 'error');
  }

  // ── State ──────────────────────────────────────────────────────────────

  /**
   * Highlight the active frame.
   * @param {number} index
   */
  setActive(index) {
    this.activeIndex = index;
    const items = this.container.querySelectorAll('.filmstrip-item');
    items.forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });

    // Scroll into view
    const activeEl = items[index];
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /**
   * Update the status icon for a frame.
   * @param {number} index
   * @param {'ok'|'warn'|'error'|'pending'} status
   */
  setStatus(index, status) {
    this._statuses[index] = status;
    const items = this.container.querySelectorAll('.filmstrip-item');
    const statusEl = items[index]?.querySelector('[data-status]');
    if (!statusEl) return;

    const map = {
      ok:      { icon: '✓', cls: 'status-ok' },
      warn:    { icon: '⚠', cls: 'status-warn' },
      error:   { icon: '✗', cls: 'status-error' },
      pending: { icon: '⋯', cls: 'status-pending' },
    };
    const { icon, cls } = map[status] ?? map.pending;
    statusEl.textContent = icon;
    statusEl.className   = `filmstrip-item-status ${cls}`;
  }

  /**
   * Clear all thumbnails and show empty state.
   */
  clear() {
    this.container.innerHTML = '';
    this._thumbCanvases = [];
    this._statuses = [];
    this._showEmpty();
    if (this.countEl) this.countEl.textContent = '0';
  }

  /**
   * Show or clear the assignment badge on a filmstrip item row.
   * @param {number} frameIndex
   * @param {string|null} imageKey — null clears the badge
   */
  showAssignment(frameIndex, imageKey) {
    const items = this.container.querySelectorAll('.filmstrip-item');
    const item  = items[frameIndex];
    if (!item) return;

    const badge = item.querySelector('[data-assign-badge]');
    if (!badge) return;
    if (imageKey) {
      const label = imageKey.length > 13 ? imageKey.slice(0, 11) + '…' : imageKey;
      badge.textContent = `→ ${label}`;
      badge.style.display = '';
    } else {
      badge.textContent = '';
      badge.style.display = 'none';
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  _showEmpty() {
    this.container.innerHTML = `
      <div class="filmstrip-empty">
        <div class="empty-icon">🎞</div>
        <p>Load a JSON project to see frames here.</p>
      </div>
    `;
  }

  _imageStatus(project, frameIndex) {
    const s = project.getFrameImageStatus(frameIndex);
    return s === 'ok' ? 'ok' : s === 'partial' ? 'warn' : 'warn';
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
