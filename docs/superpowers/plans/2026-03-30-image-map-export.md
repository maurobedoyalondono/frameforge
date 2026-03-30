# Image Map Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `{slug}-image-map.md` export to the Concept Builder package, update the export status message to be descriptive, and update the Concept Strategist and Technical Producer skills to use the map file for filenames instead of reading thumbnail PNGs.

**Architecture:** Four independent edits — one JS file, two skill markdown files, one README. No new files are created in the app (the new function lives in `concept-builder.js`). Skills are plain markdown, edited directly.

**Tech Stack:** Vanilla JS (ES modules), Markdown

---

## File Map

| File | Change |
|---|---|
| `frameforge/ui/concept-builder.js` | Add `generateImageMapMarkdown()`, update `_doExportPackage()`, update status message |
| `frameforge/.claude/skills/frameforge-concept-strategist/SKILL.md` | Add `[IMAGE_MAP_PATH]` input, update filename-reading instructions and table |
| `frameforge/.claude/skills/frameforge-technical-producer/SKILL.md` | Add `[IMAGE_MAP_PATH]` input, replace thumbnail filename reading with map reading |
| `frameforge/data/test-projects/README.md` | Update directory layout, "How to start" section, Step 1 + Step 5 dispatch tables |

---

## Task 1: Add image map generation to concept-builder.js

**Files:**
- Modify: `frameforge/ui/concept-builder.js`

**Context:** `_doExportPackage()` is at line ~551. It exports files in sequence using `triggerDownload()` and `await new Promise(r => setTimeout(r, N))` delays. The thumbnail sheets block (step 4) is guarded by `if (this._imageElements.length > 0)`. The final status message is at line 608. `this._imageFiles` is an array of `File` objects; `f.name` is the original filename.

- [ ] **Step 1: Add `generateImageMapMarkdown` function**

Insert this function in `frameforge/ui/concept-builder.js` just before the `export class ConceptBuilder {` line (line 87):

```js
/**
 * Builds a markdown image-map string mapping 1-based image numbers to filenames.
 * @param {string[]} names  Original filenames in load order (same as thumbnail sheet order).
 * @param {string}   slug   Project slug for the document title.
 * @returns {string} Markdown table string.
 */
function generateImageMapMarkdown(names, slug) {
  const rows = names.map((name, i) => `| ${i + 1} | ${name} |`).join('\n');
  return `# Image Map — ${slug}\n\n| # | Filename |\n|---|----------|\n${rows}\n`;
}
```

- [ ] **Step 2: Declare `sheetCount` tracker in `_doExportPackage`**

In `_doExportPackage()`, add `let sheetCount = 0;` immediately after the existing `let fileCount = 0;` line (line ~560):

```js
let fileCount = 0;
let sheetCount = 0;
```

- [ ] **Step 3: Capture sheet count and add image map download**

In the `if (this._imageElements.length > 0)` block (lines ~595–606), after the thumbnail sheets `for` loop closes, add `sheetCount = sheetBlobs.length;` and the image map download block. The full updated block should read:

```js
// 4 — Thumbnail sheets (only if images were loaded)
if (this._imageElements.length > 0) {
  setStatus('Generating thumbnail sheets…');
  await yieldToUI();
  const { thumbW, thumbH } = this._thumbDimensions();
  const sheetBlobs = await generateThumbnailSheets(this._imageElements, this._imageFiles.map(f => f.name), thumbW, thumbH);
  for (let i = 0; i < sheetBlobs.length; i++) {
    const sheetNum = String(i + 1).padStart(2, '0');
    triggerDownload(sheetBlobs[i], `${slug}-thumbs-${sheetNum}.png`);
    fileCount++;
    await new Promise((r) => setTimeout(r, 200));
  }
  sheetCount = sheetBlobs.length;

  // 5 — Image map
  setStatus('Generating image map…');
  await yieldToUI();
  const mapMd = generateImageMapMarkdown(this._imageFiles.map(f => f.name), slug);
  triggerDownload(new Blob([mapMd], { type: 'text/markdown' }), `${slug}-image-map.md`);
  fileCount++;
  await new Promise((r) => setTimeout(r, 200));
}
```

- [ ] **Step 4: Update the success status message**

Replace line 608:
```js
status.textContent = `✓ Package exported — ${fileCount} file${fileCount !== 1 ? 's' : ''} downloaded`;
```

With:
```js
if (sheetCount > 0) {
  status.textContent = `✓ Package exported — brief, designs, shapes, ${sheetCount} thumbnail sheet${sheetCount !== 1 ? 's' : ''}, image map (${fileCount} files)`;
} else {
  status.textContent = `✓ Package exported — brief, designs, shapes (${fileCount} files)`;
}
```

- [ ] **Step 5: Verify manually**

Open `http://127.0.0.1:5500/frameforge/index.html` in a browser.
Open the "New Project Brief" wizard (Concept Builder).
Fill in a title, load at least 2 images, reach step 4, click Export Package.

