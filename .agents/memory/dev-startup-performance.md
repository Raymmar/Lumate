---
name: Dev startup slowness and orphan servers
description: Why the dev preview loads slowly after restarts/merges, the orphan-server trap, and how startup syncs are throttled
---

- After task merges, an orphan dev server can keep holding port 5000 while the workflow reports not started; restarts then fail with port-in-use. Kill the stale tsx/node processes, then restart the workflow.
- Startup syncs are throttled by timestamps in `cache_metadata`: the Luma cache sync is skipped at startup when `last_cache_update` is within the 6h interval (schedule resumes at last+6h), and the Stripe backfill only runs when `last_stripe_backfill` is >24h old. Each skip logs one line. To force a fresh run in dev, delete/backdate those rows rather than changing code.
- Incremental Luma people syncs page newest-first and stop at the last sync time; only the daily full refresh or the manual reset re-reads everyone.
- Client pages are lazy-loaded per route; navigation routes on a transitioned location so the old page stays visible while the next chunk loads. Home and not-found stay eager.
- The first visit after dependency changes makes Vite re-optimize deps and force-reload the page.
- Running a second dev server on another port (e.g. for timing) makes Replit add a [[ports]] entry to .replit — revert it.

**Why:** Diagnosed 2026-10-15 when the owner asked why the app loads slowly; throttling added the same day.
**How to apply:** Check for orphan servers and startup syncs before blaming new code for slow loads; keep new background jobs off the pre-listen path.
