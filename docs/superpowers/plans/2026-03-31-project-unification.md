# Project Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify "Briefs" and "Projects" into one concept where the brief ID is the canonical storage key for everything (JSON layout, images, assignments), rename all "Brief/Briefs" labels to "Project/Projects" in the UI, add a smart JSON-load flow with per-frame review, and unify the clear/delete path.

**Architecture:** Brief ID becomes the project ID. `storage.saveProject(data, projectId)` accepts the brief ID as the storage key. `project.load(data, projectId)` uses that ID for all storage operations. A smart `handleJSONFile` flow prompts the user to select/create a project if none is active, and shows a per-frame review modal when loading would replace an existing layout.

**Tech Stack:** Vanilla JS ES modules, browser DOM, localStorage, IndexedDB (via existing storage.js).

---

## File Map

| File | Action |
|------|--------|
| `frameforge/modules/storage.js` | Modify — `saveProject(data, projectId)`, `deleteLayoutData(id)`, `clearAssignments(id)` |
| `frameforge/modules/brief-storage.js` | Modify — add `hasLayout`, `setHasLayout`, `deleteProject` |
| `frameforge/modules/project.js` | Modify — `load(data, projectId)`, `save()` |
| `frameforge/ui/shell.js` | Modify — rename toolbar labels |
| `frameforge/ui/concept-builder.js` | Modify — rename user-visible "brief" labels |
| `frameforge/ui/brief-manager.js` | Modify — rename labels, status dot, async delete |
| `frameforge/ui/clear-projects-modal.js` | Modify — use `briefStorage.list()` |
| `frameforge/ui/project-select-modal.js` | Create — smart load project selection |
| `frameforge/ui/json-load-review-modal.js` | Create — per-frame review modal |
| `frameforge/app.js` | Modify — smart load flow, load guards, pass projectId |

---

### Task 1: Update `storage.js` — `saveProject`, `deleteLayoutData`, `clearAssignments`

**Files:**
- Modify: `frameforge/modules/storage.js`

No test runner exists. Verify manually in browser.

- [ ] **Step 1: Update `saveProject` to accept `projectId`**

Find in `frameforge/modules/storage.js`:
```js
export function saveProject(data) {
  const id = data.project.id;
  if (!id) throw new Error('Project has no id');

  try {
    localStorage.setItem(projectKey(id), JSON.stringify(data));
  } catch (e) {
    throw new Error(`Failed to save project (storage quota?): ${e.message}`);
  }

  // Update index
  const index = loadProjectIndex();
  const existing = index.findIndex((e) => e.id === id);
  const entry = {
    id,
    title:   data.project.title || id,
    created: data.project.created || new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  if (existing >= 0) {
    index[existing] = entry;
  } else {
    index.push(entry);
  }
  saveProjectIndex(index);
}
```

Replace with:
```js
export function saveProject(data, projectId) {
  if (!projectId) throw new Error('projectId is required');
  try {
    localStorage.setItem(projectKey(projectId), JSON.stringify(data));
  } catch (e) {
    throw new Error(`Failed to save project (storage quota?): ${e.message}`);
  }
  // Index is now managed by brief-storage.js — do not update frameforge_projects index here.
}
```

- [ ] **Step 2: Add `deleteLayoutData` and `clearAssignments` exports**

After `saveProject`, add:
```js
/**
 * Remove stored layout JSON for a project.
 * @param {string} projectId
 */
export function deleteLayoutData(projectId) {
  localStorage.removeItem(projectKey(projectId));
}

/**
 * Remove stored frame-image assignments for a project.
 * @param {string} projectId
 */
export function clearAssignments(projectId) {
  localStorage.removeItem(assignmentsKey(projectId));
}
```

- [ ] **Step 3: Slim down `deleteProject` (brief-storage now owns the index)**

Find:
```js
export async function deleteProject(id) {
  localStorage.removeItem(projectKey(id));
  localStorage.removeItem(assignmentsKey(id));
  await clearImages(id);

  const index = loadProjectIndex().filter((e) => e.id !== id);
  saveProjectIndex(index);
}
```

Replace with:
```js
export async function deleteProject(id) {
  deleteLayoutData(id);
  clearAssignments(id);
  await clearImages(id);
}
```

- [ ] **Step 4: Commit**

```bash
git add frameforge/modules/storage.js
git commit -m "refactor: saveProject accepts projectId, add deleteLayoutData + clearAssignments"
```

---

### Task 2: Update `brief-storage.js` — `hasLayout`, `setHasLayout`, `deleteProject`

**Files:**
- Modify: `frameforge/modules/brief-storage.js`

- [ ] **Step 1: Add storage import at top of file**

Find the top of `frameforge/modules/brief-storage.js`:
```js
const PREFIX    = 'frameforge';
```

Add before it:
```js
import * as storage from './storage.js';
```

- [ ] **Step 2: Add `hasLayout` to index entry in `save()`**

Find in `save()`:
```js
  const entry = {
    id:         brief.id,
    title:      brief.title      || '(untitled)',
    slug:       brief.slug       || '',
    platform:   brief.platform   || '',
    imageCount: brief.imageCount ?? 0,
    created:    brief.created,
    updated:    brief.updated,
  };
```

