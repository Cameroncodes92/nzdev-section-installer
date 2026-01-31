# NZDev Section Installer — MVP Build Plan

This repo is the implementation for the MVP described in `plans/section-installer-app-mvp.md`.

## MVP decisions (locked)
- Brand: **NZDev**
- Public Shopify app
- Market: NZ/AUS first
- Pricing: **one-time** purchase per section (no subscriptions) — initial section **$9.99**
- Install flow: **theme selection required**
- Hosting: **Railway**
- Catalog (v1): **1 section** to start (Highlights Bar / Trust Builder Bar)

## Next milestones
1) Scaffold Shopify Remix app (Shopify CLI template)
2) Add section catalog model (static JSON initially)
3) Implement one-time billing per section
4) Implement theme selection + install (upload section liquid file)
5) Simple “My purchases” view + install status

## Notes
- Sections should be **single-file**: Liquid + inline CSS + JS.
- Minimal permissions: theme write + billing only.
