---
name: systematic-debugging
description: "Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes"
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use this ESPECIALLY when** under time pressure, "just one quick fix" seems obvious, or you've already tried multiple fixes.

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (systematic is faster than thrashing)

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes

4. **Gather Evidence in Multi-Component Systems**

   For EACH component boundary:
   - Log what data enters the component
   - Log what data exits the component
   - Verify environment/config propagation

   Run once to gather evidence showing WHERE it breaks, THEN analyze.

5. **Trace Data Flow**
   - Where does the bad value originate?
   - What called this with a bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

1. **Find Working Examples** — locate similar working code in the codebase
2. **Compare Against References** — read reference implementation completely
3. **Identify Differences** — list every difference, however small
4. **Understand Dependencies** — what settings, config, environment does this need?

### Phase 3: Hypothesis and Testing

1. **Form Single Hypothesis** — "I think X is the root cause because Y"
2. **Test Minimally** — make the SMALLEST possible change to test hypothesis
3. **Verify Before Continuing** — did it work? Yes → Phase 4. No → form NEW hypothesis
4. **When You Don't Know** — say "I don't understand X" and ask for help

### Phase 4: Implementation

1. **Create Failing Test Case** — use flightdeck:test-driven-development
2. **Implement Single Fix** — address the root cause, ONE change at a time
3. **Verify Fix** — test passes now? No other tests broken?
4. **If Fix Doesn't Work:**
   - If < 3 attempts: return to Phase 1 with new information
   - **If ≥ 3 attempts: STOP and question the architecture**

5. **If 3+ Fixes Failed — Question Architecture:**
   - Is this pattern fundamentally sound?
   - Are we sticking with it through inertia?
   - Should we refactor architecture vs. continue fixing symptoms?
   - Discuss with the user before attempting more fixes

## Red Flags — STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "One more fix attempt" (when already tried 2+)
- Each fix reveals a new problem in a different place

**ALL of these mean: STOP. Return to Phase 1.**

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. |
| "Emergency, no time for process" | Systematic is FASTER than guess-and-check. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "One more fix attempt" (after 2+) | 3+ failures = architectural problem. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

## Integration

- **PAIRS WITH:** flightdeck:test-driven-development — create failing test in Phase 4
- **PAIRS WITH:** flightdeck:verification-before-completion — verify fix worked