Expected:
- Status shows "Generating image map…" during export
- An additional file `{slug}-image-map.md` downloads alongside the thumbnail sheets
- Final status reads: `✓ Package exported — brief, designs, shapes, N thumbnail sheet(s), image map (X files)`
- Open the downloaded `.md` — verify it contains a `# Image Map — {slug}` heading and a table with one row per image, numbered 1–N, with the correct filename in each row

Also test with no images loaded:
- Status should read: `✓ Package exported — brief, designs, shapes (X files)`
- No image map file should download

- [ ] **Step 6: Commit**

```bash
git add frameforge/ui/concept-builder.js
git commit -m "feat: export image map markdown alongside thumbnail sheets"
```

---

## Task 2: Update frameforge-concept-strategist skill

**Files:**
- Modify: `frameforge/.claude/skills/frameforge-concept-strategist/SKILL.md`

**Context:** The skill currently tells the agent to "read both the image and its filename" from the thumbnail sheet PNG. We're changing it to: use the image sheet for visual reading only, and use the image map file for filenames.

- [ ] **Step 1: Update the "Read before anything else" section**

Replace lines 16–20 (the numbered list under "## Read before anything else"):

**Current:**
```markdown
1. **Framework images** — `frameforge/img/` — study the layout conventions, zone annotations, and frame structure. You need to understand what a FrameForge frame is before you can curate for one.

2. **Image sheet** — `[IMAGE_SHEET_PATH]` — each thumbnail has the original filename printed beneath it. Read both the image and its filename. The filename ties each thumbnail to its raw file and to the `image_src` label that will be assigned later.

Confirm both are done before continuing.
```

**Replace with:**
```markdown
1. **Framework images** — `frameforge/img/` — study the layout conventions, zone annotations, and frame structure. You need to understand what a FrameForge frame is before you can curate for one.

2. **Image sheet** — `[IMAGE_SHEET_PATH]` — study each thumbnail for visual content: subject position, composition, mood, and what the photo communicates. Do not read filenames from the thumbnails.

3. **Image map** — `[IMAGE_MAP_PATH]` — a markdown table mapping image number → exact original filename. Use this as the authoritative filename source when filling the approved frame sequence table.

Confirm all three are done before continuing.
```

- [ ] **Step 2: Update the return protocol table header comment**

In the `## Return protocol` section, the table currently has a comment `[exact filename printed under thumbnail]`. Replace:

```markdown
| 1 | [exact filename printed under thumbnail] | [role in the story] |
| 2 | [exact filename] | [role] |
```

With:
```markdown
| 1 | [filename from image map] | [role in the story] |
| 2 | [filename from image map] | [role] |
```

- [ ] **Step 3: Add `[IMAGE_MAP_PATH]` to the skill's placeholder header**

The skill starts with:
```
**Project:** [PROJECT_NAME]
```

Add the new placeholder below it:
```
**Project:** [PROJECT_NAME]
**Image map:** [IMAGE_MAP_PATH]
```

- [ ] **Step 4: Commit**

```bash
git add "frameforge/.claude/skills/frameforge-concept-strategist/SKILL.md"
git commit -m "feat: update concept-strategist to use image map for filenames"
```

---

## Task 3: Update frameforge-technical-producer skill

**Files:**
- Modify: `frameforge/.claude/skills/frameforge-technical-producer/SKILL.md`

**Context:** The skill currently instructs the agent to "open each sheet and read the filename printed under each approved thumbnail." We're replacing that with reading from the image map file.

- [ ] **Step 1: Add `[IMAGE_MAP_PATH]` to the placeholder header**

The skill starts with:
```
**Project:** [PROJECT_NAME]
```

Add below it:
```
**Project:** [PROJECT_NAME]
**Image map:** [IMAGE_MAP_PATH]
```

- [ ] **Step 2: Replace the image sheet read instruction**

In the `## Read before anything else` section, replace item 4:

