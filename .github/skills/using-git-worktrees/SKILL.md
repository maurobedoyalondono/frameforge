---
name: using-git-worktrees
description: "Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification"
---

# Using Git Worktrees

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

**Core principle:** Systematic directory selection + safety verification = reliable isolation.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Directory Selection Process

Follow this priority order:

### 1. Check Existing Directories

```bash
# Check in priority order
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
```

**If found:** Use that directory. If both exist, `.worktrees` wins.

### 2. Ask User

If no directory exists:

```
No worktree directory found. Where should I create worktrees?

1. .worktrees/ (project-local, hidden)
2. parallel directory ~/<project>-worktrees/

Which would you prefer?
```

## Safety Verification

### For Project-Local Directories

**MUST verify directory is ignored before creating worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null
```

**If NOT ignored:**
1. Add `.worktrees/` to `.gitignore`
2. Commit the change
3. Proceed with worktree creation

**Why critical:** Prevents accidentally committing worktree contents.

## Creation Steps

### 1. Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. Create Worktree

```bash
git worktree add .worktrees/<branch-name> -b <branch-name>
cd .worktrees/<branch-name>
```

### 3. Run Project Setup

Auto-detect and run appropriate setup:

```bash
if [ -f package.json ]; then npm install; fi
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f Cargo.toml ]; then cargo build; fi
```

### 4. Verify Clean Baseline

Run tests to ensure worktree starts clean:

```bash
npm test   # or appropriate test command
```

**If tests fail:** Report failures, ask whether to proceed or investigate.
**If tests pass:** Report ready.

### 5. Report Location

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| `.worktrees/` exists | Use it (verify ignored) |
| Neither exists | Ask user |
| Directory not ignored | Add to .gitignore + commit |
| Tests fail during baseline | Report failures + ask |

## Red Flags

**Never:**
- Create worktree without verifying it's ignored (project-local)
- Skip baseline test verification
- Proceed with failing tests without asking
- Assume directory location when ambiguous

## Integration

- **CALLED BY:** flightdeck:brainstorming — after design approved
- **CALLED BY:** flightdeck:subagent-driven-development — before executing tasks
- **CALLED BY:** flightdeck:executing-plans — before executing tasks
- **PAIRS WITH:** flightdeck:finishing-a-development-branch — cleanup after work complete
