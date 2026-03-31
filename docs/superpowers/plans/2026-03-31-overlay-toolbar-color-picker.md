# Overlay Toolbar Redesign + Shared Color Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the overlay toolbar with draggable persistence, slider-based gradient controls with visual direction swatches, and introduce a shared ColorPicker component with project palette, saved colors, tonal variants, and color harmonies — wired into overlay, text, and shape toolbars.

**Architecture:** A new standalone `ColorPicker` class manages a body-appended popover and is injected into each toolbar via `attach(swatchEl)`. The overlay toolbar is fully rewritten with a drag handle bar, opacity/gradient sliders, and CSS gradient direction swatches. A `palette` getter is added to `Project` to expose project-level palette data.

**Tech Stack:** Vanilla JS ES modules, CSS custom properties (`var(--color-*)`), `localStorage`, native `<input type="range">` and `<input type="color">`.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frameforge/modules/project.js` | Modify | Add `get palette()` accessor |
| `frameforge/ui/color-picker.js` | Create | Standalone ColorPicker popover component |
| `frameforge/ui/overlay-toolbar.js` | Rewrite | Drag handle, opacity slider, gradient sliders, direction swatches |
| `frameforge/ui/text-toolbar.js` | Modify | Replace `<input type="color">` with ColorPicker |
| `frameforge/ui/shape-toolbar.js` | Modify | Replace `<input type="color">` with ColorPicker |
| `frameforge/styles/components.css` | Modify | Add `.cp-*` styles; update `.ot-*` styles |
| `frameforge/app.js` | Modify | Skip `positionElementRight` for overlay toolbar when saved pos exists |

---

## Task 1: Add `project.palette` getter

**Files:**
- Modify: `frameforge/modules/project.js:240-265` (Accessors section)

- [ ] **Step 1: Add the getter after `get globals()`**

In `frameforge/modules/project.js`, add this getter after the existing `get globals()` getter (currently at line 254):

```js
get palette() {
  return this.data?.palette ?? [];
}
```

- [ ] **Step 2: Verify in browser console**

Open the app, load a project that has a `palette` array in its JSON. In the browser console:
```js
// project is the global Project instance accessible via app.js's closure
// Verify by loading the amazon test project and checking:
// Expected: [{ hex: '#F5EFE0', name: 'Warm White' }, ...]
```
If the project JSON has no `palette` field, `project.palette` should return `[]`.

- [ ] **Step 3: Commit**

```bash
git add frameforge/modules/project.js
git commit -m "feat: add palette getter to Project"
```

---

## Task 2: Color math utilities inside ColorPicker

**Files:**
- Create: `frameforge/ui/color-picker.js`

- [ ] **Step 1: Create the file with color math only**

Create `frameforge/ui/color-picker.js` with just the color conversion helpers:

```js
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
```

- [ ] **Step 2: Verify math in browser console**

Open the browser console and paste:
```js
// Temporary test — paste the functions from the file, then:
console.log(shiftLightness('#C4782A', +40)); // Should be a lighter amber
console.log(rotateHue('#C4782A', 180));       // Should be a blue-ish
console.log(getTones('#1B3826').length === 5); // true
console.log(getHarmonies('#F5EFE0').length === 4); // true
```

- [ ] **Step 3: Commit**

```bash
git add frameforge/ui/color-picker.js
git commit -m "feat: add color math utilities (hex/hsl, tones, harmonies)"
```

---

## Task 3: ColorPicker class — popover DOM and behavior

**Files:**
- Modify: `frameforge/ui/color-picker.js`

- [ ] **Step 1: Append the ColorPicker class to the file**

Add this after the math helpers in `frameforge/ui/color-picker.js`:

```js
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
  }

  open() {
    if (this._popoverEl) return;
    this._expandedHex = null;
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
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onKeyDown);
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

        if (this._expandedHex === hex) {
          // Will insert expansion strip after this row
        }
      });
      section.appendChild(swatches);

      // Expansion strip (tones + harmonies) for the expanded swatch
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
      const hex = this._getColor();
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

    const nativePicker = document.createElement('input');
    nativePicker.type = 'color';
    nativePicker.style.cssText = 'position:absolute;opacity:0;width:0;height:0;';
    nativePicker.value = this._getColor() || '#000000';
    nativePicker.addEventListener('input', () => {
      this._applyColor(nativePicker.value);
    });

    customBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      nativePicker.value = this._getColor() || '#000000';
      nativePicker.click();
    });
    customSection.appendChild(nativePicker);
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

  /** A derived (tone/harmony) swatch button — click applies AND re-anchors expansion. */
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
```

- [ ] **Step 2: Verify file is syntactically valid**

```bash
node --input-type=module < frameforge/ui/color-picker.js
```
Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add frameforge/ui/color-picker.js
git commit -m "feat: add ColorPicker component with palette, saved colors, tones, harmonies"
```

