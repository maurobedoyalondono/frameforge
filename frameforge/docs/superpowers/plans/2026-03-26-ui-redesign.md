# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the FrameForge UI into three structural improvements: a logically grouped toolbar, an image-first left panel with a draggable resize handle, and a reordered inspector with the Export section collapsed by default.

**Architecture:** Pure CSS + HTML + JS changes — no new functionality, no new modules. The resize handle persists its position in `localStorage`. The inspector Export collapse is toggled in-place using event delegation set up in the `Inspector` constructor.

**Tech Stack:** Vanilla ES modules, HTML5, CSS custom properties. No build step — verify in browser by opening `index.html` directly.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `styles/components.css` | Modify | Add `.btn-export` green variant |
| `ui/shell.js` | Modify | Rebuild toolbar HTML (5 groups); add `initLeftPanelResize()` |
| `index.html` | Modify | Add `#left-panel-resize` handle between filmstrip and image tray |
| `styles/shell.css` | Modify | Compact filmstrip item styles; resize handle; tray `flex:1`; project-title `flex:1` |
| `ui/filmstrip.js` | Modify | `THUMB_WIDTH` → 44; `_buildItem()` compact row layout |
| `ui/inspector.js` | Modify | Reorder sections; Export collapse via event delegation |
| `app.js` | Modify | Add `initLeftPanelResize` to shell import; call after `buildToolbar()` |

---

## Task 1: Add `.btn-export` green button variant

**Files:**
- Modify: `styles/components.css:78-87`

- [ ] **Step 1: Read current `.btn-danger` block**

Read `styles/components.css` lines 78–93 to see the exact end of `.btn-danger`.

- [ ] **Step 2: Add `.btn-export` after `.btn-danger`**

After the closing brace of `.btn-danger:hover:not(:disabled)` (currently around line 87), insert:

```css
/* Export (green accent) */
.btn-export {
  background: rgba(63,207,142,0.10);
  color: var(--color-success);
  border-color: rgba(63,207,142,0.3);
}
.btn-export:hover:not(:disabled) {
  background: rgba(63,207,142,0.18);
  border-color: rgba(63,207,142,0.5);
}
```

- [ ] **Step 3: Verify in browser**

Open `index.html` in a browser. Open DevTools console and run:
```javascript
document.body.innerHTML += '<button class="btn btn-export">Test</button>';
```
Expected: A green-tinted button appears.

- [ ] **Step 4: Commit**

```bash
git add styles/components.css
git commit -m "style: add btn-export green variant for export buttons"
```

---

## Task 2: Reorganize toolbar into 5 logical groups

**Files:**
- Modify: `ui/shell.js:252-352`

- [ ] **Step 1: Read current `buildToolbar`**

Read `ui/shell.js` lines 252–352.

- [ ] **Step 2: Replace `toolbarEl.innerHTML` template**

Replace everything from `toolbarEl.innerHTML = \`` through the closing `\`;` (lines 253–331) with:

