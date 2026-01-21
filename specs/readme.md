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

## Features from Founder Interview

The following features were added based on insights from the [founder interview](./interview.md) (Parts 1 & 2), drawing on experience running a social anxiety support group in London (2010-2014):

| Feature | Spec | Why |
|---------|------|-----|
| Attendance reliability tracking | [03-events](./03-events.md) | No-shows were the biggest frustration |
| Event format tags & accessibility indicators | [03-events](./03-events.md) | Structured activities are an accessibility feature |
| Event size indicators | [03-events](./03-events.md), [04-discovery](./04-discovery.md) | Small events matter for anxious attendees |
| First-timer support (buddy, greeter) | [03-events](./03-events.md) | Lower barrier for nervous newcomers |
| Day-of confirmation & graceful bail-out | [03-events](./03-events.md) | Make it easy to cancel without guilt |
| Interest polling | [03-events](./03-events.md) | High-commitment events failed due to silence |
| Expanded surveys | [03-events](./03-events.md), [02-groups](./02-groups.md) | Meetup.com surveys were valuable |
| Member engagement tiers | [02-groups](./02-groups.md) | Sleeper activation, lapsed re-engagement |
| Group data export | [02-groups](./02-groups.md) | Platform dependency was a real concern |
| Personal data export | [01-user-accounts](./01-user-accounts.md) | Build trust by not locking people in |
| Anonymous event feedback | [07-communication](./07-communication.md) | Organizers have blind spots |
| Connection-gated messaging | [07-communication](./07-communication.md) | Prevent harassment (men messaging all women) |
| Speaker directory | [09-speaker-directory](./09-speaker-directory.md) | Symbiotic speaker ecosystem worked well |
| Organizer playbook sharing | [10-organizer-growth](./10-organizer-growth.md) | Organizers naturally create documented processes |
| Difficult conversation templates | [10-organizer-growth](./10-organizer-growth.md) | Awkward conversations often avoided |
| Organizer milestones & burnout prevention | [10-organizer-growth](./10-organizer-growth.md) | Organizing is transformative but demanding |

## Supporting Documents

- [Tech Stack](./tech-stack.md) - Technical decisions
- [Founder Interview](./interview.md) - Product context (Parts 1 & 2)
- [Platform Landscape](./community-platforms-landscape.md) - Market research
- [Ralph Methodology](./ralph.md) - Development workflow

## Out of Scope (Future)

- Payments & monetization
- Pro/Enterprise features
- Sponsor integration
- Advanced AI moderation
- Public API