Replace with:
```js
  const entry = {
    id:         brief.id,
    title:      brief.title      || '(untitled)',
    slug:       brief.slug       || '',
    platform:   brief.platform   || '',
    imageCount: brief.imageCount ?? 0,
    hasLayout:  brief.hasLayout  ?? false,
    created:    brief.created,
    updated:    brief.updated,
  };
```

- [ ] **Step 3: Add `setHasLayout` export after `remove`**

After the `remove` function, add:
```js
/**
 * Update the hasLayout flag for a project.
 * @param {string} id
 * @param {boolean} value
 */
export function setHasLayout(id, value) {
  const index = loadIndex();
  const entry = index.find((e) => e.id === id);
  if (!entry) return;
  entry.hasLayout = value;
  saveIndex(index);
}

/**
 * Delete a project completely — brief entry, layout JSON, images, assignments.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteProject(id) {
  remove(id);
  storage.deleteLayoutData(id);
  storage.clearAssignments(id);
  await storage.clearImages(id);
}
```

- [ ] **Step 4: Commit**

```bash
git add frameforge/modules/brief-storage.js
git commit -m "feat: add hasLayout, setHasLayout, deleteProject to brief-storage"
```

---

### Task 3: Update `project.js` — `load(data, projectId)` and `save()`

**Files:**
- Modify: `frameforge/modules/project.js`

- [ ] **Step 1: Update `load` signature and id assignment**

Find:
```js
  async load(data) {
    this.data = data;
    this.id   = data.project.id;
```

Replace with:
```js
  async load(data, projectId) {
    this.data = data;
    this.id   = projectId;
```

- [ ] **Step 2: Update `save()` to pass `this.id` to `saveProject`**

Find:
```js
  save() {
    if (!this.data) return;
    storage.saveProject(this.data);
    this.isDirty = false;
  }
```

Replace with:
```js
  save() {
    if (!this.data) return;
    storage.saveProject(this.data, this.id);
    this.isDirty = false;
  }
```

- [ ] **Step 3: Verify in browser — load a JSON, check localStorage**

Open `frameforge/index.html`. Load a project JSON while a brief is active. Open DevTools → Application → LocalStorage. Verify the project data is stored under `frameforge_project_{briefId}` (brief's ID, not the JSON's internal `project.id`).

- [ ] **Step 4: Commit**

```bash
git add frameforge/modules/project.js
git commit -m "refactor: project.load accepts projectId as canonical storage key"
```

---

### Task 4: Rename toolbar labels in `shell.js`

**Files:**
- Modify: `frameforge/ui/shell.js`

- [ ] **Step 1: Rename "New Brief" button**

Find in `frameforge/ui/shell.js`:
```html
    <button class="btn btn-secondary" id="btn-new-project" title="Create a new project brief for AI generation">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
      </svg>
      New Brief
    </button>
```

Replace with:
```html
    <button class="btn btn-secondary" id="btn-new-project" title="Create a new project">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
      </svg>
      New Project
    </button>
```

- [ ] **Step 2: Rename "My Briefs" button**

Find:
```html
    <button class="btn btn-ghost" id="btn-my-briefs" title="Browse and manage your saved briefs">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
      </svg>
      My Briefs
    </button>
```

Replace with:
```html
    <button class="btn btn-ghost" id="btn-my-briefs" title="Browse and manage your projects">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
      </svg>
      My Projects
    </button>
```

- [ ] **Step 3: Commit**

```bash
git add frameforge/ui/shell.js
git commit -m "feat: rename Brief/Briefs to Project/Projects in toolbar"
```

---

### Task 5: Rename user-visible labels in `concept-builder.js`

**Files:**
- Modify: `frameforge/ui/concept-builder.js`

- [ ] **Step 1: Find all user-visible "brief" text**

Run:
```bash
grep -in "brief" frameforge/ui/concept-builder.js
```

Review the output. Look for lines containing user-visible text — button labels (innerHTML/textContent), headings, tooltip titles, placeholder attributes, aria-labels. Ignore lines that are comments, variable names, function names, or internal logic.

- [ ] **Step 2: Replace all user-visible "brief"/"briefs" with "project"/"projects"**

For each line identified in Step 1 that contains user-visible text:
- `"brief"` (lowercase, user-visible) → `"project"`
- `"Brief"` (capitalized, user-visible) → `"Project"`
- `"briefs"` → `"projects"`
- `"Briefs"` → `"Projects"`
- `"a brief"` → `"a project"`
- `"my briefs"` / `"My Briefs"` → `"my projects"` / `"My Projects"`

Do NOT rename JavaScript identifiers, function names, variable names, CSS class names, or HTML IDs. Only rename text that appears in the rendered UI.

- [ ] **Step 3: Verify in browser**

Open ConceptBuilder by clicking "New Project". Check all visible text — no "brief" or "Brief" should appear to the user.

- [ ] **Step 4: Commit**

```bash
git add frameforge/ui/concept-builder.js
git commit -m "feat: rename user-visible Brief/Briefs to Project/Projects in concept-builder"
```

---

### Task 6: Update `brief-manager.js` — rename labels, status dot, async delete

**Files:**
- Modify: `frameforge/ui/brief-manager.js`

- [ ] **Step 1: Rename panel labels**

Make these exact replacements in `frameforge/ui/brief-manager.js`:

Replace `aria-label="My Briefs"` with `aria-label="My Projects"`.

