# FrameForge — Brief Wizard Redesign
**Date:** 2026-03-27
**Status:** Approved

---

## Overview

Replace the existing scrollable "New Project Brief" modal (`concept-builder.js`) with a **5-step wizard** that matches the photographer's natural project-start workflow. The key changes are:

- No more manual filename entry, hero shot marking, or per-image context fields
- Images are imported via file picker (filenames captured automatically from `File` objects)
- Imported images are forwarded directly to the main app's image tray (same pipeline as the existing dropzone)
- Export is a **single "Export Package" action** that downloads everything at once
- The exported brief text and prompt remain aligned with the AI manual and the existing `_buildBrief()` / `_buildPrompt()` structure — only hero shot and per-image context sections are removed

---

## Wizard Structure

A progress indicator at the top shows the current step name. Back/Next buttons navigate between steps. The modal title stays "New Project Brief" throughout.

```
┌─────────────────────────────────────────────┐
│ New Project Brief                        ✕  │
│ ●────○────○────○────○                        │
│ Title  Tone  Images  Export  Prompt          │
├─────────────────────────────────────────────┤
│   [step content]                            │
├─────────────────────────────────────────────┤
│ [← Back]                        [Next →]    │
└─────────────────────────────────────────────┘
```

- Step 1 has no Back button.
- Step 5 has no Next button — only Copy Prompt + Close.
- Next is disabled on Step 1 if Title is empty.
- Steps 3–5 are reachable even with no images loaded (thumbnails are simply skipped in the export).

---

## Step Content

### Step 1 — Title & Story

| Field | Required | Notes |
|---|---|---|
| Title | Yes | Generates slug preview (`ID: …`) on input |
| Platform | Yes | Same dropdown as today (§3.3.1). Determines sample design dimensions. |
| What is this about? | Recommended | Free-text story — replaces "What is this series about?" |
| Additional notes | No | Same as today |

Author field is removed — not part of the AI workflow.

### Step 2 — Tone & Style

| Field | Required | Notes |
|---|---|---|
| Text & tone style | No | Same presets as today + Custom. Default: "Let the AI decide." |
| Custom tone description | Conditional | Appears only when "Custom" is selected |

Single focused screen — nothing else on this step.

### Step 3 — Import Images

