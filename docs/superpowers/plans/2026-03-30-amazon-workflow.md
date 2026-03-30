# The Amazon — FrameForge Workflow Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the full 7-step FrameForge workflow for the `the-amazon` project, producing a complete set of approved Instagram Portrait frames exported to `screenshots/`.

**Architecture:** Sequential agent dispatch — each step dispatches a named FrameForge skill, produces a file deliverable, and blocks on human approval before the next step begins. Mode A (Claude Code + Playwright MCP) throughout.

**Tech Stack:** FrameForge skills (frameforge-concept-strategist, frameforge-creative-director, frameforge-visual-designer, frameforge-color-advisor, frameforge-technical-producer, frameforge-stage-manager, frameforge-art-orchestrator), Playwright MCP (Steps 6–7)

---

## Deliverable Map

| Step | Skill | Output file(s) |
|---|---|---|
| 1 | frameforge-concept-strategist | `narrative-brief.md` |
| 2 | frameforge-creative-director | (approved concept — no file, lives in conversation) |
| 3 | frameforge-visual-designer | `concept-template.html`, `concept-template.md` |
| 4 | frameforge-color-advisor | `color-notes.md` |
| 5 | frameforge-technical-producer | `the-amazon.json`, `frame-image-mapping.md` |
| 6 | frameforge-stage-manager | FrameForge loaded (no file) |
| 7 | frameforge-art-orchestrator | `screenshots/frame-NN-v1.jpg` (one per frame) |

All files land in: `frameforge/data/test-projects/amazon/`

---

## Creative Constraints (carry through every step)

- **Image 46** — mandatory opening frame, establishes the series
- **Image 47** — mandatory closing frame, closes the arc
- **Image 48** — mandatory frame in River & Jungle group; editorial intent: river as the Amazon's main transport artery
- **Thematic groups:** River & Jungle · People & Community · Wildlife
- **Frame count:** Concept Strategist decides based on image pool strength
- **Tone:** AI decides based on story and images

---

## Task 1: Concept Strategist

**Files:**
- Create: `frameforge/data/test-projects/amazon/narrative-brief.md`

- [ ] **Step 1: Verify prerequisites**

Confirm these files exist before dispatching:
```
frameforge/data/test-projects/amazon/input/the-amazon-thumbs-01.png
frameforge/data/test-projects/amazon/input/the-amazon-thumbs-02.png
frameforge/data/test-projects/amazon/input/the-amazon-thumbs-03.png
frameforge/data/test-projects/amazon/input/the-amazon-thumbs-04.png
frameforge/data/test-projects/amazon/input/the-amazon-thumbs-05.png
frameforge/img/  (framework reference images)
```

- [ ] **Step 2: Dispatch frameforge-concept-strategist**

Use the `frameforge-concept-strategist` skill with these placeholder values:

| Placeholder | Value |
|---|---|
| `[PROJECT_NAME]` | `amazon` |
| `[IMAGE_SHEET_PATH]` | `frameforge/data/test-projects/amazon/input/` (all 5 sheets: the-amazon-thumbs-01.png through the-amazon-thumbs-05.png) |
| `[NARRATIVE_BRIEF_PATH]` | `frameforge/data/test-projects/amazon/narrative-brief.md` |

**Additional constraints to include in the dispatch:**
> Image 46 (on the thumbnail sheets) must be the opening frame. Image 47 must be the closing frame. Image 48 must appear in the River & Jungle group with the editorial intent "river as the Amazon's main transport artery."
> Curate the frame selection into three thematic groups: River & Jungle, People & Community, Wildlife. Propose the narrative order of groups and the number of frames per group.

- [ ] **Step 3: Review narrative-brief.md**

Read `frameforge/data/test-projects/amazon/narrative-brief.md`. Verify:
- Image 46 is listed as frame 01 (opening)
- Image 47 is listed as the final frame (closing)
- Image 48 is listed in the River & Jungle group with the transport artery intent
- Three thematic groups are present with clearly labeled frames
- Each dropped image has a stated reason

Present the curated frame list to the user for approval.

- [ ] **Step 4: Approval gate**