---

## Task 4: CSS for ColorPicker

**Files:**
- Modify: `frameforge/styles/components.css`

- [ ] **Step 1: Append color picker styles at the end of `components.css`**

```css
/* ── Color Picker popover ─────────────────────────────────────────────────── */

.cp-popover {
  position: absolute;
  z-index: 200;
  background: var(--color-bg-panel);
  border: 1.5px solid var(--color-accent);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.55);
  padding: 6px;
  min-width: 180px;
  max-width: 220px;
}

.cp-section {
  padding: 4px 2px;
}

.cp-section + .cp-section {
  border-top: 1px solid var(--color-border);
  margin-top: 4px;
  padding-top: 6px;
}

.cp-title {
  font-size: 10px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cp-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cp-swatch {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1.5px solid rgba(255,255,255,0.15);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: border-color 0.1s, transform 0.1s;
}

.cp-swatch:hover {
  border-color: var(--color-accent);
  transform: scale(1.1);
}

.cp-swatch-sm {
  width: 18px;
  height: 18px;
}

.cp-swatch-add {
  background: var(--color-bg-panel-alt);
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1;
  border-color: var(--color-border);
}

.cp-swatch-add:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.cp-expansion {
  margin-top: 6px;
  padding: 4px;
  background: var(--color-bg-panel-alt);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cp-exp-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cp-exp-label {
  font-size: 9px;
  color: var(--color-text-muted);
  width: 44px;
  flex-shrink: 0;
}

.cp-custom-btn {
  width: 100%;
  background: var(--color-bg-panel-alt);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  padding: 4px 8px;
  cursor: pointer;
  text-align: center;
}

.cp-custom-btn:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-panel);
}
```

- [ ] **Step 2: Verify styles load without errors**

Open the app in a browser, open DevTools Console tab. No CSS errors should appear.

- [ ] **Step 3: Commit**

```bash
git add frameforge/styles/components.css
git commit -m "feat: add CSS for ColorPicker popover"
```

---

## Task 5: Rewrite overlay-toolbar.js

**Files:**
- Rewrite: `frameforge/ui/overlay-toolbar.js`

- [ ] **Step 1: Replace the entire file**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add frameforge/ui/overlay-toolbar.js
git commit -m "feat: rewrite overlay toolbar — drag, sliders, direction swatches, ColorPicker"
```

---

## Task 6: Update overlay toolbar CSS

**Files:**
- Modify: `frameforge/styles/components.css`

- [ ] **Step 1: Replace the old `.ot-*` block**

Find the existing `.ot-row1, .ot-row2` block (around line 1472) and replace everything from `.ot-row1` through `.ot-delete:hover` with:

```css
/* ── Overlay toolbar sections ───────────────────────────────────────────── */

.ot-drag-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--color-border);
  cursor: grab;
  user-select: none;
}

.ot-drag-bar:active { cursor: grabbing; }

.ot-grip {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1;
}

.ot-title {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.ot-delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 13px;
}

.ot-delete-btn:hover { color: var(--color-error); background: rgba(255,85,85,0.1); }

.ot-fill-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
}

.ot-color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1.5px solid rgba(255,255,255,0.15);
  cursor: pointer;
  flex-shrink: 0;
}

.ot-color-swatch:hover { border-color: var(--color-accent); }

.ot-slider-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.ot-slider {
  flex: 1;
  min-width: 60px;
  accent-color: var(--color-accent);
}

.ot-slider-val {
  font-size: var(--font-size-sm);
  min-width: 32px;
  text-align: right;
  color: var(--color-text-muted);
}

.ot-select {
  background: var(--color-bg-panel-alt);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  padding: 2px 4px;
  cursor: pointer;
}

.ot-grad-section {
  padding: 4px 8px 6px;
}

.ot-grad-toggle {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 2px 0;
  width: 100%;
  text-align: left;
}

