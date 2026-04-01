# FlightDeck Architecture

FlightDeck is a composable agentic development workflow for GitHub Copilot, modeled after [obra/superpowers](https://github.com/obra/superpowers) and adapted for the VS Code Copilot agent/skill/prompt primitives.

## Directory Structure

```
.github/
├── copilot-instructions.md        # Bootstrap — loaded into every Copilot session
├── agents/
│   ├── flightdeck.agent.md            # Main entry point (user-invocable orchestrator)
│   ├── implementer.agent.md           # Implements one task with TDD
│   ├── spec-reviewer.agent.md         # Reviews spec compliance
│   └── code-quality-reviewer.agent.md # Reviews code quality
└── skills/
    ├── brainstorming/
    │   └── SKILL.md               # Design gate — required before all code
    ├── writing-plans/
    │   └── SKILL.md               # Plan creation — required before all implementation
    ├── subagent-driven-development/
    │   ├── SKILL.md               # Orchestrates agent dispatch loop
    │   ├── implementer-prompt.md  # Template for dispatching implementer
    │   ├── spec-reviewer-prompt.md       # Template for spec review dispatch
    │   └── code-quality-reviewer-prompt.md  # Template for quality review dispatch
    ├── executing-plans/
    │   └── SKILL.md               # Inline plan execution (no subagents)
    ├── test-driven-development/
    │   └── SKILL.md               # RED-GREEN-REFACTOR discipline
    ├── systematic-debugging/
    │   └── SKILL.md               # 4-phase root cause process
    ├── verification-before-completion/
    │   └── SKILL.md               # Evidence before claims
    ├── requesting-code-review/
    │   └── SKILL.md               # How to dispatch code reviewer
    ├── receiving-code-review/
    │   └── SKILL.md               # How to receive and respond to review
    ├── using-git-worktrees/
    │   └── SKILL.md               # Isolated workspace setup
    ├── finishing-a-development-branch/
    │   └── SKILL.md               # Merge/PR/discard decision workflow
    ├── dispatching-parallel-agents/
    │   └── SKILL.md               # Concurrent independent problem solving
    ├── writing-skills/
    │   └── SKILL.md               # How to create new skills (meta)
    └── using-flightdeck/
        └── SKILL.md               # System introduction

docs/flightdeck/
├── specs/                         # Design documents written by brainstorming skill
└── plans/                         # Implementation plans written by writing-plans skill
```

## Element Types and Roles

### Bootstrap (`copilot-instructions.md`)

Loaded into every Copilot session automatically. Tells the agent:
- The system is named FlightDeck
- Which skills exist and when they trigger
- Which agents exist and what they do
- The core workflow chain
- Iron laws that cannot be bypassed

### Skills (`.github/skills/<name>/SKILL.md`)

On-demand workflow documents. Loaded by the agent when the `description` field matches the task. Each skill:
- Has a `description` that describes ONLY triggering conditions (never the workflow)
- Contains step-by-step process for the agent to follow
- References other skills with `REQUIRED SUB-SKILL: Use flightdeck:<name>`
- Can include supporting files (prompt templates, reference docs)

### Agents (`.github/agents/<name>.agent.md`)

Specialized personas dispatched as subagents via `runSubagent`. Each agent:
- Has a focused single responsibility
- Has minimal tools (only what the role needs)
- Has `user-invocable: false` (called by other agents, not humans)
- Returns a structured status report
- Never receives session history — gets purpose-built context only

## Workflow Connections

```
User Request
    │
    ▼
[brainstorming SKILL]
    │ writes: docs/flightdeck/specs/YYYY-MM-DD-<topic>-design.md
    │
    ▼
[using-git-worktrees SKILL]
    │ creates: .worktrees/<branch-name>
    │
    ▼
[writing-plans SKILL]
    │ writes: docs/flightdeck/plans/YYYY-MM-DD-<feature>.md
    │
    ├──── subagent-driven-development SKILL ────────────────────────
    │         │
    │         │  per task:
    │         ├─▶ [implementer AGENT] ──▶ STATUS: DONE
    │         │       ↑ fix     │
    │         ├─▶ [spec-reviewer AGENT] ◀─ ISSUES FOUND
    │         │       ↑ fix     │ COMPLIANT
    │         └─▶ [code-quality-reviewer AGENT] ◀─ NEEDS FIXES
    │                           │ APPROVED
    │                           ▼
    │                   next task...
    │
    └──── executing-plans SKILL (alternative, same-session)
              │ executes tasks inline, uses manage_todo_list
              │
              ▼
    [finishing-a-development-branch SKILL]
              │ options: merge / PR / keep / discard
              │ cleans up worktree
              ▼
         Done
```

## Key Design Principles

### Context Isolation

Subagents never inherit session history. The orchestrator builds precise, minimal context for each dispatch:
- Full task text (never summarized)
- Relevant file contents
- Project architecture summary
- No prior conversation

This keeps subagents focused and prevents context pollution.

### Gate Functions

Each major skill is a gate:
- `brainstorming` gates all code — no implementation without approved design
- `writing-plans` gates all implementation — no coding without a plan
- `spec-reviewer` gates `code-quality-reviewer` — spec compliance before quality review
- `verification-before-completion` gates all completion claims — evidence before assertions

### Two-Stage Review Per Task

Every task in subagent-driven-development goes through:
1. **Spec compliance** (spec-reviewer) — is the right thing built?
2. **Code quality** (code-quality-reviewer) — is it built the right way?

These are deliberately separate because failing spec = wrong work; failing quality = poor work. They require different reviewers with different lenses.

### Skill Discovery

Skills are discovered by the agent based on their `description` field. The description must:
- Start with "Use when..."
- Describe triggering conditions, NOT the workflow inside
- Include symptom keywords the agent would search for

## Inspired By

| Superpowers (Claude Code) | FlightDeck (Copilot) |
|---------------------------|----------------------|
| `TodoWrite` | `manage_todo_list` tool |
| `Task("...")` | `runSubagent({ agentName })` |
| `superpowers:<skill>` | `flightdeck:<skill>` |
| `skills/` directory | `.github/skills/` |
| `~/.claude/skills/` (personal) | `~/.copilot/skills/` (personal) |
| `agents/` in repo root | `.github/agents/` |
| CLAUDE.md | `copilot-instructions.md` |
