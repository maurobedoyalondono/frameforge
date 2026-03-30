---
name: frameforge-color-advisor
description: Use when a FrameForge concept template has been approved and color-notes.md needs to be generated for a project — dispatches a sub-agent that reads each frame's thumbnail and determines whether the approved palette colors are legible at the text zone, or whether per-frame overrides are required
---

# FrameForge Color Advisor

## What you are doing

The concept palette is a series-level default — chosen before anyone looked closely at individual photographs. A single static color will not read on every image: a zone that is dark, light, warm, cold, muted, or busy each demands different treatment.

Your job is to look at each photograph's text zone and determine, for each text role in that frame, whether the approved palette color is actually legible there — or whether it needs an override. The output is `color-notes.md`, a per-frame correction document that the art director reads before setting any color value.

---

## Inputs

Read these before starting:

1. `[CONCEPT_TEMPLATE_MD_PATH]` — palette hex codes and roles, type system roles, per-frame text position specs (top-left, bottom-left, etc.), and which frames are silent
2. `[FRAME_IMAGE_MAPPING_PATH]` — sheet and position for each frame (e.g. `Sheet 5 · #45`)

The thumbnail sheets are in `[THUMBNAIL_SHEETS_PATH]`. These are the low-resolution composite grids used for all AI concept work — do not read raw images from `images/`. Raw files are large and exist for Playwright use only. The thumbnails contain all the visual information needed for color zone analysis.

---

## Per-frame workflow

Work through every frame in the concept template in order.

**Silent frames** (marked as no text, no overlay): write `SILENT — no analysis needed` and continue.

**Text frames**: look up the frame in `frame-image-mapping.md` to get its sheet number and position (e.g. `Sheet 3 · #22`). Read that thumbnail sheet image from `[THUMBNAIL_SHEETS_PATH]`. Locate the thumbnail at the listed position — each sheet shows 10 photos in a labeled grid. Look at that thumbnail. Identify the text zone from the concept template. Focus exclusively on that area of the thumbnail — not the whole frame.

Assess the text zone:

- **Luminance**: very dark / dark / medium / light / very light
- **Dominant hues at zone**: name the colors present (deep green shadow, warm ochre, blue-grey sky, etc.)
- **Zone character**: uniform or busy? A busy zone demands higher contrast.

For each text role in this frame (eyebrow, headline, subtitle, scientific name, body, etc.), evaluate the concept's specified color against what you see:

**Can a viewer read this color here, without effort?**

Apply these rules:

| Zone type | Risk |
|-----------|------|
| Very dark / dark, neutral hues | Low — palette colors generally work. Check for hue conflicts. |
| Dark but with a strong hue matching a palette color | Medium — perceptual contrast low even if luminance contrast is ok. |
| Medium luminance (40–60%) | High — muted palette colors (#7B9FAE, #C8751E) often disappear here. |
| Light / very light | Critical — white (#FFFFFF) fails entirely. Any muted color is at high risk. |
| Busy / high-texture | Any muted color is at risk regardless of luminance. Flag as solid-block candidate for the art director: if a solid block is used, color analysis for that zone changes — text reads against the block color, not the photo. |

**Hue conflict rule**: if the zone color is close in hue to the palette color (warm amber zone + `#C8751E` scientific name; blue-teal water + `#7B9FAE` eyebrow), flag it even on a dark background — luminance contrast alone does not guarantee readability when hues are similar.

**Decision for each role:**

- `✓ USE [HEX] — [one-line reason]`
- `⚠ OVERRIDE → #FFFFFF — [one-line reason]`
- `⚠ OVERRIDE → [specific alternative] — [one-line reason]`

Do not hedge. Make the call.

---

## Output format

Save `[COLOR_NOTES_PATH]` with this exact structure:

```markdown
# Color Notes — [Project Title]

## Palette reference
| Hex | Name | Role | Safe zones | Risk zones |
|-----|------|------|-----------|-----------|
| `#XXXXXX` | [name] | [role] | [what works] | [what to watch for] |

---

## Per-frame color guide

### frame-01 · [image_src] · text zone: [position from concept]
**Zone character:** [one sentence — what the zone actually looks like]
**Luminance:** [very dark / dark / medium / light / very light]

| Role | Spec color | Decision |
|------|-----------|---------|
| Headline | `#FFFFFF` | ✓ USE #FFFFFF — [reason] |
| Subtitle | `#7B9FAE` | ⚠ OVERRIDE → #FFFFFF — [reason] |
| Eyebrow | `#7B9FAE` | ✓ USE #7B9FAE — [reason] |

---

### frame-02 · [image_src] · text zone: [position]
...
```

---

## What happens next

The art director reads `color-notes.md` before setting any color. Where the notes say OVERRIDE, the override applies — not the concept template color. The concept palette is the series default; `color-notes.md` is the per-frame correction.

**If the art director skips `color-notes.md`, they will apply the static palette to every frame. Some of those frames will look wrong. That is what this file prevents.**

---

## Deliver

Save the finished file to `[COLOR_NOTES_PATH]`.

Return:
- Total frames analyzed: [N text frames, M silent frames]
- Frames with overrides: list each frame and which roles were overridden
- Overall risk summary: one sentence on how reliably the approved palette works across this series
