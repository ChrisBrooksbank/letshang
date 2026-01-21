# Calendar Pages

> Public-facing landing pages for organizers or communities to showcase their events.

## Overview

Calendar pages are "brand hubs" that visitors can follow and subscribe to. Think of them as a public portfolio of an organizer's events.

---

## Calendar Page Features

- [ ] Design calendar page layout [P2] [depends: events]
  - AC: Custom URL (e.g., `/c/tech-meetups-nyc`)
  - AC: Cover image and branding
  - AC: Description and social links
  - AC: Mobile-responsive layout

- [ ] Build calendar creation flow [P2]
  - AC: Name, URL slug, description
  - AC: Cover image upload
  - AC: Link social profiles

- [ ] Create event showcase [P2]
  - AC: Grid/list of upcoming events
  - AC: Sortable by date
  - AC: Filterable by tag

- [ ] Implement tag-based filtering [P2]
  - AC: Tags defined per calendar
  - AC: Visitors filter events by tag

- [ ] Create map view for calendar [P2]
  - AC: Map showing all calendar event locations
  - AC: Click pin to view event

- [ ] Build past events archive [P2]
  - AC: Browse completed events
  - AC: Photo galleries from past events

---

## Subscriptions & Following

- [ ] Build subscription/follow system [P2]
  - AC: "Follow" button on calendar page
  - AC: Followers notified of new events
  - AC: Subscriber count displayed (social proof)

- [ ] Implement iCal subscription feed [P2]
  - AC: Subscribe URL for calendar apps
  - AC: Auto-syncs all calendar events
  - AC: Updates when events change

---

## Newsletter Integration

- [ ] Create newsletter composer [P2]
  - AC: Rich text editor
  - AC: Embed upcoming events
  - AC: Preview before sending

- [ ] Build recipient filtering [P2]
  - AC: Send to all subscribers
  - AC: Filter by tags or engagement

- [ ] Implement newsletter scheduling [P2]
  - AC: Send now or schedule
  - AC: View scheduled newsletters

- [ ] Add newsletter analytics [P2]
  - AC: Open rates
  - AC: Click tracking
  - AC: Unsubscribe rate

---

## Calendar Ownership

- [ ] Support individual calendars [P2]
  - AC: Any user can create personal calendar
  - AC: Link events to calendar

- [ ] Support group calendars [P2]
  - AC: Groups automatically get calendar page
  - AC: Group events appear on calendar

- [ ] Build multi-admin support [P2]
  - AC: Multiple admins per calendar
  - AC: Ownership transfer

---

## Technical Notes

- Calendar URLs are globally unique slugs
- Newsletter delivery via edge function + email service
- iCal feed generated on-demand, cached
