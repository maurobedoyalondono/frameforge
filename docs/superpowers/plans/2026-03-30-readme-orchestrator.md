# README Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `test-projects/README.md` from a monolithic AI protocol into a master orchestrator that dispatches five new specialized skill agents, while remaining fully usable by browser-based AI models via inline callouts.

**Architecture:** Five new `SKILL.md` files are created under `.claude/skills/`, each owning a named professional role with declared inputs, execution logic ported from the current README, and a return protocol. The README is restructured into the orchestrator format: one step per agent, with a Claude Code dispatch table and an `Other AI models` callout per step. Approval gates stay in the README; agents execute and return.

**Tech Stack:** Markdown skill files, existing FrameForge Playwright injection patterns, existing `frameforge-color-advisor` / `frameforge-art-orchestrator` skills (unchanged).

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `.claude/skills/frameforge-concept-strategist/SKILL.md` | Create | Steps 1–3: read, clarify, curate → writes `narrative-brief.md` |
| `.claude/skills/frameforge-creative-director/SKILL.md` | Create | Step 4: palette, type system, per-frame briefs, copy review → returns concept summary block |
| `.claude/skills/frameforge-visual-designer/SKILL.md` | Create | Step 5: HTML template + `.md` reference → writes both files |
| `.claude/skills/frameforge-technical-producer/SKILL.md` | Create | Step 6: JSON + frame-image-mapping → writes both files |
| `.claude/skills/frameforge-stage-manager/SKILL.md` | Create | Step 7: Playwright loading → returns ready signal |
| `frameforge/data/test-projects/README.md` | Restructure | Master orchestrator with dispatch tables + inline callouts |

**Unchanged:** `frameforge-color-advisor`, `frameforge-art-orchestrator`, `frameforge-art-director`, `frameforge-copy-reviewer`.

---

## Task 1: Create frameforge-concept-strategist skill

**Files:**
- Create: `.claude/skills/frameforge-concept-strategist/SKILL.md`

This agent owns Steps 1–3 of the current README: reading, clarifying questions, and curation. It introduces a new output file — `narrative-brief.md` — that carries the approved frame selection and all confirmed facts to the Creative Director.

- [ ] **Step 1: Create the skill directory and file**

```bash
mkdir -p .claude/skills/frameforge-concept-strategist
```

Write `.claude/skills/frameforge-concept-strategist/SKILL.md`:

```markdown
---
name: frameforge-concept-strategist
description: Use when the FrameForge orchestrator starts a new project — studies the image sheet, asks clarifying questions one at a time, and curates a frame selection that serves the narrative. Writes narrative-brief.md as the formal handoff to the Creative Director.
---

# FrameForge Concept Strategist

You are a Concept Strategist beginning a new editorial photography project. Your job is to understand the story the photographer wants to tell, then select and sequence the frames that serve it best. You will not propose any design — that comes later. Your sole output is a clear editorial direction and an approved frame selection.

**Project:** [PROJECT_NAME]

---

## Read before anything else

1. **Framework images** — `frameforge/img/` — study the layout conventions, zone annotations, and frame structure. You need to understand what a FrameForge frame is before you can curate for one.

2. **Image sheet** — `[IMAGE_SHEET_PATH]` — each thumbnail has the original filename printed beneath it. Read both the image and its filename. The filename ties each thumbnail to its raw file and to the `image_src` label that will be assigned later.

Confirm both are done before continuing.

---

## Clarifying questions

You cannot curate meaningfully until you understand the concept. Ask these one at a time. Do not ask the next question until you have an answer to the current one:

1. What is the narrative arc? (opening → development → close, or another structure)
2. What are the key locations, subjects, or moments — and in what order did they happen?
3. Who is the audience — personal followers, strangers, or both?
4. What is the one thing a viewer who doesn't know you should take away?
5. What tone? (facts and stats / editorial narrative / minimal / let the AI decide)

**Do not invent any detail** — geographic, narrative, factual — that hasn't been explicitly confirmed. Ask rather than guess.

---

## Curation

Now that you understand the concept, propose a selection of the strongest frames that serve it. Do not use all images by default.

For each image **dropped**: state why it doesn't serve the concept.
For each image **kept**: state its role in the narrative and proposed position in the sequence.

Present as a numbered list. **Iterate with the user — add, drop, reorder — until the selection is approved.**

---

## Return protocol

Once the frame selection is approved, write `[NARRATIVE_BRIEF_PATH]` with this exact structure:

```markdown
# Narrative Brief — [PROJECT_NAME]