Wait for explicit user approval. If changes are requested, re-dispatch the skill or revise inline, then re-confirm.

- [ ] **Step 5: Commit**

```bash
git add frameforge/data/test-projects/amazon/narrative-brief.md
git commit -m "feat(amazon): add narrative brief — Step 1 complete"
```

---

## Task 2: Creative Director

**Files:**
- Reads: `frameforge/data/test-projects/amazon/narrative-brief.md`
- Reads: thumbnail sheets in `frameforge/data/test-projects/amazon/input/`
- No file output — deliverable is the approved concept block returned in conversation

- [ ] **Step 1: Verify prerequisites**

Confirm `narrative-brief.md` exists and was approved in Task 1.

- [ ] **Step 2: Dispatch frameforge-creative-director**

Use the `frameforge-creative-director` skill with these placeholder values:

| Placeholder | Value |
|---|---|
| `[PROJECT_NAME]` | `amazon` |
| `[NARRATIVE_BRIEF_PATH]` | `frameforge/data/test-projects/amazon/narrative-brief.md` |
| `[IMAGE_SHEET_PATH]` | `frameforge/data/test-projects/amazon/input/` (all 5 sheets) |

- [ ] **Step 3: Review concept output**

The skill returns a full concept block covering:
- Palette (2–3 hex colors with roles)
- Type system (display font + sans-serif, both valid Google Fonts names)
- Per-frame briefs (image read, layer intent, exact copy for every text layer)

Verify:
- Sans-serif font handles all numbers and measurements (display font prohibited for numeric layers)
- No text element placed over a subject's key feature
- Copy is complete — no placeholder strings

Present the full concept to the user for approval.

- [ ] **Step 4: Approval gate**

Wait for explicit user approval. If changes requested, re-dispatch or revise inline. Save the approved `CONCEPT SUMMARY` block — it is required as input for Task 3.

---

## Task 3: Visual Designer

**Files:**
- Create: `frameforge/data/test-projects/amazon/concept-template.html`
- Create: `frameforge/data/test-projects/amazon/concept-template.md`

- [ ] **Step 1: Verify prerequisites**

Confirm:
- `narrative-brief.md` exists
- Approved `CONCEPT SUMMARY` block is available from Task 2

- [ ] **Step 2: Dispatch frameforge-visual-designer**

Use the `frameforge-visual-designer` skill with these placeholder values:

| Placeholder | Value |
|---|---|
| `[PROJECT_NAME]` | `amazon` |
| `[NARRATIVE_BRIEF_PATH]` | `frameforge/data/test-projects/amazon/narrative-brief.md` |
| `[CONCEPT_SUMMARY_BLOCK]` | Full `CONCEPT SUMMARY` block returned by the Creative Director in Task 2 |
| `[PROJECT_PATH]` | `frameforge/data/test-projects/amazon` |

- [ ] **Step 3: Review deliverables**

Confirm both files exist:
```
frameforge/data/test-projects/amazon/concept-template.html
frameforge/data/test-projects/amazon/concept-template.md
```

- [ ] **Step 4: Approval gate**

Tell the user: "Open `frameforge/data/test-projects/amazon/concept-template.html` in a browser to review the layout brief card."

Wait for explicit approval of both files. If changes requested, re-dispatch or edit inline.

- [ ] **Step 5: Commit**

```bash
git add frameforge/data/test-projects/amazon/concept-template.html \
        frameforge/data/test-projects/amazon/concept-template.md
git commit -m "feat(amazon): add concept template — Step 3 complete"
```

---

## Task 4: Color Advisor

**Files:**
- Reads: `frameforge/data/test-projects/amazon/concept-template.md`
- Reads: thumbnail sheets in `frameforge/data/test-projects/amazon/input/`
- Create: `frameforge/data/test-projects/amazon/color-notes.md`

- [ ] **Step 1: Verify prerequisites**

Confirm `concept-template.md` exists and was approved in Task 3.

- [ ] **Step 2: Dispatch frameforge-color-advisor**

Use the `frameforge-color-advisor` skill with these placeholder values:

| Placeholder | Value |
|---|---|
| `[CONCEPT_TEMPLATE_MD_PATH]` | `frameforge/data/test-projects/amazon/concept-template.md` |
| `[FRAME_IMAGE_MAPPING_PATH]` | `frameforge/data/test-projects/amazon/frame-image-mapping.md` *(intended output path — not yet created)* |
| `[THUMBNAIL_SHEETS_PATH]` | `frameforge/data/test-projects/amazon/input/` |
| `[COLOR_NOTES_PATH]` | `frameforge/data/test-projects/amazon/color-notes.md` |

- [ ] **Step 3: Review color-notes.md**

Read `frameforge/data/test-projects/amazon/color-notes.md`. Verify:
- Every frame from the approved sequence has an entry
- Each entry specifies: palette color confirmed or override with reason
- No blank entries

Present to the user for approval.

- [ ] **Step 4: Approval gate**

Wait for explicit user approval. This gate is typically brief.

- [ ] **Step 5: Commit**

```bash
git add frameforge/data/test-projects/amazon/color-notes.md
git commit -m "feat(amazon): add color notes — Step 4 complete"
```

---

## Task 5: Technical Producer

**Files:**
- Reads: `frameforge/data/test-projects/amazon/concept-template.md`
- Reads: `frameforge/data/test-projects/amazon/color-notes.md`
- Reads: thumbnail sheets in `frameforge/data/test-projects/amazon/input/`
- Create: `frameforge/data/test-projects/amazon/the-amazon.json`
- Create: `frameforge/data/test-projects/amazon/frame-image-mapping.md`

- [ ] **Step 1: Verify prerequisites**

Confirm both files exist:
```
frameforge/data/test-projects/amazon/concept-template.md
frameforge/data/test-projects/amazon/color-notes.md
```

- [ ] **Step 2: Dispatch frameforge-technical-producer**

Use the `frameforge-technical-producer` skill with these placeholder values:

| Placeholder | Value |
|---|---|
| `[PROJECT_NAME]` | `amazon` |
| `[CONCEPT_TEMPLATE_MD_PATH]` | `frameforge/data/test-projects/amazon/concept-template.md` |
| `[COLOR_NOTES_PATH]` | `frameforge/data/test-projects/amazon/color-notes.md` |
| `[IMAGE_SHEET_PATH]` | `frameforge/data/test-projects/amazon/input/` (all 5 sheets) |
| `[FRAME_IMAGE_MAPPING_PATH]` | `frameforge/data/test-projects/amazon/frame-image-mapping.md` |
| `[PROJECT_JSON_PATH]` | `frameforge/data/test-projects/amazon/the-amazon.json` |

- [ ] **Step 3: Spot-check the-amazon.json**

Read `frameforge/data/test-projects/amazon/the-amazon.json`. Verify:
- `project.id` is `"the-amazon"`
- `export.target` is `"instagram-portrait"`, width 1080, height 1350, dpi 72, scale_factor 2
- Frame count matches the approved sequence from `narrative-brief.md`
- Frame order matches the approved sequence (image 46 = frame-01, image 47 = last frame, image 48 in River & Jungle group)
- All `image_src` values are descriptive labels (not raw filenames)
- All text content is real editorial copy (no placeholder strings)
- `image_index` is present with one entry per frame
- All stats values are written in full (no abbreviations or hyphen ranges)

- [ ] **Step 4: Spot-check frame-image-mapping.md**

Read `frameforge/data/test-projects/amazon/frame-image-mapping.md`. Verify:
- Every frame has a row
- `image_src` labels match the JSON exactly
- Raw filenames were read from the thumbnail sheets (not invented)

Present both files to the user for approval.

- [ ] **Step 5: Approval gate**

Wait for explicit user approval.

- [ ] **Step 6: Commit**

```bash
git add frameforge/data/test-projects/amazon/the-amazon.json \
        frameforge/data/test-projects/amazon/frame-image-mapping.md
git commit -m "feat(amazon): add project JSON and frame mapping — Step 5 complete"
```

---

## Task 6: Stage Manager