```javascript
  toolbarEl.innerHTML = `
    <div class="toolbar-brand">
      <span class="brand-name">Frame<span>Forge</span></span>
    </div>
    <div class="toolbar-sep"></div>

    <button class="btn btn-secondary" id="btn-new-project" title="Create a new project brief for AI generation">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
      </svg>
      New Brief
    </button>

    <div class="toolbar-sep"></div>

    <button class="btn btn-secondary" id="btn-load-json" title="Load project JSON">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
      </svg>
      Load JSON
    </button>

    <button class="btn btn-secondary" id="btn-load-images" title="Load images" disabled>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
        <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
      </svg>
      Load Images
    </button>

    <span id="project-title" title=""></span>

    <div class="toolbar-sep"></div>

    <button class="btn btn-ghost btn-icon" id="btn-safe-zone" title="Toggle safe zone [Z]" disabled>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"/>
        <path d="M8 4.5a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1H8a.5.5 0 0 1-.5-.5v-3.5a.5.5 0 0 1 .5-.5z"/>
      </svg>
    </button>

    <div class="toolbar-sep"></div>

    <button class="btn btn-secondary" id="btn-preview-all" title="Render all frames [R]" disabled>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
      </svg>
      Preview All
    </button>

    <button class="btn btn-export" id="btn-export-this" title="Export current frame [E]" disabled>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
      </svg>
      Export This
    </button>

    <button class="btn btn-export" id="btn-export-all" title="Export all frames [Shift+E]" disabled>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
      </svg>
      Export All
    </button>

    <div class="toolbar-sep"></div>

    <button class="btn btn-ghost btn-icon btn-danger" id="btn-clear-project" title="Clear project" disabled>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
      </svg>
    </button>

    <!-- Hidden file inputs -->
    <input type="file" id="input-json"   accept=".json" style="display:none">
    <input type="file" id="input-images" accept=".jpg,.jpeg,.png,.webp" multiple style="display:none">
  `;
```

- [ ] **Step 3: Update `#project-title` CSS in `styles/shell.css`**

Find the `#project-title` block (lines 52–64) and replace it with:

```css
#project-title {
  flex: 1;
  text-align: center;
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#project-title:not(:empty) {
  color: var(--color-text-primary);
}
```

- [ ] **Step 4: Verify in browser**

Open `index.html`. Expected:
- Brand "FrameForge" left-aligned
- "New Brief" (blue) | Load JSON + Load Images | project-title (centered, empty) | safe-zone icon | "Preview All" + "Export This" (green) + "Export All" (green) | trash icon (danger)
- Separators between each group
- Buttons are disabled until a project loads

- [ ] **Step 5: Commit**

```bash
git add ui/shell.js styles/shell.css
git commit -m "feat: reorganize toolbar into 5 logical groups with workflow order"
```

---

## Task 3: Add resize handle to left panel HTML + CSS

**Files:**
- Modify: `index.html:38-44`
- Modify: `styles/shell.css:118-165`

- [ ] **Step 1: Add handle element to `index.html`**

Find this block in `index.html` (lines 36–47):
```html
      <div id="filmstrip-list" role="listbox" aria-label="Frame list">
        <!-- Populated by filmstrip.js -->
      </div>

      <!-- Image Tray: drag thumbnails from here onto a frame to assign -->
      <div class="image-tray-header">
```

Replace with:
```html
      <div id="filmstrip-list" role="listbox" aria-label="Frame list">
        <!-- Populated by filmstrip.js -->
      </div>

      <!-- Resize handle between frames and images -->
      <div id="left-panel-resize" aria-hidden="true"></div>

      <!-- Image Tray: drag thumbnails from here onto a frame to assign -->
      <div class="image-tray-header">
```

- [ ] **Step 2: Update left panel CSS in `styles/shell.css`**

Find `#filmstrip-list` block (lines 118–126) and replace it:
```css
#filmstrip-list {
  height: 170px; /* default — overridden by initLeftPanelResize() */
  min-height: 80px;
  overflow-y: auto;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
```

Find `#image-tray-list` block (lines 156–165) and replace it:
```css
#image-tray-list {
  flex: 1;
  min-height: 80px;
  overflow-y: auto;
  padding: var(--space-3);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-content: flex-start;
}
```

Add the resize handle styles right before `/* ── Image Tray ── */` (before line 128):
```css
/* ── Left panel resize handle ─────────────────────────────────────────────── */

#left-panel-resize {
  height: 6px;
  background: var(--color-bg-panel);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  cursor: row-resize;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast);
}

#left-panel-resize:hover,
#left-panel-resize.dragging {
  background: var(--color-bg-surface);
}

#left-panel-resize::after {
  content: '';
  width: 24px;
  height: 2px;
  background: var(--color-border-light);
  border-radius: 1px;
}
```

- [ ] **Step 3: Verify in browser**

