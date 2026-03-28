# FrameForge — White Frame
**Date:** 2026-03-27
**Status:** Approved

---

## Overview

Add a per-frame white border (mat/photo-print effect) to FrameForge. A frame with `white_frame` enabled renders with a white margin on all four sides, with all content inset by `size_px`. Users toggle it and configure the size from the Inspector's Frame section. The AI can also set it via the JSON schema.

---

## Data Model

### Frame Schema Addition

```js
// Optional — omit entirely if no white frame desired
white_frame: {
  enabled: boolean,  // true = draw white border
  size_px: number,   // border thickness on all four sides, in pixels (e.g. 40)
}
```

No other properties. Color is always white (`#ffffff`). `size_px` must be a positive integer. Typical range: 10–200px.

**Example:**
```json
{
  "id": "frame-01",
  "image_src": "hero-landscape",
  "white_frame": { "enabled": true, "size_px": 40 },
  "layers": [ ... ]
}
```

---

## Rendering

### Location: `modules/renderer.js` → `renderFrame()`

After the existing background fill (line ~128) and before layer rendering, insert:

```js
// White frame mat
const wf = frame.white_frame;
if (wf?.enabled && wf.size_px > 0) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);
}
```

Then, when rendering layers, if `white_frame` is active, translate the canvas context and pass reduced effective dimensions to all layer calls:

```js
const inset = (wf?.enabled && wf.size_px > 0) ? wf.size_px * scaleFactor : 0;
const effectiveW = canvasW - 2 * inset;
const effectiveH = canvasH - 2 * inset;

if (inset > 0) ctx.save(), ctx.translate(inset, inset);

// ... render all layers with effectiveW / effectiveH instead of canvasW / canvasH ...

if (inset > 0) ctx.restore();
```

This ensures all layers (image, text, shapes, logo) are positioned within the inset area — the white frame is a mat around all content, not just around the image layer.

### Safe zone overlay

The safe zone `drawSafeZone()` call that follows layer rendering also uses `canvasW/canvasH`. It should use `effectiveW/effectiveH` and be translated by `inset` when a white frame is active, so safe zone indicators stay accurate.

---

## Inspector

### Location: `ui/inspector.js`

#### New rows in the Frame section

Inside the `update()` method, after the existing `Bg color` row, add:

```html
<!-- White frame toggle -->
<div class="inspector-row">
  <span class="inspector-label">White frame</span>
  <input type="checkbox" id="insp-wf-enabled"
    ${wfEnabled ? 'checked' : ''}
    class="inspector-checkbox">
</div>
<!-- White frame size (hidden when disabled) -->
<div class="inspector-row" id="insp-wf-size-row" ${wfEnabled ? '' : 'hidden'}>
  <span class="inspector-label">└ Size</span>
  <span class="inspector-value">
    <input type="number" id="insp-wf-size"
      value="${wfSizePx}"
      min="1" max="400" step="1"
      class="inspector-number-input"> px
  </span>
</div>
```

Where:
- `wfEnabled = frame.white_frame?.enabled ?? false`
- `wfSizePx  = frame.white_frame?.size_px  ?? 40`

#### New method: `_bindWhiteFrameEvents(project, frameIndex)`

Called immediately after `this.contentEl.innerHTML = ...` at the end of `update()`.

```js
_bindWhiteFrameEvents(project, frameIndex) {
  const cbEl   = this.contentEl.querySelector('#insp-wf-enabled');
  const sizeEl = this.contentEl.querySelector('#insp-wf-size');
  const sizeRow= this.contentEl.querySelector('#insp-wf-size-row');
  if (!cbEl || !sizeEl) return;

  cbEl.addEventListener('change', () => {
    const enabled = cbEl.checked;
    sizeRow.hidden = !enabled;
    this._applyWhiteFrame(project, frameIndex, { enabled, size_px: parseInt(sizeEl.value, 10) || 40 });
  });

  sizeEl.addEventListener('input', () => {
    const size_px = parseInt(sizeEl.value, 10);
    if (size_px > 0) {
      this._applyWhiteFrame(project, frameIndex, { enabled: true, size_px });
    }
  });
}

_applyWhiteFrame(project, frameIndex, wf) {
  const frame = project.data.frames[frameIndex];
  if (!frame) return;
  if (wf.enabled) {
    frame.white_frame = { enabled: true, size_px: wf.size_px };
  } else {
    delete frame.white_frame;
  }
  this.contentEl.dispatchEvent(new CustomEvent('inspector:white-frame-changed', {
    bubbles: true,
    detail: { frameIndex },
  }));
}
```

#### CSS additions (`styles/components.css`)

```css
.inspector-checkbox {
  accent-color: var(--color-accent, #4d9eff);
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.inspector-number-input {
  width: 52px;
  background: var(--color-input-bg, #2a2a2a);
  border: 1px solid var(--color-border, #444);
  color: var(--color-text, #e0e0e0);
  padding: 2px 4px;
  font-size: 11px;
  border-radius: 3px;
  text-align: right;
}
```

---

## App Wiring

### Location: `app.js`

Add one event listener after the Inspector is constructed:

```js
inspectorContentEl.addEventListener('inspector:white-frame-changed', (e) => {
  saveCurrentProject();   // persist to localStorage
  renderActiveFrame();    // re-render canvas
});
```

(Use the actual save/render function names from `app.js` — `saveCurrentProject()` and `renderActiveFrame()` are stand-ins for the equivalent calls already used in the file.)

---

## AI Manual Update

### Location: `data/ai-manual-content.js`

Add to the frame schema documentation section:

```
white_frame (optional object) — draws a white border (mat) around all frame content.
  enabled   boolean  — true to activate.
  size_px   integer  — border thickness in pixels on all four sides.
                       Typical values: 20–80px for social, 40–120px for print.
                       Omit the property entirely if no white frame is desired.

Example:
  "white_frame": { "enabled": true, "size_px": 40 }

Use white_frame for:
  — Print layouts that benefit from a matted photo look
  — Editorial styles with strong negative space
  — Frames where the story calls for a clean, framed presentation
```

---

## Validator Update

### Location: `modules/validator.js`

Add validation for `white_frame` on each frame object:

- If `white_frame` is present:
  - `enabled` must be a boolean → error if not
  - `size_px` must be a positive integer → error if not
  - Unknown keys inside `white_frame` → warning (not error)
- `white_frame` absent → no issue (it is optional)

---

## spec-app.md Updates

### Location: `docs/spec-app.md`

1. **Frame schema section** — add `white_frame` as an optional frame property with type, sub-fields, and example
2. **Inspector section** — note that the Frame section contains interactive `white_frame` controls (checkbox + size input) that update the frame data and trigger a re-render
3. **Renderer section** (if present) — note the white fill + inset logic applied when `white_frame.enabled`

---

## Files

| File | Change |
|---|---|
| `modules/renderer.js` | White fill + context translate/inset when `white_frame.enabled` |
| `ui/inspector.js` | Two new rows + `_bindWhiteFrameEvents()` + `_applyWhiteFrame()` |
| `app.js` | Listen for `inspector:white-frame-changed`, save + re-render |
| `styles/components.css` | `.inspector-checkbox` + `.inspector-number-input` |
| `data/ai-manual-content.js` | Document `white_frame` in frame schema section |
| `modules/validator.js` | Validate optional `white_frame` fields |
| `docs/spec-app.md` | Frame schema + Inspector + Renderer sections updated |
