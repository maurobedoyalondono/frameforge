---
name: executing-plans
description: "Use when you have a written implementation plan to execute in a separate session with review checkpoints"
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks, report when complete.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

**Note:** FlightDeck works much better with subagent support. If subagents are available, use flightdeck:subagent-driven-development instead — quality will be significantly higher.

## The Process

### Step 1: Load and Review Plan

1. Read plan file
2. Review critically — identify any questions or concerns
3. If concerns: raise with user before starting
4. If no concerns: create todo list with `manage_todo_list` and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in-progress in todo list
2. Follow each step exactly (plan has bite-sized steps)
3. Use **REQUIRED SUB-SKILL:** flightdeck:test-driven-development for all code
4. Run verifications as specified in the plan
5. Mark as completed

### Step 3: Complete Development

After all tasks complete and verified:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use flightdeck:finishing-a-development-branch

## When to Stop and Ask for Help

**STOP immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## Remember

- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when the plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master without explicit user consent

## Integration

- **REQUIRED PRE-SKILL:** flightdeck:using-git-worktrees — isolated workspace
- **REQUIRED POST-SKILL:** flightdeck:finishing-a-development-branch — complete work
- **Always use:** flightdeck:test-driven-development for all code steps
- **Better alternative:** flightdeck:subagent-driven-development (when subagents available)