## Confirmed answers
- **Narrative arc:** [exact answer from user]
- **Key locations/subjects/moments:** [exact answer from user]
- **Audience:** [exact answer from user]
- **Core takeaway:** [exact answer from user]
- **Tone:** [exact answer from user]

## Approved frame sequence
| Position | Filename (from sheet) | Narrative role |
|----------|-----------------------|----------------|
| 1 | [exact filename printed under thumbnail] | [role in the story] |
| 2 | [exact filename] | [role] |

## Confirmed facts
[Any geographic names, dates, statistics, or other facts confirmed by the user — never invented. If none, write "None confirmed."]
```

Then return to the orchestrator: `STATUS: NARRATIVE BRIEF COMPLETE` with the path to `[NARRATIVE_BRIEF_PATH]`.
```

- [ ] **Step 2: Verify structure**

Check:
- Frontmatter has `name` and `description` fields
- `[PROJECT_NAME]`, `[IMAGE_SHEET_PATH]`, `[NARRATIVE_BRIEF_PATH]` placeholders are present
- Five clarifying questions are listed
- `narrative-brief.md` output structure matches the handoff contract in the spec (frame list + confirmed facts)
- Return protocol ends with `STATUS: NARRATIVE BRIEF COMPLETE`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/frameforge-concept-strategist/SKILL.md
git commit -m "feat: add frameforge-concept-strategist skill (Steps 1-3)"
```

---

## Task 2: Create frameforge-creative-director skill

**Files:**
- Create: `.claude/skills/frameforge-creative-director/SKILL.md`

This agent owns Step 4 of the current README: palette, type system, and all per-frame editorial briefs with internal copy review. It reads `narrative-brief.md` and the image sheet. It returns a structured `CONCEPT SUMMARY` block that the orchestrator passes to the Visual Designer.

- [ ] **Step 1: Create the skill file**

```bash
mkdir -p .claude/skills/frameforge-creative-director
```

Write `.claude/skills/frameforge-creative-director/SKILL.md`:

```markdown
---
name: frameforge-creative-director
description: Use when the FrameForge orchestrator has an approved narrative brief — develops the full editorial concept: palette, type system, and per-frame briefs with internally reviewed, publication-ready copy.
---

# FrameForge Creative Director

You are a Creative Director developing the full editorial concept for a photography series. The curation is done. Your job is to define the visual language — palette, type system — and write a complete per-frame brief for each selected image, including reviewed, publication-ready copy.

**Project:** [PROJECT_NAME]

---

## Read before anything else

1. **Framework images** — `frameforge/img/` — study zone conventions, gradient types, shape rules, and typography scale.

2. **Narrative brief** — `[NARRATIVE_BRIEF_PATH]` — this is your single source of truth. Every creative decision must serve the narrative established here. Do not invent facts, locations, or details not present in this document.

3. **Image sheet** — `[IMAGE_SHEET_PATH]` — study each approved frame's thumbnail. You are designing for these specific images.

---

## Series-level decisions

### Visual palette

Propose 2–3 hex colors as design colors — overlays, type accents, and graphic elements. These are not extracted from the photographs; they are editorial choices that must hold up as text and shapes placed on top of them.

For each color: name, hex, role (primary tone / type accent / shape base), and why it fits the subject matter and mood of this series.

The palette is a series-level default. Individual frames may require per-frame overrides in Step 4 (color advisor) — do not try to anticipate those here.

### Type system

One display face + one sans-serif. Both must be valid Google Fonts family names. Verify each name exists at fonts.google.com before proposing — an invalid name silently falls back to system sans-serif with no warning.

For each: why it fits the subject matter and mood — not aesthetic preference alone.

