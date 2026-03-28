/**
 * fonts.js — Google Fonts dynamic loader.
 *
 * Uses the Google Fonts CSS2 API:
 *   https://fonts.googleapis.com/css2?family=FAMILY:ital,wght@VARIANTS&display=swap
 *
 * Font loading MUST NOT block rendering — we load fonts in the background and
 * signal when they are ready so the renderer can re-render.
 */

const LOADED  = new Map(); // familyKey → Promise<boolean>
const STATUS  = new Map(); // familyKey → 'loading' | 'loaded' | 'failed'

const SYSTEM_FONTS = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace',
  'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Georgia',
  'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact', 'Courier New', 'Courier',
]);

/**
 * Collect all unique font families + weights needed from a project.
 * @param {object} data — full project JSON
 * @returns {Map<string, Set<string>>} family → Set of weight:italic strings like "400" | "700i"
 */
export function collectFonts(data) {
  const map = new Map(); // family → Set of variant strings

  const add = (family, weight = 400, isItalic = false) => {
    if (!family || SYSTEM_FONTS.has(family)) return;
    if (!map.has(family)) map.set(family, new Set());
    map.get(family).add(`${weight}${isItalic ? 'i' : ''}`);
  };

  const addFont = (font) => {
    if (!font) return;
    const isItalic = font.style === 'italic' || font.transform?.italic_override;
    add(font.family, font.weight || 400, !!isItalic);
  };

  // globals
  addFont(data.globals?.font_defaults);

  // frames
  for (const frame of (data.frames || [])) {
    for (const layer of (frame.layers || [])) {
      switch (layer.type) {
        case 'text':
          addFont(layer.font);
          break;
        case 'stats_block':
          for (const item of (layer.items || [])) {
            addFont(item.value_font);
            addFont(item.label_font);
          }
          break;
      }
    }
  }

  return map;
}

/**
 * Build a Google Fonts API URL for a family and its variants.
 * @param {string} family
 * @param {Set<string>} variants — e.g. Set{"400", "700", "400i", "700i"}
 * @returns {string}
 */
function buildFontURL(family, variants) {
  const encodedFamily = encodeURIComponent(family);
  const hasItalic = [...variants].some((v) => v.endsWith('i'));

  if (!hasItalic) {
    // ital not needed — simpler URL
    const weights = [...variants].map((v) => parseInt(v, 10)).sort((a, b) => a - b);
    const spec = weights.length === 1
      ? `wght@${weights[0]}`
      : `wght@${weights.join(';')}`;
    return `https://fonts.googleapis.com/css2?family=${encodedFamily}:${spec}&display=swap`;
  } else {
    // ital,wght format: ital,wght@0,400;0,700;1,400;1,700
    const pairs = new Set();
    for (const v of variants) {
      const isItalic = v.endsWith('i');
      const w = parseInt(v, 10);
      pairs.add(`${isItalic ? 1 : 0},${w}`);
    }
    const sorted = [...pairs].sort();
    return `https://fonts.googleapis.com/css2?family=${encodedFamily}:ital,wght@${sorted.join(';')}&display=swap`;
  }
}

/**
 * Inject a Google Fonts <link> element and wait for the font to load.
 * Returns a Promise<boolean> — true if loaded, false if failed.
 * @param {string} family
 * @param {Set<string>} variants
 * @returns {Promise<boolean>}
 */
function loadFontFamily(family, variants) {
  const url = buildFontURL(family, variants);

  return new Promise((resolve) => {
    // Inject CSS link
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = url;

    link.onload = async () => {
      try {
        const loadPromises = [...variants].map(v => {
          const isItalic = v.endsWith('i');
          const weight   = parseInt(v, 10);
          const style    = isItalic ? 'italic' : 'normal';
          return document.fonts.load(`${style} ${weight} 12px "${family}"`);
        });
        const results   = await Promise.allSettled(loadPromises);
        const anyLoaded = results.some(r => r.status === 'fulfilled' && r.value.length > 0);
        STATUS.set(family, anyLoaded ? 'loaded' : 'failed');
        resolve(anyLoaded);
      } catch (e) {
        console.warn(`[fonts] Error loading font "${family}":`, e);
        STATUS.set(family, 'failed');
        resolve(false);
      }
    };

    link.onerror = () => {
      console.warn(`[fonts] Failed to load stylesheet for "${family}"`);
      STATUS.set(family, 'failed');
      resolve(false);
    };

    document.head.appendChild(link);
  });
}

/**
 * Load all fonts found in a project data object.
 * Returns a Map of family → Promise<boolean>.
 *
 * @param {object} data — full project JSON
 * @param {function} [onFontReady] — callback(family, loaded) called as each font resolves
 * @returns {Map<string, Promise<boolean>>}
 */
export function loadProjectFonts(data, onFontReady) {
  const fontMap = collectFonts(data);
  const promises = new Map();

  for (const [family, variants] of fontMap) {
    if (LOADED.has(family)) {
      promises.set(family, LOADED.get(family));
      continue;
    }

    STATUS.set(family, 'loading');
    const p = loadFontFamily(family, variants).then((ok) => {
      if (onFontReady) onFontReady(family, ok);
      return ok;
    });
    LOADED.set(family, p);
    promises.set(family, p);
  }

  return promises;
}

/**
 * Get current status of a font family.
 * @param {string} family
 * @returns {'loading'|'loaded'|'failed'|'unknown'}
 */
export function getFontStatus(family) {
  if (SYSTEM_FONTS.has(family)) return 'loaded';
  return STATUS.get(family) || 'unknown';
}

/**
 * Get status map for all fonts in a project.
 * @param {object} data
 * @returns {Map<string, string>} family → status
 */
export function getProjectFontStatus(data) {
  const result = new Map();
  const fontMap = collectFonts(data);
  for (const family of fontMap.keys()) {
    result.set(family, getFontStatus(family));
  }
  return result;
}

/**
 * Load a single font family by name.
 * Returns Promise<boolean> — true if loaded, false if failed.
 * @param {string} family — Google Fonts family name
 * @param {string[]} [weights] — array of weight strings e.g. ['400', '700']
 */
export function loadFont(family, weights = ['400', '700']) {
  if (!family || SYSTEM_FONTS.has(family)) return Promise.resolve(true);
  if (LOADED.has(family)) return LOADED.get(family);
  const variants = new Set(weights);
  STATUS.set(family, 'loading');
  const p = loadFontFamily(family, variants);
  LOADED.set(family, p);
  return p;
}

/**
 * Build a CSS font string from layer font properties, with fallback.
 * @param {object} font — layer.font
 * @param {number} sizePx — computed size in pixels
 * @returns {string} — CSS font string
 */
export function buildFontString(font, sizePx) {
  const style   = font.style === 'italic' ? 'italic' : 'normal';
  const weight  = font.weight || 400;
  const family  = font.family ? `"${font.family}", sans-serif` : 'sans-serif';
  return `${style} ${weight} ${sizePx}px ${family}`;
}