Replace:
```js
          <span class="bm-header-title">My Briefs</span>
```
With:
```js
          <span class="bm-header-title">My Projects</span>
```

Replace `placeholder="Search briefs…"` with `placeholder="Search projects…"`.

Replace:
```js
            <div class="bm-active-hint">Double-click to set active</div>
```
With:
```js
            <div class="bm-active-hint">Double-click to set active project</div>
```

Replace:
```js
              <button class="btn btn-secondary btn-sm" id="bm-new">+ New Brief</button>
```
With:
```js
              <button class="btn btn-secondary btn-sm" id="bm-new">+ New Project</button>
```

Also replace the empty state text. Find any `"No briefs"` or `"first brief"` strings in the file:
```bash
grep -n "brief\|Brief" frameforge/ui/brief-manager.js
```
Replace each user-visible occurrence with the "project" equivalent.

- [ ] **Step 2: Add `hasLayout` status dot to list items**

Find `_renderListItems()` in `brief-manager.js`. Locate where each list item's title is rendered. The list item HTML renders the brief title — add a status dot after it.

Find the line that renders the item title (look for `escHtml(b.title)` or similar in the list item template). After the title, add:
```html
<span class="bm-layout-dot" title="${b.hasLayout ? 'Layout loaded' : 'No layout'}">${b.hasLayout ? '●' : '○'}</span>
```

The exact surrounding context depends on the template — read the `_renderListItems` method to find where `b.title` is rendered and add the span after it.

- [ ] **Step 3: Update delete handler to use async `deleteProject`**

Find (around line 365):
```js
    b.querySelector('#bm-delete-confirm-yes')?.addEventListener('click', () => {
      const wasActive = this._selectedId === this._activeBriefId;
      this._storage.remove(this._selectedId);
      this._selectedId      = null;
      this._deleteConfirmId = null;
      if (wasActive) {
        this._activeBriefId = null;
        this._onActiveBriefChange?.(null, null);
      }
      this._refreshList();
      this._refreshDetail();
    });
```

Replace with:
```js
    b.querySelector('#bm-delete-confirm-yes')?.addEventListener('click', async () => {
      const wasActive  = this._selectedId === this._activeBriefId;
      const deletedId  = this._selectedId;
      await this._storage.deleteProject(this._selectedId);
      this._selectedId      = null;
      this._deleteConfirmId = null;
      if (wasActive) {
        this._activeBriefId = null;
        this._onActiveBriefChange?.(null, null, deletedId);
      }
      this._refreshList();
      this._refreshDetail();
    });
```

Note: `deletedId` is passed as the third argument to `_onActiveBriefChange` so `app.js` can detect whether the currently loaded project was deleted and reset the app state.

- [ ] **Step 4: Verify in browser**

Open "My Projects" panel. Confirm:
- Panel title is "My Projects"
- Search placeholder is "Search projects…"
- Each project row shows `●` (filled) if it has a layout or `○` (empty) if not
- Deleting a project removes it from the list and clears images/assignments

- [ ] **Step 5: Commit**

```bash
git add frameforge/ui/brief-manager.js
git commit -m "feat: rename to My Projects, add layout status dot, async delete"
```

---

### Task 7: Update `clear-projects-modal.js` — use `briefStorage.list()`

**Files:**
- Modify: `frameforge/ui/clear-projects-modal.js`

Context: `clear-projects-modal.js` is called from `app.js`'s `doClearProject`. It currently gets its data from `storage.loadProjectIndex()`. In the unified model it should use `briefStorage.list()` because briefs are now the project index.

This change happens in `app.js` (where the modal is called), not in the modal file itself — the modal just receives a `projects` array. See Task 10 for the `doClearProject` update.

However, the modal's `deleteProject` call also needs updating. The modal itself calls `storage.deleteProject(id)` for each selected ID. In the unified model it should call `briefStorage.deleteProject(id)`.

- [ ] **Step 1: Read `clear-projects-modal.js` to find the delete call**

Read `frameforge/ui/clear-projects-modal.js`. The delete calls are in `app.js`'s `doClearProject`, not in the modal file. The modal only returns selected IDs. Confirm the modal file has no direct storage calls.

Expected: the modal file has no storage imports — it only resolves with an array of IDs.

- [ ] **Step 2: No changes needed to `clear-projects-modal.js`**

The modal is data-agnostic — it receives the project list and returns selected IDs. All storage operations happen in `app.js`. This task is a verification step — confirm the modal has no storage calls, then move on.

- [ ] **Step 3: Commit (verification only — no file change)**

If no changes were made (confirmed in Step 2), no commit needed. Move to Task 8.

---

### Task 8: Create `project-select-modal.js`

**Files:**
- Create: `frameforge/ui/project-select-modal.js`

This modal appears when loading a JSON or images with no active project. It lets the user select an existing project or trigger project creation.

- [ ] **Step 1: Create the file**

Create `frameforge/ui/project-select-modal.js`:

