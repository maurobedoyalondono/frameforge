---
name: subagent-driven-development
description: "Use when executing implementation plans with independent tasks in the current session"
---

# Subagent-Driven Development

Execute plan by dispatching fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.

**Why subagents:** You delegate tasks to specialized agents with isolated context. By precisely crafting their instructions and context, you ensure they stay focused and succeed. They should never inherit your session's context or history — you construct exactly what they need.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration.

**REQUIRED PRE-SKILL:** Use flightdeck:using-git-worktrees before starting.

## When to Use

- Have implementation plan? Yes → tasks mostly independent? Yes → stay in this session? Yes → use this skill
- If tasks are tightly coupled → use flightdeck:executing-plans
- If parallel session preferred → use flightdeck:executing-plans
- No plan → use flightdeck:brainstorming first

## The Process

### Setup

1. Read plan file once; extract ALL tasks with full text and context
2. Note overall project context, architecture, file structure
3. Create todo list with `manage_todo_list` covering all tasks

### Per-Task Loop

For each task:

1. **Mark in-progress** in todo list
2. **Get task text** (already extracted — do NOT re-read the plan file)
3. **Dispatch implementer subagent** using `runSubagent` with agent `implementer`
   - Provide: full task text, relevant file contents, architecture context, plan goal
   - Do NOT pass session history
4. **Handle implementer status:**
   - `DONE` → proceed to spec review
   - `DONE_WITH_CONCERNS` → read concerns, address if correctness issue, then proceed
   - `NEEDS_CONTEXT` → provide missing context, re-dispatch
   - `BLOCKED` → assess: context problem → more context; too complex → break down; plan wrong → escalate to user
5. **Dispatch spec-reviewer subagent** using `runSubagent` with agent `spec-reviewer`
   - Provide: task requirements, git diff or changed files, what was implemented
6. **If spec reviewer finds issues:**
   - Dispatch implementer to fix (same context + issues list)
   - Dispatch spec reviewer again
   - Repeat until `✅ Spec compliant`
7. **Dispatch code-quality-reviewer subagent** using `runSubagent` with agent `code-quality-reviewer`
   - Provide: git diff, changed files, codebase patterns
8. **If code reviewer finds issues:**
   - Dispatch implementer to fix
   - Dispatch code reviewer again
   - Repeat until `✅ Approved`
9. **Mark task complete** in todo list
10. Move to next task

### After All Tasks

- Dispatch final code-quality-reviewer for entire implementation (all commits since branch start)
- **REQUIRED SUB-SKILL:** Use flightdeck:finishing-a-development-branch

## Model Selection

Use the least powerful model that can handle each role:

- **Mechanical tasks** (isolated functions, clear spec, 1-2 files): fast model
- **Integration tasks** (multi-file, pattern matching): standard model
- **Architecture and review**: most capable model

## Prompt Templates

See prompt templates for dispatching each subagent:

- `./implementer-prompt.md` — Dispatch implementer subagent
- `./spec-reviewer-prompt.md` — Dispatch spec compliance reviewer
- `./code-quality-reviewer-prompt.md` — Dispatch code quality reviewer

## Red Flags

**Never:**
- Start on main/master without explicit user consent
- Skip spec compliance review
- Skip code quality review
- Dispatch multiple implementers in parallel (conflicts)
- Make subagent re-read the plan file (provide full text instead)
- Ignore subagent questions — answer before proceeding
- Accept "close enough" spec compliance
- Start code quality review before spec compliance is ✅

## Integration

- **REQUIRED PRE-SKILL:** flightdeck:using-git-worktrees — isolated workspace
- **REQUIRED POST-SKILL:** flightdeck:finishing-a-development-branch — complete work
- **Subagents use:** flightdeck:test-driven-development
- **Reviews use:** flightdeck:requesting-code-review
