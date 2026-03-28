# White Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-frame white border (mat/photo-print effect) controlled by a checkbox + size input in the Inspector's Frame section, with AI manual documentation and validator support.

**Architecture:** `white_frame: { enabled, size_px }` is an optional first-class JSON property on each frame. The renderer draws a white fill then translates the canvas context by `inset` pixels on all sides before rendering layers. The Inspector fires a custom DOM event that app.js catches to save + re-render.

**Tech Stack:** Vanilla JS ES2022 modules, HTML5 Canvas API, no build step.

---

### Task 1: Validator — add `white_frame` validation

**Files:**
- Modify: `modules/validator.js:107-115`

- [ ] **Step 1: Add `white_frame` validation after the `image_src` check**

In `modules/validator.js`, after line 111 (the comment `// Note: image_src filename mismatch...`), insert:

```js
    // white_frame (optional)
    if (frame.white_frame !== undefined) {
      const wf = frame.white_frame;
      if (typeof wf.enabled !== 'boolean') {
        errors.push(`${prefix}.white_frame: "enabled" must be a boolean.`);
      }
      if (!Number.isInteger(wf.size_px) || wf.size_px <= 0) {
        errors.push(`${prefix}.white_frame: "size_px" must be a positive integer.`);
      }
      const knownWfKeys = new Set(['enabled', 'size_px']);
      Object.keys(wf).forEach((k) => {
        if (!knownWfKeys.has(k)) {
          warnings.push(`${prefix}.white_frame: unknown key "${k}" (ignored).`);
        }
      });
    }
```

- [ ] **Step 2: Manual smoke test**

Open browser console on the running app. Paste and run:

```js
// Import validateProject from validator.js (already loaded) — or test via UI
// Load a project JSON with a bad white_frame:
// { ..., "white_frame": { "enabled": "yes", "size_px": -5 } }
// Expect: two validation errors shown in Inspector
```

Load a project that has `"white_frame": { "enabled": "yes", "size_px": -5 }` in a frame. Confirm the Inspector shows two errors: `enabled must be a boolean` and `size_px must be a positive integer`.

- [ ] **Step 3: Commit**

```bash
git add modules/validator.js
git commit -m "feat: validate white_frame on frame objects"
```

---

### Task 2: CSS — add `.inspector-checkbox` and `.inspector-number-input`

**Files:**
- Modify: `styles/components.css` (append at end)

- [ ] **Step 1: Append styles**

At the very end of `styles/components.css`, add:

```css
/* ── White frame inspector controls ─────────────────────────────────────── */

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

- [ ] **Step 2: Commit**

```bash
git add styles/components.css
git commit -m "style: add inspector-checkbox and inspector-number-input classes"
```

---

### Task 3: Renderer — white fill + context inset

**Files:**
- Modify: `modules/renderer.js:124-200`

- [ ] **Step 1: Insert inset computation after background fill (line 128)**

In `modules/renderer.js`, after the background fill block:
```js
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvasW, canvasH);
```

Add immediately after:
```js
      // White frame mat
      const wf    = frame.white_frame;
      const inset = (wf?.enabled && wf.size_px > 0)
        ? Math.round(wf.size_px * scaleFactor)
        : 0;
      if (inset > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);
      }
      const effW = canvasW - 2 * inset;
      const effH = canvasH - 2 * inset;
      if (inset > 0) { ctx.save(); ctx.translate(inset, inset); }
