export class LayersPanel {
  constructor(el) {
    this._el         = el;
    this._listEl     = null;
    this._selectedId = null;
    this.onLayerSelect           = null; // (layerId) => void
    this.onLayerVisibilityToggle = null; // (layerId) => void
    this.onLayerVisibilityAll    = null; // (makeVisible: boolean) => void
    this.onLayerDelete           = null; // (layerId) => void
    this.onAddLayer              = null; // (type: string, variant?: string) => void
    this._popoverEl              = null;
    this._onDocClick             = null;
    this._build();
  }

  _build() {
    this._el.innerHTML = `
  <div class="lp-header">
    <div class="lp-header-top">
      <span class="lp-title">Layers</span>
      <div class="lp-header-utils">
        <button class="lp-btn lp-btn-all" data-action="show-all" title="Show all layers">👁</button>
        <button class="lp-btn lp-btn-all" data-action="hide-all" title="Hide all layers">⊘</button>
      </div>
    </div>
    <div class="lp-header-add">
      <button class="lp-btn-add" data-action="add-text"    title="Add text layer">Text</button>
      <div class="lp-add-sep"></div>
      <button class="lp-btn-add" data-action="add-shape"   title="Add shape layer">Shape</button>
      <div class="lp-add-sep"></div>
      <button class="lp-btn-add" data-action="add-overlay" title="Add overlay layer">Overlay</button>
    </div>
  </div>
  <div class="lp-list"></div>
  <div class="lp-shape-popover" style="display:none">
    <button class="lp-popover-btn" data-variant="bar">▬ Bar</button>
    <button class="lp-popover-btn" data-variant="square">■ Square</button>
    <button class="lp-popover-btn" data-variant="circle">● Circle</button>
  </div>
`;

    this._listEl    = this._el.querySelector('.lp-list');
    this._popoverEl = this._el.querySelector('.lp-shape-popover');

    const header    = this._el.querySelector('.lp-header');
    const headerTop = this._el.querySelector('.lp-header-top');

    // Header actions (add-text / add-shape / add-overlay / show-all / hide-all) + drag initiation
    header.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'show-all')    { this.onLayerVisibilityAll?.(true);  return; }
      if (btn.dataset.action === 'hide-all')    { this.onLayerVisibilityAll?.(false); return; }
      if (btn.dataset.action === 'add-text')    { this.onAddLayer?.('text');          return; }
      if (btn.dataset.action === 'add-overlay') { this.onAddLayer?.('overlay');       return; }
      if (btn.dataset.action === 'add-shape')   { this._toggleShapePopover();         return; }
    });

    this._popoverEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-variant]');
      if (!btn) return;
      this._popoverEl.style.display = 'none';
      this.onAddLayer?.('shape', btn.dataset.variant);
    });

    if (this._onDocClick) document.removeEventListener('click', this._onDocClick);
    this._onDocClick = e => {
      if (!this._popoverEl || this._popoverEl.style.display === 'none') return;
      if (!this._el.contains(e.target)) this._popoverEl.style.display = 'none';
    };
    document.addEventListener('click', this._onDocClick);

    this._initDrag(headerTop);

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

  _toggleShapePopover() {
    if (!this._popoverEl) return;
    const isOpen = this._popoverEl.style.display !== 'none';
    this._popoverEl.style.display = isOpen ? 'none' : '';
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

  _initDrag(handle) {
    let startX, startY, startLeft, startTop;

    handle.addEventListener('mousedown', e => {
      if (e.target.closest('[data-action]')) return; // button clicks — no drag
      e.preventDefault();
      const rect = this._el.getBoundingClientRect();
      startX    = e.clientX;
      startY    = e.clientY;
      startLeft = rect.left;
      startTop  = rect.top;

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
    try { localStorage.setItem('ff.layers_panel_pos', JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) })); } catch { /* ignore */ }
  }

  _restorePos() {
    try {
      const saved = JSON.parse(localStorage.getItem('ff.layers_panel_pos') || 'null');
      if (saved && typeof saved.left === 'number') {
        this._el.style.left  = `${saved.left}px`;
        this._el.style.top   = `${saved.top}px`;
        this._el.style.right = '';
      }
    } catch { /* ignore */ }
  }

  setSelectedId(id) {
    this._selectedId = id;
    if (!this._listEl) return;
    this._listEl.querySelectorAll('.lp-row').forEach(row => {
      row.classList.toggle('lp-selected', row.dataset.layerId === id);
    });
  }

  show() {
    this._restorePos();
    this._el.style.display = '';
  }

  hide() {
    this._el.style.display = 'none';
  }
}
