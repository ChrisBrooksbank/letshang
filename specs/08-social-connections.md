# Social Connections

> Features that help members build relationships beyond individual events.

## Overview

Connections are mutual relationships between members. They power social discovery, familiar faces, and trusted communication.

---

## Connections

- [ ] Build connection request flow [P2] [depends: user-accounts]
  - AC: "Connect" button on profiles
  - AC: Request sent with optional message
  - AC: Pending requests visible

- [ ] Implement accept/decline [P2]
  - AC: Notification for incoming requests
  - AC: Accept creates mutual connection
  - AC: Decline silently (no notification)

- [ ] Create connections list [P2]
  - AC: View all connections
  - AC: Search connections by name
  - AC: Remove connection option

- [ ] Build connections activity [P2]
  - AC: See connections' upcoming events
  - AC: "Invite connection to event" action

---

## Familiar Faces

- [ ] Implement familiar faces detection [P2] [depends: events.checkin]
  - AC: Identify members you've attended events with
  - AC: Count shared past events

- [ ] Display familiar faces [P2]
  - AC: Highlight on event attendee lists
  - AC: "You've attended X events together"
  - AC: Helps identify known people before attending

---

## Shared Interests

- [ ] Build "in common" profile section [P2] [depends: user-accounts.interests, groups]
  - AC: When viewing another profile
  - AC: Shows shared interests
  - AC: Shows shared groups

- [ ] Use for conversation starters [P2]
  - AC: "You both like Photography"
  - AC: "You're both in NYC Hikers"
  - AC: Helps break the ice

---

## Technical Notes

- Connections are bidirectional (mutual)
- Familiar faces computed from check-in history
- Shared interests/groups computed on-demand
