# Clear Projects Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-project confirm dialog on the "Clear Project" button with a modal that lists all stored projects and lets the user select any combination to delete.

**Architecture:** A new `clear-projects-modal.js` follows the established modal pattern from `assignment-conflict-modal.js` — pure DOM, Promise-based, no framework. `doClearProject()` in `app.js` is rewritten to load the project index, open the modal, delete selected projects, and reset app state only if the active project was cleared.

**Tech Stack:** Vanilla JS ES modules, browser DOM, IndexedDB (via existing `storage.js`), existing CSS classes (`modal-backdrop`, `modal`, `btn`, `btn-danger`).

---

## File Map

| File | Action |
|------|--------|
| `frameforge/ui/clear-projects-modal.js` | **Create** — modal UI, exports `showClearProjectsModal` |
| `frameforge/app.js` | **Modify** — import `showClearProjectsModal`, rewrite `doClearProject` |

---

### Task 1: Create `clear-projects-modal.js`

**Files:**
- Create: `frameforge/ui/clear-projects-modal.js`

This is a vanilla JS browser app with no test runner. Verification is manual in the browser.

- [ ] **Step 1: Create the file with the full implementation**

Create `frameforge/ui/clear-projects-modal.js` with this exact content:

```js
/**
 * clear-projects-modal.js — Project storage cleanup modal.
 *
 * Lists all stored projects, lets the user select any combination to delete.
 * Returns a Promise resolving to the array of project IDs to delete.
 */

/**
 * @typedef {{ id: string, title: string, created: string, updated: string }} ProjectEntry
 */

/**
 * Show the clear projects modal.
 * @param {ProjectEntry[]} projects — all stored projects from storage.loadProjectIndex()
 * @param {string|null} activeProjectId — currently loaded project id, or null
 * @returns {Promise<string[]>} resolves with array of IDs to delete; [] if cancelled
 */
export function showClearProjectsModal(projects, activeProjectId) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '520px';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'modal-title';
    titleEl.textContent = 'Clear Projects';

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

    /** @type {Map<string, HTMLInputElement>} projectId → checkbox */
    const checkboxes = new Map();

    if (projects.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No saved projects.';
      empty.style.color = 'var(--color-text-secondary)';
      body.appendChild(empty);
    } else {
      // Bulk action row
      const bulkRow = document.createElement('div');
      bulkRow.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';

      const btnSelectAll = document.createElement('button');
      btnSelectAll.className = 'btn btn-secondary';
      btnSelectAll.textContent = 'Select All';

      const btnDeselectAll = document.createElement('button');
      btnDeselectAll.className = 'btn btn-secondary';
      btnDeselectAll.textContent = 'Deselect All';

      bulkRow.appendChild(btnSelectAll);
      bulkRow.appendChild(btnDeselectAll);
      body.appendChild(bulkRow);

      // Table
      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--font-size-sm)';

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="color:var(--color-text-secondary);text-align:left;border-bottom:1px solid var(--color-border)">
          <th style="padding:6px 8px;font-weight:500;text-align:center">☑</th>
          <th style="padding:6px 8px;font-weight:500">Title</th>
          <th style="padding:6px 8px;font-weight:500">Last updated</th>
        </tr>`;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');

      for (const p of projects) {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--color-border)';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = false;
        cb.addEventListener('change', updateCount);
        checkboxes.set(p.id, cb);

        const tdCheck = document.createElement('td');
        tdCheck.style.cssText = 'padding:7px 8px;text-align:center';
        tdCheck.appendChild(cb);

        const tdTitle = document.createElement('td');
        tdTitle.style.padding = '7px 8px';
        tdTitle.title = p.id;

        if (p.id === activeProjectId) {
          const badge = document.createElement('span');
          badge.style.cssText = 'color:var(--color-text-secondary);font-size:var(--font-size-sm)';
          badge.textContent = ' (current)';
          tdTitle.textContent = p.title;
          tdTitle.appendChild(badge);
        } else {
          tdTitle.textContent = p.title;
        }

        const tdDate = document.createElement('td');
        tdDate.style.cssText = 'padding:7px 8px;color:var(--color-text-secondary)';
        tdDate.textContent = p.updated ? new Date(p.updated).toLocaleDateString() : '\u2014';

        row.appendChild(tdCheck);
        row.appendChild(tdTitle);
        row.appendChild(tdDate);
        tbody.appendChild(row);
      }

      table.appendChild(tbody);
      body.appendChild(table);

      btnSelectAll.addEventListener('click', () => {
        checkboxes.forEach((cb) => { cb.checked = true; });
        updateCount();
      });

      btnDeselectAll.addEventListener('click', () => {
        checkboxes.forEach((cb) => { cb.checked = false; });
        updateCount();
      });
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';

    const countLabel = document.createElement('span');
    countLabel.style.cssText = 'color:var(--color-text-secondary);font-size:var(--font-size-sm)';
    countLabel.textContent = '0 selected';

    const btnClear = document.createElement('button');
    btnClear.className = 'btn btn-danger';
    btnClear.textContent = 'Clear Selected';
    btnClear.disabled = true;

    footer.appendChild(countLabel);
    footer.appendChild(btnClear);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function updateCount() {
      let n = 0;
      checkboxes.forEach((cb) => { if (cb.checked) n++; });
      countLabel.textContent = `${n} selected`;
      btnClear.disabled = n === 0;
    }

    function close(result) {
      backdrop.remove();
      resolve(result);
    }

    // ── Event handlers ───────────────────────────────────────────────────────
    btnClose.addEventListener('click', () => close([]));

    btnClear.addEventListener('click', () => {
      const ids = [];
      checkboxes.forEach((cb, id) => { if (cb.checked) ids.push(id); });
      close(ids);
    });

    // ── Assemble ─────────────────────────────────────────────────────────────
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    btnClose.focus();
  });
}
```

- [ ] **Step 2: Verify the file exists**

Run:
```bash
ls frameforge/ui/clear-projects-modal.js
```
Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add frameforge/ui/clear-projects-modal.js
git commit -m "feat: add clear-projects-modal with per-project selection"
```

