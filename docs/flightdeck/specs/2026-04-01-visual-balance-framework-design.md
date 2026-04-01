---
title: "Visual Balance Framework"
description: "Design spec for a two-tier composition guide and visual weight analysis system in FrameForge"
---

## Overview

The Visual Balance Framework adds a non-destructive, non-exported analysis layer to the FrameForge canvas. It provides two independent tiers of capability: geometric composition guides for classic framing principles, and pixel-level visual weight analysis for advanced text-placement decisions. Both tiers share a single toolbar entry point — a `btn-balance` dropdown button — and neither affects exports.

---

## Goals

- Give designers a fast way to check frame compositions against classic photographic principles
- Provide pixel-level visual weight and contrast analysis so text placement decisions are data-informed, not guesswork
- Remain completely invisible in exports
- Integrate cleanly alongside the existing safe zone and layer-bounds overlays

---

## Non-Goals

- Automatic text placement or layer creation
- Persistent zone storage across sessions (zones are session-only)
- Color-managed analysis (sRGB pixel values only — no ICC profile conversion)

---

## Tier 1 — Composition Guides

Static geometric overlays drawn on the canvas context after all layers, before the export gate. A single active guide can be selected at a time.

### Guide catalog

| Key | Name | Visual description |
|-----|------|--------------------|
| `thirds` | Rule of Thirds | 2 horizontal + 2 vertical lines at 33%/66% with intersection dots |
| `phi` | Phi Grid | Same structure as thirds but proportioned to the golden ratio (0.382 / 0.618) with intersection dots |
| `spiral` | Golden Spiral | Four Fibonacci spiral reflections (TL, TR, BL, BR) drawn simultaneously; inactive orientations at 20% opacity, active orientation at full opacity; re-selecting cycles the active orientation |
| `cross` | Center Cross | 1 horizontal + 1 vertical centerline |
| `diagonals` | Diagonals | Both corner-to-corner diagonals |
| `quadrants` | Quadrants | H + V centerlines + small quadrant number labels (1–4) |

### Visual style

Lines drawn in white at 35% opacity with a 1 px black shadow at 20% opacity. Line width scaled to canvas width (`max(1, w / 600)`). Consistent with the existing drag-snap alignment indicator style.

### Rendering location

`renderer.js` — a new `drawCompositionGuide(ctx, w, h, guide, spiralOrientation)` function called from `renderFrame()` after safe zone overlay, skipped when `forExport === true`.

---

## Tier 2 — Visual Weight Analysis

Pixel-level analysis of the rendered canvas. Two modes operate independently and can be active simultaneously.

### Weight Heatmap

When enabled, samples the live main canvas via `getImageData()` immediately after a frame renders.

**Grid:** 16 × 16 cells. Per-cell score formula:

```
weight = 0.4 × luminance_normalized
       + 0.4 × local_contrast_normalized
       + 0.2 × saturation_normalized
```

Where `luminance_normalized` is computed via `(0.299R + 0.587G + 0.114B) / 255`, `local_contrast_normalized` is the standard deviation of luminance values within the cell clamped to `[0,1]`, and `saturation_normalized` is HSL saturation / 100.

**Rendering:** Each cell filled with a color interpolated from `rgba(40,120,255,0.25)` (weight 0 — lightest, best for text) to `rgba(255,140,0,0.45)` (weight 1 — heaviest). Top three heaviest cells and top three lightest cells receive a small badge label.

**Performance:** Analysis runs synchronously on mouseup / frame-switch so it does not block rendering. Canvas is 1080-wide at display scale; 16 × 16 sampling across ~1080 px columns = ~68 px/cell — acceptable for real-time use.

### Draw Zones mode

Manually drawn rectangular zones for targeted analysis.

**Interaction:**

1. User clicks "Draw Zones" from the dropdown
2. Cursor on `#canvas-wrap` changes to crosshair
3. User drags a rectangle — a live cyan dashed outline follows the drag
4. On mouseup: zone is committed, a unique ID assigned (`z1`, `z2`, …)
5. Zone is analyzed immediately via `getImageData()` for its bounding box, mapped from CSS pixels to canvas pixels using `devicePixelRatio` and current canvas-to-display scale
6. The right-side Balance Panel opens automatically on first zone

**Zone overlay on canvas:** Dashed cyan rectangle (`rgba(90,200,250,0.8)`) with a small number badge at the top-left corner. Zones with a weight ≤ 4.0 / 10 display a green "✓ Good for text" badge.

**Zone limit:** Maximum 8 zones per session. The Draw Zones menu item disables at 8 zones with tooltip "Max 8 zones — clear some first."

**Per-zone analysis output fields:**

| Field | Description |
|-------|-------------|
| Avg Luminance | 0–100 integer |
| Contrast Score | Low / Medium / High (thresholds: <0.15 = Low, <0.35 = Medium, ≥0.35 = High) |
| Visual Weight | 0.0–10.0, one decimal place |
| Dominant Color | Hex swatch of the median R/G/B bucket across the zone |
| Text Recommendation | Suggested white or black text color, WCAG 2.1 contrast ratio, and pass/fail badge (AA / AAA / Fail) |
| Zone tone descriptor | Plain-English one-liner: e.g., "Mid-tone dark — good for white text" |

**WCAG contrast ratio** computed as `(L1 + 0.05) / (L2 + 0.05)` where L1 and L2 are relative luminances of the two colors per WCAG 2.1 §1.4.3.

---

## Balance Panel (Right-Side Panel)

### Placement

