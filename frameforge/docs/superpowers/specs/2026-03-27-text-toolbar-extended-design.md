# Text Toolbar Extended + Drag Guidelines Design

**Date:** 2026-03-27
**Status:** Approved

## Goal

Extend the existing text layer toolbar with bold, shadow toggle, and colour controls; add visual centre-alignment guidelines to the canvas during drag.

---

## 1. Toolbar Additions

### New layout

```
[ text input ] [ Size −/+ ] [ Width −/+ ] [ B ] [ Shadow ] [ color ] [ 🗑 ]
```

Three new controls inserted between the Width group and the delete button, each separated by the existing `.text-toolbar-sep` divider.

### Bold toggle

- Button with label **B**, styled with `font-weight: 700`
- Toggles `layer.font.weight` between `700` (bold) and `400` (normal)
- Active state (bold is on): button receives `.is-active` class → highlighted background (`var(--color-accent)` at low opacity, accent-coloured border)
- Fires `onChange(layer)` after update

### Shadow toggle

- Button labelled **Shadow**
- Toggles `layer.shadow.enabled` (boolean)
- When enabling on a layer with no existing shadow object, write defaults:
  ```json
  { "enabled": true, "color": "#000000", "blur_px": 8, "offset_x": 2, "offset_y": 2, "opacity": 0.6 }
  ```
- When disabling: set `layer.shadow.enabled = false` (preserve other values for re-enable)
- Active state (shadow is on): button receives `.is-active` class
- Fires `onChange(layer)` after update

### Colour picker

- Native `<input type="color">` element, styled as a small square swatch (24×24px)
- Wired to `layer.font.color`
- Initialised from `layer.font?.color ?? '#ffffff'` when `show(layer)` is called
- On `input` event: write to `layer.font.color`, fire `onChange(layer)`

### `_updateDisplays()` extensions

When `show(layer)` is called, also:
- Set bold button `.is-active` if `layer.font?.weight >= 700`
- Set shadow button `.is-active` if `layer.shadow?.enabled === true`
- Set colour input value to `layer.font?.color ?? '#ffffff'`

---

## 2. Drag Guidelines

### State

`renderer.isDragging = false` added to the `Renderer` constructor alongside `selectedLayerId`.

### Wiring in `app.js`

The existing `onRender` and `onComplete` callbacks inside `loadProjectData`'s `initDrag(...)` call are wrapped:

```javascript
// onRender (4th arg):
() => { renderer.isDragging = true; renderCurrentFrame(); }

// onComplete (5th arg):
(frameIndex) => { renderer.isDragging = false; filmstrip.renderOne(frameIndex, project); }
```

No changes to `drag.js`.

### Drawing logic in `renderer.js`

In `renderFrame`, after the selection indicator block and **before** the safe zone overlay block:

```
if (this.isDragging && this.selectedLayerId):
  1. Find selected layer in frame.layers
  2. If type === 'text': computeTextBounds(ctx, layer, canvasW, canvasH, project)
  3. If bounds:
     cx = (bounds.left + bounds.right) / 2
     cy = (bounds.top + bounds.bottom) / 2
     threshold_x = canvasW * 0.03
     threshold_y = canvasH * 0.03
     if |cx − canvasW/2| < threshold_x  → draw vertical centre line at x = canvasW/2
     if |cy − canvasH/2| < threshold_y  → draw horizontal centre line at y = canvasH/2
```

### Line style

- `strokeStyle`: `rgba(100, 180, 255, 0.7)`
- `lineWidth`: `Math.max(1, canvasW / 800)`
- `setLineDash([canvasW / 150, canvasW / 100])`
- Lines span the full canvas width/height
- Wrapped in `ctx.save()` / `ctx.restore()`
- Entire block wrapped in `try/catch` (cosmetic, must not break render)

### No snap-to-centre

Guidelines are visual only — no position snapping.

---

## 3. Files Affected

| File | Change |
|---|---|
| `ui/text-toolbar.js` | Add bold toggle, shadow toggle, colour picker; extend `_handleAction`, `_updateDisplays`, `_build`, `show` |
| `modules/renderer.js` | Add `isDragging = false` to constructor; add guideline drawing block in `renderFrame` |
| `app.js` | Wrap `onRender`/`onComplete` in `initDrag` call to set/clear `renderer.isDragging` |
| `styles/components.css` | Add `.is-active` style for toolbar toggle buttons; style the colour input swatch |

---

## 4. Out of Scope

- Shadow property editing (blur, offset, colour, opacity) — toggle only
- Snap-to-centre
- Alignment guidelines for edges (only centre lines)
- Opacity control
- Letter spacing / line height
