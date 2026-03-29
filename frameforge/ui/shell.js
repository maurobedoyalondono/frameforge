/**
 * shell.js — App shell: toolbar, layout wiring, status bar, toasts, keyboard shortcuts.
 */

// ── Status bar ────────────────────────────────────────────────────────────

export class StatusBar {
  constructor(el) {
    /** @type {HTMLElement} */
    this.msgEl  = el.querySelector('#status-message');
    this.dotEl  = el.querySelector('.status-dot');
    this._timer = null;
  }

  /**
   * @param {string} text
   * @param {'info'|'success'|'error'|'warning'} [type='info']
   * @param {number} [autoClear=0] — ms before reverting to idle (0 = no auto-clear)
   */
  set(text, type = 'info', autoClear = 0) {
    if (!this.msgEl) return;
    this.msgEl.textContent = text;
    this.msgEl.className   = type === 'info' ? '' : type;

    if (this.dotEl) {
      this.dotEl.className = `status-dot ${type === 'error' ? 'error' : type === 'success' ? 'ready' : type === 'warning' ? 'working' : 'ready'}`;
    }

    if (this._timer) clearTimeout(this._timer);
    if (autoClear > 0) {
      this._timer = setTimeout(() => this.set('Ready'), autoClear);
    }
  }

  working(text) {
    this.set(text, 'warning');
    if (this.dotEl) this.dotEl.className = 'status-dot working';
  }

  ready(text = 'Ready') {
    this.set(text, 'success', 4000);
  }

  error(text) {
    this.set(text, 'error', 8000);
  }
}

// ── Toast notifications ───────────────────────────────────────────────────

export class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a toast notification.
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} title
   * @param {string} [message]
   * @param {number} [duration=4000]
   */
  show(type, title, message = '', duration = 4000) {
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] ?? 'ℹ'}</div>
      <div class="toast-body">
        <div class="toast-title">${escHtml(title)}</div>
        ${message ? `<div class="toast-message">${escHtml(message)}</div>` : ''}
      </div>
    `;

    this.container.appendChild(toast);

    // Auto-dismiss
    const dismiss = () => {
      toast.classList.add('toast-leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };

    const timer = setTimeout(dismiss, duration);
    toast.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
  }

  success(title, msg, dur)  { this.show('success', title, msg, dur); }
  error  (title, msg, dur)  { this.show('error',   title, msg, dur ?? 6000); }
  warning(title, msg, dur)  { this.show('warning', title, msg, dur); }
  info   (title, msg, dur)  { this.show('info',    title, msg, dur); }
}

// ── Confirm modal ─────────────────────────────────────────────────────────

/**
 * Show a confirmation modal. Returns a Promise<boolean>.
 * @param {string} title
 * @param {string} body
 * @param {string} [confirmLabel='Confirm']
 * @param {boolean} [danger=false]
 */
export function showConfirm(title, body, confirmLabel = 'Confirm', danger = false) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <span class="modal-title">${escHtml(title)}</span>
        </div>
        <div class="modal-body">
          <p>${escHtml(body)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${escHtml(confirmLabel)}</button>
        </div>
      </div>
    `;

    const close = (result) => {
      backdrop.remove();
      resolve(result);
    };

    backdrop.querySelector('#modal-cancel').addEventListener('click',  () => close(false));
    backdrop.querySelector('#modal-confirm').addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });

    document.body.appendChild(backdrop);
    backdrop.querySelector('#modal-confirm').focus();
  });
}

// ── Progress overlay ──────────────────────────────────────────────────────

export class ProgressOverlay {
  constructor() {
    this.el = document.getElementById('progress-overlay');
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'progress-overlay';
      this.el.className = 'hidden';
      this.el.innerHTML = `
        <div class="progress-box">
          <div class="progress-label" id="progress-label">Working…</div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" id="progress-bar" style="width:0%"></div>
          </div>
          <div class="progress-sub" id="progress-sub"></div>
        </div>
      `;
      document.body.appendChild(this.el);
    }
    this.label = this.el.querySelector('#progress-label');
    this.bar   = this.el.querySelector('#progress-bar');
    this.sub   = this.el.querySelector('#progress-sub');
  }

  show(title = 'Working…') {
    if (this.label) this.label.textContent = title;
    if (this.bar)   this.bar.style.width   = '0%';
    if (this.sub)   this.sub.textContent   = '';
    this.el.classList.remove('hidden');
  }

  update(current, total, message = '') {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    if (this.bar) this.bar.style.width = `${pct}%`;
    if (this.sub) this.sub.textContent = message;
  }

  hide() {
    this.el.classList.add('hidden');
  }
}

// ── Context menu ──────────────────────────────────────────────────────────