**Files:**
- Reads: `frameforge/data/test-projects/amazon/the-amazon.json`
- Reads: `frameforge/data/test-projects/amazon/frame-image-mapping.md`
- Reads: `frameforge/data/test-projects/amazon/images/` (raw photos — Playwright only)
- No file output — deliverable is FrameForge loaded and confirmed

- [ ] **Step 1: Verify prerequisites**

Confirm both files exist:
```
frameforge/data/test-projects/amazon/the-amazon.json
frameforge/data/test-projects/amazon/frame-image-mapping.md
```

Count frames in the JSON — this number is required for the skill dispatch.

- [ ] **Step 2: Dispatch frameforge-stage-manager**

Use the `frameforge-stage-manager` skill with these placeholder values:

| Placeholder | Value |
|---|---|
| `[PROJECT_NAME]` | `amazon` |
| `[FRAME_IMAGE_MAPPING_PATH]` | `frameforge/data/test-projects/amazon/frame-image-mapping.md` |
| `[IMAGE_SHEET_PATH]` | `frameforge/data/test-projects/amazon/input/` |
| `[IMAGES_PATH]` | `frameforge/data/test-projects/amazon/images/` |
| `[PROJECT_JSON_PATH]` | `frameforge/data/test-projects/amazon/the-amazon.json` |
| `[FRAME_COUNT]` | Total number of frames in `the-amazon.json` (determined in Step 1) |

- [ ] **Step 3: Confirm FrameForge is ready**

The skill will confirm via Playwright that:
- JSON is loaded and active
- All images are present in the tray

Do not proceed to Task 7 until this is confirmed.

---

## Task 7: Art Orchestrator

**Files:**
- Reads: `frameforge/data/test-projects/amazon/concept-template.md`
- Reads: `frameforge/data/test-projects/amazon/color-notes.md`
- Reads: `frameforge/data/test-projects/amazon/frame-image-mapping.md`
- Reads: `frameforge/data/test-projects/amazon/the-amazon.json`
- Create: `frameforge/data/test-projects/amazon/screenshots/frame-NN-v1.jpg` (one per frame, more if iterations)

- [ ] **Step 1: Verify FrameForge is loaded**

Confirm Task 6 completed successfully — FrameForge is active with the Amazon project.

- [ ] **Step 2: Dispatch frameforge-art-orchestrator**

Use the `frameforge-art-orchestrator` skill. It takes the following inputs from the project:

- `frameforge/data/test-projects/amazon/concept-template.md`
- `frameforge/data/test-projects/amazon/color-notes.md`
- `frameforge/data/test-projects/amazon/frame-image-mapping.md`
- `frameforge/data/test-projects/amazon/the-amazon.json`

The skill runs the per-frame loop (art director → copy reviewer → human approval) one frame at a time. It manages its own Playwright interactions and screenshot captures.

- [ ] **Step 3: Per-frame approval (orchestrator manages this)**

The art orchestrator handles the frame-by-frame loop internally. Each frame:
1. Captures screenshot via Playwright
2. Dispatches frameforge-art-director for visual assessment
3. Dispatches frameforge-copy-reviewer for copy check
4. Presents to human for approval
5. Iterates if changes requested, captures new screenshot version

Do not advance a frame until it is explicitly approved.

- [ ] **Step 4: Final review gate**

Once all frames are approved, the orchestrator presents all final screenshots. For any frame that iterated, note what changed from v1 → vN.

Ask: "Ready to review — do any frames need changes before we commit?"

Wait for explicit go-ahead.

- [ ] **Step 5: Commit all screenshots**

```bash
git add frameforge/data/test-projects/amazon/screenshots/
git commit -m "feat(amazon): add final approved screenshots — Step 7 complete"
```

---

## Self-Review Notes

- Spec coverage: all 7 workflow steps covered, all creative constraints repeated in Task 1 dispatch, all deliverable paths are explicit.
- Placeholder scan: no TBD or TODO entries — all paths, IDs, and placeholder values are fully specified.
- Type consistency: `image_src` label convention referenced consistently across Tasks 5 and 6. `[FRAME_COUNT]` is computed in Task 6 Step 1 before use in Step 2.
