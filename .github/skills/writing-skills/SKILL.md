---
name: writing-skills
description: "Use when creating new skills, editing existing skills, or verifying skills work before deployment"
---

# Writing Skills

## Overview

**Writing skills IS Test-Driven Development applied to process documentation.**

You write test cases (pressure scenarios), watch them fail (baseline behavior), write the skill (documentation), watch tests pass (agents comply), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

## What is a Skill?

A **skill** is a reference guide for proven techniques, patterns, or tools. Skills help future agent instances find and apply effective approaches.

**Skills are:** Reusable techniques, patterns, tools, reference guides

**Skills are NOT:** Narratives about how you solved a problem once

## Skill Types

| Type | Description | Examples |
|------|-------------|---------|
| **Technique** | Concrete method with steps | condition-based-waiting |
| **Pattern** | Way of thinking about problems | systematic-debugging |
| **Reference** | API docs, syntax guides | shapes-reference |
| **Workflow** | Multi-step orchestration | brainstorming, writing-plans |

## Directory Structure

```
.github/skills/
  skill-name/
    SKILL.md              # Required (name must match folder)
    supporting-file.*     # Only if needed (reference docs, scripts)
```

## SKILL.md Structure

**Frontmatter (YAML):**

```yaml
---
name: skill-name   # kebab-case, matches folder name
description: "Use when [specific triggering conditions and symptoms]"
---
```

**Description rules:**
- Start with "Use when..." to focus on triggering conditions
- Include specific symptoms, situations, contexts
- **NEVER summarize the skill's process or workflow**
- Keep under 500 characters if possible
- Write in third-person (injected into system prompt)

```yaml
# ❌ BAD: Summarizes workflow — agent may follow this instead of reading skill
description: "Use when executing plans — dispatches subagent per task with code review between tasks"

# ✅ GOOD: Just triggering conditions, no workflow summary
description: "Use when executing implementation plans with independent tasks in the current session"
```

**Body structure:**

```markdown
# Skill Name

## Overview
What is this? Core principle in 1-2 sentences.

## When to Use
Bullet list with SYMPTOMS and use cases
When NOT to use

## Core Pattern / The Process
Steps, code, flowchart (only if decision is non-obvious)

## Quick Reference
Table or bullets for scanning common operations

## Common Mistakes
What goes wrong + fixes

## Integration
Other skills this connects to
```

## Token Efficiency

**Target word counts:**
- Workflow skills: keep focused, under 500 lines
- Reference skills: use separate files for content > 100 lines
- Frequently-loaded skills: aim for < 200 words total

**Techniques:**
- Move heavy reference to separate files
- Use cross-references to avoid repeating workflow details
- One excellent example beats many mediocre ones

## Cross-Referencing Other Skills

```markdown
# ✅ Good: explicit requirement marker
**REQUIRED SUB-SKILL:** Use flightdeck:test-driven-development

# ✅ Good: background requirement
**REQUIRED BACKGROUND:** You MUST understand flightdeck:systematic-debugging

# ❌ Bad: unclear if required
See skills/testing/test-driven-development
```

## Flowchart Usage

Use flowcharts ONLY for:
- Non-obvious decision points
- Process loops where you might stop too early
- "When to use A vs B" decisions

**Never use flowcharts for:**
- Reference material → tables, lists
- Linear instructions → numbered lists
- Code examples → markdown code blocks

## TDD Mapping for Skills

| TDD Concept | Skill Creation |
|-------------|----------------|
| **Test case** | Pressure scenario with subagent |
| **Production code** | Skill document (SKILL.md) |
| **RED** | Agent violates rule without skill (baseline) |
| **GREEN** | Agent complies with skill present |
| **Refactor** | Close loopholes while maintaining compliance |

## Skill Creation Checklist

**RED Phase — Baseline:**
- [ ] Run pressure scenarios WITHOUT skill — document baseline behavior
- [ ] Identify patterns in rationalizations/failures

**GREEN Phase — Write Skill:**
- [ ] Name uses only letters, numbers, hyphens (no special chars)
- [ ] Frontmatter: `name` matches folder, `description` starts with "Use when..."
- [ ] Description describes ONLY triggering conditions (no workflow summary)
- [ ] Clear overview with core principle
- [ ] Addresses specific baseline failures identified in RED
- [ ] Run scenarios WITH skill — verify agents now comply

**REFACTOR Phase — Close Loopholes:**
- [ ] Identify new rationalizations from testing
- [ ] Add explicit counters for discipline skills
- [ ] Re-test until bulletproof

**Deployment:**
- [ ] Commit skill to git

## The Iron Law (Same as TDD)

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

Write skill before testing? Delete it. Start over.

**No exceptions** for "simple additions" or "just a documentation update."
