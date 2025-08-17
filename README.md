# Timezone Planner (Vite + React + TypeScript)

A single‑page app to compare time zones. Add cities or IANA time zones and view a 24‑hour timeline per location, aligned by UTC, with a live “now” marker and working‑hours highlighting.

## Run locally

```bash
# 1) Install dependencies
npm install

# 2) Start dev server
npm run dev

# 3) Build for production
npm run build
npm run preview
```

## Notes

- Use IANA time zones like `Asia/Kolkata` or city aliases (e.g., Bengaluru, Stockholm, New York).
- Working hours highlighting is configurable.
- No external APIs required; the browser formats times with `Intl.DateTimeFormat`.