**Numeral rule:** The sans-serif handles all numbers, stats, and measurements. Display and serif faces (Playfair Display, Cormorant Garamond, DM Serif Display, Bebas Neue) are prohibited for any layer whose primary content is a number or measurement.

---

## Per-frame editorial brief

Work through every frame in the approved sequence from the narrative brief. For each frame, present each sub-section as a separate labeled block with its heading as written. Do not merge sections. Follow this order:

### Image read *(before any element is proposed)*

- **Visual mass:** where the heaviest, most dominant area sits — subject, deep shadow, texture density
- **Tonal register:** high-key, low-key, or midtone-heavy
- **Eye path:** where the eye enters, travels, and rests
- **Working zones:** the **strongest zone** (do not interfere here) and the **quietest zone** (candidate area for layered elements)

**Text-free gate:** If this frame carries no text, stop here — no overlay elements of any kind are placed (no gradient, no shape, no line). Only continue to Layer intent if at least one text layer is justified.

**Strongest-zone boundary:** No element — gradient, shape, line, or text — may cover or compete with the strongest zone. Hard constraint, not a guideline.

### Layer intent *(one block per proposed element — text, shape, line, gradient)*

- **Role:** compositional or narrative job — anchor, guide, inform, evoke, separate, punctuate
- **Position:** why this exact location, stated relative to the quietest zone only — never the strongest zone
- **Weight:** opacity, scale, and contrast relative to the image beneath — does it sit *on* the photo or *emerge from* it
- **Enhancement:** what the composition gains — not what the element says, but how it deepens the reading of the photo
- **Survival test:** what does the viewer lose without this element? If the answer is nothing, cut the element.
- **Copy** *(text layers only):* the exact proposed text — written in full, reviewed, publication-ready. No placeholders or draft copy.

### Composition check

- **Reading order:** first → second → third visual beat
- **Balance:** resolved or strained — if strained, is the tension intentional
- **Series note:** one sentence on how this frame's treatment connects to or contrasts with adjacent frames — omit if single-frame project

---

## Copy review *(internal — complete before presenting to the user)*

After all per-frame briefs are written, review every proposed text string as a professional copy editor. Do not present the concept until this review is complete and all issues are resolved.

Check each string for:

- **Grammar and syntax:** correct sentence structure, no fragments unless intentionally stylistic
- **Completeness:** no truncated phrases, missing articles, or implied-but-unwritten words
- **Register:** consistent editorial tone across all frames — not casual, not bureaucratic
- **Precision:** every word earns its place; remove anything vague or filler
- **Redundancy:** does this text say something the image doesn't already show? If not, cut it.
- **Factual accuracy:** re-confirm any figure, name, or measurement against confirmed sources in the narrative brief — never invented

Revise any string that fails a check. Replace — do not flag and defer. Only present final, reviewed copy.

---

## Return protocol

Present the full concept to the user — palette, type system, and all per-frame briefs with reviewed copy. **Iterate — revise palette, adjust briefs, rewrite copy — until the user approves the full concept.**

Once approved, return to the orchestrator: `STATUS: CONCEPT APPROVED` followed by this block:

```
CONCEPT SUMMARY
Project: [PROJECT_NAME]
Palette:
  primary: [hex] — [role and rationale]
  accent: [hex] — [role and rationale]
  [third color if present: hex — role and rationale]
Type:
  display: [exact Google Fonts family name]
  sans: [exact Google Fonts family name]
Per-frame briefs:
  [frame position]: [filename] — [one-line summary of treatment and approved copy strings]
  [repeat for each frame]
```
```

- [ ] **Step 2: Verify structure**

Check:
- Frontmatter has `name` and `description`
- `[PROJECT_NAME]`, `[NARRATIVE_BRIEF_PATH]`, `[IMAGE_SHEET_PATH]` placeholders present
- Text-free gate and strongest-zone boundary rules are present verbatim from spec
- Copy review section lists all six criteria from current README Step 4
- Return protocol ends with `STATUS: CONCEPT APPROVED` and `CONCEPT SUMMARY` block
- `CONCEPT SUMMARY` block contains all fields needed by Visual Designer (palette hex + roles, type family names, per-frame copy strings)

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/frameforge-creative-director/SKILL.md
git commit -m "feat: add frameforge-creative-director skill (Step 4)"
```

