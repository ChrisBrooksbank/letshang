# Community Meetup Platform - Specifications

> A mobile-first PWA for connecting people through local groups and events.

## Design Philosophy

- **Instant Event Creation**: Stunning event pages in seconds
- **Design-Forward**: Beautiful by default, not dated templates
- **Event-First**: Events can exist without groups
- **Friction-Free**: Minimal steps for any task
- **Delightful Details**: Polished visuals, ad-free experience

## Spec Files

| # | Domain | Priority Focus |
|---|--------|----------------|
| [01](./01-user-accounts.md) | User Accounts & Profiles | P0: Auth, P1: Profiles |
| [02](./02-groups.md) | Groups | P1: Core, P2: Engagement |
| [03](./03-events.md) | Events | P0: Creation/RSVP, P1: Features |
| [04](./04-discovery.md) | Discovery & Recommendations | P1: Search, P2: Personalization |
| [05](./05-activity-feed.md) | Activity Feed | P2: Social engagement |
| [06](./06-calendar-pages.md) | Calendar Pages | P2: Organizer branding |
| [07](./07-communication.md) | Communication | P1: Notifications, P2: Messaging |
| [08](./08-social-connections.md) | Social Connections | P2: Relationship building |
| [09](./09-speaker-directory.md) | Speaker Directory | P2: Cross-group collaboration |
| [10](./10-organizer-growth.md) | Organizer Growth Journey | P2: Retention features |
| [11](./11-analytics.md) | Organizer Analytics | P2: Insights dashboards |
| [12](./12-pwa-features.md) | PWA Features | P0: Install, P1: Offline |

## Implementation Phases

### Phase 0: Foundation
- User registration/auth → [01-user-accounts](./01-user-accounts.md)
- Basic event creation → [03-events](./03-events.md)
- Basic RSVP → [03-events](./03-events.md)

### Phase 1: Core
- Profile management → [01-user-accounts](./01-user-accounts.md)
- Groups → [02-groups](./02-groups.md)
- Event details & types → [03-events](./03-events.md)
- Basic discovery → [04-discovery](./04-discovery.md)
- PWA shell → [12-pwa-features](./12-pwa-features.md)

### Phase 2: Engagement
- Activity feed → [05-activity-feed](./05-activity-feed.md)
- Social connections → [08-social-connections](./08-social-connections.md)
- Notifications → [07-communication](./07-communication.md)
- Event themes → [03-events](./03-events.md)

### Phase 3: Growth
- Calendar pages → [06-calendar-pages](./06-calendar-pages.md)
- Speaker directory → [09-speaker-directory](./09-speaker-directory.md)
- Organizer tools → [10-organizer-growth](./10-organizer-growth.md)
- Analytics → [11-analytics](./11-analytics.md)

## Priority Key

| Priority | Meaning | Ship Without? |
|----------|---------|---------------|
| **P0** | Foundation - required for MVP | No |
| **P1** | Core - makes the product useful | Degraded |
| **P2** | Enhancement - delights users | Yes |

## Supporting Documents

- [Tech Stack](./tech-stack.md) - Technical decisions
- [Founder Interview](./interview.md) - Product context
- [Platform Landscape](./community-platforms-landscape.md) - Market research
- [Ralph Methodology](./ralph.md) - Development workflow

## Out of Scope (Future)

- Payments & monetization
- Pro/Enterprise features
- Sponsor integration
- Advanced AI moderation
- Public API
