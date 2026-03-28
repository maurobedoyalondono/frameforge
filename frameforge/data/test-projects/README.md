# FrameForge Test Projects — Design Workflow

This document is a **protocol for AI models**. Hand it to any capable AI alongside a project `inputs/` folder. The AI follows these steps in order, pausing at each review gate.

---

## Two types of reference images

**Framework images** (`frameforge/img/sample-template*.png`) — layout reference cards showing FrameForge design conventions: frame structure, zone annotations, typography scale, gradient bands. Study these before proposing any concept.

**Image sheet** (`inputs/`) — a low-resolution thumbnail grid of the project's source photos, prepared by the user. This is the only form in which source photos are shared with an AI model. Raw photos are never shared — they live in `images/` for local Playwright use only.

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
2. Inside it, create `inputs/` and place an **image sheet** there — a single image file containing all source photos as a labeled thumbnail grid (not the raw photos)
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
    ├── my-project.json              ← generated project definition (Step 6)
    └── screenshots/                 ← layout captures for iteration
        ├── frame-01-v1.jpg
        └── ...
```

---

## Step 1 — Read and confirm

- Study the framework images in `frameforge/img/` to understand layout conventions
- Study the image sheet in `inputs/` — note subject position, negative space, tonal register, orientation for each photo
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

**Visual palette:** 2–3 hex colors sampled from the image sheet thumbnails. For each: name, role (primary tone / type accent / shape base), and which image or tonal zone it was pulled from.

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

**Wait for user approval before writing the JSON.**

---

## Step 6 — Develop the JSON

Generate the complete FrameForge JSON following `ai-manual-content.js`:

- Use descriptive `image_src` labels (e.g. `"wide-canyon-overview"`), never raw filenames
- One frame per image in the approved sequence
- Include `image_index` with a real entry per frame documenting visual decisions
- Export target must match the selected platform
- No placeholder text, no invented facts

Save as `my-project/my-project.json`.

---

## Step 7 — Load into FrameForge

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
    ['label-for-frame-01', '/frameforge/data/test-projects/my-project/images/photo-01.jpg'],
    ['label-for-frame-02', '/frameforge/data/test-projects/my-project/images/photo-02.jpg'],
    // one entry per frame
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

## Step 8 — Screenshot and iterate

### localStorage quota limitation

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

### What to check on each iteration

**Against the Step 4 per-frame editorial brief (primary check — do this first):**

For each frame, open the approved brief and verify:
- **Layers:** only elements approved in the Layer intent section are present — no additions, no omissions
- **Strongest zone:** completely clear of all elements (gradient, shape, line, text) — this is a hard constraint
- **Positions:** each element sits within the quietest zone as described in the brief
- **Copy:** text strings match the final approved copy exactly — word for word, punctuation included
- **Reading order:** the first → second → third visual beat matches the Composition check
- **Survival test:** no element present that failed the survival test in the brief

**Against `ai-manual-content.js` rules (secondary check):**
- Shapes visible but subordinate to the photo (opacity 0.4–0.6 for lines, per-type ceiling in the manual)
- Gradient direction matches the text anchor zone
- Text zone not crowded (font scale, line count, two-layer max)
- Zone-mode shapes rendering in the correct position (not at 0,0)

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