- A large "Add Images" button triggers `<input type="file" multiple accept="image/*">`
- After selection: shows count only — **"12 images loaded"** — no filenames, no previews, no per-image fields
- A "Clear" link resets the selection
- On file selection, images are immediately processed via `processImageFiles()` (same pipeline as the existing dropzone). The `ConceptBuilder` is instantiated with an `onImages` callback (same signature as the dropzone's `onImages`) — the caller (app bootstrap) passes the same handler used for dropzone image drops, so images land in the tray automatically
- **Thumbnail aspect ratio selector:** dropdown with options 1×1, 4×5, 2×3, Custom. Selecting Custom reveals width + height inputs. Default: 1×1. This selection is used when generating thumbnail sheets at export time.
- No hero shot marking. No per-image context. No filename display.

### Step 4 — Export Package

- Single **"Export Package"** button
- Generates and downloads sequentially:
  1. `frameforge-brief-{slug}.txt` — full brief text including the embedded AI manual (same as today's Download Brief, minus hero/context sections)
  2. `{slug}-sample-1.png`, `{slug}-sample-2.png`, `{slug}-sample-3.png` — sample design mockups for the selected platform
  3. `{slug}-thumbs-01.png`, `{slug}-thumbs-02.png`, … — thumbnail sheets, one per 10 images
- Progress indicator during generation: "Generating brief… Generating sample designs… Generating thumbnails…"
- Completion message: "✓ Package exported — N files downloaded"
- If no images were loaded, thumbnail sheets are skipped silently

### Step 5 — Copy Prompt

- Full-width "Copy Prompt" button
- Prompt text is the same as today's `_buildPrompt()` output, with hero shot and per-image context lines removed
- After click: "✓ Copied! Paste it into your AI session along with the exported files."
- Close button

---

## Sample Design Mockups

Pre-created canvas compositions generated entirely in code — no real images needed. Three layout styles, each exported as a PNG at the **selected platform's exact pixel dimensions**.

### Three Layout Styles

| # | Name | Composition |
|---|---|---|
| 1 | Top-heavy | Title block top, thin rule line mid, circle accent bottom-right, gradient overlay top |
| 2 | Bottom-anchor | Large headline bottom-left, horizontal rule, small circle top-right, gradient bottom |
| 3 | Center-split | Centered text column, two horizontal rules framing it, circles at corners |

### Mockup PNG Structure (3 zones)

```
┌──────────────────────────────────────────────┐
│                                              │
│   COMPOSITION ZONE (~65% of height)          │
│   Dark background + lighter photo rectangle  │
│   Placeholder text blocks at relative sizes  │
│   Geometric accents (lines, circles)         │
│   Callout annotations (arrows + size labels) │
│                                              │
├──────────────────────────────────────────────┤
│ ELEMENT SPECS (~15%)                         │
│ Headline: 72px · Subhead: 36px · Body: 24px  │
│ Rule line: 2px · Circle: 80px                │
│ Safe zone: 54px (5%) · Text zone: bottom 40% │
│ Gradient: bottom-up · Layout: Bottom-anchor  │
│ Platform: Instagram Portrait · 1080×1350px · 72dpi │
├──────────────────────────────────────────────┤
│ SIZE VARIANTS (~20%)                         │
│ Mini silhouettes of all platform formats     │
│ Selected platform highlighted                │
│ Each labelled with name + dimensions         │
└──────────────────────────────────────────────┘
```

- The composition zone uses callout annotations: small arrows pointing to elements with their size labels (e.g. "80px circle", "2px rule", "72px headline")
- The element specs strip documents all key measurements in text form — including headline, subhead, and body text sizes
- The size variants panel shows thumbnail silhouettes of every platform preset at correct aspect ratios, with the currently selected one highlighted

### Alignment with AI Manual

The three layouts map directly to the AI manual's text zone guidance:
- Top-heavy → text at top, gradient `to-top`
- Bottom-anchor → text at bottom, gradient `to-bottom`
- Center-split → centered zone, rule lines framing text

This gives the AI model a visual reference that is consistent with the design principles it must follow.

---

## Thumbnail Sheets

### Aspect Ratio Selection

Step 3 (Import Images) includes an **aspect ratio selector** for the thumbnails:

| Option | Thumb dimensions (base 200px wide) |
|---|---|
| 1×1 | 200×200px |
| 4×5 | 200×250px |
| 2×3 | 200×300px |
| Custom | User enters width + height in px |

Each image is cropped center-fill to the selected thumbnail dimensions. The selection is stored and used at export time.

### Configurable Constants

Defined at the top of `brief-thumbnails.js`:

```js
const THUMB_BASE  = 200;  // base width in px
const THUMB_COLS  = 5;    // columns per sheet
const THUMB_ROWS  = 2;    // rows per sheet → 10 images per sheet
```

Thumb height is derived from the selected aspect ratio: `THUMB_BASE * (ratioH / ratioW)`.

### Sheet Layout

- Sheet dimensions: `THUMB_COLS * thumbW` × `THUMB_ROWS * thumbH`
  - Example at 4×5: 1000×1250px per sheet
- Images are grouped into sheets of `THUMB_COLS * THUMB_ROWS` (10 at defaults)
- Exported as `{slug}-thumbs-01.png`, `{slug}-thumbs-02.png`, etc.
- Sheet number and image range labelled at the bottom of each sheet (e.g. "Sheet 1 — Images 1–10")

---

## Prompt & Brief Text Changes

Both the Download Brief (`.txt`) and Copy Prompt outputs are updated:

**Removed:**
- Per-image filename mapping section (`Image 1 → filename.jpg`)
- Hero shot callouts and hero shot instructions
- Per-image context notes

**Kept:**
- Full project metadata (title, platform, dimensions, DPI, slug)
- Story and tone
- Additional notes
- Full AI manual embedded in the brief download
- Step-by-step AI instructions in the prompt (review → propose concept → generate)
- Design principles section
- Image count (e.g. "12 images — see attached thumbnail sheets")

**Added to prompt:**
- Reference to the thumbnail sheets: "I'm attaching thumbnail sheets showing all images grouped by 10. Use these to study the images before proposing your concept."

---

## Files

| File | Change |
|---|---|
| `ui/concept-builder.js` | Full rewrite — wizard structure, file picker, removed hero/context, same prompt/brief logic minus removed sections |
| `ui/brief-mockups.js` | **New** — pre-created sample design mockup generator (canvas-based, per platform) |
| `ui/brief-thumbnails.js` | **New** — thumbnail sheet generator (configurable constants) |
| `docs/spec-app.md` | Part X updated to reflect new wizard workflow |

---

## spec-app.md Updates (Part X)

Section 10.3 (Modal Sections) is replaced with the 5-step wizard description above.
Section 10.7 (Export Actions) is replaced with the Export Package description.
Section 10.8 (Files) is updated to include the two new modules.
The workflow diagram in §10.1 is updated to reflect the new flow.
A new §10.9 (Sample Design Mockups) documents the mockup structure and platform presets.
A new §10.10 (Thumbnail Sheets) documents the configurable thumbnail sheet format.
