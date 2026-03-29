export class LayersPanel {
  constructor(el) {
    this._el         = el;
    this._listEl     = null;
    this._selectedId = null;
    this.onLayerSelect           = null; // (layerId) => void
    this.onLayerVisibilityToggle = null; // (layerId) => void
    this.onLayerVisibilityAll    = null; // (makeVisible: boolean) => void
    this.onLayerDelete           = null; // (layerId) => void
    this._build();
  }

  _build() {
    this._el.innerHTML = `
      <div class="lp-header">
        <span class="lp-title">Layers</span>
        <div class="lp-header-actions">
          <button class="lp-btn lp-btn-all" data-action="show-all" title="Show all layers">👁</button>
          <button class="lp-btn lp-btn-all" data-action="hide-all" title="Hide all layers">⊘</button>
        </div>
      </div>
      <div class="lp-list"></div>
    `;
    this._listEl = this._el.querySelector('.lp-list');

    // Header actions (show-all / hide-all)
    this._el.querySelector('.lp-header').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'show-all') { this.onLayerVisibilityAll?.(true);  return; }
      if (btn.dataset.action === 'hide-all') { this.onLayerVisibilityAll?.(false); return; }
    });

    this._listEl.addEventListener('click', e => {
      const row = e.target.closest('[data-layer-id]');
      if (!row) return;
      const layerId = row.dataset.layerId;

      if (e.target.closest('[data-action="eye"]')) {
        this.onLayerVisibilityToggle?.(layerId);
        return;
      }
      if (e.target.closest('[data-action="delete"]')) {
        this.onLayerDelete?.(layerId);
        return;
      }
      this.onLayerSelect?.(layerId);
    });
  }

  _typeIcon(type) {
    switch (type) {
      case 'text':    return '📝';
      case 'shape':   return '◼';
      case 'image':   return '🖼';
      case 'overlay': return '▓';
      default:        return '◻';
    }
  }

  _layerLabel(layer) {
    switch (layer.type) {
      case 'text':
        return (layer.content || '').slice(0, 20) || 'Text';
      case 'shape':
        return layer.shape
          ? layer.shape.charAt(0).toUpperCase() + layer.shape.slice(1)
          : 'Shape';
      case 'image':
        return layer.src || 'Image';
      case 'overlay':
        return 'Overlay';
      default:
        return layer.type || 'Layer';
    }
  }

  _swatchColor(layer) {
    if (layer.type === 'shape')   return layer.fill_color || layer.color || null;
    if (layer.type === 'overlay') return layer.color || null;
    return null;
  }

  _opacity(layer) {
    return Math.round((layer.opacity ?? layer.fill_opacity ?? 1) * 100);
  }

  render(frame) {
    const layers = (frame?.layers || []).slice().reverse(); // topmost first

    this._listEl.innerHTML = layers.map(layer => {
      const swatch     = this._swatchColor(layer);
      const op         = this._opacity(layer);
      const isHidden   = layer.visible === false;
      const isSelected = layer.id === this._selectedId;
      const label      = this._layerLabel(layer);

      return `
        <div class="lp-row${isSelected ? ' lp-selected' : ''}${isHidden ? ' lp-hidden-layer' : ''}"
             data-layer-id="${layer.id}"
             title="${label}">
          <span class="lp-icon">${this._typeIcon(layer.type)}</span>
          <span class="lp-label">${label}</span>
          <span class="lp-swatch${swatch ? '' : ' lp-swatch-empty'}"
                style="${swatch ? `background:${swatch}` : ''}"></span>
          <span class="lp-op">${op}%</span>
          <button class="lp-btn lp-eye" data-action="eye"
                  title="${isHidden ? 'Show layer' : 'Hide layer'}">${isHidden ? '⊘' : '👁'}</button>
          <button class="lp-btn lp-delete" data-action="delete" title="Delete layer">🗑</button>
        </div>
      `;
    }).join('');
  }

  setSelectedId(id) {
    this._selectedId = id;
    if (!this._listEl) return;
    this._listEl.querySelectorAll('.lp-row').forEach(row => {
      row.classList.toggle('lp-selected', row.dataset.layerId === id);
    });
  }

  show() {
    this._el.style.display = '';
  }

  hide() {
    this._el.style.display = 'none';
  }
}
