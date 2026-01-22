# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Community Meetup Platform - a mobile-first PWA for connecting people through local groups and events. Currently in specification phase (no application code yet).

## Tech Stack

- **Frontend**: SvelteKit + TypeScript (strict mode) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Forms**: Superforms + Zod validation
- **Testing**: Vitest (unit), Playwright (E2E)
- **Hosting**: Netlify

## Commands

```bash
# Development
pnpm dev              # Start dev server (localhost:5173)
pnpm build            # Production build
pnpm preview          # Preview production build

# Quality Gates (ALL must pass before commit)
pnpm check            # Svelte diagnostics + TypeScript
pnpm lint             # ESLint (0 errors, 0 warnings)
pnpm format           # Prettier auto-fix
pnpm format:check     # Verify formatting
pnpm test             # Vitest unit tests
pnpm test:coverage    # With coverage (80% minimum)
pnpm test:e2e         # Playwright E2E tests
pnpm analyze          # Bundle size (< 100KB gzipped)
pnpm knip             # Dead code detection
pnpm depcheck         # Unused dependency detection

# Full validation (run before commit)
pnpm check && pnpm lint && pnpm test:coverage && pnpm build && pnpm knip && pnpm depcheck

# Database
pnpm db:types         # Generate TypeScript types from Supabase
pnpm db:migrate       # Run migrations
pnpm db:reset         # Reset local database (destructive)
```

## Architecture

```
src/
├── routes/           # SvelteKit file-based routing
│   ├── (app)/        # Authenticated routes
│   ├── (auth)/       # Login/register routes
│   └── api/          # API endpoints
├── lib/
│   ├── components/   # Reusable UI components
│   ├── server/       # Server-only code (Supabase admin)
│   ├── stores/       # Svelte stores for client state
│   ├── utils/        # Pure utility functions
│   ├── schemas/      # Zod validation schemas
│   └── types/        # TypeScript type definitions
```

## Development Workflow (Ralph Loop)

This project uses the Ralph Wiggum methodology for AI-driven development:

1. **Planning mode** (`PROMPT_plan.md`): Analyze specs, generate implementation plan
2. **Building mode** (`PROMPT_build.md`): Implement one task per iteration, validate all gates, commit

Key files:

- `AGENTS.md` - Operational guide with quality gates and code patterns
- `IMPLEMENTATION_PLAN.md` - AI-generated task list
- `specs/` - Feature specifications with acceptance criteria

## Quality Gates

9 gates must pass before any commit (see `AGENTS.md` for details):

1. Type safety (0 errors)
2. Linting (0 errors, 0 warnings)
3. Formatting (Prettier)
4. Unit tests (100% pass, 80% coverage)
5. Build (successful)
6. E2E tests (100% pass)
7. Bundle size (< 100KB gzipped)
8. Dead code (0 unused exports)
9. Unused deps (0 unused dependencies)

## Specifications

All requirements are in `specs/`:

- `specs/readme.md` - Index with implementation phases (P0/P1/P2 priorities)
- `specs/01-*.md` through `specs/12-*.md` - Feature specs
- `specs/tech-stack.md` - Technical decisions
- `specs/ralph.md` - Development methodology
