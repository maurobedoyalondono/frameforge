# Briefs Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent brief management so users can save, list, edit, duplicate, delete, and re-export multiple project briefs from a dedicated "My Briefs" modal.

**Architecture:** New `brief-storage.js` module wraps localStorage CRUD; new `brief-manager.js` renders a two-panel modal (list + detail); `concept-builder.js` gains a `briefId` open-parameter, `_briefId` state, `_autoSave()`, and a "My Briefs" header link; `shell.js` adds the toolbar button; `app.js` wires everything together.

**Tech Stack:** Vanilla JS ES2022 modules, HTML5 localStorage, no build step. All files are imported directly by the browser.

---

## File Map

| File | Change |
|---|---|
| `modules/brief-storage.js` | **New** — CRUD for briefs in localStorage |
| `ui/brief-manager.js` | **New** — "My Briefs" two-panel modal |
| `ui/concept-builder.js` | **Modified** — `open(onImages, briefId)`, `_briefId`, `_autoSave()`, header link |
| `ui/shell.js` | **Modified** — "My Briefs" toolbar button |
| `app.js` | **Modified** — instantiate BriefManager, wire toolbar button |
| `styles/components.css` | **Modified** — `.bm-*` styles for BriefManager |
| `docs/spec-app.md` | **Modified** — Part X §10.2/§10.3 tweaks + new Part XI |

---

## Task 1: `modules/brief-storage.js` — Brief CRUD

**Files:**
- Create: `modules/brief-storage.js`

### localStorage keys

```
frameforge_briefs            → JSON array of index entries
frameforge_brief_{id}        → Full brief JSON object
```

Index entry shape: `{ id, title, slug, platform, imageCount, created, updated }`

Full brief shape (all fields):
```js
{
  id, title, slug, platform, customW, customH,
  story, notes, tone, toneCustom,
  thumbRatioVal, thumbCustomW, thumbCustomH,
  imageCount, created, updated
}
```

- [ ] **Step 1: Create `modules/brief-storage.js`**

```js
/**
 * brief-storage.js — localStorage CRUD for FrameForge project briefs.
 *
 * Keys:
 *   frameforge_briefs          → JSON array of index entries { id, title, slug, platform, imageCount, created, updated }
 *   frameforge_brief_{id}      → Full brief JSON object
 */

const PREFIX    = 'frameforge';
const KEY_INDEX = `${PREFIX}_briefs`;
const briefKey  = (id) => `${PREFIX}_brief_${id}`;

// ── Index helpers ────────────────────────────────────────────────────────────

function loadIndex() {
  try {
    const raw = localStorage.getItem(KEY_INDEX);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIndex(index) {
  try {
    localStorage.setItem(KEY_INDEX, JSON.stringify(index));
  } catch (e) {
    console.warn('[brief-storage] saveIndex failed:', e);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Upsert a brief.  Generates `id` if absent. Sets `created` on first save.
 * Always updates `updated`.
 * @param {object} brief — partial or full brief object
 * @returns {string} id of saved brief
 */
export function save(brief) {
  const now = new Date().toISOString().slice(0, 10);
  if (!brief.id) brief.id = `brief_${Date.now()}`;
  if (!brief.created) brief.created = now;
  brief.updated = now;

  try {
    localStorage.setItem(briefKey(brief.id), JSON.stringify(brief));
  } catch (e) {
    throw new Error(`Failed to save brief (storage quota?): ${e.message}`);
  }

  // Upsert index entry
  const index = loadIndex();
  const pos   = index.findIndex((e) => e.id === brief.id);
  const entry = {
    id:         brief.id,
    title:      brief.title      || '(untitled)',
    slug:       brief.slug       || '',
    platform:   brief.platform   || '',
    imageCount: brief.imageCount ?? 0,
    created:    brief.created,
    updated:    brief.updated,
  };
  if (pos >= 0) {
    index[pos] = entry;
  } else {
    index.push(entry);
  }
  saveIndex(index);

  return brief.id;
}

/**
 * Load a full brief by id.
 * @param {string} id
 * @returns {object|null}
 */
export function load(id) {
  try {
    const raw = localStorage.getItem(briefKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`[brief-storage] load(${id}) failed:`, e);
    return null;
  }
}

/**
 * Return index array sorted by updated desc (most recent first).
 * @returns {object[]}
 */
export function list() {
  return loadIndex().slice().sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''));
}

/**
 * Delete a brief and its index entry.
 * @param {string} id
 */
export function remove(id) {
  localStorage.removeItem(briefKey(id));
  saveIndex(loadIndex().filter((e) => e.id !== id));
}
```

- [ ] **Step 2: Commit**

```bash
git add modules/brief-storage.js
git commit -m "feat: add brief-storage.js — localStorage CRUD for briefs"
```

---

## Task 2: `styles/components.css` — BriefManager styles

**Files:**
- Modify: `styles/components.css` (append `.bm-*` rules at end of file)

The BriefManager modal uses `.bm-` prefix for all its classes to avoid collisions.

- [ ] **Step 1: Open `styles/components.css` and append the following block at the very end of the file**

