# Activity Feed

> A social activity stream for passive event discovery through connections' activity.

## Overview

The activity feed surfaces relevant events through social signals—what your connections are attending, what's new in your groups, and trending activity.

---

## Feed Content

- [ ] Design activity feed UI [P2] [depends: user-accounts, events, groups]
  - AC: Card-based timeline
  - AC: Pull-to-refresh on mobile
  - AC: Infinite scroll with pagination

- [ ] Implement feed aggregation [P2]
  - AC: Connections' RSVPs ("Sarah is going to Board Game Night")
  - AC: New events from joined groups
  - AC: Event announcements and updates
  - AC: Group activity highlights

---

## Feed Features

- [ ] Build sorting options [P2]
  - AC: Chronological (newest first)
  - AC: Algorithmic (relevance-ranked)
  - AC: User can switch modes

- [ ] Create "People you may know" suggestions [P2]
  - AC: Users attending same events as you
  - AC: Mutual connections highlighted
  - AC: Shown inline in feed

- [ ] Implement RSVP sharing opt-in [P2]
  - AC: User setting to share RSVPs to feed
  - AC: Default off (privacy-first)
  - AC: Per-event override option

- [ ] Build feed filtering [P2]
  - AC: All activity
  - AC: Events only
  - AC: Groups only
  - AC: Filter by specific group

---

## Technical Notes

- Feed generated server-side for performance
- Capped at ~100 recent items
- Real-time updates via Supabase subscriptions
