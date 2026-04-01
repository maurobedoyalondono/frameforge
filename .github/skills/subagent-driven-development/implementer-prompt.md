# Implementer Subagent Prompt Template

Use this template when dispatching the `implementer` agent via `runSubagent`.

Provide ALL of these values — do NOT leave any placeholder unfilled.

---

## How to Dispatch

```javascript
runSubagent({
  agentName: "implementer",
  description: "Implement [task name]",
  prompt: <filled template below>
})
```

---

## Prompt Template

Paste and fill every `[PLACEHOLDER]` before dispatching.

```
## Context

You are implementing one task from the [PROJECT_NAME] project.

**Project goal:** [One sentence describing the overall feature being built]

**Architecture:** [2-3 sentences about the overall approach and how this task fits in]

**Branch:** [feature branch name]

**Files changed so far:** [list files committed in earlier tasks, or "none — this is the first task"]

---

## Your Task: [TASK_NAME]

[PASTE THE FULL TASK TEXT FROM THE PLAN — including all steps, code blocks, file paths, test code, and commit instructions. Do NOT summarize. Do NOT omit any step.]

---

## Relevant Existing Code

[Paste the content of any files this task needs to read or modify — or describe them if they don't exist yet]

---

## Project Test Command

Run tests with: [npm test / pytest / cargo test / etc.]

---

## Instructions

1. Read the task text above completely before writing any code
2. If anything is unclear, ask before writing any code
3. Follow TDD strictly: write failing test → confirm it fails → write minimal code → confirm it passes
4. Only modify the files listed in the task
5. Commit when all tests pass
6. End your response with a STATUS line (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED)
```

---

## Notes for the Orchestrator

- Do NOT include your session history in this prompt
- Do NOT include other tasks from the plan
- DO include the full task text (never summarize it)
- DO include relevant file contents the implementer needs to read
- If the implementer asks a question with `STATUS: NEEDS_CONTEXT`, answer it and re-dispatch with the same template + the new context appended
