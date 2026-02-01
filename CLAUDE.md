# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NZDev Section Installer is a **Shopify embedded app** (Remix framework) that sells and installs Liquid theme sections into merchant stores. Merchants browse a section catalog, purchase via Shopify one-time billing, then install the Liquid file directly into their chosen theme.

## Commands

```bash
npm run setup          # Prisma generate + migrate deploy (run after fresh clone or schema changes)
npm run dev            # Start dev server via Shopify CLI (handles tunneling, OAuth, env vars)
npm run build          # Production build (Vite + Remix)
npm run start          # Production server (remix-serve on port 3000)
npm run lint           # ESLint with Remix + Prettier config
npm run deploy         # Deploy app config to Shopify (updates scopes, webhooks, etc.)
```

Development requires Shopify CLI (`@shopify/cli`) and a Shopify Partner account with a dev store.

## Architecture

### Routing

Remix flat-file routing in `app/routes/`. Key route groups:

- **`app.*`** — Authenticated merchant-facing routes (protected by `shopify.authenticate.admin`)
- **`auth.*`** — OAuth login/callback flow
- **`webhooks.*`** — Shopify webhook handlers (app/uninstalled, app/scopes_update)
- **`_index/`** — Public landing page (shop domain entry)

### Section Catalog & Install Flow

1. **Catalog definition**: `app/sections/catalog.server.js` — array of section metadata (handle, title, price, billing plan key, theme filename)
2. **Liquid source files**: `SECTION_LIBRARY/` directory — actual `.liquid` files named by handle
3. **Browse**: `app/routes/app.sections._index.jsx` — lists all sections from `SECTION_CATALOG`
4. **Purchase + Install**: `app/routes/app.sections.$handle.jsx` — handles billing check, theme selection, and `themeFilesUpsert` GraphQL mutation

To add a new section: add an entry to `SECTION_CATALOG` in `catalog.server.js`, add a matching `.liquid` file to `SECTION_LIBRARY/`, and add a billing plan in `shopify.server.js`.

### Shopify Integration

- **Auth & session**: `app/shopify.server.js` configures `shopifyApp()` with Prisma session storage, billing plans, and API version
- **Database**: Prisma with SQLite (`prisma/schema.prisma`) — stores only session data
- **Billing**: One-time charges defined in `shopify.server.js` billing config, referenced by plan key (e.g., `TRUST_BAR_999`)
- **API access**: `read_themes,write_themes` scopes for reading theme list and uploading section files

### Embedded App Constraints

This is an embedded Shopify app running inside an iframe. Navigation rules:
- Use `Link` from `@remix-run/react` or `@shopify/polaris` — never raw `<a>` tags
- Use `redirect` from `authenticate.admin` — not from `@remix-run/node`
- Use `useSubmit` or `<Form/>` from Remix — not lowercase `<form/>`
- Host query params must be preserved for App Bridge context

### Key Config Files

- `shopify.app.toml` — App manifest (client ID, scopes, webhooks, billing)
- `shopify.web.toml` — Dev/build commands for Shopify CLI
- `vite.config.js` — Vite + Remix plugin, HMR ports, server config
- `.graphqlrc.js` — Shopify Admin API GraphQL codegen (API version: July25)