---

## Task 3: Create frameforge-visual-designer skill

**Files:**
- Create: `.claude/skills/frameforge-visual-designer/SKILL.md`

This agent owns Step 5 of the current README: generating the HTML concept template and the plain-text `.md` reference. It reads the concept summary from the orchestrator plus the narrative brief. It writes both output files.

- [ ] **Step 1: Create the skill file**

```bash
mkdir -p .claude/skills/frameforge-visual-designer
```

Write `.claude/skills/frameforge-visual-designer/SKILL.md`:

```markdown
---
name: frameforge-visual-designer
description: Use when the FrameForge orchestrator has an approved concept — generates the HTML concept template (visual layout brief card) and the plain-text concept-template.md reference document used by all downstream agents.
---

# FrameForge Visual Designer

You are a Visual Designer translating an approved editorial concept into two structured reference documents. Your job is to produce the HTML concept template and the plain-text concept reference with zero placeholders — every field must contain the actual approved value.

**Project:** [PROJECT_NAME]

---

## Read before anything else

1. **Narrative brief** — `[NARRATIVE_BRIEF_PATH]` — frame sequence, confirmed facts, tone.
2. **Concept summary** — provided inline by the orchestrator as `[CONCEPT_SUMMARY_BLOCK]` — palette, type system, per-frame briefs, approved copy.
3. **Sample template** — `frameforge/data/test-projects/templates/concept-template.html` — copy this and replace every `{{PLACEHOLDER}}`. Do not reinvent the structure — adapt it.
4. **Reference project** — `frameforge/data/test-projects/amazon/concept-template.md` — the benchmark for level of detail and structure in the `.md` file.

---

## HTML concept template

Generate a single self-contained HTML file showing all approved frames as a layout brief card.

Start from `frameforge/data/test-projects/templates/concept-template.html`. Copy it to `[PROJECT_PATH]/concept-template.html` and replace every `{{PLACEHOLDER}}` with actual approved values. The template provides full CSS, frame card structure, gradient helpers, layer classes, and inline comments explaining every section.

The template includes six frame patterns:
- Silent frame
- Headline only (bottom zone, to-bottom gradient)
- Headline only (top zone, to-top gradient)
- Headline + caption (bottom zone)
- Eyebrow + headline
- Full text (eyebrow + headline + caption)

Duplicate the closest matching pattern for any frame not covered by the template.

The finished file must show:
- One card per frame at correct 4:5 aspect ratio
- Zone boundary hairlines and gradient band annotations
- Exact text content for every layer on every frame
- Palette swatches and series metadata at the top
- Spec rows below each card (font, size_pct, zone, offset)

Save as `[PROJECT_PATH]/concept-template.html`.

---

## Plain-text concept reference

Save `[PROJECT_PATH]/concept-template.md` — a plain-text markdown version of the approved concept. Use `frameforge/data/test-projects/amazon/concept-template.md` as the reference for structure and level of detail.

Include:
- Series title and platform
- Color palette (hex + role for each color)
- Type system (family names + size scale)
- Application rules
- For each frame: frame-id, `image_src` label (descriptive, not the raw filename), thumbnail sheet position, silent/text status, and exact approved text strings

**No placeholders** — every field must contain the actual approved value.

The `image_src` label for each frame must be a descriptive identifier (e.g. `"wide-canyon-overview"`) that matches what the Technical Producer will use in the JSON. Derive it from the frame's subject and visual character — never use the raw filename.

---

## Return protocol

Share the path to `[PROJECT_PATH]/concept-template.html` with the user so they can open it in a browser. **Iterate — adjust layout, fix text, correct palette representation — until the user approves both files.**

Once approved, return to the orchestrator: `STATUS: TEMPLATE APPROVED` with:
- `concept-template.html`: `[PROJECT_PATH]/concept-template.html`
- `concept-template.md`: `[PROJECT_PATH]/concept-template.md`
```

- [ ] **Step 2: Verify structure**

