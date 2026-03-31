# Clear Projects Modal Design

**Date:** 2026-03-31
**Status:** Approved

## Problem

The current "Clear Project" button shows a simple confirm dialog that only clears the active project. Users have no way to see all stored projects or selectively delete inactive ones. With IndexedDB now backing image storage, stale project data (JSON + assignments in localStorage, images in IndexedDB) can accumulate with no way to clean it up.

---

## Solution Overview

Replace the confirm dialog with a project list modal that shows every stored project, lets the user select any combination, and deletes them on confirm. App state resets only if the active project was in the selection.

---

## Section 1: Modal Layout (`clear-projects-modal.js`)

### Signature

```js
showClearProjectsModal(projects, activeProjectId): Promise<string[]>
```

- `projects` — array of `{id, title, created, updated}` from `storage.loadProjectIndex()`
- `activeProjectId` — `project.id` of the currently loaded project, or `null`
- Returns a Promise that resolves with an array of project IDs the user chose to delete. Resolves with `[]` if the user closes without selecting anything.

### Layout

- **Header:** "Clear Projects"
- **Body:**
  - If `projects` is empty: show "No saved projects." text, no table.
  - Otherwise:
    - Bulk action row: `[Select All]` `[Deselect All]` buttons
    - Table — one row per project:

      | ☐ | Title | Badge | Last updated |
      |---|-------|-------|--------------|
      | checkbox | project title | `(current)` if `id === activeProjectId` | formatted `updated` date |

    - Rows default to **unchecked**
    - Full project ID in `title` tooltip on the title cell
- **Footer:**
  - Left: count label — `"N project(s) selected"` (updates live as checkboxes toggle)
  - Right: `[Clear Selected]` button — disabled when count is 0, styled as danger (red)
- **Close:** X button in header resolves with `[]`

### CSS

Uses existing classes: `modal-backdrop`, `modal`, `modal-header`, `modal-title`, `modal-body`, `modal-footer`, `btn`, `btn-primary`, `btn-secondary`. Danger button uses inline `color: var(--color-danger)` or a `.btn-danger` class if already defined in `components.css`.

### Behavior

- Promise resolves (with selected IDs) when user clicks "Clear Selected"
- Promise resolves (with `[]`) when user clicks X or clicks outside the modal
- No cancel button needed — closing without selecting is the escape hatch
- Focus is set to the X button on open (nothing is pre-selected so "Clear Selected" is disabled)

---

## Section 2: App Reset Logic (`app.js`)

### Updated `doClearProject()`

```
1. Load projects = storage.loadProjectIndex()
2. If projects.length === 0 → show toast "No saved projects." and return
3. Open modal: selectedIds = await showClearProjectsModal(projects, project.id)
4. If selectedIds.length === 0 → return (user cancelled)
5. For each id in selectedIds: await storage.deleteProject(id)
6. If selectedIds.includes(project.id):
     - Run full app reset (same as current doClearProject post-confirm block)
     - prefs.last_project_id = null; storage.savePrefs(prefs)
     - appState = AppState.EMPTY
7. Toast: `"${selectedIds.length} project(s) cleared."`
```

### Full App Reset (step 6) — same as current behavior

```js
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
```

---

## Section 3: Files Changed

| File | Change |
|------|--------|
| `frameforge/ui/clear-projects-modal.js` | New file — modal UI, exports `showClearProjectsModal` |
| `frameforge/app.js` | Replace `doClearProject` body with project-list modal flow |
