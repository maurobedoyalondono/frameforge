/**
 * shape-toolbar.js — Floating contextual toolbar for a selected shape layer.
 *
 * Row 1: [ Fill color ] | [ Op − val + ] | [ ↔ − val% + ] | [ ↕ − val% + ] | [ 🗑 ]
 * Row 2: [ ↔ Full W ] [ ↕ Full H ] | [ ← ] [ → ] [ ↑ ] [ ↓ ]
 *
 * Usage:
 *   const toolbar = new ShapeToolbar(el);
 *   toolbar.onChange = (layer) => { re-render + save };
 *   toolbar.onDelete = (layer) => { remove layer };
 *   toolbar.show(layer);
 *   toolbar.hide();
 */

import { ColorPicker } from './color-picker.js';

export class ShapeToolbar {
  constructor(el, { getProject } = {}) {
    this._el          = el;
    this._layer       = null;
    this._squareRef   = null;
    this._getProject  = getProject ?? (() => null);
    this._colorPicker = null;

    /** @type {((layer: object) => void) | null} */
    this.onChange = null;
    /** @type {((layer: object) => void) | null} */
    this.onDelete = null;
    /** @type {((layer: object) => void) | null} */
    this.onCopy = null;
    /** @type {(() => void) | null} */
    this.onPaste = null;

    this._build();
  }

