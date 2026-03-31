/**
 * overlay-toolbar.js — Floating contextual toolbar for a selected overlay layer.
 *
 * Three-section layout:
 *   Drag bar: ⠿ Overlay  [🗑]
 *   Fill row: [color swatch] [opacity slider] [blend mode]
 *   Gradient: toggle header → direction swatches + Start/End stop sliders
 *
 * Drag position persisted in localStorage as ff.overlay_toolbar_pos.
 *
 * Usage:
 *   const toolbar = new OverlayToolbar(el, { getProject });
 *   toolbar.onChange = (layer) => { re-render + save };
 *   toolbar.onDelete = (layer) => { remove layer };
 *   toolbar.show(layer);
 *   toolbar.hide();
 */

import { ColorPicker } from './color-picker.js';

const POS_KEY = 'ff.overlay_toolbar_pos';

const DIR_SWATCHES = [
  { value: 'to-bottom', css: 'linear-gradient(to bottom, #888, transparent)', title: 'Top fade' },
  { value: 'to-top',    css: 'linear-gradient(to top,    #888, transparent)', title: 'Bottom fade' },
  { value: 'to-right',  css: 'linear-gradient(to right,  #888, transparent)', title: 'Left fade' },
  { value: 'to-left',   css: 'linear-gradient(to left,   #888, transparent)', title: 'Right fade' },
];

export class OverlayToolbar {
  /**
   * @param {HTMLElement} el
   * @param {{ getProject: () => object }} opts
   */
  constructor(el, { getProject } = {}) {
    this._el         = el;
    this._getProject = getProject ?? (() => null);
    this._layer      = null;
    this._colorPicker = null;

    /** @type {((layer: object) => void) | null} */
    this.onChange = null;
    /** @type {((layer: object) => void) | null} */
    this.onDelete = null;

    this._build();
  }