```js
/**
 * project-select-modal.js — Smart load project selection.
 *
 * Shown when loading a JSON or images with no active project.
 * Returns a Promise resolving to the user's choice.
 */

/**
 * @typedef {{ id: string, title: string, hasLayout: boolean, updated: string }} ProjectEntry
 * @typedef {{ action: 'select', projectId: string } | { action: 'create' } | { action: 'cancel' }} SelectResult
 */

/**
 * Show the project selection modal.
 * @param {ProjectEntry[]} projects — from briefStorage.list()
 * @param {object} [options]
 * @param {string} [options.message] — message shown above the list
 * @param {string|null} [options.suggestedId] — project ID to highlight as suggested match
 * @returns {Promise<SelectResult>}
 */
export function showProjectSelectModal(projects, { message = '', suggestedId = null } = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '480px';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'modal-title';
    titleEl.textContent = 'Select Project';

    const btnClose = document.createElement('button');
    btnClose.className = 'btn btn-ghost btn-icon';
    btnClose.setAttribute('aria-label', 'Close');
    btnClose.innerHTML = '&times;';
    btnClose.style.marginLeft = 'auto';

    header.appendChild(titleEl);
    header.appendChild(btnClose);

    // ── Body ────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'modal-body';

    if (message) {
      const msg = document.createElement('p');
      msg.style.cssText = 'margin-bottom:12px;color:var(--color-text-secondary);font-size:var(--font-size-sm)';
      msg.textContent = message;
      body.appendChild(msg);
    }

    /** @type {string|null} */
    let selectedId = suggestedId ?? (projects.length === 1 ? projects[0].id : null);

    if (projects.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No projects found. Create one first.';
      empty.style.color = 'var(--color-text-secondary)';
      body.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:4px;max-height:240px;overflow-y:auto;';

      const trunc = (s, n = 40) => s && s.length > n ? s.slice(0, n - 1) + '\u2026' : (s ?? '');

      for (const p of projects) {
        const row = document.createElement('button');
        row.className = 'btn btn-ghost';
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;text-align:left;padding:8px 10px;border-radius:4px;width:100%;';
        row.dataset.id = p.id;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = trunc(p.title);
        nameSpan.style.flex = '1';

        const meta = document.createElement('span');
        meta.style.cssText = 'color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-left:8px;white-space:nowrap;';
        meta.textContent = p.hasLayout ? '● layout' : '○ no layout';

        row.appendChild(nameSpan);
        row.appendChild(meta);

        if (p.id === selectedId) {
          row.style.background = 'var(--color-accent-faint, rgba(255,255,255,0.08))';
          row.style.fontWeight = '600';
        }

        row.addEventListener('click', () => {
          selectedId = p.id;
          list.querySelectorAll('button[data-id]').forEach((b) => {
            b.style.background = b.dataset.id === selectedId ? 'var(--color-accent-faint, rgba(255,255,255,0.08))' : '';
            b.style.fontWeight  = b.dataset.id === selectedId ? '600' : '';
          });
          btnSelect.disabled = false;
        });

        list.appendChild(row);
      }

      body.appendChild(list);
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';

    const btnCreate = document.createElement('button');
    btnCreate.className = 'btn btn-secondary';
    btnCreate.textContent = '+ Create New Project';

    const btnSelect = document.createElement('button');
    btnSelect.className = 'btn btn-primary';
    btnSelect.textContent = 'Load into Project';
    btnSelect.disabled = selectedId === null;

    footer.appendChild(btnCreate);
    footer.appendChild(btnSelect);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function onKeyDown(e) {
      if (e.key === 'Escape') close({ action: 'cancel' });
    }

    function close(result) {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(result);
    }

    // ── Event handlers ───────────────────────────────────────────────────────
    btnClose.addEventListener('click', () => close({ action: 'cancel' }));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close({ action: 'cancel' }); });
    document.addEventListener('keydown', onKeyDown);

    btnCreate.addEventListener('click', () => close({ action: 'create' }));

    btnSelect.addEventListener('click', () => {
      if (selectedId) close({ action: 'select', projectId: selectedId });
    });

    // ── Assemble ─────────────────────────────────────────────────────────────
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    if (selectedId) {
      btnSelect.focus();
    } else {
      btnCreate.focus();
    }
  });
}
```

- [ ] **Step 2: Verify file exists**

```bash
ls frameforge/ui/project-select-modal.js
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add frameforge/ui/project-select-modal.js
git commit -m "feat: add project-select-modal for smart JSON/image load flow"
```

---

### Task 9: Create `json-load-review-modal.js`

**Files:**
- Create: `frameforge/ui/json-load-review-modal.js`

This modal appears when loading a JSON into a project that already has a layout. It shows per-frame diffs and lets the user select which frames to replace.

- [ ] **Step 1: Create the file**

Create `frameforge/ui/json-load-review-modal.js`:

