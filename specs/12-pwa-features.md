# PWA Features

> Technical requirements for a native-like mobile experience.

## Overview

The Progressive Web App delivers app-like performance without app store friction. Installable, offline-capable, and fast on any device.

---

## Installable

- [ ] Configure PWA manifest [P0]
  - AC: App name, description, theme color
  - AC: Icons (192px, 512px)
  - AC: Standalone display mode

- [ ] Create install prompt UX [P1]
  - AC: Custom "Add to Home Screen" prompt
  - AC: Clear value proposition
  - AC: Dismissable, remembers preference

- [ ] Build splash screen [P1]
  - AC: Branded loading screen
  - AC: Shown during app startup
  - AC: Matches theme colors

---

## Offline Support

- [ ] Implement service worker [P0]
  - AC: Caches static assets (HTML, CSS, JS, images)
  - AC: Cache-first for performance
  - AC: Network-first for API calls

- [ ] Build offline data storage [P1]
  - AC: IndexedDB for user data
  - AC: Cache joined groups
  - AC: Cache upcoming RSVPed events
  - AC: Cache recent messages

- [ ] Implement offline action queue [P1]
  - AC: Queue writes when offline
  - AC: Sync when connection restored
  - AC: Conflict resolution strategy

- [ ] Add offline indicators [P1]
  - AC: Banner when offline
  - AC: Indicate cached vs live data
  - AC: Clear sync status

---

## Push Notifications

- [ ] Set up Web Push [P1] [depends: communication.notifications]
  - AC: VAPID keys configured
  - AC: Subscription stored per device

- [ ] Create permission prompt [P1]
  - AC: Context-aware timing
  - AC: Value proposition clear
  - AC: Respect denial

- [ ] Sync preferences across devices [P1]
  - AC: Notification settings per user
  - AC: Device-specific subscriptions
  - AC: Unified experience

---

## Performance

- [ ] Optimize initial load [P0]
  - AC: < 3 seconds on 3G
  - AC: First contentful paint < 1.5s
  - AC: Lighthouse score > 90

- [ ] Implement code splitting [P1]
  - AC: Route-based chunks
  - AC: Lazy load non-critical routes
  - AC: Critical CSS inlined

- [ ] Add lazy loading [P1]
  - AC: Images lazy load below fold
  - AC: Intersection Observer API
  - AC: Placeholder during load

- [ ] Optimize images [P1]
  - AC: WebP format where supported
  - AC: Responsive srcset
  - AC: Compressed uploads

---

## Responsive Design

- [ ] Design mobile-first layouts [P0]
  - AC: Touch-friendly targets (44px min)
  - AC: Single-column mobile
  - AC: No horizontal scroll

- [ ] Implement adaptive navigation [P1]
  - AC: Bottom nav on mobile
  - AC: Sidebar on desktop
  - AC: Smooth transition at breakpoint

- [ ] Support all screen sizes [P1]
  - AC: 320px (small phone) to 1920px+
  - AC: Portrait and landscape
  - AC: Tested on real devices

---

## Testing & Quality

- [ ] Test on various devices [P1]
  - AC: iOS Safari, Android Chrome
  - AC: Low-end Android devices
  - AC: Tablet layouts

- [ ] Test network conditions [P1]
  - AC: Slow 3G simulation
  - AC: Offline mode
  - AC: Intermittent connection

- [ ] Monitor performance [P1]
  - AC: Core Web Vitals tracking
  - AC: Error reporting
  - AC: Real user metrics

---

## Technical Notes

- SvelteKit has built-in service worker support
- Vite PWA plugin for manifest/icons
- IndexedDB via idb library
- Push via Web Push API (Supabase Edge Function)
