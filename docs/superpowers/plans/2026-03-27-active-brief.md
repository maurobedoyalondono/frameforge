# Active Brief Selection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user double-click a brief in "My Briefs" to set it as the active brief, with the active brief's name shown in the main toolbar.

**Architecture:** Three small changes wired together — (1) a label element added to the toolbar in `shell.js`, (2) active-state tracking + double-click interaction added to `BriefManager`, (3) `app.js` reads/writes `prefs.active_brief_id` and passes a callback to `BriefManager` to update the label. No new files. No new modules.

**Tech Stack:** Vanilla JS ES modules, localStorage for persistence. No build step — open `frameforge/index.html` directly in a browser to test.

---

## File Map

| File | Change |
|------|--------|
| `frameforge/ui/shell.js` | Add `#active-brief-label` span to toolbar HTML; expose it in `buildToolbar` return |
| `frameforge/styles/shell.css` | Add `#active-brief-label` and `.active-brief-dot` styles |
| `frameforge/styles/components.css` | Add `.bm-item.active`, `.bm-active-hint`, `.bm-active-badge` styles |
| `frameforge/ui/brief-manager.js` | Add `_activeBriefId` state, `setOnActiveBriefChange()`, `open(activeBriefId)`, active indicators, hint text, dblclick handler, delete edge case |
| `frameforge/app.js` | Add `updateActiveBriefLabel()` helper, init prefs read, callback wiring, pass `activeBriefId` to `open()` |

---

## Task 1: Toolbar label HTML + CSS

**Files:**
- Modify: `frameforge/ui/shell.js`
- Modify: `frameforge/styles/shell.css`

- [ ] **Step 1: Add the label span to toolbar HTML in `shell.js`**

In `buildToolbar`, after the closing `</button>` of `#btn-my-briefs` (around line 271), insert:

```html
    <span id="active-brief-label">
      <span class="active-brief-dot">●</span>
      <span id="active-brief-title"></span>
    </span>
```

The surrounding context for placement:
```js
      My Briefs
    </button>

    <span id="active-brief-label">
      <span class="active-brief-dot">●</span>
      <span id="active-brief-title"></span>
    </span>

    <div class="toolbar-sep"></div>
```

- [ ] **Step 2: Expose the label element in the return value**

In the `return { ... }` block of `buildToolbar` (around line 348), add after `btnMyBriefs`:

```js
    activeBriefLabel:  document.getElementById('active-brief-label'),
```

- [ ] **Step 3: Add CSS in `shell.css`**

Append to the end of `frameforge/styles/shell.css`:

```css
/* ── Active brief label ──────────────────────────────────────────────────── */

#active-brief-label {
  display: none;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--color-text-muted, #888);
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

#active-brief-label.visible {
  display: flex;
}

.active-brief-dot {
  color: var(--color-accent);
  font-size: 9px;
  line-height: 1;
  flex-shrink: 0;
}
```

- [ ] **Step 4: Verify in browser**

Open `frameforge/index.html`. The toolbar should look identical to before (label is hidden by default). No console errors. The "My Briefs" button still works.

- [ ] **Step 5: Commit**

```bash
git add frameforge/ui/shell.js frameforge/styles/shell.css
git commit -m "feat: add active-brief-label slot to toolbar"
```

---

## Task 2: BriefManager — active state, visual indicators, hint text

**Files:**
- Modify: `frameforge/ui/brief-manager.js`
- Modify: `frameforge/styles/components.css`

- [ ] **Step 1: Add `_activeBriefId` and `_onActiveBriefChange` to the constructor**

In `BriefManager.constructor()`, after `this._storyExpanded = false;` (line 61), add:

```js
    this._activeBriefId       = null;
    this._onActiveBriefChange = null;
```

- [ ] **Step 2: Add `setOnActiveBriefChange` setter method**

After the `open()` method (around line 71), add:

```js
  setOnActiveBriefChange(cb) {
    this._onActiveBriefChange = cb;
  }
```

