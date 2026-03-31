# Project Unification Design

**Date:** 2026-03-31
**Status:** Approved

## Problem

FrameForge has two separate concepts — "Briefs" (AI creative specs) and "Projects" (loaded JSON layouts) — with separate storage, separate UI panels, and no enforced relationship. Users cannot tell which brief belongs to which layout. Clearing a project leaves the brief behind. Loading a JSON or images requires no project context. The vocabulary is confusing.

---

## Solution Overview

Unify briefs and projects into one concept called **Project**. A project = brief fields + optional JSON layout + images + assignments, all stored under the brief ID. Brief ID is the canonical project ID. Export/import file formats are unchanged.

---

## Section 1: Data Model and Storage

### Unified Project

A project has:
- `id` — brief UUID (canonical key for all storage)
- `title`, `platform`, `tone`, `story`, `notes` — brief fields
- `created`, `updated` — timestamps
- `hasLayout: boolean` — whether a JSON layout has been loaded
- Layout JSON — stored in localStorage under `frameforge_project_{id}`
- Images — stored in IndexedDB under `id`
- Assignments — stored in localStorage under `frameforge_assignments_{id}`

### `brief-storage.js` changes

Add `hasLayout: boolean` to index entries (default `false`).

New export:
```js
export function setHasLayout(id, value) {
  const index = loadIndex();
  const entry = index.find((e) => e.id === id);
  if (!entry) return;
  entry.hasLayout = value;
  saveIndex(index);
}
```

New shared delete function (replaces both old delete paths):
```js
export async function deleteProject(id) {
  remove(id);                           // removes frameforge_brief_{id} + updates index
  storage.deleteLayoutData(id);         // removes frameforge_project_{id}
  storage.clearAssignments(id);         // removes frameforge_assignments_{id}
  await storage.clearImages(id);        // removes IndexedDB images
}
```

### `storage.js` changes

**`saveProject(data, projectId)`** — gains a required `projectId` parameter:
```js
export function saveProject(data, projectId) {
  localStorage.setItem(projectKey(projectId), JSON.stringify(data));
  // does NOT update frameforge_projects index — brief-storage owns the index now
}
```

**New `deleteLayoutData(id)`:**
```js
export function deleteLayoutData(id) {
  localStorage.removeItem(projectKey(id));
  localStorage.removeItem(assignmentsKey(id));
}
```

**New `clearAssignments(id)`:**
```js
export function clearAssignments(id) {
  localStorage.removeItem(assignmentsKey(id));
}
```

**`deleteProject(id)`** — kept for backwards compatibility but stripped to just layout + images:
```js
export async function deleteProject(id) {
  deleteLayoutData(id);
  await clearImages(id);
}
```

`loadProject(id)` — unchanged.

### `project.js` changes

**`load(data, projectId)`** — new required `projectId` parameter:
```js
async load(data, projectId) {
  this.data = data;
  this.id   = projectId;           // brief ID, not data.project.id
  // ... rest unchanged ...
}
```

`save()`, `addImages()`, `assignImage()` — all already use `this.id`, no changes needed.

---

## Section 2: UI Rename and Panel Status

### Label renames

| Old text | New text |
|----------|----------|
| "New Brief" (toolbar button) | "New Project" |
| "My Briefs" (toolbar button) | "My Projects" |
| `title="Create a new project brief…"` | `title="Create a new project"` |
| `title="Browse and manage your saved briefs"` | `title="Browse and manage your projects"` |
| "My Briefs" (panel title) | "My Projects" |
| `placeholder="Search briefs…"` | `placeholder="Search projects…"` |
| "No briefs yet." (empty state) | "No projects yet." |
| "Create your first brief" | "Create your first project" |
| "Double-click to set active" (hint) | "Double-click to set active project" |
| Any "brief" in concept-builder.js visible to the user | "project" |

### Status indicator in Projects panel

Each project row in the panel gains a small status dot after the title:
- `●` filled (accent color) — layout loaded (`hasLayout: true`)
- `○` empty (muted color) — no layout yet (`hasLayout: false`)

Rendered as a `<span>` after the title text in the list item.

### `clear-projects-modal.js` change

Replace `storage.loadProjectIndex()` with `briefStorage.loadIndex()` to populate the modal rows.

---

## Section 3: App Flow — Smart JSON Load and Load Guards

### Active project required

Two operations require an active project:

1. **Loading a JSON file**
2. **Loading images**

If neither condition is met, a smart prompt appears instead of a hard block.

### Smart JSON load flow

#### Case A: No active project, JSON title matches an existing project

Show a single-question modal:
> *"This looks like [Project X]. Load into it?"*
> `[Yes]` `[Pick different]` `[Create new project]`

