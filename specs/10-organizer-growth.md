# Organizer Growth Journey

> Support organizers in developing skills and building thriving communities.

## Overview

Organizers are the lifeblood of the platform. This spec covers milestone celebrations, skill development, and preventing burnout. Based on founder insight: organizing is transformative but demanding.

---

## Milestone Celebrations

| Milestone | Recognition |
|-----------|-------------|
| First event | Congratulations + tips |
| 10th event | "Experienced Organizer" badge |
| 100 members | "Community Builder" badge |
| 1 year anniversary | Anniversary celebration |

- [ ] Design milestone celebration system [P2] [depends: events, groups]
  - AC: Detect milestone achievements
  - AC: Trigger celebration notification
  - AC: Badge added to profile

- [ ] Build milestone badges [P2]
  - AC: Visual badges on organizer profile
  - AC: Optional display (organizer chooses)
  - AC: Badge collection view

- [ ] Enable milestone sharing [P2]
  - AC: Share milestone to group members
  - AC: Share to social platforms
  - AC: Celebratory messaging

---

## Skill Development

- [ ] Create organizer tutorial content [P2]
  - AC: "How to book venues"
  - AC: "Finding and inviting speakers"
  - AC: "Handling difficult situations"
  - AC: Accessible from organizer dashboard

- [ ] Build best practices library [P2]
  - AC: Event format templates
  - AC: Icebreaker ideas
  - AC: Discussion guides
  - AC: Searchable and tagged

- [ ] Implement contextual tips [P2]
  - AC: Tips before first event
  - AC: Tips after a cancellation
  - AC: Tips when facing no-shows
  - AC: Non-intrusive delivery

- [ ] Build organizer community [P2]
  - AC: Forum/space for organizers
  - AC: Ask questions, share advice
  - AC: Platform-facilitated networking

---

## Organizer Stories

- [ ] Feature organizer journeys [P2]
  - AC: "How I started" testimonials
  - AC: Transformation stories
  - AC: Featured on platform

- [ ] Highlight personal growth [P2]
  - AC: "From shy attendee to leader"
  - AC: Inspire potential organizers
  - AC: Real member stories

---

## Attendee-to-Organizer Pipeline

- [ ] Design "Host your first event" prompts [P2] [depends: events.rsvp]
  - AC: Target engaged attendees
  - AC: Low-pressure suggestion
  - AC: After attending 5+ events

- [ ] Build co-host opportunities [P2]
  - AC: "Shadow" an experienced organizer
  - AC: Learn before leading alone
  - AC: Organizers can invite shadows

- [ ] Create event templates [P2]
  - AC: Pre-built formats
  - AC: Fill-in-the-blank simplicity
  - AC: "Coffee meetup", "Book club", etc.

- [ ] Implement mentorship matching [P2]
  - AC: New organizers matched with experienced
  - AC: Opt-in for both parties
  - AC: Suggested conversation topics

- [ ] Track organizer journey [P2]
  - AC: First RSVP → Regular → First event → Established
  - AC: Platform tracks progression
  - AC: Intervene at friction points

---

## Organizer Wellbeing

- [ ] Implement burnout prevention [P2]
  - AC: Reminders to take breaks
  - AC: Celebrate wins
  - AC: Track event frequency

- [ ] Add delegation prompts [P2]
  - AC: "You've hosted 10 events this month"
  - AC: Suggest adding co-organizer
  - AC: Encourage role distribution

- [ ] Create appreciation prompts [P2]
  - AC: Prompt members to thank organizers
  - AC: After attending events
  - AC: Aggregate thanks visible to organizer

- [ ] Recognize emotional labor [P2]
  - AC: Acknowledge organizing is work
  - AC: Supportive messaging
  - AC: Community recognition

---

## Technical Notes

- Milestones computed from event/member counts
- Tips delivered via notification system
- Burnout detection based on event frequency patterns
