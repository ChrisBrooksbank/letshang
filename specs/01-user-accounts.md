# User Accounts & Profiles

> Users create accounts to join groups, RSVP to events, and connect with other members.

## Overview

The account system balances friction-free access with meaningful identity. Guest mode allows lightweight participation, while full accounts unlock community features.

---

## Registration & Authentication

### Email/Password Registration

- [ ] Build email/password registration form [P0]
  - AC: Form validates email format and password strength (8+ chars)
  - AC: Duplicate email shows clear error message
  - AC: Success redirects to email verification pending screen

- [ ] Implement email verification system [P0]
  - AC: Verification email sent within 30 seconds of registration
  - AC: Verification link valid for 24 hours
  - AC: Clicking link marks account as verified and logs user in
  - AC: Resend verification option available

- [ ] Build password reset flow [P0]
  - AC: Reset email sent to valid addresses only (no enumeration)
  - AC: Reset link valid for 1 hour
  - AC: Password change invalidates old sessions

### Social Login

- [ ] Implement Google OAuth login [P1]
  - AC: One-click login with Google account
  - AC: Email auto-populated from Google profile
  - AC: Profile photo imported if available

- [ ] Implement Apple Sign In [P1]
  - AC: Works on iOS/Safari with Face ID/Touch ID
  - AC: Handles Apple's email relay service

- [ ] Implement Facebook login [P2]
  - AC: One-click login with Facebook account
  - AC: Basic profile info imported

### Session Management

- [ ] Implement JWT-based sessions [P0] [depends: registration]
  - AC: Access token expires in 15 minutes
  - AC: Refresh token rotation on each use
  - AC: Sessions persist across browser close

- [ ] Build session management across devices [P1]
  - AC: User can view active sessions
  - AC: User can revoke individual sessions
  - AC: "Sign out everywhere" option available

---

## Profile Management

### Basic Profile

- [ ] Create profile editing interface [P1] [depends: registration]
  - AC: Display name editable (2-50 chars)
  - AC: Bio/about section supports 500 chars
  - AC: Changes save on blur or explicit save

- [ ] Implement profile photo upload [P1]
  - AC: Accepts JPG, PNG, WebP up to 5MB
  - AC: Cropper allows square selection
  - AC: Photo compresses to max 500KB
  - AC: Shows placeholder if no photo

- [ ] Build location selection [P1]
  - AC: City/area autocomplete from geocoding API
  - AC: Location used for recommendations
  - AC: Can clear location to go global

### Privacy Settings

- [ ] Add profile visibility settings [P1]
  - AC: Options: Public, Members only, Connections only
  - AC: Separate control for profile vs. attendance visibility
  - AC: Default is "Members only"

- [ ] Create account settings page [P1]
  - AC: Change email with re-verification
  - AC: Change password with current password confirmation
  - AC: Notification preferences (see [07-communication](./07-communication.md))

### Account Lifecycle

- [ ] Implement account deletion flow [P1]
  - AC: Requires password confirmation
  - AC: 14-day grace period before permanent deletion
  - AC: User data anonymized, not fully deleted (preserves event history)
  - AC: Reactivation possible during grace period

### Data Portability

> Based on founder interview: platform dependency was a real concern. Maintained outside channels (Facebook, blog, website) partly as a hedge. Build trust by not locking people in.

- [ ] Implement personal data export [P1]
  - AC: Download all personal data (GDPR compliant)
  - AC: Includes: profile, RSVPs, attendance history, connections
  - AC: Export as JSON and/or human-readable format
  - AC: Available from account settings

- [ ] Build event history export [P2]
  - AC: Export attended events with dates, locations
  - AC: Include groups joined and roles held
  - AC: Calendar-compatible format (ICS) option

---

## Interests

- [ ] Build interest selection component [P1] [depends: profile]
  - AC: Searchable list of 50+ curated topics
  - AC: Categories: Technology, Sports, Arts, Social, Career, Hobbies, etc.
  - AC: Multi-select with visual tags

- [ ] Implement interest-based recommendations [P2] [depends: interests]
  - AC: Interests stored for recommendation algorithm
  - AC: Users can update interests anytime

- [ ] Add interest privacy option [P2]
  - AC: Option to hide interests from public profile
  - AC: Interests still used for recommendations when hidden

---

## Guest Mode

> Account-optional attendance reduces friction for casual event-goers.

### Guest RSVP

- [ ] Implement guest RSVP via link [P1] [depends: events.rsvp]
  - AC: Guest RSVPs with phone OR email (not both required)
  - AC: No account creation required
  - AC: Guest receives confirmation to provided contact

- [ ] Build guest identifier system [P1]
  - AC: Phone/email serves as lightweight ID
  - AC: Same identifier links multiple guest RSVPs
  - AC: No password required for guest actions

### Guest Capabilities

- [ ] Enable guest event features [P1]
  - AC: Guests can view event details
  - AC: Guests can upload photos to event gallery
  - AC: Guests receive event reminders

### Guest Conversion

- [ ] Create guest-to-account conversion flow [P2]
  - AC: Prompt after attending first event (non-blocking)
  - AC: Pre-fill email/phone from guest data
  - AC: Link past guest RSVPs to new account
  - AC: Conversion is optional, never forced

### Guest Limitations

Guests cannot:

- Host events
- Join groups
- Send direct messages
- Make connections

These features prompt account creation.

---

## Technical Notes

- Auth via Supabase Auth (see [tech-stack](./tech-stack.md))
- RLS policies enforce profile visibility
- Guest data stored with nullable `user_id`
