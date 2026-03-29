# FrameForge Test Projects — Design Workflow

This document is a **protocol for AI models**. Hand it to any capable AI alongside a project `inputs/` folder. The AI follows these steps in order, pausing at each review gate.

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

### Execution mode

**With Playwright** (Claude Code + Playwright MCP): follow all steps including the automated loading and screenshotting sections (Steps 7–8).

**Without Playwright** (any other AI model): skip Steps 7–8. Generate the concept HTML and JSON, then wait for the user to load them manually into FrameForge and share screenshots for iteration.

---

## How to start a new project

1. Create `test-projects/my-project/`
2. Inside it, create `inputs/` and place an **image sheet** there — use **Export → Thumbnail Sheet** in FrameForge to generate it from the raw photos. The sheet groups all photos into a labeled grid with the original filename under each thumbnail.
3. Place the raw source photos in `test-projects/my-project/images/` (Playwright use only — never send these to an AI model)
4. Tell the AI: **"follow the steps in `test-projects/README.md` for `my-project`"**

---

## Directory layout

```
test-projects/
├── README.md                        ← this file
└── my-project/
    ├── inputs/                      ← image sheet(s) for AI concept work
    │   └── image-sheet.jpg          ← thumbnail grid of all source photos
    ├── images/                      ← raw source photos (Playwright only)
    │   ├── photo-01.jpg
    │   └── ...
    ├── concept-template.html        ← layout reference card (Step 5)
    ├── concept-template.md          ← plain-text concept reference (Step 5)
    ├── color-notes.md               ← per-frame color analysis and overrides (Step 5b)
    ├── frame-image-mapping.md       ← frame → image_src → raw file (Step 6)
    ├── my-project.json              ← generated project definition (Step 6)
    └── screenshots/                 ← layout captures for iteration
        ├── frame-01-v1.jpg
        └── ...
```

---

## Step 1 — Read and confirm

- Study the framework images in `frameforge/img/` to understand layout conventions
- Study the image sheet in `inputs/` — each thumbnail has the original filename printed beneath it. Read both the image and its filename; the filename is what ties this thumbnail to its raw file in `images/` and to the `image_src` label you will assign in the JSON
- Confirm this is done before proceeding — **do not generate anything yet**

---

## Step 2 — Ask clarifying questions

You cannot curate meaningfully until you understand the concept. Ask these one at a time:

- What is the narrative arc? (opening → development → close, or another structure)
- What are the key locations, subjects, or moments — and in what order did they happen?
- Who is the audience — personal followers, strangers, or both?
- What is the one thing a viewer who doesn't know you should take away?
- What tone? (facts and stats / editorial narrative / minimal / let the AI decide)

**Do not invent any detail** — geographic, narrative, factual — that hasn't been explicitly confirmed. Ask rather than guess.

---

## Step 3 — Curation

Now that you understand the concept, propose a selection of the strongest frames that serve it. Do not use all images by default.

For each image **dropped**: state why it doesn't serve the concept.
For each image **kept**: state its role in the narrative and proposed position in the sequence.

Present as a numbered list. **Wait for user approval before continuing.**

---

## Step 4 — Concept proposal

**Do not generate the HTML template or JSON yet.**

### Series-level decisions

**Visual palette:** 2–3 hex colors chosen as design colors — overlays, type accents, and graphic elements. These are not extracted from the photographs; they are editorial choices that must hold up as text and shapes placed on top of them. For each: name, role (primary tone / type accent / shape base), and why it fits the subject matter and mood of the series.

The palette is a series-level default. It will be validated per frame in Step 5b by the color advisor — individual frames may require overrides where the palette color disappears or conflicts with the actual photograph at the text zone.

**Type system:** One display face + one sans-serif, both must be valid Google Fonts family names (verify at fonts.google.com — an invalid name silently falls back to system sans-serif with no warning). For each: why it fits the subject matter and mood — not just aesthetic preference.

