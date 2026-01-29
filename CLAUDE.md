# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Community Meetup Platform - a mobile-first PWA for connecting people through local groups and events. Features auth, profiles, groups, events with RSVP, comments, check-in, reminders, search, and notifications.

## Tech Stack

- **Frontend**: SvelteKit + TypeScript (strict mode) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Forms**: Superforms + Zod validation
- **Maps**: Mapbox GL
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
pnpm test             # Vitest unit tests
pnpm test:coverage    # With coverage (80% minimum)
pnpm test:e2e         # Playwright E2E tests
pnpm knip             # Dead code detection
pnpm depcheck         # Unused dependency detection

# Run a single test file
pnpm test src/lib/utils/reminders.test.ts

# Run tests matching a pattern
pnpm test -t "should calculate reminder"

# Watch mode for TDD
pnpm test:watch

# Full validation (run before commit)
pnpm check && pnpm lint && pnpm test:coverage && pnpm build && pnpm knip && pnpm depcheck

# Database
pnpm db:types         # Generate TypeScript types from Supabase
```

## Architecture

```
src/
├── routes/
│   ├── (app)/           # Authenticated routes (profile, groups, events, etc.)
│   ├── (auth)/          # Auth routes (login, register, logout, password reset)
│   └── auth/callback/   # OAuth callback handler
├── lib/
│   ├── components/      # Svelte components (EventCard, GroupCard, etc.)
│   ├── server/          # Server-only code (Supabase admin, business logic)
│   ├── stores/          # Svelte stores (auth state)
│   ├── utils/           # Pure functions (date-filters, geocoding, etc.)
│   ├── schemas/         # Zod schemas (auth, profile, groups, events, etc.)
│   └── types/           # TypeScript types (database.ts from Supabase)
├── hooks.server.ts      # Auth middleware - creates Supabase client per request
└── app.d.ts             # App.Locals types (supabase, session, user)
```

## Key Patterns

### Database Types

```typescript
import type { Tables, TablesInsert, TablesUpdate } from '$lib/types/database';

type User = Tables<'users'>;
type EventInsert = TablesInsert<'events'>;
```

### Supabase Client Access

```typescript
// In +page.server.ts or +server.ts
export const load = async ({ locals }) => {
	const { supabase, user, session } = locals;
	// Use supabase client, check user/session for auth
};
```

### Form Handling (Superforms + Zod)

```typescript
// Schema in $lib/schemas/
import { z } from 'zod';
export const loginSchema = z.object({ email: z.string().email() });

// In +page.server.ts
import { superValidate, fail } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(loginSchema));
		if (!form.valid) return fail(400, { form });
		// Process form.data
	}
};
```

### Test File Naming

Tests are co-located with source files: `foo.ts` → `foo.test.ts`

## Quality Gates

9 gates must pass before commit (see `AGENTS.md` for thresholds):

1. Type safety (0 errors, no `any` without justification)
2. Linting (0 errors, 0 warnings)
3. Formatting (Prettier)
4. Unit tests (100% pass, 80% coverage)
5. Build (successful)
6. E2E tests (100% pass)
7. Bundle size (< 100KB gzipped)
8. Dead code (0 unused exports)
9. Unused deps (0 unused dependencies)

## Reference Files

- `AGENTS.md` - Full quality gate details and code patterns
- `IMPLEMENTATION_PLAN.md` - Task tracking
- `specs/readme.md` - Feature specs index (P0/P1/P2 priorities)
- `specs/01-*.md` through `specs/12-*.md` - Individual feature specs
