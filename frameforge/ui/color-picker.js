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