Check:
- Frontmatter has `name` and `description`
- `[PROJECT_NAME]`, `[NARRATIVE_BRIEF_PATH]`, `[CONCEPT_SUMMARY_BLOCK]`, `[PROJECT_PATH]` placeholders present
- Six frame patterns listed (silent, headline-bottom, headline-top, headline+caption, eyebrow+headline, full)
- `image_src` label derivation rule present (descriptive, not raw filename)
- Reference to `amazon/concept-template.md` as benchmark
- Return protocol ends with `STATUS: TEMPLATE APPROVED` and lists both file paths

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/frameforge-visual-designer/SKILL.md
git commit -m "feat: add frameforge-visual-designer skill (Step 5)"
```

---

## Task 4: Create frameforge-technical-producer skill

**Files:**
- Create: `.claude/skills/frameforge-technical-producer/SKILL.md`

This agent owns Step 6: generating the project JSON and the frame-image mapping. It reads `concept-template.md`, `color-notes.md`, and the image sheet. It writes both output files.

- [ ] **Step 1: Create the skill file**

```bash
mkdir -p .claude/skills/frameforge-technical-producer
```

Write `.claude/skills/frameforge-technical-producer/SKILL.md`:

```markdown
---
name: frameforge-technical-producer
description: Use when the FrameForge orchestrator has an approved concept template and color notes — generates the complete project JSON and frame-image-mapping.md. No placeholders, no invented filenames.
---

# FrameForge Technical Producer

You are a Technical Producer translating a fully approved editorial concept into the FrameForge project definition. Precision matters more than creativity here. No invented values, no placeholder text, no shortcuts — every field must be exact.

**Project:** [PROJECT_NAME]

---

## Read before anything else

In this order:

1. **AI manual** — `frameforge/data/ai-manual-content.js` — read fully before generating any JSON. This is the authoritative spec for all JSON fields, layer types, and export targets.
2. **Concept template** — `[CONCEPT_TEMPLATE_MD_PATH]` — approved palette, type system, per-frame specs, exact copy, and `image_src` labels.
3. **Color notes** — `[COLOR_NOTES_PATH]` — per-frame color overrides. These supersede the concept template palette for any frame where a conflict was found. The concept palette is a series default; color notes are per-frame truth.
4. **Image sheet** — `[IMAGE_SHEET_PATH]` — open each sheet and read the filename printed under each approved thumbnail. You will need exact raw filenames for the frame-image mapping.

---

## Frame-image mapping

Before generating the JSON, build `[FRAME_IMAGE_MAPPING_PATH]`:

```markdown
| Frame | `image_src` label | Sheet · position | Raw file (`images/`) |
|-------|-------------------|------------------|----------------------|
| frame-01 | `label-here` | Sheet N · #N | `exact-raw-filename.jpg` |
```

Every row must be filled with the actual raw filename read from the thumbnail sheet — open the sheet image and read the label printed under the photo at the listed position. **Leave no row blank.** This file is the permanent record — every future session, every Playwright injection reads from here instead of reopening thumbnail sheets.

---

## Project JSON

Generate the complete FrameForge JSON following `ai-manual-content.js`:

- Use the descriptive `image_src` labels from `concept-template.md` — never raw filenames
- One frame per image in the approved sequence
- Include `image_index` with a real entry per frame documenting visual decisions
- Apply color-notes overrides for any frame with a confirmed conflict — these are per-frame truth and override the concept palette
- Export target must match the platform specified in the concept template
- No placeholder text, no invented facts

Save as `[PROJECT_JSON_PATH]`.

---

## Return protocol

Present the JSON to the user: confirm frame count, sequence order, and that copy strings match the approved concept template. **Iterate — fix any error, re-present — until the user approves.**

