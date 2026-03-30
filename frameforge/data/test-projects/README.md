# FrameForge Test Projects — Design Workflow

This document is a **master orchestrator for AI models**. It dispatches a sequence of specialized agents, one per stage. Each agent owns a named professional role, declared inputs, and a formal deliverable. The orchestrator (this document) holds all approval gates — agents execute and return; the human approves before the next agent is dispatched.

**Claude Code:** each step dispatches a `.claude/skills/frameforge-[agent]/SKILL.md` skill. Follow the dispatch table.

**Other AI models (browser-based, no skills access):** follow the `> Other AI models` callout in each step — condensed instructions covering the same logic inline.

---

## Execution mode — set this once at the start

| Mode | Description |
|------|-------------|
| **Claude Code + Playwright MCP** | Follow all steps. Dispatch skills as specified. Steps 6 and 7 use Playwright injection. |
| **Claude Code (no Playwright)** | Dispatch skills for Steps 1–5. Skip the Playwright sections of Step 6. Step 7: wait for user to load manually. |
| **Other AI model** | Follow the `> Other AI models` callout in each step. Skip Claude Code dispatch tables. |

Identify your mode now. Reference it at every step.

---

## Two types of reference images

**Framework images** (`frameforge/img/sample-template*.png`) — layout reference cards showing FrameForge design conventions: frame structure, zone annotations, typography scale, gradient bands. Study these before proposing any concept.

**Image sheet** (`inputs/`) — a low-resolution thumbnail grid of the project's source photos, prepared by the user. This is the only form in which source photos are shared with an AI model. Raw photos are never shared — they live in `images/` for local Playwright use only.

FrameForge can generate image sheets directly: use the **Export → Thumbnail Sheet** feature to group photos into a labeled grid. Each thumbnail is printed with the original filename beneath it — this is what allows the AI to reference photos by name and what allows `image_src` labels in the JSON to be traced back to specific files. Always generate the sheet through this export rather than assembling it manually.

---

## Prerequisites

- AI manual: `frameforge/data/ai-manual-content.js` — read before generating any JSON
- Framework images: `frameforge/img/` — study before proposing concepts
- Image sheet: `inputs/` — the source photo thumbnails for this project

---

## How to start a new project

1. Create `test-projects/my-project/`
2. Inside it, create `inputs/` and place the exported package files there — use **Export Package** in the FrameForge Concept Builder to generate the thumbnail sheets and image map from the raw photos. The image map (`{slug}-image-map.md`) is required for AI filename resolution.
3. Place the raw source photos in `test-projects/my-project/images/` (Playwright use only — never send these to an AI model)
4. Tell the AI: **"follow the steps in `test-projects/README.md` for `my-project`"**

---

## Directory layout

```
test-projects/
├── README.md                        ← this file (master orchestrator)
├── templates/
│   └── concept-template.html        ← sample template for Step 3 (Visual Designer copies and fills)
└── my-project/
    ├── inputs/                      ← image sheet(s) and image map for AI concept work
    │   ├── image-sheet.jpg
    │   └── {slug}-image-map.md
    ├── images/                      ← raw source photos (Playwright only)
    │   ├── photo-01.jpg
    │   └── ...
    ├── narrative-brief.md           ← frame selection + confirmed facts (Step 1 output)
    ├── concept-template.html        ← layout brief card (Step 3 output)
    ├── concept-template.md          ← plain-text concept reference (Step 3 output)
    ├── color-notes.md               ← per-frame color analysis and overrides (Step 4 output)
    ├── frame-image-mapping.md       ← frame → image_src → raw file (Step 5 output)
    ├── my-project.json              ← generated project definition (Step 5 output)
    └── screenshots/                 ← layout captures for iteration (Step 7 output)
        ├── frame-01-v1.jpg
        └── ...
```

---

## Step 1 — Concept Strategist

> Reads the image sheet, asks clarifying questions, and curates the frame selection that serves the narrative.

**Inputs:** image sheet (`inputs/`), framework images (`frameforge/img/`)
**Deliverable:** `narrative-brief.md` — approved frame sequence, confirmed facts, answered clarifying questions

### Claude Code

Dispatch `frameforge-concept-strategist` with:

