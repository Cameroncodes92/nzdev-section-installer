# Routes (Remix flat routes)

We use **Remix flat routes** naming in `app/routes/`.

Rules:
- **Index route for a segment:** use `._index`  
  Example: `app/routes/app.sections._index.jsx` → `/app/sections`
- **Dynamic param route:** use `$paramName`  
  Example: `app/routes/app.sections.$handle.jsx` → `/app/sections/:handle`
- **Nested segments:** use `.` between segments  
  Example: `app/routes/app.sections.$handle.jsx` is nested under `app/routes/app.jsx`
- **Embedded Shopify Admin navigation:** preserve query params (esp. `host`) when building internal URLs.
- **PR checklist for any new route:**
  - Click-through: Nav → list → detail
  - Direct load: paste the URL in the address bar and load it
