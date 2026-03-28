# FrameForge Prompt 5-Step Redesign

**Date:** 2026-03-27
**Status:** Approved

## Goal

Replace the current 3-step AI prompt in `_buildPrompt()` with a more rigorous 5-step workflow that enforces curation, structured Q&A, concept approval, and a clean single-pass generation.

## Scope

Single method change: `_buildPrompt()` in `ui/concept-builder.js`. No other files are affected.

## Current State

The prompt has 3 steps:
1. **Review** — read the brief and thumbnail sheets
2. **Propose a concept** — color palette, font pairing, per-image layout intent
3. **Generate** — produce complete JSON once concept is agreed

Weaknesses:
- No curation step — AI uses all images by default
- No structured Q&A before concept proposal — AI may invent narrative details
- No text content rules — AI may write poetic/descriptive copy
- No explicit "opening frame" rule
- "Design principles" block is redundant with the brief

## New Prompt Structure

### Step 1 — Read and confirm
Instruct the AI to read the brief and study every thumbnail. Confirm before proceeding. Do not generate anything.

### Step 2 — Curation
AI proposes a selection of the strongest frames that tell a coherent story. For each dropped image: explain why. For each kept image: explain its narrative role. Present as a numbered list with proposed sequence. Wait for user approval.

### Step 3 — Ask before assuming
Before proposing any concept, AI asks clarifying questions covering:
- Narrative arc
- Key locations, people, or moments and their order
- Who is the audience
- What a stranger should take away
- Tone preference

Questions flow naturally across messages (not required all at once). AI must not invent any detail not explicitly confirmed.

### Step 4 — Concept proposal
AI presents for review (no JSON yet):
- Color palette: 2–3 hex colors, names, roles — derived from the images
- Font pairing: display + sans-serif with rationale
- Text strategy: one clear rule for when text appears/doesn't
- Per-frame plan: subject position, text zone, gradient direction, layer count, exact text content per layer

Text content rules (enforced in this step):
- Never describe what is visible in the image
- No poetic language or sentimental phrasing unless requested
- Facts must come from confirmed sources — never invented
- Max 2 text layers per frame unless it is a milestone/information frame
- Opening frame must be the strongest visual, not necessarily chronological first

Wait for approval before continuing.

### Step 5 — Generate
Complete FrameForge JSON in one clean pass. No partial outputs, no placeholder text, no assumed facts.

## Project Details Block (dynamic fields)

```
Title: ${title || '(untitled)'}
Project ID: ${slug}
Platform: ${platformLabel} · ${w}×${h}px
Story: ${story || '(no story provided)'}
Tone: ${toneLine}
Images: ${imageCount} image(s) — see attached thumbnail sheets
Additional notes: ${notes}   ← omitted if empty
```

**Omitted:** Audience field — the AI asks for this in Step 3.

## What is Removed

- The current 3-step prompt text
- The "Design principles" block (covered by Step 4 instructions and the brief)

## Implementation

Edit `_buildPrompt()` in `ui/concept-builder.js` (lines 711–764). Replace the template string with the new 5-step version. All existing variable destructuring (`title`, `slug`, `w`, `h`, `story`, `notes`, `toneLine`, `imageCount`, `platformLabel`) is unchanged.
