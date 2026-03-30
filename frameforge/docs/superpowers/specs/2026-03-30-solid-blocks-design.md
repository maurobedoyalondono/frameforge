# Solid Blocks — Text Readability Shapes

**Date:** 2026-03-30
**Status:** Approved

---

## Problem

Gradient overlays fail as text-readability tools when the text zone has heavy texture, repeating pattern, or competing hues. The gradient darkens the area but uneven contrast remains — the text still fights the photo. A solid opaque shape behind text eliminates the problem entirely by giving the text a flat surface to read against.

The existing `shape` layer already supports `fill_color` + `fill_opacity: 1.0` — solid blocks are not a new type. What is missing is:

1. Documentation of the solid-block pattern in the AI manual and all dependent skills/README
2. A height control in the shape toolbar (currently only width is adjustable)
3. A way to add shape layers from the UI without editing JSON

---

## Layer model

No new layer type. Solid blocks are `shape` layers with `fill_opacity` at or near `1.0`.

### Canonical presets

| Preset | `shape` | Default dimensions | Typical use |
|---|---|---|---|
| Bar | `rectangle` | `width_pct: 100, height_pct: 26` | Covers bottom of photo; text sits on top |
| Square | `rectangle` | `width_pct: 25, height_pct: 25` | Badge behind a stat or short label |
| Circle | `circle` | `width_pct: 20, height_pct: 20` | Circular badge behind callout or icon |

### Default inserted JSON (Bar)

```json
{
  "id": "solid-block-1",
  "type": "shape",
  "shape": "rectangle",
  "position": { "x_pct": 50, "y_pct": 87 },
  "dimensions": { "width_pct": 100, "height_pct": 26 },
  "fill_color": "#000000",
  "fill_opacity": 0.85
}
```

Opacity defaults to `0.85` so the image edge is still faintly visible; user can push to `1.0` via the toolbar.

### Layer order

```
image → overlay(s) → solid blocks → decorative shapes → text
```

Solid blocks sit above overlays and below text. A frame may use both a gradient overlay (for mood/consistency) and a solid block (for text readability) on the same frame.

---

## UI changes

### 1. Layers panel header — add-layer buttons

Three new icon buttons added to the left of the existing show-all/hide-all buttons:

```
[ + T ] [ ◼ ] [ ▓ ] | [ 👁 ] [ ⊘ ]
```

- `+ T` — inserts a default text layer
- `◼` — opens a shape-type popover (see below)
- `▓` — inserts a default gradient overlay layer

On click, the new layer is added to `frame.layers`, selected, the frame re-renders, and the appropriate contextual toolbar appears.

Layer IDs are auto-generated as `text-N`, `solid-block-N`, `overlay-N` where N increments to avoid collisions.

### 2. Shape-type popover (from ◼ button)

Clicking `◼` opens a small popover with three options:

```
┌─────────────┐
│ ▬  Bar      │
│ ■  Square   │
│ ●  Circle   │
└─────────────┘
```

Each option inserts the corresponding preset (dimensions defined above) and closes the popover. Clicking outside the popover closes it without inserting.

### 3. Shape toolbar — height control

Current row:
```
[ Fill color ] | [ Op − val + ] | [ ↔ − val% + ] | [ 🗑 ]
```

New row:
```
[ Fill color ] | [ Op − val + ] | [ ↔ − val% + ] | [ ↕ − val% + ] | [ 🗑 ]
```

`↕` controls `dimensions.height_pct` in 2% steps, range 5–100%. Shown for all shape types for simplicity. Exception: `line` shapes use `height_px` (stroke thickness), not `height_pct` — the `↕` control has no effect on lines and can be ignored.

---

## Documentation changes

### `frameforge/data/ai-manual-content.js`

Add a new **"Solid Blocks — Text Readability"** section in the Overlay Rules area.

Content:
- When to use a solid block instead of a gradient overlay (heavy texture, color conflict, deliberate design choice)
- Three preset examples with full JSON
- Updated layer order rule: `image → overlay(s) → solid blocks → shapes → text`
- Note: text layer goes above the solid block, no gradient needed for that zone

Also update the **"When NOT to use"** shape guidance to note that solid blocks ARE an intentional use of shapes — they are not decoration but a readability tool.

### `.claude/skills/frameforge-art-director/SKILL.md`

Extend the **Overlay gate** with a solid-block branch:

> If the text zone is high-texture or color-conflicted: consider a solid block instead of or alongside the gradient. A solid rectangle at the bottom eliminates the readability problem entirely. State your decision explicitly — "used solid block" or "gradient sufficient."

### `.claude/skills/frameforge-color-advisor/SKILL.md`

Add a note under the **Busy / high-texture** risk row in the zone assessment table:

> Flag as solid-block candidate for the art director. Note: if a solid block is used, color analysis for that zone changes — text reads against the block color, not the photo.

### `frameforge/data/test-projects/README.md`

Add a **"Choosing between overlay and solid block"** callout in Step 5b and a parallel note in Step 8:

> Look at the text zone in the thumbnail. If the zone has strong texture, repeating pattern, or competing hues — a gradient overlay will produce uneven contrast. In those cases, a solid block (rectangle or circle) eliminates the problem: the text reads against a flat surface.
>
> This is an editorial decision, not a fallback. A bold black bar at the bottom is a legitimate design choice in its own right. Study each photo's text zone before deciding.

---

## Files changed

| File | Change |
|---|---|
| `frameforge/data/ai-manual-content.js` | New "Solid Blocks" section; updated layer order rule |
| `frameforge/ui/layers-panel.js` | Add-layer buttons in header; shape-type popover |
| `frameforge/ui/shape-toolbar.js` | Height control (`↕`) added |
| `frameforge/app.js` | Wire up add-layer callbacks; default layer factories |
| `frameforge/index.html` | No changes needed (toolbars already in DOM) |
| `.claude/skills/frameforge-art-director/SKILL.md` | Overlay gate extended with solid-block branch |
| `.claude/skills/frameforge-color-advisor/SKILL.md` | Busy/high-texture row gets solid-block flag note |
| `frameforge/data/test-projects/README.md` | Solid-block guidance in Step 5b and Step 8 |

---

## Out of scope

- No new layer type (`solid_block`) — existing `shape` type is sufficient
- No per-shape toolbar variants — height control applies to all shapes
- No stroke controls added to this toolbar row (stroke already works via JSON; a separate stroke-toolbar pass can be done later if needed)
