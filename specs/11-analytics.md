# Organizer Analytics

> Real-time dashboards and reports to help organizers understand event performance.

## Overview

Analytics help organizers make data-driven decisions: predict attendance, identify successful formats, and track community growth.

---

## Event Analytics Dashboard

- [ ] Build real-time event dashboard [P2] [depends: events.rsvp, events.checkin]
  - AC: Live RSVP counts (Going, Interested, Waitlist)
  - AC: Updates without refresh
  - AC: Accessible during event

- [ ] Implement check-in tracking [P2]
  - AC: Checked-in vs RSVP count
  - AC: Check-in rate percentage
  - AC: Real-time during event

- [ ] Add attendance trends [P2]
  - AC: Compare across event series
  - AC: Line chart over time
  - AC: Identify successful patterns

- [ ] Implement source tracking [P2]
  - AC: How attendees found event
  - AC: Search, recommendation, share, direct
  - AC: Helps optimize promotion

- [ ] Build reliability insights [P2] [depends: events.reliability]
  - AC: Average reliability of RSVPs
  - AC: Predicted actual attendance
  - AC: Based on historical patterns

---

## Reports & Exports

- [ ] Build attendee list export [P1] [depends: events.rsvp]
  - AC: CSV download
  - AC: Includes registration question responses
  - AC: Export all or filtered

- [ ] Create historical attendance data [P2]
  - AC: Past events attendance records
  - AC: Downloadable reports
  - AC: Date range selection

- [ ] Implement group-level analytics [P2]
  - AC: Total events over time
  - AC: Total attendees cumulative
  - AC: Member growth chart

- [ ] Add no-show rate tracking [P2]
  - AC: RSVP vs check-in delta
  - AC: Track over time
  - AC: Improve planning

- [ ] Build engagement funnel [P2] [depends: groups.engagement]
  - AC: Sleeper → First event → Regular → Core
  - AC: Conversion rates between stages
  - AC: Identify drop-off points

---

## Technical Notes

- Analytics computed via database views
- Real-time updates via Supabase subscriptions
- Historical data retained indefinitely
- Export via server-side CSV generation
