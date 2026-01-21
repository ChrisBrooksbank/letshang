# AGENTS.md - Operational Guide

> Single source of truth for build, test, and validation commands.

## Build & Run

```bash
pnpm dev              # Start dev server (http://localhost:5173)
pnpm build            # Production build
pnpm preview          # Preview production build locally
```

## Validation

Run these before committing:

```bash
pnpm check            # Svelte diagnostics + TypeScript (MUST PASS)
pnpm lint             # ESLint (MUST PASS)
pnpm format           # Prettier (auto-fixes)
pnpm test             # Vitest unit tests (MUST PASS)
```

Full validation sequence:
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

## Database

```bash
pnpm db:types         # Regenerate TypeScript types from Supabase schema
pnpm db:migrate       # Run pending migrations (via Supabase CLI)
```

## E2E Testing

```bash
pnpm test:e2e         # Playwright E2E tests (run after build)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | SvelteKit + TypeScript |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Styling | Tailwind CSS |
| Forms | Superforms + Zod |
| Maps | Mapbox |
| Hosting | Netlify |

## Codebase Patterns

### File Structure
- `src/routes/` - SvelteKit file-based routing
- `src/lib/components/` - Reusable UI components
- `src/lib/server/` - Server-only code (Supabase admin client)
- `src/lib/stores/` - Svelte stores for client state

### Conventions
- Use TypeScript strict mode
- Validate all inputs with Zod schemas
- Use Supabase RLS for authorization (not application code)
- Prefer server-side data loading (`+page.server.ts`)
- Mobile-first responsive design with Tailwind

### Component Naming
- PascalCase for components: `EventCard.svelte`
- Kebab-case for routes: `src/routes/events/[id]/+page.svelte`

### State Management
- Server state: SvelteKit load functions
- Client state: Svelte stores in `$lib/stores/`
- Form state: Superforms

## Specs Location

All requirements live in `specs/`:
- `specs/readme.md` - Index and implementation phases
- `specs/01-user-accounts.md` through `specs/12-pwa-features.md` - Feature specs
- `specs/tech-stack.md` - Technical decisions
