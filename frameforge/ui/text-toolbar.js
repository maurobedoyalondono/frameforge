/**
 * text-toolbar.js — Floating contextual toolbar for a selected text layer.
 *
 * Two-row layout:
 *   Row 1: Font | Size | B/I | Align | Line-height | Width | Color | Shadow | Delete
 *   Row 2: Text content input (full width)
 *   Popup: Font picker panel (opens below font button)
 *
 * Usage:
 *   const toolbar = new TextToolbar(el, loadFontFn);
 *   toolbar.onChange = (layer) => { re-render + save };
 *   toolbar.onDelete = (layer) => { remove layer + re-render };
 *   toolbar.show(layer);
 *   toolbar.hide();
 */

const CURATED_FONTS = [
  { family: 'Playfair Display', role: 'Display' },
  { family: 'Cormorant Garamond', role: 'Display' },
  { family: 'Bebas Neue', role: 'Display' },
  { family: 'DM Serif Display', role: 'Display' },
  { family: 'Cinzel', role: 'Display' },
  { family: 'Josefin Sans', role: 'Display' },
  { family: 'Inter', role: 'Body' },
  { family: 'Montserrat', role: 'Body' },
  { family: 'Source Sans 3', role: 'Body' },
  { family: 'DM Sans', role: 'Body' },
  { family: 'Oswald', role: 'Body' },
  { family: 'Open Sans', role: 'Body' },
];

// Google Fonts URL to pre-load all curated fonts for picker preview
const CURATED_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700' +
  '&family=Cormorant+Garamond:wght@400;700' +
  '&family=Bebas+Neue:wght@400' +
  '&family=DM+Serif+Display:wght@400;700' +
  '&family=Cinzel:wght@400;700' +
  '&family=Josefin+Sans:wght@300;400;700' +
  '&family=Inter:wght@400;700' +
  '&family=Montserrat:wght@400;700' +
  '&family=Source+Sans+3:wght@400;700' +
  '&family=DM+Sans:wght@400;700' +
  '&family=Oswald:wght@400;700' +
  '&family=Open+Sans:wght@400;700' +
  '&display=swap';