**Numeral rule:** The sans-serif handles all numbers, stats, and measurements. Display and serif faces (Playfair Display, Cormorant Garamond, DM Serif Display, Bebas Neue) are prohibited for any layer whose primary content is a number or measurement — their numeral spacing is optically inconsistent and produces visual noise at label sizes.

*These are brief. The weight of Step 4 is in the per-frame briefs below.*

---

### Per-frame editorial brief

For each selected frame, present each sub-section as a separate labeled block with its heading as written. Do not merge sections or omit headings. Follow this order:

#### Image read *(before any element is proposed)*

- **Visual mass:** where the heaviest, most dominant area sits — subject, deep shadow, texture density
- **Tonal register:** is this high-key, low-key, or midtone-heavy
- **Eye path:** where the eye enters, travels, and rests
- **Working zones:** the **strongest zone** (the photo does the work here — do not interfere) and the **quietest zone** (candidate area for layered elements)

**Text-free gate:** If this frame carries no text, stop here — no overlay elements of any kind are placed (no gradient, no shape, no line). The image is presented clean. Only continue to Layer intent if at least one text layer is justified.

**Strongest-zone boundary:** No element — gradient, shape, line, or text — may cover or visually compete with the strongest zone. Every element must stay within the quietest zone. This is a hard constraint, not a guideline.

#### Layer intent *(one block per proposed element — text, shape, line, gradient)*

- **Role:** the compositional or narrative job this element performs — anchor, guide, inform, evoke, separate, punctuate
- **Position:** why this exact location, stated relative to the quietest zone only — never the strongest zone
- **Weight:** opacity, scale, and contrast relative to the image beneath — does it sit *on* the photo or *emerge from* it
- **Enhancement:** what the composition gains — not what the element says, but how it deepens the reading of the photo
- **Survival test:** what does the viewer lose without this element? If the answer is nothing, the element is cut
- **Copy** *(text layers only):* the exact proposed text — written in full, reviewed, publication-ready. Do not present placeholder or draft copy here.

#### Composition check

- **Reading order:** first → second → third visual beat
- **Balance:** does the completed frame feel resolved or strained — if strained, is the tension intentional
- **Series note:** one sentence on how this frame's visual treatment connects to or contrasts with adjacent frames — omit if this is a single-frame project

---

**Factual integrity:** Facts, figures, and place names in any text layer must come from confirmed sources only — never invented.

**Text quality:** All copy in text layers must follow standard written language rules. No informal abbreviations, incomplete words, missing articles, or lazy shorthand. Write as you would for a published editorial caption.

---

### Copy review *(before presenting to the user)*

After all per-frame briefs are written, review every proposed text string across all frames as a professional copy editor. Do not skip this step. Do not present the concept to the user until the review is complete and all issues are resolved.

Check each string for:

- **Grammar and syntax:** correct sentence structure, no fragments unless intentionally stylistic
- **Completeness:** no truncated phrases, missing articles, or implied-but-unwritten words
- **Register:** consistent editorial tone across all frames — not casual, not bureaucratic
- **Precision:** every word earns its place; remove anything vague or filler
- **Redundancy:** does this text say something the image doesn't already show? If not, cut it
- **Factual accuracy:** re-confirm any figure, name, or measurement against confirmed sources

Revise any string that fails a check. Replace — do not flag and defer. Only present final, reviewed copy.

**Wait for user approval on the full concept before continuing.**

---

## Step 5 — Generate the HTML concept template

Generate a single self-contained HTML file showing all approved frames as a layout brief card.

Model it on `frameforge/img/sample-template.png` and `sample-template4.png`:
- One card per frame showing the canvas at correct aspect ratio
- Zone annotations: image area, text zone, gradient band
- Typography scale: headline / subhead / body sizes in px
- Decorative rules or shapes with opacity noted
- Exact text content for every layer on every frame
- Series title, platform, and frame count at the top

The HTML must be fully self-contained (inline CSS, no external dependencies). Save as `my-project/concept-template.html`.

