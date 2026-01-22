# PWA Icons

These are placeholder icons for development (1x1 solid color PNG files).

## Production Icons

⚠️ **IMPORTANT**: These are minimal placeholders. Before deploying to production, replace with professionally designed icons:

1. Create 192x192px and 512x512px PNG icons with actual artwork
2. Replace icon-192.png and icon-512.png in this directory
3. Ensure icons follow PWA guidelines:
   - Simple, recognizable design
   - Works well when masked (safe area in center)
   - High contrast for visibility
   - Properly sized (not scaled 1x1 pixels)

## Current Placeholders

- icon-192.png: 1x1 PNG (theme color: #6366f1)
- icon-512.png: 1x1 PNG (theme color: #6366f1)

These will be scaled by the browser but are NOT suitable for production.

## Regenerating Icons

Run this script to regenerate placeholder icons:

```bash
node scripts/generate-icons-simple.js
```
