# Silent Failures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface three silent failure modes to the user (font load failures, image quota overflow, orphaned images), fix a font detection false-negative, and add Google Fonts guidance to the AI manual.

**Architecture:** Storage chain fix threads failure info upward (`storage.js` → `project.js` → `app.js`). Font fix replaces polling-based detection with `document.fonts.load()`. Each fix is isolated to its own file(s) and committed separately.

**Tech Stack:** Vanilla ES modules, HTML5 Canvas, localStorage, `document.fonts` API. No test framework — verification is browser-based with specific JSON snippets.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `modules/storage.js` | Modify | `saveImages` returns `string[]` of failed filenames |
| `modules/project.js` | Modify | `addImages` returns `{ matched, storageFailed }` |
| `app.js` | Modify | Quota toast in `handleImageFiles`; orphan cleanup + font toast in `loadProjectData` |
| `modules/fonts.js` | Modify | Replace `check()` + polling with `document.fonts.load()` |
| `data/ai-manual-content.js` | Modify | Add Google Fonts guidance in Typography Rules section |

---

## Task 1: `saveImages` returns failed filenames

**Files:**
- Modify: `modules/storage.js:145-165`

- [ ] **Step 1: Read the current `saveImages` function**

Read `modules/storage.js` lines 145–165 to see the current implementation before editing.

- [ ] **Step 2: Replace `saveImages` to return `string[]`**

Replace the entire `saveImages` function with:

```javascript
/**
 * Save/merge new images into the store for a project.
 * @param {string} projectId
 * @param {Object.<string, string>} imageMap — filename → dataURL
 * @returns {string[]} filenames that could not be saved due to quota
 */
export function saveImages(projectId, imageMap) {
  const existing = loadImages(projectId);
  const merged   = { ...existing, ...imageMap };
  try {
    localStorage.setItem(imagesKey(projectId), JSON.stringify(merged));
    return []; // all saved
  } catch (e) {
    // LocalStorage quota — try to save individual items
    console.warn('[storage] saveImages quota hit, attempting partial save:', e);
    const failed = [];
    let saved = { ...existing };
    for (const [filename, dataURL] of Object.entries(imageMap)) {
      try {
        saved[filename] = dataURL;
        localStorage.setItem(imagesKey(projectId), JSON.stringify(saved));
      } catch {
        console.warn(`[storage] Could not save image "${filename}" (quota exceeded).`);
        delete saved[filename];
        failed.push(filename);
      }
    }
    return failed;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add modules/storage.js
git commit -m "fix: saveImages returns list of quota-failed filenames"
```

---

## Task 2: `addImages` propagates `storageFailed`

**Files:**
- Modify: `modules/project.js:86-107`

- [ ] **Step 1: Read the current `addImages` method**

Read `modules/project.js` lines 85–107 to see the current implementation.

- [ ] **Step 2: Update `addImages` to return `{ matched, storageFailed }`**

Find the `addImages` method. It currently ends with `return matched;`. Change it so it collects the return value from `saveImages` and returns both:

```javascript
async addImages(newImages) {
  const matched = [];
  const toLoad  = [];

  for (const [filename, dataURL] of Object.entries(newImages)) {
    this.imageMap[filename] = dataURL;
    toLoad.push({ filename, dataURL });
    if (this._isImageReferenced(filename)) {
      matched.push(filename);
    }
  }

  // Save to localStorage — returns list of filenames that couldn't be saved
  const storageFailed = storage.saveImages(this.id, newImages);

  // Pre-load elements
  await Promise.all(toLoad.map(({ filename, dataURL }) =>
    this._loadImageElement(filename, dataURL)
  ));

  return { matched, storageFailed };
}
```

- [ ] **Step 3: Commit**

```bash
git add modules/project.js
git commit -m "fix: addImages returns { matched, storageFailed }"
```

---

## Task 3: Quota toast in `handleImageFiles`

**Files:**
- Modify: `app.js:344-349`

- [ ] **Step 1: Read the current `handleImageFiles` image-add section**

Read `app.js` lines 340–360 to see the current call site.

- [ ] **Step 2: Destructure the new return value and add quota toast**

Find this line (around line 344):
```javascript
const matched = await project.addImages(imageMap);
```

Replace it and the lines that follow (up to and including the `toasts.success` call) with:

```javascript
const { matched, storageFailed } = await project.addImages(imageMap);

const total  = Object.keys(imageMap).length;
const msg    = `Loaded ${total} image(s), ${matched.length} matched`;
status.ready(msg);
toasts.success('Images Loaded', msg);

if (storageFailed.length > 0) {
  toasts.warning(
    'Storage full',
    `${storageFailed.length} image(s) couldn't be saved (storage full). ` +
    `They'll work this session but won't reload next visit. ` +
    `Use "Clear Project" to free storage space.`
  );
}
```

- [ ] **Step 3: Verify in browser**

Load a project JSON. Then drag in several large images (original camera JPEGs work best for triggering quota). If quota is not exceeded, the warning toast should NOT appear. If you want to force the error: open DevTools → Application → Storage → set localStorage quota to a very low value (some browsers support this), then load images again.

Expected: success toast always appears; warning toast appears only if quota was hit.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "fix: show toast when images can't be saved due to storage quota"
```

---

## Task 4: Orphan image cleanup on project switch

**Files:**
- Modify: `app.js:228-237`

