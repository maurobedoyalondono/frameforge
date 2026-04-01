# FlightDeck

You have **FlightDeck** — a complete software development workflow built on composable skills and specialized agents.

## How to Start

Select the **FlightDeck** agent from the Copilot agent picker (or type `@FlightDeck` in chat) and describe what you want to build. It will automatically kick off the full workflow: brainstorming → planning → subagent-driven implementation → review → branch completion.

The FlightDeck agent is defined in `.github/agents/flightdeck.agent.md`.

## What FlightDeck Does

Before writing code, you use **brainstorming** to design what you're building. After design approval, **writing-plans** creates a bite-sized implementation plan. You execute plans using **subagent-driven-development** (dispatching fresh specialized agents per task) or **executing-plans** (inline with checkpoints). You enforce TDD, verify before claiming complete, and finish branches cleanly.

**The agent checks for relevant skills before any task. These are mandatory workflows, not suggestions.**

## How Skills Auto-Trigger

Skills live in `.github/skills/<name>/SKILL.md`. When you encounter a task, check which skills apply based on their `description` field. When a skill applies, **read the SKILL.md file immediately** before taking any action.

## Skill Inventory

| Skill | Trigger |
|-------|---------|
| `brainstorming` | Before any feature, component, or behavior change |
| `writing-plans` | After design approved, before touching code |
| `subagent-driven-development` | When executing plans in the current session |
| `executing-plans` | When executing plans in a separate/parallel session |
| `test-driven-development` | Before writing any implementation code |
| `systematic-debugging` | Before proposing any fix for a bug |
| `requesting-code-review` | After completing tasks or features |
| `receiving-code-review` | When receiving review feedback |
| `using-git-worktrees` | Before starting feature work or executing plans |
| `finishing-a-development-branch` | When implementation is complete |
| `verification-before-completion` | Before claiming work is done |
| `dispatching-parallel-agents` | When facing 2+ independent problems |
| `writing-skills` | When creating new skills |
| `using-flightdeck` | When introducing the system to someone new |

## Specialized Agents

| Agent | Purpose |
|-------|---------|
| `implementer` | Implements a single task following TDD |
| `spec-reviewer` | Reviews whether code matches the spec |
| `code-quality-reviewer` | Reviews code quality and best practices |

## Core Workflow

```
User request
    ↓
[brainstorming] — design gate (REQUIRED before all code)
    ↓ writes: docs/flightdeck/specs/YYYY-MM-DD-<topic>-design.md
[writing-plans] — plan creation
    ↓ writes: docs/flightdeck/plans/YYYY-MM-DD-<feature>.md
    ↓
    ├── [subagent-driven-development] ← RECOMMENDED
    │       Per task: implementer → spec-reviewer → code-quality-reviewer
    │
    └── [executing-plans] ← Alternative (inline with checkpoints)
    ↓
[finishing-a-development-branch]
```

## Iron Laws

1. **No code before design** — brainstorming gates everything
2. **No implementation before plan** — writing-plans gates all code
3. **TDD always** — failing test before implementation code
4. **Verify before claiming** — run the command, read the output, then claim
5. **Fresh context per subagent** — never pass session history to subagents

## Copilot-Specific Notes

- Use `runSubagent` to dispatch specialized agents (`implementer`, `spec-reviewer`, `code-quality-reviewer`)
- Use `manage_todo_list` to track task progress
- Skill cross-references use format: **`REQUIRED SUB-SKILL: Use flightdeck:<skill-name>`**
- Read skill files via `read_file` on `.github/skills/<name>/SKILL.md`
