---
title: "Visual Balance Advisor"
description: "Design spec for Element Placement Advisor, Visual Weight Balance Readout, and live heatmap updates — extending the Visual Balance Framework"
---

## Overview

This spec extends the Visual Balance Framework (v1) with three connected capabilities:

1. **Live Heatmap Updates** — the heatmap recomputes whenever a layer is moved or resized on the active frame
2. **Element Placement Advisor** — suggests the optimal canvas position for a selected text or shape layer using two scoring modes (compositional balance vs. legibility), displayed as ghost overlays with a one-click "Move here" action
3. **Visual Weight Balance Readout** — a persistent panel section showing left/right or top/bottom weight distribution with a three-factor "Why" breakdown

All three features are non-destructive and invisible in exports. They operate exclusively on the live canvas state.

---

## Goals

- Make the heatmap reflect the current canvas state at all times (not just on initial load)
- Give designers a data-driven suggestion for where to place a text or shape element relative to the photo's weight distribution
- Show the photo's compositional weight split in plain language with numeric evidence

---

## Non-Goals

- Automatic layer creation
- Suggesting colors for layers (color recommendations remain in the existing Draw Zones WCAG readout)
- Persistent advisor settings across sessions
- Applying suggestions to image layers (advisor is text and shape only)
- Multi-layer simultaneous advisory (one layer at a time)

---

## Section 1 — Live Heatmap Updates

### Trigger conditions

The heatmap (`renderer._heatmapScores`) is recomputed whenever `renderer.showHeatmap === true` and any of the following events occur:

| Event | Existing hook |
|-------|--------------|
| Layer drag ends | `mouseup` on `canvasWrapEl` after drag (post-render) |
| Layer resize ends | `mouseup` on `resizeOverlayEl` after resize (post-render) |
| Frame switch | Already implemented in v1 |
| Heatmap toggled on | Already implemented in v1 |

### Implementation

In `app.js`, after `renderCurrentFrame()` is called following a drag or resize `mouseup`, check `renderer.showHeatmap` and if true run:

```js
const ctx = mainCanvas.getContext('2d');
const imgData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
renderer._heatmapScores = buildHeatmap(imgData, mainCanvas.width, mainCanvas.height);
renderCurrentFrame();
```

This is identical to the existing heatmap-on-load pattern. No new functions needed.

---

## Section 2 — Element Placement Advisor

### Entry point

A new **checkbox `#balance-advisor`** in the balance dropdown, below the existing heatmap/draw-zones checkboxes, labelled "Element Advisor". When checked, a `<select>` element (`#balance-advisor-layer`) appears below it listing all text and shape layers on the active frame (by name/label, or ID if no name).

Only text and shape layers are listed. Image layers are excluded.

On frame switch, the advisor layer selection is cleared and the overlay is removed.

### Ghost overlay

When a layer is selected in the picker:

1. The algorithm runs (`findBestPosition()`) and returns two candidate positions — one per mode.
2. Two ghost rectangles are drawn on the canvas (after all other overlays, before export gate):
   - **Blue ghost** — "Balance" mode: best position for compositional balance
   - **Green ghost** — "Legibility" mode: best position for text legibility
3. Each ghost is a dashed rectangle matching the layer's bounding box dimensions, filled at 15% opacity and stroked at 80% opacity in its respective color.
4. A small label badge sits above each ghost (`B` and `L`).

The active ghost (the one "Move here" will apply) is shown at full opacity; the inactive ghost is shown at 40% opacity. A toggle in the Balance Panel switches which mode is active.

### Balance Panel additions

A new **Advisor card** appears in the Balance Panel when the advisor is active:

```
Element Advisor
Layer: [dropdown]        [✕ close]

Mode: [● Balance] [○ Legibility]

Balance position:   x=340  y=180
Legibility position: x=40  y=620

[Move here]
```

The "Move here" button applies the active mode's position to the selected layer — updating `layer.x` / `layer.y` in `project.data`, calling `project.save()`, and triggering `renderCurrentFrame()`. The heatmap then recomputes (same post-render pattern as Section 1).

### Placement algorithm: `findBestPosition(imageData, canvasW, canvasH, layerW, layerH)`

Returns `{ balance: {x, y}, legibility: {x, y} }`.

**Candidate grid:** 5 × 5 anchor points (element top-left), stepped across the canvas with 12.5% increments, excluding positions where the element would overflow the canvas boundary.

For each candidate position `(cx, cy)`:

1. **Legibility score** = average heatmap cell score across all 16×16 cells that overlap the element rectangle. Lower = better for text. Final score = `1 - avgOverlapWeight` (higher is better legibility).