export class ContextMenu {
  constructor() {
    this.el = document.getElementById('context-menu');
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'context-menu';
      document.body.appendChild(this.el);
    }
    this._dismiss = this._dismiss.bind(this);
    document.addEventListener('click', this._dismiss);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this._dismiss(); });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {Array<{label: string, icon?: string, action: function, sep?: boolean}>} items
   */
  show(x, y, items) {
    this.el.innerHTML = items.map((item) => {
      if (item.sep) return '<div class="context-menu-sep"></div>';
      return `
        <div class="context-menu-item" data-action>
          <span class="item-icon">${item.icon ?? ''}</span>
          <span>${escHtml(item.label)}</span>
        </div>
      `;
    }).join('');

    // Bind actions
    const actionEls = this.el.querySelectorAll('[data-action]');
    const actionItems = items.filter((i) => !i.sep);
    actionEls.forEach((el, i) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this._dismiss();
        actionItems[i]?.action?.();
      });
    });

    // Position
    this.el.classList.add('visible');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = this.el.getBoundingClientRect();
    const cx = Math.min(x, vw - rect.width  - 4);
    const cy = Math.min(y, vh - rect.height - 4);
    this.el.style.left = `${cx}px`;
    this.el.style.top  = `${cy}px`;
  }

  _dismiss() {
    this.el.classList.remove('visible');
  }
}

// ── Toolbar builder ───────────────────────────────────────────────────────

/**
 * Build the toolbar HTML and wire up file inputs.
 * Returns { onLoadJSON, onLoadImages, onExportAll, onExportThis, onPreviewAll, onClear }
 * which are event emitters you can assign callbacks to.
 *
 * @param {HTMLElement} toolbarEl
 * @returns {object} handlers
 */
export function buildToolbar(toolbarEl) {
  toolbarEl.innerHTML = `
    <div class="toolbar-brand">
      <span class="brand-name">Frame<span>Forge</span></span>
    </div>
    <div class="toolbar-sep"></div>

    <button class="btn btn-secondary" id="btn-new-project" title="Create a new project brief for AI generation">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
      </svg>
      New Brief
    </button>

    <button class="btn btn-ghost" id="btn-my-briefs" title="Browse and manage your saved briefs">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
      </svg>
      My Briefs
    </button>

    <span id="active-brief-label">
      <span class="active-brief-dot">●</span>
      <span id="active-brief-title"></span>
    </span>

    <div class="toolbar-sep"></div>

    <button class="btn btn-secondary" id="btn-load-json" title="Load project JSON">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
      </svg>
      Load JSON
    </button>

    <button class="btn btn-secondary" id="btn-load-images" title="Load images" disabled>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
        <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
      </svg>
      Load Images
    </button>

    <span id="project-title" title=""></span>

    <div class="toolbar-sep"></div>

    <button class="btn btn-ghost btn-icon" id="btn-safe-zone" title="Toggle safe zone [Z]" disabled>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"/>
        <path d="M8 4.5a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1H8a.5.5 0 0 1-.5-.5v-3.5a.5.5 0 0 1 .5-.5z"/>
      </svg>
    </button>
    <button class="btn btn-ghost btn-icon" id="btn-layers" title="Layers OFF [L]" disabled>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8.235 1.559a.5.5 0 0 0-.47 0l-7.5 4a.5.5 0 0 0 0 .882L3.188 8 .264 9.559a.5.5 0 0 0 0 .882l7.5 4a.5.5 0 0 0 .47 0l7.5-4a.5.5 0 0 0 0-.882L12.813 8l2.922-1.559a.5.5 0 0 0 0-.882l-7.5-4z"/>
      </svg>
    </button>

    <div class="toolbar-sep"></div>

    <button class="btn btn-secondary" id="btn-preview-all" title="Render all frames [R]" disabled>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
      </svg>
      Preview All
    </button>

    <button class="btn btn-export" id="btn-export-this" title="Export current frame [E]" disabled>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
      </svg>
      Export This
    </button>

    <button class="btn btn-export" id="btn-export-all" title="Export all frames [Shift+E]" disabled>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
      </svg>
      Export All
    </button>

    <div class="toolbar-sep"></div>

    <button class="btn btn-ghost btn-icon btn-danger" id="btn-clear-project" title="Clear project" disabled>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
      </svg>
    </button>

    <!-- Hidden file inputs -->
    <input type="file" id="input-json"   accept=".json" style="display:none">
    <input type="file" id="input-images" accept=".jpg,.jpeg,.png,.webp" multiple style="display:none">
  `;

  // Wire up file inputs
  document.getElementById('btn-load-json')
    .addEventListener('click', () => document.getElementById('input-json').click());
  document.getElementById('btn-load-images')
    .addEventListener('click', () => document.getElementById('input-images').click());

  return {
    btnNewProject: document.getElementById('btn-new-project'),
    btnMyBriefs:   document.getElementById('btn-my-briefs'),
    activeBriefLabel:  document.getElementById('active-brief-label'),
    jsonInput:    document.getElementById('input-json'),
    imagesInput:  document.getElementById('input-images'),
    btnLoadJSON:  document.getElementById('btn-load-json'),
    btnLoadImages:document.getElementById('btn-load-images'),
    btnPreviewAll:document.getElementById('btn-preview-all'),
    btnExportThis:document.getElementById('btn-export-this'),
    btnExportAll: document.getElementById('btn-export-all'),
    btnSafeZone:  document.getElementById('btn-safe-zone'),
    btnLayers:    document.getElementById('btn-layers'),
    btnClear:     document.getElementById('btn-clear-project'),
    projectTitle: document.getElementById('project-title'),
  };
}

