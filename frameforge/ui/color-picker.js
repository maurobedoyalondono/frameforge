/**
 * color-picker.js — Shared color picker popover component.
 *
 * Usage:
 *   const picker = new ColorPicker({ getColor, setColor, getProject });
 *   picker.attach(swatchEl);   // binds click → open/close popover
 *   picker.detach();           // removes listeners and DOM
 */

// ── Color math ─────────────────────────────────────────────────────────────

/** '#rrggbb' → { r, g, b } (0-255) */
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** { r, g, b } (0-255) → '#rrggbb' */
function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

/** { r, g, b } (0-255) → { h (0-360), s (0-100), l (0-100) } */
function rgbToHsl({ r, g, b }) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rr: h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6; break;
      case gg: h = ((bb - rr) / d + 2) / 6; break;
      default: h = ((rr - gg) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** { h (0-360), s (0-100), l (0-100) } → { r, g, b } (0-255) */
function hslToRgb({ h, s, l }) {
  const hh = h / 360, ss = s / 100, ll = l / 100;
  let r, g, b;
  if (ss === 0) {
    r = g = b = ll;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    r = hue2rgb(p, q, hh + 1/3);
    g = hue2rgb(p, q, hh);
    b = hue2rgb(p, q, hh - 1/3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

/** '#rrggbb' → '#rrggbb' with lightness shifted by deltaL (clamped 5-95) */
function shiftLightness(hex, deltaL) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.l = Math.max(5, Math.min(95, hsl.l + deltaL));
  return rgbToHex(hslToRgb(hsl));
}

/** '#rrggbb' → '#rrggbb' with hue rotated by deltaH */
function rotateHue(hex, deltaH) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.h = ((hsl.h + deltaH) % 360 + 360) % 360;
  return rgbToHex(hslToRgb(hsl));
}

/** Generate 5 tonal steps for a hex color */
function getTones(hex) {
  return [+40, +20, 0, -20, -40].map(d => shiftLightness(hex, d));
}

/** Generate 4 harmony swatches: complementary, 2 analogous, split-comp */
function getHarmonies(hex) {
  return [
    rotateHue(hex, 180),   // complementary
    rotateHue(hex, -30),   // analogous left
    rotateHue(hex, +30),   // analogous right
    rotateHue(hex, 150),   // split-complementary
  ];
}

// ── Saved colors (localStorage) ────────────────────────────────────────────

const SAVED_KEY = 'ff.saved_colors';

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch { return []; }
}

function saveSaved(arr) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(arr)); } catch { /* ignore */ }
}

// ── ColorPicker ─────────────────────────────────────────────────────────────

export class ColorPicker {
  /**
   * @param {{ getColor: () => string, setColor: (hex: string) => void, getProject: () => object }} opts
   */
  constructor({ getColor, setColor, getProject }) {
    this._getColor   = getColor;
    this._setColor   = setColor;
    this._getProject = getProject;

    this._popoverEl   = null;
    this._swatchEl    = null;
    this._expandedHex = null;   // which palette swatch is expanded
    this._nativePicker = null;
    this._onClick     = null;
    this._onDocClick  = null;
    this._onKeyDown   = null;
  }

  /** Bind the picker to a trigger element. */
  attach(swatchEl) {
    this._swatchEl = swatchEl;
    this._onClick = (e) => {
      e.stopPropagation();
      this._popoverEl ? this.close() : this.open();
    };
    swatchEl.addEventListener('click', this._onClick);
  }

  /** Remove all listeners and DOM. */
  detach() {
    if (this._swatchEl && this._onClick) {
      this._swatchEl.removeEventListener('click', this._onClick);
    }
    this.close();
    this._swatchEl = null;
    this._onClick = null;
  }

  open() {
    if (this._popoverEl) return;
    this._expandedHex = null;
    this._nativePicker = document.createElement('input');
    this._nativePicker.type = 'color';
    this._nativePicker.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none;';
    this._nativePicker.addEventListener('input', () => {
      this._applyColor(this._nativePicker.value);
    });
    document.body.appendChild(this._nativePicker);
    this._popoverEl = document.createElement('div');
    this._popoverEl.className = 'cp-popover';
    document.body.appendChild(this._popoverEl);
    this._render();
    this._position();

    this._onDocClick = (e) => {
      if (!this._popoverEl?.contains(e.target) && e.target !== this._swatchEl) {
        this.close();
      }
    };
    this._onKeyDown = (e) => { if (e.key === 'Escape') this.close(); };
    setTimeout(() => {
      document.addEventListener('click', this._onDocClick);
      document.addEventListener('keydown', this._onKeyDown);
    }, 0);
  }

