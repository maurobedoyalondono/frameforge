---
name: requesting-code-review
description: "Use when completing tasks, implementing major features, or before merging to verify work meets requirements"
---

# Requesting Code Review

Dispatch code-reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or the task start commit
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code-quality-reviewer subagent** using `runSubagent` with agent `code-quality-reviewer`

Provide these values in the prompt:
- `WHAT_WAS_IMPLEMENTED` — what you just built
- `PLAN_OR_REQUIREMENTS` — what it should do (task text from plan)
- `BASE_SHA` — starting commit
- `HEAD_SHA` — ending commit
- `DESCRIPTION` — brief summary

See template: `./code-reviewer-prompt.md`

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with technical reasoning)

## Integration with Workflows

**Subagent-Driven Development:**
- Review after EACH task (spec compliance first, then code quality)
- Catch issues before they compound
- Fix before moving to next task

**Executing Plans:**
- Review after completing a batch of tasks
- Apply feedback, then continue

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback without reasoning

**If reviewer is wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

## Integration

- **CALLED BY:** flightdeck:subagent-driven-development — after each task
- **USES:** code-quality-reviewer agent — dispatched as subagent
