# FrameForge — Briefs Management
**Date:** 2026-03-27
**Status:** Approved

---

## Overview

Add persistent brief management to FrameForge. Users can create multiple briefs, view them in a dedicated "My Briefs" panel, edit them, re-export, copy prompts, duplicate, and delete. Briefs auto-save as the user works through the wizard — no explicit save action required.

---

## Architecture

Four components with one job each:

| Component | Type | Responsibility |
|---|---|---|
| `modules/brief-storage.js` | New | CRUD for briefs in localStorage |
| `ui/brief-manager.js` | New | "My Briefs" modal — list view + detail card |
| `ui/concept-builder.js` | Modified | Auto-save, accept `briefId` to pre-fill, header link |
| `ui/shell.js` + `app.js` | Modified | "My Briefs" toolbar button + wiring |
| `styles/components.css` | Modified | BriefManager styles |
| `docs/spec-app.md` | Modified | Update Part X, add Part XI |

---

## Data Model

### Brief Schema

```js
{
  id:            string,   // "brief_1711234567890" — timestamp-based
  title:         string,
  slug:          string,   // derived from title at save time
  platform:      string,   // e.g. "instagram-portrait" or "custom"
  customW:       string,
  customH:       string,
  story:         string,
  notes:         string,
  tone:          string,
  toneCustom:    string,
  thumbRatioVal: string,
  thumbCustomW:  string,
  thumbCustomH:  string,
  imageCount:    number,   // last known image count — shown as reminder only
  created:       string,   // ISO date string e.g. "2026-03-27"
  updated:       string,   // ISO date string — updated on every auto-save
}
```

Images are **not** persisted. `imageCount` is stored as a reminder of how many images were loaded last time.

### localStorage Keys

| Key | Value |
|---|---|
| `frameforge_briefs` | JSON array of index entries `{ id, title, slug, platform, imageCount, created, updated }` |
| `frameforge_brief_{id}` | Full brief JSON object |

---

## `modules/brief-storage.js`

Public API (mirrors `modules/storage.js` style):

```js
save(brief)       // upsert: writes full brief + updates index entry
load(id)          // returns full brief object or null
list()            // returns index array sorted by updated desc
delete(id)        // removes full brief + index entry
```

- Index is a lightweight array of summary entries, used for rendering the list without loading all briefs.
- `save()` generates `id` if not present (`"brief_" + Date.now()`), sets `created` on first save, always updates `updated`.

---

## `ui/brief-manager.js`

### Modal Layout

Two-panel layout inside a wide modal (similar width to ConceptBuilder):

```
┌─────────────────────────────────────────────────────┐
│ My Briefs                                        ✕  │
├──────────────────────┬──────────────────────────────┤
│ [🔍 Search briefs ]  │  (select a brief to see      │
│ Sort: Updated ↓      │   details)                   │
│ ─────────────────    │                              │
│ • Patagonia Trip     │                              │
│   Instagram · 24 img │                              │
│   Mar 27             │                              │
│                      │                              │
│ • Wedding Series     │                              │
│   Print A4 · 48 img  │                              │
│   Mar 25             │                              │
│                      │                              │
│ [+ New Brief]        │                              │
└──────────────────────┴──────────────────────────────┘
```

### List Panel (left)

- **Search input** — real-time filter on `title` (case-insensitive substring match)
- **Sort control** — three options: "Last updated" (default), "Title A→Z", "Created"
- **Brief rows** — each row shows:
  - Title (bold, truncated to one line)
  - Platform name + image count (e.g. "Instagram Portrait · 24 images")
  - Last updated date (relative: "Today", "Yesterday", "Mar 25")
- Selected row highlighted with accent border
- **"+ New Brief" button** at the bottom — opens a fresh ConceptBuilder wizard
- **Empty state** — if no briefs exist: centered message "No briefs yet" + "+ Create your first brief" button
- **Empty search** — if search yields no results: "No briefs match your search"

### Detail Card (right)

Appears when a brief row is selected:

- **Title** (large)
- **Platform** + dimensions
- **Story** (truncated to 3 lines with expand)
- **Tone** (displayed as the label text)
- **Images** — "N images loaded last time" (reminder, greyed)
- **Last updated** date

**Action buttons:**

| Button | Behavior |
|---|---|
| **Edit** | Opens ConceptBuilder pre-filled at Step 1 with saved brief data. Images start empty. |
| **Export Package** | Opens ConceptBuilder pre-filled at Step 4. Brief + mockups export immediately; thumbnail sheets are skipped unless user loads images. |
| **Copy Prompt** | Builds prompt text from saved brief data and copies to clipboard. No wizard opened. Shows "✓ Copied!" for 2s. |
| **Duplicate** | Creates a copy of the brief with title appended " (copy)". Selects the new brief in the list. |
| **Delete** | Shows inline confirmation row: "Delete this brief?" + [Delete] [Cancel]. On confirm: removes from storage, deselects. |

### Public API

```js
export class BriefManager {
  constructor(briefStorage)
  open()   // opens the modal
}
```

`BriefManager` receives a callback (set at construction time) for opening ConceptBuilder:
```js
new BriefManager(briefStorage, (briefId) => conceptBuilder.open(onImages, briefId))
```

---

## `ui/concept-builder.js` Changes

### Signature

```js
open(onImages, briefId = null)
```

When `briefId` is non-null, loads the brief from storage and pre-fills all state fields before rendering. Wizard opens at Step 1.

### New State

```js
this._briefId = null;   // null = new brief, string = editing existing
```

### Auto-Save

**`_autoSave()`** — called at the end of `_goTo()` and from the `#cb-title` input handler once a title exists.

```
_goTo(step) → updates this._step → _close(true) → _render() → _autoSave()
```

Behavior:
- If `_title.trim()` is empty: do nothing (don't save untitled briefs)
- If `_briefId` is null: generate a new ID and assign to `_briefId`
- Call `briefStorage.save({ id: _briefId, ...current fields })`
- Silent — no toast, no status indicator

### Header Link

A subtle `≡ My Briefs` text link in the modal header (right of title, left of close button). Clicking it closes the wizard (with `_close()` — images discarded unless the brief was already saved) and opens `briefManager.open()`.

---

## Toolbar Change

In `ui/shell.js`, add a **"My Briefs"** button immediately after the "New Brief" button:

```
[New Brief]  [My Briefs]  |  [Load JSON]  ...
```

Button uses the same `.btn .btn-ghost` style as other toolbar buttons. Icon: a list/stack SVG icon.

---

## spec-app.md Updates

- **Part X §10.2** — update Trigger section to note the "My Briefs" header link
- **Part X §10.3** — note that wizard auto-saves to brief storage on each step
- **New Part XI** — documents brief management: purpose, modal layout, data model, storage keys, brief lifecycle (create → auto-save → manage → delete)

---

## Files

| File | Change |
|---|---|
| `modules/brief-storage.js` | New — brief CRUD module |
| `ui/brief-manager.js` | New — My Briefs modal (list + detail) |
| `ui/concept-builder.js` | Modified — auto-save, briefId param, header link |
| `ui/shell.js` | Modified — "My Briefs" toolbar button |
| `app.js` | Modified — instantiate BriefManager, wire toolbar button |
| `styles/components.css` | Modified — BriefManager styles (.bm-* prefix) |
| `docs/spec-app.md` | Modified — Part X tweaks + new Part XI |