| Placeholder | Value |
|-------------|-------|
| `[PROJECT_NAME]` | `my-project` |
| `[IMAGE_SHEET_PATH]` | `frameforge/data/test-projects/my-project/inputs/image-sheet.jpg` |
| `[NARRATIVE_BRIEF_PATH]` | `frameforge/data/test-projects/my-project/narrative-brief.md` |
| `[IMAGE_MAP_PATH]` | `frameforge/data/test-projects/my-project/inputs/{slug}-image-map.md` |

### Other AI models

> Study `frameforge/img/` to understand layout conventions. Study the image sheet in `inputs/` — read both the thumbnail and the filename printed beneath each one.
>
> Ask these clarifying questions one at a time before proposing any selection:
> 1. What is the narrative arc? (opening → development → close, or another structure)
> 2. What are the key locations, subjects, or moments — and in what order did they happen?
> 3. Who is the audience — personal followers, strangers, or both?
> 4. What is the one thing a viewer who doesn't know you should take away?
> 5. What tone? (facts and stats / editorial narrative / minimal / let the AI decide)
>
> Do not invent any detail. Ask rather than guess.
>
> Then propose a curated frame selection: for each image dropped, state why; for each kept, state its narrative role and sequence position.

**Approval gate:** Present the curated frame list. Wait for user approval before dispatching Step 2. If the user requests changes, re-dispatch the Concept Strategist (or revise inline for Other AI models).

---

## Step 2 — Creative Director

> Develops the full editorial concept: palette, type system, and per-frame briefs with reviewed, publication-ready copy.

**Inputs:** `narrative-brief.md`, image sheet
**Deliverable:** Approved concept — palette, type system, per-frame briefs, copy reviewed

### Claude Code

Dispatch `frameforge-creative-director` with:

| Placeholder | Value |
|-------------|-------|
| `[PROJECT_NAME]` | `my-project` |
| `[NARRATIVE_BRIEF_PATH]` | `frameforge/data/test-projects/my-project/narrative-brief.md` |
| `[IMAGE_SHEET_PATH]` | `frameforge/data/test-projects/my-project/inputs/image-sheet.jpg` |

### Other AI models

> Read `narrative-brief.md`. All creative decisions must serve the narrative in that document — do not invent any detail not present there.
>
> **Palette:** propose 2–3 hex colors as design colors — overlays, type accents, graphic elements. Not extracted from photos; editorial choices that must work as text placed on top of images. For each: name, hex, role, and why it fits the series mood.
>
> **Type system:** one display face + one sans-serif, both valid Google Fonts family names. Verify at fonts.google.com. For each: why it fits the mood. The sans-serif handles all numbers and measurements — display faces are prohibited for numeric layers (Playfair Display, Cormorant Garamond, DM Serif Display, Bebas Neue are specifically prohibited for any layer whose primary content is a number or measurement).
>
> **Per-frame briefs:** for each frame in the approved sequence, write: image read (visual mass, tonal register, eye path, working zones), layer intent (role, position, weight, enhancement, survival test, exact copy for text layers), and composition check. If a frame carries no text, it is silent — no overlay elements of any kind.
>
> **Hard constraint:** no element may cover or compete with the strongest zone. Elements stay in the quietest zone only.
>
> **Copy review (internal):** before presenting, review every proposed text string for grammar, completeness, register, precision, redundancy, and factual accuracy. Revise — do not flag and defer. All copy must follow standard written language rules — no informal abbreviations, incomplete words, or missing articles. Write as you would for a published editorial caption.

**Approval gate:** Present the full concept. Wait for user approval before dispatching Step 3. Iterate until approved.

---

## Step 3 — Visual Designer

> Translates the approved concept into the HTML layout brief card and plain-text reference document.

**Inputs:** `narrative-brief.md`, concept summary from Step 2
**Deliverable:** `concept-template.html` + `concept-template.md`

### Claude Code

Dispatch `frameforge-visual-designer` with:

| Placeholder | Value |
|-------------|-------|
| `[PROJECT_NAME]` | `my-project` |
| `[NARRATIVE_BRIEF_PATH]` | `frameforge/data/test-projects/my-project/narrative-brief.md` |
| `[CONCEPT_SUMMARY_BLOCK]` | Paste the full `CONCEPT SUMMARY` block from the Creative Director's conversation output (not a file path — this is inline text) |
| `[PROJECT_PATH]` | `frameforge/data/test-projects/my-project` |

### Other AI models

