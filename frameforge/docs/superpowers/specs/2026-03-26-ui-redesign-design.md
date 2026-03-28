# UI Redesign — Design Spec

**Date:** 2026-03-26
**Scope:** Reorganize the FrameForge UI to fix the "frankenstein" feel caused by unstructured feature accumulation. Three targeted structural changes — no new functionality added.

---

## Problem

The UI grew organically as features were added. The result:

1. **Toolbar**: 9 actions in a flat undifferentiated row — no visual grouping, no workflow logic
2. **Left panel**: filmstrip takes most of the space, image tray fixed at 190px at the bottom — unbalanced given that dragging images to frames is the primary production task
3. **Inspector**: sections appear in arbitrary order; warnings/errors are buried at the bottom; Export settings (rarely changed mid-session) take up prime real estate

User workflow: **Brief → copy prompt → download brief → AI (external) → Load JSON → Load Images → drag text → Export**

---

## Change 1: Toolbar — 5 logical groups

**File:** `ui/shell.js` — `buildToolbar()`

Split the flat toolbar into 5 visually separated groups using dividers (`|` separators in the DOM):

| Group | Actions | Style |
|---|---|---|
| Brief | New Brief | `.btn-primary` (blue accent) |
| Load | Load JSON, Load Images | `.btn-secondary` |
| Title | project-title (center, flex:1) | read-only display |
| View | safe-zone toggle | `.btn-ghost` icon |
| Export | Preview All, Export This, Export All | Preview: secondary; Export buttons: green accent |
| Danger | Clear | `.btn-danger` isolated right |

The toolbar reads left-to-right in workflow order: create → load → title → view → export → clear.

Export This and Export All use a distinct green-tinted style (`.btn-export`) to make the primary output action visually pop. Clear is isolated rightmost so it cannot be accidentally hit.

---

## Change 2: Left panel — image-first split

**Files:** `styles/shell.css`, `ui/filmstrip.js`, `ui/image-tray.js`

### Current state
- Filmstrip: `flex:1` (takes all remaining space)
- Image tray: `height: 190px` fixed, non-resizable

### New state
- A drag handle (`#left-panel-resize`) between filmstrip and image tray — a 6px tall bar the user can drag to redistribute space
- **Default split**: filmstrip ~170px, images get the rest (~280px on a 1080p screen at typical window height)
- Filmstrip items switch from full-width card layout to **compact horizontal rows**: small thumbnail (44×34px) + frame id text side by side. Scrolls vertically when there are more frames than fit.
- Image tray keeps its existing grid layout (74px wide items) — just gets more vertical space
- Both sections remain always-visible (no collapse)

### Resize implementation
- Store the filmstrip height in `localStorage` under key `frameforge_filmstrip_height` so it persists across sessions
- Default: `170px`; min: `100px`; max: `(panelHeight - 100)px`
- On drag, set filmstrip height via inline style; image tray fills the remainder with `flex:1`

### Filmstrip compact row layout
Each `.filmstrip-item` changes from vertical card to horizontal row:
```
[44×34 canvas thumbnail] [frame id text]   [status icon]
```
Height per row: ~48px. Active frame gets accent border-left instead of full border.

---

## Change 3: Inspector — reordered sections

**File:** `ui/inspector.js` — `update()` method

New section order:

1. **Warnings** (only shown when present) — top, red-tinted banner
2. **Errors** (only shown when present) — top, below warnings
3. **Frame** — index, id, layer count, bg color
4. **Layers** — type badges
5. **Fonts** — load status badges
6. **Images** — load/assignment status
7. **Export** — collapsed by default, shows one-line summary (`1080×1350 · PNG · ×2`). Expand on click.
8. **Image Index** — only rendered when `project.data.image_index?.length > 0` (already conditional, keep as-is)

The Export section collapse is a simple CSS toggle — a `.collapsed` class on the section hides its rows, the header chevron flips. State stored in module-level variable (no persistence needed).

---

## Files Changed

| File | Change |
|---|---|
| `ui/shell.js` | Rebuild `buildToolbar()` with 5 groups; wire left-panel resize handle drag logic |
| `styles/shell.css` | Filmstrip item compact row styles; left panel resize handle; image tray flex layout |
| `styles/components.css` | Add `.btn-export` green variant |
| `ui/filmstrip.js` | `_buildItem()` compact row layout only |
| `ui/inspector.js` | Reorder sections; add Export collapse toggle |

---

## Out of Scope

- No new functionality
- Inspector stays read-only
- No changes to canvas, renderer, drag, or export logic
- No changes to right panel width (240px) or left panel width (180px)
- No dark/light theme toggle