Absolutely positioned inside `#canvas-area`, fixed to the right edge. Width: 240 px. Top aligned with the canvas. Does not affect canvas layout — overlaps the canvas edge (same pattern as `#overlay-toolbar`). Z-index above canvas, below modal overlays.

### Visibility rule

Panel is shown when: heatmap is active **or** at least one zone exists. Hidden otherwise. Opening is automatic on first zone; closing requires clearing all zones and disabling the heatmap, or clicking the panel's close (×) button.

### Panel structure

```
┌─────────────────────────────────┐
│ Visual Analysis            [×]  │
│─────────────────────────────────│
│ [Clear All Zones]               │
│─────────────────────────────────│
│ Zone 1                     [×]  │
│ Luminance       62/100          │
│ Contrast        Medium          │
│ Weight          7.2/10          │
│ Dominant        ■ #3a4a5e       │
│─────────────────────────────────│
│ Text Recommendation             │
│ Use: ■ White #FFFFFF            │
│ WCAG ratio: 8.4:1  [AAA ✓]     │
│ Mid-tone dark — good for        │
│ white text.                     │
│─────────────────────────────────│
│ Zone 2                     [×]  │
│ ...                             │
└─────────────────────────────────┘
```

Zone cards are scrollable. Each card has an individual delete (×) button that removes the zone from both the panel and the canvas overlay.

---

## Toolbar Integration

### New button

`btn-balance` — icon button placed immediately after `btn-safe-zone` in the toolbar, before `btn-layers`.

**Icon:** Ternary balance / scales SVG (15×15 px, `currentColor`).

**Active state:** Button text/icon color changes to `var(--color-accent)` (`#5ac8fa`) when any guide is active or analysis is running. Matches the visual pattern of `btn-safe-zone` (amber) and `btn-layers` (accent).

**Keyboard shortcut:** `[B]` — toggles the dropdown open/closed (does not cycle guides; press again to close).

### Dropdown

Lightweight absolutely-positioned panel anchored below `btn-balance`. Closes on outside click or Escape key.

```
Visual Balance
─────────────────────
Composition Guides
  ○ Off
  ○ Rule of Thirds
  ○ Phi Grid
  ○ Golden Spiral
  ○ Center Cross
  ○ Diagonals
  ○ Quadrants
─────────────────────
Visual Analysis
  ⊕ Weight Heatmap    [toggle]
  ✎ Draw Zones        [toggle]
  ✕ Clear All Zones
```

Composition guide items are a radio group (one active at a time). Analysis items are checkboxes. "Clear All Zones" is always shown; it is disabled when no zones exist.

---

## State Model

### Renderer properties (added)

```js
renderer.activeGuide        = null   // string key or null
renderer.spiralOrientation  = 0      // 0–3
renderer.showHeatmap        = false
renderer.analysisZones      = []     // [{ id, x, y, w, h, analysis }]
```

### Persistence (localStorage via existing prefs object)

```js
prefs.active_guide   // string key of active composition guide, persisted across frames
```

Heatmap state and zones are **not** persisted — they reset on page reload and on frame switch.

---

## New Files

### `modules/visual-analysis.js`

Exports:

- `analyzeZone(imageData, x, y, w, h)` → zone analysis object
- `buildHeatmap(imageData, canvasW, canvasH, gridSize)` → `Float32Array` of `gridSize × gridSize` weight scores
- `wcagContrastRatio(hexFg, hexBg)` → number
- `recommendTextColor(avgR, avgG, avgB)` → `{ color: '#ffffff'|'#000000', ratio: number, level: 'AAA'|'AA'|'Fail' }`

No DOM dependencies. Pure functions only.

### `ui/balance-panel.js`

Exports:

- `buildBalancePanel(canvasArea)` → panel DOM element, attached to `#canvas-area`
- `updateBalancePanel(panel, zones, heatmapActive)` → re-renders zone cards
- `destroyBalancePanel(panel)` → removes from DOM

---

## Modified Files

| File | Summary of change |
|------|-------------------|
| `modules/renderer.js` | Add `drawCompositionGuide()`, `drawHeatmap()`, `drawZoneOverlays()` functions; add four new renderer props; call them in `renderFrame()` inside the `!forExport` gate |
| `ui/shell.js` | Add `btn-balance` HTML to toolbar; return it from `buildToolbar()`; update `updateToolbarState()` to handle balance active state |
| `app.js` | Wire `btn-balance` click → dropdown; handle guide selection, heatmap toggle, zone draw mode, `[B]` shortcut; persist `active_guide` to prefs |
| `styles/components.css` | Add dropdown styles, balance panel styles, zone draw cursor state |

---

## Constraints and Edge Cases

- **Zone coordinate mapping:** CSS pixel coordinates from drag events must be converted to canvas pixel coordinates using the ratio `canvas.width / canvas.getBoundingClientRect().width` before calling `getImageData()`.
- **Frame switch:** All `analysisZones` cleared and Balance Panel updated (or hidden) on every frame navigation event.
- **Heatmap stale data:** Heatmap re-samples on every `renderFrame()` call when `showHeatmap === true`. If no canvas data is available (project not loaded), heatmap silently does nothing.
- **Export safety:** All guide, heatmap, and zone overlay drawing is inside the existing `if (!forExport)` gate in `renderFrame()`. `renderThumbnail()` also skips all overlays.
- **Spiral rendering:** The golden spiral is approximated via a sequence of quarter-circle arcs following the Fibonacci rectangle decomposition. Four orientations are pre-computed at draw time via canvas transform mirroring — no pre-computed path arrays needed.
