# Design: Social-Target Export Size Capping

**Date:** 2026-03-27
**Status:** Approved

---

## Problem

When exporting frames for Instagram (or Facebook) targets, the export engine multiplies `width_px` and `height_px` by `scale_factor`. A typical Instagram project with `scale_factor: 2` produces a 2160×2700 export instead of the expected 1080×1350. Instagram's native resolution is 1080×1350 — there is no benefit to upscaling.

`scale_factor` exists for print targets (retina / 300dpi upscaling). For social network targets it produces oversized files with no quality gain.

---

## Decision

Cap `scale_factor` to `1` at export time whenever the project target is a social network target. The JSON schema and stored config are not changed — the capping is purely an export-time behavior.

---

## Implementation

### `resolveExportScale(exp)` — new helper in `export.js`

```js
function resolveExportScale(exp) {
  const target = exp.target ?? '';
  const isSocial = target.startsWith('instagram-') || target.startsWith('facebook-');
  return isSocial ? 1 : (exp.scale_factor ?? 1);
}
```

Social targets are identified by prefix: `instagram-` and `facebook-`. All current social targets in the spec follow this convention.

### Usage

Replace `exp.scale_factor ?? 1` with `resolveExportScale(exp)` in two places:

- `exportFrame()` — line ~49
- `getFrameDataURL()` — line ~168

No other files are affected.

---

## Outcome

| Target | scale_factor | Before | After |
|---|---|---|---|
| `instagram-portrait` | 2 | 2160×2700 | 1080×1350 |
| `instagram-square` | 2 | 2160×2160 | 1080×1080 |
| `instagram-story` | 2 | 2160×3840 | 1080×1920 |
| `facebook-feed` | 2 | 2400×1260 | 1200×630 |
| `print-a4-portrait` | 2 | 4960×7016 | 4960×7016 (unchanged) |
| `custom` | 3 | custom×3 | custom×3 (unchanged) |