- **Yes** → set that project as active, proceed to Case C or D
- **Pick different** → show `project-select-modal.js` (list of all projects)
- **Create new project** → open ConceptBuilder, then resume load after project is created

#### Case B: No active project, no title match

Show `project-select-modal.js` directly:
> *"Select a project to load this layout into, or create a new one."*
> List of existing projects + `[+ Create new project]` button at bottom

#### Case C: Active project has an existing layout

Show `json-load-review-modal.js` — per-frame review (see below).

#### Case D: Active project has no layout

Silent load. Call `project.load(data, activeProjectId)`, then `briefStorage.setHasLayout(activeProjectId, true)`.

### Smart image load flow

If no active project → show `project-select-modal.js` with message:
> *"Select a project to load images into, or create a new one."*

If active project → proceed as today.

---

## Section 4: Per-Frame Review Modal (`json-load-review-modal.js`)

### When shown

When loading a JSON into a project that already has a layout (`hasLayout: true`).

### Frame diff algorithm

Compare `newData.frames` against `project.data.frames` (the currently loaded layout). For each frame in `newData.frames`, find the matching frame in the current layout by `frame.id`. Compute three change categories:

- **image** — `frame.image_src !== old.image_src || frame.image_filename !== old.image_filename`
- **copy** — any text layer (layer with `type === 'text'`) has a different `.text` value
- **content** — any other difference (layer count changed, non-text layer properties changed, overlays changed)

Frames with no changes in any category are not shown.

New frames (ID not found in old layout) are shown with all three badges and pre-checked.

### Modal layout

- **Header:** "Review Layout Changes"
- **Subtext:** "X of Y frames have changes. Select which frames to update."
- **Bulk row:** `[Select All]` `[Keep All]`
- **Table:**

  | Frame | Changes | Details | Replace? |
  |-------|---------|---------|----------|
  | frame-01 | `image` `copy` | image: aerial-amazon-river → aerial-river-descent · copy: "Into the Wild" → "River Deep" | ☑ |

  - Change badges: small inline tags — `image`, `copy`, `content`
  - Details column: shows specifics for each badge:
    - `image`: `old image_src → new image_src`
    - `copy`: first changed text layer — `"old text" → "new text"` (truncated at 30 chars); if multiple text layers changed, append `+N more`
    - `content`: `N layer(s) changed`
  - Replace checkbox defaults to **checked**
  - Full details available in `title` tooltip on the details cell

- **Footer:** `[Apply]` button

### Behavior

- `showJsonLoadReviewModal(oldData, newData): Promise<Set<string>>` — returns Set of frame IDs the user chose to replace
- On Apply: for each frame ID in the returned Set, replace the frame in `project.data.frames` with the new frame data
- Frames not in the Set keep their current data unchanged
- After apply: re-render filmstrip, re-render active frame, run `_autoAssignImages()`

---

## Section 5: Clear/Delete Unification

### Shared delete path

Both the toolbar clear button and the Projects panel delete button call `briefStorage.deleteProject(id)` (defined in Section 1). This removes everything: brief entry, layout JSON, images, assignments.

### Toolbar clear button

`clear-projects-modal.js` uses `briefStorage.loadIndex()` to populate rows. On confirm, calls `briefStorage.deleteProject(id)` for each selected ID.

If active project deleted → `project.clear()` + full app reset + deselect active project (same as current behavior).

### Projects panel delete

Existing per-brief delete + confirm flow updated to call `briefStorage.deleteProject(id)` instead of `briefStorage.remove(id)`. If it was the active project → same app reset.

---

## Files Changed

| File | Change |
|------|--------|
| `frameforge/modules/brief-storage.js` | Add `hasLayout` to index, `setHasLayout()`, `deleteProject()` |
| `frameforge/modules/storage.js` | `saveProject(data, projectId)`, `deleteLayoutData(id)`, `clearAssignments(id)` |
| `frameforge/modules/project.js` | `load(data, projectId)` |
| `frameforge/app.js` | Smart load flow, load guards, pass `activeProjectId` to `project.load()` |
| `frameforge/ui/brief-manager.js` | Rename all labels, add status dot, use `briefStorage.deleteProject()` |
| `frameforge/ui/shell.js` | Rename toolbar button labels |
| `frameforge/ui/concept-builder.js` | Rename user-visible "brief" → "project" labels |
| `frameforge/ui/clear-projects-modal.js` | Use `briefStorage.loadIndex()` instead of `storage.loadProjectIndex()` |
| `frameforge/ui/json-load-review-modal.js` | **New** — per-frame review modal |
| `frameforge/ui/project-select-modal.js` | **New** — smart load project selection prompt |
