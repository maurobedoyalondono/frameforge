---
name: using-flightdeck
description: "Use when introducing FlightDeck to someone new, or when asked how the workflow system works"
---

# Using FlightDeck

FlightDeck is a complete software development workflow for GitHub Copilot, built on composable skills and specialized subagents.

## The Basic Workflow

1. **brainstorming** — Activates before writing code. Refines rough ideas through questions, explores alternatives, presents design in sections for validation. Saves design document.

2. **using-git-worktrees** — Activates after design approval. Creates isolated workspace on new branch, runs project setup, verifies clean test baseline.

3. **writing-plans** — Activates with approved design. Breaks work into bite-sized tasks (2-5 minutes each). Every task has exact file paths, complete code, and verification steps.

4. **subagent-driven-development** or **executing-plans** — Activates with plan. Dispatches fresh subagent per task with two-stage review (spec compliance, then code quality), or executes inline with checkpoints.

5. **test-driven-development** — Activates during implementation. Enforces RED-GREEN-REFACTOR: write failing test, watch it fail, write minimal code, watch it pass, commit.

6. **requesting-code-review** — Activates between tasks. Reviews against plan, reports issues by severity. Critical issues block progress.

7. **finishing-a-development-branch** — Activates when tasks complete. Verifies tests, presents options (merge/PR/keep/discard), cleans up worktree.

**The agent checks for relevant skills before any task. Mandatory workflows, not suggestions.**

## Iron Laws

1. **No code before design** — brainstorming gates everything
2. **No implementation before plan** — writing-plans gates all code
3. **TDD always** — failing test before implementation code
4. **Verify before claiming** — run the command, read the output, then claim
5. **Fresh context per subagent** — never pass session history to subagents

## Skill Summary

### Planning & Design
- `brainstorming` — Socratic design refinement
- `writing-plans` — Detailed implementation plans

### Execution
- `subagent-driven-development` — Fast iteration with two-stage review (recommended)
- `executing-plans` — Inline execution with checkpoints
- `dispatching-parallel-agents` — Concurrent subagent workflows

### Quality
- `test-driven-development` — RED-GREEN-REFACTOR cycle
- `systematic-debugging` — 4-phase root cause process
- `verification-before-completion` — Ensure it's actually done

### Collaboration
- `requesting-code-review` — Pre-review checklist
- `receiving-code-review` — Responding to feedback

### Git
- `using-git-worktrees` — Parallel development branches
- `finishing-a-development-branch` — Merge/PR decision workflow

### Meta
- `writing-skills` — Create new skills
- `using-flightdeck` — This document

## Specialized Agents

FlightDeck uses three specialized agents dispatched via `runSubagent`:

| Agent | Role |
|-------|------|
| `implementer` | Implements one task with TDD, self-reviews, commits |
| `spec-reviewer` | Verifies code matches the spec — catches over/under-building |
| `code-quality-reviewer` | Reviews code quality, patterns, and best practices |

## Philosophy

- **Test-Driven Development** — Write tests first, always
- **Systematic over ad-hoc** — Process over guessing
- **Complexity reduction** — Simplicity as primary goal
- **Evidence over claims** — Verify before declaring success
