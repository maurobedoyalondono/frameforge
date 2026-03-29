export class OverlayToolbar {
  constructor(el) {
    this._el    = el;
    this._layer = null;
    this._row2  = null;
    this.onChange = null;
    this.onDelete = null;
    this._build();
  }

  _build() {
    this._el.innerHTML = `
      <div class="ot-row1">
        <input type="color" class="ot-color" data-action="color" title="Overlay colour">
        <span class="ot-sep"></span>
        <span class="ot-label">Op</span>
        <button class="ot-btn" data-action="op-dec">−</button>
        <span class="ot-val" data-field="op">—</span>
        <button class="ot-btn" data-action="op-inc">+</button>
        <span class="ot-sep"></span>
        <select class="ot-select" data-action="blend">
          <option value="normal">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
          <option value="soft-light">Soft Light</option>
        </select>
        <span class="ot-sep"></span>
        <button class="ot-btn ot-toggle" data-action="gradient-toggle" title="Toggle gradient">~ Grad</button>
        <span class="ot-sep"></span>
        <button class="ot-btn ot-delete" data-action="delete" title="Delete layer">🗑</button>
      </div>
      <div class="ot-row2" style="display:none">
        <select class="ot-select" data-action="grad-dir">
          <option value="to-bottom">↓ Down</option>
          <option value="to-top">↑ Up</option>
          <option value="to-right">→ Right</option>
          <option value="to-left">← Left</option>
        </select>
        <span class="ot-sep"></span>
        <span class="ot-label">From</span>
        <button class="ot-btn" data-action="from-op-dec">−</button>
        <span class="ot-val" data-field="from-op">—</span>
        <button class="ot-btn" data-action="from-op-inc">+</button>
        <span class="ot-label">@</span>
        <button class="ot-btn" data-action="from-pos-dec">−</button>
        <span class="ot-val" data-field="from-pos">—</span>
        <button class="ot-btn" data-action="from-pos-inc">+</button>
        <span class="ot-sep"></span>
        <span class="ot-label">To</span>
        <button class="ot-btn" data-action="to-op-dec">−</button>
        <span class="ot-val" data-field="to-op">—</span>
        <button class="ot-btn" data-action="to-op-inc">+</button>
        <span class="ot-label">@</span>
        <button class="ot-btn" data-action="to-pos-dec">−</button>
        <span class="ot-val" data-field="to-pos">—</span>
        <button class="ot-btn" data-action="to-pos-inc">+</button>
      </div>
    `;

    this._row2       = this._el.querySelector('.ot-row2');
    this._colorInput = this._el.querySelector('.ot-color');
    this._blendSel   = this._el.querySelector('[data-action="blend"]');
    this._dirSel     = this._el.querySelector('[data-action="grad-dir"]');

    this._el.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn && btn.tagName !== 'SELECT') this._handleAction(btn.dataset.action);
    });

    this._colorInput.addEventListener('input', () => {
      if (!this._layer) return;
      this._layer.color = this._colorInput.value;
      this.onChange?.(this._layer);
    });

    this._blendSel.addEventListener('change', () => {
      if (!this._layer) return;
      this._layer.blend_mode = this._blendSel.value;
      this.onChange?.(this._layer);
    });

    this._dirSel.addEventListener('change', () => {
      if (!this._layer) return;
      this._ensureGradient();
      this._layer.gradient.direction = this._dirSel.value;
      this.onChange?.(this._layer);
    });
  }

  _ensureGradient() {
    if (!this._layer.gradient) {
      this._layer.gradient = {
        enabled:           false,
        direction:         'to-bottom',
        from_opacity:      0,
        from_position_pct: 0,
        to_opacity:        0.8,
        to_position_pct:   100
      };
    }
  }

  _handleAction(action) {
    if (!this._layer) return;
    const layer = this._layer;

    switch (action) {
      case 'op-dec':
        layer.opacity = Math.max(0.05, +((layer.opacity ?? 1) - 0.05).toFixed(2));
        break;
      case 'op-inc':
        layer.opacity = Math.min(1, +((layer.opacity ?? 1) + 0.05).toFixed(2));
        break;
      case 'gradient-toggle':
        this._ensureGradient();
        layer.gradient.enabled = !layer.gradient.enabled;
        break;
      case 'from-op-dec':
        this._ensureGradient();
        layer.gradient.from_opacity = Math.max(0, +((layer.gradient.from_opacity ?? 0) - 0.05).toFixed(2));
        break;
      case 'from-op-inc':
        this._ensureGradient();
        layer.gradient.from_opacity = Math.min(1, +((layer.gradient.from_opacity ?? 0) + 0.05).toFixed(2));
        break;
      case 'from-pos-dec':
        this._ensureGradient();
        layer.gradient.from_position_pct = Math.max(0, (layer.gradient.from_position_pct ?? 0) - 5);
        break;
      case 'from-pos-inc':
        this._ensureGradient();
        layer.gradient.from_position_pct = Math.min(100, (layer.gradient.from_position_pct ?? 0) + 5);
        break;
      case 'to-op-dec':
        this._ensureGradient();
        layer.gradient.to_opacity = Math.max(0, +((layer.gradient.to_opacity ?? 0.8) - 0.05).toFixed(2));
        break;
      case 'to-op-inc':
        this._ensureGradient();
        layer.gradient.to_opacity = Math.min(1, +((layer.gradient.to_opacity ?? 0.8) + 0.05).toFixed(2));
        break;
      case 'to-pos-dec':
        this._ensureGradient();
        layer.gradient.to_position_pct = Math.max(0, (layer.gradient.to_position_pct ?? 100) - 5);
        break;
      case 'to-pos-inc':
        this._ensureGradient();
        layer.gradient.to_position_pct = Math.min(100, (layer.gradient.to_position_pct ?? 100) + 5);
        break;
      case 'delete':
        this.onDelete?.(layer);
        return;
    }

    this._updateDisplays();
    this.onChange?.(layer);
  }

  _updateDisplays() {
    const layer = this._layer;
    if (!layer) return;

    this._colorInput.value   = layer.color      || '#000000';
    this._blendSel.value     = layer.blend_mode || 'normal';

    const opEl = this._el.querySelector('[data-field="op"]');
    if (opEl) opEl.textContent = Math.round((layer.opacity ?? 1) * 100) + '%';

    const gradEnabled = layer.gradient?.enabled === true;
    this._el.querySelector('[data-action="gradient-toggle"]')
      .classList.toggle('ot-active', gradEnabled);
    this._row2.style.display = gradEnabled ? '' : 'none';

    if (gradEnabled && layer.gradient) {
      const g = layer.gradient;
      this._dirSel.value = g.direction || 'to-bottom';
      const fromOpEl  = this._el.querySelector('[data-field="from-op"]');
      const fromPosEl = this._el.querySelector('[data-field="from-pos"]');
      const toOpEl    = this._el.querySelector('[data-field="to-op"]');
      const toPosEl   = this._el.querySelector('[data-field="to-pos"]');
      if (fromOpEl)  fromOpEl.textContent  = Math.round((g.from_opacity      ?? 0)   * 100) + '%';
      if (fromPosEl) fromPosEl.textContent = (g.from_position_pct ?? 0)   + '%';
      if (toOpEl)    toOpEl.textContent    = Math.round((g.to_opacity        ?? 0.8) * 100) + '%';
      if (toPosEl)   toPosEl.textContent   = (g.to_position_pct   ?? 100) + '%';
    }
  }

  show(layer) {
    this._layer = layer;
    this._updateDisplays();
    this._el.style.display = '';
  }

  hide() {
    this._layer = null;
    this._el.style.display = 'none';
  }

  get currentLayer() { return this._layer; }
}