```js
/**
 * json-load-review-modal.js — Per-frame review when replacing an existing layout.
 *
 * Compares incoming JSON frames against the currently loaded layout.
 * Returns a Set of frame IDs the user chose to replace.
 */

/**
 * @param {object} oldData — current project.data (existing layout)
 * @param {object} newData — incoming parsed JSON
 * @returns {Promise<Set<string>|null>} set of frame IDs to replace; null if cancelled
 */
export function showJsonLoadReviewModal(oldData, newData) {
  return new Promise((resolve) => {
    const changes = diffFrames(oldData, newData);

    if (changes.length === 0) {
      resolve(new Set());
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '640px';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'modal-title';
    titleEl.textContent = 'Review Layout Changes';

    const btnClose = document.createElement('button');
    btnClose.className = 'btn btn-ghost btn-icon';
    btnClose.setAttribute('aria-label', 'Close');
    btnClose.innerHTML = '&times;';
    btnClose.style.marginLeft = 'auto';

    header.appendChild(titleEl);
    header.appendChild(btnClose);

    // ── Body ────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'modal-body';

    const desc = document.createElement('p');
    desc.style.marginBottom = '12px';
    desc.textContent = `${changes.length} of ${newData.frames.length} frame(s) have changes. Select which frames to update.`;
    body.appendChild(desc);

    // Bulk row
    const bulkRow = document.createElement('div');
    bulkRow.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';

    const btnSelectAll = document.createElement('button');
    btnSelectAll.className = 'btn btn-secondary';
    btnSelectAll.textContent = 'Select All';

    const btnKeepAll = document.createElement('button');
    btnKeepAll.className = 'btn btn-secondary';
    btnKeepAll.textContent = 'Keep All';

    bulkRow.appendChild(btnSelectAll);
    bulkRow.appendChild(btnKeepAll);
    body.appendChild(bulkRow);

    // Table
    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--font-size-sm)';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="color:var(--color-text-secondary);text-align:left;border-bottom:1px solid var(--color-border)">
        <th style="padding:6px 8px;font-weight:500;width:80px">Frame</th>
        <th style="padding:6px 8px;font-weight:500;width:140px">Changes</th>
        <th style="padding:6px 8px;font-weight:500">Details</th>
        <th style="padding:6px 8px;font-weight:500;text-align:center;width:70px">Replace?</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    /** @type {Map<string, HTMLInputElement>} frameId → checkbox */
    const checkboxes = new Map();

    const trunc = (s, n = 28) => s && s.length > n ? s.slice(0, n - 1) + '\u2026' : (s ?? '');

    for (const c of changes) {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid var(--color-border)';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      checkboxes.set(c.frameId, cb);

      const tdFrame   = document.createElement('td');
      const tdCats    = document.createElement('td');
      const tdDetails = document.createElement('td');
      const tdCheck   = document.createElement('td');

      tdFrame.style.padding  = '7px 8px';
      tdCats.style.padding   = '7px 8px';
      tdDetails.style.cssText = 'padding:7px 8px;color:var(--color-text-secondary)';
      tdCheck.style.cssText  = 'padding:7px 8px;text-align:center';

      tdFrame.textContent = c.frameId;

      // Category badges
      for (const cat of c.categories) {
        const badge = document.createElement('span');
        badge.textContent = cat;
        badge.style.cssText = `
          display:inline-block;margin-right:4px;padding:1px 5px;border-radius:3px;
          font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;
          background:var(--color-border);color:var(--color-text-secondary);
        `;
        tdCats.appendChild(badge);
      }

      // Details
      const detailParts = [];
      if (c.details.image) {
        detailParts.push(`${trunc(c.details.image.from)} → ${trunc(c.details.image.to)}`);
      }
      if (c.details.copy && c.details.copy.length > 0) {
        const first = c.details.copy[0];
        let copyText = `"${trunc(first.from, 20)}" → "${trunc(first.to, 20)}"`;
        if (c.details.copy.length > 1) copyText += ` +${c.details.copy.length - 1} more`;
        detailParts.push(copyText);
      }
      if (c.details.content) {
        detailParts.push(c.details.content);
      }
      const detailStr = detailParts.join(' · ');
      tdDetails.textContent = trunc(detailStr, 60);
      tdDetails.title = detailStr;

      tdCheck.appendChild(cb);

      row.appendChild(tdFrame);
      row.appendChild(tdCats);
      row.appendChild(tdDetails);
      row.appendChild(tdCheck);
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    body.appendChild(table);

    // ── Footer ──────────────────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const btnApply = document.createElement('button');
    btnApply.className = 'btn btn-primary';
    btnApply.textContent = 'Apply';
    footer.appendChild(btnApply);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function onKeyDown(e) {
      if (e.key === 'Escape') close(null);
    }

    function close(result) {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(result);
    }

    // ── Event handlers ───────────────────────────────────────────────────────
    btnClose.addEventListener('click', () => close(null));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(null); });
    document.addEventListener('keydown', onKeyDown);

    btnSelectAll.addEventListener('click', () => {
      checkboxes.forEach((cb) => { cb.checked = true; });
    });

    btnKeepAll.addEventListener('click', () => {
      checkboxes.forEach((cb) => { cb.checked = false; });
    });

    btnApply.addEventListener('click', () => {
      const selected = new Set();
      checkboxes.forEach((cb, frameId) => { if (cb.checked) selected.add(frameId); });
      close(selected);
    });

    // ── Assemble ─────────────────────────────────────────────────────────────
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    btnApply.focus();
  });
}

// ── Frame diff algorithm ─────────────────────────────────────────────────────

/**
 * Compute per-frame changes between old and new layout data.
 * @param {object} oldData
 * @param {object} newData
 * @returns {Array<{frameId: string, categories: string[], details: object}>}
 */
function diffFrames(oldData, newData) {
  const result = [];

  for (const newFrame of (newData.frames ?? [])) {
    const oldFrame = (oldData.frames ?? []).find((f) => f.id === newFrame.id);

    if (!oldFrame) {
      result.push({
        frameId:    newFrame.id,
        categories: ['image', 'copy', 'content'],
        details:    { content: 'New frame' },
      });
      continue;
    }

    const categories = [];
    const details    = {};

    // Image changed?
    if (newFrame.image_src !== oldFrame.image_src ||
        newFrame.image_filename !== oldFrame.image_filename) {
      categories.push('image');
      details.image = { from: oldFrame.image_src ?? '', to: newFrame.image_src ?? '' };
    }

    // Copy changed? (text layers)
    const oldTextLayers = (oldFrame.layers  ?? []).filter((l) => l.type === 'text');
    const newTextLayers = (newFrame.layers  ?? []).filter((l) => l.type === 'text');
    const copyChanges   = [];
    for (const nl of newTextLayers) {
      const ol = oldTextLayers.find((l) => l.id === nl.id);
      if (!ol || ol.text !== nl.text) {
        copyChanges.push({ from: ol?.text ?? '', to: nl.text ?? '' });
      }
    }
    if (copyChanges.length > 0) {
      categories.push('copy');
      details.copy = copyChanges;
    }

    // Content changed? (layer count)
    const oldCount = (oldFrame.layers ?? []).length;
    const newCount = (newFrame.layers ?? []).length;
    if (oldCount !== newCount) {
      categories.push('content');
      const diff = newCount - oldCount;
      details.content = `${Math.abs(diff)} layer(s) ${diff > 0 ? 'added' : 'removed'}`;
    }

    if (categories.length > 0) {
      result.push({ frameId: newFrame.id, categories, details });
    }
  }

  return result;
}
```