2. **Balance score** = how much placing the element at this position reduces the overall left/right weight delta:
   - Compute left-half weight (`sumL`) and right-half weight (`sumR`) from the 16×16 heatmap scores (sum of all cells whose center x < canvasW/2 vs ≥ canvasW/2)
   - The element has its own synthetic weight = its bounding-box area normalized to `[0, 1]` relative to canvas area, multiplied by a fixed element-weight factor of `0.4` (elements are lighter than photographic weight)
   - If the element is placed on the right: new delta = `|sumL - (sumR + elementWeight)|`; if left: `|(sumL + elementWeight) - sumR|`
   - Final balance score = `1 - (newDelta / maxPossibleDelta)` (higher = more balanced)

3. **Combined score per mode:**
   - Balance mode: `score = 0.75 * balanceScore + 0.25 * legibilityScore`
   - Legibility mode: `score = 0.25 * balanceScore + 0.75 * legibilityScore`

The candidate with the highest combined score wins for each mode. The returned `{x, y}` is the element's top-left origin, clamped so the element stays fully within canvas bounds.

**Note:** The algorithm uses the existing `renderer._heatmapScores` Float32Array (16×16 cells) already computed by `buildHeatmap()`. No additional pixel reads required.

---

## Section 3 — Visual Weight Balance Readout

### Location

A permanent section at the **top of the Balance Panel body**, visible whenever the heatmap is active (`renderer.showHeatmap === true`). It appears above zone cards and the advisor card.

### Layout

```
Visual Weight
[L/R ↔]  [T/B ↕]

LEFT   ████████░░░░  58%
RIGHT  ██████░░░░░░  42%
▲ Heavy side: LEFT

Why the imbalance:
  Brightness   +12%
  Contrast      +8%
  Saturation    −2%
```

**Axis toggle:** Two segmented buttons `[L/R ↔]` and `[T/B ↕]`. Default is L/R. Switching recomputes the split by summing heatmap columns (L/R) or rows (T/B).

**Bar rendering:** Two `<div>` bars with `width` set as a percentage. The heavier side is highlighted with `--color-accent` fill. Values are rounded to integers.

**Why breakdown:** The three weight formula factors (luminance, contrast, saturation) are decomposed independently. For the heavy side vs the light side:
- `luminanceDelta (%)` = `(avgLuma_heavy - avgLuma_light) / avgLuma_light * 100`
- `contrastDelta (%)` = same for contrast component
- `saturationDelta (%)` = same for saturation component

Values are shown with `+` or `−` sign. Only shown when `|delta| >= 1%` to suppress noise.

### Data source

All calculations are derived from the existing `renderer._heatmapScores` Float32Array plus a parallel pair of Float32Arrays produced during `buildHeatmap()` for the three raw components (`lumaScores`, `contrastScores`, `satScores`). `buildHeatmap()` is extended to return `{ scores, lumaScores, contrastScores, satScores }` instead of a single Float32Array. All callers updated to use `.scores` for the combined weight.

---

## Architecture Summary

### Files changed

| File | Change |
|------|--------|
| `frameforge/modules/visual-analysis.js` | `buildHeatmap()` returns `{ scores, lumaScores, contrastScores, satScores }` instead of bare Float32Array; add `findBestPosition()` export |
| `frameforge/modules/renderer.js` | `_heatmapScores` renamed to `_heatmap` (object); `drawHeatmap()` updated to read `.scores`; add `advisorLayer` prop (layer id or null), `advisorMode` prop (`'balance'|'legibility'`), `advisorPositions` prop (`{balance,legibility}|null`); `drawAdvisorGhosts()` new function; call it from `renderFrame()` |
| `frameforge/ui/balance-panel.js` | Add `updateWeightReadout()` section; add advisor card with layer dropdown, mode toggle, "Move here" button |
| `frameforge/ui/shell.js` | Add `#balance-advisor` checkbox + `#balance-advisor-layer` select to dropdown |
| `frameforge/styles/components.css` | Add weight readout bar styles, advisor card styles |
| `frameforge/app.js` | Wire heatmap recompute after drag/resize; wire advisor checkbox and layer picker; wire "Move here"; wire axis toggle; clear advisor on frame switch |

### Data flow

```
buildHeatmap() → { scores, lumaScores, contrastScores, satScores }
                       ↓                        ↓
               renderer._heatmap          findBestPosition()
                  .scores                         ↓
               drawHeatmap()              renderer.advisorPositions
                                               ↓
                                        drawAdvisorGhosts()
                                               ↓
                                        BalancePanel.updateWeightReadout()
                                        BalancePanel.updateAdvisorCard()
```

---

## Constraints

- All pixel reads via existing `getImageData()` — no new canvas operations
- `Float32Array` allocation for three parallel component arrays at 16×16 = 256 floats × 3 = tiny; no performance concern
- Ghost drawing uses `ctx.save()/restore()` and is inside the `!forExport` gate
- "Move here" only updates `layer.x` / `layer.y`; it does not affect `width`, `height`, font size, or any other property
- Minimum viable element size for advisor = 1×1 px (no floor check needed; any real layer will be larger)
