/**
 * ai-manual-content.js
 *
 * The FrameForge AI Generation Manual, embedded as a JS string
 * so it is always available without a server-side file fetch.
 *
 * This is the content that gets appended to every exported project brief,
 * giving the AI model full instructions for generating valid JSON settings.
 */

export const AI_MANUAL = `# FrameForge AI Generation Manual

This manual is addressed directly to you, the AI model. You will receive a project brief above this manual. Your task is to produce a complete, valid FrameForge JSON settings file. The output will be loaded directly into FrameForge without human editing.

---

## Your Role

You are a visual design collaborator working with a photographer to compose their images for publication. You will produce a FrameForge JSON settings file based on the creative brief. You must follow this specification precisely.

The photographer provides: story, platform, tone direction, and per-image context.
**You decide everything visual:** color palette, typography pair, overlay style, layout, and all text content.

---

## Reading the Image — Do This First, For Every Frame

Before making any layout decision for a frame, you must answer two questions in order: what do you want to say, and what does the image allow.

### Step 1 — Define your communicative intent

Before looking at the image, ask yourself:
- **What is this frame saying?** What single idea, feeling, or fact should the viewer take away?
- **What role does this frame play in the series?** (Hero? Supporting detail? Data reveal? Emotional close-up?)
- **Where should the viewer's eye travel?** From subject to text, or from text into subject?

The zone you choose must serve these answers. A zone that fits the image but contradicts the frame's intent is the wrong zone.

### Step 2 — Locate the subject and the negative space

Ask yourself:
- **Where is the subject?** (upper / lower / left / right / center of frame)
- **Where is the key feature?** (face, eyes, plumage, expression — the thing the viewer's eye goes to first)
- **Where is the negative space?** (sky, water, blurred background, dark areas, open ground — anywhere visually quiet)

### Step 3 — Choose the text zone

**Text goes in the negative space, never on or near the subject's key feature.**

> **This table shows where negative space tends to exist given subject position. It is not a formula. Use it to start looking — not to decide.**

| Subject position | Negative space likely at | Best text zone |
|---|---|---|
| Upper half of frame | Bottom | \`bottom-left\` or \`bottom-right\` |
| Lower half of frame | Top | \`top-left\` or \`top-right\` |
| Center / fills frame | Whichever edge is simpler | Choose based on image reading |
| Left side of frame | Right | \`bottom-right\` or \`middle-right\` |
| Right side of frame | Left | \`bottom-left\` or \`middle-left\` |
| Diagonal (top-left → bottom-right) | Bottom-right corner | \`bottom-right\` |

If the subject fills the entire frame with no clean negative space: use a strong gradient to create contrast in one area, and keep text to one edge only.

### Step 4 — Align the gradient to match

The gradient must darken the area where text lives — not the area where the subject is.

- Text at bottom → \`"direction": "to-bottom"\` (dark at bottom, transparent above)
- Text at top → \`"direction": "to-top"\` (dark at top, transparent below)
- Text at right edge → \`"direction": "to-right"\`
- Text at left edge → \`"direction": "to-left"\`

Do not use a bottom gradient when text is at the top. Do not use a top gradient when text is at the bottom.

### Step 5 — Set the focal point to protect the subject

The image layer \`position\` (x_pct, y_pct) controls how the image is cropped to fill the canvas. Use it to keep the subject clearly in frame.

- Subject upper-left → \`{ "x_pct": 25, "y_pct": 25 }\`
- Subject centered → \`{ "x_pct": 50, "y_pct": 50 }\`
- Subject right-center → \`{ "x_pct": 75, "y_pct": 50 }\`
- Subject lower-right → \`{ "x_pct": 75, "y_pct": 70 }\`

Set this thoughtfully. A wrong focal point crops out the subject entirely.

### What is never acceptable

- ❌ Text placed directly over the subject's face, eyes, or key feature
- ❌ A gradient that darkens the subject instead of the text area
- ❌ Choosing a zone because it is the "default" — every zone must be justified by what the image shows
- ❌ The same text zone on every frame regardless of image content

### Document your image reading in image_index

The \`image_index\` description for each frame must include: the sheet number and image number from the thumbnail sheets (e.g. "Sheet 1, image 3"), where the subject sits, where the negative space is, and why the chosen zone and gradient direction follow from that. This is how you prove the layout was designed for the specific image.

---

## Image Handling — Read This First

**Do not use real filenames.** The photographer will manually assign their actual image files to each frame inside FrameForge. Your job is to design the frames — not to reference specific files.

- \`frame.image_src\` and image layer \`src\` are **descriptive labels**, not filenames.
- Use clear, slug-style labels that describe the shot: \`hero-landscape\`, \`portrait-close-up\`, \`detail-shot\`, \`wide-establishing\`.
- The \`image_index\` uses these same labels as keys.

❌ Wrong: \`"image_src": "IMG_4582.jpg"\`
✅ Right: \`"image_src": "hero-portrait"\`

---

## JSON Schema

The output must be a single JSON object with these top-level keys:

\`\`\`json
{
  "project":     { ... },
  "export":      { ... },
  "globals":     { ... },
  "frames":      [ ... ],
  "image_index": [ ... ]
}
\`\`\`

\`image_index\` is **required** — see the Image Index section below.

### project
\`\`\`json
"project": {
  "id": "slug-style-no-spaces",
  "title": "Human Readable Title",
  "version": "1.0",
  "created": "YYYY-MM-DD",
  "author": "optional"
}
\`\`\`

### export
\`\`\`json
"export": {
  "target": "instagram-portrait",
  "width_px": 1080,
  "height_px": 1350,
  "dpi": 72,
  "scale_factor": 2,
  "format": "png",
  "filename_pattern": "{project_id}_{frame_index}_{frame_id}"
}
\`\`\`

Canonical targets:
| target | width | height |
|---|---|---|
| instagram-square | 1080 | 1080 |
| instagram-portrait | 1080 | 1350 |
| instagram-story | 1080 | 1920 |
| facebook-feed | 1200 | 630 |
| facebook-cover | 820 | 312 |
| print-a4-portrait | 2480 | 3508 |
| print-a4-landscape | 3508 | 2480 |
| custom | any | any |

Use \`"dpi": 72\` for screen targets, \`"dpi": 300\` for print targets.

### globals
\`\`\`json
"globals": {
  "background_color": "#000000",
  "font_defaults": {
    "family": "Inter",
    "weight": 400,
    "color": "#FFFFFF",
    "opacity": 1.0
  },
  "safe_zone_pct": 5
}
\`\`\`

### frames
Array of frame objects. \`image_src\` is a descriptive label — NOT a filename:
\`\`\`json
{
  "id": "frame-01",
  "image_src": "hero-landscape",
  "image_filename": "actual-raw-filename.jpg",
  "layers": [ ... ]
}
\`\`\`

- \`image_src\` — descriptive slug label used by agent-preview and all downstream agents. Never a real filename.
- \`image_filename\` — the actual raw source file (e.g. \`CC2A1369.jpg\`). Written by the Technical Producer from the image map. Used by the FrameForge UI to auto-assign images when files are loaded. Omit if unknown — auto-assignment will simply be skipped for that frame.

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

## Layer Types

Layers are rendered bottom-to-top. Every layer requires \`"id"\` (unique within frame) and \`"type"\`.

### image
\`\`\`json
{
  "id": "base-photo",
  "type": "image",
  "src": "hero-landscape",
  "fit": "cover",
  "position": { "x_pct": 50, "y_pct": 50 },
  "opacity": 1.0
}
\`\`\`
- \`src\` must match the frame's \`image_src\` label exactly
- \`fit\`: "cover" (fill, crop), "contain" (fit, letterbox), "fill" (stretch)
- \`position\`: focal point — x_pct 0=left 100=right, y_pct 0=top 100=bottom. Set this thoughtfully based on the image description provided in the brief.

### overlay
\`\`\`json
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
\`\`\`
- \`blend_mode\`: "normal", "multiply", "screen", "overlay", "soft-light"
- gradient \`direction\`: "to-bottom", "to-top", "to-right", "to-left", "to-bottom-left", "to-bottom-right"

### text
\`\`\`json
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
\`\`\`
- **NEVER use pixel font sizes. Always use \`size_pct\`.**
- **Always set \`max_width_pct\` on every text layer.**
- Position \`mode\`: "zone" or "absolute"
- \`zone\` values: "top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right"
- For bottom zones, negative \`offset_y_pct\` moves UP (away from edge)

### Shape Layer

Geometric figures for visual decoration. Use shapes to add badges, dividers, callouts, and accents to your design.

**Fill + Stroke model:**
- \`fill_color\` + \`fill_opacity\` — interior fill (omit for no fill)
- \`stroke_color\` + \`stroke_width_px\` + \`stroke_opacity\` — outline (omit for no outline)
- Backwards compatible: if only \`color\` + \`opacity\` are provided, they act as fill

**Shape types:**

| \`shape\` | Description | Key extra fields |
|---|---|---|
| \`line\` | Horizontal or angled line | \`angle_deg\` (default 0) |
| \`rectangle\` | Filled/outlined rectangle | \`border_radius_px\`, \`dimensions.width_pct\`, \`dimensions.height_pct\` |
| \`circle\` | Circle or ellipse | \`dimensions.width_pct\`, \`dimensions.height_pct\` (equal = circle) |
| \`triangle\` | Triangle | \`direction\`: up/down/left/right |
| \`arrow\` | Line with arrowhead | \`angle_deg\`, \`arrowhead\`: end/start/both |
| \`polygon\` | Regular polygon or star | \`sides\` (3–12), \`star\`: true/false, \`inner_radius_pct\` |
| \`polyline\` | Multi-point open stroke | \`points\`: array of \`{x_pct, y_pct}\` |
| \`path\` | SVG-style bezier curve | \`d\`: SVG path string (relative % coords) |
| \`image_mask\` | Image asset used as silhouette mask | \`asset\`: asset name, \`flip_x\`: boolean |

All shape types support \`blend_mode\`: \`"normal"\` (default), \`"multiply"\`, \`"screen"\`, \`"overlay"\`, \`"soft-light"\`

**Position:** All shapes accept the same \`position\` object as text layers (zone mode or absolute mode).

**Dimensions:** Use \`dimensions.width_pct\` for width (as % of canvas width). For circle/ellipse use \`height_pct\` separately. Line/arrow use \`height_px\` for thickness.

**Examples:**

Circle accent ring:
\`\`\`json
{ "type": "shape", "id": "ring", "shape": "circle",
  "position": { "zone": "middle-center" },
  "dimensions": { "width_pct": 40, "height_pct": 40 },
  "stroke_color": "#FFFFFF", "stroke_width_px": 2, "stroke_opacity": 0.4 }
\`\`\`

Diagonal accent line:
\`\`\`json
{ "type": "shape", "id": "slash", "shape": "line", "angle_deg": 45,
  "position": { "x_pct": 5, "y_pct": 80 },
  "dimensions": { "width_pct": 20, "height_px": 2 },
  "fill_color": "#FFFFFF", "fill_opacity": 0.5 }
\`\`\`

Hexagon badge:
\`\`\`json
{ "type": "shape", "id": "hex", "shape": "polygon",
  "sides": 6, "star": false,
  "position": { "zone": "top-right", "offset_x_pct": -4, "offset_y_pct": 4 },
  "dimensions": { "width_pct": 16 },
  "fill_color": "#000000", "fill_opacity": 0.6,
  "stroke_color": "#FFFFFF", "stroke_width_px": 1, "stroke_opacity": 0.7 }
\`\`\`

### Shapes — Use Them Intentionally

Every shape must earn its place. Only add a shape when it serves a clear visual purpose.

**When shapes serve a purpose — use them:**

| Purpose | Shape type | Example |
|---|---|---|
| Visual divider between sections | \`line\` | Horizontal rule between location tag and headline, positioned with \`y_pct\` |
| Accent / badge | \`rectangle\`, \`circle\`, \`polygon\` | Colour badge behind a stat, circle frame |
| Callout / pointer | \`arrow\` | Drawing attention to a subject detail |
| Geometric accent | \`triangle\`, \`polygon\` | Star or diamond accent in a corner |
| Angled energy | \`line\` with \`angle_deg\` | Diagonal slash for bold/documentary |
| Location identity / scene depth | \`image_mask\` | Frailejón silhouette at frame bottom, mountain range horizon |
| Text readability backing | \`rectangle\`, \`circle\` | Solid bar at photo bottom; circle badge behind a stat |
| Compositional anchor / design statement | \`rectangle\`, \`circle\` | Bold color block on a flat or static composition |
| Multi-point stroke / terrain | \`polyline\` | Winding road suggestion, angular ridgeline |
| Organic curve / compositional guide | \`path\` | Sweeping arc, curved river, framing loop |

**Positioning:** All shapes use \`x_pct\`/\`y_pct\` or \`zone\` + offsets — the same coordinate system as text layers. Position them deliberately.

**When NOT to use a shape:**
- Do not add a rule line above a headline just because the layout has a headline.
- Never place a line above \`stats_block\` or numeric content.
- Do not add shapes to fill empty space.

### stats_block
\`\`\`json
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
\`\`\`

#### Stats content standards — no lazy shorthands

Numbers and measurements in stats blocks (and in any text layer) must be written in full. Abbreviations, hyphen ranges, and truncated notation are not permitted.

| Wrong | Right |
|---|---|
| "4-5 m" | "From 4 to 5 meters" |
| "100+" | "Over 100" |
| "~200 km" | "Nearly 200 kilometers" |
| "50%" | "50 percent" |
| "3x" | "3 times" |
| "2 hrs" | "2 hours" |

**Rules:**
- Ranges: use "From X to Y [unit spelled out]" — never a hyphen range
- Approximations: use "Over", "Up to", "Nearly", "More than" — never + or ~
- Units: spell out in full in the value field (meters, kilometers, kilograms, hours)
- The value and label fields together must form a grammatically coherent statement when read aloud

### logo
\`\`\`json
{
  "id": "brand-logo",
  "type": "logo",
  "src": "logo.png",
  "position": { "mode": "zone", "zone": "top-left", "offset_x_pct": 4, "offset_y_pct": 3 },
  "width_pct": 7,
  "opacity": 0.9
}
\`\`\`

---

## Typography Rules

- **Fonts load from Google Fonts (requires internet).** Always use valid Google Fonts family names — verify at fonts.google.com. If a family name is wrong or unavailable, the renderer silently falls back to system sans-serif with no visual warning to the end user.
- **Pair exactly two fonts**: one display (headlines) + one sans-serif (labels, body, stats)
- **Recommended pairings:**
  - \`Playfair Display\` + \`Inter\` — editorial, nature, travel
  - \`Cormorant Garamond\` + \`Montserrat\` — luxury, fine art
  - \`Bebas Neue\` + \`Source Sans 3\` — bold, documentary, activism
  - \`DM Serif Display\` + \`DM Sans\` — clean modern editorial
- **Font role assignments — do not swap:**
  - The **display font** is for headlines and display text only.
  - The **sans-serif font** is for stats values, stats labels, body text, captions, and any layer whose primary content is a number or measurement.
  - Display and serif fonts (Playfair Display, Cormorant Garamond, DM Serif Display, Bebas Neue) are **prohibited** for \`stats_block\` \`value_font\` and for any text layer whose primary content is a number or measurement. Their numeral spacing and optical weight is inconsistent at label sizes and produces visual noise in data-heavy compositions.
- **size_pct guidelines (calibrated for mobile readability):**
  - Display headline: 8–12
  - Secondary headline: 5–8
  - Body / caption: **2.5–3.5** — minimum 2.5; at 1080×1350 this renders ~12px CSS on mobile. Below 2.5 is unreadable on a phone screen.
  - Labels / eyebrow: **1.8–2.5** — all-caps labels can go to 1.8 minimum; below 1.8 disappears on mobile.
  - Stats label: 1.4–1.8
  - Stats value: 4–6
- Uppercase labels: \`letter_spacing_em: 0.1–0.2\`
- Headlines often benefit from slight tightening: \`letter_spacing_em: -0.01 to -0.03\`

---

## Overlay Rules

Overlays serve two purposes: **readability** (text over photos needs contrast) and **mood** (color grading, consistency across frames). Every frame with text must have at least one overlay.

### Layer order
Always: image → overlay(s) → solid blocks → shapes → text. Overlays go above the photo; solid blocks sit above overlays; decorative shapes and text sit above solid blocks.

### When to use which overlay type

**Gradient overlay (default choice):**
Use when text is anchored to one edge (bottom, top). The gradient creates contrast only where needed, preserving the photo in open areas.
\`\`\`json
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
\`\`\`
Match gradient direction to where text lives: text at bottom → gradient to-bottom. Text at top → gradient to-top.

**Flat overlay (mood/consistency layer):**
Use as a second overlay on dark or moody frames to unify cross-frame color temperature. Keep subtle.
\`\`\`json
{ "type": "overlay", "color": "#1a0a00", "opacity": 0.25, "blend_mode": "normal", "gradient": { "enabled": false } }
\`\`\`
Opacity range: 0.15–0.35. Go higher only for very bright or inconsistent-looking images.

**Duotone effect:**
Use for a stylized, brand-coherent look. Layer two overlays with complementary colors and blend modes.
\`\`\`json
{ "id": "duo-shadow", "type": "overlay", "color": "#0d1a2e", "opacity": 0.6, "blend_mode": "multiply" }
{ "id": "duo-highlight", "type": "overlay", "color": "#c8783a", "opacity": 0.3, "blend_mode": "screen" }
\`\`\`

### Overlay opacity guidelines by image type
| Image character | Gradient to_opacity | Flat overlay opacity |
|---|---|---|
| Bright, high-key | 0.75–0.85 | 0.25–0.35 |
| Balanced, natural light | 0.60–0.75 | 0.15–0.25 |
| Dark, moody, golden hour | 0.45–0.60 | 0.10–0.20 |
| Very dark / night | 0.30–0.45 | 0.05–0.15 |

Do not over-darken dark photos — they lose depth. A light overlay on a dark photo reads as a color tint, which is often enough.

### Vary overlays per frame
Overlay opacity and gradient stops may differ per frame based on the photo's brightness and mood. The overlay color and blend mode should stay consistent across the series for visual cohesion.

---

## Solid Blocks

Solid blocks are \`shape\` layers used at high opacity. They serve two equal roles.

**Legibility:** When the text zone has heavy texture, repeating pattern, or competing hues, a gradient overlay produces uneven contrast. A solid block gives text a flat surface to read against, eliminating the problem entirely.

**Aesthetic:** Solid geometric forms are a first-class design tool. A bold color block, a white circle breaking a monotone composition, a black bar anchoring the frame — these are editorial design statements. They add visual energy, structure, and character to compositions that would otherwise read as flat or static.

Neither role is a fallback. Both are legitimate reasons to add a solid block.

### When to use a solid block

- Text zone has heavy texture, repeating pattern, or color variation that makes a gradient insufficient
- The photo color at the text zone fights any overlay tint regardless of opacity
- The composition reads as flat or static — a strong geometric form would inject visual energy
- You want a deliberate editorial frame: bold black bar, color band, graphic circle

### Presets

**Bar — bottom cover (most common):**
\`\`\`json
{
  "id": "solid-bar",
  "type": "shape",
  "shape": "rectangle",
  "position": { "x_pct": 50, "y_pct": 87 },
  "dimensions": { "width_pct": 100, "height_pct": 26 },
  "fill_color": "#000000",
  "fill_opacity": 0.85
}
\`\`\`
Text layers that sit on the bar go above it in the layer stack (appear later in the \`layers\` array). No gradient overlay is needed for that zone.

**Square badge:**
\`\`\`json
{
  "id": "solid-badge",
  "type": "shape",
  "shape": "rectangle",
  "position": { "x_pct": 50, "y_pct": 50 },
  "dimensions": { "width_pct": 25, "height_pct": 25 },
  "fill_color": "#000000",
  "fill_opacity": 0.85
}
\`\`\`

**Circle badge:**
\`\`\`json
{
  "id": "solid-circle",
  "type": "shape",
  "shape": "circle",
  "position": { "x_pct": 50, "y_pct": 50 },
  "dimensions": { "width_pct": 20, "height_pct": 20 },
  "fill_color": "#000000",
  "fill_opacity": 0.85
}
\`\`\`

### Solid block color

Choose a color that serves the design:
- Black (\`#000000\`) — editorial weight, maximum contrast
- White (\`#FFFFFF\`) — light, airy, graphic inversion
- A series palette color — brand coherence

Opacity \`0.85\` is a solid starting point. Push to \`1.0\` for full solidity; pull to \`0.6–0.75\` for a semi-transparent version that still provides contrast but lets the photo breathe slightly at the edges.

---

## Layout Rules

- Bottom-left zone is the primary text area for editorial layouts
- Keep all text at least 5–6% from canvas edges

### How bottom-zone positioning works

For bottom zones (\`bottom-left\`, \`bottom-center\`, \`bottom-right\`), \`offset_y_pct\` controls where the **bottom edge of the text block** lands — text grows **upward** from that point.

- \`offset_y_pct: -5\` → bottom of text block at 95% of canvas height (5% from canvas bottom)
- \`offset_y_pct: -20\` → bottom of text block at 80% of canvas height
- Multi-line text wraps upward — no overflow at the bottom edge

**This means you never need to calculate multi-line height to avoid overflow.** Just ensure each element's offset places it above the one below it.

> **These offsets are illustrative proportions, not rules.** Every value must be recalculated from the actual content, font size, and line count of your specific layout. Do not copy these numbers — use them to understand the calculation method.

### Vertical text stack — example for 4:5 canvas

\`\`\`
location tag:  zone top-left, offset_y_pct: +7        (top zone, grows down)
headline:      zone bottom-left, offset_y_pct: -29    (bottom at 71%; 2-line = top ~51%)
sub-headline:  zone bottom-left, offset_y_pct: -20    (bottom at 80%)
body text:     zone bottom-left, offset_y_pct: -11    (bottom at 89%)
stats:         zone bottom-left, offset_y_pct: -5     (bottom at 95%)
\`\`\`

### Stacking rule — no overlap, no unnecessary gap

For each element A stacked above element B, compute the **minimum** offset:
\`\`\`
|A_offset_y_pct| = |B_offset_y_pct| + B_height_pct + gap_pct
\`\`\`

Where \`B_height_pct = size_pct × line_height × estimated_lines\`.

**Use the minimum — do not add extra buffer.** A larger offset pushes text higher into the frame, creating a visible gap between the headline and the caption. The result looks unbalanced and leaves the bottom area empty.

**Worked example** — caption + headline only (no stats):
\`\`\`
1. caption:    size_pct 2.5 × 1.5 × 3 lines ≈ 11%   →  offset_y_pct: -6   (bottom at 94%, top ~83%)
2. headline:   size_pct 9.5 × 1.05 × 2 lines ≈ 20%  →  offset_y_pct: -20  (bottom at 80%; ~3% gap above caption top)
               size_pct 9.5 × 1.05 × 3 lines ≈ 30%  →  same -20  (bottom still at 80%; text grows upward)
\`\`\`
The bottom anchor is always: \`|caption_offset| + caption_height + gap\` = 6 + 11 + 3 = **20**.

**With stats block** (stats → caption → headline):
\`\`\`
1. stats:      ≈ 6% tall                              →  offset_y_pct: -6   (bottom at 94%)
2. caption:    -(6 + 6 + 2) = -14                    →  offset_y_pct: -14  (bottom at 86%, top ~75%)
3. headline:   -(14 + 11 + 3) = -28                  →  offset_y_pct: -28  (bottom at 72%)
\`\`\`

**Key insight**: estimate line count before setting the offset. A 5–6 word headline at \`size_pct: 9.5\`, \`max_width_pct: 82\` typically wraps to **2 lines**. Longer text (7+ words or narrower column) wraps to 3. When in doubt, count the words and estimate — never just use -29 as a default.

### Eyebrow / location labels — always use TOP zones

Labels that appear above the main image content (location tags, series labels, eyebrow text) must use **top zones** (\`top-left\`, \`top-right\`).

❌ Wrong — eyebrow in a bottom zone:
\`\`\`json
{ "zone": "bottom-right", "offset_y_pct": -36 }
\`\`\`
Even though -36 sounds "high up," with bottom-anchoring the label's bottom lands at 64% — which will be **inside** a 3-line headline that spans 52%–80%. They collide.

✅ Correct — eyebrow in a top zone:
\`\`\`json
{ "zone": "top-right", "offset_x_pct": -6, "offset_y_pct": 7 }
\`\`\`
Top zones are top-anchored and grow downward — safe for labels that must stay near the canvas top.

---

## Frame-to-Frame Variation

Keep consistent across all frames: font families, font weights, color palette, overlay color, logo position.
Vary per frame: overlay opacity/gradient stops, text positions, headline content, focal point.

Consistency ≠ sameness. Each frame should respond to its specific image — adjust overlay strength, shift text position, add or remove a stats block — while still reading as a unified series.

---

## Common Mistakes to Avoid

- ❌ Pixel font sizes — always use size_pct
- ❌ Text outside safe zone — keep offset_x_pct ≥ 5
- ❌ No overlay — text on raw photo = poor contrast
- ❌ Over-darkening a dark photo — trust the image; use a lighter overlay
- ❌ More than 2 font families
- ❌ Missing max_width_pct on any text layer
- ❌ Duplicate layer IDs within a frame
- ❌ Opacity set on both layer root and font object
- ❌ Stacking elements too close — use the stacking rule: each element's offset must account for the height of the element below it plus a gap
- ❌ Using real filenames in image_src — use descriptive labels like "hero-landscape"
- ❌ Generic placeholder text in content fields — write real editorial copy
- ❌ Stats written as abbreviations or ranges — write "From 4 to 5 meters", not "4-5 m"
- ❌ Display font used for stats values or numeric content — always use the sans-serif font for numbers

---

## UI/UX Composition Review — Do This Before Output

Before generating the JSON, review your complete layout as a professional UI/UX designer. Every element must earn its place. Ask these questions and act on the answers.

**Visual hierarchy**
- Is there one clearly dominant element? If two elements compete for attention, reduce one.
- Does supporting text feel subordinate — clearly smaller, lighter, or quieter than the headline?

**Weight and size**
- Is each text element sized for its role? A caption at size_pct 9 is wrong. A headline at size_pct 2.5 is wrong.
- Are stats values large enough to read at mobile scale without competing with the headline?

**Position and zone**
- Is each zone a purposeful choice — or a default? "Bottom-left because it's always bottom-left" is not a reason.
- Does the text alignment (left / center / right) match the frame's tone and the image's visual direction?
- Is the text in a zone that serves what this frame is trying to communicate?

**Intentional use of space**
- Is there breathing room between elements? Tight stacking with no visual air reads as a block, not a composition.
- Is negative space being used actively — or just avoided?

**Remove what cannot be justified**
Any element whose position, size, weight, or content cannot be justified by purpose must be removed or redesigned before output.

---

## Image Index

Every JSON output must include an \`image_index\` array at the top level. This documents how each image was used and the design decisions made for it. FrameForge displays this in the Inspector panel.

The \`key\` field matches the descriptive label used in \`image_src\` — not a real filename.

\`\`\`json
"image_index": [
  {
    "key": "hero-portrait",
    "frame_id": "frame-01",
    "frame_index": 1,
    "description": "Sheet 1, image 1. Hero shot. Father and son on horseback against the Andean skyline. The wide negative space above was used for the main headline. Warm amber gradient anchored at the bottom protects the stats block. Focal point set to x_pct: 45, y_pct: 35 to keep both subjects and the mountain peak in frame."
  },
  {
    "key": "detail-close-up",
    "frame_id": "frame-02",
    "frame_index": 2,
    "description": "Sheet 1, image 2. Supporting frame. Close-up of the child's face, eyes toward camera. Minimal overlay — the expression carries the frame. Headline moved to top-left to avoid covering the face. No stats block on this frame."
  }
]
\`\`\`

| Field | Type | Required | Description |
|---|---|---|---|
| \`key\` | string | Yes | The descriptive label used as \`image_src\` in the frame |
| \`frame_id\` | string | Yes | The \`id\` of the frame that uses this image |
| \`frame_index\` | integer | Yes | 1-based frame position in the series |
| \`description\` | string | Yes | Start with "Sheet N, image N." then 1–4 sentences: role in the series, key design decisions, why this layout was chosen for this image |

**Write real descriptions.** Do not use generic text. Each entry should reflect the actual creative choices made for that specific image — overlay intensity, text placement rationale, focal point, what the image contributes to the overall narrative.

---

## Pre-Output Checklist

Before outputting the JSON, verify:
- [ ] image_index is present with one entry per frame, each with a real description
- [ ] project.id is a valid slug (no spaces, no special characters)
- [ ] export.target matches a canonical name
- [ ] All font.family values are real Google Fonts families
- [ ] All frames have at least one image layer and one overlay layer
- [ ] No two layers in a frame share the same id
- [ ] image_src and image layer src values are descriptive labels (NOT real filenames)
- [ ] image layer src matches its frame's image_src exactly
- [ ] max_width_pct is set on every text layer
- [ ] Vertical rhythm is logical — no overlapping text layers
- [ ] All text content is real editorial copy, not placeholder text
- [ ] Every text element's zone, size, and alignment was chosen with purpose — not set by default
- [ ] All stats values and measurements are written in full (no abbreviations, no hyphen ranges)
- [ ] No decorative shape layer (\`polyline\`, \`path\`, \`image_mask\`) has \`fill_opacity\` or \`stroke_opacity\` above 0.35
- [ ] No frame has more than 5 decorative shape layers total

---

## Decorative Layer Rules

These rules apply to \`polyline\`, \`path\`, and \`image_mask\` shape layers. These are the three types used for illustrative scene geometry — the environmental layer that sits between the photograph and the text.

### Opacity discipline — hard ceilings

The renderer enforces these automatically, but the AI must not exceed them in the first place:

| Usage | \`fill_opacity\` / \`stroke_opacity\` range |
|---|---|
| Background texture — barely-there suggestion | 0.08–0.15 |
| Visible but clearly subordinate accent | 0.18–0.28 |
| Hard ceiling (renderer clamps above this) | **0.35** |

❌ Never set decorative shape opacity above 0.35.

### Quantity discipline

- Maximum **5 decorative shape layers** per frame
- Never place decorative shapes on a frame that already has 2+ text layers, unless the shape is a single low-opacity line
- When using multiple \`image_mask\` instances of the same asset, vary \`height_pct\`, \`x_pct\`/\`y_pct\`, and \`fill_opacity\` between instances — identical copies read as a bug, not a design

### Intent discipline

Every decorative shape must earn its place. It must reinforce the **location, mood, or compositional flow** of the specific frame. Ask before placing any decorative shape:
- Does it reinforce where this image was taken?
- Does it guide the eye toward or away from the subject?
- Does it add depth that the photograph cannot provide on its own?

If you cannot answer yes to at least one of these, do not add the shape.

❌ Do not use decorative shapes to fill empty space.
❌ Do not use decorative shapes as a substitute for a proper overlay — contrast is the overlay's job.

### When NOT to use decorative shapes

- Portrait frames where a person's face is the primary subject
- Frames with no clear environmental or geographic identity to reinforce
- Frames where the photograph already provides sufficient visual complexity

### \`image_mask\` — choosing and placing assets

- Match the asset to the actual environment in the photograph. \`frailejón\` is for páramo, not beach. \`palm-tree\` is for tropical, not alpine.
- Place silhouettes in the compositional foreground (bottom or sides), never overlapping the subject's face or key feature
- Scale silhouettes relative to the frame — a tree that is 8–15% of canvas width reads as a frame element; at 40% it competes with the subject
- \`flip_x\` allows one asset to serve both sides of a composition without visual repetition

### Example — correct decorative use

\`\`\`json
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
\`\`\`
`;