```css
/* ── BriefManager (.bm-*) ──────────────────────────────────────────────── */

.bm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.bm-modal {
  background: var(--color-surface, #1e1e1e);
  border: 1px solid var(--color-border, #333);
  border-radius: 10px;
  width: min(900px, 94vw);
  height: min(600px, 88vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,.55);
}

.bm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 12px;
  border-bottom: 1px solid var(--color-border, #333);
  flex-shrink: 0;
}

.bm-header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text, #e0e0e0);
}

.bm-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── List panel ─────────────────────────────────────────────────────────── */

.bm-list-panel {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border, #333);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bm-list-toolbar {
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px solid var(--color-border, #333);
  flex-shrink: 0;
}

.bm-search {
  width: 100%;
  box-sizing: border-box;
}

.bm-sort {
  width: 100%;
  box-sizing: border-box;
  font-size: 11px;
}

.bm-list-items {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.bm-list-footer {
  padding: 10px 12px;
  border-top: 1px solid var(--color-border, #333);
  flex-shrink: 0;
}

.bm-list-footer .btn {
  width: 100%;
}

.bm-item {
  padding: 9px 12px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.1s;
}

.bm-item:hover {
  background: var(--color-hover, rgba(255,255,255,.05));
}

.bm-item.selected {
  border-left-color: var(--color-accent, #4d9eff);
  background: var(--color-hover, rgba(77,158,255,.08));
}

.bm-item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text, #e0e0e0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bm-item-meta {
  font-size: 11px;
  color: var(--color-text-muted, #888);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 10px;
  color: var(--color-text-muted, #888);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

/* ── Detail panel ───────────────────────────────────────────────────────── */

.bm-detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bm-detail-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted, #888);
  font-size: 13px;
}

.bm-detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bm-detail-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text, #e0e0e0);
  line-height: 1.3;
}

.bm-detail-row {
  display: flex;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted, #888);
}

.bm-detail-row strong {
  color: var(--color-text, #e0e0e0);
  font-weight: 500;
}

.bm-detail-story {
  font-size: 13px;
  color: var(--color-text, #e0e0e0);
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.bm-detail-story.expanded {
  -webkit-line-clamp: unset;
}

.bm-story-expand {
  font-size: 11px;
  color: var(--color-accent, #4d9eff);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  margin-top: 2px;
  text-align: left;
}

.bm-detail-images-note {
  font-size: 11px;
  color: var(--color-text-muted, #888);
  font-style: italic;
}

.bm-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 24px 20px;
  border-top: 1px solid var(--color-border, #333);
  padding-top: 16px;
  flex-shrink: 0;
}

.bm-delete-confirm {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text, #e0e0e0);
  padding: 0 24px 16px;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add styles/components.css
git commit -m "feat: add .bm-* CSS for BriefManager modal"
```

---

## Task 3: `ui/brief-manager.js` — My Briefs modal

**Files:**
- Create: `ui/brief-manager.js`

The BriefManager renders a two-panel modal. Left panel: search + sort + brief list. Right panel: detail card for selected brief with action buttons. The class receives `briefStorage` (the storage module) and an `openConceptBuilder` callback.

- [ ] **Step 1: Create `ui/brief-manager.js`**