- [ ] **Step 2: Verify file exists**

```bash
ls frameforge/ui/json-load-review-modal.js
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add frameforge/ui/json-load-review-modal.js
git commit -m "feat: add json-load-review-modal with per-frame diff and replace selection"
```

---

### Task 10: Update `app.js` — smart load flow, load guards, project ID plumbing

**Files:**
- Modify: `frameforge/app.js`

This is the integration task. Read the full `loadProjectData` and `handleJSONFile` functions before making any edits.

- [ ] **Step 1: Add imports**

Find the existing import block. It already has:
```js
import { showAssignmentConflictModal } from './ui/assignment-conflict-modal.js';
import { showClearProjectsModal } from './ui/clear-projects-modal.js';
```

Add immediately after:
```js
import { showProjectSelectModal } from './ui/project-select-modal.js';
import { showJsonLoadReviewModal } from './ui/json-load-review-modal.js';
```

- [ ] **Step 2: Rename `active_brief_id` → `active_project_id` in prefs references**

Search for all occurrences of `active_brief_id` in `app.js`:
```bash
grep -n "active_brief_id" frameforge/app.js
```

Replace every occurrence of `prefs.active_brief_id` with `prefs.active_project_id`.
Replace every occurrence of `active_brief_id` in `storage.savePrefs` calls.

Note: the localStorage key in `storage.js`'s `DEFAULT_PREFS` should also be updated — read `frameforge/modules/storage.js` and find `DEFAULT_PREFS`. Add `active_project_id: null` if not present; remove `active_brief_id` if present.

- [ ] **Step 3: Update `loadProjectData` signature and internals**

Find `async function loadProjectData(data, saveToStorage)` and its body. Replace the entire function with:

```js
  async function loadProjectData(data, saveToStorage, projectId) {
    // Clear any text selection from the previous project
    renderer.selectedLayerId = null;
    textToolbar.hide();
    shapeToolbar.hide();
    imageToolbar.hide();
    overlayToolbar.hide();
    hideOverlay(resizeOverlayEl);
    layersPanel.hide();

    // Capture in-memory images before (re)loading.
    // Handles: project switch (clear old images) and same-project reload (quota-exceeded images).
    const isSwitching = project.isLoaded && project.id && project.id !== projectId;
    const imagesToTransfer = project.isLoaded ? { ...project.imageMap } : {};

    if (isSwitching) {
      await storage.clearImages(project.id);
    }

    // Validate — include stored images under the incoming project ID
    const uploadedImages = new Set(Object.keys(project.imageMap ?? {}));
    if (projectId) {
      const storedImgs = await storage.loadImages(projectId);
      Object.keys(storedImgs).forEach((k) => uploadedImages.add(k));
    }

    validation = validateProject(data, uploadedImages);

    if (validation.errors.length > 0) {
      status.error(`Validation failed: ${validation.errors[0]}`);
      showValidationErrors(validation.errors, validation.warnings);
      return;
    }

    // Load project using brief ID as canonical storage key
    const { assigned: autoAssigned, conflicts: autoConflicts } = await project.load(data, projectId);

    // Mark brief as having a layout
    if (saveToStorage && projectId) {
      briefStorage.setHasLayout(projectId, true);
    }

    // Re-add images not already restored from storage
    if (Object.keys(imagesToTransfer).length > 0) {
      const missing = Object.fromEntries(
        Object.entries(imagesToTransfer).filter(([k]) => !project.imageMap[k])
      );
      if (Object.keys(missing).length > 0) {
        const { assigned: xAssigned, conflicts: xConflicts } = await project.addImages(missing);
        autoAssigned.push(...xAssigned);
        for (const c of xConflicts) {
          if (!autoConflicts.find((e) => e.frameIndex === c.frameIndex)) {
            autoConflicts.push(c);
          }
        }
      }
    }

    // Resolve conflicts with existing manual assignments before building UI
    let loadReplacedCount = 0;
    if (autoConflicts.length > 0) {
      const decisions = await showAssignmentConflictModal(autoConflicts);
      decisions.forEach((action, frameIndex) => {
        if (action === 'replace') {
          const conflict = autoConflicts.find((c) => c.frameIndex === frameIndex);
          if (!conflict) return;
          project.assignImage(frameIndex, conflict.newKey);
          loadReplacedCount++;
        }
      });
    }

    if (saveToStorage) {
      project.save();
    }

    filmstrip.build(project);
    renderer.renderFrame(project, 0);
    inspector.update(project);
    imageTray.build(project);

    // Show auto-assignment results in tray
    const allAssigned = [...autoAssigned];
    allAssigned.forEach((frameIndex) => {
      const key = project.imageAssignments.get(frameIndex);
      if (key) imageTray.showAssignment(key, frameIndex);
    });

    updateToolbarState(tb, true, project.frameCount > 0, false);
    if (tb.projectTitle) {
      tb.projectTitle.textContent = data.project?.title ?? '';
      tb.projectTitle.title = data.project?.title ?? '';
    }

    appState = AppState.LOADED;

    const assignedCount = autoAssigned.length + loadReplacedCount;
    let msg = 'Project loaded';
    if (assignedCount > 0) msg += ` — ${assignedCount} frame(s) auto-assigned`;
    status.ready(msg);
    toasts.success('Project Loaded', msg);
  }
```

