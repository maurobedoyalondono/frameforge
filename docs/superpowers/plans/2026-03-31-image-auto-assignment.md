# Image Auto-Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a FrameForge project JSON includes `image_filename` per frame, automatically assign loaded images to their frames — with a conflict-resolution modal when manual assignments already exist.

**Architecture:** Add `image_filename` (optional) to the JSON frame schema. `project.js` gains `_autoAssignImages()` which silently assigns unassigned frames and surfaces conflicts. A new `assignment-conflict-modal.js` presents conflicts as a table with bulk and per-row controls. `app.js` calls the modal after both JSON load and image load.

**Tech Stack:** Vanilla JS ES modules, no test framework (verify manually in browser via `http://127.0.0.1:5500/frameforge/index.html`).

**Spec:** `docs/superpowers/specs/2026-03-31-image-auto-assignment-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frameforge/data/test-projects/amazon/the-amazon.json` | Modify | Add `image_filename` to all 20 frames |
| `frameforge/modules/project.js` | Modify | `_autoAssignImages()`, updated `addImages()`, updated `load()` |
| `frameforge/ui/assignment-conflict-modal.js` | Create | Modal UI — returns `Promise<Map<frameIndex, 'replace'\|'keep'>>` |
| `frameforge/app.js` | Modify | Import modal, wire up after JSON load and image load |
| `frameforge/data/ai-manual-content.js` | Modify | Add `image_filename` to frame schema docs |
| `.claude/skills/frameforge-technical-producer/SKILL.md` | Modify | Instruct agent to write `image_filename` per frame |
| `frameforge/data/test-projects/README.md` | Modify | Step 5: note `image_filename` field |

---

## Task 1: Add `image_filename` to the-amazon.json

**Files:**
- Modify: `frameforge/data/test-projects/amazon/the-amazon.json`

The JSON currently has `"image_src": "<label>"` but no filename. Add `"image_filename"` immediately after `"image_src"` in each frame using the mapping below.

- [ ] **Step 1: Edit the JSON — add `image_filename` to each frame**

For each frame, find the `"image_src"` line and insert `"image_filename"` on the next line. Full mapping:

| Frame | `image_src` (existing) | `image_filename` to add |
|-------|------------------------|-------------------------|
| frame-01 | `aerial-amazon-river` | `dji_fly_20260228_131208_0599_1772316094210_photo.jpg` |
| frame-02 | `aerial-river-descent` | `dji_fly_20260228_131446_0609_1772316071531_photo.jpg` |
| frame-03 | `canoe-interior-river-view` | `IMG_9464.jpg` |
| frame-04 | `canoe-dusk-silhouette` | `CC2A8728.jpg` |
| frame-05 | `canoes-water-hyacinths` | `CC2A0134.jpg` |
| frame-06 | `jungle-canopy-vertical` | `CC2A5184.jpg` |
| frame-07 | `buttress-roots-closeup` | `CC2A6056.jpg` |
| frame-08 | `yellow-tree-frog` | `CC2A9805.jpg` |
| frame-09 | `howler-monkey-portrait` | `CC2A0442.jpg` |
| frame-10 | `squirrel-monkey-branch` | `CC2A0551.jpg` |
| frame-11 | `hoatzin-perched` | `CC2A6358.jpg` |
| frame-12 | `kingfisher-amazon` | `CC2A4344.jpg` |
| frame-13 | `trogon-red-black` | `CC2A5494.jpg` |
| frame-14 | `heron-golden-light` | `CC2A6998.jpg` |
| frame-15 | `spider-closeup-eyes` | `CC2A1030.jpg` |
| frame-16 | `boy-canoe-bw` | `CC2A0036.jpg` |
| frame-17 | `family-stilt-house-window` | `CC2A3875.jpg` |
| frame-18 | `children-football-field` | `CC2A1085.jpg` |
| frame-19 | `two-canoe-bw` | `CC2A4844.jpg` |
| frame-20 | `woman-heart-invitation` | `IMG_9302.jpg` |

Each frame block should look like this after the edit (frame-01 example):

```json
{
  "id": "frame-01",
  "image_src": "aerial-amazon-river",
  "image_filename": "dji_fly_20260228_131208_0599_1772316094210_photo.jpg",
  "layers": [
```

- [ ] **Step 2: Verify — count occurrences**

