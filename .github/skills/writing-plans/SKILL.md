---
name: writing-plans
description: "Use when you have a spec or requirements for a multi-step task, before touching code"
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Save plans to:** `docs/flightdeck/plans/YYYY-MM-DD-<feature-name>.md`

## Scope Check

If the spec covers multiple independent subsystems, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for:

- Each file should have one clear responsibility
- Files that change together should live together
- Split by responsibility, not by technical layer
- In existing codebases, follow established patterns

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" — step
- "Run it to make sure it fails" — step
- "Implement the minimal code to make the test pass" — step
- "Run the tests and make sure they pass" — step
- "Commit" — step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use flightdeck:subagent-driven-development (recommended) or flightdeck:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.js`
- Modify: `exact/path/to/existing.js`
- Test: `tests/exact/path/to/test.js`

- [ ] **Step 1: Write the failing test**

```javascript
test('specific behavior', () => {
  const result = function(input);
  expect(result).toBe(expected);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/path/test.js`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
function function(input) {
  return expected;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/path/test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.js src/path/file.js
git commit -m "feat: add specific feature"
```
````

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may read tasks out of order)
- Steps that describe what to do without showing how (code blocks required)

## Self-Review

After writing the complete plan, check it against the spec:

1. **Spec coverage:** Can you point to a task that implements every requirement?
2. **Placeholder scan:** Any "TBD", "TODO", vague steps?
3. **Type consistency:** Do method names match across tasks?

Fix issues inline. No need to re-review — just fix and move on.

## Execution Handoff

After saving the plan, offer execution choice:

> "Plan complete and saved to `docs/flightdeck/plans/<filename>.md`. Two execution options:
>
> **1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration
>
> **2. Inline Execution** — execute tasks in this session with checkpoints
>
> Which approach?"

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use flightdeck:subagent-driven-development

**If Inline Execution chosen:**
- **REQUIRED SUB-SKILL:** Use flightdeck:executing-plans