> Generate a single self-contained HTML file using `templates/concept-template.html` as the starting point. Copy it to `my-project/concept-template.html` and replace every `{{PLACEHOLDER}}` with actual approved values. Do not reinvent the structure.
>
> The finished file must show: one card per frame at 4:5 ratio, zone boundary hairlines, gradient band annotations, exact text for every layer, palette swatches at the top, and spec rows below each card.
>
> Also save `my-project/concept-template.md` — plain-text markdown version. Use `amazon/concept-template.md` as the reference for structure and level of detail. Include: series title, platform, palette (hex + role), type system, application rules, and for each frame: frame-id, `image_src` label (descriptive kebab-case, not raw filename), sheet position, silent/text status, exact text strings. **No placeholders.**

**Approval gate:** Share the path to `concept-template.html` for the user to open in a browser. Wait for approval. Iterate until both files are approved.

---

## Step 4 — Color Advisor

> Reads each frame's thumbnail and determines whether the approved palette colors are legible at the text zone — or whether per-frame overrides are needed.

**Inputs:** `concept-template.md`, image sheet (`inputs/`)
**Deliverable:** `color-notes.md`

### Claude Code

Dispatch `frameforge-color-advisor` with:

| Placeholder | Value |
|-------------|-------|
| `[CONCEPT_TEMPLATE_MD_PATH]` | `frameforge/data/test-projects/my-project/concept-template.md` |
| `[FRAME_IMAGE_MAPPING_PATH]` | `frameforge/data/test-projects/my-project/frame-image-mapping.md` *(not yet created — pass the intended path; it will be created by Step 5)* |
| `[THUMBNAIL_SHEETS_PATH]` | `frameforge/data/test-projects/my-project/inputs/` |
| `[COLOR_NOTES_PATH]` | `frameforge/data/test-projects/my-project/color-notes.md` |

### Other AI models

> Read `concept-template.md` for the approved palette and per-frame text position specs. Open each thumbnail sheet in `inputs/` and examine each frame's text zone.
>
> For each text role in each frame, determine: is the palette color legible against the actual photograph at the text zone? If yes, confirm. If no, specify the override (typically `#FFFFFF`).
>
> **When to use a solid block instead of a gradient overlay:** if the text zone has strong texture, repeating pattern, or competing hues, a gradient overlay produces uneven contrast. A solid block (rectangle, bar, circle) eliminates the problem and can also serve as a design statement — a bold color bar transforms a static composition into something with visual weight.
>
> Write `color-notes.md` — a per-frame, per-role decision table. The concept palette is the series default; color notes are the per-frame truth.

**Approval gate:** Present `color-notes.md` to the user for review. This gate is typically brief — confirm no surprises before dispatching Step 5.

---

## Step 5 — Technical Producer

> Generates the complete project JSON and the frame-image mapping from the approved concept and color notes.

**Inputs:** `concept-template.md`, `color-notes.md`, image sheet
**Deliverable:** `my-project.json` + `frame-image-mapping.md`

### Claude Code

Dispatch `frameforge-technical-producer` with:

| Placeholder | Value |
|-------------|-------|
| `[PROJECT_NAME]` | `my-project` |
| `[CONCEPT_TEMPLATE_MD_PATH]` | `frameforge/data/test-projects/my-project/concept-template.md` |
| `[COLOR_NOTES_PATH]` | `frameforge/data/test-projects/my-project/color-notes.md` |
| `[IMAGE_SHEET_PATH]` | `frameforge/data/test-projects/my-project/inputs/image-sheet.jpg` |
| `[FRAME_IMAGE_MAPPING_PATH]` | `frameforge/data/test-projects/my-project/frame-image-mapping.md` |
| `[PROJECT_JSON_PATH]` | `frameforge/data/test-projects/my-project/my-project.json` |
| `[IMAGE_MAP_PATH]` | `frameforge/data/test-projects/my-project/inputs/{slug}-image-map.md` |

### Other AI models

> Read `ai-manual-content.js` fully before generating any JSON. Read `concept-template.md` for palette, type, and per-frame specs. Read `color-notes.md` — these override the concept palette for any frame with a conflict.
>
> **Frame-image mapping first:** before the JSON, build `frame-image-mapping.md`. Open each thumbnail sheet and read the exact filename printed under each approved thumbnail. Fill every row — no blank entries. Do not use filenames from memory or other documents — read them from the sheet image.
>
> **JSON:** use descriptive `image_src` labels (never raw filenames). One frame per image in the approved sequence. Include `image_index` with a real entry per frame. Apply color-notes overrides. Export target must match the selected platform. No placeholder text, no invented facts.