Run:
```bash
grep -c '"image_filename"' "frameforge/data/test-projects/amazon/the-amazon.json"
```
Expected: `20`

- [ ] **Step 3: Commit**

```bash
git add frameforge/data/test-projects/amazon/the-amazon.json
git commit -m "feat: add image_filename to all amazon frames"
```

---

## Task 2: Add `_autoAssignImages()` to `project.js`

**Files:**
- Modify: `frameforge/modules/project.js`

Three changes in this file: new method, updated `addImages()`, updated `load()`.

- [ ] **Step 1: Add `_autoAssignImages()` after `_preloadStoredImages()`**

In `project.js`, after the closing `}` of `_preloadStoredImages()` (around line 172), insert:

```js
/**
 * Auto-assign images to frames using image_filename from JSON.
 * Silently assigns frames with no existing assignment.
 * Returns conflicts where an existing manual assignment differs from image_filename.
 *
 * @returns {{
 *   assigned: number[],
 *   conflicts: Array<{frameIndex: number, frameId: string, currentKey: string, newKey: string}>
 * }}
 */
_autoAssignImages() {
  const assigned  = [];
  const conflicts = [];

  if (!this.data) return { assigned, conflicts };

  this.data.frames.forEach((frame, frameIndex) => {
    const filename = frame.image_filename;
    if (!filename) return;                                     // no mapping → skip
    const img = this.imageElements.get(filename);
    if (!img) return;                                         // not loaded or failed → skip

    const currentKey = this.imageAssignments.get(frameIndex); // undefined if unset

    if (currentKey === undefined) {
      // No existing assignment → auto-assign silently
      this.assignImage(frameIndex, filename);
      assigned.push(frameIndex);
    } else if (currentKey !== filename) {
      // Different existing assignment → collect as conflict
      conflicts.push({ frameIndex, frameId: frame.id, currentKey, newKey: filename });
    }
    // currentKey === filename → already correct, skip
  });

  return { assigned, conflicts };
}
```

- [ ] **Step 2: Update `addImages()` — call `_autoAssignImages()` and return its results**

Replace the existing `addImages()` method (lines 86–107) with:

```js
/**
 * Merge new image files into the project, then run auto-assignment.
 * @param {Object.<string, string>} newImages — filename → dataURL
 * @returns {Promise<{
 *   matched: string[],
 *   storageFailed: string[],
 *   assigned: number[],
 *   conflicts: Array<{frameIndex: number, frameId: string, currentKey: string, newKey: string}>
 * }>}
 */
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

  const storageFailed = storage.saveImages(this.id, newImages);

  await Promise.all(toLoad.map(({ filename, dataURL }) =>
    this._loadImageElement(filename, dataURL)
  ));

  const { assigned, conflicts } = this._autoAssignImages();
  return { matched, storageFailed, assigned, conflicts };
}
```

- [ ] **Step 3: Update `_isImageReferenced()` — check `image_filename` too**

Replace the existing `_isImageReferenced()` method (lines 152–162) with:

```js
/**
 * Check if a filename is referenced anywhere in the project.
 * Checks image_filename (raw file) and image_src/src (labels, for legacy).
 * @param {string} filename
 * @returns {boolean}
 */
_isImageReferenced(filename) {
  if (!this.data) return false;
  for (const frame of this.data.frames) {
    if (frame.image_filename === filename) return true;
    if (frame.image_src === filename)      return true;
    if (frame.logo?.src === filename)      return true;
    for (const layer of (frame.layers || [])) {
      if (layer.src === filename) return true;
    }
  }
  return false;
}
```

- [ ] **Step 4: Update `load()` — call `_autoAssignImages()` and return results**

Replace the existing `load()` method (lines 51–70) with:

```js
/**
 * Load a project from parsed JSON data.
 * @param {object} data
 * @returns {Promise<{
 *   assigned: number[],
 *   conflicts: Array<{frameIndex: number, frameId: string, currentKey: string, newKey: string}>
 * }>}
 */
async load(data) {
  this.data = data;
  this.id   = data.project.id;
  this.activeFrameIndex = 0;
  this.isDirty = false;
  this.imageElements.clear();

  // Load stored images from localStorage
  this.imageMap = storage.loadImages(this.id);

  // Pre-load image elements for all stored images
  await this._preloadStoredImages();

  // Restore manual assignments
  const storedAssignments = storage.loadAssignments(this.id);
  this.imageAssignments.clear();
  for (const [k, v] of Object.entries(storedAssignments)) {
    this.imageAssignments.set(Number(k), v);
  }

  // Auto-assign using image_filename where possible
  return this._autoAssignImages();
}
```