```js
/**
 * brief-manager.js — "My Briefs" two-panel modal.
 *
 * Usage:
 *   const bm = new BriefManager(briefStorage, (briefId) => conceptBuilder.open(onImages, briefId));
 *   bm.open();
 */

import * as briefStorage from '../modules/brief-storage.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (isoDate === today)     return 'Today';
  if (isoDate === yesterday) return 'Yesterday';
  // "Mar 25" format
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function platformLabel(platformValue) {
  const MAP = {
    'instagram-portrait': 'Instagram Portrait',
    'instagram-square':   'Instagram Square',
    'instagram-story':    'Instagram Story',
    'facebook-feed':      'Facebook Feed',
    'facebook-cover':     'Facebook Cover',
    'print-a4-portrait':  'Print A4 Portrait',
    'print-a4-landscape': 'Print A4 Landscape',
    'custom':             'Custom',
  };
  return MAP[platformValue] ?? platformValue ?? '';
}

// ── BriefManager ─────────────────────────────────────────────────────────────

export class BriefManager {
  /**
   * @param {object} storage — briefStorage module (save, load, list, remove)
   * @param {function(string|null): void} openConceptBuilder — called with briefId or null for new
   */
  constructor(storage, openConceptBuilder) {
    this._storage             = storage;
    this._openConceptBuilder  = openConceptBuilder;
    this._backdrop            = null;
    this._selectedId          = null;
    this._searchQuery         = '';
    this._sortMode            = 'updated';  // 'updated' | 'title' | 'created'
    this._deleteConfirmId     = null;
    this._storyExpanded       = false;
  }

  open() {
    if (this._backdrop) return;
    this._selectedId      = null;
    this._searchQuery     = '';
    this._sortMode        = 'updated';
    this._deleteConfirmId = null;
    this._storyExpanded   = false;
    this._render();
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  _render() {
    if (this._backdrop) {
      this._backdrop.remove();
      this._backdrop = null;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'bm-backdrop';
    backdrop.innerHTML = `
      <div class="bm-modal" role="dialog" aria-modal="true" aria-label="My Briefs">

        <div class="bm-header">
          <span class="bm-header-title">My Briefs</span>
          <button class="btn btn-ghost btn-icon bm-close" aria-label="Close">✕</button>
        </div>

        <div class="bm-body">
          <div class="bm-list-panel">
            <div class="bm-list-toolbar">
              <input type="text" class="input bm-search" id="bm-search"
                placeholder="Search briefs…" value="${escHtml(this._searchQuery)}" autocomplete="off">
              <select class="input bm-sort" id="bm-sort">
                <option value="updated" ${this._sortMode === 'updated' ? 'selected' : ''}>Last updated</option>
                <option value="title"   ${this._sortMode === 'title'   ? 'selected' : ''}>Title A→Z</option>
                <option value="created" ${this._sortMode === 'created' ? 'selected' : ''}>Created</option>
              </select>
            </div>
            <div class="bm-list-items" id="bm-list-items">
              ${this._renderListItems()}
            </div>
            <div class="bm-list-footer">
              <button class="btn btn-secondary btn-sm" id="bm-new">+ New Brief</button>
            </div>
          </div>

          <div class="bm-detail-panel" id="bm-detail-panel">
            ${this._renderDetail()}
          </div>
        </div>

      </div>
    `;

    this._backdrop = backdrop;
    document.body.appendChild(backdrop);
    this._bindEvents();
  }

  _getFilteredSorted() {
    let items = this._storage.list();  // already sorted by updated desc

    // Filter
    if (this._searchQuery.trim()) {
      const q = this._searchQuery.trim().toLowerCase();
      items = items.filter((b) => b.title.toLowerCase().includes(q));
    }

    // Sort
    if (this._sortMode === 'title') {
      items = items.slice().sort((a, b) => a.title.localeCompare(b.title));
    } else if (this._sortMode === 'created') {
      items = items.slice().sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
    }
    // 'updated' is already the default order from list()

    return items;
  }

  _renderListItems() {
    const allBriefs = this._storage.list();

    if (allBriefs.length === 0) {
      return `<div class="bm-empty">
        <div>No briefs yet.</div>
        <button class="btn btn-secondary btn-sm" id="bm-empty-create">+ Create your first brief</button>
      </div>`;
    }

    const items = this._getFilteredSorted();

    if (items.length === 0) {
      return `<div class="bm-empty"><div>No briefs match your search.</div></div>`;
    }

    return items.map((b) => `
      <div class="bm-item ${b.id === this._selectedId ? 'selected' : ''}"
           data-id="${escHtml(b.id)}">
        <div class="bm-item-title">${escHtml(b.title || '(untitled)')}</div>
        <div class="bm-item-meta">
          ${escHtml(platformLabel(b.platform))}${b.imageCount ? ` · ${b.imageCount} img` : ''}
          · ${formatDate(b.updated)}
        </div>
      </div>
    `).join('');
  }

  _renderDetail() {
    if (!this._selectedId) {
      return `<div class="bm-detail-empty">Select a brief to see details</div>`;
    }

    const brief = this._storage.load(this._selectedId);
    if (!brief) {
      return `<div class="bm-detail-empty">Brief not found.</div>`;
    }

    const plat = platformLabel(brief.platform);
    const dims = brief.platform === 'custom'
      ? (brief.customW && brief.customH ? ` (${brief.customW}×${brief.customH}px)` : '')
      : '';

    const toneTxt = brief.tone === 'custom'
      ? (brief.toneCustom || '')
      : brief.tone
        ? brief.tone.replace(/-/g, ' ')
        : 'Let the AI decide';

    const storyHtml = brief.story
      ? `<div class="bm-detail-story ${this._storyExpanded ? 'expanded' : ''}" id="bm-detail-story">
           ${escHtml(brief.story)}
         </div>
         <button class="bm-story-expand" id="bm-story-expand">
           ${this._storyExpanded ? 'Show less' : 'Show more'}
         </button>`
      : `<div class="bm-detail-row"><em style="color:var(--color-text-muted,#888)">No story</em></div>`;

    const deleteHtml = this._deleteConfirmId === brief.id
      ? `<div class="bm-delete-confirm">
           Delete this brief?
           <button class="btn btn-danger btn-sm" id="bm-delete-confirm-yes">Delete</button>
           <button class="btn btn-ghost btn-sm"  id="bm-delete-confirm-no">Cancel</button>
         </div>`
      : '';

    return `
      <div class="bm-detail-content">
        <div class="bm-detail-title">${escHtml(brief.title || '(untitled)')}</div>
        <div class="bm-detail-row">
          <strong>${escHtml(plat)}${escHtml(dims)}</strong>
        </div>
        <div class="bm-detail-row">Tone: <strong>${escHtml(toneTxt)}</strong></div>
        ${storyHtml}
        ${brief.imageCount
          ? `<div class="bm-detail-images-note">${brief.imageCount} image${brief.imageCount !== 1 ? 's' : ''} loaded last time</div>`
          : ''}
        <div class="bm-detail-row" style="font-size:11px;color:var(--color-text-muted,#888)">
          Last updated: ${formatDate(brief.updated)}
        </div>
      </div>

      <div class="bm-detail-actions">
        <button class="btn btn-primary btn-sm"    id="bm-action-edit">Edit</button>
        <button class="btn btn-secondary btn-sm"  id="bm-action-export">Export Package</button>
        <button class="btn btn-ghost btn-sm"      id="bm-action-copy">Copy Prompt</button>
        <button class="btn btn-ghost btn-sm"      id="bm-action-duplicate">Duplicate</button>
        <button class="btn btn-ghost btn-sm btn-danger" id="bm-action-delete">Delete</button>
      </div>

      ${deleteHtml}
    `;
  }

  _refreshDetail() {
    const panel = this._backdrop?.querySelector('#bm-detail-panel');
    if (panel) {
      panel.innerHTML = this._renderDetail();
      this._bindDetailEvents();
    }
  }

  _refreshList() {
    const list = this._backdrop?.querySelector('#bm-list-items');
    if (list) {
      list.innerHTML = this._renderListItems();
      this._bindListItemEvents();
    }
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  _bindEvents() {
    const b = this._backdrop;

    b.querySelector('.bm-close').addEventListener('click', () => this._close());
    b.addEventListener('click', (e) => { if (e.target === b) this._close(); });

    document.addEventListener('keydown', this._onKeyDown = (e) => {
      if (e.key === 'Escape') this._close();
    });

    b.querySelector('#bm-search').addEventListener('input', (e) => {
      this._searchQuery = e.target.value;
      this._refreshList();
    });

    b.querySelector('#bm-sort').addEventListener('change', (e) => {
      this._sortMode = e.target.value;
      this._refreshList();
    });

    b.querySelector('#bm-new').addEventListener('click', () => {
      this._close();
      this._openConceptBuilder(null);
    });

    this._bindListItemEvents();
    this._bindDetailEvents();
  }

  _bindListItemEvents() {
    const b = this._backdrop;
    if (!b) return;

    // Empty state "Create first brief" button
    b.querySelector('#bm-empty-create')?.addEventListener('click', () => {
      this._close();
      this._openConceptBuilder(null);
    });

    b.querySelectorAll('.bm-item').forEach((el) => {
      el.addEventListener('click', () => {
        this._selectedId      = el.dataset.id;
        this._deleteConfirmId = null;
        this._storyExpanded   = false;
        b.querySelectorAll('.bm-item').forEach((i) => i.classList.remove('selected'));
        el.classList.add('selected');
        this._refreshDetail();
      });
    });
  }

  _bindDetailEvents() {
    const b = this._backdrop;
    if (!b || !this._selectedId) return;

    b.querySelector('#bm-story-expand')?.addEventListener('click', () => {
      this._storyExpanded = !this._storyExpanded;
      const story = b.querySelector('#bm-detail-story');
      const btn   = b.querySelector('#bm-story-expand');
      if (story) story.classList.toggle('expanded', this._storyExpanded);
      if (btn)   btn.textContent = this._storyExpanded ? 'Show less' : 'Show more';
    });

    b.querySelector('#bm-action-edit')?.addEventListener('click', () => {
      const id = this._selectedId;
      this._close();
      this._openConceptBuilder(id);
    });

    b.querySelector('#bm-action-export')?.addEventListener('click', () => {
      const id = this._selectedId;
      this._close();
      // Open wizard at step 4 (export) by passing briefId — concept-builder handles this
      this._openConceptBuilder(id, 4);
    });

    b.querySelector('#bm-action-copy')?.addEventListener('click', () => {
      this._doCopyPrompt(this._selectedId);
    });

    b.querySelector('#bm-action-duplicate')?.addEventListener('click', () => {
      this._doDuplicate(this._selectedId);
    });

    b.querySelector('#bm-action-delete')?.addEventListener('click', () => {
      this._deleteConfirmId = this._selectedId;
      this._refreshDetail();
    });

    b.querySelector('#bm-delete-confirm-yes')?.addEventListener('click', () => {
      this._storage.remove(this._selectedId);
      this._selectedId      = null;
      this._deleteConfirmId = null;
      this._refreshList();
      this._refreshDetail();
    });

    b.querySelector('#bm-delete-confirm-no')?.addEventListener('click', () => {
      this._deleteConfirmId = null;
      this._refreshDetail();
    });
  }

  _doDuplicate(id) {
    const brief = this._storage.load(id);
    if (!brief) return;
    const copy = {
      ...brief,
      id:      null,  // save() will generate new id
      title:   (brief.title || '(untitled)') + ' (copy)',
      created: null,  // save() will set created
    };
    const newId = this._storage.save(copy);
    this._selectedId = newId;
    this._refreshList();
    this._refreshDetail();
  }

  _doCopyPrompt(id) {
    const brief = this._storage.load(id);
    if (!brief) return;
    const text = this._buildPromptFromBrief(brief);
    const btn = this._backdrop?.querySelector('#bm-action-copy');
    const restore = () => { if (btn) btn.textContent = 'Copy Prompt'; };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(restore, 2000); }
      }).catch(() => this._fallbackCopy(text, () => {
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(restore, 2000); }
      }));
    } else {
      this._fallbackCopy(text, () => {
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(restore, 2000); }
      });
    }
  }

  _buildPromptFromBrief(brief) {
    const PLATFORM_MAP = {
      'instagram-portrait': { label: 'Instagram Portrait 4:5 (1080×1350)', w: 1080, h: 1350, dpi: 72  },
      'instagram-square':   { label: 'Instagram Square 1:1 (1080×1080)',   w: 1080, h: 1080, dpi: 72  },
      'instagram-story':    { label: 'Instagram Story 9:16 (1080×1920)',   w: 1080, h: 1920, dpi: 72  },
      'facebook-feed':      { label: 'Facebook Feed (1200×630)',            w: 1200, h:  630, dpi: 72  },
      'facebook-cover':     { label: 'Facebook Cover (820×312)',            w:  820, h:  312, dpi: 72  },
      'print-a4-portrait':  { label: 'Print A4 Portrait (2480×3508)',       w: 2480, h: 3508, dpi: 300 },
      'print-a4-landscape': { label: 'Print A4 Landscape (3508×2480)',      w: 3508, h: 2480, dpi: 300 },
    };

    const preset = PLATFORM_MAP[brief.platform] ?? { label: brief.platform, w: parseInt(brief.customW)||1080, h: parseInt(brief.customH)||1080, dpi: 72 };
    const toneTxt = brief.tone === 'custom'
      ? (brief.toneCustom || '')
      : brief.tone
        ? brief.tone.replace(/-/g, ' ')
        : 'Let the AI decide based on the story and images';

    return `I'm working on a photography project and need you to design FrameForge layouts for it.