  close() {
    if (!this._popoverEl) return;
    this._popoverEl.remove();
    this._popoverEl = null;
    this._nativePicker?.remove();
    this._nativePicker = null;
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onKeyDown);
    this._onDocClick = null;
    this._onKeyDown = null;
  }

  /** Re-render the popover content (called after color change). */
  _render() {
    const el      = this._popoverEl;
    const palette = this._getProject?.()?.palette ?? [];
    const saved   = loadSaved();

    el.innerHTML = '';

    // ── Project palette section ──
    if (palette.length > 0) {
      const section = document.createElement('div');
      section.className = 'cp-section';
      const title = document.createElement('div');
      title.className = 'cp-title';
      title.textContent = 'Project palette';
      section.appendChild(title);

      const swatches = document.createElement('div');
      swatches.className = 'cp-row';
      palette.forEach(({ hex, name }) => {
        const btn = document.createElement('button');
        btn.className = 'cp-swatch';
        btn.style.background = hex;
        btn.title = `${name} ${hex}`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._applyColor(hex);
          this._expandedHex = this._expandedHex === hex ? null : hex;
          this._render();
        });
        swatches.appendChild(btn);
      });
      section.appendChild(swatches);

      // Expansion strip for the expanded palette swatch
      if (this._expandedHex && palette.some(p => p.hex === this._expandedHex)) {
        this._appendExpansion(section, this._expandedHex);
      }
      el.appendChild(section);
    }

    // ── Saved colors section ──
    const savedSection = document.createElement('div');
    savedSection.className = 'cp-section';
    const savedTitle = document.createElement('div');
    savedTitle.className = 'cp-title';
    savedTitle.textContent = 'Saved colors';
    savedSection.appendChild(savedTitle);

    const savedRow = document.createElement('div');
    savedRow.className = 'cp-row';

    saved.forEach((hex, i) => {
      const btn = document.createElement('button');
      btn.className = 'cp-swatch';
      btn.style.background = hex;
      btn.title = hex + ' (right-click to remove)';
      btn.addEventListener('click', (e) => { e.stopPropagation(); this._applyColor(hex); });
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const arr = loadSaved();
        arr.splice(i, 1);
        saveSaved(arr);
        this._render();
      });
      savedRow.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'cp-swatch cp-swatch-add';
    addBtn.title = 'Save current color';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const hex = (this._getColor() || '').toLowerCase();
      if (!hex) return;
      const arr = loadSaved();
      if (!arr.includes(hex)) { arr.push(hex); saveSaved(arr); }
      this._render();
    });
    savedRow.appendChild(addBtn);

    savedSection.appendChild(savedRow);
    el.appendChild(savedSection);

    // ── Custom color ──
    const customSection = document.createElement('div');
    customSection.className = 'cp-section';
    const customBtn = document.createElement('button');
    customBtn.className = 'cp-custom-btn';
    customBtn.textContent = 'Custom color';
    customBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._nativePicker.value = this._getColor() || '#000000';
      this._nativePicker.click();
    });
    customSection.appendChild(customBtn);
    el.appendChild(customSection);
  }

  /** Append tones + harmonies expansion strip to a parent element. */
  _appendExpansion(parent, hex) {
    const wrap = document.createElement('div');
    wrap.className = 'cp-expansion';

    const tonesRow = document.createElement('div');
    tonesRow.className = 'cp-exp-row';
    const tonesLabel = document.createElement('span');
    tonesLabel.className = 'cp-exp-label';
    tonesLabel.textContent = 'Tones';
    tonesRow.appendChild(tonesLabel);
    getTones(hex).forEach(t => tonesRow.appendChild(this._derivedSwatch(t)));

    const harmRow = document.createElement('div');
    harmRow.className = 'cp-exp-row';
    const harmLabel = document.createElement('span');
    harmLabel.className = 'cp-exp-label';
    harmLabel.textContent = 'Harmony';
    harmRow.appendChild(harmLabel);
    getHarmonies(hex).forEach(h => harmRow.appendChild(this._derivedSwatch(h)));

    wrap.appendChild(tonesRow);
    wrap.appendChild(harmRow);
    parent.appendChild(wrap);
  }

  /** A derived (tone/harmony) swatch button — click applies color and collapses expansion to show this color's own tones/harmonies. */
  _derivedSwatch(hex) {
    const btn = document.createElement('button');
    btn.className = 'cp-swatch cp-swatch-sm';
    btn.style.background = hex;
    btn.title = hex;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._applyColor(hex);
      this._expandedHex = hex;
      this._render();
    });
    return btn;
  }

  _applyColor(hex) {
    this._setColor(hex);
    if (this._swatchEl) this._swatchEl.style.background = hex;
  }

  _position() {
    if (!this._popoverEl || !this._swatchEl) return;
    const r   = this._swatchEl.getBoundingClientRect();
    const pw  = this._popoverEl.offsetWidth  || 200;
    const ph  = this._popoverEl.offsetHeight || 200;
    let top  = r.bottom + 6 + window.scrollY;
    let left = r.left   + window.scrollX;
    if (left + pw > window.innerWidth  - 4) left = window.innerWidth  - pw - 4;
    if (top  + ph > window.innerHeight - 4) top  = r.top - ph - 6 + window.scrollY;
    this._popoverEl.style.top  = `${Math.round(top)}px`;
    this._popoverEl.style.left = `${Math.round(left)}px`;
  }

  /** Update the swatch background to reflect a new color value (called from toolbar). */
  syncSwatch() {
    if (this._swatchEl) this._swatchEl.style.background = this._getColor() || '#000000';
  }
}