- [ ] **Step 1: Read the start of `loadProjectData`**

Read `app.js` lines 228–240 to find the exact insertion point.

- [ ] **Step 2: Add orphan cleanup before project loads**

After the `async function loadProjectData(data, saveToStorage) {` line, insert the cleanup block before the existing validation code:

```javascript
async function loadProjectData(data, saveToStorage) {
  // Clean up images from previous project if switching to a different project ID
  const incomingId = data.project?.id;
  if (project.isLoaded && project.id && project.id !== incomingId) {
    storage.clearImages(project.id);
  }

  // Validate
  const uploadedImages = new Set(Object.keys(project.imageMap ?? {}));
  // ... rest of function unchanged
```

- [ ] **Step 3: Verify in browser**

1. Load project JSON "A", drag in an image, observe it stores in localStorage (`frameforge_images_<id-of-A>` key in DevTools → Application → Local Storage).
2. Load a different project JSON "B" (different `project.id`).
3. Check localStorage — `frameforge_images_<id-of-A>` should be gone.
4. Reload page and reload project "A" — images will need to be re-added (correct behavior, no orphan bloat).

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "fix: clear previous project images from localStorage on project switch"
```

---

## Task 5: Fix font detection with `document.fonts.load()`

**Files:**
- Modify: `modules/fonts.js:110-149`

- [ ] **Step 1: Read the current `loadFontFamily` function**

Read `modules/fonts.js` lines 101–159.

- [ ] **Step 2: Replace the `link.onload` handler**

Find `link.onload = async () => {` (line 110) through the closing `};` (line 149). Replace the entire `link.onload` handler with:

```javascript
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
```

Leave `link.onerror` unchanged.

- [ ] **Step 3: Verify in browser — no false-negative warnings**

Load a project that uses Montserrat and Playfair Display (or any Google Font). Open the browser console. Previously you'd see:

```
[app] Font failed to load: Montserrat
[app] Font failed to load: Playfair Display
```

After this fix, with a working internet connection those warnings should NOT appear. Canvas should render correctly and no font warning toast should fire.

- [ ] **Step 4: Commit**

```bash
git add modules/fonts.js
git commit -m "fix: use document.fonts.load() to eliminate false-negative font detection"
```

---

## Task 6: Font failure toast in `app.js`

**Files:**
- Modify: `app.js:307-317`

- [ ] **Step 1: Read the current font callback in `loadProjectData`**

Read `app.js` lines 307–317.

- [ ] **Step 2: Add toast to the font failure branch**

Find this block:
```javascript
fontPromises = loadProjectFonts(data, (family, ok) => {
  if (ok) {
    // Re-render when a font loads
    renderCurrentFrame();
    filmstrip.renderAll(project);
    inspector.refreshFontStatus(project);
  } else {
    console.warn(`[app] Font failed to load: ${family}`);
  }
});
```

Replace with:
```javascript
fontPromises = loadProjectFonts(data, (family, ok) => {
  if (ok) {
    // Re-render when a font loads
    renderCurrentFrame();
    filmstrip.renderAll(project);
    inspector.refreshFontStatus(project);
  } else {
    console.warn(`[app] Font failed to load: ${family}`);
    toasts.warning('Font unavailable', `"${family}" could not be loaded from Google Fonts. A system font will be used instead.`);
  }
});
```

- [ ] **Step 3: Verify in browser — genuine failure produces toast**

To simulate a font failure, temporarily modify `buildFontURL` in `fonts.js` to return an invalid URL (e.g. `return 'https://invalid.example.com/font.css';`), reload, load a project with a Google Font. A warning toast should appear for each family. Revert the temporary change after verifying.

Alternatively, use DevTools → Network → block `fonts.googleapis.com` requests and reload.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "fix: show warning toast when Google Font fails to load"
```

---

## Task 7: AI manual — Google Fonts guidance

**Files:**
- Modify: `data/ai-manual-content.js:345-357` (Typography Rules section)

- [ ] **Step 1: Read the Typography Rules section**

Read `data/ai-manual-content.js` lines 343–360.

- [ ] **Step 2: Add font loading note after the section header**

Find this line (around line 347):
```
- **Pair exactly two fonts**: one display (headlines) + one sans-serif (labels, body, stats)
```

Insert the following note immediately before it (as the first item under `## Typography Rules`):

```
- **Fonts load from Google Fonts (requires internet).** Always use valid Google Fonts family names — verify at fonts.google.com. If a family name is wrong or unavailable, the renderer silently falls back to system sans-serif with no visual warning to the end user.
```

So the section starts:
```
## Typography Rules

- **Fonts load from Google Fonts (requires internet).** Always use valid Google Fonts family names — verify at fonts.google.com. If a family name is wrong or unavailable, the renderer silently falls back to system sans-serif with no visual warning to the end user.
- **Pair exactly two fonts**: one display (headlines) + one sans-serif (labels, body, stats)
...
```

- [ ] **Step 3: Verify the AI manual string is valid JS**

Reload the app in the browser. Open DevTools console and run:
```javascript
import('./data/ai-manual-content.js').then(m => console.log(m.AI_MANUAL.includes('Google Fonts')))
```
Expected: `true`

- [ ] **Step 4: Commit**

```bash
git add data/ai-manual-content.js
git commit -m "docs: add Google Fonts requirement note to AI manual Typography Rules"
```
