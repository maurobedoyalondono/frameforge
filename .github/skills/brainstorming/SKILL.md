---
name: brainstorming
description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design and get user approval.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.
</HARD-GATE>

## Anti-Pattern: "This Is Too Simple To Need A Design"

Every project goes through this process. A todo list, a single-function utility, a config change — all of them. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences), but you MUST present it and get approval.

## Checklist

You MUST complete each item in order:

1. **Explore project context** — check files, docs, recent commits
2. **Ask clarifying questions** — one at a time, understand purpose/constraints/success criteria
3. **Propose 2-3 approaches** — with trade-offs and your recommendation
4. **Present design** — in sections scaled to their complexity, get user approval after each section
5. **Write design doc** — save to `docs/flightdeck/specs/YYYY-MM-DD-<topic>-design.md` and commit
6. **Spec self-review** — scan for placeholders, contradictions, ambiguity, scope issues
7. **User reviews written spec** — ask user to review before proceeding
8. **Transition to implementation** — invoke writing-plans skill

## Process Flow

```
Explore project context
    ↓
Ask clarifying questions (one at a time)
    ↓
Propose 2-3 approaches
    ↓
Present design in sections → User approves? → no: revise
    ↓ yes
Write design doc
    ↓
Spec self-review (fix inline)
    ↓
User reviews spec? → changes requested: revise
    ↓ approved
REQUIRED SUB-SKILL: Use flightdeck:writing-plans
```

**The terminal state is invoking writing-plans.** Do NOT invoke any implementation skill. The ONLY next step after brainstorming is writing-plans.

## The Process

**Understanding the idea:**

- Check the current project state first (files, docs, recent commits)
- Before asking detailed questions, assess scope: if the request describes multiple independent subsystems, flag this immediately
- If the project is too large for a single spec, help the user decompose into sub-projects
- For appropriately-scoped projects, ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible
- Only one question per message
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**

- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**

- Once you understand what you're building, present the design
- Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing

**Design for isolation and clarity:**

- Break the system into smaller units that each have one clear purpose
- Communicate through well-defined interfaces
- Can someone understand what a unit does without reading its internals? If not, the boundaries need work

## After the Design

**Documentation:**

- Write the validated design to `docs/flightdeck/specs/YYYY-MM-DD-<topic>-design.md`
- Commit the design document to git

**Spec Self-Review:**
After writing the spec, look at it with fresh eyes:

1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections? Fix them.
2. **Internal consistency:** Do any sections contradict each other?
3. **Scope check:** Is this focused enough for a single implementation plan?
4. **Ambiguity check:** Could any requirement be interpreted two different ways?

**User Review Gate:**
After the spec review, ask the user to review:

> "Spec written and committed to `<path>`. Please review it and let me know if you want any changes before we start the implementation plan."

Wait for the user's response. Only proceed once the user approves.

**Implementation:**

- **REQUIRED SUB-SKILL:** Use flightdeck:writing-plans

## Key Principles

- **One question at a time** — don't overwhelm with multiple questions
- **Multiple choice preferred** — easier to answer than open-ended when possible
- **YAGNI ruthlessly** — remove unnecessary features from all designs
- **Explore alternatives** — always propose 2-3 approaches before settling
- **Incremental validation** — present design, get approval before moving on