I'm attaching:

- The FrameForge brief file (full technical instructions for generating the JSON)
- Sample design mockups (layout references — study element sizes and zones)
- Thumbnail sheets with all images numbered

**Project:** ${brief.title || '(untitled)'}
**Platform:** ${preset.label}
**Story:** ${brief.story || '(no story provided)'}
**Tone:** ${toneTxt}
${brief.notes ? `**Notes:** ${brief.notes}` : ''}
**Images:** ${brief.imageCount || 0} image${(brief.imageCount || 0) !== 1 ? 's' : ''}

Please generate a FrameForge JSON layout following all instructions in the brief file.
Output only the raw JSON — no markdown fences, no explanation.
`;
  }

  _fallbackCopy(text, callback) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    callback?.();
  }

  _close() {
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
    this._backdrop?.remove();
    this._backdrop = null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/brief-manager.js
git commit -m "feat: add brief-manager.js — My Briefs two-panel modal"
```

---

## Task 4: `ui/concept-builder.js` — briefId param, `_briefId` state, `_autoSave()`, header link

**Files:**
- Modify: `ui/concept-builder.js`

Four changes:
1. Add `import * as briefStorage` at top
2. Add `_briefId = null` to constructor state
3. Change `open(onImages)` → `open(onImages, briefId = null, startStep = 1)` and load brief if `briefId` provided
4. Add `_autoSave()` and call it from `_goTo()` and title input handler
5. Add "My Briefs" link in modal header, stored `_onOpenBriefManager` callback

