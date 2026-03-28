# Prompt 5-Step Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-step AI prompt in `_buildPrompt()` with a more rigorous 5-step prompt that enforces image curation, structured Q&A, concept approval, and single-pass JSON generation.

**Architecture:** Single method replacement in `ui/concept-builder.js`. The variable destructuring and `platformLabel` lookup are unchanged — only the template string returned by `_buildPrompt()` is replaced.

**Tech Stack:** Vanilla JavaScript (ES6 template literals), no build step.

---

### Task 1: Replace `_buildPrompt()` with the 5-step prompt

**Files:**
- Modify: `ui/concept-builder.js:711-764`

- [ ] **Step 1: Open `ui/concept-builder.js` and locate `_buildPrompt()` (line 711)**

The method currently spans lines 711–764. The first two lines (variable destructuring and platformLabel) stay unchanged. Only the `return` template string (lines 715–763) is replaced.

- [ ] **Step 2: Replace the return template string**

Replace everything from `return \`` on line 715 through the closing `` `; `` on line 763 with the following:

```javascript
  _buildPrompt() {
    const { title, slug, w, h, story, notes, toneLine, imageCount } = this._readFields();
    const platformLabel = PLATFORMS.find((p) => p.value === this._platform)?.label ?? this._platform;

    return `I'm working on a photography project and need you to design FrameForge layouts for it.
I'm attaching:

- The FrameForge brief file (full technical instructions for generating the JSON)
- Sample design mockups (layout references — study element sizes and zones)
- Thumbnail sheets showing all ${imageCount} image${imageCount !== 1 ? 's' : ''}

---

**Step 1 — Read and confirm.**
Read the brief and study every thumbnail carefully. Confirm you've done this before proceeding. Do not generate anything yet.

---

**Step 2 — Curation.**
Do not use all images by default. Propose a selection of the strongest frames that together tell a coherent story. For each image you drop, say why. For each you keep, say what role it plays in the narrative. Present this as a numbered list with a proposed sequence. Wait for my approval before continuing.

---

**Step 3 — Ask before assuming.**
Before proposing any concept, ask clarifying questions covering:

- What is the narrative arc? (beginning, middle, end — or another structure)
- What are the key locations, people, or moments and in what order did they happen?
- Who is the audience — personal followers, strangers, or both?
- What is the one thing a stranger should take away from this series?
- What tone? (stats and facts / narrative / minimal / let AI decide)

Ask as questions flow naturally. Do not invent any detail — geographic, narrative, or otherwise — that hasn't been explicitly confirmed.

---

**Step 4 — Concept proposal.**
Present the following for review. Do not generate JSON yet.

- **Color palette:** 2–3 hex colors, names, and roles — derived from the mood and palette of the images themselves
- **Font pairing:** display + sans-serif, and why it fits this specific story
- **Text strategy:** one clear rule for when text appears and when it doesn't — based on the stated tone and audience
- **Per-frame plan:** for each selected image:
  - One line on subject position and negative space
  - One line on proposed text zone, gradient direction, and layer count
  - Exact text content for every text layer — or explicitly "no text"

**Text content rules — always apply:**
- Never describe what is already visible in the image
- Never use poetic language, metaphors, or sentimental phrasing unless explicitly requested
- Facts and stats must come from confirmed sources or information I provide — never invented
- If a fact cannot be verified, ask rather than guess
- Never stack more than two text layers on a single frame unless it is explicitly a milestone or information frame
- The opening frame must be the strongest visual in the series — not necessarily the chronological start

Wait for my approval on the full concept before continuing.

---

**Step 5 — Generate.**
Once the concept is approved, generate the complete FrameForge JSON in one clean pass following the brief exactly. No partial outputs, no placeholder text, no assumed facts.

---

**Project details**

Title: ${title || '(untitled)'}
Project ID: ${slug}
Platform: ${platformLabel} · ${w}×${h}px
Story: ${story || '(no story provided — use the images and title as your guide)'}
Tone: ${toneLine}
Images: ${imageCount} image${imageCount !== 1 ? 's' : ''} — see attached thumbnail sheets${notes ? `\nAdditional notes: ${notes}` : ''}
`;
  }
```

- [ ] **Step 3: Verify the file saves without syntax errors**

Open the app in a browser (`index.html`). Open DevTools console. If there are no JS errors on load, the syntax is valid.

- [ ] **Step 4: Smoke-test the prompt output**

1. Click "New Project" in the toolbar to open the ConceptBuilder wizard
2. Fill in a title, story, and notes in Step 1
3. Select a tone in Step 2
4. Add at least 2 images in Step 3
5. Proceed to Step 4 (Export) and then Step 5 (Copy Prompt)
6. Click "Copy prompt" and paste into a text editor
7. Verify:
   - All 5 steps appear with correct headings
   - `Title`, `Project ID`, `Platform`, `Story`, `Tone`, `Images` are filled with real values
   - `Additional notes:` line appears only if notes were entered
   - No "Design principles" block at the end
   - No placeholder text like `[your title]` or `[slug]`

- [ ] **Step 5: Commit**

```bash
git add ui/concept-builder.js
git commit -m "feat: replace 3-step prompt with 5-step curation and concept-approval workflow"
```
