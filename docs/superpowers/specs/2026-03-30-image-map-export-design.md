# Image Map Export — Design Spec

**Date:** 2026-03-30
**Status:** Approved

---

## Problem

The Concept Builder exports thumbnail sheets (PNGs) where each thumbnail has the original filename printed beneath it. AI agents (Concept Strategist, Technical Producer) must read those filenames visually from the PNG — a task that is error-prone and frequently produces invented or misread filenames.

## Solution

Export a machine-readable markdown file alongside the thumbnail sheets: `{slug}-image-map.md`. It maps every image number (1–N, matching the thumbnail sheet numbering) to its exact original filename. AI agents read the map file instead of parsing PNG text.

---

## Changes

### 1. `frameforge/ui/concept-builder.js`

**New function:** `generateImageMapMarkdown(names, slug)`

- Pure function, no side effects
- `names`: array of original filenames in load order (same order as thumbnail sheets)
- `slug`: project slug for the title
- Returns a markdown string:

```markdown
# Image Map — {slug}

| # | Filename |
|---|----------|
| 1 | CC2A0036.jpg |
| 2 | CC2A0157.jpg |
...
| N | aerial-amazon.jpg |
```

**`_doExportPackage()` update:**

Add after the thumbnail sheets block (step 4), inside the `if (this._imageElements.length > 0)` guard:

```js
// 5 — Image map
setStatus('Generating image map…');
const mapMd = generateImageMapMarkdown(this._imageFiles.map(f => f.name), slug);
triggerDownload(new Blob([mapMd], { type: 'text/markdown' }), `${slug}-image-map.md`);
fileCount++;
await new Promise(r => setTimeout(r, 200));
```

**Status message update:**

Replace the generic count message with a descriptive one. When images were loaded:
```
✓ Package exported — brief, designs, shapes, N thumbnail sheet(s), image map (X files)
```
When no images were loaded (no sheets, no map):
```
✓ Package exported — brief, designs, shapes (X files)
```

---

### 2. `frameforge/.claude/skills/frameforge-concept-strategist/SKILL.md`

**New input placeholder:** `[IMAGE_MAP_PATH]`

**Updated instruction** (replaces "read filename printed under each thumbnail"):
> Use the image map at `[IMAGE_MAP_PATH]` to look up the exact filename for each image number. Read thumbnail sheets only for visual content — what the photo shows, subject position, composition. Do not read filenames from thumbnails.

**Dispatch table addition:**

| Placeholder | Value |
|---|---|
| `[IMAGE_MAP_PATH]` | `frameforge/data/test-projects/my-project/inputs/{slug}-image-map.md` |

---

### 3. `frameforge/.claude/skills/frameforge-technical-producer/SKILL.md`

**New input placeholder:** `[IMAGE_MAP_PATH]`

**Updated instruction** (replaces "open each sheet and read the filename printed under each thumbnail"):
> Read filenames from the image map at `[IMAGE_MAP_PATH]`. Do not read filenames from thumbnail sheets — the map is the authoritative source.

**Dispatch table addition:**

| Placeholder | Value |
|---|---|
| `[IMAGE_MAP_PATH]` | `frameforge/data/test-projects/my-project/inputs/{slug}-image-map.md` |

---

### 4. `frameforge/data/test-projects/README.md`

**Directory layout:** Add `{slug}-image-map.md` to the `inputs/` directory entry.

**Step 1 dispatch table:** Add `[IMAGE_MAP_PATH]` row.

**Step 5 dispatch table:** Add `[IMAGE_MAP_PATH]` row.

---

## File naming

| File | Convention |
|---|---|
| Image map | `{slug}-image-map.md` |
| Thumbnail sheets | `{slug}-thumbs-01.png`, `{slug}-thumbs-02.png`, … |

Both use the same slug derived from the project title field in the Concept Builder.

---

## What is not changing

- Thumbnail sheet generation logic — unchanged
- Image load order — unchanged (map order = sheet order by definition)
- Any other export type
- The `image_src` label system in the JSON — still uses descriptive labels, not raw filenames. The map resolves labels → raw filenames at the Technical Producer step.