  _build() {
    this._el.innerHTML = `
      <div class="st-row">
        <div class="st-color-swatch" title="Fill colour"></div>
        <div class="st-sep"></div>
        <span class="st-label" title="Fill opacity">Op</span>
        <button class="st-btn" data-action="op-dec">−</button>
        <span class="st-val" data-field="op">—</span>
        <button class="st-btn" data-action="op-inc">+</button>
        <div class="st-sep"></div>
        <span class="st-label" title="Width">↔</span>
        <button class="st-btn" data-action="w-dec">−</button>
        <span class="st-val" data-field="w">—</span>
        <button class="st-btn" data-action="w-inc">+</button>
        <div class="st-sep"></div>
        <span class="st-label" title="Height">↕</span>
        <button class="st-btn" data-action="h-dec">−</button>
        <span class="st-val" data-field="h">—</span>
        <button class="st-btn" data-action="h-inc">+</button>
        <div class="st-sep"></div>
        <button class="st-btn" data-action="copy"  title="Copy layer"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="0" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="0" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/></svg></button>
        <button class="st-btn" data-action="paste" title="Paste layer" disabled><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="10" height="8.5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="4" y="1" width="4" height="3" rx="0.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 5.5v3M4.5 7 6 8.5 7.5 7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="st-btn st-delete" data-action="delete" title="Delete shape">🗑</button>
      </div>
      <div class="st-row st-row-align">
        <button class="st-btn" data-action="full-h" title="Full width (100%)">↔</button>
        <button class="st-btn" data-action="full-v" title="Full height (100%)">↕</button>
        <div class="st-sep"></div>
        <button class="st-btn" data-action="align-left"   title="Align left">←</button>
        <button class="st-btn" data-action="align-right"  title="Align right">→</button>
        <button class="st-btn" data-action="align-top"    title="Align top">↑</button>
        <button class="st-btn" data-action="align-bottom" title="Align bottom">↓</button>
      </div>
    `;

    this._colorSwatchEl = this._el.querySelector('.st-color-swatch');
    this._colorPicker   = new ColorPicker({
      getColor:   () => this._layer?.fill_color ?? this._layer?.color ?? '#ffffff',
      setColor:   (hex) => {
        if (!this._layer) return;
        this._layer.fill_color = hex;
        delete this._layer.color;
        this.onChange?.(this._layer);
      },
      getProject: this._getProject,
    });
    this._colorPicker.attach(this._colorSwatchEl);
    this._opVal      = this._el.querySelector('[data-field="op"]');
    this._wVal       = this._el.querySelector('[data-field="w"]');
    this._hVal       = this._el.querySelector('[data-field="h"]');
    this._pasteBtn = this._el.querySelector('[data-action="paste"]');

    this._el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !this._layer) return;
      this._handleAction(btn.dataset.action);
    });
  }

  _handleAction(action) {
    switch (action) {
      case 'op-dec': {
        const cur = this._getOpacity();
        this._layer.fill_opacity = parseFloat(Math.max(0.05, cur - 0.05).toFixed(2));
        delete this._layer.opacity;
        this._updateDisplays(); this.onChange?.(this._layer); break;
      }
      case 'op-inc': {
        const cur = this._getOpacity();
        this._layer.fill_opacity = parseFloat(Math.min(1.0, cur + 0.05).toFixed(2));
        delete this._layer.opacity;
        this._updateDisplays(); this.onChange?.(this._layer); break;
      }
      case 'w-dec': {
        const dims = (this._layer.dimensions ??= {});
        const cur  = dims.width_pct ?? 10;
        dims.width_pct = Math.max(1, cur - 1);
        if (this._isSquare()) dims.height_pct = dims.width_pct;
        this._updateDisplays(); this.onChange?.(this._layer); break;
      }
      case 'w-inc': {
        const dims = (this._layer.dimensions ??= {});
        const cur  = dims.width_pct ?? 10;
        dims.width_pct = Math.min(100, cur + 1);
        if (this._isSquare()) dims.height_pct = dims.width_pct;
        this._updateDisplays(); this.onChange?.(this._layer); break;
      }
      // Height adjusts independently — _isSquare() lock intentionally not applied here
      case 'h-dec': {
        const dims = (this._layer.dimensions ??= {});
        const cur  = dims.height_pct ?? 10;
        dims.height_pct = Math.max(2, cur - 2);
        this._updateDisplays(); this.onChange?.(this._layer); break;
      }
      case 'h-inc': {
        const dims = (this._layer.dimensions ??= {});
        const cur  = dims.height_pct ?? 10;
        dims.height_pct = Math.min(100, cur + 2);
        this._updateDisplays(); this.onChange?.(this._layer); break;
      }
      case 'full-h': {
        const dims = (this._layer.dimensions ??= {});
        const pos  = this._toAbsolutePos();
        dims.width_pct = 100;
        pos.x_pct = 0;
        this._updateDisplays(); this.onChange?.(this._layer); break;
      }
      case 'full-v': {
        const dims = (this._layer.dimensions ??= {});
        const pos  = this._toAbsolutePos();
        dims.height_pct = 100;
        pos.y_pct = 0;
        this._updateDisplays(); this.onChange?.(this._layer); break;
      }
      case 'align-left': {
        this._toAbsolutePos().x_pct = 0;
        this.onChange?.(this._layer); break;
      }
      case 'align-right': {
        const dims = this._layer.dimensions ?? {};
        this._toAbsolutePos().x_pct = 100 - (dims.width_pct ?? 10);
        this.onChange?.(this._layer); break;
      }
      case 'align-top': {
        this._toAbsolutePos().y_pct = 0;
        this.onChange?.(this._layer); break;
      }
      case 'align-bottom': {
        const dims = this._layer.dimensions ?? {};
        this._toAbsolutePos().y_pct = 100 - (dims.height_pct ?? 10);
        this.onChange?.(this._layer); break;
      }
      case 'delete':
        this.onDelete?.(this._layer); break;
      case 'copy':
        this.onCopy?.(this._layer); break;
      case 'paste':
        this.onPaste?.(); break;
    }
  }

  /**
   * Ensure layer.position uses absolute x_pct/y_pct (not zone mode).
   * Converts zone → absolute so partial writes (e.g. only x_pct) don't
   * cause resolvePosition to default the missing axis to 0.
   */
  _toAbsolutePos() {
    const pos = (this._layer.position ??= {});
    if (pos.x_pct == null || pos.y_pct == null) {
      // Resolve zone anchor + offsets to percentages
      const ZONE_ANCHORS = {
        'top-left':      [0,   0  ], 'top-center':    [50,  0  ], 'top-right':     [100, 0  ],
        'middle-left':   [0,   50 ], 'middle-center': [50,  50 ], 'middle-right':  [100, 50 ],
        'bottom-left':   [0,   100], 'bottom-center': [50,  100], 'bottom-right':  [100, 100],
      };
      const [ax, ay] = ZONE_ANCHORS[pos.zone] ?? [50, 50];
      if (pos.x_pct == null) pos.x_pct = ax + (pos.offset_x_pct ?? 0);
      if (pos.y_pct == null) pos.y_pct = ay + (pos.offset_y_pct ?? 0);
      delete pos.mode;
      delete pos.zone;
      delete pos.offset_x_pct;
      delete pos.offset_y_pct;
    }
    return pos;
  }

  /** True if height_pct === width_pct at show() time (preserve square/circle aspect ratio) */
  _isSquare() {
    const d = this._layer.dimensions ?? {};
    return d.height_pct != null && d.height_pct === this._squareRef;
  }

  _getOpacity() {
    return this._layer.fill_opacity ?? this._layer.opacity ?? 1.0;
  }

  _getFillColor() {
    return this._layer.fill_color ?? this._layer.color ?? '#ffffff';
  }

  _updateDisplays() {
    if (!this._layer) return;
    if (this._colorSwatchEl) this._colorSwatchEl.style.background = this._getFillColor();
    this._colorPicker?.syncSwatch();
    this._opVal.textContent = this._getOpacity().toFixed(2);
    this._wVal.textContent  = `${Math.round(this._layer.dimensions?.width_pct  ?? 10)}%`;
    this._hVal.textContent  = `${Math.round(this._layer.dimensions?.height_pct ?? 10)}%`;
  }

  show(layer) {
    this._layer = layer;
    // Snapshot width_pct === height_pct at open time to detect square/circle
    const d = layer.dimensions ?? {};
    this._squareRef = (d.height_pct != null && d.height_pct === d.width_pct)
      ? d.width_pct
      : null;
    this._updateDisplays();
    this._el.style.display = '';
  }

  hide() {
    this._colorPicker?.close();
    this._layer = null;
    this._el.style.display = 'none';
  }

  /**
   * Enable or disable the paste button (disable when clipboard is empty).
   * @param {boolean} enabled
   */
  setCanPaste(enabled) {
    if (this._pasteBtn) this._pasteBtn.disabled = !enabled;
  }

  get currentLayer() { return this._layer; }
}