**Note on `openAtStep`:** The spec says Export Package action opens ConceptBuilder pre-filled at Step 4. We implement this via `startStep` parameter passed through `open()`.

- [ ] **Step 1: Add `briefStorage` import at top of `concept-builder.js`**

Find the existing imports block (lines 11-16):
```js
import { AI_MANUAL } from '../data/ai-manual-content.js';
import { generateMockups } from './brief-mockups.js';
import {
  THUMB_BASE, THUMB_COLS, THUMB_ROWS,
  fileToImageElement, generateThumbnailSheets,
} from './brief-thumbnails.js';
```

Replace with:
```js
import { AI_MANUAL } from '../data/ai-manual-content.js';
import { generateMockups } from './brief-mockups.js';
import {
  THUMB_BASE, THUMB_COLS, THUMB_ROWS,
  fileToImageElement, generateThumbnailSheets,
} from './brief-thumbnails.js';
import * as briefStorage from '../modules/brief-storage.js';
```

- [ ] **Step 2: Add `_briefId` and `_onOpenBriefManager` to constructor**

Find in `constructor()`:
```js
    this._backdrop   = null;
    this._step       = 1;
    this._onImages   = null;
    this._onKeyDown  = null;
```

Replace with:
```js
    this._backdrop            = null;
    this._step                = 1;
    this._onImages            = null;
    this._onKeyDown           = null;
    this._briefId             = null;
    this._onOpenBriefManager  = null;
```

- [ ] **Step 3: Update `open()` to accept `briefId` and `startStep`, and pre-fill state**

Find:
```js
  open(onImages) {
    if (this._backdrop) return;

    // Reset state
    this._step          = 1;
    this._onImages      = onImages ?? null;
    this._title         = '';
    this._platform      = 'instagram-portrait';
    this._customW       = '';
    this._customH       = '';
    this._story         = '';
    this._notes         = '';
    this._tone          = '';
    this._toneCustom    = '';
    this._imageFiles    = [];
    this._imageElements = [];
    this._previewUrls   = [];
    this._thumbRatioVal = '1x1';
    this._thumbCustomW  = String(THUMB_BASE);
    this._thumbCustomH  = String(THUMB_BASE);

    this._render();
  }
```

