# Overlay Toolbar Redesign + Shared Color Picker

**Date:** 2026-03-31
**Scope:** UI only — no layer/framework property changes. One new project-level field (`palette`).

---

## Goals

1. Make the overlay toolbar draggable and persistent (like the layers panel).
2. Redesign the gradient controls so Start/End stops are immediately legible.
3. Replace the raw `<input type="color">` with a shared `ColorPicker` component used across all toolbars (overlay, text, shape).
4. The color picker surfaces project palette colors, saved colors, tonal variations, and color harmonies — while still allowing full freeform color selection.

---

## 1. Overlay Toolbar Structure

Three stacked sections, always in this order:

```
┌─────────────────────────────────┐
│ ⠿  Overlay                   🗑 │  drag handle bar
├─────────────────────────────────┤
│ [●] [━━━━━━━●━━━] 80%  [Normal▾]│  fill row
├─────────────────────────────────┤
│ ▼ Gradient                      │  collapsible section
│  [▓▓░][░▓▓][▓░░][░░▓]           │  direction swatches
│  Start                          │
│  Opacity  [━━━━●━━━━━━━━] 0%    │
│  Position [●━━━━━━━━━━━━] 0%    │
│  End                            │
│  Opacity  [━━━━━━━━━━●━━] 80%   │
│  Position [━━━━━━━━━━━━●] 100%  │
└─────────────────────────────────┘
```

### 1a. Drag handle bar
- Top bar: grip icon (`⠿`) + label "Overlay" + delete button (🗑) at right.
- Draggable via `mousedown` on the bar (excluding the delete button).
- Position saved to `localStorage` as `ff.overlay_toolbar_pos` (`{ left, top }`).
- `show()` restores saved position. First-show with no saved position defaults to right of canvas (same as current `positionElementRight` behavior).
- `app.js` no longer calls `positionElementRight(overlayToolbarEl)` when a saved position exists.

### 1b. Fill row
- **Color swatch** — styled `<div>` showing current color. Click opens `ColorPicker` popover (see §3).
- **Opacity slider** — `<input type="range" min=0 max=100 step=1>` with live `%` label. Maps to `layer.opacity`. Replaces the `Op −/+` stepper.
- **Blend mode dropdown** — unchanged (`normal`, `multiply`, `screen`, `overlay`, `soft-light`).

### 1c. Gradient section
- Toggle header "▼ Gradient" / "▶ Gradient". Collapsed by default (unchanged from today).
- When expanded, shows direction swatches then two stop rows.

**Direction swatches** — four `<button>` elements, each a `~28×20px` CSS gradient swatch:
| Swatch | CSS | Meaning |
|--------|-----|---------|
| Bottom fade | `linear-gradient(to top, #888, transparent)` | color at bottom |
| Top fade | `linear-gradient(to bottom, #888, transparent)` | color at top |
| Left fade | `linear-gradient(to right, #888, transparent)` | color at left |
| Right fade | `linear-gradient(to left, #888, transparent)` | color at right |

Selected swatch highlighted with `var(--color-accent)` border. Maps to `layer.gradient.direction`.

**Stop rows:**

| Label | Slider | Range | Step | Maps to |
|-------|--------|-------|------|---------|
| Start — Opacity | range | 0–100 | 1 | `gradient.from_opacity × 100` |
| Start — Position | range | 0–100 | 1 | `gradient.from_position_pct` |
| End — Opacity | range | 0–100 | 1 | `gradient.to_opacity × 100` |
| End — Position | range | 0–100 | 1 | `gradient.to_position_pct` |

Each slider shows a live `%` value to its right.
The underlying data model (`from_opacity`, `from_position_pct`, `to_opacity`, `to_position_pct`) is unchanged.

---

## 2. Project Palette Data

A single new field at the project level in the project JSON:

```json
{
  "palette": [
    { "hex": "#F5EFE0", "name": "Warm White" },
    { "hex": "#C4782A", "name": "River Amber" },
    { "hex": "#1B3826", "name": "Deep Canopy" }
  ]
}
```

