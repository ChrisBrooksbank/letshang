# Speaker Directory & Sharing

> A marketplace connecting speakers with groups seeking presenters.

## Overview

Speakers can list themselves, organizers can find speakers, and cross-group speaker sharing enables collaboration. Based on founder insight: speakers were easy to find through a symbiotic ecosystem.

---

## Speaker Profiles

- [ ] Design speaker profile creation [P2] [depends: user-accounts]
  - AC: Opt-in to be listed as speaker
  - AC: Topics/expertise tags
  - AC: Bio and speaking experience

- [ ] Build availability settings [P2]
  - AC: Available / Not accepting requests
  - AC: Geographic availability
  - AC: Remote vs in-person preference

- [ ] Add compensation expectations [P2]
  - AC: Options: Free, Expenses covered, Paid
  - AC: Rate range if paid (optional)

- [ ] Link previous talks [P2]
  - AC: Link to recordings, slides
  - AC: Past speaking events on platform

---

## Finding Speakers

- [ ] Build speaker directory with search [P2]
  - AC: Search by topic, location
  - AC: Filter by availability, compensation
  - AC: Card layout with quick info

- [ ] Create "Seeking Speakers" posts [P2]
  - AC: Organizers post speaker requests
  - AC: Topic, date, compensation offered
  - AC: Speakers can respond/apply

- [ ] Implement recommended speakers [P2]
  - AC: Based on group's topics
  - AC: Shown when creating events

---

## Cross-Group Speaker Sharing

- [ ] Build speaker invitation system [P2]
  - AC: Invite speakers from other groups
  - AC: Speaker accepts/declines
  - AC: Track cross-group presentations

- [ ] Enable speaker outreach [P2]
  - AC: Speakers can request to present at groups
  - AC: Organizers approve/decline
  - AC: Benefits both parties (exposure + content)

---

## Speaker Ratings

- [ ] Implement speaker rating system [P2] [depends: events.checkin]
  - AC: Attendees rate speaker post-event (1-5 stars)
  - AC: Optional text feedback
  - AC: Average rating on speaker profile

- [ ] Display speaker reputation [P2]
  - AC: Rating + review count visible
  - AC: Recent reviews shown
  - AC: Helps organizers evaluate speakers

---

## Speaker-Event Integration

- [ ] Build "Add speaker" flow [P2] [depends: events]
  - AC: Select speaker when creating event
  - AC: Speaker bio added to event description

- [ ] Enable speaker materials upload [P2]
  - AC: Speaker uploads slides, handouts
  - AC: Visible to attendees

- [ ] Prompt speaker rating post-event [P2]
  - AC: After event with speaker
  - AC: "How was the speaker?" prompt

---

## Technical Notes

- Speaker profiles extend user profiles
- Cross-group invitations create speaker-event links
- Ratings aggregated with recency weighting