Replace with:
```js
  /**
   * Open the wizard.
   * @param {function(File[]): void} onImages  — called when user selects images; forwards to Image Tray.
   * @param {string|null} briefId — if set, load this brief and pre-fill all state fields.
   * @param {number} [startStep=1] — step to open at (e.g. 4 for direct Export Package).
   */
  open(onImages, briefId = null, startStep = 1) {
    if (this._backdrop) return;

    // Reset state
    this._step          = startStep;
    this._onImages      = onImages ?? null;
    this._briefId       = null;
    this._title         = '';
    this._platform      = 'instagram-portrait';
    this._customW       = '';
    this._customH       = '';
    this._story         = '';
    this._notes         = '';
    this._tone          = '';
    this._toneCustom    = '';
    this._imageFiles    = [];
    this._imageElements = [];
    this._previewUrls   = [];
    this._thumbRatioVal = '1x1';
    this._thumbCustomW  = String(THUMB_BASE);
    this._thumbCustomH  = String(THUMB_BASE);

    // Pre-fill from saved brief if briefId provided
    if (briefId) {
      const saved = briefStorage.load(briefId);
      if (saved) {
        this._briefId       = saved.id;
        this._title         = saved.title         ?? '';
        this._platform      = saved.platform      ?? 'instagram-portrait';
        this._customW       = saved.customW        ?? '';
        this._customH       = saved.customH        ?? '';
        this._story         = saved.story          ?? '';
        this._notes         = saved.notes          ?? '';
        this._tone          = saved.tone           ?? '';
        this._toneCustom    = saved.toneCustom     ?? '';
        this._thumbRatioVal = saved.thumbRatioVal  ?? '1x1';
        this._thumbCustomW  = saved.thumbCustomW   ?? String(THUMB_BASE);
        this._thumbCustomH  = saved.thumbCustomH   ?? String(THUMB_BASE);
      }
    }

    this._render();
  }
```

- [ ] **Step 4: Add "≡ My Briefs" link to modal header**

Find in `_render()`:
```js
        <div class="cb-header">
          <div class="cb-header-left">
            <span class="cb-title">New Project Brief</span>
            <span class="cb-subtitle">Fill this in, then share the exported package + your photos with the AI model</span>
          </div>
          <button class="btn btn-ghost btn-icon cb-close" aria-label="Close">✕</button>
        </div>
```

Replace with:
```js
        <div class="cb-header">
          <div class="cb-header-left">
            <span class="cb-title">New Project Brief</span>
            <span class="cb-subtitle">Fill this in, then share the exported package + your photos with the AI model</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-ghost btn-sm cb-my-briefs-link" style="font-size:12px">≡ My Briefs</button>
            <button class="btn btn-ghost btn-icon cb-close" aria-label="Close">✕</button>
          </div>
        </div>
```

- [ ] **Step 5: Wire the "My Briefs" header link in `_bindEvents()`**

Find in `_bindEvents()`:
```js
    // Close
    b.querySelector('.cb-close').addEventListener('click', () => this._close());
    b.querySelector('#cb-close-final')?.addEventListener('click', () => this._close());
    b.addEventListener('click', (e) => { if (e.target === b) this._close(); });
```

Replace with:
```js
    // Close
    b.querySelector('.cb-close').addEventListener('click', () => this._close());
    b.querySelector('#cb-close-final')?.addEventListener('click', () => this._close());
    b.addEventListener('click', (e) => { if (e.target === b) this._close(); });

    // My Briefs header link
    b.querySelector('.cb-my-briefs-link')?.addEventListener('click', () => {
      this._close();
      this._onOpenBriefManager?.();
    });
```

- [ ] **Step 6: Add `_autoSave()` method**

Find the `_close(preserveState = false)` method:
```js
  _close(preserveState = false) {
```

Insert the following method immediately before `_close`:
```js
  // ── Auto-save ───────────────────────────────────────────────────────────────

  _autoSave() {
    if (!this._title.trim()) return;  // don't save untitled briefs
    const { slug, imageCount } = this._readFields();
    this._briefId = briefStorage.save({
      id:            this._briefId,  // null → save() generates a new id
      title:         this._title,
      slug,
      platform:      this._platform,
      customW:       this._customW,
      customH:       this._customH,
      story:         this._story,
      notes:         this._notes,
      tone:          this._tone,
      toneCustom:    this._toneCustom,
      thumbRatioVal: this._thumbRatioVal,
      thumbCustomW:  this._thumbCustomW,
      thumbCustomH:  this._thumbCustomH,
      imageCount,
    });
  }

```

- [ ] **Step 7: Call `_autoSave()` from `_goTo()`**

Find:
```js
  _goTo(step) {
    if (step < 1 || step > 5) return;
    this._step = step;
    this._close(true);  // remove DOM but preserve state
    this._render();     // re-render from current state
  }
```

Replace with:
```js
  _goTo(step) {
    if (step < 1 || step > 5) return;
    this._step = step;
    this._close(true);  // remove DOM but preserve state
    this._render();     // re-render from current state
    this._autoSave();
  }
```

- [ ] **Step 8: Call `_autoSave()` from the title input handler**

Find in `_bindEvents()`:
```js
    b.querySelector('#cb-title')?.addEventListener('input', (e) => {
      this._title = e.target.value;
      const slug = toSlug(this._title);
      const el = b.querySelector('#cb-slug-preview');
      if (el) el.textContent = slug ? `ID: ${slug}` : 'ID: —';
      const nextBtn = b.querySelector('#cb-next');
      if (nextBtn) nextBtn.disabled = !this._title.trim();
    });
```

Replace with:
```js
    b.querySelector('#cb-title')?.addEventListener('input', (e) => {
      this._title = e.target.value;
      const slug = toSlug(this._title);
      const el = b.querySelector('#cb-slug-preview');
      if (el) el.textContent = slug ? `ID: ${slug}` : 'ID: —';
      const nextBtn = b.querySelector('#cb-next');
      if (nextBtn) nextBtn.disabled = !this._title.trim();
      this._autoSave();
    });
```