---

### Task 2: Update `app.js` — import and rewrite `doClearProject`

**Files:**
- Modify: `frameforge/app.js`

- [ ] **Step 1: Add the import**

In `frameforge/app.js`, find the block of UI imports near the top. It already has:
```js
import { showAssignmentConflictModal } from './ui/assignment-conflict-modal.js';
```

Add the new import immediately after that line:
```js
import { showClearProjectsModal } from './ui/clear-projects-modal.js';
```

- [ ] **Step 2: Replace `doClearProject`**

Find this entire function in `frameforge/app.js` (around line 1087):

```js
  async function doClearProject() {
    if (!project.isLoaded) return;

    const confirmed = await showConfirm(
      'Clear Project',
      `Remove "${project.data.project.title}" and all stored images from local storage?`,
      'Clear',
      true,
    );

    if (!confirmed) return;

    await storage.deleteProject(project.id);
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
    status.set('Project cleared.', 'info', 3000);
    toasts.info('Project Cleared', 'All project data removed from local storage.');
  }
```

Replace it with:

```js
  async function doClearProject() {
    const projects = storage.loadProjectIndex();

    if (projects.length === 0) {
      toasts.info('No Projects', 'No saved projects to clear.');
      return;
    }

    const selectedIds = await showClearProjectsModal(
      projects,
      project.isLoaded ? project.id : null,
    );

    if (selectedIds.length === 0) return;

    for (const id of selectedIds) {
      await storage.deleteProject(id);
    }

    const clearedActive = project.isLoaded && selectedIds.includes(project.id);

    if (clearedActive) {
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

    const n = selectedIds.length;
    status.set(`${n} project(s) cleared.`, 'info', 3000);
    toasts.info('Projects Cleared', `${n} project(s) removed from storage.`);
  }
```

- [ ] **Step 3: Verify in browser — no active project**

Open `frameforge/index.html` in a browser with no project loaded. Click the clear button (trash icon in toolbar).

Expected: toast "No Projects — No saved projects to clear." Modal does NOT open.

- [ ] **Step 4: Verify in browser — one project loaded**

Load a project JSON. Click the clear button.

Expected:
- Modal opens titled "Clear Projects"
- Table shows the project with `(current)` badge
- "Clear Selected" button is disabled
- Checking the row enables "Clear Selected" and updates count to "1 selected"
- "Select All" checks all rows; "Deselect All" unchecks all
- Clicking X closes modal without clearing anything
- Checking the row and clicking "Clear Selected": modal closes, app resets to empty state, toast "1 project(s) cleared."

- [ ] **Step 5: Verify in browser — clearing only an inactive project**

Load two projects in sequence (so both are indexed), then load one. Click clear button.

Expected:
- Modal shows both rows; active one has `(current)` badge
- Select only the inactive project, click "Clear Selected"
- Modal closes, app does NOT reset (current project remains loaded), toast "1 project(s) cleared."

- [ ] **Step 6: Commit**

```bash
git add frameforge/app.js
git commit -m "feat: replace clear-project confirm with project list modal"
```
