# Community Meetup Platform

A mobile-first PWA for connecting people through local groups and events.

## Tech Stack

- **Frontend**: SvelteKit + TypeScript (strict mode) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Hosting**: Netlify

## Setup

1. Install dependencies:

```sh
pnpm install
```

2. Configure environment variables:

```sh
cp .env.example .env
# Edit .env with your Supabase credentials from https://supabase.com/dashboard
```

3. Generate database types (after Supabase is configured):

```sh
pnpm db:types
```

## Development

Start the development server:

```sh
pnpm dev
```

## Database Type Generation

This project uses TypeScript types generated from your Supabase database schema for type safety.

### Setup

1. Ensure you have valid Supabase credentials in `.env`:
   - `PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Install Supabase CLI globally (one-time setup):

```sh
npm install -g supabase
```

### Generate Types

After making changes to your Supabase database schema, regenerate types:

```sh
pnpm db:types
```

This will:

1. Connect to your Supabase project
2. Fetch the latest schema
3. Generate TypeScript types in `src/lib/types/database.ts`

### Using Database Types

```typescript
import type { Tables, TablesInsert, TablesUpdate } from '$lib/types/database';

// Get the type for a table row
type User = Tables<'users'>;

// Get the type for inserting a new row
type UserInsert = TablesInsert<'users'>;

// Get the type for updating a row
type UserUpdate = TablesUpdate<'users'>;
```

## Quality Gates

All 9 quality gates must pass before committing:

```sh
pnpm check            # TypeScript + Svelte diagnostics
pnpm lint             # ESLint (0 errors, 0 warnings)
pnpm test:coverage    # Vitest with 80% coverage
pnpm build            # Production build
pnpm knip             # Dead code detection
pnpm depcheck         # Unused dependencies
```

Full validation:

```sh
pnpm check && pnpm lint && pnpm test:coverage && pnpm build && pnpm knip && pnpm depcheck
```

## Building

Production build:

```sh
pnpm build
```

Preview production build:

```sh
pnpm preview
```

## Documentation

- `CLAUDE.md` - Project instructions for AI assistants
- `AGENTS.md` - Operational guide with quality gates
- `specs/` - Feature specifications
- `IMPLEMENTATION_PLAN.md` - Task tracking