.ot-grad-toggle:hover { color: var(--color-text); }

.ot-grad-body {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ot-dir-row {
  display: flex;
  gap: 4px;
}

.ot-dir-swatch {
  width: 32px;
  height: 22px;
  border-radius: 4px;
  border: 1.5px solid var(--color-border);
  cursor: pointer;
  padding: 0;
}

.ot-dir-swatch:hover    { border-color: var(--color-border-light); }
.ot-dir-active          { border-color: var(--color-accent) !important; }

.ot-stop {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ot-stop-label {
  font-size: 10px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ot-stop-sublabel {
  font-size: 10px;
  color: var(--color-text-muted);
  width: 48px;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Reload app, select an overlay layer, verify the toolbar renders correctly**

- Drag bar visible at top with grip + "Overlay" + delete button
- Fill row shows color swatch, opacity slider, blend dropdown
- Gradient toggle shows "▶ Gradient", clicking expands to show 4 direction swatches + Start/End stop sliders

- [ ] **Step 3: Commit**

```bash
git add frameforge/styles/components.css
git commit -m "feat: update overlay toolbar CSS — sections, sliders, direction swatches"
```

---

## Task 7: Update app.js — skip positionElementRight when saved position exists

**Files:**
- Modify: `frameforge/app.js`

- [ ] **Step 1: Update OverlayToolbar import and constructor call**

In `app.js`, find the import line (around line 32):
```js
import { OverlayToolbar } from './ui/overlay-toolbar.js';
```
It stays the same — no change needed.

Find the constructor call (around line 211):
```js
const overlayToolbar = new OverlayToolbar(overlayToolbarEl);
```
Replace with:
```js
const overlayToolbar = new OverlayToolbar(overlayToolbarEl, { getProject: () => project });
```

- [ ] **Step 2: Skip `positionElementRight` for overlay toolbar when a saved position exists**

Find `positionElementRight(overlayToolbarEl)` (around line 451). The overlay toolbar's `show()` already calls `_restorePos()` after setting `display:''`, which overrides any JS-set position. So `positionElementRight` only needs to run on first-ever show (no saved position). Since `show()` handles this internally, simply **remove** the `positionElementRight(overlayToolbarEl)` call from `positionToolbar()`:

Find this block (around line 447-453):
```js
    } else if (layer.type === 'image') {
      positionElementRight(imageToolbarEl);
      hideOverlay(resizeOverlayEl);
    } else if (layer.type === 'overlay') {
      positionElementRight(overlayToolbarEl);
      hideOverlay(resizeOverlayEl);
    }
```
Replace with:
```js
    } else if (layer.type === 'image') {
      positionElementRight(imageToolbarEl);
      hideOverlay(resizeOverlayEl);
    } else if (layer.type === 'overlay') {
      hideOverlay(resizeOverlayEl);
      // Overlay toolbar manages its own position (drag + localStorage)
    }
```

- [ ] **Step 3: Verify drag and persistence**

1. Load the app, select an overlay layer — toolbar appears.
2. Drag it to a new position.
3. Click off (deselect), then click the overlay layer again — toolbar reopens at the dragged position.
4. Reload the page entirely, select the overlay layer — toolbar still opens at the saved position.

- [ ] **Step 4: Commit**

```bash
git add frameforge/app.js
git commit -m "feat: wire OverlayToolbar to project palette; remove positionElementRight for overlay"
```

---

## Task 8: Wire ColorPicker into TextToolbar

**Files:**
- Modify: `frameforge/ui/text-toolbar.js`

- [ ] **Step 1: Add ColorPicker import at the top of the file**

After the existing constants at the top of `frameforge/ui/text-toolbar.js`, add:
```js
import { ColorPicker } from './color-picker.js';
```

- [ ] **Step 2: Add `_colorPicker` field and `getProject` param to constructor**

Replace the constructor signature and initialization:
```js
// BEFORE (line 53):
constructor(el, loadFontFn) {
  this._el        = el;
  this._layer     = null;
  this._loadFont  = loadFontFn ?? (() => Promise.resolve(false));
```
```js
// AFTER:
constructor(el, loadFontFn, { getProject } = {}) {
  this._el          = el;
  this._layer       = null;
  this._loadFont    = loadFontFn ?? (() => Promise.resolve(false));
  this._getProject  = getProject ?? (() => null);
  this._colorPicker = null;
```

- [ ] **Step 3: Replace the raw `<input type="color">` in `_build()`**

Find in `_build()` (line 120):
```js
        <input type="color" class="tt-color" title="Text colour">
```
Replace with:
```js
        <div class="tt-color-swatch" title="Text colour"></div>
```

- [ ] **Step 4: Replace `_colorInput` ref and its event listener in `_build()`**

Find (line 148):
```js
    this._colorInput   = this._el.querySelector('.tt-color');
```
Replace with:
```js
    this._colorSwatchEl = this._el.querySelector('.tt-color-swatch');
    this._colorPicker   = new ColorPicker({
      getColor:   () => this._layer?.font?.color ?? '#ffffff',
      setColor:   (hex) => {
        if (!this._layer) return;
        (this._layer.font ??= {}).color = hex;
        this.onChange?.(this._layer);
      },
      getProject: this._getProject,
    });
    this._colorPicker.attach(this._colorSwatchEl);
```

Find and **remove** the `_colorInput` event listener block (lines 159-163):
```js
    this._colorInput.addEventListener('input', () => {
      if (!this._layer) return;
      (this._layer.font ??= {}).color = this._colorInput.value;
      this.onChange?.(this._layer);
    });
```
(Delete it entirely — ColorPicker handles the event now.)

- [ ] **Step 5: Update `_updateDisplays()` to sync the swatch instead of setting `.value`**

Find (line 345):
```js
    this._colorInput.value = font.color ?? '#ffffff';
```
Replace with:
```js
    if (this._colorSwatchEl) this._colorSwatchEl.style.background = font.color ?? '#ffffff';
    this._colorPicker?.syncSwatch();
```

- [ ] **Step 6: Close picker on `hide()`**

Find `hide()`:
```js
  hide() {
    this._closePicker();
    this._layer = null;
    this._el.style.display = 'none';
  }
```
Replace with:
```js
  hide() {
    this._closePicker();
    this._colorPicker?.close();
    this._layer = null;
    this._el.style.display = 'none';
  }
```

- [ ] **Step 7: Replace `.tt-color` CSS with `.tt-color-swatch` in `components.css`**

Find these 4 lines in `components.css` (around line 1262):
```css
.tt-color {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: none;
  cursor: pointer;
  flex-shrink: 0;
}

.tt-color::-webkit-color-swatch-wrapper { padding: 0; }
.tt-color::-webkit-color-swatch { border: none; border-radius: calc(var(--radius-sm) - 1px); }
.tt-color::-moz-color-swatch { border: none; }
```
Replace with:
```css
.tt-color-swatch {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(255,255,255,0.15);
  cursor: pointer;
  flex-shrink: 0;
}

.tt-color-swatch:hover { border-color: var(--color-accent); }
```

- [ ] **Step 8: Update app.js TextToolbar constructor call**

In `app.js`, find the TextToolbar constructor call (search for `new TextToolbar`). Update to pass `getProject`:
```js
// BEFORE:
const textToolbar = new TextToolbar(textToolbarEl, fonts.load.bind(fonts));
// AFTER:
const textToolbar = new TextToolbar(textToolbarEl, fonts.load.bind(fonts), { getProject: () => project });
```

- [ ] **Step 9: Verify in browser — select a text layer, click color swatch, palette popover opens**

- [ ] **Step 10: Commit**

```bash
git add frameforge/ui/text-toolbar.js frameforge/styles/components.css frameforge/app.js
git commit -m "feat: wire ColorPicker into TextToolbar"
```

---

## Task 9: Wire ColorPicker into ShapeToolbar

**Files:**
- Modify: `frameforge/ui/shape-toolbar.js`

- [ ] **Step 1: Add ColorPicker import**

At the top of `frameforge/ui/shape-toolbar.js`, add:
```js
import { ColorPicker } from './color-picker.js';
```

- [ ] **Step 2: Add `_colorPicker` field and `getProject` param to constructor**

```js
// BEFORE (line 16):
constructor(el) {
  this._el    = el;
  this._layer = null;
  this._squareRef = null;
```
```js
// AFTER:
constructor(el, { getProject } = {}) {
  this._el          = el;
  this._layer       = null;
  this._squareRef   = null;
  this._getProject  = getProject ?? (() => null);
  this._colorPicker = null;
```

- [ ] **Step 3: Replace `<input type="color">` in `_build()`**

Find (line 36):
```js
        <input type="color" class="st-color" title="Fill colour">
```
Replace with:
```js
        <div class="st-color-swatch" title="Fill colour"></div>
```

- [ ] **Step 4: Replace `_colorInput` ref and its event listener in `_build()`**

Find (line 68):
```js
    this._colorInput = this._el.querySelector('.st-color');
```
Replace with:
```js
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
```

Find and **remove** the `_colorInput` event listener block (lines 74-80):
```js
    this._colorInput.addEventListener('input', () => {
      if (!this._layer) return;
      // Migrate legacy 'color' field → 'fill_color' on first toolbar write
      this._layer.fill_color = this._colorInput.value;
      delete this._layer.color;
      this.onChange?.(this._layer);
    });
```

- [ ] **Step 5: Update `_updateDisplays()`**

Find (line 212):
```js
    this._colorInput.value = this._getFillColor();
```
Replace with:
```js
    if (this._colorSwatchEl) this._colorSwatchEl.style.background = this._getFillColor();
    this._colorPicker?.syncSwatch();
```

- [ ] **Step 6: Close picker on `hide()`**

Find `hide()`:
```js
  hide() {
    this._layer = null;
    this._el.style.display = 'none';
  }
```
Replace with:
```js
  hide() {
    this._colorPicker?.close();
    this._layer = null;
    this._el.style.display = 'none';
  }
```

- [ ] **Step 7: Replace `.st-color` CSS with `.st-color-swatch` in `components.css`**

Find these lines in `components.css` (around line 1383):
```css
.st-color {
  width: 22px; height: 22px; padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: none; cursor: pointer; flex-shrink: 0;
}
.st-color::-webkit-color-swatch-wrapper { padding: 0; }
.st-color::-webkit-color-swatch { border: none; border-radius: calc(var(--radius-sm) - 1px); }
.st-color::-moz-color-swatch { border: none; }
```
Replace with:
```css
.st-color-swatch {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(255,255,255,0.15);
  cursor: pointer;
  flex-shrink: 0;
}

.st-color-swatch:hover { border-color: var(--color-accent); }
```

- [ ] **Step 8: Update app.js ShapeToolbar constructor call**

In `app.js`, find `new ShapeToolbar` and update to:
```js
// BEFORE:
const shapeToolbar = new ShapeToolbar(shapeToolbarEl);
// AFTER:
const shapeToolbar = new ShapeToolbar(shapeToolbarEl, { getProject: () => project });
```

- [ ] **Step 9: Verify in browser — select a shape layer, click color swatch, palette popover opens**

- [ ] **Step 10: Commit**

```bash
git add frameforge/ui/shape-toolbar.js frameforge/styles/components.css frameforge/app.js
git commit -m "feat: wire ColorPicker into ShapeToolbar"
```

---

## Task 10: Final smoke test

- [ ] **Step 1: Overlay toolbar drag and persistence**
  1. Select an overlay layer → toolbar appears
  2. Drag it to a corner
  3. Deselect, reselect → toolbar reopens at dragged position
  4. Hard-reload page, reselect → position preserved

- [ ] **Step 2: Overlay opacity slider**
  1. Select overlay layer
  2. Drag opacity slider — value updates live, canvas re-renders

- [ ] **Step 3: Gradient controls**
  1. Click "▶ Gradient" → expands
  2. Click a direction swatch → it gets accent border, canvas gradient direction changes
  3. Drag "Start Opacity" slider → canvas gradient updates
  4. Set Start position to 0%, End position to 50% with End opacity at 80% and direction Bottom fade → overlay covers only bottom half

- [ ] **Step 4: Color picker — palette**
  1. Load a project with `palette` in JSON
  2. Select overlay layer, click color swatch → popover shows "Project palette" section with swatches
  3. Click a palette swatch → overlay color changes
  4. Click it again → tones and harmony rows appear

- [ ] **Step 5: Color picker — saved colors**
  1. Set a color via custom picker
  2. Click [+] → color appears in saved colors
  3. Right-click saved swatch → it disappears
  4. Reload page → saved colors still present

- [ ] **Step 6: Color picker — text toolbar**
  1. Select a text layer → click color swatch → ColorPicker popover opens

- [ ] **Step 7: Color picker — shape toolbar**
  1. Select a shape layer → click color swatch → ColorPicker popover opens

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: final smoke test pass — overlay toolbar + color picker complete"
```
