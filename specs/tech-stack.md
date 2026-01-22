# Tech Stack

Technical decisions for the Community Meetup Platform PWA.

---

## Overview

| Layer        | Choice                  | Why                                                  |
| ------------ | ----------------------- | ---------------------------------------------------- |
| **Frontend** | SvelteKit + TypeScript  | Smallest bundles, built-in PWA support, excellent DX |
| **Backend**  | Supabase                | PostgreSQL + auth + real-time + storage in one       |
| **Hosting**  | Netlify                 | Free tier, first-class SvelteKit support             |
| **Maps**     | Mapbox (or Leaflet/OSM) | 50K free loads/month                                 |

---

## Frontend: SvelteKit

### Why SvelteKit

- **Bundle size**: ~18KB initial load vs 70KB+ for React - critical for mobile-first
- **PWA native**: Built-in service worker support, offline-first patterns
- **Performance**: No virtual DOM overhead, compiles to vanilla JS
- **Developer experience**: Less boilerplate, intuitive reactivity
- **Netlify adapter**: First-class deployment support

### Key Libraries

| Purpose | Library                  |
| ------- | ------------------------ |
| Styling | Tailwind CSS             |
| Forms   | Superforms + Zod         |
| State   | Svelte stores (built-in) |
| PWA     | Vite PWA plugin          |
| Testing | Vitest + Playwright      |

### Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable UI components
│   ├── server/         # Server-only code (Supabase admin)
│   └── stores/         # Svelte stores for state
├── routes/             # File-based routing
│   ├── (app)/          # Authenticated routes
│   ├── (auth)/         # Login/register routes
│   └── api/            # API endpoints if needed
├── app.html            # HTML template
└── hooks.server.ts     # Auth middleware
```

---

## Backend: Supabase

### Why Supabase

- **PostgreSQL**: Perfect for relational data (users → groups → events → RSVPs)
- **Real-time**: WebSocket subscriptions built-in (chat, activity feeds, live RSVPs)
- **Auth**: Email, Google, Apple, Facebook - all supported
- **Storage**: Profile photos, event images, photo galleries
- **Edge Functions**: Serverless functions when needed (Deno)
- **Open source**: No vendor lock-in, can self-host later

### Supabase Features We'll Use

| Feature                | Use Case                                                  |
| ---------------------- | --------------------------------------------------------- |
| **Database**           | All core data (users, groups, events, RSVPs, messages)    |
| **Auth**               | Registration, login, social providers, session management |
| **Realtime**           | Chat, activity feeds, live RSVP counts, notifications     |
| **Storage**            | Profile photos, event covers, photo galleries             |
| **Edge Functions**     | Push notifications, scheduled reminders, webhooks         |
| **Row Level Security** | Authorization (who can see/edit what)                     |

### Database Design Principles

- Use PostgreSQL features: foreign keys, indexes, triggers, views
- Row Level Security (RLS) for all tables
- Separate public/private data with policies
- Use Supabase's generated TypeScript types

---

## Hosting: Netlify

### Why Netlify

- **Free tier**: Generous for side project (100GB bandwidth, 300 build mins)
- **SvelteKit adapter**: Official support, seamless deployment
- **Edge functions**: For SSR and API routes
- **Preview deploys**: Every PR gets a preview URL
- **Simple**: Git push → deployed

### Deployment

```bash
# Install adapter
npm install -D @sveltejs/adapter-netlify

# svelte.config.js
import adapter from '@sveltejs/adapter-netlify';
export default { kit: { adapter: adapter() } };