export class TextToolbar {
  /**
   * @param {HTMLElement} el
   * @param {(family: string) => Promise<boolean>} loadFontFn — loads a Google Font family
   */
  constructor(el, loadFontFn) {
    this._el        = el;
    this._layer     = null;
    this._loadFont  = loadFontFn ?? (() => Promise.resolve(false));
    this._pickerOpen       = false;
    this._curatedLoaded    = false;
    this._projectFamilies  = [];

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

  // ── Build DOM ──────────────────────────────────────────────────────────

  _build() {
    this._el.innerHTML = `
      <div class="tt-row1">
        <button class="tt-font-btn" data-action="font-picker" title="Font family">—</button>
        <div class="tt-sep"></div>
        <span class="tt-label">Sz</span>
        <button class="tt-btn" data-action="size-dec">−</button>
        <span class="tt-val" data-field="size">—</span>
        <button class="tt-btn" data-action="size-inc">+</button>
        <div class="tt-sep"></div>
        <button class="tt-btn tt-toggle" data-action="bold"   style="font-weight:700">B</button>
        <button class="tt-btn tt-toggle" data-action="italic" style="font-style:italic">I</button>
        <div class="tt-sep"></div>
        <button class="tt-btn tt-toggle" data-action="align-left"   title="Align left">
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <line x1="1" y1="2"  x2="11" y2="2"  stroke="currentColor" stroke-width="1.5"/>
            <line x1="1" y1="5"  x2="8"  y2="5"  stroke="currentColor" stroke-width="1.5"/>
            <line x1="1" y1="8"  x2="10" y2="8"  stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
        <button class="tt-btn tt-toggle" data-action="align-center" title="Align center">
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <line x1="1"   y1="2"  x2="11" y2="2"  stroke="currentColor" stroke-width="1.5"/>
            <line x1="2.5" y1="5"  x2="9.5" y2="5" stroke="currentColor" stroke-width="1.5"/>
            <line x1="1.5" y1="8"  x2="10.5" y2="8" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
        <button class="tt-btn tt-toggle" data-action="align-right" title="Align right">
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <line x1="1"  y1="2"  x2="11" y2="2"  stroke="currentColor" stroke-width="1.5"/>
            <line x1="4"  y1="5"  x2="11" y2="5"  stroke="currentColor" stroke-width="1.5"/>
            <line x1="2"  y1="8"  x2="11" y2="8"  stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
        <div class="tt-sep"></div>
        <span class="tt-label" title="Line height">↕</span>
        <button class="tt-btn" data-action="lh-dec">−</button>
        <span class="tt-val" data-field="lh">—</span>
        <button class="tt-btn" data-action="lh-inc">+</button>
        <div class="tt-sep"></div>
        <span class="tt-label" title="Max width">↔</span>
        <button class="tt-btn" data-action="width-dec">−</button>
        <span class="tt-val" data-field="width">—</span>
        <button class="tt-btn" data-action="width-inc">+</button>
        <div class="tt-sep"></div>
        <input type="color" class="tt-color" title="Text colour">
        <div class="tt-sep"></div>
        <button class="tt-btn tt-toggle" data-action="shadow">Shadow</button>
        <div class="tt-sep"></div>
        <div class="tt-sep"></div>
        <button class="tt-btn" data-action="copy"  title="Copy layer">Copy</button>
        <button class="tt-btn" data-action="paste" title="Paste layer" disabled>Paste</button>
        <button class="tt-btn tt-delete" data-action="delete" title="Delete layer">🗑</button>
      </div>
      <div class="tt-row2">
        <input type="text" class="tt-content" placeholder="Text content" spellcheck="false">
      </div>
      <div class="tt-picker" style="display:none"></div>
    `;

    // Refs
    this._fontBtn      = this._el.querySelector('[data-action="font-picker"]');
    this._sizeVal      = this._el.querySelector('[data-field="size"]');
    this._lhVal        = this._el.querySelector('[data-field="lh"]');
    this._widthVal     = this._el.querySelector('[data-field="width"]');
    this._boldBtn      = this._el.querySelector('[data-action="bold"]');
    this._italicBtn    = this._el.querySelector('[data-action="italic"]');
    this._alignBtns    = {
      left:   this._el.querySelector('[data-action="align-left"]'),
      center: this._el.querySelector('[data-action="align-center"]'),
      right:  this._el.querySelector('[data-action="align-right"]'),
    };
    this._shadowBtn    = this._el.querySelector('[data-action="shadow"]');
    this._pasteBtn = this._el.querySelector('[data-action="paste"]');
    this._colorInput   = this._el.querySelector('.tt-color');
    this._contentInput = this._el.querySelector('.tt-content');
    this._pickerEl     = this._el.querySelector('.tt-picker');

    // Events
    this._contentInput.addEventListener('input', () => {
      if (!this._layer) return;
      this._layer.content = this._contentInput.value;
      this.onChange?.(this._layer);
    });

    this._colorInput.addEventListener('input', () => {
      if (!this._layer) return;
      (this._layer.font ??= {}).color = this._colorInput.value;
      this.onChange?.(this._layer);
    });

    this._el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !this._layer) return;
      this._handleAction(btn.dataset.action);
    });

    // Close picker on outside click
    document.addEventListener('click', (e) => {
      if (this._pickerOpen && !this._el.contains(e.target)) {
        this._closePicker();
      }
    }, true);
  }

  // ── Actions ────────────────────────────────────────────────────────────

  _handleAction(action) {
    const font = () => (this._layer.font ??= {});
    switch (action) {
      case 'font-picker':
        this._pickerOpen ? this._closePicker() : this._openPicker();
        break;
      case 'size-dec':
        font().size_pct = Math.max(1.5, (this._layer.font?.size_pct ?? 5) - 0.5);
        this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'size-inc':
        font().size_pct = Math.min(25, (this._layer.font?.size_pct ?? 5) + 0.5);
        this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'bold':
        font().weight = (this._layer.font?.weight ?? 400) >= 700 ? 400 : 700;
        this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'italic':
        font().style = (this._layer.font?.style === 'italic') ? 'normal' : 'italic';
        this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'align-left':   this._layer.align = 'left';   this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'align-center': this._layer.align = 'center'; this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'align-right':  this._layer.align = 'right';  this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'lh-dec':
        font().line_height = Math.max(0.8, parseFloat(((this._layer.font?.line_height ?? 1.2) - 0.05).toFixed(2)));
        this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'lh-inc':
        font().line_height = Math.min(2.5, parseFloat(((this._layer.font?.line_height ?? 1.2) + 0.05).toFixed(2)));
        this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'width-dec':
        this._layer.max_width_pct = Math.max(10, (this._layer.max_width_pct ?? 80) - 5);
        this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'width-inc':
        this._layer.max_width_pct = Math.min(100, (this._layer.max_width_pct ?? 80) + 5);
        this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'shadow':
        if (!this._layer.shadow?.enabled) {
          this._layer.shadow = { color: '#000000', blur_px: 8, offset_x: 2, offset_y: 2, opacity: 0.6, ...(this._layer.shadow ?? {}), enabled: true };
        } else {
          this._layer.shadow.enabled = false;
        }
        this._updateDisplays(); this.onChange?.(this._layer); break;
      case 'delete':
        this.onDelete?.(this._layer); break;
      case 'copy':
        this.onCopy?.(this._layer); break;
      case 'paste':
        this.onPaste?.(); break;
    }
  }

  // ── Font picker ────────────────────────────────────────────────────────

  _openPicker() {
    this._pickerOpen = true;
    this._buildPicker();
    this._pickerEl.style.display = '';
    this._loadCuratedFonts();
  }

  _closePicker() {
    this._pickerOpen = false;
    this._pickerEl.style.display = 'none';
  }

  _buildPicker() {
    const currentFamily = this._layer?.font?.family ?? '';
    const projectFonts  = this._projectFamilies;

    const curatedDisplay = CURATED_FONTS.filter(f => f.role === 'Display');
    const curatedBody    = CURATED_FONTS.filter(f => f.role === 'Body');

    const renderItem = (family) => {
      const isActive    = family === currentFamily;
      const isInProject = projectFonts.includes(family);
      return `
        <div class="fp-item${isActive ? ' fp-item-active' : ''}" data-family="${family}"
             style="font-family: '${family}', sans-serif;">
          ${family}
          ${isInProject && !isActive ? '<span class="fp-badge">✓ in project</span>' : ''}
        </div>`;
    };

    const projectSection = projectFonts.length > 0 ? `
      <div class="fp-section-title">IN THIS PROJECT</div>
      ${projectFonts.map(renderItem).join('')}
      <div class="fp-divider"></div>
    ` : '';

    this._pickerEl.innerHTML = `
      <div class="fp-search-wrap">
        <input class="fp-search" type="text" placeholder="Search any Google Font…" spellcheck="false">
      </div>
      ${projectSection}
      <div class="fp-section-title">DISPLAY</div>
      <div class="fp-curated-display">${curatedDisplay.map(f => renderItem(f.family)).join('')}</div>
      <div class="fp-section-title" style="margin-top:6px;">BODY / LABELS</div>
      <div class="fp-curated-body">${curatedBody.map(f => renderItem(f.family)).join('')}</div>
      <div class="fp-search-result" style="display:none"></div>
    `;

    // Search input
    const searchInput = this._pickerEl.querySelector('.fp-search');
    const searchResult = this._pickerEl.querySelector('.fp-search-result');
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      if (!q) { searchResult.style.display = 'none'; return; }
      searchResult.style.display = '';
      searchResult.innerHTML = `
        <div class="fp-divider"></div>
        <div class="fp-item" data-family="${q}" style="font-family: '${q}', sans-serif;">
          ${q} <span class="fp-badge">use this font</span>
        </div>`;
    });

    // Click handler
    this._pickerEl.addEventListener('click', (e) => {
      const item = e.target.closest('[data-family]');
      if (!item) return;
      this._selectFont(item.dataset.family);
    });
  }

  _selectFont(family) {
    if (!this._layer) return;
    (this._layer.font ??= {}).family = family;
    this._fontBtn.textContent = family;
    this._closePicker();
    this._loadFont(family).then((ok) => {
      if (ok) this.onChange?.(this._layer);
    });
  }

  _loadCuratedFonts() {
    if (this._curatedLoaded) return;
    this._curatedLoaded = true;
    if (!document.querySelector(`link[href*="Playfair+Display"][href*="Cormorant"]`)) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = CURATED_FONT_URL;
      document.head.appendChild(link);
    }
  }

  // ── Displays ───────────────────────────────────────────────────────────

  _updateDisplays() {
    if (!this._layer) return;
    const font    = this._layer.font ?? {};
    const align   = this._layer.align ?? 'left';
    const weight  = font.weight ?? 400;
    const isItal  = font.style === 'italic';
    const shadow  = this._layer.shadow?.enabled === true;

    this._fontBtn.textContent = font.family ?? '—';
    this._sizeVal.textContent = (font.size_pct ?? 5).toFixed(1);
    this._lhVal.textContent   = (font.line_height ?? 1.2).toFixed(2);
    this._widthVal.textContent = `${Math.round(this._layer.max_width_pct ?? 80)}%`;

    this._boldBtn.classList.toggle('tt-active', weight >= 700);
    this._italicBtn.classList.toggle('tt-active', isItal);
    this._alignBtns.left.classList.toggle('tt-active',   align === 'left');
    this._alignBtns.center.classList.toggle('tt-active', align === 'center');
    this._alignBtns.right.classList.toggle('tt-active',  align === 'right');
    this._shadowBtn.classList.toggle('tt-active', shadow);

    this._colorInput.value = font.color ?? '#ffffff';
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Provide the list of font families currently used in the project,
   * so the picker can show them in the "In this project" section.
   * @param {string[]} families
   */
  setProjectFonts(families) {
    this._projectFamilies = families ?? [];
  }

  show(layer) {
    this._layer = layer;
    this._contentInput.value = layer.content ?? '';
    this._closePicker();
    this._updateDisplays();
    this._el.style.display = '';
  }

  hide() {
    this._closePicker();
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