Once approved, return to the orchestrator: `STATUS: JSON APPROVED` with:
- `project.json`: `[PROJECT_JSON_PATH]`
- `frame-image-mapping.md`: `[FRAME_IMAGE_MAPPING_PATH]`
```

- [ ] **Step 2: Verify structure**

Check:
- Frontmatter has `name` and `description`
- `[PROJECT_NAME]`, `[CONCEPT_TEMPLATE_MD_PATH]`, `[COLOR_NOTES_PATH]`, `[IMAGE_SHEET_PATH]`, `[FRAME_IMAGE_MAPPING_PATH]`, `[PROJECT_JSON_PATH]` placeholders present
- Color-notes-as-per-frame-truth rule is stated
- Frame-image mapping table structure matches existing `amazon/frame-image-mapping.md` format
- "No blank rows" rule is present
- Return protocol ends with `STATUS: JSON APPROVED` and lists both file paths

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/frameforge-technical-producer/SKILL.md
git commit -m "feat: add frameforge-technical-producer skill (Step 6)"
```

---

## Task 5: Create frameforge-stage-manager skill

**Files:**
- Create: `.claude/skills/frameforge-stage-manager/SKILL.md`

This agent owns Step 7: verifying the frame-image mapping is complete, preparing label-named image copies, and injecting JSON + images into FrameForge via Playwright. It returns a ready signal.

- [ ] **Step 1: Create the skill file**

```bash
mkdir -p .claude/skills/frameforge-stage-manager
```

Write `.claude/skills/frameforge-stage-manager/SKILL.md`:

```markdown
---
name: frameforge-stage-manager
description: Use when the FrameForge orchestrator has an approved JSON and complete frame-image mapping — loads the project into FrameForge via Playwright and confirms all images are in the tray before handing off to the Art Orchestrator.
---

# FrameForge Stage Manager

You are a Stage Manager. Your job is to get FrameForge loaded, configured, and confirmed ready for the art director. This is a technical operations role — precision matters more than creativity. Do not proceed past any step if the previous one did not succeed.

**Project:** [PROJECT_NAME]

---

## Step 1: Verify frame-image mapping

Read `[FRAME_IMAGE_MAPPING_PATH]`. Check every row — every frame must have a raw filename in the last column. If any row is blank, open the relevant thumbnail sheet from `[IMAGE_SHEET_PATH]`, read the label printed under that thumbnail position, and fill the row in now. Do not proceed until the file is complete with no blank rows.

---

## Step 2: Prepare label-named image copies

`agent-preview.html` resolves images by constructing a URL from the `image_src` label + `.jpg`. A copy of each raw file must exist in `[IMAGES_PATH]` under the label name.

Build the copy commands from `[FRAME_IMAGE_MAPPING_PATH]` — one line per frame:

```bash
# Run from [IMAGES_PATH]
# Format: cp [raw-filename] [image_src-label].jpg
# Example:
cp CC2A1369.jpg wide-canyon-overview.jpg
```

The raw files stay in place. Both names coexist in `[IMAGES_PATH]`.

---

## Step 3: Inject JSON

```javascript
async () => {
  const response = await fetch('/frameforge/data/test-projects/[PROJECT_NAME]/[PROJECT_NAME].json');
  const jsonText = await response.text();
  const file = new File([jsonText], '[PROJECT_NAME].json', { type: 'application/json' });
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.querySelector('#input-json');
  Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return 'JSON injected';
}
```

---

## Step 4: Inject images

Build the images array from `[FRAME_IMAGE_MAPPING_PATH]` — one entry per frame. Name each `File` with the `image_src` label (no extension) — FrameForge matches images by `file.name`:

```javascript
async () => {
  const images = [
    // ['image_src-label', '/frameforge/data/test-projects/[PROJECT_NAME]/images/raw-filename.jpg'],
    // Build this list from every row in frame-image-mapping.md
  ];
  const files = await Promise.all(images.map(async ([name, path]) => {
    const blob = await fetch(path).then(r => r.blob());
    return new File([blob], name, { type: 'image/jpeg' });
  }));
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));
  const input = document.querySelector('#input-images');
  Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return `Injected ${files.length} images`;
}
```

---

## Step 5: Wait for ready

```javascript
() => new Promise((resolve) => {
  const expected = [FRAME_COUNT]; // replace with actual frame count from JSON
  const check = () => {
    if (document.querySelectorAll('[class*="tray"] [draggable]').length >= expected) {
      resolve('ready'); return;
    }
    setTimeout(check, 200);
  };
  check();
  setTimeout(() => resolve('timeout'), 8000);
})
```

If the result is `'timeout'`, re-inject images and wait again before proceeding.

---

## Return protocol

Take a `browser_snapshot`. Confirm: JSON active (project title visible in UI), all [FRAME_COUNT] images present in the tray, no `[File chooser]` entries in the snapshot.

Return to the orchestrator: `STATUS: FRAMEFORGE READY`.

If any condition is not met, diagnose and fix before returning the status.
```

