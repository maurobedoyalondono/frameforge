# Spec Reviewer Subagent Prompt Template

Use this template when dispatching the `spec-reviewer` agent via `runSubagent`.

Dispatch this **after** the implementer returns `STATUS: DONE` or `STATUS: DONE_WITH_CONCERNS`.

---

## How to Dispatch

```javascript
runSubagent({
  agentName: "spec-reviewer",
  description: "Spec review: [task name]",
  prompt: <filled template below>
})
```

---

## Prompt Template

Paste and fill every `[PLACEHOLDER]` before dispatching.

```
## Your Job

You are reviewing spec compliance for task [TASK_NAME] in the [PROJECT_NAME] project.

Verify that what was built matches EXACTLY what was required. No more, no less.

---

## Task Requirements

[PASTE THE FULL TASK TEXT FROM THE PLAN — include every requirement, file list, expected behavior, and any explicit "do NOT add" instructions]

---

## What Was Implemented

The implementer committed these changes:

**Files changed:**
[List files that were modified/created]

**Implementer's summary:**
[Paste the implementer's STATUS: DONE message including their "Changes:" line]

---

## Relevant Code

[Paste the content of the changed files, or instruct the reviewer to read them:
"Read the following files: [list paths]"]

---

## Instructions

1. Extract every requirement from the task text
2. Check each requirement against the implementation
3. Flag anything missing (in spec, not in code)
4. Flag anything extra (in code, not in spec — YAGNI violations)
5. End your response with STATUS: COMPLIANT or STATUS: ISSUES FOUND
```

---

## Notes for the Orchestrator

- If `STATUS: ISSUES FOUND`, dispatch the implementer again with:
  - The original task text
  - The spec reviewer's issues list
  - Instruction: "Fix these spec compliance issues: [issues]"
- Do NOT proceed to code quality review until spec review returns `STATUS: COMPLIANT`
- Do NOT skip this step even if the implementer self-reviewed