Also save `my-project/concept-template.md` — a plain-text markdown version of the approved concept. Include: series title and platform, color palette (hex + role), type system (families + size scale), application rules, and for each frame: frame-id, `image_src` label, thumbnail sheet position, silent/text status, and exact proposed text strings. **No placeholders** — every field must contain the actual approved value. This is the reference document for Step 8 and for any future session picking up the project. See `amazon/concept-template.md` as the reference for structure and level of detail.

**Wait for user approval before writing the JSON.**

---

## Step 5b — Analyze per-frame color

Before generating the JSON, dispatch the `frameforge-color-advisor` sub-agent (`.claude/skills/frameforge-color-advisor/SKILL.md`). This agent reads each frame's raw photograph, looks at the actual text zone, and determines whether the approved palette colors are legible there — or whether per-frame overrides are needed.

Fill these placeholders when dispatching:

- `[CONCEPT_TEMPLATE_MD_PATH]` → `my-project/concept-template.md`
- `[FRAME_IMAGE_MAPPING_PATH]` → `my-project/frame-image-mapping.md`
- `[THUMBNAIL_SHEETS_PATH]` → `my-project/inputs/`
- `[COLOR_NOTES_PATH]` → `my-project/color-notes.md`

The agent writes `my-project/color-notes.md`. This file contains a per-frame, per-role decision table: for each text role in each frame, either the palette color is confirmed safe or an override is given (typically `#FFFFFF`). The art director in Step 8 reads this file before setting any color — it supersedes the concept template's color specs for any frame where a conflict is found.

**The concept palette is a series default. Color notes are the per-frame truth.**

---

## Step 6 — Develop the JSON

Generate the complete FrameForge JSON following `ai-manual-content.js`:

- Use descriptive `image_src` labels (e.g. `"wide-canyon-overview"`), never raw filenames
- One frame per image in the approved sequence
- Include `image_index` with a real entry per frame documenting visual decisions
- Export target must match the selected platform
- No placeholder text, no invented facts

Save as `my-project/my-project.json`.

Also save `my-project/frame-image-mapping.md` — a table mapping each frame to its `image_src` label, thumbnail sheet position, and the raw filename from `images/`. Format:

```markdown
| Frame | `image_src` label | Sheet · position | Raw file (`images/`) |
|-------|-------------------|------------------|----------------------|
| frame-01 | `canopy-walkway` | Sheet 5 · #45 | `dji_fly_20260228_131446_0609_1772316071531_photo.jpg` |
| frame-02 | `towering-trees` | Sheet 3 · #22 | `CC2A3478.jpg` |
| frame-03 | `aerial-amazon` | Sheet 5 · #46 | `aerial-amazon.jpg` |
```

Every row must be filled with the actual raw filename read from the thumbnail sheet — never a placeholder. The raw filenames come from the thumbnail sheets (`inputs/`): each thumbnail has the original filename printed directly beneath it. Open each sheet image and read the label under the photo at the listed position.

**Leave no row blank.** This file is filled once and used forever — every future session, every Playwright injection, every iteration reads from here instead of opening thumbnail sheets.

---

## Step 7 — Load into FrameForge

**Before loading any images, verify that `frame-image-mapping.md` is complete** — every row must have a raw filename. If any row is blank, open the relevant thumbnail sheet, read the label under that position, and fill it in now. Do not proceed until the file is complete. This is the step where the mapping is established; it cannot be recovered later without reopening the thumbnail sheets.

### Without Playwright

Tell the user:
1. Open `http://127.0.0.1:5500/frameforge/index.html`
2. Click **Load JSON** → select `my-project/my-project.json`
3. Click **Load Images** → select all raw photos from `images/`
4. Navigate to each frame and take a screenshot
5. Share the screenshots with the AI

Then proceed to Step 8.

### With Playwright

Use `browser_evaluate` — never `browser_file_upload` (it stacks native dialogs and blocks the page). If the snapshot shows `[File chooser]` entries, call `browser_file_upload` with no paths once per dialog until the snapshot is clean.

