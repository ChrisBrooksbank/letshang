# AGENTS.md - Operational Guide

> Single source of truth for build, test, validation, and quality gates.

---

## Build & Run

```bash
pnpm dev              # Start dev server (http://localhost:5173)
pnpm build            # Production build
pnpm preview          # Preview production build locally
```

---

## Quality Gates (Backpressure)

**ALL gates must pass before committing.** No exceptions.

### Gate 1: Type Safety
```bash
pnpm check            # Svelte diagnostics + TypeScript strict mode
```
- **Threshold**: 0 errors
- TypeScript strict mode is mandatory
- No `any` types except with explicit `// eslint-disable-next-line` + justification
- No `@ts-ignore` or `@ts-expect-error` without documented reason

### Gate 2: Linting
```bash
pnpm lint             # ESLint with strict rules
```
- **Threshold**: 0 errors, 0 warnings
- Covers: unused variables, unreachable code, consistent returns
- Security rules enabled (no-eval, no-implied-eval, no-new-func)

### Gate 3: Formatting
```bash
pnpm format           # Prettier (auto-fixes)
pnpm format:check     # Verify formatting without fixing
```
- **Threshold**: All files formatted
- Run `pnpm format` before commit (husky pre-commit hook)

### Gate 4: Unit Tests
```bash
pnpm test             # Vitest unit tests
pnpm test:coverage    # With coverage report
```
- **Threshold**: 100% pass rate
- **Coverage minimum**: 80% lines, 80% branches
- New code must include tests for:
  - All exported functions
  - All edge cases in acceptance criteria
  - Error handling paths

### Gate 5: Build
```bash
pnpm build            # Production build must succeed
```
- **Threshold**: 0 errors
- Build output must be valid
- No console.log in production (use proper logging)

### Gate 6: E2E Tests (for UI changes)
```bash
pnpm test:e2e         # Playwright E2E tests
```
- **Threshold**: 100% pass rate
- Required for: new pages, user flows, critical paths

### Gate 7: Bundle Size
```bash
pnpm build && pnpm analyze   # Bundle analysis
```
- **Threshold**: Initial JS bundle < 100KB gzipped
- Alert if any single chunk > 50KB
- Lazy load routes and heavy dependencies

### Gate 8: Dead Code / Unused Exports
```bash
pnpm knip             # Find unused files, exports, dependencies
```
- **Threshold**: 0 unused exports in src/
- Remove dead code, don't comment it out

### Gate 9: Unused Dependencies
```bash
pnpm depcheck         # Find unused npm dependencies
```
- **Threshold**: 0 unused dependencies
- Remove from package.json if not needed
- If false positive, add to `.depcheckrc` ignores

### Full Validation Sequence
```bash
pnpm check && pnpm lint && pnpm test:coverage && pnpm build && pnpm knip && pnpm depcheck
```

---

## Code Quality Rules

### No Duplication (DRY)
- Extract repeated code (3+ occurrences) into shared utilities
- Shared code lives in `src/lib/`
- If you copy-paste, you're doing it wrong

### No Magic Numbers/Strings
```typescript
// BAD
if (status === 2) { ... }

// GOOD
const STATUS_APPROVED = 2;
if (status === STATUS_APPROVED) { ... }
```

### Explicit Error Handling
```typescript
// BAD
try { ... } catch (e) { console.log(e); }

// GOOD
try { ... } catch (e) {
  if (e instanceof AuthError) {
    // handle auth error
  } else {
    throw e; // re-throw unexpected errors
  }
}
```

### No Premature Abstraction
- Don't create abstractions until you have 3+ concrete use cases
- Prefer explicit code over clever code
- Comments explain "why", not "what"

### Security Requirements
- Validate ALL user input with Zod schemas
- Use parameterized queries (Supabase handles this)
- No secrets in code - use environment variables
- Sanitize output to prevent XSS
- RLS policies for all database tables

### Accessibility Requirements
- All interactive elements keyboard accessible
- ARIA labels on icons and non-text elements
- Color contrast ratio ≥ 4.5:1
- Focus indicators visible

---

## Database

```bash
pnpm db:types         # Regenerate TypeScript types from Supabase schema
pnpm db:migrate       # Run pending migrations
pnpm db:reset         # Reset local database (destructive!)
```

### Database Rules
- Every table has RLS enabled
- Every table has `created_at` and `updated_at`
- Foreign keys have appropriate ON DELETE behavior
- Indexes on frequently queried columns

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | SvelteKit + TypeScript (strict) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Styling | Tailwind CSS |
| Forms | Superforms + Zod |
| Maps | Mapbox |
| Testing | Vitest (unit), Playwright (E2E) |
| Hosting | Netlify |

---

## Codebase Patterns

### File Structure
```
src/
├── routes/           # SvelteKit file-based routing
├── lib/
│   ├── components/   # Reusable UI components
│   ├── server/       # Server-only code (Supabase admin)
│   ├── stores/       # Svelte stores for client state
│   ├── utils/        # Pure utility functions
│   ├── schemas/      # Zod validation schemas
│   └── types/        # TypeScript type definitions
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `EventCard.svelte` |
| Routes | kebab-case | `src/routes/my-events/` |
| Utils | camelCase | `formatDate.ts` |
| Types | PascalCase | `type EventRsvp = ...` |
| Constants | SCREAMING_SNAKE | `MAX_ATTENDEES` |

### Component Guidelines
- One component per file
- Props interface at top of script
- Events documented with JSDoc
- Max 200 lines per component (split if larger)

### State Management
- Server state: SvelteKit load functions
- Client state: Svelte stores in `$lib/stores/`
- Form state: Superforms
- NO global mutable state

---

## Definition of Done

A task is DONE when:
- [ ] All acceptance criteria met
- [ ] All 9 quality gates pass
- [ ] New code has tests (80%+ coverage)
- [ ] No new lint warnings
- [ ] No console.log statements
- [ ] Types are explicit (no implicit any)
- [ ] Error cases handled
- [ ] Mobile responsive verified
- [ ] IMPLEMENTATION_PLAN.md updated

---

## Tool Decisions

### Why These Tools

| Tool | Why Included |
|------|--------------|
| **knip** | Comprehensive: finds unused files, exports, AND dependencies |
| **depcheck** | Belt-and-suspenders for dependencies; catches edge cases |
| **Vitest** | Fast, Vite-native, excellent coverage reporting |
| **Playwright** | Cross-browser E2E, best-in-class reliability |
| **Prettier** | Industry standard formatting |
| **ESLint** | Catches bugs, enforces patterns, security rules |

### Why NOT These Tools

| Tool | Why Excluded |
|------|--------------|
| **ts-prune** | Redundant - knip finds unused exports |
| **purgecss** | Redundant - Tailwind JIT purges unused CSS automatically |
| **beautify** | Redundant - Prettier is the standard |
| **jscpd** | Nice-to-have - manual review catches duplication; adds complexity |

### Tool Overlap Matrix

```
                    Unused    Unused    Unused    Code
                    Exports   Files     Deps      Format
knip                  ✓         ✓         ✓
depcheck                                  ✓
ts-prune              ✓
Prettier                                            ✓
```

knip + depcheck covers all dead code detection needs.

---

## Specs Location

All requirements live in `specs/`:
- `specs/readme.md` - Index and implementation phases
- `specs/01-*.md` through `specs/12-*.md` - Feature specs with acceptance criteria
- `specs/tech-stack.md` - Technical decisions
