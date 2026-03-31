# Image Auto-Assignment Design

**Date:** 2026-03-31
**Status:** Approved

## Problem

FrameForge project JSONs use descriptive labels for `image_src` (e.g. `"aerial-amazon-river"`), not raw filenames. When users load images by their real filenames (e.g. `dji_fly_20260228_...jpg`), the app cannot match them to frames automatically — `_isImageReferenced` compares `frame.image_src === filename`, which never matches. Users must drag every image onto every frame manually.

The `frame-image-mapping.md` file already records the label → raw filename mapping, but the Technical Producer skill never writes the raw filename into the JSON itself.

---

## Solution Overview

1. Add `image_filename` to each frame in the JSON (Technical Producer writes it).
2. App auto-assigns images to frames when filenames match.
3. Conflicts with existing manual assignments trigger a resolution modal.

---

## Section 1: JSON Schema

Each frame gets one new optional field:

```json
{
  "id": "frame-01",
  "image_src": "aerial-amazon-river",
  "image_filename": "dji_fly_20260228_131208_0599_1772316094210_photo.jpg",
  ...
}
```

- `image_src` is unchanged — descriptive label used by agent-preview, art director, and all downstream agents.
- `image_filename` is the raw source file for UI auto-assignment only.
- Field is optional — frames without it skip auto-assignment (backwards compatible).

---

## Section 2: Auto-assignment logic (`project.js`)

### New method: `_autoAssignImages()`

Scans all frames with `image_filename` and returns two buckets:

- **`assigned`** — frame has no existing assignment AND `image_filename` is in `imageElements` → auto-assign silently via `assignImage(frameIndex, filename)`.
- **`conflicts`** — frame has a manual assignment AND it differs from `image_filename` → collect for user review.

Conflict shape:
```js
{ frameIndex, frameId, currentKey, newKey }
```

A frame where `imageAssignments` already equals `image_filename` is skipped (already correct — no action, no conflict).

### Call sites

1. **`addImages()`** — called after new images are loaded. Returns `{ matched, storageFailed, assigned, conflicts }`.
2. **`load()`** — called after restoring stored images and assignments. Returns `{ assigned, conflicts }`.

---

## Section 3: Conflict resolution modal (`ui/assignment-conflict-modal.js`)

New file. Shows when `conflicts.length > 0`.

### Layout

- **Header:** "Image Assignment Conflicts"
- **Subtext:** "These frames already have a manual assignment. Select which ones to replace with the JSON mapping."
- **Bulk actions row:** `[Replace All]` `[Leave All]` — toggle all checkboxes
- **Table** — one row per conflict:

  | Frame | Current | → New | Replace? |
  |-------|---------|-------|----------|
  | frame-01 | `CC2A0856.jpg` | `dji_fly_...jpg` | ☑ |

  - Rows default to **checked** (replace)
  - Filenames truncated at ~30 chars; full name in `title` tooltip
- **Footer:** `[Apply]` — commits and closes

### Behavior

- Returns `Promise<Map<frameIndex, 'replace'|'keep'>>`.
- No cancel — user must apply (choosing "Leave All" is the escape hatch).
- Styled with the existing `.progress-box` shell and z-index layer for consistency.

---

## Section 4: `app.js` integration

### After `handleImageFiles()` (user loads images)

1. `project.addImages(imageMap)` → `{ matched, storageFailed, assigned, conflicts }`
2. Silent auto-assignments applied immediately.
3. If `conflicts.length > 0` → show modal, await resolution, apply decisions.
4. Toast: `"X image(s) loaded, Y auto-assigned"` or `"Y auto-assigned, Z kept manual"` when conflicts resolved.
5. Rebuild image tray, re-render frame, update filmstrip and inspector.

### After `project.load()` (JSON loaded)

1. `load()` returns `{ assigned, conflicts }` from its internal auto-assign pass.
2. Same flow: silent for `assigned`, modal for `conflicts`.
3. Toast: `"Project loaded — N frames auto-assigned"` (omit if zero).

---

## Section 5: Skills and documentation updates

### `frameforge-technical-producer/SKILL.md`

Add to "Project JSON" section: for each frame, read the raw filename from `[IMAGE_MAP_PATH]` and write it as `image_filename` alongside `image_src`. No blanks.

### `frameforge/data/ai-manual-content.js`

Add `image_filename` to frame schema docs: optional string, raw source filename for UI auto-assignment. `image_src` docs unchanged.

### `test-projects/README.md` Step 5

Add one sentence: the generated JSON includes `image_filename` per frame — this enables auto-assignment when images are loaded in the UI.

### `frameforge-stage-manager/SKILL.md`

No change. The stage manager creates label-named copies for `agent-preview.html`, which is a separate rendering path unaffected by this feature.

---

## Files changed

| File | Change |
|------|--------|
| `frameforge/data/test-projects/amazon/the-amazon.json` | Add `image_filename` to all 20 frames |
| `frameforge/modules/project.js` | `_autoAssignImages()`, update `addImages()`, `load()` |
| `frameforge/ui/assignment-conflict-modal.js` | New file |
| `frameforge/app.js` | Trigger auto-assign, show modal, update toasts |
| `frameforge/data/ai-manual-content.js` | Add `image_filename` to frame schema docs |
| `.claude/skills/frameforge-technical-producer/SKILL.md` | Write `image_filename` per frame |
| `frameforge/data/test-projects/README.md` | Step 5 note |
