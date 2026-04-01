---
name: dispatching-parallel-agents
description: "Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies"
---

# Dispatching Parallel Agents

## Overview

You delegate tasks to specialized agents with isolated context. When you have multiple unrelated failures or independent work domains, investigating them sequentially wastes time. Each investigation can happen in parallel.

**Core principle:** Dispatch one agent per independent problem domain. Let them work concurrently.

## When to Use

```
Multiple problems?
    ↓ yes
Are they independent?
    ↓ yes                    ↓ no
Can they work in parallel?   Single agent investigates all
    ↓ yes        ↓ no
Parallel dispatch    Sequential agents
```

**Use when:**
- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Each problem can be understood without context from others
- No shared state between investigations

**Don't use when:**
- Failures are related (fix one might fix others)
- Need to understand full system state
- Agents would interfere with each other (editing same files)
- You don't know what's broken yet

## The Pattern

### 1. Identify Independent Domains

Group failures by what's broken:
- File A tests: one problem domain
- File B tests: different problem domain
- Subsystem C: another domain

### 2. Create Focused Agent Tasks

Each agent gets:
- **Specific scope:** One test file or subsystem
- **Clear goal:** Make these tests pass / fix this bug
- **Constraints:** Don't change unrelated code
- **Expected output:** Summary of what you found and fixed

### 3. Dispatch in Parallel

Use `dispatching-parallel-agents` to dispatch multiple `runSubagent` calls:

```javascript
// Dispatch multiple independent agents simultaneously
runSubagent("Fix auth.test.js failures — 3 timing issues")
runSubagent("Fix batch-completion.test.js — tools not executing")
runSubagent("Fix race-conditions.test.js — execution count = 0")
// All three run concurrently
```

### 4. Review and Integrate

When agents return:
- Read each summary
- Verify fixes don't conflict
- Run full test suite
- Integrate all changes

## Agent Prompt Structure

Good prompts are focused, self-contained, and specific about output:

```markdown
Fix the 3 failing tests in src/auth/auth.test.js:

1. "should reject expired tokens" — expects 401, gets 200
2. "should handle concurrent requests" — race condition
3. "should log failed attempts" — audit log missing

These are timing/race condition issues. Your task:

1. Read the test file and understand what each test verifies
2. Identify root cause — timing issues or actual bugs?
3. Fix the issues
4. Verify all 3 tests pass and no other tests broke

Do NOT change production code outside src/auth/.

Return: Summary of root cause and what you changed.
```

## Common Mistakes

| ❌ Pattern | ✅ Better |
|-----------|---------|
| "Fix all the tests" | "Fix auth.test.js — 3 specific failures" |
| No context given | Paste the error messages and test names |
| No constraints | "Do NOT change unrelated production code" |
| Vague output | "Return summary of root cause and changes" |

## Verification

After agents return:
1. **Review each summary** — understand what changed
2. **Check for conflicts** — did agents edit the same file?
3. **Run full suite** — verify all fixes work together
4. **Spot check** — agents can make systematic errors

## Integration

- **CALLED BY:** Orchestrator when multiple independent problems arise
- **AGENTS USED:** Any specialized agent appropriate to the task
- **PAIRS WITH:** flightdeck:systematic-debugging — for investigation tasks