# Deploy
git push  # Netlify auto-deploys from main branch
```

---

## Maps: Mapbox

### Why Mapbox

- **Free tier**: 50,000 map loads/month
- **Quality**: Beautiful maps, smooth interactions
- **Geocoding**: Address search included
- **Directions**: If we need navigation later

### Alternative: Leaflet + OpenStreetMap

If we need completely free (no limits):

- Leaflet.js for map rendering
- OpenStreetMap tiles (free, community-maintained)
- Nominatim for geocoding (rate-limited)

**Decision**: Start with Mapbox, switch to Leaflet if costs become a concern.

---

## Free Tier Limits

### What We Get for $0/month

| Service      | Limit                       | Plenty For               |
| ------------ | --------------------------- | ------------------------ |
| **Supabase** | 500MB database              | ~100K rows typical usage |
|              | 1GB storage                 | ~2,000 photos            |
|              | 50,000 MAU                  | 50K monthly active users |
|              | Unlimited API requests      | No limit                 |
|              | Real-time included          | Chat, live updates       |
| **Netlify**  | 100GB bandwidth             | ~50K visits/month        |
|              | 300 build minutes           | ~100 deploys/month       |
|              | 125K serverless invocations | SSR, API routes          |
| **Mapbox**   | 50K loads/month             | 50K map views            |

### When We'd Need to Pay

| Trigger           | Cost                | What Happens                |
| ----------------- | ------------------- | --------------------------- |
| Database > 500MB  | $25/mo Supabase Pro | 8GB database, 100GB storage |
| Storage > 1GB     | $25/mo Supabase Pro | Included in Pro             |
| MAU > 50K         | $25/mo Supabase Pro | 100K MAU                    |
| Bandwidth > 100GB | $19/mo Netlify Pro  | 1TB bandwidth               |
| Maps > 50K loads  | ~$5 per 1K loads    | Usage-based                 |

**Bottom line**: Free until meaningful traction. First paid tier is $25-50/month.

---

## Development Tools

| Tool                     | Purpose                               |
| ------------------------ | ------------------------------------- |
| **pnpm**                 | Package manager (fast, efficient)     |
| **TypeScript**           | Type safety (strict mode)             |
| **ESLint**               | Linting with security rules           |
| **Prettier**             | Code formatting                       |
| **Vitest**               | Unit testing with coverage            |
| **Playwright**           | E2E testing                           |
| **Husky**                | Pre-commit hooks (runs quality gates) |
| **knip**                 | Dead code / unused export detection   |
| **depcheck**             | Unused dependency detection           |
| **vite-bundle-analyzer** | Bundle size monitoring                |

### Quality Gate Tools

These tools enforce the 9 quality gates defined in `AGENTS.md`:

| Gate            | Tool                 | Threshold               |
| --------------- | -------------------- | ----------------------- |
| 1. Type Safety  | `pnpm check`         | 0 errors                |
| 2. Linting      | `pnpm lint`          | 0 errors, 0 warnings    |
| 3. Formatting   | `pnpm format:check`  | All files pass          |
| 4. Unit Tests   | `pnpm test`          | 100% pass               |
| 5. Coverage     | `pnpm test:coverage` | 80% lines, 80% branches |
| 6. Build        | `pnpm build`         | Successful              |
| 7. E2E Tests    | `pnpm test:e2e`      | 100% pass               |
| 8. Bundle Size  | `pnpm analyze`       | < 100KB gzipped         |
| 9. Dead Code    | `pnpm knip`          | 0 unused exports        |
| 10. Unused Deps | `pnpm depcheck`      | 0 unused dependencies   |

---

## Environment Variables

```bash
# .env.local (not committed)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-only, never expose
PUBLIC_MAPBOX_TOKEN=pk.eyJ...
```

---

## Commands (for AGENTS.md)

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm preview          # Preview production build

# Quality Gates (ALL must pass before commit)
pnpm check            # Gate 1: Svelte diagnostics + TypeScript strict
pnpm lint             # Gate 2: ESLint (0 errors, 0 warnings)
pnpm format           # Gate 3: Prettier (auto-fix)
pnpm format:check     # Gate 3: Prettier (verify only)
pnpm test             # Gate 4: Vitest unit tests
pnpm test:coverage    # Gate 4: With coverage report (80% minimum)
pnpm test:e2e         # Gate 6: Playwright E2E tests
pnpm analyze          # Gate 7: Bundle size analysis
pnpm knip             # Gate 8: Find unused code/exports
pnpm depcheck         # Gate 9: Find unused dependencies

# Full validation (run before commit)
pnpm check && pnpm lint && pnpm test:coverage && pnpm build && pnpm knip && pnpm depcheck

# Database
pnpm db:types         # Generate TypeScript types from Supabase
pnpm db:migrate       # Run migrations (via Supabase CLI)
pnpm db:reset         # Reset local database (destructive!)
```

---

## Decision Log

| Decision                | Alternatives Considered  | Why This Choice                             |
| ----------------------- | ------------------------ | ------------------------------------------- |
| SvelteKit over Next.js  | Next.js, Remix           | Smaller bundles, better mobile perf         |
| Supabase over Firebase  | Firebase, custom Node.js | PostgreSQL for relational data, open source |
| Netlify over Vercel     | Vercel, Cloudflare       | SvelteKit adapter maturity, simpler         |
| Mapbox over Google Maps | Google Maps, Leaflet     | Better free tier, cleaner API               |
| pnpm over npm           | npm, yarn                | Faster, more efficient                      |

---

## Future Considerations

If the project grows significantly:

1. **Self-host Supabase**: Move to own infrastructure for cost control
2. **CDN for images**: Cloudflare R2 or similar for storage costs
3. **Edge caching**: Netlify Edge or Cloudflare for global performance
4. **Background jobs**: Trigger.dev or Inngest for complex async work

These are "nice to have later" - the current stack scales well into thousands of users before needing changes.