**Approval gate:** Present the JSON for a spot-check — confirm frame count, sequence, and that copy matches the approved template. Wait for approval before dispatching Step 6.

---

## Step 6 — Stage Manager

> Loads the project JSON and images into FrameForge via Playwright and confirms the application is ready for art direction.

**Inputs:** `my-project.json`, `frame-image-mapping.md`
**Deliverable:** FrameForge loaded and confirmed ready (JSON active, all images in tray)

### Claude Code + Playwright

Dispatch `frameforge-stage-manager` with:

| Placeholder | Value |
|-------------|-------|
| `[PROJECT_NAME]` | `my-project` |
| `[FRAME_IMAGE_MAPPING_PATH]` | `frameforge/data/test-projects/my-project/frame-image-mapping.md` |
| `[IMAGE_SHEET_PATH]` | `frameforge/data/test-projects/my-project/inputs/` |
| `[IMAGES_PATH]` | `frameforge/data/test-projects/my-project/images/` |
| `[PROJECT_JSON_PATH]` | `frameforge/data/test-projects/my-project/my-project.json` |
| `[FRAME_COUNT]` | Total number of frames in the JSON |

### Claude Code (no Playwright) / Other AI models

> Tell the user:
> 1. Open `http://127.0.0.1:5500/frameforge/index.html`
> 2. Click **Load JSON** → select `my-project/my-project.json`
> 3. Click **Load Images** → select all raw photos from `images/`
> 4. Confirm the project is loaded and share a screenshot

**Proceed to Step 7 once FrameForge is confirmed loaded.**

---

## Step 7 — Art Orchestrator

> Directs each frame: screenshot → art direction → copy review → human approval. One frame at a time.

**Inputs:** FrameForge loaded, `concept-template.md`, `color-notes.md`, `frame-image-mapping.md`, `my-project.json`
**Deliverable:** Final approved screenshots for all frames

### Claude Code + Playwright

Use the `frameforge-art-orchestrator` skill (`.claude/skills/frameforge-art-orchestrator/SKILL.md`). The skill defines the full per-frame workflow: art director, copy reviewer, and human approval gate — one frame at a time.

### Other AI models

> The user will share screenshots of each frame loaded in FrameForge. For each frame:
>
> Look at the screenshot — not at the brief. Ask: does the eye move freely? Does the type belong to the photo? Does the frame breathe? Is it too static? Does it sit in the series?
>
> If something feels wrong, diagnose it by looking, not by cross-referencing rules. Propose specific JSON changes. Wait for the user to apply and re-share the screenshot. Iterate until the frame is approved before moving to the next.

---

## Step 8 — Review gate

Once all frames have a clean approved version:

- Present all final screenshots to the user
- Note what changed from v1 → vN on any iterated frames
- Ask: **"Ready to review — do any frames need changes before we commit?"**

Do not commit until the user approves.

---

## Reference: Tatacoa Textures

`tatacoa/` is the first completed project through this workflow (2026-03-28).

| Frame | `image_src` label | Raw file (`images/`) |
|-------|-------------------|-----------------------|
| frame-01 | `wide-canyon-overview` | `CC2A1369.jpg` |
| frame-02 | `eroded-channels-closeup` | `CC2A1463.jpg` |
| frame-03 | `columnar-formations` | `CC2A1495.jpg` |
| frame-04 | `isolated-mesa` | `CC2A1414.jpg` |
| frame-05 | `barrel-cactus-bloom` | `CC2A1403.jpg` |
| frame-06 | `burrowing-owls` | `CC2A1585.jpg` |
| frame-07 | `motorcyclist-dirt-road` | `CC2A1683.jpg` |

Issues found and fixed during this project:
- Zone-mode shapes rendered at (0,0) — `renderShapeLayer` wasn't calling `resolvePosition()`. Fixed in `modules/layers.js`.
- Grass-line opacity 0.15–0.22 (too faint) → revised to 0.45–0.55.
- Barrel cactus height "4 a 5 metros" (wrong species) → corrected to "60 a 90 cm".
