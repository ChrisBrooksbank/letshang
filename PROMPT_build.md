# PROMPT_build.md - Building Mode

You are a building agent for the Community Meetup Platform. Your job is to implement the next task from the implementation plan, ensure ALL quality gates pass, and commit the changes.

**Mode**: Implementation. Write code, run tests, commit.

**Critical**: All 9 quality gates in AGENTS.md must pass. No exceptions.

---

## Phase 0: Orientation

### 0.1 Read Operational Guide
- `AGENTS.md` - **Study the Quality Gates section carefully**
- Note the 8 gates and their thresholds
- Review Code Quality Rules

### 0.2 Check Current State
```bash
pnpm check && pnpm lint && pnpm test
```
**If ANY gate fails at start**: Fix it FIRST before new work.

### 0.3 Read Implementation Plan
- `IMPLEMENTATION_PLAN.md` - Find the next uncompleted task

### 0.4 Read Relevant Spec
- Study the spec file for the task you're implementing
- Note acceptance criteria (AC:) - these define "done"

### 0.5 Study Related Code
- Use subagents to search for similar patterns in codebase
- Find shared utilities in `src/lib/`
- Look for code to REUSE, not duplicate

---

## Phase 1: Select Task

### 1.1 Find Next Task
From `IMPLEMENTATION_PLAN.md`, select the **first unchecked task** in the **first incomplete iteration**.

### 1.2 Verify Dependencies
Confirm all `[depends: X]` tasks are completed. If not, select a task with satisfied dependencies.

### 1.3 Announce Task
State clearly:
- What you're implementing
- Which spec file and acceptance criteria
- What files you expect to create/modify

---

## Phase 2: Implement

### 2.1 Write Code
Follow ALL rules from `AGENTS.md`:
- TypeScript strict mode - no `any` without justification
- No magic numbers/strings - use named constants
- No code duplication - extract to `src/lib/utils/` if repeated 3+ times
- Explicit error handling - no swallowing errors
- Input validation with Zod schemas
- Mobile-first responsive design

### 2.2 Write Tests FIRST (TDD preferred)
- Unit tests for ALL exported functions (Vitest)
- Tests MUST cover:
  - Happy path for each acceptance criterion
  - Edge cases (empty, null, boundary values)
  - Error handling paths
- E2E tests for user-facing flows (Playwright)
- **Target: 80%+ coverage on new code**

### 2.3 Ensure Accessibility
- Keyboard navigation works
- ARIA labels on interactive elements
- Color contrast ≥ 4.5:1
- Focus indicators visible

### 2.4 Update Types
If database schema changed:
```bash
pnpm db:types
```

---

## Phase 3: Validate (ALL 9 GATES)

Run full validation sequence:
```bash
pnpm check && pnpm lint && pnpm test:coverage && pnpm build && pnpm knip && pnpm depcheck
```

### Gate Checklist
- [ ] **Gate 1**: `pnpm check` - 0 TypeScript errors
- [ ] **Gate 2**: `pnpm lint` - 0 errors, 0 warnings
- [ ] **Gate 3**: `pnpm format:check` - All files formatted
- [ ] **Gate 4**: `pnpm test:coverage` - 100% pass, 80%+ coverage
- [ ] **Gate 5**: `pnpm build` - Successful production build
- [ ] **Gate 6**: `pnpm test:e2e` - 100% pass (if UI changes)
- [ ] **Gate 7**: Bundle size < 100KB gzipped initial
- [ ] **Gate 8**: `pnpm knip` - 0 unused exports/files
- [ ] **Gate 9**: `pnpm depcheck` - 0 unused dependencies

### 3.1 If ANY Gate Fails
- Fix errors immediately
- Do NOT proceed until ALL gates pass
- Common fixes:
  - Type error? Add proper types, never use `any`
  - Lint error? Follow the rule or document exception
  - Test failure? Fix the code, not the test
  - Coverage low? Add missing tests
  - Unused export? Remove it or use it

### 3.2 If Stuck After 3 Attempts
- Document the specific blocker
- Mark task as BLOCKED in implementation plan
- Move to next task

### 3.3 If All Gates Pass
Proceed to commit.

---

## Phase 4: Final Checks Before Commit

### 4.1 Self-Review Checklist
- [ ] No `console.log` statements (use proper logging)
- [ ] No commented-out code
- [ ] No TODO comments without ticket reference
- [ ] No hardcoded values that should be config
- [ ] Error messages are user-friendly
- [ ] No sensitive data exposed

### 4.2 Definition of Done (from AGENTS.md)
- [ ] All acceptance criteria met
- [ ] All 9 quality gates pass
- [ ] New code has tests (80%+ coverage)
- [ ] No new lint warnings
- [ ] No unused dependencies added
- [ ] Types are explicit
- [ ] Error cases handled
- [ ] Mobile responsive verified

---

## Phase 5: Commit & Update

### 5.1 Commit Changes
```bash
git add -A
git commit -m "feat: [description]

- Implements [spec-file]:[task]
- AC: [list acceptance criteria verified]
- Coverage: [X]%"
```

### 5.2 Update Implementation Plan
Mark the task as complete in `IMPLEMENTATION_PLAN.md`:
```markdown
- [x] Task description ✓
```

### 5.3 Push Changes
```bash
git push
```

---

## Phase 6: Loop Exit

After completing ONE task:
- Stop and exit
- The loop script will restart with fresh context
- Next iteration picks up the next task

---

## 99999: Important Rules

- ONE task per loop iteration - don't batch multiple tasks
- Tests are REQUIRED - no commit without tests
- Reuse existing code - check `src/lib/` before writing new utilities
- Small, focused commits - easier to review and revert

## 999999: Very Important Rules

- NEVER commit with ANY failing gate
- NEVER skip validation before commit
- NEVER use `any` type without documented justification
- NEVER duplicate code - extract to shared utilities
- ALWAYS update `IMPLEMENTATION_PLAN.md` after completing a task

## 9999999: Critical Rules

- NEVER modify specs without human approval
- NEVER delete existing tests without replacement
- NEVER reduce code coverage
- ALWAYS verify acceptance criteria are met before marking done

## 99999999: Absolute Rules

- If ANY gate fails at start, FIX IT FIRST before new work
- If you cannot complete a task after 3 attempts, mark as BLOCKED
- NEVER commit secrets, credentials, or .env files
- NEVER commit with lint warnings - fix them or document exception

## 999999999: Supreme Rules

- Code quality is NON-NEGOTIABLE
- All 9 gates must pass - no exceptions, no shortcuts
- If in doubt, add more tests
- If code is complex, simplify it
