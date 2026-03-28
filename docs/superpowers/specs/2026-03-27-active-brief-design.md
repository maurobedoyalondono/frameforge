# Active Brief Selection

**Date:** 2026-03-27
**Status:** Approved

## Problem

The My Briefs modal lists all saved briefs but has no way to set one as "active." The app always implicitly works with the most recently updated brief. Users cannot indicate which brief they are currently working with.

## Goal

Allow the user to designate one brief as active. The main app toolbar shows the active brief's title at a glance. No additional quick-actions are needed from the toolbar — the label is purely informational.

## Interaction Design

### Double-click to activate (in My Briefs list)

- **Single click** on a list item — existing behaviour: selects brief, shows details in right panel.
- **Double click** on a list item — new behaviour: sets that brief as active, closes the modal. The toolbar label updates immediately.

A hint line appears below the search/sort toolbar:

> *Double-click to set active*

### Active indicator in the list

- The active brief's list item shows a primary-coloured `●` dot and a left border accent (`border-left: 2px solid var(--color-primary)`).
- All other items show no dot.

### Active badge in the detail panel

When the selected brief is also the active brief, the detail panel title shows an `● active` badge in primary colour alongside the title.

### Toolbar label

A plain-text `#active-brief-label` element is added to the toolbar immediately after the "My Briefs" button (before the following separator). It shows:

```
● [Brief Title]
```

- Styled as muted text with a primary-coloured dot — not a button, not interactive.
- Hidden (`display: none`) when no active brief is set.
- Title is truncated to 24 characters with an ellipsis if longer.

## Data

`active_brief_id` is stored as a key inside the existing prefs object in localStorage (via `storage.savePrefs` / `storage.loadPrefs`). It is a string (brief ID) or `null`.

On app startup, `prefs.active_brief_id` is read and the toolbar label is populated if the brief still exists in `briefStorage`.

## Component Changes

### `shell.js`

- Add `<span id="active-brief-label">` to toolbar HTML, right after `#btn-my-briefs`.
- Expose it in the `buildToolbar` return value as `activeBriefLabel`.

### `brief-manager.js`

- Constructor accepts a new optional callback: `onActiveBriefChange(id, title)` — called when double-click sets a new active brief.
- `_renderListItems()` receives the current `activeBriefId` and renders the `●` dot + left border on the matching item.
- `_renderDetail()` shows the `● active` badge when `this._selectedId === this._activeBriefId`.
- `_bindListItemEvents()` adds a `dblclick` listener per item: sets `this._activeBriefId`, calls `onActiveBriefChange`, then calls `this._close()`.
- Hint text inserted between the search/sort toolbar and the list items.
- `open()` receives the current `activeBriefId` so it can initialise `this._activeBriefId`.

### `app.js`

- On init: read `prefs.active_brief_id`, look up the brief title via `briefStorage.load`, and populate `tb.activeBriefLabel`.
- Pass `onActiveBriefChange` callback to `BriefManager`:
  ```js
  (id, title) => {
    prefs.active_brief_id = id;
    storage.savePrefs(prefs);
    updateActiveBriefLabel(tb.activeBriefLabel, title);
  }
  ```
- `updateActiveBriefLabel(el, title)` helper: sets text content and toggles visibility.

## Edge Cases

- **Active brief deleted:** when `_doDelete` removes the active brief, `onActiveBriefChange(null, null)` is called, clearing the toolbar label and `prefs.active_brief_id`.
- **Active brief not found on startup:** if `prefs.active_brief_id` points to a brief that no longer exists in storage, the label is not shown and `prefs.active_brief_id` is cleared.

## Out of Scope

- Clicking the toolbar label does nothing (not a shortcut to open the brief).
- No auto-activation when a new brief is created.
- No linking between the active brief and the loaded project JSON.
