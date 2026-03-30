# FrameForge Layer Reference

This reference is addressed to the art director. It covers every layer type available in the FrameForge JSON, the positioning system, overlay mechanics, typography rules, shape library, and decorative layer rules. Read this before making any layout decision.

---

## Layer Types

Layers are rendered bottom-to-top. Every layer requires `"id"` (unique within frame) and `"type"`.

### image
```json
{
  "id": "base-photo",
  "type": "image",
  "src": "hero-landscape",
  "fit": "cover",
  "position": { "x_pct": 50, "y_pct": 50 },
  "opacity": 1.0
}
```
- `src` must match the frame's `image_src` label exactly
- `fit`: "cover" (fill, crop), "contain" (fit, letterbox), "fill" (stretch)
- `position`: focal point — x_pct 0=left 100=right, y_pct 0=top 100=bottom. Set this thoughtfully based on the image description provided in the brief.

### overlay
```json
{
  "id": "dark-overlay",
  "type": "overlay",
  "color": "#000000",
  "opacity": 1.0,
  "blend_mode": "normal",
  "gradient": {
    "enabled": true,
    "direction": "to-bottom",
    "from_opacity": 0.0,
    "to_opacity": 0.72,
    "from_position_pct": 45,
    "to_position_pct": 100
  }
}
```
- `blend_mode`: "normal", "multiply", "screen", "overlay", "soft-light"
- gradient `direction`: "to-bottom", "to-top", "to-right", "to-left", "to-bottom-left", "to-bottom-right"

### text
```json
{
  "id": "main-title",
  "type": "text",
  "content": "Your text here",
  "font": {
    "family": "Playfair Display",
    "style": "normal",
    "weight": 700,
    "size_pct": 9.5,
    "line_height": 1.1,
    "letter_spacing_em": -0.02,
    "color": "#FFFFFF",
    "opacity": 1.0
  },
  "position": {
    "mode": "zone",
    "zone": "bottom-left",
    "offset_x_pct": 6,
    "offset_y_pct": -28
  },
  "max_width_pct": 80,
  "align": "left",
  "shadow": {
    "enabled": true,
    "color": "#000000",
    "opacity": 0.4,
    "blur_px": 12,
    "offset_x": 0,
    "offset_y": 2
  }
}
```
- **NEVER use pixel font sizes. Always use `size_pct`.**
- **Always set `max_width_pct` on every text layer.**
- Position `mode`: "zone" or "absolute"
- `zone` values: "top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right"
- For bottom zones, negative `offset_y_pct` moves UP (away from edge)

### Shape Layer

Geometric figures for visual composition. Use shapes to add dividers, accents, badges, and callouts.

**Fill + Stroke model:**
- `fill_color` + `fill_opacity` — interior fill (omit for no fill)
- `stroke_color` + `stroke_width_px` + `stroke_opacity` — outline (omit for no outline)
- Backwards compatible: if only `color` + `opacity` are provided, they act as fill

**Shape types:**

| `shape` | Description | Key extra fields |
|---|---|---|
| `line` | Horizontal or angled line | `angle_deg` (default 0) |
| `rectangle` | Filled/outlined rectangle | `border_radius_px`, `dimensions.width_pct`, `dimensions.height_pct` |
| `circle` | Circle or ellipse | `dimensions.width_pct`, `dimensions.height_pct` (equal = circle) |
| `triangle` | Triangle | `direction`: up/down/left/right |
| `arrow` | Line with arrowhead | `angle_deg`, `arrowhead`: end/start/both |
| `polygon` | Regular polygon or star | `sides` (3–12), `star`: true/false, `inner_radius_pct` |
| `polyline` | Multi-point open stroke | `points`: array of `{x_pct, y_pct}` |
| `path` | SVG-style bezier curve | `d`: SVG path string (relative % coords) |
| `image_mask` | Image asset used as silhouette mask | `asset`: asset name, `flip_x`: boolean |

All shape types support `blend_mode`: `"normal"` (default), `"multiply"`, `"screen"`, `"overlay"`, `"soft-light"`

**Position:** All shapes accept the same `position` object as text layers (zone mode or absolute mode).

