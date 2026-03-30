# Solid Blocks — Design Tool and Text Readability

**Date:** 2026-03-30
**Status:** Approved

---

## Purpose

Solid blocks serve two equal roles:

**1. Legibility** — when the text zone has heavy texture, repeating pattern, or competing hues, a gradient overlay produces uneven contrast. A solid opaque shape gives the text a flat surface to read against, eliminating the problem entirely.

**2. Aesthetic** — solid geometric forms are a first-class design tool. A bold color block, a white circle breaking a monotone composition, a black bar that anchors the frame — these are editorial design statements, not workarounds. They add visual energy, structure, and character to compositions that would otherwise read as flat or static.

Neither role is a fallback. Both are legitimate reasons to reach for a solid block.

The existing `shape` layer already supports `fill_color` + `fill_opacity: 1.0` — solid blocks are not a new type. What is missing is:

1. Documentation of solid blocks as a design tool in the AI manual and all dependent skills/README
2. A height control in the shape toolbar (currently only width is adjustable)
3. A way to add shape layers from the UI without editing JSON

---

## Layer model

No new layer type. Solid blocks are `shape` layers with `fill_opacity` at or near `1.0`.

### Canonical presets

| Preset | `shape` | Default dimensions | Use |
|---|---|---|---|
| Bar | `rectangle` | `width_pct: 100, height_pct: 26` | Covers bottom of photo — text readability and/or bold editorial anchor |
| Square | `rectangle` | `width_pct: 25, height_pct: 25` | Badge behind stat or label; geometric accent block |
| Circle | `circle` | `width_pct: 20, height_pct: 20` | Circular badge; graphic focal point; frame within a frame |

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

Add a new **"Solid Blocks"** section in the Overlay Rules area.

Content:
- Two equal roles: legibility (text zone too busy for overlay) and aesthetic (bold design statement on flat/static compositions)
- Decision guide: study the text zone — if texture or hue conflict makes a gradient insufficient, or if the composition needs a strong graphic element, a solid block is the right tool
- Three preset examples with full JSON (bar, square, circle)
- Updated layer order rule: `image → overlay(s) → solid blocks → shapes → text`
- Note: text layer goes above the solid block; a gradient is not needed for that zone
- Examples of aesthetic use: a colored rectangle as a design accent, a circle breaking visual monotony, a bar giving compositional weight

Also update the **Shapes — Use Them Intentionally** table to add solid-block use cases alongside the existing decorative shape purposes.

### `.claude/skills/frameforge-art-director/SKILL.md`

Extend the **Overlay gate** with a solid-block branch, and add a new **Solid block gate** after it:

**Overlay gate addition:**
> If the text zone is high-texture or color-conflicted: consider a solid block instead of or alongside the gradient. A solid rectangle at the bottom eliminates the readability problem entirely. State your decision explicitly — "used solid block" or "gradient sufficient."

**New Solid block gate:**
> Independently of text readability: does this frame feel static, flat, or visually inert? A solid block — a bold rectangle, a circle, a color band — can inject graphic energy and structure. This is an aesthetic decision, not a technical fix. Ask: would a strong geometric form make this frame more compelling? If yes, add it. State your decision explicitly.

### `.claude/skills/frameforge-color-advisor/SKILL.md`

Add a note under the **Busy / high-texture** risk row in the zone assessment table:

> Flag as solid-block candidate for the art director. Note: if a solid block is used, color analysis for that zone changes — text reads against the block color, not the photo.

### `frameforge/data/test-projects/README.md`

Add a **"Overlay vs. solid block — know when to use each"** callout in Step 5b, and expand the Step 8 "Looking at each frame" section:

**Step 5b addition:**
> Study each frame's text zone in the thumbnail before choosing a readability tool. If the zone has strong texture, repeating pattern, or competing hues — a gradient overlay will produce uneven contrast. A solid block (rectangle or circle) eliminates the problem: text reads against a flat surface.
>
> Also consider solid blocks for purely aesthetic reasons: a bold color bar, a graphic circle, a geometric accent can transform a flat or static composition into something with visual weight and editorial character. These are design statements, not workarounds.

**Step 8 addition (under "Does the frame breathe?"):**
> **Is this frame too static?** If the composition reads as flat — same tone throughout, no graphic tension — ask whether a solid block would give it structure. A strong rectangle or circle can do what no amount of text adjustment can: add a visual anchor that makes the frame feel designed rather than assembled.

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
