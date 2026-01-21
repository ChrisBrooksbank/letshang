# Events

> Events are scheduled meetups—in-person, online, or hybrid. The core of the platform.

## Overview

Events can be standalone (created by any user) or group-hosted. Every event gets a beautiful, shareable page with rich customization options.

---

## Event Creation

### Basic Event Setup

- [ ] Design event creation form [P0] [depends: user-accounts.auth]
  - AC: Title (5-100 chars), description (rich text, up to 5000 chars)
  - AC: Date, time, duration picker
  - AC: Required fields: title, date/time, type

- [ ] Support standalone events [P0]
  - AC: Events created without a group
  - AC: Creator becomes event host
  - AC: Can convert to group event later

- [ ] Support group events [P1] [depends: groups]
  - AC: Events linked to a group
  - AC: Visible to group members
  - AC: Group leadership can manage

### Event Types

- [ ] Implement in-person events [P0]
  - AC: Venue name and address fields
  - AC: Map preview from address

- [ ] Build location search and map integration [P1]
  - AC: Address autocomplete from Mapbox/Google
  - AC: Map pin on event page
  - AC: "Get directions" link

- [ ] Implement online events [P1]
  - AC: Video link field (Zoom, Meet, etc.)
  - AC: Link revealed to RSVPed attendees only

- [ ] Implement hybrid events [P1]
  - AC: Both location AND video link
  - AC: Separate capacity limits per mode
  - AC: Attendees select mode when RSVPing

### Event Settings

- [ ] Add attendee limit [P1]
  - AC: Optional capacity (1-10000)
  - AC: Waitlist activates when full

- [ ] Add RSVP deadline [P2]
  - AC: Optional cutoff date/time
  - AC: RSVPs blocked after deadline

- [ ] Implement event visibility options [P1]
  - AC: Public - visible in discovery
  - AC: Group only - members see it
  - AC: Hidden - requires access code

- [ ] Implement approval-required registration [P2]
  - AC: Host toggles approval mode
  - AC: RSVPs go to pending queue
  - AC: Host approves/rejects each

---

## Scheduling

- [ ] Implement recurring events [P2]
  - AC: Daily, weekly, biweekly, monthly options
  - AC: End date or occurrence count
  - AC: Creates event series

- [ ] Build recurring event management [P2]
  - AC: Edit single occurrence or all future
  - AC: Cancel single or all future
  - AC: Series shown as linked in UI

### Anchor Events

- [ ] Implement "same time, same place" mode [P2]
  - AC: Recurring events auto-create on schedule
  - AC: Minimal host intervention needed
  - AC: Attendees can set "always RSVP yes"

---

## RSVP System

### Three-Tier RSVP

- [ ] Create RSVP flow [P0] [depends: event-creation]
  - AC: Going - confirmed, counts toward capacity
  - AC: Interested - soft commit, gets updates, doesn't count
  - AC: Can't Go - declines event

- [ ] Implement hybrid attendance selection [P1]
  - AC: Hybrid events show mode selector
  - AC: Capacity checked per mode

- [ ] Build RSVP modification [P0]
  - AC: Update or cancel RSVP anytime before event
  - AC: Cancellation opens waitlist spot

### Waitlist

- [ ] Build waitlist system [P1] [depends: rsvp]
  - AC: Auto-add when capacity reached
  - AC: FIFO promotion when spots open
  - AC: Notification on promotion

- [ ] Show waitlist position [P1]
  - AC: User sees their position
  - AC: Position updates in real-time

### Interested → Going

- [ ] Build upgrade prompts [P2]
  - AC: Prompt "Interested" users 3 days before event
  - AC: Prompt again 1 day before
  - AC: One-tap upgrade to "Going"

### Guest Bios

- [ ] Implement guest bios in RSVP [P2]
  - AC: Optional 280-char bio during RSVP
  - AC: Displayed on attendee list
  - AC: Editable until event starts
  - AC: Host can make required/optional

---

## Event Page Design

### Themes

- [ ] Design event detail page with theme support [P1]
  - AC: Beautiful default theme
  - AC: Mobile-optimized layout
  - AC: Social proof indicators prominent

- [ ] Build theme selection interface [P2]
  - AC: 40+ themes in categories: Minimal, Animated, Patterns, Seasonal
  - AC: Thumbnail previews
  - AC: One-click apply

- [ ] Implement theme customization [P2]
  - AC: Primary color picker
  - AC: Font selection from curated list
  - AC: Auto-adjust for accessibility/contrast

- [ ] Build real-time theme preview [P2]
  - AC: Changes visible instantly
  - AC: Mobile/desktop preview toggle

### Cover Images

- [ ] Create cover image gallery [P1]
  - AC: Curated stock images by category
  - AC: Custom upload option
  - AC: Crop/position tool

---

## Check-in

- [ ] Create check-in interface [P1] [depends: rsvp]
  - AC: Host marks attendees as checked in
  - AC: Opens 1 hour before event
  - AC: Shows RSVP vs checked-in count

- [ ] Implement multi-device sync [P1]
  - AC: Multiple hosts check in simultaneously
  - AC: Real-time sync prevents duplicates

- [ ] Add offline check-in mode [P2]
  - AC: Works without internet
  - AC: Syncs when connection restored

- [ ] Build QR code scanning [P2]
  - AC: Each attendee gets unique QR
  - AC: Scan to instant check-in
  - AC: Manual search fallback

---

## Date Polling

- [ ] Build date polling system [P2]
  - AC: Propose up to 10 date/time options
  - AC: Share link before creating event