- [ ] **Step 3: Accept `activeBriefId` parameter in `open()`**

Change the `open()` signature and body from:

```js
  open() {
    if (this._backdrop) return;
    this._selectedId      = null;
    this._searchQuery     = '';
    this._sortMode        = 'updated';
    this._deleteConfirmId = null;
    this._storyExpanded   = false;
    this._render();
  }
```

to:

```js
  open(activeBriefId = null) {
    if (this._backdrop) return;
    this._selectedId      = null;
    this._activeBriefId   = activeBriefId ?? null;
    this._searchQuery     = '';
    this._sortMode        = 'updated';
    this._deleteConfirmId = null;
    this._storyExpanded   = false;
    this._render();
  }
```

- [ ] **Step 4: Add hint text between the list toolbar and the items in `_render()`**

In the `_render()` HTML (around line 102), change:

```html
            <div class="bm-list-items" id="bm-list-items">
```

to:

```html
            <div class="bm-active-hint">Double-click to set active</div>
            <div class="bm-list-items" id="bm-list-items">
```

- [ ] **Step 5: Add `active` class to the active brief's list item in `_renderListItems()`**

Change the item `div` (around line 160) from:

```js
      <div class="bm-item ${b.id === this._selectedId ? 'selected' : ''}"
           data-id="${escHtml(b.id)}">
```

to:

```js
      <div class="bm-item ${b.id === this._selectedId ? 'selected' : ''} ${b.id === this._activeBriefId ? 'active' : ''}"
           data-id="${escHtml(b.id)}">
```

- [ ] **Step 6: Add `● active` badge to the detail panel title in `_renderDetail()`**

Change the `bm-detail-title` line (around line 211) from:

```js
        <div class="bm-detail-title">${escHtml(brief.title || '(untitled)')}</div>
```

to:

```js
        <div class="bm-detail-title">
          ${escHtml(brief.title || '(untitled)')}
          ${this._selectedId === this._activeBriefId
            ? `<span class="bm-active-badge">● active</span>`
            : ''}
        </div>
```

- [ ] **Step 7: Add CSS in `components.css`**

Append to the end of `frameforge/styles/components.css`:

```css
/* ── BriefManager active-brief indicators ─────────────────────────────────── */

.bm-active-hint {
  padding: 4px 12px;
  font-size: 10px;
  color: var(--color-text-muted, #666);
  font-style: italic;
  border-bottom: 1px solid var(--color-border, #2a2a2a);
}

/* left border for active item (when not also selected — selected shares same color) */
.bm-item.active:not(.selected) {
  border-left-color: var(--color-accent);
}

.bm-item.active .bm-item-title::after {
  content: ' ●';
  color: var(--color-accent);
  font-size: 9px;
  vertical-align: middle;
}

.bm-active-badge {
  font-size: 11px;
  font-weight: normal;
  color: var(--color-accent);
  margin-left: 8px;
}
```

- [ ] **Step 8: Verify in browser**

Open `frameforge/index.html`, click "My Briefs". You should see:
- The hint text "Double-click to set active" below the search/sort row.
- All existing brief management interactions still work (select, edit, delete, etc.).
- No console errors.