**Dimensions:** Use `dimensions.width_pct` for width (as % of canvas width). For circle/ellipse use `height_pct` separately. Line/arrow use `height_px` for thickness.

**Examples:**

Circle accent ring:
```json
{ "type": "shape", "id": "ring", "shape": "circle",
  "position": { "zone": "middle-center" },
  "dimensions": { "width_pct": 40, "height_pct": 40 },
  "stroke_color": "#FFFFFF", "stroke_width_px": 2, "stroke_opacity": 0.4 }
```

Diagonal accent line:
```json
{ "type": "shape", "id": "slash", "shape": "line", "angle_deg": 45,
  "position": { "x_pct": 5, "y_pct": 80 },
  "dimensions": { "width_pct": 20, "height_px": 2 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.5 }
```

Hexagon badge:
```json
{ "type": "shape", "id": "hex", "shape": "polygon",
  "sides": 6, "star": false,
  "position": { "zone": "top-right", "offset_x_pct": -4, "offset_y_pct": 4 },
  "dimensions": { "width_pct": 16 },
  "fill_color": "#000000", "fill_opacity": 0.6,
  "stroke_color": "#FFFFFF", "stroke_width_px": 1, "stroke_opacity": 0.7 }
```

### Shapes — Use Them Intentionally

Every shape must earn its place.

**When shapes serve a purpose — use them:**

| Purpose | Shape type | Example |
|---|---|---|
| Visual divider between sections | `line` | Horizontal rule between location tag and headline |
| Accent / badge | `rectangle`, `circle`, `polygon` | Colour badge behind a stat, circle frame |
| Callout / pointer | `arrow` | Drawing attention to a subject detail |
| Geometric accent | `triangle`, `polygon` | Star or diamond accent in a corner |
| Angled energy | `line` with `angle_deg` | Diagonal slash for bold/documentary |
| Location identity / scene depth | `image_mask` | Silhouette at frame bottom |
| Multi-point stroke / terrain | `polyline` | Winding road, angular ridgeline |
| Organic curve / compositional guide | `path` | Sweeping arc, curved river, framing loop |

**When NOT to use a shape:**
- Do not add a rule line above a headline just because the layout has a headline
- Never place a line above `stats_block` or numeric content
- Do not add shapes to fill empty space

### stats_block
```json
{
  "id": "stats-row",
  "type": "stats_block",
  "layout": "horizontal",
  "position": { "mode": "zone", "zone": "bottom-left", "offset_x_pct": 6, "offset_y_pct": -5 },
  "gap_pct": 6,
  "items": [
    {
      "value": "483",
      "label": "SPECIES OF BIRDS",
      "value_font": { "family": "Inter", "weight": 700, "size_pct": 4.5, "color": "#FFFFFF" },
      "label_font": { "family": "Inter", "weight": 400, "size_pct": 1.1, "color": "#999999", "letter_spacing_em": 0.1 }
    }
  ]
}
```

#### Stats content standards

Numbers and measurements must be written in full:

| Wrong | Right |
|---|---|
| "4-5 m" | "From 4 to 5 meters" |
| "100+" | "Over 100" |
| "~200 km" | "Nearly 200 kilometers" |
| "50%" | "50 percent" |
| "3x" | "3 times" |
| "2 hrs" | "2 hours" |

**Rules:**
- Ranges: "From X to Y [unit spelled out]" — never a hyphen range
- Approximations: "Over", "Up to", "Nearly", "More than" — never + or ~
- Units: spell out in full (meters, kilometers, kilograms, hours)
- Value and label together must form a grammatically coherent statement when read aloud

### logo
```json
{
  "id": "brand-logo",
  "type": "logo",
  "src": "logo.png",
  "position": { "mode": "zone", "zone": "top-left", "offset_x_pct": 4, "offset_y_pct": 3 },
  "width_pct": 7,
  "opacity": 0.9
}
```

**white_frame** (optional) — draws a white border around all frame content:
```json
"white_frame": { "enabled": true, "size_px": 40 }
```
Typical values: 20–80 px for social, 40–120 px for print. Omit if not needed.

---

## Typography Rules