- [ ] **Step 9: Expose `setOnOpenBriefManager(cb)` public method (add before `open()`)**

Find the line:
```js
  /**
   * Open the wizard.
```

Insert before it:
```js
  /**
   * Set callback invoked when user clicks "My Briefs" header link.
   * @param {function(): void} cb
   */
  setOnOpenBriefManager(cb) {
    this._onOpenBriefManager = cb;
  }

```

- [ ] **Step 10: Commit**

```bash
git add ui/concept-builder.js
git commit -m "feat: concept-builder — briefId param, _briefId state, _autoSave, My Briefs header link"
```

---

## Task 5: `ui/shell.js` + `app.js` — toolbar button + wiring

**Files:**
- Modify: `ui/shell.js`
- Modify: `app.js`

### shell.js changes

Add "My Briefs" button immediately after the "New Brief" button, before the first `<div class="toolbar-sep">` separator.

- [ ] **Step 1: Add "My Briefs" button in `buildToolbar()` in `shell.js`**

Find:
```html
    <button class="btn btn-secondary" id="btn-new-project" title="Create a new project brief for AI generation">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
      </svg>
      New Brief
    </button>

    <div class="toolbar-sep"></div>
```

Replace with:
```html
    <button class="btn btn-secondary" id="btn-new-project" title="Create a new project brief for AI generation">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
      </svg>
      New Brief
    </button>

    <button class="btn btn-ghost" id="btn-my-briefs" title="Browse and manage your saved briefs">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
      </svg>
      My Briefs
    </button>

    <div class="toolbar-sep"></div>
```

- [ ] **Step 2: Add `btnMyBriefs` to the return object at the end of `buildToolbar()`**

Find:
```js
  return {
    btnNewProject: document.getElementById('btn-new-project'),
```

Replace with:
```js
  return {
    btnNewProject: document.getElementById('btn-new-project'),
    btnMyBriefs:   document.getElementById('btn-my-briefs'),
```

### app.js changes

- [ ] **Step 3: Add `BriefManager` and `briefStorage` imports in `app.js`**

Find the existing import block at the top of `app.js`. It will include lines like:
```js
import { ConceptBuilder }   from './ui/concept-builder.js';
```

Add after that line:
```js
import { BriefManager }     from './ui/brief-manager.js';
import * as briefStorage     from './modules/brief-storage.js';
```

- [ ] **Step 4: Instantiate `BriefManager` and wire everything in `init()` in `app.js`**

Find:
```js
  const conceptBuilder = new ConceptBuilder();
```

Replace with:
```js
  const conceptBuilder = new ConceptBuilder();
  const briefManager   = new BriefManager(
    briefStorage,
    (briefId, startStep = 1) => conceptBuilder.open((files) => handleImageFiles(files), briefId, startStep),
  );
  conceptBuilder.setOnOpenBriefManager(() => briefManager.open());
```

- [ ] **Step 5: Wire `btnMyBriefs` toolbar button in `app.js`**

Find:
```js
  tb.btnNewProject?.addEventListener('click', () => {
    conceptBuilder.open((files) => handleImageFiles(files));
  });
```

Replace with:
```js
  tb.btnNewProject?.addEventListener('click', () => {
    conceptBuilder.open((files) => handleImageFiles(files));
  });

  tb.btnMyBriefs?.addEventListener('click', () => {
    briefManager.open();
  });
```

- [ ] **Step 6: Commit**

```bash
git add ui/shell.js app.js
git commit -m "feat: add My Briefs toolbar button, wire BriefManager + ConceptBuilder in app.js"
```

---

## Task 6: `docs/spec-app.md` — Part X tweaks + new Part XI

**Files:**
- Modify: `docs/spec-app.md`

Two changes:
1. Add note to Part X §10.2 (ConceptBuilder trigger section): mention the "My Briefs" header link also opens the wizard.
2. Add note to Part X §10.3 (wizard steps): note that wizard auto-saves on each step navigation.
3. Append new **Part XI** documenting brief management.

- [ ] **Step 1: Read `docs/spec-app.md` to find the Part X section boundaries**

Read lines around "Part X" heading and §10.2 / §10.3 sections to confirm exact text.

- [ ] **Step 2: In Part X §10.2 (Trigger section), find the paragraph describing how the wizard opens**

Find a line that mentions how ConceptBuilder is triggered (something like "Triggered by clicking New Brief toolbar button"). After it, add:

```
The wizard can also be opened from the "≡ My Briefs" header link inside an existing ConceptBuilder session (closes current wizard without saving unsaved data, opens BriefManager).
```

- [ ] **Step 3: In Part X §10.3 (wizard step descriptions), find the `_goTo()` or navigation description**

Add a note:

```
**Auto-save:** The wizard silently saves brief state to localStorage on every step navigation (`_goTo()`) and on every keystroke in the Title field. Auto-save is skipped if the title field is empty. No toast or status indicator is shown.
```

- [ ] **Step 4: Append new Part XI at the end of `docs/spec-app.md`**