(The active indicator won't be visible yet because `activeBriefId` is always `null` at this stage — wiring comes in Task 3.)

- [ ] **Step 9: Commit**

```bash
git add frameforge/ui/brief-manager.js frameforge/styles/components.css
git commit -m "feat: add active-brief state and visual indicators to BriefManager"
```

---

## Task 3: Double-click handler + app.js wiring

**Files:**
- Modify: `frameforge/ui/brief-manager.js`
- Modify: `frameforge/app.js`

- [ ] **Step 1: Add `dblclick` handler in `_bindListItemEvents()`**

In `_bindListItemEvents()`, the existing `forEach` loop (around line 295) adds a `click` listener. After that listener, add a `dblclick` listener inside the same `forEach`:

```js
    b.querySelectorAll('.bm-item').forEach((el) => {
      el.addEventListener('click', () => {
        this._selectedId      = el.dataset.id;
        this._deleteConfirmId = null;
        this._storyExpanded   = false;
        b.querySelectorAll('.bm-item').forEach((i) => i.classList.remove('selected'));
        el.classList.add('selected');
        this._refreshDetail();
      });

      // NEW: double-click sets active brief and closes modal
      el.addEventListener('dblclick', () => {
        const id    = el.dataset.id;
        const brief = this._storage.load(id);
        this._activeBriefId = id;
        this._onActiveBriefChange?.(id, brief?.title ?? '');
        this._close();
      });
    });
```

- [ ] **Step 2: Clear active brief when it is deleted**

In `_bindDetailEvents()`, the delete-confirm handler (around line 344):

Change from:

```js
    b.querySelector('#bm-delete-confirm-yes')?.addEventListener('click', () => {
      this._storage.remove(this._selectedId);
      this._selectedId      = null;
      this._deleteConfirmId = null;
      this._refreshList();
      this._refreshDetail();
    });
```

to:

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

- [ ] **Step 3: Add `updateActiveBriefLabel` helper to `app.js`**

In `app.js`, near the `escHtml` helper at the bottom of the file (around line 725), add:

```js
function updateActiveBriefLabel(el, title) {
  if (!el) return;
  if (!title) {
    el.classList.remove('visible');
    return;
  }
  const truncated = title.length > 24 ? title.slice(0, 24) + '\u2026' : title;
  const titleEl = el.querySelector('#active-brief-title');
  if (titleEl) titleEl.textContent = truncated;
  el.classList.add('visible');
}
```

- [ ] **Step 4: Register the `onActiveBriefChange` callback in `app.js`**

In `app.js`, after the line `conceptBuilder.setOnOpenBriefManager(() => briefManager.open());` (around line 64), add:

```js
  briefManager.setOnActiveBriefChange((id, title) => {
    prefs.active_brief_id = id ?? undefined;
    storage.savePrefs(prefs);
    updateActiveBriefLabel(tb.activeBriefLabel, title);
  });
```

- [ ] **Step 5: Pass `activeBriefId` to `briefManager.open()` in the toolbar click handler**

In `app.js`, change the existing "My Briefs" button listener (around line 138):

From:

```js
  tb.btnMyBriefs?.addEventListener('click', () => {
    briefManager.open();
  });
```

To:

```js
  tb.btnMyBriefs?.addEventListener('click', () => {
    briefManager.open(prefs.active_brief_id ?? null);
  });
```

- [ ] **Step 6: Read the active brief from prefs on startup**

In `app.js`, after the auto-restore block that ends around line 252 (the `if (prefs.last_project_id)` block), add:

```js
  // Restore active brief label
  if (prefs.active_brief_id) {
    const activeBrief = briefStorage.load(prefs.active_brief_id);
    if (activeBrief) {
      updateActiveBriefLabel(tb.activeBriefLabel, activeBrief.title);
    } else {
      // Brief was deleted — clear the stale pref
      prefs.active_brief_id = undefined;
      storage.savePrefs(prefs);
    }
  }
```

- [ ] **Step 7: Verify in browser — full flow**

Open `frameforge/index.html`. Test the following:

1. Click "My Briefs" — list opens, hint text visible.
2. Double-click a brief — modal closes, toolbar shows `● [Brief Title]`.
3. Refresh the page — toolbar label is still showing (persisted in localStorage).
4. Click "My Briefs" again — the active brief has the `●` dot in its title and `● active` badge in the detail panel.
5. Double-click a different brief — toolbar label updates to the new brief.
6. Select the active brief, click Delete → confirm. Toolbar label disappears. Reopening My Briefs shows no active indicator.

- [ ] **Step 8: Commit**

```bash
git add frameforge/ui/brief-manager.js frameforge/app.js
git commit -m "feat: double-click brief to set active, show in toolbar"
```