Open `index.html`. Expected:
- A thin horizontal line is visible between the Frames and Images sections in the left panel
- Cursor changes to `row-resize` on hover
- Background lightens slightly on hover

- [ ] **Step 4: Commit**

```bash
git add index.html styles/shell.css
git commit -m "feat: add resize handle between filmstrip and image tray"
```

---

## Task 4: Wire resize drag logic

**Files:**
- Modify: `ui/shell.js` (add `initLeftPanelResize` after line 437)
- Modify: `app.js:14-18` (import) and `app.js:80` (call)

- [ ] **Step 1: Add `initLeftPanelResize` to `ui/shell.js`**

Append the following after the `escHtml` helper at the end of `ui/shell.js` (after line 437):

```javascript
// ── Left panel resize ─────────────────────────────────────────────────────

const _FILMSTRIP_HEIGHT_KEY     = 'frameforge_filmstrip_height';
const _FILMSTRIP_HEIGHT_DEFAULT = 170;
const _FILMSTRIP_HEIGHT_MIN     = 80;

/**
 * Wire up the drag handle between #filmstrip-list and #image-tray-list.
 * Persists the chosen height in localStorage.
 */
export function initLeftPanelResize() {
  const handle      = document.getElementById('left-panel-resize');
  const filmstripList = document.getElementById('filmstrip-list');
  const filmstrip   = document.getElementById('filmstrip');
  if (!handle || !filmstripList || !filmstrip) return;

  // Restore persisted height
  const saved   = parseInt(localStorage.getItem(_FILMSTRIP_HEIGHT_KEY), 10);
  const initial = Number.isFinite(saved) ? saved : _FILMSTRIP_HEIGHT_DEFAULT;
  filmstripList.style.height = `${initial}px`;

  let startY = 0;
  let startH = 0;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startY = e.clientY;
    startH = filmstripList.getBoundingClientRect().height;
    handle.classList.add('dragging');

    const onMove = (ev) => {
      const delta  = ev.clientY - startY;
      const panelH = filmstrip.getBoundingClientRect().height;
      const maxH   = panelH - _FILMSTRIP_HEIGHT_MIN - 6; // 6px handle height
      const newH   = Math.max(_FILMSTRIP_HEIGHT_MIN, Math.min(startH + delta, maxH));
      filmstripList.style.height = `${newH}px`;
    };

    const onUp = () => {
      handle.classList.remove('dragging');
      localStorage.setItem(_FILMSTRIP_HEIGHT_KEY, parseInt(filmstripList.style.height, 10));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}
```

- [ ] **Step 2: Add `initLeftPanelResize` to the import in `app.js`**

Find line 14–18 in `app.js`:
```javascript
import {
  StatusBar, ToastManager, ProgressOverlay, ContextMenu,
  buildToolbar, updateToolbarState, registerKeyboardShortcuts,
  showConfirm,
} from './ui/shell.js';
```

Replace with:
```javascript
import {
  StatusBar, ToastManager, ProgressOverlay, ContextMenu,
  buildToolbar, updateToolbarState, registerKeyboardShortcuts,
  showConfirm, initLeftPanelResize,
} from './ui/shell.js';
```

- [ ] **Step 3: Call `initLeftPanelResize` in `app.js`**

Find line 80 in `app.js`:
```javascript
  const tb = buildToolbar(toolbarEl);
```

Replace with:
```javascript
  const tb = buildToolbar(toolbarEl);
  initLeftPanelResize();
```

- [ ] **Step 4: Verify in browser**