- **Fonts load from Google Fonts (requires internet).** Always use valid Google Fonts family names. An invalid name silently falls back to system sans-serif with no warning.
- **Pair exactly two fonts**: one display (headlines) + one sans-serif (labels, body, stats)
- **Recommended pairings:**
  - `Playfair Display` + `Inter` — editorial, nature, travel
  - `Cormorant Garamond` + `Montserrat` — luxury, fine art
  - `Bebas Neue` + `Source Sans 3` — bold, documentary
  - `DM Serif Display` + `DM Sans` — clean modern editorial
- **Font role assignments:**
  - Display font: headlines and display text only
  - Sans-serif font: stats values, stats labels, body text, captions, any layer whose primary content is a number
  - Display and serif fonts are **prohibited** for `stats_block` `value_font` and any text layer whose primary content is a number
- **size_pct guidelines:**
  - Display headline: 8–12
  - Secondary headline: 5–8
  - Body / caption: 2.5–3.5 (minimum 2.5 — below this is unreadable on mobile)
  - Labels / eyebrow: 1.8–2.5 (all-caps labels minimum 1.8)
  - Stats label: 1.4–1.8
  - Stats value: 4–6
- Uppercase labels: `letter_spacing_em: 0.1–0.2`
- Headlines: `letter_spacing_em: -0.01 to -0.03`

---

## Overlay Rules

Overlays serve two purposes: **readability** (text contrast) and **mood** (color temperature, series consistency).

### Layer order
Always: image → overlay(s) → shapes → text.

### When to use which overlay type

**Gradient overlay (default):**
Use when text is anchored to one edge. The gradient creates contrast only where needed.
```json
{
  "type": "overlay",
  "color": "#000000",
  "opacity": 1.0,
  "blend_mode": "normal",
  "gradient": {
    "enabled": true,
    "direction": "to-bottom",
    "from_opacity": 0.0,
    "from_position_pct": 40,
    "to_opacity": 0.72,
    "to_position_pct": 100
  }
}
```
Match direction to text location: text at bottom → `to-bottom`. Text at top → `to-top`.

**Flat overlay (mood layer):**
Use as a second overlay to unify cross-frame color temperature. Keep subtle.
```json
{ "type": "overlay", "color": "#1a0a00", "opacity": 0.25, "blend_mode": "normal", "gradient": { "enabled": false } }
```
Opacity range: 0.15–0.35.

**Duotone effect:**
```json
{ "id": "duo-shadow", "type": "overlay", "color": "#0d1a2e", "opacity": 0.6, "blend_mode": "multiply" }
{ "id": "duo-highlight", "type": "overlay", "color": "#c8783a", "opacity": 0.3, "blend_mode": "screen" }
```

### Overlay opacity guidelines by image type
| Image character | Gradient to_opacity | Flat overlay opacity |
|---|---|---|
| Bright, high-key | 0.75–0.85 | 0.25–0.35 |
| Balanced, natural light | 0.60–0.75 | 0.15–0.25 |
| Dark, moody, golden hour | 0.45–0.60 | 0.10–0.20 |
| Very dark / night | 0.30–0.45 | 0.05–0.15 |

Do not over-darken dark photos — they lose depth.

### Vary overlays per frame
Opacity and gradient stops may differ per frame. Overlay color and blend mode should stay consistent across the series.

---

## Layout Reference

> **Editorial preference, not a hard rule.** Bottom-left is the conventional starting point — it anchors text in the reading zone and keeps the photograph open above. If the image's composition calls for a different placement, use it. The photograph decides.

- Keep all text at least 5–6% from canvas edges (avoids cropping on all platforms)

### How bottom-zone positioning works

For bottom zones (`bottom-left`, `bottom-center`, `bottom-right`), `offset_y_pct` controls where the **bottom edge of the text block** lands — text grows **upward** from that point.

- `offset_y_pct: -5` → bottom of text block at 95% of canvas height
- `offset_y_pct: -20` → bottom of text block at 80% of canvas height

Multi-line text wraps upward — no overflow at the bottom edge.

### Stacking rule — no overlap, no unnecessary gap

```
|A_offset_y_pct| = |B_offset_y_pct| + B_height_pct + gap_pct
```

Where `B_height_pct = size_pct × line_height × estimated_lines`.

