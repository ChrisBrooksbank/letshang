# Discovery & Recommendations

> Help users find relevant groups and events based on location, interests, and social connections.

## Overview

Discovery is how users find their next event. Multiple pathways: search, browse, map, time-based, and social.

---

## Search

- [ ] Build search interface with filters [P1] [depends: events, groups]
  - AC: Single search box for groups and events
  - AC: Results tabbed by type
  - AC: Mobile-friendly design

- [ ] Implement full-text search [P1]
  - AC: Searches titles, descriptions, topics
  - AC: Relevance-ranked results
  - AC: Typo tolerance

- [ ] Add search filters [P1]
  - AC: Location / distance radius (1-50 miles)
  - AC: Category / topic
  - AC: Event type (in-person, online, hybrid)
  - AC: Date range picker
  - AC: Group type (public, private)
  - AC: Event size (intimate, small, medium, large) - see [03-events](./03-events.md)

---

## Personalized Recommendations

- [ ] Create recommendation algorithm [P2] [depends: user-accounts.interests]
  - AC: Suggests groups matching user interests
  - AC: Recommends events from joined groups
  - AC: Factors in location proximity

- [ ] Build "Similar groups" feature [P2]
  - AC: Groups with overlapping topics
  - AC: Shown on group pages

- [ ] Implement "People also joined" [P2]
  - AC: Groups that members of this group also joined
  - AC: Social proof for discovery

---

## Browse by Category

- [ ] Build category browsing pages [P1]
  - AC: Top-level categories: Tech, Sports, Arts, Social, Career, etc.
  - AC: Subcategories for granular browsing
  - AC: Event and group counts per category

- [ ] Add trending/popular sections [P2]
  - AC: Trending events (high recent RSVPs)
  - AC: Popular groups (growing membership)
  - AC: Per-category trending

---

## Time-Based Discovery

> Prominent discovery for spontaneous plans.

- [ ] Build quick filter chips [P1]
  - AC: Today | Tomorrow | This Weekend | This Week
  - AC: Single tap filters results
  - AC: Prominent placement on home/discovery

- [ ] Create "Happening Now" section [P1]
  - AC: Events currently in progress
  - AC: Real-time updates
  - AC: "Join late" affordance

- [ ] Build "Happening Today" carousel [P1]
  - AC: Featured on home page
  - AC: Swipeable cards
  - AC: Time until start shown

- [ ] Create "This Weekend" section [P1]
  - AC: Friday evening through Sunday
  - AC: Featured for weekend planning

---

## Map-Centric Discovery

- [ ] Build map as primary discovery [P1]
  - AC: Map view as top-level navigation
  - AC: Full-screen map option

- [ ] Implement event pins [P1]
  - AC: Pin per event location
  - AC: Quick-preview popup (title, time, count)
  - AC: Tap to view full event

- [ ] Add cluster markers [P1]
  - AC: Cluster dense event areas
  - AC: Expand on zoom/tap

- [ ] Implement "Search this area" [P1]
  - AC: Button appears when map panned
  - AC: Reloads events for visible area

- [ ] Integrate with time filters [P2]
  - AC: Today/Weekend filters work on map
  - AC: Pins update with filter changes

---

## Calendar View

- [ ] Implement personal calendar [P1] [depends: events.rsvp]
  - AC: Shows all RSVPed events
  - AC: Month and week views
  - AC: Filter by group

- [ ] Add iCal export [P1]
  - AC: Download .ics for single event
  - AC: "Add to Calendar" button

- [ ] Implement calendar subscription [P2]
  - AC: URL for ongoing sync
  - AC: All RSVPed events auto-sync
  - AC: Works with Google Calendar, Apple, Outlook

---

## Friend Activity in Discovery

- [ ] Build "X connections going" badge [P2] [depends: social-connections]
  - AC: Shows count on event cards
  - AC: Visible connections listed

- [ ] Create "Friends Going" section [P2]
  - AC: On event detail pages
  - AC: Shows connected attendees

- [ ] Implement activity-based suggestions [P2]
  - AC: "Connections recently RSVPed to..." feed
  - AC: Events trending in your network

---

## Location Features

- [ ] Implement location-based recommendations [P1]
  - AC: Default to user's saved location
  - AC: "Near me" uses device GPS (with permission)

- [ ] Add nearby push notifications [P2]
  - AC: Opt-in location-based alerts
  - AC: "Event nearby starting soon"
  - AC: Frequency caps to prevent spam
