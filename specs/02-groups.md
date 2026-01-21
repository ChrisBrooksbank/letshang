# Groups

> Groups are the core organizational unit, bringing together people with shared interests to host events.

## Overview

Groups provide structure for recurring communities. Each group has an organizer, optional leadership team, and members. Groups can be public or private.

---

## Group Creation

- [ ] Design group creation wizard [P1] [depends: user-accounts.auth]
  - AC: Name (3-100 chars), description (up to 2000 chars)
  - AC: Cover photo upload with preview
  - AC: 3-step wizard: Basics → Topics → Settings

- [ ] Build topic/category selection [P1]
  - AC: Select up to 5 topics from curated list
  - AC: Topics match interest categories for discovery
  - AC: At least 1 topic required

- [ ] Implement group settings page [P1]
  - AC: Edit name, description, cover photo
  - AC: Change topics
  - AC: Set location (city/area)

- [ ] Add group type selection [P1]
  - AC: Public - anyone can join
  - AC: Private - requires approval
  - AC: Type changeable by organizer

- [ ] Design group profile/landing page [P1]
  - AC: Shows name, description, cover, topics
  - AC: Member count and upcoming events
  - AC: Join button (or request access for private)
  - AC: Average rating displayed

---

## Leadership Roles

| Role | Permissions |
|------|-------------|
| **Organizer** | Full control - settings, billing, delete, assign all roles |
| **Co-organizer** | All except delete group or remove organizer |
| **Assistant Organizer** | Manage members + event organizer permissions |
| **Event Organizer** | Create/edit events, manage attendance, check-in |

- [ ] Create role management interface [P1] [depends: group-creation]
  - AC: Organizer can assign/remove roles
  - AC: Role hierarchy enforced (can't assign higher than own)
  - AC: At least one organizer required at all times

- [ ] Implement role-based permissions [P1]
  - AC: UI hides actions user can't perform
  - AC: API enforces permissions server-side
  - AC: Role changes take effect immediately

---

## Member Management

- [ ] Build member list with search and filters [P1] [depends: group-creation]
  - AC: Shows member name, photo, join date
  - AC: Search by name
  - AC: Filter by role, join date range

- [ ] Implement join request approval workflow [P1]
  - AC: Private groups show pending requests to leadership
  - AC: Approve/deny with optional message
  - AC: Requester notified of decision

- [ ] Create member removal functionality [P1]
  - AC: Leadership can remove members
  - AC: Removed member notified
  - AC: Removal reason optional but logged

- [ ] Implement ban functionality [P1]
  - AC: Banned members cannot rejoin
  - AC: Ban reason required and logged
  - AC: Ban list visible to leadership

---

## Group Discussions

- [ ] Build discussion board with threading [P2] [depends: group-creation]
  - AC: Members can create posts (title + body)
  - AC: Posts support replies (2 levels deep)
  - AC: Reactions on posts and replies

- [ ] Implement pinned posts [P2]
  - AC: Leadership can pin posts
  - AC: Pinned posts appear at top
  - AC: Max 3 pinned posts

- [ ] Add discussion moderation [P2]
  - AC: Leadership can delete any post
  - AC: Organizer setting: allow/disallow member posts
  - AC: Report post option for members

---

## Group Reviews

- [ ] Implement review and rating system [P2] [depends: events.attendance]
  - AC: Members can rate after attending an event (1-5 stars)
  - AC: Optional text review (up to 500 chars)
  - AC: One review per member (can update)

- [ ] Display group ratings [P2]
  - AC: Average rating on group page
  - AC: Review count displayed
  - AC: Recent reviews visible (latest 5)

---

## Member Engagement & Re-engagement

> Activate sleeper members and re-engage lapsed attendees.

### Engagement Tiers

| Tier | Definition |
|------|------------|
| **Active** | Attended event in last 30 days |
| **Occasional** | Attended in last 90 days |
| **Sleeper** | Joined but never attended |
| **Lapsed** | Was active, inactive 90+ days |

- [ ] Build member engagement tier tracking [P2] [depends: events.checkin]
  - AC: System calculates tier based on attendance history
  - AC: Tier updates after each event check-in
  - AC: Historical tier changes logged

- [ ] Create sleeper member identification [P2]
  - AC: Flag members who joined but never attended
  - AC: Count sleepers in dashboard
  - AC: Days since joining tracked

### Automated Re-engagement

- [ ] Implement automated re-engagement messaging [P2]
  - AC: Sleeper activation: "We haven't seen you yet!" after 14 days
  - AC: Lapsed outreach: "We miss you!" after 60 days inactive
  - AC: Include beginner-friendly event suggestions

- [ ] Add frequency limits [P2]
  - AC: Max 1 re-engagement message per 30 days
  - AC: Stop after 3 unanswered messages
  - AC: User can opt-out of re-engagement

### Engagement Dashboard

- [ ] Build engagement dashboard for organizers [P2]
  - AC: Pie chart of member tiers
  - AC: List sleepers and lapsed with last activity
  - AC: Sleeper-to-active conversion rate

- [ ] Track conversion metrics [P2]
  - AC: How many sleepers eventually attend
  - AC: Time from join to first attendance
  - AC: Re-engagement message success rate

---

## Technical Notes

- Groups stored with RLS policies for visibility
- Member roles are a junction table with role enum
- Engagement tiers computed view, not stored column
