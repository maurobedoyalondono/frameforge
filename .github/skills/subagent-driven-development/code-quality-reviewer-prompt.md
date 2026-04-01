# Code Quality Reviewer Subagent Prompt Template

Use this template when dispatching the `code-quality-reviewer` agent via `runSubagent`.

Dispatch this **only after** the spec reviewer returns `STATUS: COMPLIANT`.

---

## How to Dispatch

```javascript
runSubagent({
  agentName: "code-quality-reviewer",
  description: "Code quality review: [task name]",
  prompt: <filled template below>
})
```

---

## Prompt Template

Paste and fill every `[PLACEHOLDER]` before dispatching.

```
## Your Job

You are reviewing code quality for task [TASK_NAME] in the [PROJECT_NAME] project.

Spec compliance has already been confirmed. Your job is to evaluate quality,
clarity, correctness, and security — NOT whether requirements are met.

---

## What Was Implemented

**Task summary:** [One sentence describing what this task built]

**Commits:** [BASE_SHA]..[HEAD_SHA]

**Files changed:**
[List files that were modified/created]

---

## Codebase Context

**Tech stack:** [Languages, frameworks, testing library]

**Existing patterns:** [Brief note on code style, naming conventions, test patterns from the project]

---

## Code to Review

[Paste the content of the changed files, or instruct the reviewer to read them:
"Read the following files: [list paths]"]

---

## Project Test Command

Run tests with: [npm test / pytest / cargo test / etc.]

---

## Instructions

1. Read the changed files carefully
2. Run the tests to confirm they pass
3. Check for: correctness (edge cases), test quality, code clarity, security (OWASP), codebase consistency
4. Rate each issue as: Critical / Important / Minor / Suggestion
5. End your response with STATUS: APPROVED or STATUS: NEEDS FIXES
```

---

## Notes for the Orchestrator

- If `STATUS: NEEDS FIXES` with Critical or Important issues:
  - Dispatch the implementer with the issues list
  - Dispatch the code quality reviewer again after fixes
  - Repeat until `STATUS: APPROVED`
- Minor issues and Suggestions do NOT block proceeding
- When all tasks are complete, dispatch one final code quality review across all commits on the branch