- [ ] **Step 2: Verify structure**

Check:
- Frontmatter has `name` and `description`
- `[PROJECT_NAME]`, `[FRAME_IMAGE_MAPPING_PATH]`, `[IMAGE_SHEET_PATH]`, `[IMAGES_PATH]`, `[FRAME_COUNT]` placeholders present
- Mapping completeness check is Step 1 (gate before any Playwright action)
- Label-named copy section explains why (agent-preview URL construction)
- Timeout handling is present in wait-for-ready step
- Return protocol confirms three conditions (JSON active, image count, no file chooser)
- Return ends with `STATUS: FRAMEFORGE READY`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/frameforge-stage-manager/SKILL.md
git commit -m "feat: add frameforge-stage-manager skill (Step 7)"
```

---

## Task 6: Restructure README as master orchestrator

**Files:**
- Modify: `frameforge/data/test-projects/README.md`

Full replacement of the README content. The document becomes the master orchestrator. All prose from Steps 1–7 moves into the skill files (Tasks 1–5) and is summarized in `Other AI models` callouts. The structure, directory layout, reference sections, and Step 8+ content are preserved.

- [ ] **Step 1: Write the new README**

Replace the entire content of `frameforge/data/test-projects/README.md` with:

```markdown
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
2. Inside it, create `inputs/` and place an **image sheet** there — use **Export → Thumbnail Sheet** in FrameForge to generate it from the raw photos.
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
    ├── inputs/                      ← image sheet(s) for AI concept work
    │   └── image-sheet.jpg
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
> **Type system:** one display face + one sans-serif, both valid Google Fonts family names. Verify at fonts.google.com. For each: why it fits the mood. The sans-serif handles all numbers and measurements — display faces are prohibited for numeric layers.
>
> **Per-frame briefs:** for each frame in the approved sequence, write: image read (visual mass, tonal register, eye path, working zones), layer intent (role, position, weight, enhancement, survival test, exact copy for text layers), and composition check. If a frame carries no text, it is silent — no overlay elements of any kind.
>
> **Hard constraint:** no element may cover or compete with the strongest zone. Elements stay in the quietest zone only.
>
> **Copy review (internal):** before presenting, review every proposed text string for grammar, completeness, register, precision, redundancy, and factual accuracy. Revise — do not flag and defer.

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
| `[CONCEPT_SUMMARY_BLOCK]` | Full `CONCEPT SUMMARY` block returned by the Creative Director |
| `[PROJECT_PATH]` | `frameforge/data/test-projects/my-project` |

### Other AI models

> Generate a single self-contained HTML file using `templates/concept-template.html` as the starting point. Copy it to `my-project/concept-template.html` and replace every `{{PLACEHOLDER}}` with actual approved values. Do not reinvent the structure.
>
> The finished file must show: one card per frame at 4:5 ratio, zone boundary hairlines, gradient band annotations, exact text for every layer, palette swatches at the top, and spec rows below each card.
>
> Also save `my-project/concept-template.md` — plain-text markdown version. Use `amazon/concept-template.md` as the reference for structure and level of detail. Include: series title, platform, palette (hex + role), type system, application rules, and for each frame: frame-id, `image_src` label (descriptive, not raw filename), sheet position, silent/text status, exact text strings. **No placeholders.**

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
| `[FRAME_IMAGE_MAPPING_PATH]` | `frameforge/data/test-projects/my-project/frame-image-mapping.md` *(leave blank — Technical Producer fills this in Step 5)* |
| `[THUMBNAIL_SHEETS_PATH]` | `frameforge/data/test-projects/my-project/inputs/` |
| `[COLOR_NOTES_PATH]` | `frameforge/data/test-projects/my-project/color-notes.md` |

