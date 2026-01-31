# NZDev Section Installer — MVP Build Plan

Locked decisions:
- Brand: **NZDev** (not Plus 5)
- Public Shopify app
- Market: NZ/AUS first
- Pricing: **one-time** purchase per section (no subscriptions)
- Initial section: **Trust Builder Bar / Highlights Bar** — **$9.99**
- Hosting: **Railway**
- Install flow: **theme selection required**

MVP milestones:
1) Section catalog (static JSON) + section detail page
2) One-time billing per section
3) Theme selection + install (upload section file into theme)
4) “My purchases” view + install status

Notes:
- Keep sections **single-file** (Liquid + inline CSS + inline JS)
- Minimal permissions: theme write + billing only