**Use the minimum — do not add extra buffer.** A larger offset pushes text higher, creating a visible gap at the bottom.

**Worked example** — caption + headline only:
```
1. caption:  size_pct 2.5 × 1.5 × 3 lines ≈ 11%  →  offset_y_pct: -6
2. headline: size_pct 9.5 × 1.05 × 2 lines ≈ 20%  →  offset_y_pct: -20
```

**With stats block:**
```
1. stats:    ≈ 6% tall                              →  offset_y_pct: -6
2. caption:  -(6 + 6 + 2) = -14                    →  offset_y_pct: -14
3. headline: -(14 + 11 + 3) = -28                  →  offset_y_pct: -28
```

### Eyebrow / location labels — always use TOP zones

Labels above the main content must use `top-left` or `top-right` zones — never a bottom zone with a large negative offset. Bottom zones are bottom-anchored and will collide with the headline.

✅ Correct:
```json
{ "zone": "top-right", "offset_x_pct": -6, "offset_y_pct": 7 }
```

---

## Common Mistakes to Avoid

- ❌ Pixel font sizes — always use `size_pct`
- ❌ Text outside safe zone — keep `offset_x_pct` ≥ 5
- ❌ Overlay on a text-free frame — if this frame carries no text, it carries no overlay
- ❌ Over-darkening a dark photo — trust the image; use a lighter overlay
- ❌ More than 2 font families
- ❌ Missing `max_width_pct` on any text layer
- ❌ Duplicate layer IDs within a frame
- ❌ Opacity set on both layer root and font object
- ❌ Stacking elements too close — each element's offset must account for the height of the element below it plus a gap
- ❌ Generic placeholder text in content fields — write real editorial copy
- ❌ Stats written as abbreviations or ranges — write "From 4 to 5 meters", not "4-5 m"
- ❌ Display font for stats values or numeric content — always use the sans-serif font for numbers
- ❌ Decorative shape opacity above 0.35
- ❌ More than 5 decorative shape layers per frame

## Decorative Layer Rules

These rules apply to `polyline`, `path`, and `image_mask` — the three types used for illustrative scene geometry.

### Opacity discipline — hard ceilings

| Usage | `fill_opacity` / `stroke_opacity` |
|---|---|
| Background texture — barely-there | 0.08–0.15 |
| Visible but subordinate accent | 0.18–0.28 |
| Hard ceiling (renderer clamps above this) | **0.35** |

❌ Never set decorative shape opacity above 0.35.

### Quantity discipline

- Maximum **5 decorative shape layers** per frame
- Never place decorative shapes on a frame with 2+ text layers, unless the shape is a single low-opacity line
- When using multiple `image_mask` instances of the same asset, vary `height_pct`, position, and `fill_opacity` between instances

### Intent discipline

Every decorative shape must earn its place. Ask before placing any:
- Does it reinforce where this image was taken?
- Does it guide the eye toward or away from the subject?
- Does it add depth the photograph cannot provide on its own?

If you cannot answer yes to at least one of these, do not add the shape.

### When NOT to use decorative shapes

- Portrait frames where a person's face is the primary subject
- Frames with no clear environmental or geographic identity to reinforce
- Frames where the photograph already provides sufficient visual complexity

### `image_mask` — placement rules

- Match the asset to the actual environment. `frailejón` is for páramo, not beach.
- Place silhouettes in the compositional foreground (bottom or sides), never overlapping the subject's face
- Scale relative to the frame — 8–15% of canvas width reads as a frame element; 40% competes with the subject
- `flip_x` allows one asset to serve both sides without visual repetition

**Example — correct decorative use:**
```json
{ "id": "silhouette-left",  "type": "shape", "shape": "image_mask",
  "asset": "frailejón",
  "position": { "zone": "bottom-left",  "offset_x_pct": 3,  "offset_y_pct": -35 },
  "dimensions": { "width_pct": 10, "height_pct": 30 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.18 }

{ "id": "silhouette-right", "type": "shape", "shape": "image_mask",
  "asset": "frailejón",
  "position": { "zone": "bottom-right", "offset_x_pct": -5, "offset_y_pct": -40 },
  "dimensions": { "width_pct": 8, "height_pct": 24 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.13,
  "flip_x": true }
```