Note: if the existing `loadProjectData` body is different in structure, preserve any additional logic (like `hideOverlay`, `showEmptyState` calls) — only change the `project.id` derivation, the `imagesToTransfer` isSwitching logic, and the `project.load` call.

- [ ] **Step 4: Update `handleJSONFile` with smart load flow**

Find `async function handleJSONFile(file)`. Replace its body after the JSON parse with:

```js
  async function handleJSONFile(file) {
    status.working(`Loading ${file.name}…`);
    let text;
    try {
      text = await readFileAsText(file);
    } catch (e) {
      status.error(`Failed to read file: ${e.message}`);
      toasts.error('File Read Error', e.message);
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      const msg = `JSON parse error: ${e.message}`;
      status.error(msg);
      toasts.error('Invalid JSON', msg);
      showJSONError(msg);
      return;
    }

    // Determine which project to load into
    let projectId = prefs.active_project_id ?? null;

    if (!projectId) {
      // No active project — show smart selection prompt
      const projects = briefStorage.list();
      if (projects.length === 0) {
        toasts.warning('No Projects', 'Create a project first, then load a JSON.');
        return;
      }

      const jsonTitle  = (data.project?.title ?? '').toLowerCase();
      const suggested  = projects.find((p) => p.title.toLowerCase() === jsonTitle);

      const result = await showProjectSelectModal(projects, {
        message:     suggested
          ? `This looks like "${suggested.title}". Load into it?`
          : 'Select a project to load this layout into, or create a new one.',
        suggestedId: suggested?.id ?? null,
      });

      if (result.action === 'cancel') {
        status.ready('Load cancelled.');
        return;
      }
      if (result.action === 'create') {
        // Open concept builder; user will load JSON after creating a project
        conceptBuilder.open((files) => handleImageFiles(files));
        toasts.info('Create a Project', 'Create your project, then load the JSON again.');
        return;
      }

      projectId = result.projectId;
      prefs.active_project_id = projectId;
      storage.savePrefs(prefs);
      const projectEntry = briefStorage.load(projectId);
      updateActiveBriefLabel(tb.activeBriefLabel, projectEntry?.title ?? '');
    }

    // Check if this project already has a layout — show per-frame review
    const projectEntry = briefStorage.load(projectId);
    if (projectEntry?.hasLayout) {
      const oldData = (project.isLoaded && project.id === projectId)
        ? project.data
        : storage.loadProject(projectId);

      if (oldData) {
        const frameIdsToReplace = await showJsonLoadReviewModal(oldData, data);
        if (frameIdsToReplace === null) {
          status.ready('Load cancelled.');
          return;
        }

        if (frameIdsToReplace.size === 0) {
          status.ready('No frames replaced.');
          return;
        }

        // Apply selected frame replacements
        if (!project.isLoaded || project.id !== projectId) {
          await project.load(oldData, projectId);
        }
        for (const frameId of frameIdsToReplace) {
          const newFrame    = data.frames.find((f) => f.id === frameId);
          const frameIndex  = project.data.frames.findIndex((f) => f.id === frameId);
          if (newFrame && frameIndex >= 0) {
            project.data.frames[frameIndex] = newFrame;
          }
        }
        project.isDirty = true;
        project.save();

        filmstrip.build(project);
        renderer.renderFrame(project, project.activeFrameIndex);
        inspector.update(project);
        const { assigned } = project._autoAssignImages();
        assigned.forEach((fi) => {
          const key = project.imageAssignments.get(fi);
          if (key) imageTray.showAssignment(key, fi);
        });

        status.ready(`${frameIdsToReplace.size} frame(s) updated.`);
        toasts.success('Layout Updated', `${frameIdsToReplace.size} frame(s) replaced.`);
        return;
      }
    }

    await loadProjectData(data, true, projectId);
  }
```