  _build() {
    this._el.innerHTML = `
      <div class="ot-drag-bar">
        <span class="ot-grip">⠿</span>
        <span class="ot-title">Overlay</span>
        <button class="ot-delete-btn" data-action="delete" title="Delete layer">🗑</button>
      </div>
      <div class="ot-fill-row">
        <div class="ot-color-swatch" title="Color"></div>
        <div class="ot-slider-group">
          <input type="range" class="ot-slider" data-field="opacity" min="0" max="100" step="1">
          <span class="ot-slider-val" data-display="opacity">—</span>
        </div>
        <select class="ot-select" data-action="blend">
          <option value="normal">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
          <option value="soft-light">Soft Light</option>
        </select>
      </div>
      <div class="ot-grad-section">
        <button class="ot-grad-toggle" data-action="gradient-toggle">▶ Gradient</button>
        <div class="ot-grad-body" style="display:none">
          <div class="ot-dir-row">
            ${DIR_SWATCHES.map(d => `
              <button class="ot-dir-swatch" data-dir="${d.value}" title="${d.title}"
                style="background:${d.css}"></button>`).join('')}
          </div>
          <div class="ot-stop">
            <span class="ot-stop-label">Start</span>
            <div class="ot-slider-group">
              <span class="ot-stop-sublabel">Opacity</span>
              <input type="range" class="ot-slider" data-field="from-op" min="0" max="100" step="1">
              <span class="ot-slider-val" data-display="from-op">—</span>
            </div>
            <div class="ot-slider-group">
              <span class="ot-stop-sublabel">Position</span>
              <input type="range" class="ot-slider" data-field="from-pos" min="0" max="100" step="1">
              <span class="ot-slider-val" data-display="from-pos">—</span>
            </div>
          </div>
          <div class="ot-stop">
            <span class="ot-stop-label">End</span>
            <div class="ot-slider-group">
              <span class="ot-stop-sublabel">Opacity</span>
              <input type="range" class="ot-slider" data-field="to-op" min="0" max="100" step="1">
              <span class="ot-slider-val" data-display="to-op">—</span>
            </div>
            <div class="ot-slider-group">
              <span class="ot-stop-sublabel">Position</span>
              <input type="range" class="ot-slider" data-field="to-pos" min="0" max="100" step="1">
              <span class="ot-slider-val" data-display="to-pos">—</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Refs
    this._colorSwatch = this._el.querySelector('.ot-color-swatch');
    this._blendSel    = this._el.querySelector('[data-action="blend"]');
    this._gradBody    = this._el.querySelector('.ot-grad-body');
    this._gradToggle  = this._el.querySelector('[data-action="gradient-toggle"]');

    // ColorPicker
    this._colorPicker = new ColorPicker({
      getColor:   () => this._layer?.color ?? '#000000',
      setColor:   (hex) => {
        if (!this._layer) return;
        this._layer.color = hex;
        this.onChange?.(this._layer);
      },
      getProject: this._getProject,
    });
    this._colorPicker.attach(this._colorSwatch);

    // Sliders
    this._el.querySelectorAll('.ot-slider').forEach(slider => {
      slider.addEventListener('input', () => this._handleSlider(slider));
    });

    // Direction swatches
    this._el.querySelectorAll('[data-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._layer) return;
        this._ensureGradient();
        this._layer.gradient.direction = btn.dataset.dir;
        this._updateDisplays();
        this.onChange?.(this._layer);
      });
    });

    // Blend mode
    this._blendSel.addEventListener('change', () => {
      if (!this._layer) return;
      this._layer.blend_mode = this._blendSel.value;
      this.onChange?.(this._layer);
    });

    // Gradient toggle + delete
    this._el.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'gradient-toggle') {
        if (!this._layer) return;
        this._ensureGradient();
        this._layer.gradient.enabled = !this._layer.gradient.enabled;
        this._updateDisplays();
        this.onChange?.(this._layer);
      } else if (btn.dataset.action === 'delete') {
        this.onDelete?.(this._layer);
      }
    });

    // Drag
    this._initDrag(this._el.querySelector('.ot-drag-bar'));
  }

  _handleSlider(slider) {
    if (!this._layer) return;
    const val = parseInt(slider.value, 10);
    switch (slider.dataset.field) {
      case 'opacity':
        this._layer.opacity = val / 100;
        break;
      case 'from-op':
        this._ensureGradient();
        this._layer.gradient.from_opacity = val / 100;
        break;
      case 'from-pos':
        this._ensureGradient();
        this._layer.gradient.from_position_pct = val;
        break;
      case 'to-op':
        this._ensureGradient();
        this._layer.gradient.to_opacity = val / 100;
        break;
      case 'to-pos':
        this._ensureGradient();
        this._layer.gradient.to_position_pct = val;
        break;
    }
    // Update just the value display for this slider
    const display = this._el.querySelector(`[data-display="${slider.dataset.field}"]`);
    if (display) display.textContent = val + '%';
    this.onChange?.(this._layer);
  }

  _ensureGradient() {
    if (!this._layer.gradient) {
      this._layer.gradient = {
        enabled: false, direction: 'to-bottom',
        from_opacity: 0, from_position_pct: 0,
        to_opacity: 0.8, to_position_pct: 100,
      };
    }
  }

  _updateDisplays() {
    const layer = this._layer;
    if (!layer) return;

    // Color swatch
    this._colorSwatch.style.background = layer.color || '#000000';
    this._colorPicker.syncSwatch();

    // Opacity slider
    this._setSlider('opacity', Math.round((layer.opacity ?? 1) * 100));

    // Blend mode
    this._blendSel.value = layer.blend_mode || 'normal';

    // Gradient
    const gradEnabled = layer.gradient?.enabled === true;
    this._gradToggle.textContent = (gradEnabled ? '▼' : '▶') + ' Gradient';
    this._gradBody.style.display = gradEnabled ? '' : 'none';

    if (gradEnabled && layer.gradient) {
      const g = layer.gradient;

      // Direction swatches
      this._el.querySelectorAll('[data-dir]').forEach(btn => {
        btn.classList.toggle('ot-dir-active', btn.dataset.dir === (g.direction || 'to-bottom'));
      });

      this._setSlider('from-op',  Math.round((g.from_opacity      ?? 0)   * 100));
      this._setSlider('from-pos', g.from_position_pct ?? 0);
      this._setSlider('to-op',    Math.round((g.to_opacity        ?? 0.8) * 100));
      this._setSlider('to-pos',   g.to_position_pct   ?? 100);
    }
  }

  _setSlider(field, value) {
    const slider  = this._el.querySelector(`[data-field="${field}"]`);
    const display = this._el.querySelector(`[data-display="${field}"]`);
    if (slider)  slider.value = value;
    if (display) display.textContent = value + '%';
  }

  _initDrag(handle) {
    let startX, startY, startLeft, startTop;
    handle.addEventListener('mousedown', e => {
      if (e.target.closest('[data-action]')) return;
      e.preventDefault();
      const rect = this._el.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left; startTop = rect.top;

      const onMove = mv => {
        const left = Math.max(0, Math.min(window.innerWidth  - 20, startLeft + mv.clientX - startX));
        const top  = Math.max(0, Math.min(window.innerHeight - 20, startTop  + mv.clientY - startY));
        this._el.style.left  = `${left}px`;
        this._el.style.top   = `${top}px`;
        this._el.style.right = '';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        this._savePos();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  }

  _savePos() {
    const rect = this._el.getBoundingClientRect();
    try { localStorage.setItem(POS_KEY, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) })); } catch { /* ignore */ }
  }

  _restorePos() {
    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (saved && typeof saved.left === 'number') {
        this._el.style.left  = `${saved.left}px`;
        this._el.style.top   = `${saved.top}px`;
        this._el.style.right = '';
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }

  show(layer) {
    this._layer = layer;
    this._updateDisplays();
    this._el.style.display = '';
    this._restorePos(); // will override position if saved
  }

  hide() {
    this._colorPicker.close();
    this._layer = null;
    this._el.style.display = 'none';
  }

  get currentLayer() { return this._layer; }
}