- [ ] Implement availability responses [P2]
  - AC: Available, Maybe, Unavailable per option
  - AC: Works with guest mode (no account)

- [ ] Create results visualization [P2]
  - AC: Show which dates work best
  - AC: Highlight optimal date
  - AC: Convert to event with one click

---

## Event Communication

- [ ] Implement event comments [P1] [depends: rsvp]
  - AC: Threaded discussion for RSVPed users
  - AC: Visible to all attendees

- [ ] Build real-time event chat [P2]
  - AC: Opens 24h before event
  - AC: Real-time messaging
  - AC: Closes 24h after event

---

## Photo Gallery

- [ ] Build photo upload and gallery [P2] [depends: rsvp]
  - AC: Host and attendees can upload
  - AC: Pre-event, during, and post-event uploads
  - AC: Photos linked to specific event

- [ ] Add gallery management [P2]
  - AC: Host can moderate/remove photos
  - AC: Download individual or full album
  - AC: Shareable album link

---

## Social Proof & Engagement

- [ ] Implement social proof indicators [P1]
  - AC: "X Going · Y Interested" on event cards
  - AC: "Filling up fast" at 80%+ capacity
  - AC: "X spots left" near capacity

- [ ] Build event activity feed [P2]
  - AC: Real-time RSVP stream
  - AC: Comments and reactions in timeline

- [ ] Implement "boop" reactions [P2]
  - AC: Send random emoji to other attendees
  - AC: Low-friction playful engagement
  - AC: Creates pre-event excitement

---

## Event Referrals

- [ ] Build event referral system [P2]
  - AC: Shareable invite links with tracking
  - AC: See which referrals converted

- [ ] Add social sharing [P2]
  - AC: Share to Twitter, Facebook, etc.
  - AC: Preview card with event image/details

---

## Reminders & Confirmations

### Smart Reminders

- [ ] Build reminder scheduling system [P1]
  - AC: 7 days, 2 days, day-of reminders (default)
  - AC: Push, email, and/or SMS per user preference
  - AC: Include event details and map link

- [ ] Create reminder customization [P2]
  - AC: Host can adjust timing
  - AC: Host can customize message
  - AC: Option to disable auto-reminders

### Day-of Confirmation

- [ ] Implement confirmation ping [P1]
  - AC: "Still coming?" notification day of event
  - AC: One-tap confirm or bail out
  - AC: Responses visible to host

- [ ] Build graceful bail-out [P1]
  - AC: "Can't make it" with optional reason
  - AC: Auto-promotes from waitlist
  - AC: No-guilt messaging

---

## Attendance Reliability

- [ ] Create reliability tracking [P2]
  - AC: Track RSVP-to-attendance ratio per user
  - AC: Visible to organizers only
  - AC: User sees own score

- [ ] Build reliability insights [P2]
  - AC: Predicted attendance based on RSVPs
  - AC: Overbooking suggestions
  - AC: Grace for emergencies/illness

---

## Event Format Tags

- [ ] Design format tag system [P1]
  - AC: Categories: Speaker, Workshop, Activity, Discussion, Mixer, Hangout
  - AC: Multiple tags allowed

- [ ] Build accessibility indicators [P1]
  - AC: "First-timer friendly"
  - AC: "Structured activity"
  - AC: "Low-pressure"
  - AC: "Beginner welcome"

- [ ] Add format filters to discovery [P1]
  - AC: Filter events by format
  - AC: Tags visible on event cards

---

## First-Timer Support

- [ ] Implement buddy system [P2]
  - AC: Regulars volunteer to meet newcomers
  - AC: "Meet outside" coordination

- [ ] Add greeter designation [P2]
  - AC: "Host will greet at door at 7pm"
  - AC: Visual identifier field

- [ ] Build first-timer messaging [P2]
  - AC: Welcome message before first event
  - AC: "How was it?" follow-up after
  - AC: Flag first-timers for host

---

## Advanced Features

### Custom Registration Questions

- [ ] Build registration questions editor [P2]
  - AC: Text, dropdown, checkbox, radio types
  - AC: Required or optional
  - AC: Conditional logic

- [ ] Create response export [P2]
  - AC: CSV download with all responses

### Potluck Coordination

- [ ] Create potluck interface [P2]
  - AC: Host defines categories with capacity
  - AC: Guests claim categories
  - AC: Visible potluck list

### Cost Sharing

- [ ] Build chip in feature [P2]
  - AC: Host sets suggested amount
  - AC: Links to Venmo/Cash App/PayPal
  - AC: Track contributions (host view)

### Event Collections

- [ ] Build event collections [P2]
  - AC: Group related events (e.g., "Workshop Series")
  - AC: Collection landing page
  - AC: Shareable collection URL

### Time Slots

- [ ] Implement timed entry [P2]
  - AC: Multiple time slots per event
  - AC: Per-slot capacity
  - AC: Slot selection in RSVP

### Access Codes

- [ ] Create access code system [P2]
  - AC: Hidden events require code
  - AC: Multiple codes per event
  - AC: Track code usage

### Co-Hosting

- [ ] Build co-hosting flow [P2]
  - AC: Invite other groups to co-host
  - AC: Event appears in all host groups
  - AC: Co-host leadership can manage

### Surveys

- [ ] Build survey creator [P2]
  - AC: Post-event survey builder
  - AC: Auto-send after event

- [ ] Create survey results dashboard [P2]
  - AC: Aggregated and individual responses
  - AC: Trend tracking across events