```

- [ ] **Step 2: Replace all `canvasW, canvasH` in layer rendering with `effW, effH`**

After the insertion above, there are four call sites that use `canvasW, canvasH` for content sizing — replace each:

**Text bounds loop (lines ~133–139):**
```js
// Before:
const b = computeTextBounds(ctx, layer, canvasW, canvasH, project);
// After:
const b = computeTextBounds(ctx, layer, effW, effH, project);
```

**Layer loop (line ~146):**
```js
// Before:
renderLayer(ctx, layer, canvasW, canvasH, project, frameIndex, layerBounds);
// After:
renderLayer(ctx, layer, effW, effH, project, frameIndex, layerBounds);
```

**Error stroke rects inside layer loop (lines ~153–155) — these use `canvasW/canvasH` for the stroke rect around the full canvas. Leave them as `canvasW/canvasH`** (they are absolute canvas coordinates, unrelated to content inset).

**Frame-level logo (line ~164):**
```js
// Before:
renderLayer(ctx, { ...frame.logo, type: 'logo' }, canvasW, canvasH, project, frameIndex);
// After:
renderLayer(ctx, { ...frame.logo, type: 'logo' }, effW, effH, project, frameIndex);
```

**Selection indicator (lines ~177, 179, 182–183):**
```js
// Before:
const bounds = computeTextBounds(ctx, selLayer, canvasW, canvasH, project);
const pad = canvasW * 0.008;
ctx.lineWidth   = Math.max(1, canvasW / 600);
ctx.setLineDash([canvasW / 70, canvasW / 110]);
// After:
const bounds = computeTextBounds(ctx, selLayer, effW, effH, project);
const pad = effW * 0.008;
ctx.lineWidth   = Math.max(1, effW / 600);
ctx.setLineDash([effW / 70, effW / 110]);
```

**Safe zone (line ~199):**
```js
// Before:
drawSafeZoneOverlay(ctx, canvasW, canvasH, project.globals.safe_zone_pct);
// After:
drawSafeZoneOverlay(ctx, effW, effH, project.globals.safe_zone_pct);
```

- [ ] **Step 3: Restore context after safe zone**

After the safe zone block (currently `return { ok: true }` is on line ~202), add the restore before the return:

```js
      if (inset > 0) ctx.restore();

      return { ok: true };
```

The error stroke rects inside the layer catch block use `canvasW/canvasH` — those are fine as-is (absolute canvas coordinates for the error indicator border, not content).

- [ ] **Step 4: Manual smoke test**

In the app, load any project. Use browser console to manually set `white_frame`:

```js
// In browser console (project is a global in app.js scope — open via DevTools):
// Or: edit the JSON directly — add "white_frame": { "enabled": true, "size_px": 40 }
// to any frame, reload the JSON.
```

Expected: the canvas shows a white border around all content. Toggling `enabled: false` (reload without the property) removes it.

- [ ] **Step 5: Commit**

```bash
git add modules/renderer.js
git commit -m "feat: render white frame mat with canvas context inset"
```

---

### Task 4: Inspector — white frame checkbox + size input

**Files:**
- Modify: `ui/inspector.js:112-163`

- [ ] **Step 1: Add helper variables before the Frame section HTML**

In `ui/inspector.js`, find the `update()` method. Before the `this.contentEl.innerHTML = \`` assignment (around line 95), add:

```js
    const wfEnabled = frame.white_frame?.enabled ?? false;
    const wfSizePx  = frame.white_frame?.size_px  ?? 40;
```

- [ ] **Step 2: Add two new rows inside the Frame section**

Find the Frame section HTML (around line 112–119):

```html
      <!-- Frame info -->
      <div class="inspector-section">
        <div class="inspector-section-title">Frame</div>
        ${row('Index',    `${frameIndex + 1} / ${project.frameCount}`)}
        ${row('ID',       frame.id, true)}
        ${row('Layers',   layers.length)}
        ${row('Bg color', frame.background_color ?? globals.background_color ?? '#000000')}
      </div>
```

Replace with:

```html
      <!-- Frame info -->
      <div class="inspector-section">
        <div class="inspector-section-title">Frame</div>
        ${row('Index',    `${frameIndex + 1} / ${project.frameCount}`)}
        ${row('ID',       frame.id, true)}
        ${row('Layers',   layers.length)}
        ${row('Bg color', frame.background_color ?? globals.background_color ?? '#000000')}
        <div class="inspector-row">
          <span class="inspector-label">White frame</span>
          <input type="checkbox" id="insp-wf-enabled"
            ${wfEnabled ? 'checked' : ''}
            class="inspector-checkbox">
        </div>
        <div class="inspector-row" id="insp-wf-size-row" ${wfEnabled ? '' : 'hidden'}>
          <span class="inspector-label">&nbsp;&nbsp;└ Size</span>
          <span class="inspector-value">
            <input type="number" id="insp-wf-size"
              value="${wfSizePx}"
              min="1" max="400" step="1"
              class="inspector-number-input"> px
          </span>
        </div>
      </div>
```

- [ ] **Step 3: Add `_bindWhiteFrameEvents()` call after `innerHTML` assignment**

At line 163, the `update()` method closes with `this.contentEl.innerHTML = \`...\`;`. Immediately after that assignment (before the closing `}` of `update()`), add:

```js
    this._bindWhiteFrameEvents(project, frameIndex);
```

- [ ] **Step 4: Add `_bindWhiteFrameEvents()` and `_applyWhiteFrame()` methods**

After the `update()` method, add:

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

- [ ] **Step 5: Manual smoke test**

Load a project. Select a frame. Confirm the Inspector shows "White frame" checkbox. Check it — size row appears, canvas re-renders with white border. Uncheck — white border gone. Change size — canvas updates live.

- [ ] **Step 6: Commit**

```bash
git add ui/inspector.js
git commit -m "feat: add white frame controls to Inspector Frame section"
```

---

### Task 5: app.js — wire `inspector:white-frame-changed` event

**Files:**
- Modify: `app.js:132-168` (event bindings section)

- [ ] **Step 1: Add event listener for `inspector:white-frame-changed`**

In `app.js`, after the keyboard shortcuts block (around line 168), add:

```js
  // ── White frame changes ───────────────────────────────────────────────────
  inspectorContentEl.addEventListener('inspector:white-frame-changed', (e) => {
    const { frameIndex } = e.detail;
    project.save();
    filmstrip.renderOne(frameIndex, project);
    renderCurrentFrame();
    inspector.update(project, project.activeFrameIndex, validation);
  });
```

- [ ] **Step 2: Manual smoke test**

Toggle the white frame checkbox. Open DevTools → Application → Local Storage. Confirm the saved project JSON for the active frame now contains `"white_frame": { "enabled": true, "size_px": 40 }`. Uncheck — confirm the key is absent from the saved JSON.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: save and re-render on white frame inspector change"
```

---

### Task 6: AI manual — document `white_frame`

**Files:**
- Modify: `data/ai-manual-content.js:176-178`

- [ ] **Step 1: Insert `white_frame` docs after the frames example**

In `data/ai-manual-content.js`, find the `### frames` section (around line 168). The frame object example ends at line 176:

```
}
\`\`\`
```

After the closing triple-backtick of the frames code block and before `---`, insert:

```
\`\`\`

**white_frame** (optional) — draws a white border (mat) around all frame content.
\`\`\`json
"white_frame": { "enabled": true, "size_px": 40 }
\`\`\`
- \`enabled\` boolean — true to activate.
- \`size_px\` integer — border thickness in pixels on all four sides.
  Typical values: 20–80 px for social, 40–120 px for print.
- Omit the property entirely if no white frame is desired.

Use \`white_frame\` for:
- Print layouts that benefit from a matted photo look
- Editorial styles with strong negative space
- Frames where the story calls for a clean, framed presentation
```

The resulting section should look like:

````js
### frames
Array of frame objects. \`image_src\` is a descriptive label — NOT a filename:
\`\`\`json
{
  "id": "frame-01",
  "image_src": "hero-landscape",
  "layers": [ ... ]
}
\`\`\`

**white_frame** (optional) — draws a white border (mat) around all frame content.
\`\`\`json
"white_frame": { "enabled": true, "size_px": 40 }
\`\`\`
- \`enabled\` boolean — true to activate.
- \`size_px\` integer — border thickness in pixels on all four sides.
  Typical values: 20–80 px for social, 40–120 px for print.
- Omit the property entirely if no white frame is desired.

Use \`white_frame\` for:
- Print layouts that benefit from a matted photo look
- Editorial styles with strong negative space
- Frames where the story calls for a clean, framed presentation

---
````

- [ ] **Step 2: Commit**

```bash
git add data/ai-manual-content.js
git commit -m "docs: document white_frame in AI manual frame schema section"
```

---

### Task 7: spec-app.md — update frame schema, Inspector, and Renderer sections

**Files:**
- Modify: `docs/spec-app.md`

- [ ] **Step 1: Add `white_frame` to the frame schema section**

Find the frame schema section in `docs/spec-app.md`. Add `white_frame` as an optional frame property with type, sub-fields, and example. Place it after `background_color` (or after the last documented frame property):

```markdown
#### `white_frame` (optional object)
Draws a white border (mat) around all frame content.

| Field | Type | Description |
|---|---|---|
| `enabled` | boolean | `true` to activate the border |
| `size_px` | integer | Border thickness on all four sides (px). Range: 1–400. Typical: 20–80 social, 40–120 print. |

Example:
```json
"white_frame": { "enabled": true, "size_px": 40 }
```
Omit the property entirely when no white frame is desired.
```

- [ ] **Step 2: Update the Inspector section**

In the Inspector section, find the Frame section description. Add a note:

```markdown
The Frame section also contains **White frame** controls: a checkbox to enable/disable and a px number input for the border size (shown only when enabled). Changes fire an `inspector:white-frame-changed` custom event that triggers save + re-render.
```

- [ ] **Step 3: Update the Renderer section (if present)**

In the Renderer section (if it exists), add:

```markdown
When `white_frame.enabled` is true, the renderer draws a white `fillRect` over the full canvas, then calls `ctx.save()` + `ctx.translate(inset, inset)` before rendering layers. All layer rendering uses `effW = canvasW - 2*inset` and `effH = canvasH - 2*inset`. `ctx.restore()` is called after the safe zone overlay. `inset = Math.round(size_px * scaleFactor)`.
```

- [ ] **Step 4: Commit**

```bash
git add docs/spec-app.md
git commit -m "docs: update spec-app.md with white_frame schema, inspector, renderer sections"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `white_frame: { enabled, size_px }` on frame | Task 1 (validator), Task 3 (renderer), Task 4 (inspector) |
| Color always white `#ffffff` | Task 3 — hard-coded |
| `size_px` positive integer | Task 1 validator |
| Renderer: white fill + translate inset | Task 3 |
| All layers inset (image, text, shapes, logo) | Task 3 — `effW/effH` passed to all `renderLayer` + `computeTextBounds` calls |
| Safe zone also inset | Task 3 — `drawSafeZoneOverlay(ctx, effW, effH, ...)` |
| Inspector: checkbox in Frame section | Task 4 |
| Inspector: size row hidden when disabled | Task 4 |
| `_bindWhiteFrameEvents()` + `_applyWhiteFrame()` | Task 4 |
| When disabled: `delete frame.white_frame` | Task 4 `_applyWhiteFrame` |
| Custom event `inspector:white-frame-changed` | Task 4 + Task 5 |
| app.js: save + filmstrip + re-render + inspector.update | Task 5 |
| CSS: `.inspector-checkbox` + `.inspector-number-input` | Task 2 |
| AI manual: `white_frame` documented in frames section | Task 6 |
| spec-app.md updated | Task 7 |

**Placeholder scan:** No TBD, TODO, or vague steps found.

**Type consistency:** `wf.size_px` (integer), `wf.enabled` (boolean), `inset` (number from `Math.round`), `effW/effH` (numbers) — consistent throughout Tasks 3, 4, 5.