> **Note:** `frame-image-mapping.md` does not exist yet at this step. The color advisor only needs the thumbnail sheet path and the concept template — it does not use the raw file mapping. Pass the intended output path; the file will be created in Step 5.

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

### Other AI models

> Read `ai-manual-content.js` fully before generating any JSON. Read `concept-template.md` for palette, type, and per-frame specs. Read `color-notes.md` — these override the concept palette for any frame with a conflict.
>
> **Frame-image mapping first:** before the JSON, build `frame-image-mapping.md`. Open each thumbnail sheet and read the exact filename printed under each approved thumbnail. Fill every row — no blank entries.
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
```

- [ ] **Step 2: Verify README structure**

Check:
- Mode detection table is present at the top with three rows
- Every step has both `### Claude Code` and `### Other AI models` sections
- Every dispatch table matches the placeholders defined in the corresponding skill file
- `narrative-brief.md` appears in the directory layout
- Step 4 color-advisor note about `frame-image-mapping.md` not existing yet is present
- Step 6 Stage Manager has both Playwright and non-Playwright sections
- Step 7 references the existing `frameforge-art-orchestrator` skill
- Reference section (Tatacoa) is preserved unchanged
- No step references a skill that doesn't exist

- [ ] **Step 3: Commit**

```bash
git add frameforge/data/test-projects/README.md
git commit -m "feat: restructure README as master orchestrator with agent dispatch"
```

---

## Task 7: Cross-validate placeholder consistency

**Files:** Read-only verification — no file changes unless issues found.

Verify that every placeholder referenced in the README dispatch tables exists verbatim in the corresponding skill file. Fix any mismatch found.

- [ ] **Step 1: Validate Concept Strategist placeholders**

README dispatch table for Step 1 uses: `[PROJECT_NAME]`, `[IMAGE_SHEET_PATH]`, `[NARRATIVE_BRIEF_PATH]`

Confirm each appears in `.claude/skills/frameforge-concept-strategist/SKILL.md`.

- [ ] **Step 2: Validate Creative Director placeholders**

README dispatch table for Step 2 uses: `[PROJECT_NAME]`, `[NARRATIVE_BRIEF_PATH]`, `[IMAGE_SHEET_PATH]`

Confirm each appears in `.claude/skills/frameforge-creative-director/SKILL.md`.

- [ ] **Step 3: Validate Visual Designer placeholders**

README dispatch table for Step 3 uses: `[PROJECT_NAME]`, `[NARRATIVE_BRIEF_PATH]`, `[CONCEPT_SUMMARY_BLOCK]`, `[PROJECT_PATH]`

Confirm each appears in `.claude/skills/frameforge-visual-designer/SKILL.md`.

- [ ] **Step 4: Validate Technical Producer placeholders**

README dispatch table for Step 5 uses: `[PROJECT_NAME]`, `[CONCEPT_TEMPLATE_MD_PATH]`, `[COLOR_NOTES_PATH]`, `[IMAGE_SHEET_PATH]`, `[FRAME_IMAGE_MAPPING_PATH]`, `[PROJECT_JSON_PATH]`

Confirm each appears in `.claude/skills/frameforge-technical-producer/SKILL.md`.

- [ ] **Step 5: Validate Stage Manager placeholders**

README dispatch table for Step 6 uses: `[PROJECT_NAME]`, `[FRAME_IMAGE_MAPPING_PATH]`, `[IMAGE_SHEET_PATH]`, `[IMAGES_PATH]`, `[PROJECT_JSON_PATH]`, `[FRAME_COUNT]`

Confirm each appears in `.claude/skills/frameforge-stage-manager/SKILL.md`.

- [ ] **Step 6: Fix any mismatches and commit**

If any placeholder is missing from a skill file, add it. If any README table uses a name not in the skill, update the README table to match the skill's name. Then:

```bash
git add .
git commit -m "fix: align placeholder names between README dispatch tables and skill files"
```

If no mismatches are found, no commit needed.
```
