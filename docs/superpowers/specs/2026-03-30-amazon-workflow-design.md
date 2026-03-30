# The Amazon — FrameForge Workflow Design

**Date:** 2026-03-30
**Project:** `the-amazon`
**Status:** Approved

---

## Goal

Run the full 7-step FrameForge workflow (Mode A — Claude Code + Playwright MCP) on a clean Amazon project, producing a complete set of approved Instagram Portrait frames ready for export.

---

## Creative Constraints

These constraints are baked into the Concept Strategist brief and are non-negotiable at every downstream step.

| Constraint | Detail |
|---|---|
| Image 46 | Mandatory opening frame — establishes the series |
| Image 47 | Mandatory closing frame — closes the arc |
| Image 48 | Mandatory frame in the River & Jungle group — river as main transport route |
| Thematic groups | River & Jungle · People & Community · Wildlife |
| Frame count | Concept Strategist proposes based on pool strength |
| Tone | AI decides based on story and images |
| Platform | Instagram Portrait 4:5 — 1080×1350px, DPI 72 |
| Project ID | `the-amazon` |

---

## Workflow Execution

Mode: **Claude Code + Playwright MCP** — all 7 steps run via dispatched skills. Approval gates run after every step; no step begins until the prior deliverable is approved.

### Step 1 — Concept Strategist

**Skill:** `frameforge-concept-strategist`

**Brief to pass:**
- Thumbnail sheets: `frameforge/data/test-projects/amazon/input/the-amazon-thumbs-01.png` through `the-amazon-thumbs-05.png`
- Hard constraints: image 46 opens the series, image 47 closes it, image 48 is required in the River & Jungle group with the editorial intent "river as the Amazon's main transport artery"
- Thematic groups: River & Jungle, People & Community, Wildlife — the Strategist proposes which images fill each group and the narrative order of groups within the sequence
- Frame count: Strategist decides based on pool strength per group

**Deliverable:** `frameforge/data/test-projects/amazon/narrative-brief.md`

**Approval gate:** Review curated frame list and group ordering before dispatching Step 2.

---

### Step 2 — Creative Director

**Skill:** `frameforge-creative-director`

**Inputs:** `narrative-brief.md`, thumbnail sheets

**Deliverable:** Approved concept — palette, type system, per-frame briefs with publication-ready copy

**Approval gate:** Full concept review before dispatching Step 3.

---

### Step 3 — Visual Designer

**Skill:** `frameforge-visual-designer`

**Inputs:** `narrative-brief.md`, approved concept summary from Step 2

**Deliverables:**
- `frameforge/data/test-projects/amazon/concept-template.html`
- `frameforge/data/test-projects/amazon/concept-template.md`

**Approval gate:** User opens `concept-template.html` in browser and approves layout before dispatching Step 4.

---

### Step 4 — Color Advisor

**Skill:** `frameforge-color-advisor`

**Inputs:** `concept-template.md`, thumbnail sheets

**Deliverable:** `frameforge/data/test-projects/amazon/color-notes.md`

**Approval gate:** Review per-frame color decisions before dispatching Step 5.

---

### Step 5 — Technical Producer

**Skill:** `frameforge-technical-producer`

**Inputs:** `concept-template.md`, `color-notes.md`, thumbnail sheets

**Deliverables:**
- `frameforge/data/test-projects/amazon/the-amazon.json`
- `frameforge/data/test-projects/amazon/frame-image-mapping.md`

**Approval gate:** Spot-check JSON — confirm frame count, sequence, and copy matches approved template before dispatching Step 6.

---

### Step 6 — Stage Manager

**Skill:** `frameforge-stage-manager`

**Inputs:** `the-amazon.json`, `frame-image-mapping.md`

**Raw photos:** `frameforge/data/test-projects/amazon/images/` (Playwright only — never shared with AI)

**Deliverable:** FrameForge loaded via Playwright, JSON active, all images confirmed in tray

**Proceed to Step 7** once FrameForge is confirmed loaded.

---

### Step 7 — Art Orchestrator

**Skill:** `frameforge-art-orchestrator`

**Inputs:** FrameForge loaded, `concept-template.md`, `color-notes.md`, `frame-image-mapping.md`, `the-amazon.json`

**Deliverable:** Final approved screenshots for all frames, saved to `frameforge/data/test-projects/amazon/screenshots/`

**Final gate:** Present all approved screenshots, note any frames that iterated. Confirm before committing.

---

## File Layout (amazon project)

```
frameforge/data/test-projects/amazon/
├── input/                            ← thumbnail sheets + brief (AI inputs)
│   ├── the-amazon-thumbs-01.png
│   ├── the-amazon-thumbs-02.png
│   ├── the-amazon-thumbs-03.png
│   ├── the-amazon-thumbs-04.png
│   └── the-amazon-thumbs-05.png
├── images/                           ← raw photos (Playwright only)
├── narrative-brief.md                ← Step 1 output
├── concept-template.html             ← Step 3 output
├── concept-template.md               ← Step 3 output
├── color-notes.md                    ← Step 4 output
├── frame-image-mapping.md            ← Step 5 output
├── the-amazon.json                   ← Step 5 output
└── screenshots/                      ← Step 7 output
```

---

## Execution Mode Reference

| Mode | Steps | Playwright |
|---|---|---|
| Claude Code + Playwright MCP | All 7 | Steps 6–7 automated |

This design uses **Mode A** throughout.