**Current:**
```markdown
4. **Image sheet** — `[IMAGE_SHEET_PATH]` — open each sheet and read the filename printed under each approved thumbnail. You will need exact raw filenames for the frame-image mapping. Do not use filenames from memory, prior session context, or the concept template — the only valid source is the label visually printed beneath each thumbnail in the sheet image.
```

**Replace with:**
```markdown
4. **Image map** — `[IMAGE_MAP_PATH]` — a markdown table mapping image number → exact original filename. Use this as the authoritative source for all raw filenames in the frame-image mapping. Do not read filenames from thumbnail sheets. Do not use filenames from memory, prior session context, or the concept template — the image map is the only valid source.
```

- [ ] **Step 3: Update the frame-image mapping section**

In `## Frame-image mapping`, the instruction currently says "open the sheet image and read the label printed under the photo at the listed position." Replace that sentence:

**Current:**
```markdown
Every row must be filled with the actual raw filename read from the thumbnail sheet — open the sheet image and read the label printed under the photo at the listed position. **Leave no row blank.**
```

**Replace with:**
```markdown
Every row must be filled with the actual raw filename from the image map — look up the image number in `[IMAGE_MAP_PATH]` and copy the filename exactly. **Leave no row blank.**
```

- [ ] **Step 4: Commit**

```bash
git add "frameforge/.claude/skills/frameforge-technical-producer/SKILL.md"
git commit -m "feat: update technical-producer to use image map for filenames"
```

---

## Task 4: Update test-projects README

**Files:**
- Modify: `frameforge/data/test-projects/README.md`

**Context:** The README is the master orchestrator. It defines the directory layout, the "How to start" instructions, and the per-step dispatch tables. Four places need updating.

- [ ] **Step 1: Update "How to start a new project" step 2**

**Current:**
```markdown
2. Inside it, create `inputs/` and place an **image sheet** there — use **Export → Thumbnail Sheet** in FrameForge to generate it from the raw photos.
```

**Replace with:**
```markdown
2. Inside it, create `inputs/` and place the exported package files there — use **Export Package** in the FrameForge Concept Builder to generate the thumbnail sheets and image map from the raw photos. The image map (`{slug}-image-map.md`) is required for AI filename resolution.
```

- [ ] **Step 2: Update the directory layout**

In the `inputs/` directory entry, replace:
```
    ├── inputs/                      ← image sheet(s) for AI concept work
    │   └── image-sheet.jpg
```

With:
```
    ├── inputs/                      ← image sheet(s) and image map for AI concept work
    │   ├── image-sheet.jpg
    │   └── {slug}-image-map.md
```

- [ ] **Step 3: Add `[IMAGE_MAP_PATH]` to the Step 1 dispatch table**

In `## Step 1 — Concept Strategist`, add a row to the Claude Code dispatch table:

```markdown
| `[IMAGE_MAP_PATH]` | `frameforge/data/test-projects/my-project/inputs/{slug}-image-map.md` |
```

- [ ] **Step 4: Add `[IMAGE_MAP_PATH]` to the Step 5 dispatch table**

In `## Step 5 — Technical Producer`, add a row to the Claude Code dispatch table:

```markdown
| `[IMAGE_MAP_PATH]` | `frameforge/data/test-projects/my-project/inputs/{slug}-image-map.md` |
```

- [ ] **Step 5: Commit**

```bash
git add frameforge/data/test-projects/README.md
git commit -m "docs: update test-projects README for image map export"
```

---

## Self-Review

**Spec coverage:**
- ✅ `generateImageMapMarkdown()` — Task 1 Step 1
- ✅ `_doExportPackage()` step 5 block — Task 1 Step 3
- ✅ Status message update (both branches) — Task 1 Step 4
- ✅ Concept Strategist: `[IMAGE_MAP_PATH]` input + updated instructions — Task 2
- ✅ Technical Producer: `[IMAGE_MAP_PATH]` input + updated instructions — Task 3
- ✅ README: directory layout + "How to start" + Step 1 + Step 5 dispatch tables — Task 4

**Placeholder scan:** No TBD, no "implement later", no vague steps. All code blocks are complete.

**Type consistency:** `generateImageMapMarkdown(names, slug)` defined in Task 1 Step 1 and called in Task 1 Step 3 with `(this._imageFiles.map(f => f.name), slug)` — signatures match. `sheetCount` declared in Task 1 Step 2 and used in Task 1 Step 4.
