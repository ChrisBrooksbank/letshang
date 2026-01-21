# Communication

> Enable members to communicate with each other and receive updates.

## Overview

Communication spans direct messaging, group discussions, event chat, and notifications. Trust & safety features protect members from harassment.

---

## Direct Messaging

- [ ] Build direct messaging interface [P2] [depends: user-accounts]
  - AC: One-on-one messaging
  - AC: Conversation list with previews
  - AC: Unread indicators

- [ ] Implement message threading [P2]
  - AC: Scrollable history
  - AC: Newest at bottom
  - AC: Load older on scroll up

- [ ] Add read receipts [P2]
  - AC: Optional (user setting)
  - AC: Shows when message was read

- [ ] Create block/unblock functionality [P1]
  - AC: Block prevents all contact
  - AC: Blocked user hidden from you
  - AC: Manage blocked list in settings

---

## Notifications

### Notification Channels

| Type | Push | Email | In-App |
|------|------|-------|--------|
| New event in joined group | Yes | Yes | Yes |
| RSVP confirmation | No | Yes | Yes |
| Event reminder (24h, 1h) | Yes | Yes | Yes |
| Waitlist promotion | Yes | Yes | Yes |
| New message | Yes | Optional | Yes |
| Group announcement | Yes | Yes | Yes |
| Event update/cancellation | Yes | Yes | Yes |

- [ ] Implement notification preference settings [P1]
  - AC: Per-type channel toggles
  - AC: Saved per user
  - AC: Accessible from settings

- [ ] Create push notification system [P1]
  - AC: Web Push API integration
  - AC: Permission prompt with value prop
  - AC: Delivery confirmation

- [ ] Build email notification templates [P1]
  - AC: Branded, mobile-friendly emails
  - AC: Unsubscribe link in footer
  - AC: Preview in settings

- [ ] Implement in-app notification center [P1]
  - AC: Bell icon with unread count
  - AC: Notification list with actions
  - AC: Mark read/all read

### Event Announcements

- [ ] Create event announcement feature [P1]
  - AC: Host sends to all attendees
  - AC: Push + email delivery
  - AC: Used for updates, reminders, changes

---

## SMS/Text Invitations

- [ ] Implement SMS invitation sending [P2]
  - AC: Send event invites via text
  - AC: Include shareable link
  - AC: Works without app install

- [ ] Build contact import [P2]
  - AC: Import from phone (with permission)
  - AC: Select recipients from contacts

- [ ] Create SMS delivery tracking [P2]
  - AC: Delivery status visible
  - AC: Open/click tracking on links

- [ ] Ensure SMS compliance [P2]
  - AC: Opt-out instructions included
  - AC: Consent tracking
  - AC: Frequency caps

---

## Trust & Safety

### Messaging Protections

- [ ] Implement connection-gated messaging [P1]
  - AC: Option to only receive DMs from connections
  - AC: Option to only receive from event co-attendees
  - AC: Organizer-only mode option

- [ ] Build rate limiting [P1]
  - AC: Detect mass-messaging patterns
  - AC: Throttle/block suspicious behavior
  - AC: Alert platform admins

### Reporting & Moderation

- [ ] Create one-tap reporting [P1]
  - AC: Report button on messages/profiles
  - AC: Categories: harassment, spam, inappropriate, safety
  - AC: Include message context automatically

- [ ] Implement organizer alerts [P1]
  - AC: Notify group leadership of reports
  - AC: Cross-group pattern visibility (privacy-conscious)

### Anonymous Event Feedback

> Based on founder interview: organizers may have blind spots and miss issues. Anonymous feedback can surface problems without enabling gossip. Frame as "feedback for the organizer" not "complaints about members."

- [ ] Build anonymous event feedback [P2]
  - AC: Post-event prompt: "How was your experience?"
  - AC: Anonymous by default, optional attribution
  - AC: Categories: welcoming, inclusive, comfortable, other
  - AC: Free-text option with character limit

- [ ] Create feedback dashboard for organizers [P2]
  - AC: Aggregated sentiment over time
  - AC: Flag concerning patterns (multiple "unwelcome" signals)
  - AC: Suggestions for improvement based on feedback themes

- [ ] Implement feedback guardrails [P2]
  - AC: No naming specific members in anonymous feedback
  - AC: Moderation filter for abusive content
  - AC: Rate limiting to prevent spam
  - AC: Group setting to enable/disable (opt-in per group culture)

### Graduated Enforcement

| Level | Action | Duration |
|-------|--------|----------|
| Warning | Private message with guidance | N/A |
| Temp suspension | Account restricted | 1 week - 1 month |
| Permanent ban | Full removal | Indefinite |

- [ ] Build enforcement system [P1]
  - AC: Warning, temp ban, permanent ban levels
  - AC: Compassionate templates (firm but not punitive)
  - AC: Document all actions

- [ ] Create moderation message templates [P1]
  - AC: Pre-written messages per violation type
  - AC: Customizable by moderators
  - AC: Professional, non-hostile tone

### Member Safety Features

- [ ] Implement hide attendance [P2]
  - AC: Hide your attendance from specific members
  - AC: Hide from non-connections

- [ ] Add anonymous attendance [P2]
  - AC: Attend without appearing on list
  - AC: For sensitive event types
  - AC: Host can enable/disable

- [ ] Build emergency contact sharing [P2]
  - AC: Opt-in for in-person events
  - AC: Share contact with host only
  - AC: Cleared after event

---

## Technical Notes

- Messages stored with end-to-end encryption consideration
- Push via Web Push API (Supabase Edge Function)
- SMS via Twilio or similar service
- Reports reviewed by platform team