/**
 * Enable/disable the toolbar buttons based on app state.
 * @param {object} btns — ref from buildToolbar
 * @param {boolean} hasProject
 * @param {boolean} [safeZoneActive]
 */
export function updateToolbarState(btns, hasProject, safeZoneActive = false, layersActive = false) {
  const els = [
    btns.btnLoadImages,
    btns.btnPreviewAll,
    btns.btnExportThis,
    btns.btnExportAll,
    btns.btnSafeZone,
    btns.btnLayers,
    btns.btnClear,
  ];
  for (const el of els) {
    if (el) el.disabled = !hasProject;
  }
  if (btns.btnSafeZone) {
    btns.btnSafeZone.style.color = safeZoneActive ? 'var(--color-warning)' : '';
    btns.btnSafeZone.title = safeZoneActive ? 'Safe zone ON [Z]' : 'Safe zone OFF [Z]';
  }
  if (btns.btnLayers) {
    btns.btnLayers.style.color = layersActive ? 'var(--color-accent)' : '';
    btns.btnLayers.title = layersActive ? 'Layers ON [L]' : 'Layers OFF [L]';
  }
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────

/**
 * Register global keyboard shortcuts.
 * @param {object} handlers
 * @param {function} handlers.nextFrame
 * @param {function} handlers.prevFrame
 * @param {function} handlers.exportCurrent
 * @param {function} handlers.exportAll
 * @param {function} handlers.toggleSafeZone
 * @param {function} handlers.toggleLayersPanel
 * @param {function} handlers.rerender
 */
export function registerKeyboardShortcuts(handlers) {
  document.addEventListener('keydown', (e) => {
    // Skip if focus is in an input
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        handlers.nextFrame?.();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        handlers.prevFrame?.();
        break;
      case 'e':
      case 'E':
        if (e.shiftKey) {
          e.preventDefault();
          handlers.exportAll?.();
        } else {
          e.preventDefault();
          handlers.exportCurrent?.();
        }
        break;
      case 'z':
      case 'Z':
        e.preventDefault();
        handlers.toggleSafeZone?.();
        break;
      case 'l':
      case 'L':
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          handlers.toggleLayersPanel?.();
        }
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        handlers.rerender?.();
        break;
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Left panel resize ─────────────────────────────────────────────────────

const _FILMSTRIP_HEIGHT_KEY     = 'frameforge_filmstrip_height';
const _FILMSTRIP_HEIGHT_DEFAULT = 170;
const _FILMSTRIP_HEIGHT_MIN     = 80;

/**
 * Wire up the drag handle between #filmstrip-list and #image-tray-list.
 * Persists the chosen height in localStorage.
 */
export function initLeftPanelResize() {
  const handle        = document.getElementById('left-panel-resize');
  const filmstripList = document.getElementById('filmstrip-list');
  const filmstrip     = document.getElementById('filmstrip');
  if (!handle || !filmstripList || !filmstrip) return;

  // Restore persisted height
  const saved   = parseInt(localStorage.getItem(_FILMSTRIP_HEIGHT_KEY), 10);
  const initial = Number.isFinite(saved) ? saved : _FILMSTRIP_HEIGHT_DEFAULT;
  filmstripList.style.height = `${initial}px`;

  let startY = 0;
  let startH = 0;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startY = e.clientY;
    startH = filmstripList.getBoundingClientRect().height;
    handle.classList.add('dragging');

    const onMove = (ev) => {
      const delta  = ev.clientY - startY;
      const panelH = filmstrip.getBoundingClientRect().height;
      const maxH   = panelH - _FILMSTRIP_HEIGHT_MIN - 6; // 6px handle height
      const newH   = Math.max(_FILMSTRIP_HEIGHT_MIN, Math.min(startH + delta, maxH));
      filmstripList.style.height = `${newH}px`;
    };

    const onUp = () => {
      handle.classList.remove('dragging');
      localStorage.setItem(_FILMSTRIP_HEIGHT_KEY, parseInt(filmstripList.style.height, 10));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}
