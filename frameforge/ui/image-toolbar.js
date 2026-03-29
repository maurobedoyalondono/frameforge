export class ImageToolbar {
  constructor(el) {
    this._el    = el;
    this._layer = null;
    this.onChange = null;
    this.onDelete = null;
    this._build();
  }

  _build() {
    this._el.innerHTML = `
      <div class="it-row">
        <button class="it-btn it-fit it-toggle" data-action="fit-cover">Cover</button>
        <button class="it-btn it-fit it-toggle" data-action="fit-contain">Contain</button>
        <button class="it-btn it-fit it-toggle" data-action="fit-fill">Fill</button>
        <span class="it-sep"></span>
        <span class="it-label">Op</span>
        <button class="it-btn" data-action="op-dec">−</button>
        <span class="it-val" data-field="op">—</span>
        <button class="it-btn" data-action="op-inc">+</button>
        <span class="it-sep"></span>
        <button class="it-btn it-delete" data-action="delete" title="Delete layer">🗑</button>
      </div>
    `;

    this._el.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn) this._handleAction(btn.dataset.action);
    });
  }

  _handleAction(action) {
    if (!this._layer) return;
    const layer = this._layer;

    switch (action) {
      case 'fit-cover':   layer.fit = 'cover';   break;
      case 'fit-contain': layer.fit = 'contain'; break;
      case 'fit-fill':    layer.fit = 'fill';     break;
      case 'op-dec':
        layer.opacity = Math.max(0.05, +((layer.opacity ?? 1) - 0.05).toFixed(2));
        break;
      case 'op-inc':
        layer.opacity = Math.min(1, +((layer.opacity ?? 1) + 0.05).toFixed(2));
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

    const opEl = this._el.querySelector('[data-field="op"]');
    if (opEl) opEl.textContent = Math.round((layer.opacity ?? 1) * 100) + '%';

    this._el.querySelectorAll('.it-fit').forEach(btn => {
      const fit = btn.dataset.action.replace('fit-', '');
      btn.classList.toggle('it-active', layer.fit === fit);
    });
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
