---
title: README as Master Orchestrator — Agent-Driven Workflow Design
date: 2026-03-30
status: approved
---

# README as Master Orchestrator — Agent-Driven Workflow Design

## Problem

The `test-projects/README.md` is currently a monolithic protocol addressed to a generic "AI." All steps — reading, curating, writing briefs, generating HTML, building JSON, loading Playwright — are handled by one undifferentiated agent following sequential prose instructions. This works but produces inconsistent quality: no specialization, no clear deliverable boundaries, no separation of creative from technical concerns.

Step 8 (art orchestration) already proves the better model: a named orchestrator dispatches named specialists, each with a defined input set, a defined deliverable, and an internal approval loop before handing off.

The goal is to bring that same model to Steps 1–7.

---

## Constraints

1. **The README remains a single file.** No separate orchestrator document.
2. **The README must work for browser-based AI models** that have no access to `.claude/skills/`. Each step must include inline instructions they can follow without dispatching a skill.
3. **Approval gates are owned by the README (orchestrator).** Individual skills execute and return — they do not wait for the human themselves.
4. **Existing skills are not rewritten.** `frameforge-color-advisor` and `frameforge-art-orchestrator` + `frameforge-art-director` + `frameforge-copy-reviewer` are already production-quality. The new design integrates them, not replaces them.

---

## Approach

The README becomes a **master orchestrator**. Each step is reframed around a named professional role with declared inputs, a required deliverable, and an explicit approval gate. Claude Code dispatches a SKILL.md for each role; browser-based models follow a condensed inline callout in the same section.

### Per-step anatomy

```
## Step N — [Agent Name]
> One-line role description

**Inputs:** list of what this agent receives
**Deliverable:** exact file(s) or decision this agent must produce before the next step

### Claude Code
Dispatch table: skill name + placeholder → value mapping

### Other AI models
> Condensed inline instructions covering the same logic
```

### Mode detection

A single block at the top of the README sets execution mode for the entire run:

```
**Execution mode — set this once:**
- Claude Code + Playwright MCP: follow all steps, dispatch skills as specified
- Claude Code without Playwright: dispatch skills, skip Stage Manager (Step 7 Playwright section)
- Other AI model: follow the "Other AI models" callout in each step
```

---

## Agent Roster

| Step | Agent | Skill file | Receives | Delivers |
|------|-------|------------|----------|----------|
| 1 | **Concept Strategist** | `frameforge-concept-strategist` | Image sheet + user answers | Approved frame list + narrative brief |
| 2 | **Creative Director** | `frameforge-creative-director` | Narrative brief + image sheet | Approved concept doc (palette, type, per-frame briefs, copy-reviewed) |
| 3 | **Visual Designer** | `frameforge-visual-designer` | Approved concept doc | `concept-template.html` + `concept-template.md` |
| 4 | **Color Advisor** | `frameforge-color-advisor` *(exists)* | `concept-template.md` + thumbnail sheets | `color-notes.md` |
| 5 | **Technical Producer** | `frameforge-technical-producer` | `concept-template.md` + `color-notes.md` + image sheet | `project.json` + `frame-image-mapping.md` |
| 6 | **Stage Manager** | `frameforge-stage-manager` | `project.json` + `frame-image-mapping.md` | FrameForge loaded + ready signal |
| 7 | **Art Orchestrator** | `frameforge-art-orchestrator` *(exists)* | Ready signal + all above files | Final approved frames |

---

## Handoff Contracts

### Concept Strategist → Creative Director
- Passes: approved frame list (numbered, with narrative role per frame), answers to all clarifying questions, confirmed facts
- Creative Director must not invent any detail not present in this handoff

### Creative Director → Visual Designer
- Passes: full approved concept document — palette (hex + role), type system, per-frame briefs with reviewed copy
- Visual Designer reads concept doc only; does not re-read image sheet

### Visual Designer → Color Advisor
- Passes: `concept-template.md` path + thumbnail sheet path
- Color Advisor reads thumbnails to validate palette legibility per frame; writes `color-notes.md`

### Color Advisor → Technical Producer
- Passes: `concept-template.md` + `color-notes.md`
- Technical Producer generates JSON using color-notes as per-frame color truth

### Technical Producer → Stage Manager
- Passes: `project.json` + `frame-image-mapping.md` (complete — no blank rows)
- Stage Manager verifies mapping is complete before any Playwright action

### Stage Manager → Art Orchestrator
- Passes: ready signal — confirmed by Playwright snapshot showing FrameForge loaded, JSON active, all images present in the tray
- Art Orchestrator takes first screenshot and begins per-frame loop

---

## Approval Gates

| After | Gate type | Owner |
|-------|-----------|-------|
| Concept Strategist | Frame selection + narrative | README orchestrator |
| Creative Director | Full concept (palette, type, briefs, copy) | README orchestrator |
| Visual Designer | HTML template + .md reference | README orchestrator |
| Color Advisor | Color notes review | README orchestrator (lighter — user may approve quickly) |
| Technical Producer | JSON spot-check | README orchestrator |
| Each frame in Art Orchestrator | Per-frame screenshot | Art Orchestrator skill (already handles this) |

Agents 4–6 (Color Advisor, Technical Producer, Stage Manager) are non-creative execution agents. They still present output and wait, but the cycle is expected to be short — one round unless errors are found.

---

## New Skills to Create

Five new SKILL.md files, following the same structure as the existing art-director skill:

1. `frameforge-concept-strategist/SKILL.md`
2. `frameforge-creative-director/SKILL.md`
3. `frameforge-visual-designer/SKILL.md`
4. `frameforge-technical-producer/SKILL.md`
5. `frameforge-stage-manager/SKILL.md`

Each skill file contains:
- Frontmatter: `name`, `description`
- Role statement (who you are, what you are doing)
- Inputs section with paths as placeholders
- Step-by-step execution instructions (ported from current README prose, deepened)
- Internal approval loop instructions
- Return protocol: what to send back to the orchestrator

---

## README Changes

The existing README is restructured — not rewritten from scratch. Content from the current steps is redistributed into the new agent sections. Nothing is lost; the per-frame brief rules, the copy review criteria, the JSON generation rules — all move into the appropriate skill file and are summarized in the inline callout for other AI models.

The "Reference: Tatacoa Textures" section at the bottom is preserved as-is.

---

## Files Affected

| File | Change |
|------|--------|
| `test-projects/README.md` | Full restructure to orchestrator format |
| `.claude/skills/frameforge-concept-strategist/SKILL.md` | New |
| `.claude/skills/frameforge-creative-director/SKILL.md` | New |
| `.claude/skills/frameforge-visual-designer/SKILL.md` | New |
| `.claude/skills/frameforge-technical-producer/SKILL.md` | New |
| `.claude/skills/frameforge-stage-manager/SKILL.md` | New |
| `.claude/skills/frameforge-color-advisor/SKILL.md` | No change |
| `.claude/skills/frameforge-art-orchestrator/SKILL.md` | No change |
| `.claude/skills/frameforge-art-director/SKILL.md` | No change |
| `.claude/skills/frameforge-copy-reviewer/SKILL.md` | No change |