Open `index.html`. Expected:
- Drag the handle between Frames and Images — both sections resize smoothly
- Filmstrip section can be made larger or smaller; images section fills the remainder
- Refresh the page — the filmstrip height is restored to what you left it at (persisted in localStorage)
- Minimum filmstrip height: 80px (won't shrink further)

- [ ] **Step 5: Commit**

```bash
git add ui/shell.js app.js
git commit -m "feat: left panel resize handle with localStorage persistence"
```

---

## Task 5: Filmstrip compact row layout

**Files:**
- Modify: `styles/shell.css:190-284`
- Modify: `ui/filmstrip.js:7` and `ui/filmstrip.js:77-148`

- [ ] **Step 1: Replace filmstrip item CSS in `styles/shell.css`**

Find and replace the entire block from `.filmstrip-item {` (line 191) through `.filmstrip-assign-badge {` closing `}` (line 284) with:

```css
/* Filmstrip frame item — compact horizontal row */
.filmstrip-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 5px var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  min-width: 0;
  flex-shrink: 0;
  position: relative;
}

.filmstrip-item:hover {
  background: var(--color-bg-surface);
  border-color: var(--color-border);
  border-left-color: var(--color-border);
}

.filmstrip-item.active {
  background: var(--color-bg-panel-alt);
  border-color: transparent;
  border-left-color: var(--color-accent);
}

.filmstrip-item canvas {
  display: block;
  flex-shrink: 0;
  border-radius: 3px;
  background: var(--color-bg-surface);
}

.filmstrip-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.filmstrip-item-index {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  line-height: 1.2;
}

.filmstrip-item.active .filmstrip-item-index {
  color: var(--color-accent);
}

.filmstrip-item-id {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  line-height: 1.3;
}

.filmstrip-item.active .filmstrip-item-id {
  color: var(--color-text-primary);
}

.filmstrip-item-status {
  font-size: 10px;
  flex-shrink: 0;
  margin-left: auto;
}

.filmstrip-assign-badge {
  font-size: 9px;
  font-family: var(--font-mono);
  color: var(--color-accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.status-ok      { color: var(--color-success); }
.status-warn    { color: var(--color-warning); }
.status-error   { color: var(--color-error); }
.status-pending { color: var(--color-text-secondary); }

/* Filmstrip item drag-over state */
.filmstrip-item.drag-over {
  background: rgba(91,138,255,0.08);
  border-color: var(--color-accent);
  border-left-color: var(--color-accent);
}
```

- [ ] **Step 2: Change `THUMB_WIDTH` in `ui/filmstrip.js`**

Find line 7 in `ui/filmstrip.js`:
```javascript
const THUMB_WIDTH = 152;
```

Replace with:
```javascript
const THUMB_WIDTH = 44;
```

- [ ] **Step 3: Rewrite `_buildItem` in `ui/filmstrip.js`**

Find the `_buildItem` method (lines 77–149) and replace it entirely with:

```javascript
  /**
   * Build a single filmstrip item element — compact horizontal row.
   * @returns {{ el: HTMLElement, canvas: HTMLCanvasElement }}
   */
  _buildItem(frame, index, project) {
    const exp    = project.exportConfig;
    const aspect = (exp.height_px ?? 1350) / (exp.width_px ?? 1080);
    const thumbH = Math.round(THUMB_WIDTH * aspect);

    const canvas = document.createElement('canvas');
    canvas.width  = THUMB_WIDTH;
    canvas.height = thumbH;
    canvas.style.width  = `${THUMB_WIDTH}px`;
    canvas.style.height = `${thumbH}px`;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e1e2a';
    ctx.fillRect(0, 0, THUMB_WIDTH, thumbH);

    const el = document.createElement('div');
    el.className = 'filmstrip-item';
    el.dataset.index = index;
    el.innerHTML = `
      <div class="filmstrip-item-info">
        <span class="filmstrip-item-index">${index + 1}</span>
        <span class="filmstrip-item-id truncate" title="${escHtml(frame.id)}">${escHtml(frame.id)}</span>
        <span data-assign-badge class="filmstrip-assign-badge" style="display:none"></span>
      </div>
      <span class="filmstrip-item-status status-pending" data-status>⋯</span>
    `;
    el.insertBefore(canvas, el.firstChild);

    // Click → select frame
    el.addEventListener('click', () => {
      this.onFrameSelect?.(index);
    });

    // Drag-and-drop: accept image drops to assign
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget)) {
        el.classList.remove('drag-over');
      }
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const imageKey = e.dataTransfer.getData('text/plain');
      if (imageKey) this.onAssignImage?.(index, imageKey);
    });

    // Right-click → context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.contextMenu?.show(e.clientX, e.clientY, [
        {
          label: `Export frame ${index + 1}`,
          icon: '↓',
          action: () => this.onExportFrame?.(index),
        },
        { sep: true },
        {
          label: 'Copy frame ID',
          icon: '⎘',
          action: () => {
            navigator.clipboard?.writeText(frame.id).catch(() => {});
          },
        },
      ]);
    });

    return { el, canvas };
  }
```

- [ ] **Step 4: Update `showAssignment` in `ui/filmstrip.js` to use the in-row badge**

Find `showAssignment` (lines 249–269) and replace it:

```javascript
  /**
   * Show or clear the assignment badge on a filmstrip item row.
   * @param {number} frameIndex
   * @param {string|null} imageKey — null clears the badge
   */
  showAssignment(frameIndex, imageKey) {
    const items = this.container.querySelectorAll('.filmstrip-item');
    const item  = items[frameIndex];
    if (!item) return;

    const badge = item.querySelector('[data-assign-badge]');
    if (!badge) return;
    if (imageKey) {
      const label = imageKey.length > 13 ? imageKey.slice(0, 11) + '…' : imageKey;
      badge.textContent = `→ ${label}`;
      badge.style.display = '';
    } else {
      badge.textContent = '';
      badge.style.display = 'none';
    }
  }
```

- [ ] **Step 5: Verify in browser**

Load a project JSON with multiple frames. Expected:
- Each frame appears as a compact horizontal row: small thumbnail (44px wide) + frame number + frame id + status icon
- Active frame has a blue left border accent
- Status icons (✓/⚠/✗/⋯) appear at the right of each row
- Dragging an image onto a frame row shows the drag-over highlight
- Assigning an image shows `→ filename` below the frame id
- Filmstrip scrolls when there are many frames

- [ ] **Step 6: Commit**

```bash
git add styles/shell.css ui/filmstrip.js
git commit -m "feat: filmstrip compact row layout — thumbnails + id in horizontal rows"
```

---

## Task 6: Inspector section reorder + Export collapse

**Files:**
- Modify: `ui/inspector.js:7-160`
- Modify: `styles/shell.css` (add toggle styles at end of inspector section)

- [ ] **Step 1: Add module-level collapse state and constructor listener to `ui/inspector.js`**

At the top of `ui/inspector.js`, after the import line (line 5), add:

```javascript
/** Persists Export section collapsed state across Inspector rebuilds */
let _exportCollapsed = true;
```

In the `Inspector` constructor (lines 11–13), after `this.contentEl = contentEl;` add:

```javascript
    // Toggle Export section in-place without rebuilding the whole inspector
    this.contentEl.addEventListener('click', (e) => {
      if (!e.target.closest('[data-toggle-export]')) return;
      _exportCollapsed = !_exportCollapsed;
      const rows    = this.contentEl.querySelector('[data-export-rows]');
      const summary = this.contentEl.querySelector('[data-export-summary]');
      const chevron = this.contentEl.querySelector('[data-export-chevron]');
      if (rows)    rows.hidden    = _exportCollapsed;
      if (summary) summary.hidden = !_exportCollapsed;
      if (chevron) chevron.textContent = _exportCollapsed ? '▸' : '▾';
    });
```

- [ ] **Step 2: Rewrite `update()` innerHTML template in `ui/inspector.js`**

Find the `this.contentEl.innerHTML = \`` assignment (line 80) through its closing `\`;` (line 142). Replace the entire template with:

```javascript
    this.contentEl.innerHTML = `
      ${validation.warnings.length > 0 ? `
      <div class="inspector-section">
        <div class="inspector-section-title">Warnings</div>
        <div class="inspector-warning-list">
          ${validation.warnings.map((w) => `<div class="inspector-warning">${escHtml(w)}</div>`).join('')}
        </div>
      </div>` : ''}

      ${validation.errors.length > 0 ? `
      <div class="inspector-section">
        <div class="inspector-section-title">Errors</div>
        <div class="inspector-warning-list">
          ${validation.errors.map((e) => `<div class="inspector-error">${escHtml(e)}</div>`).join('')}
        </div>
      </div>` : ''}

      <!-- Frame info -->
      <div class="inspector-section">
        <div class="inspector-section-title">Frame</div>
        ${row('Index',    `${frameIndex + 1} / ${project.frameCount}`)}
        ${row('ID',       frame.id, true)}
        ${row('Layers',   layers.length)}
        ${row('Bg color', frame.background_color ?? globals.background_color ?? '#000000')}
      </div>

      <!-- Layer types -->
      <div class="inspector-section">
        <div class="inspector-section-title">Layers</div>
        ${renderLayerTypeBadges(typeCounts)}
      </div>

      <!-- Fonts -->
      <div class="inspector-section">
        <div class="inspector-section-title">Fonts</div>
        ${renderFontBadges(frameFonts, fontStatusMap)}
      </div>

      <!-- Images -->
      <div class="inspector-section">
        <div class="inspector-section-title">Images</div>
        ${renderImageStatus(referencedImgs, project, frameIndex)}
      </div>

      <!-- Export — collapsed by default -->
      <div class="inspector-section">
        <div class="inspector-section-title inspector-section-title-toggle" data-toggle-export>
          Export
          <span data-export-chevron>${_exportCollapsed ? '▸' : '▾'}</span>
        </div>
        <div data-export-summary class="inspector-export-summary" ${_exportCollapsed ? '' : 'hidden'}>
          ${escHtml(`${exp.width_px} × ${exp.height_px} · ${(exp.format ?? 'png').toUpperCase()} · ×${exp.scale_factor}`)}
        </div>
        <div data-export-rows ${_exportCollapsed ? 'hidden' : ''}>
          ${row('Target',  exp.target)}
          ${row('Size',    `${exp.width_px} × ${exp.height_px}`)}
          ${row('Scale',   `×${exp.scale_factor}`)}
          ${row('DPI',     exp.dpi)}
          ${row('Format',  exp.format?.toUpperCase())}
        </div>
      </div>

      ${project.data.image_index?.length ? `
      <!-- Image Index -->
      <div class="inspector-section">
        <div class="inspector-section-title">Image Index</div>
        ${renderImageIndex(project.data.image_index, frameIndex)}
      </div>` : ''}
    `;
```

- [ ] **Step 3: Add inspector toggle CSS to `styles/shell.css`**

At the end of the inspector section in `styles/shell.css` (after `.inspector-empty p`, around line 646), add:

```css
.inspector-section-title-toggle {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.inspector-section-title-toggle:hover {
  color: var(--color-text-primary);
}

.inspector-export-summary {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  margin-top: var(--space-2);
  padding: 2px 0;
}
```

- [ ] **Step 4: Verify in browser**

Load a project JSON. Expected:
- Inspector sections appear in order: Warnings (if any) → Errors (if any) → Frame → Layers → Fonts → Images → Export → Image Index (if present)
- Export section shows collapsed by default with a one-line summary (`1080 × 1350 · PNG · ×2`) and a `▸` chevron
- Clicking the Export section title expands it showing all rows and flips the chevron to `▾`
- Clicking again collapses it
- Switching frames preserves the collapsed/expanded state (doesn't reset)
- Loading a different project resets to collapsed (page refresh)

- [ ] **Step 5: Commit**

```bash
git add ui/inspector.js styles/shell.css
git commit -m "feat: inspector reordered sections with collapsible Export"
```