```markdown
---

## Part XI — Brief Management

### XI.1 Purpose

Users may build up a library of project briefs over time. The "My Briefs" panel lets them view, search, edit, re-export, copy prompts, duplicate, and delete saved briefs without re-entering the wizard from scratch.

### XI.2 Toolbar Entry Point

A **"My Briefs"** button (≡ list icon) sits immediately after the "New Brief" button in the toolbar. It opens the BriefManager modal.

```
[New Brief]  [My Briefs]  |  [Load JSON]  ...
```

### XI.3 Modal Layout

Two-panel layout inside a wide modal (~900px):

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

**List panel** — search (real-time, case-insensitive substring on title) + sort (Last updated / Title A→Z / Created) + brief rows (title, platform + image count, relative date). "My Briefs" at bottom opens a fresh wizard. Empty state: "No briefs yet" + create button. Empty search: "No briefs match your search."

**Detail card** — shown when a brief is selected: title, platform + dimensions, story (3-line clamp with expand), tone, image count reminder (greyed), last updated.

### XI.4 Detail Card Actions

| Button | Behavior |
|---|---|
| **Edit** | Opens ConceptBuilder pre-filled with saved brief data at Step 1. Images start empty. |
| **Export Package** | Opens ConceptBuilder pre-filled at Step 4. Brief + mockups export; thumbnail sheets skipped unless user loads images. |
| **Copy Prompt** | Builds prompt text from saved brief, copies to clipboard. Shows "✓ Copied!" for 2s. No wizard opened. |
| **Duplicate** | Creates a copy with title appended " (copy)". Selects the new brief in the list. |
| **Delete** | Shows inline confirmation row. On confirm: removes from storage, clears selection. |

### XI.5 Data Model

**localStorage keys:**

| Key | Value |
|---|---|
| `frameforge_briefs` | JSON array of index entries `{ id, title, slug, platform, imageCount, created, updated }` |
| `frameforge_brief_{id}` | Full brief JSON object |

**Full brief schema:**

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
  created:       string,   // ISO date string "YYYY-MM-DD"
  updated:       string,   // ISO date string — updated on every auto-save
}
```

Images are **not** persisted. `imageCount` is stored as a reminder only.

### XI.6 Brief Lifecycle

1. User opens ConceptBuilder ("New Brief" or "Edit" from BriefManager)
2. Once a title is typed, the wizard auto-saves on every step navigation and every title keystroke
3. Saved briefs appear immediately in "My Briefs"
4. User can re-open any brief to edit, export, or copy the prompt
5. Duplicating creates a copy for variation without overwriting the original
6. Delete removes from localStorage entirely — no undo
```

- [ ] **Step 5: Commit**

```bash
git add docs/spec-app.md
git commit -m "docs: Part X tweaks (auto-save note, My Briefs link) + new Part XI (brief management)"
```

---

## Self-Review

### Spec Coverage

| Spec requirement | Task |
|---|---|
| `brief-storage.js` save/load/list/delete | Task 1 |
| Brief schema (15 fields + id/created/updated) | Task 1 |
| `frameforge_briefs` index + `frameforge_brief_{id}` keys | Task 1 |
| `.bm-*` CSS for two-panel modal | Task 2 |
| BriefManager modal — list panel (search, sort, rows, empty state) | Task 3 |
| BriefManager modal — detail card (title, platform, story, tone, image count, date) | Task 3 |
| Edit action: opens ConceptBuilder pre-filled Step 1 | Task 3 + 4 |
| Export Package action: opens ConceptBuilder pre-filled Step 4 | Task 3 + 4 |
| Copy Prompt action: clipboard, no wizard, "✓ Copied!" 2s | Task 3 |
| Duplicate action: copy with " (copy)" suffix, selects new item | Task 3 |
| Delete action: inline confirm, remove from storage | Task 3 |
| `open(onImages, briefId, startStep)` signature | Task 4 |
| `_briefId` state field | Task 4 |
| `_autoSave()` — silent, skip if title empty, updates `_briefId` | Task 4 |
| Auto-save called from `_goTo()` | Task 4 |
| Auto-save called from title input handler | Task 4 |
| "≡ My Briefs" header link in ConceptBuilder | Task 4 |
| "My Briefs" toolbar button in shell.js | Task 5 |
| `btnMyBriefs` return from `buildToolbar()` | Task 5 |
| BriefManager instantiation in app.js | Task 5 |
| ConceptBuilder `setOnOpenBriefManager` wiring | Task 5 |
| spec-app.md Part X §10.2 + §10.3 updates | Task 6 |
| spec-app.md new Part XI | Task 6 |

### Type Consistency

- `briefStorage.save()` returns `string` (the id) — `_autoSave()` assigns return to `this._briefId` ✓
- `briefStorage.load(id)` returns `object|null` — BriefManager and ConceptBuilder both null-check ✓
- `briefStorage.list()` returns index array sorted desc — BriefManager calls `.slice().sort()` for non-default sort ✓
- `briefStorage.remove(id)` — no return value, BriefManager doesn't expect one ✓
- `openConceptBuilder(briefId, startStep)` in BriefManager — Task 5 passes both args to `conceptBuilder.open(onImages, briefId, startStep)` ✓
- `setOnOpenBriefManager(cb)` defined in Task 4, called in Task 5 ✓
- Export Package action calls `this._openConceptBuilder(id, 4)` — app.js callback: `(briefId, startStep = 1) => conceptBuilder.open(..., briefId, startStep)` ✓

### Placeholder Scan

No TBDs, no "add validation" stubs, no "similar to Task N" references. All code blocks are complete.
