/**
 * shape-toolbar.js — Floating contextual toolbar for a selected shape layer.
 *
 * Single-row layout: [ Fill color ] | [ Op − val + ] | [ ↔ − val% + ] | [ 🗑 ]
 *
 * Usage:
 *   const toolbar = new ShapeToolbar(el);
 *   toolbar.onChange = (layer) => { re-render + save };
 *   toolbar.onDelete = (layer) => { remove layer };
 *   toolbar.show(layer);
 *   toolbar.hide();
 */

export class ShapeToolbar {
  constructor(el) {
    this._el    = el;
    this._layer = null;
    this._squareRef = null;

    /** @type {((layer: object) => void) | null} */
    this.onChange = null;
    /** @type {((layer: object) => void) | null} */
    this.onDelete = null;

    this._build();
  }

  _build() {
    this._el.innerHTML = `
      <div class="st-row">
        <input type="color" class="st-color" title="Fill colour">
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
        <button class="st-btn st-delete" data-action="delete" title="Delete shape">🗑</button>
      </div>
    `;

    this._colorInput = this._el.querySelector('.st-color');
    this._opVal      = this._el.querySelector('[data-field="op"]');
    this._wVal       = this._el.querySelector('[data-field="w"]');

    this._colorInput.addEventListener('input', () => {
      if (!this._layer) return;
      // Migrate legacy 'color' field → 'fill_color' on first toolbar write
      this._layer.fill_color = this._colorInput.value;
      delete this._layer.color;
      this.onChange?.(this._layer);
    });

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
      case 'delete':
        this.onDelete?.(this._layer); break;
    }
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
    this._colorInput.value = this._getFillColor();
    this._opVal.textContent = this._getOpacity().toFixed(2);
    this._wVal.textContent  = `${Math.round(this._layer.dimensions?.width_pct ?? 10)}%`;
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
    this._layer = null;
    this._el.style.display = 'none';
  }

  get currentLayer() { return this._layer; }
}
