# Instagram Export Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cap export dimensions to native resolution for social network targets (Instagram, Facebook) by ignoring `scale_factor` at export time.

**Architecture:** Add a `resolveExportScale(exp)` helper to `export.js` that returns `1` for social targets and `exp.scale_factor` for all others. Replace the two existing `exp.scale_factor ?? 1` reads in that file with calls to this helper.

**Tech Stack:** Vanilla JS ES2022 modules, HTML5 Canvas API, no build step, no test framework (browser-only app).

---

### Task 1: Add `resolveExportScale` and wire it up

**Files:**
- Modify: `frameforge/modules/export.js`

- [ ] **Step 1: Add the helper function**

Open `frameforge/modules/export.js`. After the closing `}` of `triggerDownload` (around line 149), add:

```js
/**
 * Resolve the effective scale factor for export.
 * Social network targets (instagram-*, facebook-*) export at native resolution
 * (scale_factor = 1). Print and custom targets use the configured scale_factor.
 *
 * @param {object} exp — export config object
 * @returns {number}
 */
function resolveExportScale(exp) {
  const target = exp.target ?? '';
  const isSocial = target.startsWith('instagram-') || target.startsWith('facebook-');
  return isSocial ? 1 : (exp.scale_factor ?? 1);
}
```

- [ ] **Step 2: Update `exportFrame`**

In `exportFrame()` (around line 49), replace:

```js
  const scaleFactor = exp.scale_factor ?? 1;
```

with:

```js
  const scaleFactor = resolveExportScale(exp);
```

- [ ] **Step 3: Update `getFrameDataURL`**

In `getFrameDataURL()` (around line 168), replace:

```js
  const scaleFactor = exp.scale_factor ?? 1;
```

with:

```js
  const scaleFactor = resolveExportScale(exp);
```

- [ ] **Step 4: Verify in the browser**

1. Open the app in a browser (`frameforge/index.html`).
2. Load a project JSON with `"target": "instagram-portrait"`, `"width_px": 1080`, `"height_px": 1350`, `"scale_factor": 2`.
3. Click **Export This** on any frame.
4. Open the downloaded PNG in any image viewer and confirm dimensions are **1080 × 1350** (not 2160 × 2700).
5. Load a project with `"target": "print-a4-portrait"`, `"width_px": 2480`, `"height_px": 3508`, `"scale_factor": 2`.
6. Export one frame and confirm dimensions are **4960 × 7016** (scale_factor still applied for print).

- [ ] **Step 5: Commit**

```bash
git add frameforge/modules/export.js
git commit -m "fix: cap export to native resolution for social targets (instagram-*, facebook-*)"
```
