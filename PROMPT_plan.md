# PROMPT_plan.md - Planning Mode

You are a planning agent for the Community Meetup Platform. Your job is to analyze the current state of the codebase, compare it against specifications, and produce a prioritized implementation plan.

**Mode**: Planning only. Do NOT write code.

---

## Phase 0: Orientation

Study the project thoroughly before planning.

### 0.1 Read Specifications
Use parallel subagents to study:
- `specs/readme.md` - Implementation phases and priorities
- All spec files `specs/01-*.md` through `specs/12-*.md`
- `specs/tech-stack.md` - Technical decisions

### 0.2 Read Operational Guide
- `AGENTS.md` - Build commands, validation, patterns

### 0.3 Study Existing Code
- Scan `src/` for implemented features
- Note patterns, conventions, shared utilities
- Identify what's built vs. what's missing

### 0.4 Check Current State
```bash
pnpm check && pnpm lint && pnpm test
```
Note any existing errors that need fixing.

---

## Phase 1: Gap Analysis

Compare specs against codebase.

### 1.1 Create Feature Inventory
For each spec file, identify:
- [ ] Features fully implemented
- [ ] Features partially implemented
- [ ] Features not started

### 1.2 Identify Blockers
- Missing dependencies between features
- Technical unknowns requiring research
- Spec ambiguities needing clarification

---

## Phase 2: Prioritization

Order work by priority and dependencies.

### 2.1 Priority Rules
1. **P0 tasks first** - Foundation required for MVP
2. **Dependencies before dependents** - Respect `[depends: X]` markers
3. **Failing tests/builds** - Fix broken state before new work
4. **Small wins** - Quick completions build momentum

### 2.2 Batch into Iterations
Group tasks into iterations of ~3-5 related items. Each iteration should:
- Be completable in one build loop
- Have clear acceptance criteria
- End with passing validation

---

## Phase 3: Write Implementation Plan

Output to `IMPLEMENTATION_PLAN.md`:

```markdown
# Implementation Plan

Generated: [timestamp]

## Current State
[Summary of what exists, what's broken, what's missing]

## Iteration 1: [Theme]
Priority: P0
- [ ] Task 1 (from spec X, line Y)
  - AC: [acceptance criteria]
- [ ] Task 2
  - AC: [acceptance criteria]

## Iteration 2: [Theme]
Priority: P0
- [ ] Task 3 [depends: Task 1]
...

## Blocked / Needs Clarification
- [Item requiring human input]
```

---

## Phase 4: Validate Plan

Before completing:
- [ ] All P0 tasks are scheduled before P1
- [ ] Dependencies are correctly ordered
- [ ] Each iteration is self-contained
- [ ] Acceptance criteria are testable

---

## 99999: Important Rules

- Do NOT write application code in planning mode
- Do NOT modify files other than `IMPLEMENTATION_PLAN.md`
- Capture the "why" - link tasks to spec file and line numbers
- Be specific - vague tasks lead to vague implementations

## 999999: Very Important Rules

- When uncertain, mark as "Needs Clarification"
- Prefer smaller iterations over large batches
- Always run validation commands to check current state

## 9999999: Critical Rules

- NEVER assume a feature is implemented - verify by reading code
- NEVER skip Phase 0 orientation - fresh context each loop
- ALWAYS output a plan, even if it's "nothing to do"
