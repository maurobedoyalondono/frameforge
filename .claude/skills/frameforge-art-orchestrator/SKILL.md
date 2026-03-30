---
name: frameforge-art-orchestrator
description: Use when executing Step 8 of the FrameForge workflow — runs the per-frame art direction loop, dispatches frameforge-art-director and frameforge-copy-reviewer per frame, manages the human approval gate
---

# FrameForge Art Orchestrator

You are running Step 8 of the FrameForge workflow. Your job is to coordinate the art direction loop: one frame at a time, dispatch the art director, route copy for review, and present the result to the human before moving on.

---

## Pre-flight

Before dispatching the first frame, confirm you have all of these:

| Value | Where to find it |
|---|---|
| Project JSON path | `frameforge/data/test-projects/[project]/[project].json` |
| Concept template path | `frameforge/data/test-projects/[project]/concept-template.md` (preferred) or `.html` fallback |
| Color notes path | `frameforge/data/test-projects/[project]/color-notes.md` |
| Frame image mapping path | `frameforge/data/test-projects/[project]/frame-image-mapping.md` |
| Screenshots folder | `frameforge/data/test-projects/[project]/screenshots/` |
| Agent-preview base URL | `http://127.0.0.1:5500/frameforge/agent-preview.html` |
| Frame list | All frame IDs in sequence, from the project JSON |

Do not dispatch the first frame until every value is confirmed.

---

## Per-frame loop

Complete the full cycle for one frame before moving to the next.

### 1 — Dispatch Art Director

Read `.claude/skills/frameforge-art-director/SKILL.md`. Fill these placeholders, then dispatch the art director as a subagent with the full skill content as its prompt:

| Placeholder | Value |
|---|---|
| `[FRAME_LABEL]` | Human-readable label (e.g. "Frame 1 — wide-canyon-overview") |
| `[FRAME_ID]` | Frame ID from JSON (e.g. "frame-01") |
| `[VERSION_NUMBER]` | Version number for this frame. Start at 1. Increment only when the human requests changes after the approval gate (Step 5) — not during copy review rounds. |
| `[CONCEPT_TEMPLATE_MD_PATH]` | Full path to `concept-template.md` |
| `[CONCEPT_TEMPLATE_PATH]` | Full path to `concept-template.html` (fallback) |
| `[COLOR_NOTES_PATH]` | Full path to `color-notes.md` |
| `[FRAME_IMAGE_MAPPING_PATH]` | Full path to `frame-image-mapping.md` |
| `[PROJECT_JSON_PATH]` | Full path to project JSON |
| `[PROJECT_JSON_URL]` | Relative URL for agent-preview (e.g. `data/test-projects/[project]/[project].json`) |
| `[SCREENSHOTS_PATH]` | Full path to `screenshots/` folder with trailing slash |

### 2 — Receive Copy Proposed

The art director returns with `STATUS: AWAITING COPY REVIEW` and a `COPY PROPOSED` block listing every text string, labeled by layer role.

### 3 — Dispatch Copy Reviewer

Read `.claude/skills/frameforge-copy-reviewer/SKILL.md`. Fill these placeholders, then dispatch the copy reviewer as a subagent:

| Placeholder | Value |
|---|---|
| `[FRAME_ID]` | Frame ID |
| `[FRAME_LABEL]` | Frame label |
| `[CONCEPT_TEMPLATE_MD_PATH]` | Full path to `concept-template.md` |
| `[CONCEPT_TEMPLATE_PATH]` | Full path to `concept-template.html` (fallback) |
| `[STRINGS_BLOCK]` | Every string from the art director's `COPY PROPOSED`, labeled by role, pasted verbatim |

### 4 — Handle copy review result

**If `STATUS: REVISION REQUIRED`:**
- Return the corrections to the art director
- Art director resubmits a revised `COPY PROPOSED`
- Dispatch copy reviewer again with the revised block
- Repeat until `STATUS: COPY APPROVED`

**If `STATUS: COPY APPROVED`:**

Dispatch the art director skill a second time — the **write phase**. Provide:
- All placeholders from the initial dispatch (same values)
- The full approved copy block from the copy reviewer's response
- This instruction: "The copy review is complete. Write the approved copy to the JSON at `[PROJECT_JSON_PATH]`, re-navigate to the agent-preview URL, wait for ready, take the final canvas screenshot, and save it to `[SCREENSHOTS_PATH][FRAME_ID]-v[VERSION_NUMBER].jpg`. Return the screenshot path."

Tell the art director: canvas element only — use `browser_snapshot` to get the canvas ref, then `browser_take_screenshot` with `element: "canvas"`, `type: "jpeg"`.

### 5 — Human approval gate

Present the screenshot to the human. **Full stop.** Do not dispatch the next frame until the human explicitly approves.

If the human requests changes: increment the version number and return to step 1 for this frame.

---

## Rules

**One frame at a time.** Never pre-screenshot all frames. Never batch art direction. Each frame gets its full creative and editorial cycle before the next begins.

---

## localStorage quota

FrameForge persists images in localStorage (~5 MB). Large JPEGs exceed this after 2–3 images. Re-inject all images before navigating to each frame. Combine injection + navigation + render wait in one `browser_evaluate`:

```javascript
async () => {
  const images = [ /* [label, path] pairs from frame-image-mapping.md */ ];
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
  document.querySelector('[role="listbox"]').children[N].click(); // N = 0-indexed frame position
  await new Promise(r => setTimeout(r, 800));
  return 'ready';
}
```

Reloading JSON always clears images — re-inject immediately after any JSON reload.
