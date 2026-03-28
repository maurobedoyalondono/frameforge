# Silent Failures — Design Spec

**Date:** 2026-03-26
**Scope:** Fix three silent failure modes in FrameForge and update the AI manual with font guidance.

---

## Problems Being Fixed

1. **Font false-negative detection** — `document.fonts.check()` fires false even when fonts actually loaded, producing spurious `[app] Font failed to load` console warnings. No user toast was shown anyway.
2. **Genuine font failures are silent** — when Google Fonts is truly unavailable, the canvas silently renders in fallback sans-serif with no user feedback.
3. **Image storage quota failures are silent** — when `localStorage` quota is exceeded, images are partially saved with only a `console.warn`. Users don't know some images won't persist between sessions.
4. **Orphaned images accumulate silently** — loading a new project (different ID) over an existing one leaves the old project's images in `localStorage`, consuming quota without cleanup.
5. **AI manual has no font guidance** — external AI models designing JSON layouts don't know fonts must be valid Google Fonts family names.

---

## Fix 1: Font detection (`modules/fonts.js`)

**File:** `modules/fonts.js` — `loadFontFamily` function

Replace the `document.fonts.check()` + 200ms polling approach with `document.fonts.load()`.

After `link.onload` fires (CSS stylesheet downloaded), call `document.fonts.load(fontString)` for each requested variant. This returns a `Promise<FontFace[]>` that resolves when the font file is actually fetched and ready. If the array is non-empty, the font loaded. If empty or rejected, it failed.

```javascript
link.onload = async () => {
  try {
    const loadPromises = [...variants].map(v => {
      const isItalic = v.endsWith('i');
      const weight   = parseInt(v, 10);
      const style    = isItalic ? 'italic' : 'normal';
      return document.fonts.load(`${style} ${weight} 12px "${family}"`);
    });
    const results  = await Promise.allSettled(loadPromises);
    const anyLoaded = results.some(r => r.status === 'fulfilled' && r.value.length > 0);
    STATUS.set(family, anyLoaded ? 'loaded' : 'failed');
    resolve(anyLoaded);
  } catch (e) {
    console.warn(`[fonts] Error loading font "${family}":`, e);
    STATUS.set(family, 'failed');
    resolve(false);
  }
};
```

The `link.onerror` path is unchanged.

**Why:** `document.fonts.load()` waits for the actual font file download, not just the CSS. `document.fonts.check()` returns false if the file hasn't been fetched yet, causing false negatives.

---

## Fix 2: User feedback for font failures (`app.js`)

**File:** `app.js` — `loadProjectData` font callback

When `loadProjectFonts` calls back with `ok = false`, show a `toasts.warning` in addition to the existing `console.warn`:

```javascript
} else {
  console.warn(`[app] Font failed to load: ${family}`);
  toasts.warning('Font unavailable', `"${family}" could not be loaded from Google Fonts. A system font will be used instead.`);
}
```

One toast per failed family. Rendering fallback (`", sans-serif"` in `buildFontString`) is already in place — no rendering changes needed.

---

## Fix 3: Image quota feedback (`storage.js` → `project.js` → `app.js`)

### `storage.js` — `saveImages`

Change return type from `void` to `string[]` (list of filenames that could not be saved).

- On full success: return `[]`
- On quota hit with partial save: return filenames that were skipped
- On complete failure (every image fails): return all filenames

```javascript
export function saveImages(projectId, imageMap) {
  // ... try full save first ...
  // on quota catch: try one-by-one, collect failed filenames
  // return failed[]
}
```

### `project.js` — `addImages`

Collect the `failed` list from `saveImages` and return it:

```javascript
async addImages(newImages) {
  // ...
  const storageFailed = storage.saveImages(this.id, newImages);
  // ...
  return { matched, storageFailed };
}
```

### `app.js` — `handleImageFiles`

Destructure the new return value. If `storageFailed.length > 0`, show a `toasts.warning`:

```javascript
const { matched, storageFailed } = await project.addImages(imageMap);

if (storageFailed.length > 0) {
  toasts.warning(
    'Storage full',
    `${storageFailed.length} image(s) couldn't be saved (storage full). ` +
    `They'll work this session but won't reload next visit. ` +
    `Use "Clear Project" to free storage space.`
  );
}
```

---

## Fix 4: Orphaned image cleanup (`app.js`)

**File:** `app.js` — `loadProjectData`

When a new project is loaded and its ID differs from the currently loaded project, clear the old project's images from localStorage before proceeding:

```javascript
async function loadProjectData(data, saveToStorage) {
  const incomingId = data.project?.id;
  if (project.isLoaded && project.id && project.id !== incomingId) {
    storage.clearImages(project.id);
  }
  // ... rest of load logic unchanged ...
}
```

This prevents orphaned image blobs from accumulating across project switches.

---

## Fix 5: AI manual — font guidance (`data/ai-manual-content.js`)

Add the following note near the `font_defaults` / font usage section of the `AI_MANUAL` string:

> **Fonts:** Fonts are loaded at render time from Google Fonts (requires internet access). Always use valid Google Fonts family names (e.g. `"Montserrat"`, `"Playfair Display"`, `"Inter"`). If a family name is invalid or not on Google Fonts, the renderer silently falls back to system sans-serif. Verify each font name exists at fonts.google.com before using it.

---

## Files Changed

| File | Change |
|---|---|
| `modules/fonts.js` | Replace `check()` + polling with `document.fonts.load()` |
| `app.js` | Toast on font failure; toast on image quota; orphan cleanup on project switch |
| `modules/storage.js` | `saveImages` returns `string[]` of failed filenames |
| `modules/project.js` | `addImages` returns `{ matched, storageFailed }` |
| `data/ai-manual-content.js` | Add Google Fonts guidance near font section |

---

## Out of Scope

- Image compression before storage (future work)
- IndexedDB migration (future work)
- Font fallback picker UI (future work)