- [ ] **Step 5: Commit**

```bash
git add frameforge/modules/project.js
git commit -m "feat: add _autoAssignImages to project.js"
```

---

## Task 3: Create `assignment-conflict-modal.js`

**Files:**
- Create: `frameforge/ui/assignment-conflict-modal.js`

- [ ] **Step 1: Create the file**

```js
/**
 * assignment-conflict-modal.js — Conflict resolution for image auto-assignment.
 *
 * Shows when auto-assignment would override an existing manual assignment.
 * Returns a Promise resolving to Map<frameIndex, 'replace'|'keep'>.
 */

/**
 * @typedef {{ frameIndex: number, frameId: string, currentKey: string, newKey: string }} Conflict
 */

/**
 * Show the conflict resolution modal.
 * @param {Conflict[]} conflicts
 * @returns {Promise<Map<number, 'replace'|'keep'>>}
 */
export function showAssignmentConflictModal(conflicts) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '560px';

    // ── Header ────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<span class="modal-title">Image Assignment Conflicts</span>`;

    // ── Body ──────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'modal-body';

    const desc = document.createElement('p');
    desc.textContent = 'These frames already have a manual assignment. Select which ones to replace with the JSON mapping.';
    body.appendChild(desc);

    // Bulk action row
    const bulkRow = document.createElement('div');
    bulkRow.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';

    const btnReplaceAll = document.createElement('button');
    btnReplaceAll.className = 'btn btn-secondary';
    btnReplaceAll.textContent = 'Replace All';

    const btnLeaveAll = document.createElement('button');
    btnLeaveAll.className = 'btn btn-secondary';
    btnLeaveAll.textContent = 'Leave All';

    bulkRow.appendChild(btnReplaceAll);
    bulkRow.appendChild(btnLeaveAll);
    body.appendChild(bulkRow);

    // Conflict table
    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--font-size-sm)';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="color:var(--color-text-secondary);text-align:left;border-bottom:1px solid var(--color-border)">
        <th style="padding:6px 8px;font-weight:500">Frame</th>
        <th style="padding:6px 8px;font-weight:500">Current</th>
        <th style="padding:6px 8px;font-weight:500">→ New</th>
        <th style="padding:6px 8px;font-weight:500;text-align:center">Replace?</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    /** @type {Map<number, HTMLInputElement>} frameIndex → checkbox */
    const checkboxes = new Map();

    for (const c of conflicts) {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid var(--color-border)';

      const trunc = (s) => s.length > 28 ? s.slice(0, 26) + '\u2026' : s;

      const cb = document.createElement('input');
      cb.type    = 'checkbox';
      cb.checked = true;
      checkboxes.set(c.frameIndex, cb);

      const tdFrame   = document.createElement('td');
      const tdCurrent = document.createElement('td');
      const tdNew     = document.createElement('td');
      const tdCheck   = document.createElement('td');

      tdFrame.style.padding   = '7px 8px';
      tdCurrent.style.cssText = 'padding:7px 8px;color:var(--color-text-secondary)';
      tdNew.style.cssText     = 'padding:7px 8px;color:var(--color-text-secondary)';
      tdCheck.style.cssText   = 'padding:7px 8px;text-align:center';

      tdFrame.textContent   = c.frameId;
      tdCurrent.textContent = trunc(c.currentKey);
      tdCurrent.title       = c.currentKey;
      tdNew.textContent     = trunc(c.newKey);
      tdNew.title           = c.newKey;
      tdCheck.appendChild(cb);

      row.appendChild(tdFrame);
      row.appendChild(tdCurrent);
      row.appendChild(tdNew);
      row.appendChild(tdCheck);
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    body.appendChild(table);

    // ── Footer ────────────────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const btnApply = document.createElement('button');
    btnApply.className = 'btn btn-primary';
    btnApply.textContent = 'Apply';
    footer.appendChild(btnApply);

    // ── Event handlers ────────────────────────────────────────────────────
    btnReplaceAll.addEventListener('click', () => {
      checkboxes.forEach((cb) => { cb.checked = true; });
    });

    btnLeaveAll.addEventListener('click', () => {
      checkboxes.forEach((cb) => { cb.checked = false; });
    });

    btnApply.addEventListener('click', () => {
      const result = new Map();
      checkboxes.forEach((cb, frameIndex) => {
        result.set(frameIndex, cb.checked ? 'replace' : 'keep');
      });
      document.body.removeChild(backdrop);
      resolve(result);
    });

    // ── Assemble ──────────────────────────────────────────────────────────
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frameforge/ui/assignment-conflict-modal.js
git commit -m "feat: add assignment-conflict-modal"
```

---

## Task 4: Wire up auto-assignment in `app.js`

**Files:**
- Modify: `frameforge/app.js`

Three changes: import, update `loadProjectData()`, update `handleImageFiles()`.

- [ ] **Step 1: Add import at top of `app.js`**

After the existing import block (after line ~31), add:

```js
import { showAssignmentConflictModal } from './ui/assignment-conflict-modal.js';
```

- [ ] **Step 2: Update `loadProjectData()` — capture load result and handle conflicts**

In `loadProjectData()`, replace:

```js
    // Load project
    await project.load(data);
```

With:

```js
    // Load project — returns auto-assignment results from stored images
    const { assigned: autoAssigned, conflicts: autoConflicts } = await project.load(data);

    // Resolve conflicts with existing manual assignments before building UI
    let loadReplacedCount = 0;
    if (autoConflicts.length > 0) {
      const decisions = await showAssignmentConflictModal(autoConflicts);
      decisions.forEach((action, frameIndex) => {
        if (action === 'replace') {
          const conflict = autoConflicts.find((c) => c.frameIndex === frameIndex);
          project.assignImage(frameIndex, conflict.newKey);
          loadReplacedCount++;
        }
      });
    }
```

Then, near the bottom of `loadProjectData()`, replace the existing status line:

```js
    status.ready(`Project loaded: ${data.project.title}${warnMsg}`);
```

With:

```js
    const totalAutoAssigned = autoAssigned.length + loadReplacedCount;
    const autoMsg = totalAutoAssigned > 0 ? ` — ${totalAutoAssigned} frame(s) auto-assigned` : '';
    status.ready(`Project loaded: ${data.project.title}${warnMsg}${autoMsg}`);
```

- [ ] **Step 3: Update `handleImageFiles()` — capture addImages result and handle conflicts**

In `handleImageFiles()`, replace:

```js
    const { matched, storageFailed } = await project.addImages(imageMap);

    const total  = Object.keys(imageMap).length;
    const msg    = `Loaded ${total} image(s), ${matched.length} matched`;
    status.ready(msg);
    toasts.success('Images Loaded', msg);
```

With:

```js
    const { matched, storageFailed, assigned, conflicts } = await project.addImages(imageMap);

    // Resolve conflicts with existing manual assignments
    let replacedCount = 0;
    if (conflicts.length > 0) {
      const decisions = await showAssignmentConflictModal(conflicts);
      decisions.forEach((action, frameIndex) => {
        if (action === 'replace') {
          const conflict = conflicts.find((c) => c.frameIndex === frameIndex);
          project.assignImage(frameIndex, conflict.newKey);
          replacedCount++;
        }
      });
    }

    const total        = Object.keys(imageMap).length;
    const autoCount    = assigned.length + replacedCount;
    const keptCount    = conflicts.length - replacedCount;
    let msg = `Loaded ${total} image(s)`;
    if (autoCount > 0) msg += `, ${autoCount} auto-assigned`;
    if (keptCount > 0) msg += `, ${keptCount} kept manual`;
    status.ready(msg);
    toasts.success('Images Loaded', msg);
```

- [ ] **Step 4: Verify in browser**

1. Open `http://127.0.0.1:5500/frameforge/index.html`
2. Load `frameforge/data/test-projects/amazon/the-amazon.json`
3. Load images from `frameforge/data/test-projects/amazon/images/`
4. Expected: images auto-assign to frames without any drag. Filmstrip thumbnails update. Status bar shows `X auto-assigned`.
5. Reload the page, load the JSON again — images should re-assign automatically from localStorage (no modal, no drag needed).

- [ ] **Step 5: Test conflict path**

1. Load JSON + images (auto-assign runs)
2. Manually drag a different image onto frame-01
3. Reload the page
4. Load the JSON again
5. Expected: conflict modal appears showing frame-01. "Replace" restores the JSON mapping. "Leave All" keeps your manual drag.

- [ ] **Step 6: Commit**

```bash
git add frameforge/app.js
git commit -m "feat: wire auto-assignment and conflict modal in app.js"
```

---

## Task 5: Update `ai-manual-content.js` — frame schema docs

**Files:**
- Modify: `frameforge/data/ai-manual-content.js`

- [ ] **Step 1: Add `image_filename` to the frames section**

Find this block (around line 179–187):

```js
### frames
Array of frame objects. \`image_src\` is a descriptive label — NOT a filename:
\`\`\`json
{
  "id": "frame-01",
  "image_src": "hero-landscape",
  "layers": [ ... ]
}
\`\`\`
```

Replace with:

```js
### frames
Array of frame objects. \`image_src\` is a descriptive label — NOT a filename:
\`\`\`json
{
  "id": "frame-01",
  "image_src": "hero-landscape",
  "image_filename": "actual-raw-filename.jpg",
  "layers": [ ... ]
}
\`\`\`

- \`image_src\` — descriptive slug label used by agent-preview and all downstream agents. Never a real filename.
- \`image_filename\` — the actual raw source file (e.g. \`CC2A1369.jpg\`). Written by the Technical Producer from the image map. Used by the FrameForge UI to auto-assign images when files are loaded. Omit if unknown — auto-assignment will simply be skipped for that frame.
```

- [ ] **Step 2: Commit**

```bash
git add frameforge/data/ai-manual-content.js
git commit -m "docs: add image_filename to ai-manual frame schema"
```

---

## Task 6: Update Technical Producer skill

**Files:**
- Modify: `.claude/skills/frameforge-technical-producer/SKILL.md`

- [ ] **Step 1: Add `image_filename` instruction to the "Project JSON" section**

Find this paragraph in the "Project JSON" section:

```
- Use the descriptive `image_src` labels from `concept-template.md` — never raw filenames
```

Replace with:

```
- Use the descriptive `image_src` labels from `concept-template.md` — never raw filenames
- For each frame, also write `image_filename`: the exact raw filename from `[IMAGE_MAP_PATH]` for that frame's image. Look up the image number in the map and copy the filename exactly — no invented names, no blanks. This field enables auto-assignment in the FrameForge UI.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/frameforge-technical-producer/SKILL.md
git commit -m "feat: instruct technical-producer to write image_filename per frame"
```

---

## Task 7: Update `test-projects/README.md` Step 5

**Files:**
- Modify: `frameforge/data/test-projects/README.md`

- [ ] **Step 1: Add one sentence to Step 5 approval gate**

Find the approval gate text at the bottom of Step 5:

```
**Approval gate:** Present the JSON for a spot-check — confirm frame count, sequence, and that copy matches the approved template. Wait for approval before dispatching Step 6.
```

Replace with:

```
**Approval gate:** Present the JSON for a spot-check — confirm frame count, sequence, that copy matches the approved template, and that every frame has an `image_filename` field. The `image_filename` field is what enables auto-assignment when images are loaded in the UI — a frame without it requires manual drag. Wait for approval before dispatching Step 6.
```

- [ ] **Step 2: Commit**

```bash
git add frameforge/data/test-projects/README.md
git commit -m "docs: note image_filename requirement in Step 5 approval gate"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Add `image_filename` to JSON schema | Task 1 + Task 5 |
| `_autoAssignImages()` returns `assigned` + `conflicts` | Task 2 |
| Auto-assign silently on `addImages()` | Task 2 step 2 |
| Auto-assign silently on `load()` | Task 2 step 4 |
| Conflict modal with table + bulk actions + Apply | Task 3 |
| Modal defaults rows to "replace" | Task 3 step 1 (cb.checked = true) |
| Modal returns `Promise<Map<frameIndex, 'replace'\|'keep'>>` | Task 3 step 1 |
| `app.js` — conflicts after JSON load | Task 4 step 2 |
| `app.js` — conflicts after image load | Task 4 step 3 |
| `app.js` — toast shows auto-assigned count | Task 4 steps 2–3 |
| Technical Producer skill updated | Task 6 |
| README Step 5 updated | Task 7 |
| Stage Manager unchanged | ✓ not in file map |

All spec requirements covered. No placeholders. Type names consistent across all tasks (`Conflict`, `assigned`, `conflicts`, `frameIndex`, `currentKey`, `newKey`).