- [ ] **Step 5: Add load guard to `handleImageFiles`**

Find `async function handleImageFiles(files)`. At the top of the function, find:
```js
    if (!project.isLoaded) {
      toasts.warning('No project loaded', 'Load a JSON project first, then add images.');
      return;
    }
```

Replace with:
```js
    let activeProjectId = prefs.active_project_id ?? null;

    if (!activeProjectId) {
      const projects = briefStorage.list();
      if (projects.length === 0) {
        toasts.warning('No Projects', 'Create a project first, then load images.');
        return;
      }
      const result = await showProjectSelectModal(projects, {
        message: 'Select a project to load images into, or create a new one.',
      });
      if (result.action === 'cancel') return;
      if (result.action === 'create') {
        conceptBuilder.open((files) => handleImageFiles(files));
        return;
      }
      activeProjectId = result.projectId;
      prefs.active_project_id = activeProjectId;
      storage.savePrefs(prefs);
      const projectEntry = briefStorage.load(activeProjectId);
      updateActiveBriefLabel(tb.activeBriefLabel, projectEntry?.title ?? '');
    }

    if (!project.isLoaded) {
      toasts.warning('No layout loaded', 'Load a project JSON first, then add images.');
      return;
    }
```

- [ ] **Step 6: Update `doClearProject` to use `briefStorage.list()`**

Find `async function doClearProject()`. Update the line that loads projects:

Find:
```js
    const projects = storage.loadProjectIndex();
```

Replace with:
```js
    const projects = briefStorage.list();
```

And update the delete loop. Find:
```js
    for (const id of selectedIds) {
      await storage.deleteProject(id);
    }
```

Replace with:
```js
    for (const id of selectedIds) {
      await briefStorage.deleteProject(id);
      if (prefs.active_project_id === id) {
        prefs.active_project_id = undefined;
        storage.savePrefs(prefs);
        updateActiveBriefLabel(tb.activeBriefLabel, null);
      }
    }
```

- [ ] **Step 7: Update active project callback registration**

Find:
```js
  briefManager.setOnActiveBriefChange((id, title) => {
    prefs.active_brief_id = id ?? undefined;
    storage.savePrefs(prefs);
    updateActiveBriefLabel(tb.activeBriefLabel, title);
  });
```

Replace with:
```js
  briefManager.setOnActiveBriefChange((id, title, deletedId) => {
    prefs.active_project_id = id ?? undefined;
    storage.savePrefs(prefs);
    updateActiveBriefLabel(tb.activeBriefLabel, title);

    // If the deleted project was the currently loaded one, reset app state
    if (deletedId && project.isLoaded && project.id === deletedId) {
      project.clear();
      renderer.selectedLayerId = null;
      textToolbar.hide();
      shapeToolbar.hide();
      imageToolbar.hide();
      overlayToolbar.hide();
      layersPanel.hide();
      filmstrip.clear();
      inspector.clear();
      imageTray.clear();
      showEmptyState();
      updateToolbarState(tb, false, false, false);
      if (tb.projectTitle) tb.projectTitle.textContent = '';
      prefs.last_project_id = null;
      storage.savePrefs(prefs);
      appState = AppState.EMPTY;
    }
  });
```

- [ ] **Step 8: Update startup restore to use `active_project_id`**

Find the startup section (around line 705) that restores the active brief:
```js
  if (prefs.active_brief_id) {
    const activeBrief = briefStorage.load(prefs.active_brief_id);
    if (activeBrief) {
      updateActiveBriefLabel(tb.activeBriefLabel, activeBrief.title);
    } else {
      prefs.active_brief_id = undefined;
      storage.savePrefs(prefs);
    }
  }
```

Replace with:
```js
  if (prefs.active_project_id) {
    const activeProject = briefStorage.load(prefs.active_project_id);
    if (activeProject) {
      updateActiveBriefLabel(tb.activeBriefLabel, activeProject.title);
      // Restore layout if project has one saved
      if (activeProject.hasLayout) {
        const savedData = storage.loadProject(prefs.active_project_id);
        if (savedData) {
          await loadProjectData(savedData, false, prefs.active_project_id);
        }
      }
    } else {
      prefs.active_project_id = undefined;
      storage.savePrefs(prefs);
    }
  }
```

Note: if the existing startup code already loads the last project via `prefs.last_project_id`, remove or disable that block since `active_project_id` now covers this.

- [ ] **Step 9: Verify end-to-end in browser**

Open `frameforge/index.html`. Test these scenarios:

1. **No projects, load JSON** → toast "Create a project first"
2. **Projects exist, load JSON with matching title** → modal suggests correct project
3. **Projects exist, load JSON no match** → modal shows project list
4. **Load JSON into project with existing layout** → per-frame review modal appears
5. **Load images with no active project** → project select modal appears
6. **Open My Projects** → panel title is "My Projects", rows show `●`/`○` status
7. **Delete project from panel** → if it was loaded project, app resets to empty state
8. **Clear Projects button** → modal shows all projects from brief storage

- [ ] **Step 10: Commit**

```bash
git add frameforge/app.js
git commit -m "feat: smart JSON load flow, load guards, project ID plumbing, unified delete"
```