**Inject JSON:**
```javascript
async () => {
  const response = await fetch('/frameforge/data/test-projects/my-project/my-project.json');
  const jsonText = await response.text();
  const file = new File([jsonText], 'my-project.json', { type: 'application/json' });
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.querySelector('#input-json');
  Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return 'JSON injected';
}
```

**Inject images** — name each `File` with the frame's `image_src` label (no extension). FrameForge matches images by `file.name` to the label; they must be identical:
```javascript
async () => {
  const images = [
    ['canopy-walkway',        '/frameforge/data/test-projects/amazon/images/dji_fly_20260228_131446_0609_1772316071531_photo.jpg'],
    ['towering-trees',        '/frameforge/data/test-projects/amazon/images/CC2A3478.jpg'],
    ['aerial-amazon',         '/frameforge/data/test-projects/amazon/images/aerial-amazon.jpg'],
    ['canoe-at-dusk',         '/frameforge/data/test-projects/amazon/images/CC2A8728.jpg'],
    ['child-in-the-rain',     '/frameforge/data/test-projects/amazon/images/CC2A0719.jpg'],
    ['river-as-highway',      '/frameforge/data/test-projects/amazon/images/IMG_9302.jpg'],
    ['soccer-game',           '/frameforge/data/test-projects/amazon/images/CC2A9853.jpg'],
    ['women-laughing',        '/frameforge/data/test-projects/amazon/images/d80ba5a6-82ee-4fea-85f8-3235cd1e3fc3.jpg'],
    ['squirrel-monkey',       '/frameforge/data/test-projects/amazon/images/CC2A0551.jpg'],
    ['poison-dart-frog',      '/frameforge/data/test-projects/amazon/images/CC2A9770.jpg'],
    ['white-chinned-jacamar', '/frameforge/data/test-projects/amazon/images/CC2A4844.jpg'],
    ['woolly-monkey',         '/frameforge/data/test-projects/amazon/images/CC2A0205.jpg'],
    ['pink-dolphin',          '/frameforge/data/test-projects/amazon/images/CC2A9025.jpg'],
    ['musmuquis',             '/frameforge/data/test-projects/amazon/images/CC2A9238.jpg'],
    ['black-tailed-trogon',   '/frameforge/data/test-projects/amazon/images/CC2A3908.jpg'],
    ['wire-tailed-manakin',   '/frameforge/data/test-projects/amazon/images/CC2A3875.jpg'],
    ['amazon-tree-frog',      '/frameforge/data/test-projects/amazon/images/CC2A5120.jpg'],
    ['striated-heron-dusk',   '/frameforge/data/test-projects/amazon/images/CC2A5844.jpg'],
    ['mouse-opossum',         '/frameforge/data/test-projects/amazon/images/CC2A9785.jpg'],
    ['woman-with-anaconda',   '/frameforge/data/test-projects/amazon/images/IMG_0768.jpg'],
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

**Wait for all images in memory:**
```javascript
() => new Promise((resolve) => {
  const expected = 7; // set to your frame count
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

---

## Step 8 — Make art

This is where the work becomes what it is. Every previous step — concept, curation, brief, JSON — was preparation. Now you look at each rendered image and ask a single question: **does this work as a photograph?**

Not: did I follow the brief. Not: is the opacity in range. Those are tools, not the goal. The goal is an image that flows.

### Art Director Agent — one frame at a time

**With Playwright (Claude Code):** Use the `frameforge-art-director` skill (`.claude/skills/frameforge-art-director/SKILL.md`). Dispatch one subagent per frame. The skill defines the full per-frame workflow:

1. **Art Director** renders the frame, looks at the photograph, makes visual decisions, proposes all text strings
2. **Copy Reviewer** reviews every proposed string — grammar, factual accuracy, narrative fit against the concept template, register. Art director may not write any text to the JSON until the reviewer approves
3. **Art Director** writes approved copy to the JSON, finalizes the visual design, saves the screenshot (canvas element only — never full page)
4. **Human approval** — present screenshot to user and wait. Do not dispatch the next frame until the user says so

**Never batch-screenshot all frames and move on.** Step 8 is a creative process, not a capture job. Each frame gets a full creative + editorial review cycle before moving on.

#### What the copy reviewer catches

The copy reviewer reads the concept template before reviewing any string. This means it enforces:
- **No-text frame rules** — if the concept marks a frame as silent (`sin texto`), text does not belong there regardless of what the JSON draft contains
- **Factual accuracy** — superlatives, measurements, species names, place names must be verifiable and correctly scoped
- **Series consistency** — a claim made in one frame (e.g. "the world's largest rainforest") cannot be duplicated in another frame where it doesn't apply
- **Editorial register** — colloquial or informal language is flagged and corrected to match the series voice

#### Screenshots

Always capture the canvas element only — never the full browser window. Use `browser_snapshot` to get the canvas ref, then `browser_take_screenshot` with `element: "canvas"` and the ref, `type: "jpeg"`. Full-page screenshots are too large and cause API errors.

### The shape library is yours

FrameForge ships a full library of shapes — lines, rectangles, circles, organic forms, graphic elements. There is no limit on using them. A shape is not decoration; it is a compositional instrument. Use as many as the image demands, in any combination, at any scale or opacity. Stack them, layer them, use one or twelve. The only question is whether the result works as an image. If it does, it is correct.

### Technical setup

#### localStorage quota limitation

FrameForge persists images in localStorage (~5 MB). Large JPEGs exceed this after the first 2–3 images. The rest exist in memory only and are lost on frame navigation.

**With Playwright:** re-inject all images before navigating to each frame. Combine injection + navigation + render wait in one `browser_evaluate`:
```javascript
async () => {
  const images = [ /* same label → path array as above */ ];
  const files = await Promise.all(images.map(async ([name, path]) => {
    const blob = await fetch(path).then(r => r.blob());
    return new File([blob], name, { type: 'image/jpeg' });
  }));
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));
  const input = document.querySelector('#input-images');
  Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(resolve => {
    const check = () => {
      if (document.querySelectorAll('[class*="tray"] [draggable]').length >= images.length) {
        resolve(); return;
      }
      setTimeout(check, 200);
    };
    check();
    setTimeout(resolve, 6000);
  });
  document.querySelector('[role="listbox"]').children[N].click(); // 0-indexed
  await new Promise(r => setTimeout(r, 800));
  return 'ready';
}
```
Immediately call `browser_take_screenshot` — save to `screenshots/frame-0N-v1.jpg`. Reloading JSON always clears images; re-inject immediately after any JSON reload.

**Without Playwright:** user re-loads the updated JSON and re-shares screenshots manually after each iteration.

### Looking at each frame

Take the screenshot. Then stop and look at it — not at the brief, not at the manual. At the image.

Ask:

- **Does the eye move freely?** Or does something snag it — a text block that sits wrong, a gradient edge that cuts where it shouldn't, a shape that announces itself?
- **Does the type belong to the photo?** Text should feel like it grew from the image, not like it was placed on top of it. If it looks pasted, something is off — scale, weight, position, or opacity.
- **Does the frame breathe?** Overcrowded frames suffocate. If anything can be removed and the image is stronger for it, remove it.
- **Does the frame carry its silence?** Some images do more with less. A clean frame next to a dense one creates rhythm. Use that.
- **Does it sit in the series?** Look at adjacent frames together. The series should flow — there should be a visual conversation between frames, not a collection of unrelated cards.

If something feels wrong, trust that. Diagnose it by looking, not by cross-referencing rules. Adjust opacity, reposition, resize, change weight — whatever the image is asking for. Then re-inject and look again.

The brief and the manual exist to prevent specific failure modes. They are not a substitute for judgment. When the image looks right, it is right. When it doesn't, no amount of rule-compliance will fix it.

Edit JSON → re-inject → screenshot affected frames → save as `frame-0N-v2.jpg`.

---

## Step 9 — Review gate

Once all frames have a clean first version:

- Present all screenshots to the user
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