- `palette` is an array of `{ hex: string, name: string }` objects.
- It is project-level, not frame-level, not layer-level.
- The app reads it; agents write it when generating project JSON.
- If `palette` is absent or empty, the palette section is hidden in the color picker.
- No changes to any layer properties or the renderer.

---

## 3. Shared ColorPicker Component

A new `ColorPicker` class (`ui/color-picker.js`) used by all toolbars wherever a color is chosen.

### Popover layout

```
┌────────────────────────────────┐
│ Project palette                │
│ [■] [■] [■]                    │  swatches from project.palette
│  ↓ (one expanded at a time)    │
│  Tones:   [░][▒][■][▓][█]     │  5 tonal steps
│  Harmony: [■][■][■][■]         │  complementary + 2 analogous + split-comp
├────────────────────────────────┤
│ Saved colors  [■][■] [+]       │  from localStorage ff.saved_colors
├────────────────────────────────┤
│ [ Custom color ]               │  opens native <input type="color">
└────────────────────────────────┘
```

### Behavior

- **Palette swatches** — clicking applies the color immediately. Hovering shows a tooltip with the hex value and name.
- **Expansion** — clicking a palette swatch expands an inline strip beneath it showing Tones and Harmony rows. Only one swatch expands at a time.
  - **Tones row** (5 swatches): same hue and saturation, lightness stepped from +40% to −40% in HSL.
  - **Harmony row** (4 swatches): complementary (hue +180°), 2 analogous (hue ±30°), split-complementary (hue +150°).
- **Re-anchoring** — clicking any derived swatch (tone or harmony) applies it *and* re-anchors the expansion to that color, showing its own tones and harmonies. This allows drilling into derived colors indefinitely.
- **Saved colors** — persisted in `localStorage` as `ff.saved_colors` (array of hex strings). `[+]` saves the currently active color. Right-clicking a saved swatch removes it.
- **Custom color** — opens native `<input type="color">` pre-filled with the current color. Any resulting color is reflected back in the popover and can be saved.
- **Positioning** — the popover opens above or below the trigger swatch, clamped to the viewport.

### Interface

```js
const picker = new ColorPicker({
  getColor: () => layer.color,
  setColor: (hex) => { layer.color = hex; onChange(layer); },
  getProject: () => project,   // for palette access
});
picker.attach(swatchEl);       // binds click → open/close popover
picker.detach();               // cleanup
```

- `ColorPicker` manages its own popover DOM, appended to `document.body`.
- Toolbars hold a `ColorPicker` instance per color swatch.
- The popover is dismissed on outside click or `Escape`.

### Color math (pure JS, no libraries)

- **HSL conversion** — hex → RGB → HSL → back to hex.
- **Tones** — vary `L` in steps: `[L+40, L+20, L, L−20, L−40]`, clamped to `[5, 95]`.
- **Harmonies** — rotate `H`: complement `H+180`, analogous `H±30`, split-comp `H+150`; keep `S` and `L` from source.

---

## 4. Files Changed

| File | Change |
|------|--------|
| `frameforge/ui/overlay-toolbar.js` | Full rewrite — drag handle, sliders, direction swatches, gradient stop rows |
| `frameforge/ui/color-picker.js` | New file — shared `ColorPicker` component |
| `frameforge/ui/text-toolbar.js` | Replace color `<input type="color">` with `ColorPicker` |
| `frameforge/ui/shape-toolbar.js` | Replace color `<input type="color">` with `ColorPicker` |
| `frameforge/styles/components.css` | New styles for `.ot-*` (updated), `.cp-*` (color picker) |
| `frameforge/app.js` | Skip `positionElementRight` for overlay toolbar when saved pos exists |
| `frameforge/modules/project.js` | Expose `project.palette` getter (reads from project JSON) |

---

## 5. Out of Scope

- No changes to overlay layer data properties (`color`, `opacity`, `blend_mode`, `gradient.*`).
- No changes to the renderer.
- No changes to frame or project structure beyond the `palette` array.
- Palette editing UI (palette is read-only in the app; agents write it).
- `image-toolbar.js` — image layers have no color property; no color picker needed there.
